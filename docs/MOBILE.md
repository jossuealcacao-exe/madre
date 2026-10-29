# MADRE · EN TU TELÉFONO

Documento único del trabajo para usar MADRE desde el teléfono. Ids `MOV-xxx` para el trabajo,
`D-Mxx` para las decisiones. Nada aquí está construido todavía; el estado de cada id vive en la
tabla de la sección 6.

---

## 1 · La idea, en una frase

**Tus proyectos siguen en tu Mac; el teléfono es otra ventana a ellos.** Los agentes, el proyecto y la
memoria no se mudan: lo que viaja es la conversación, y viaja cifrada. Desde el teléfono hablas
con todos tus proyectos a la vez, en casa o fuera, y pasas de la computadora al teléfono y de vuelta
sin perder el hilo, como Handoff en los equipos de Apple.

Qué no es:

- **No es MADRE en la nube.** Ningún servidor nuestro corre agentes, guarda proyectos ni lee
  conversaciones.
- **No es una app nativa.** Es la misma interfaz, instalable en la pantalla de inicio (PWA).
  Una app de tienda queda fuera de este plan.
- **No es un control remoto sin límites.** Desde el teléfono se pregunta, se lee, se aprueba lo
  que no toca el proyecto y se frena todo. Lo que modifica el proyecto se queda en la computadora
  salvo que la persona lo abra (sección 4).

## 2 · La experiencia (lo que la persona vive)

El listón: **dos pasos para empezar, cero comandos, nada que configurar después.**

### 2.1 · Emparejar: dos pasos

1. En MADRE, una tecla nueva en la barra, **MADRE en tu teléfono**, abre una tarjeta con un QR y una sola
   frase: «Escanéalo con la cámara de tu teléfono».
2. La persona apunta la cámara. Se abre MADRE en el teléfono, ya dentro: «Listo. Tu Mac está en tu
   teléfono». Una segunda pantalla le enseña, con un dibujo del propio sistema, cómo añadirla a la
   pantalla de inicio (en iOS es lo que habilita los avisos).

No hay cuenta, ni correo, ni contraseña, ni código que teclear. El QR vale una sola vez y caduca en
diez minutos. La tecla MADRE en tu teléfono también entra en «Primeros pasos» como un paso opcional.

### 2.2 · Todos los proyectos, en una pantalla

El teléfono abre en **Inicio**: una lista como la de Mensajes, una fila por proyecto abierto en la
Mac, con lo último que se dijo, quién está trabajando ahora y una marca cuando un agente espera
algo de ti (un permiso, una elección, una pregunta). Tocar una fila abre ese proyecto; volver regresa a
la lista sin perder lo que pasa en los demás. El botón **STOPALL** está siempre a la mano: frenar
todo desde cualquier lugar es la función de seguridad más valiosa del teléfono.

### 2.3 · Continuidad (el Handoff de MADRE)

- **De la Mac al teléfono.** Al abrir MADRE en el teléfono, arriba aparece «Seguir donde ibas ·
  Gumball · prueba de multitarea»: el mismo proyecto, la misma conversación, a la altura donde estabas
  leyendo y con el borrador que dejaste en la caja.
- **Del teléfono a la Mac.** Cuando vuelves a la computadora, una píldora en la barra (donde vive
  la de versión nueva) dice «Continuar desde el iPhone · borrador en Gumball». Un clic y estás ahí.
- **Presencia.** La barra de la Mac muestra un teléfono pequeño cuando hay uno conectado. El
  teléfono dice si la Mac está despierta («Tu Mac está dormida: te avisamos cuando vuelva»).
- **Quién lo dijo.** Lo que se escribe desde el teléfono queda en el registro del proyecto con su
  origen: «Tú · desde iPhone».

### 2.4 · Avisos (fase 2)

Solo lo que pide tu atención, agrupado por proyecto: un agente terminó, un agente pide permiso o una
elección, Diagnóstico detectó un problema. Nada de un aviso por cada línea del proyecto.

## 3 · Arquitectura

### 3.1 · Lo que ya hay en MADRE y se respeta

| Pieza | Dónde | Qué implica |
|---|---|---|
| Un proceso y un puerto por proyecto | `src/server.mjs:192-206` | Cada proyecto abierto deja `~/.pulse/rooms/<proyecto>/open.json` con `{pid, port, at}`: el registro de proyectos ya existe. |
| El proyecto solo escucha en `127.0.0.1` | `src/server.mjs:2344` | No se cambia. Ningún proyecto se expone nunca. |
| Guarda de peticiones: Host local y Origin propio | `src/request-guard.mjs` | No se relaja. El puente habla con el proyecto como `127.0.0.1`. |
| Flujo en vivo por SSE | `/api/events`, `public/app.js:9061` | El puente lo reenvía tal cual (fase 1) o lo convierte en tramas (fase 2). |
| Interfaz para teléfono | `public/styles.css` (`max-width: 720px`), barra con «Más» | Base de la vista móvil; falta la pantalla Inicio y la continuidad. |
| Registro de salidas | `src/outbound.mjs` | El relevo de la fase 2 se declara como un destino más, visible en Privacidad. |
| Sin dependencias, Node ≥ 22.5 | `package.json` | Node trae `WebSocket` (cliente) y `node:crypto`: alcanza para el puente y el cifrado sin paquetes. |

### 3.2 · El puente (MOV-001)

Una pieza única por Mac, **el puente** (`src/bridge/`), es lo único que el teléfono alcanza:

```
teléfono ──(fase 1: Wi-Fi · fase 2: relevo cifrado)──▶ PUENTE ──▶ 127.0.0.1:<puerto de cada proyecto>
```

- **Vive dentro de un proyecto, sin proceso propio** (`host.mjs`). Cada proyecto, cada 15 segundos, se
  pregunta si un teléfono debería poder llegar ahora: el acceso está encendido, hay un teléfono
  emparejado o un código vigente, y la red es de confianza. Si es así, intenta abrir el puerto
  4316. El primero que lo logra hospeda el puente; los demás lo encuentran tomado. Si el proyecto que
  lo hospeda se cierra, el siguiente lo toma. En una red sin confianza, quien lo hospeda lo cierra.
  Así no hay que lanzar, vigilar ni matar un proceso aparte, y el puente vive exactamente mientras
  haya un proyecto abierto.
- **Conoce los proyectos** leyendo los `open.json`, comprobando que su proceso vive y preguntando a
  cada uno `/api/version`. Un proyecto de una versión que no habla con el puente aparece en la lista
  con «Actualiza este proyecto para usarlo desde el teléfono».
- **Reenvía** a `http://127.0.0.1:<puerto>/…` del proyecto elegido (una cookie, `madre_room`, dice
  cuál), reescribiendo `Host` y `Origin` a los del proyecto, de modo que la guarda del proyecto no
  cambia. Añade `x-madre-device` y `x-madre-device-kind` (y borra los que mande el teléfono) para
  que el registro diga desde dónde se habló.
- **La página del proyecto es la del proyecto.** Como el proyecto se elige por cookie y no por ruta, cada
  ruta absoluta de la página sigue funcionando detrás del puente, sin cargadores ni reescrituras.
  Cada proyecto sirve su propia versión de la interfaz; el puente solo sirve Inicio y sus estilos.
- **Defensa en el proyecto también:** una petición con `x-madre-device` no puede pedir #3/#4, no
  alcanza `/api/phone` y no cuenta como «esta computadora» para las llaves de proveedor y de
  módulos, aunque llegue desde 127.0.0.1.
- **Aplica la política del teléfono** (sección 4) con una lista de rutas **permitidas**, no
  prohibidas: lo que no está en la lista no pasa.
- **Límites:** un tope de peticiones por dispositivo, cabeceras de seguridad (CSP, `nosniff`,
  `no-referrer`), cookie `HttpOnly` + `SameSite=Strict`, y acciones solo con
  `Sec-Fetch-Site: same-origin`. Patrones tomados de Apex OS (sección 7).

### 3.3 · Dispositivos y llaves (MOV-002)

Portado de Apex OS (`apps/api/src/devices.ts`, `session.ts`) a `node:crypto`, con un archivo local
en lugar de Postgres:

- **Invitación:** 32 bytes al azar, un solo uso, 10 minutos. Viaja solo dentro del QR.
- **Dispositivo:** al canjearla nace una sesión de 30 días que se renueva con el uso. En disco solo
  se guarda su HMAC-SHA256: `~/.pulse/devices.json`, con `{id, nombre, creado, visto, hmac}`.
- **La llave del HMAC** (y en la fase 2 la identidad de la Mac) vive en
  `~/.pulse/credentials/bridge.key`, solo para el dueño. Nunca en `config.json`, en el registro ni
  en un log. **Ver D-M01:** contradice hoy la regla «MADRE no guarda credenciales propias».
- **En Ajustes › Privacidad › Teléfonos**, la lista de teléfonos emparejados y de redes de
  confianza, cada uno con «Olvidar», y un interruptor que apaga el acceso de todos. Olvidar revoca
  al instante: la siguiente petición del teléfono ya no entra.
- **Varios proyectos escriben el mismo archivo:** cada cambio toma un candado de archivo y escribe por
  renombrado, así que nadie lee medio archivo y dos proyectos a la vez no se pisan.

### 3.4 · Fase 1 · En tu Wi-Fi

El puente escucha en la red local en el puerto 4316. El QR lleva
`http://<IP de la Mac>:4316/bridge/pair?c=<invitación>`: la IP funciona en cualquier teléfono, y un
nombre `.local` no todos los Android lo resuelven. Si el router le da otra IP a la Mac, se vuelve a
escanear un código.

**Cómo se reconoce una red** (`network.mjs`): por la dirección de hardware del router, con hash.
En macOS, un proceso que lanza Node no ve la tabla de vecinos (`arp` le contesta vacía, aunque Node
sí alcanza el router). Por eso, si `arp` no la da, se lee de `ipconfig getsummary`: el anuncio IPv6
del router y el identificador DHCPv6 la traen. Una red que no da esa dirección es desconocida, y
en una red desconocida el teléfono no se ofrece.

**Límites honestos de esta fase** (ver D-M02):

- **Es `http`, no `https`.** En una red ajena, alguien en el mismo Wi-Fi podría leer el tráfico.
- Sin `https`, el navegador del teléfono no concede un contexto seguro: no hay service worker
  (no se instala como app de verdad, no hay avisos) ni `crypto.subtle` (la frase de #3/#4 no se
  puede comprobar en el teléfono).
- La primera vez, macOS puede preguntar si permite conexiones entrantes a `node`. La tarjeta
  MADRE en tu teléfono lo anticipa con una frase.
- No funciona fuera de esa red.

Por eso la fase 1 se ofrece **solo en redes que la persona marca como de confianza** («Esta es mi
red de casa») y se presenta como **avance**: sirve para construir y validar todo lo que la fase 2
reutiliza (puente, emparejamiento, política, Inicio, continuidad) con la persona real, antes de que
exista el relevo.

### 3.5 · Fase 2 · En cualquier lugar, cifrado de extremo a extremo

```
teléfono (app.madre.run, https, PWA) ──WebSocket──▶ relay.madre.run (Cloudflare Worker + Durable Object)
                                                        ▲
                                     PUENTE en la Mac ──┘ (conexión de salida; no se abre ningún puerto)
```

- **Un solo camino, en casa y fuera.** El teléfono siempre entra por `app.madre.run`, que es
  `https`: es instalable, tiene service worker y recibe avisos. La persona no elige entre «local»
  y «remoto»; simplemente funciona.
- **Buzón por Mac.** Un Durable Object por Mac empareja la conexión de salida del puente con la del
  teléfono. El id del buzón es opaco e imposible de adivinar.
- **Cifrado de extremo a extremo.** El QR lleva, en el fragmento de la URL (que nunca llega a un
  servidor), un secreto compartido. Mac y teléfono derivan llaves de sesión (X25519 efímero + HKDF,
  AES-GCM), con `node:crypto` de un lado y WebCrypto del otro. El relevo solo ve tramas cifradas,
  tamaños y horas. Ni nosotros podemos leer una conversación.
- **Avisos cifrados.** El puente cifra el contenido del aviso con las llaves de la suscripción del
  teléfono (RFC 8291) y el relevo solo firma con VAPID y entrega bytes opacos.
- **La interfaz** de `app.madre.run` es la misma del proyecto, servida como estática. Las llamadas
  de la página se vuelven RPC cifrado sobre el WebSocket, y el flujo SSE se vuelve tramas.
- **Privacidad visible.** El relevo aparece en Ajustes › Privacidad como destino de salida, con la
  frase «cifrado de extremo a extremo; el relevo no puede leerlo». Emparejar un teléfono es el
  acto explícito que lo enciende; sin teléfonos emparejados, nada sale.
- **Operación.** El Worker y el Durable Object viven junto al sitio de `madre.run` (ya en
  Cloudflare). Tope de tramas por buzón y buzones que caducan sin uso.

## 4 · Qué se puede hacer desde el teléfono

Lo que decide D-M03:

| Acción | Teléfono |
|---|---|
| Leer proyectos y conversaciones, buscar, abrir archivos en el visor | Sí |
| Escribir en #0 INCÓGNITO, #1 SOLO CONVERSAR y #2 CREAR, con modelo y esfuerzo; `/image`, `/module`, Intenciones | Sí |
| Responder elecciones, aprobar comandos que pide un agente y conceder un modo que pide, hasta #2 | Sí |
| Deshacer un cambio (DESHACER) | Sí |
| **STOPALL** y detener un turno | Sí, siempre |
| Ajustes: apariencia, proyecto, memoria, privacidad, versión | Sí |
| Encender o apagar los módulos de MADRE | Sí |
| Archivos y servidores | Para ver; «se ve mejor en la Mac» |
| Permisos y la llave de #3/#4 | No: se leen, se cambian en la Mac |
| #3 EDITAR | Llega con la fase 2 (su frase necesita `crypto.subtle`) |
| #4 ACCESO TOTAL | Nunca desde el teléfono en esta versión |
| Llaves de proveedor, instalar un módulo de terceros, olvidar memorias, editar archivos, emparejar otro teléfono | No: «Esto se hace en la Mac» |

En el teléfono no hay ventanas: lo que en la Mac flota (Ajustes, Diagnóstico, Módulos, Archivos,
Tus servidores, el visor) es una hoja del tamaño de la pantalla. La página entera hace scroll, para que
Safari esconda sus barras, y el Mapa de memoria es un mapa plano que se dibuja solo cuando algo cambia.

## 5 · Fases y entregas

**Fase 1 · En tu Wi-Fi (avance).**

- MOV-001 Puente.
- MOV-002 Dispositivos y llaves.
- MOV-003 Política del teléfono.
- MOV-004 Pantalla Inicio.
- MOV-005 Continuidad: borrador, conversación y posición; píldora «Continuar desde…».
- MOV-006 Tecla MADRE en tu teléfono y emparejamiento en dos pasos.
- MOV-007 Teléfonos en Ajustes › Privacidad.
- MOV-008 Origen «desde iPhone» en el registro.
- MOV-009 Pruebas, incluido un recorrido de punta a punta con un navegador en tamaño teléfono.

D-M01, D-M02 y D-M03 resueltas el 2026-10-07.

**Fase 2 · En cualquier lugar.**

- MOV-010 Relevo: Worker y Durable Object.
- MOV-011 Protocolo cifrado de extremo a extremo y RPC.
- MOV-012 `app.madre.run` como PWA (manifiesto, íconos PNG de 192 y 512 px y `apple-touch-icon`, service worker).
- MOV-013 Avisos cifrados.
- MOV-014 Presencia, y Mac dormida o despierta.
- MOV-015 El relevo en Privacidad y en el registro de salidas.

Requiere D-M04 y D-M05.

La versión de cada fase se decide al cerrarla (D-M06). Windows llegó en `1.1.0`, dentro de WSL2
(`docs/WINDOWS.md`, D-001 y D-003).

## 6 · Trazabilidad

| Id | Qué | Dónde | Fase | Estado |
|---|---|---|---|---|
| MOV-001 | Puente dentro del primer proyecto que toma el puerto, registro de proyectos, reenvío con `Host`/`Origin` reescritos y proyecto elegido por cookie | `src/bridge/server.mjs`, `host.mjs` | 1 | HECHO · 2026-10-07 |
| MOV-002 | Invitaciones, sesiones por dispositivo, HMAC en `~/.pulse/devices.json`, llave en `~/.pulse/credentials/`, redes por la dirección del router, QR propio | `src/bridge/devices.mjs`, `network.mjs`, `qr.mjs` | 1 | HECHO · 2026-10-07 |
| MOV-003 | Lista de rutas permitidas y política por modo (sección 4), tope de peticiones, cabeceras | `src/bridge/policy.mjs` | 1 | HECHO · 2026-10-07 |
| MOV-004 | Pantalla Inicio: estado por proyecto, quién trabaja, «Te espera» (elecciones y comandos propuestos desde el último mensaje del humano, modos pedidos por un plan) con el proyecto que espera arriba y abierto en esa conversación, Detener todo (con segundo toque) | `public/salas.*`, `/api/glance` | 1 | HECHO · 2026-10-07 |
| MOV-005 | Continuidad en ambos sentidos | `public/app.js`, puente | 1 | HECHO · 2026-10-07 |
| MOV-006 | Tecla MADRE en tu teléfono, QR, pantalla «Listo» y guía de «Añadir a inicio» | `public/` | 1 | HECHO · 2026-10-07 |
| MOV-007 | Teléfonos emparejados y «Olvidar» | Ajustes › Privacidad | 1 | HECHO · 2026-10-07 |
| MOV-008 | `x-madre-device` → «desde iPhone» en el registro | `src/room.mjs` | 1 | HECHO · 2026-10-07 |
| MOV-009 | Pruebas de puente, política, emparejamiento, red, continuidad y QR | `test/phone-bridge.test.mjs`, `test/qr.test.mjs` | 1 | HECHO · 2026-10-07 |
| MOV-010 | Relevo en Cloudflare | sitio de `madre.run` | 2 | ABIERTO |
| MOV-011 | Cifrado de extremo a extremo y RPC sobre WebSocket | puente + `app.madre.run` | 2 | ABIERTO |
| MOV-012 | PWA instalable | `app.madre.run` | 2 | ABIERTO |
| MOV-013 | Avisos cifrados (RFC 8291 + VAPID) | puente + relevo | 2 | ABIERTO |
| MOV-014 | Presencia, Mac dormida o despierta | puente + interfaz | 2 | ABIERTO |
| MOV-015 | El relevo como destino declarado en Privacidad | `src/outbound.mjs` | 2 | ABIERTO |

## 7 · Qué se toma de Apex OS

Revisión del 2026-10-07 de `~/Developer/apex-os`. Apex no tiene túnel, relevo, SSE ni avisos, y
es de un solo dueño. **No se usan sus servidores ni su base de datos para MADRE.** Se toman
patrones, reescritos sin dependencias:

| Patrón | En Apex | Para |
|---|---|---|
| Invitación por QR de un solo uso y sesión de dispositivo con HMAC | `apps/api/src/devices.ts`, `session.ts`, `server.ts:277-345` | MOV-002 |
| Lista blanca de rutas, `Sec-Fetch-Site`, orígenes explícitos | `apps/api/src/server.ts:110-152`, `:555` | MOV-003 |
| Cascarón PWA | `apps/web/public/manifest.webmanifest`, `sw.js` | MOV-012 (y le falta lo de iOS) |
| OAuth 2.1 + MCP por HTTP | `apps/api/src/oauth*.ts`, `mcp.ts` | Futuro: el proyecto como conector de Claude en el teléfono |

## 8 · Decisiones abiertas

| Id | Pregunta | Bloquea | Estado |
|---|---|---|---|
| **D-M01** | La regla decía que MADRE no guarda credenciales propias (`src/credentials.mjs:3-6`). Emparejar exige al menos una llave propia. Se enmienda: MADRE no guarda credenciales de proveedores; la llave de sus teléfonos vive solo en `~/.pulse/credentials/`, solo para el dueño, y de cada teléfono se guarda la huella, nunca el token (`AGENTS.md`). En Windows `0o600` no protege nada (WIN-014): la función no se ofrece allí hasta que ese id se cierre. | Fase 1 | **RESUELTA · 2026-10-07** |
| **D-M02** | La fase 1 sale como avance, limitada a las redes que la persona marca como de confianza. | Fase 1 | **RESUELTA · 2026-10-07** |
| **D-M03** | La política de la sección 4. El 2026-10-07, ya con el teléfono en la mano, se abrieron Ajustes (salvo permisos), los módulos de MADRE, conceder un modo hasta #2 y DESHACER. #3 desde el teléfono pide la frase, que se comprueba con `crypto.subtle`; en la fase 1 (`http`) el navegador no lo ofrece, así que #3 desde el teléfono llega con la fase 2. | Fase 1 | **RESUELTA · 2026-10-07** |
| **D-M04** | Costos y límites del relevo: plan de Cloudflare, tope por buzón, caducidad. | Fase 2 | **RESUELTA · 2026-10-11** · Por ahora solo para las Macs del dueño, en su cuenta. El modelo para el público (gratis con tope, de pago fuera de casa o un relevo propio por persona) se decide cuando haya más usuarios. Referencia: una hora de teléfono activo cuesta unos 450 GB-s y unas 125 peticiones de Durable Object (unos 0.006 USD en plan de pago); un buzón sin teléfono hiberna y no cuesta. |
| **D-M05** | ¿`app.madre.run` como subdominio del sitio actual, o proyecto aparte en Cloudflare? | Fase 2 | **RESUELTA · 2026-10-11** · Un Worker propio, `madre-relay`, en una carpeta del repo de la landing, que sirve `app.madre.run` con la app y el relevo en el mismo dominio. La landing no se toca. |
| **D-M06** | Número de versión de cada fase. | Cierre de cada fase | **ABIERTA** |
| **D-M08** | ¿El teléfono sale en MADRE 1.0? Safari con su advertencia de conexiones no seguras está en modo solo HTTPS y rechaza el `http` del puente. | 1.0 | **RESUELTA · 2026-10-11** · No: queda como vista previa. En una Mac sin `phone.preview` en `config.json` (o `PULSE_PHONE=1`) el puente no abre, `/api/phone` no empareja, la tecla no está en la barra, y Ajustes y el recorrido dicen «Próximamente». La Mac del dueño la tiene encendida. |
| **D-M07** | ¿Mantener la Mac despierta mientras un agente trabaja y hay un teléfono conectado? Lanza un proceso del sistema; revisar `docs/WINDOWS.md` antes. | Fase 2 | **ABIERTA** |

## Anexo · Lo que se dirá al público cuando se publique

El 2026-10-12 el teléfono se ocultó de la versión pública: solo se ofrece en una copia que corre desde el código fuente, con `.git` al lado de `src/` (`FROM_SOURCE` en `src/server.mjs`), y con `phone.preview` o `PULSE_PHONE=1`. Lo que el paquete de npm lleva no lo menciona. Estos textos salieron del CHANGELOG de 1.0 y de `docs/REFERENCE.md` y esperan aquí a que el teléfono sea estable.

#### Tu Mac en tu teléfono (avance)

- **Tus salas, en el teléfono, por tu Wi-Fi.** Una tecla nueva en la barra, **Teléfono**, muestra un QR. Lo escaneas con la cámara y listo: sin cuenta, sin contraseña, sin nada que teclear. El código sirve una vez y durante diez minutos. La primera vez, MADRE pregunta si la red es de confianza, porque el teléfono llega a la Mac por tu red local; solo se ofrece en la de tu casa u oficina.
- **Salas: todas a la vez.** El teléfono abre en una lista de todas las salas abiertas en tu Mac, con lo último que se dijo y quién está trabajando. La que **te espera** sube arriba, en tu acento, con lo que espera dicho en una línea («@claude te pregunta…», «@codex quiere correr npm test», «@gemini pide #2 CREATE»), y al tocarla abre justo esa conversación. Un toque abre la sala con su conversación en vivo; *Detener todo*, con un segundo toque para confirmar, frena a todos los agentes de todas las salas. Se agrega a la pantalla de inicio como una app.
- **Continuidad, como Handoff.** Lo que dejaste en la caja, la conversación y el mensaje donde ibas pasan de un lado al otro: en el teléfono, *Seguir donde ibas* arriba de Salas; en la Mac, *Continuar · proyecto* en la barra. Lo que escribes desde el teléfono queda en el registro con su origen.
- **Desde el teléfono se conversa como en la Mac, hasta #2.** Preguntas con modelo y esfuerzo, `/image`, `/module` e Intenciones; respondes lo que un agente pregunta, apruebas lo que quiere correr, deshaces y detienes. También cambias los ajustes (apariencia, sala, memoria, privacidad) y enciendes o apagas los módulos de MADRE. Archivos y servidores se ven y avisan que se trabajan mejor en la Mac. #3 CONTROL, #4 AIRLOCK, los permisos, las llaves y lo que instala código se quedan en la Mac; la sala lo verifica por su lado aunque el puente ya lo haya filtrado.
- **Hecho para el pulgar.** En el teléfono no hay ventanas: Ajustes, MU/TH/UR, Módulos, conversaciones y el visor suben como hojas redondeadas, una a la vez, con su asa arriba; se cierran deslizando hacia abajo, tocando fuera o con su ×. Abrir una hoja ya no enfoca la búsqueda ni levanta el teclado. La página entera hace scroll para que Safari esconda sus barras, los campos tienen 16 px para que tocar uno no acerque la pantalla, la caja de texto tiene más aire y sube con el teclado, y tu fondo de pantalla y tu acento se ven al cambiarlos.
- **NOSTROMO en el teléfono es un mapa.** MOTHER al centro, cada memoria un punto del color de su tipo en el sector de su tipo, y las redes trazadas entre ellas. Mientras más se apoya la sala en una memoria, más cerca de MOTHER está. Un dedo lo mueve, dos lo acercan, y tocar un punto ilumina sus enlaces, lo desliza a la vista y sube su ficha desde abajo, como en un mapa; Recentrar regresa al mapa completo. Solo se dibuja cuando algo cambia, así que leerlo no gasta el teléfono. Olvidar una memoria sigue siendo de la Mac, y su botón ya no aparece en el teléfono.
- **Nada se sale de la pantalla ni flota encima de la conversación.** Las respuestas ya no se cortan a la derecha: la línea de arriba de cada burbuja conserva quién habló y cede lo demás, y los tokens quedan abajo, donde ya estaban. Los chips de modo, modelo y esfuerzo caben en una fila sin deslizarse de lado. La barra pasa a «•••» lo que no cabe, también en Safari, donde «‹ Salas» se cortaba y Ajustes quedaba pegado al borde. Las conversaciones son una tecla en la barra, junto a «‹ Salas», en vez de un botón flotando sobre los mensajes. Con el teclado abierto, la barra se queda arriba y la caja justo encima del teclado, también en una hoja. Un toque hace solo lo que tocó: sin destello gris, sin acercar con doble toque y sin que la sala se mueva detrás de una hoja abierta.
- **Cómo está hecho.** Las salas siguen escuchando solo en tu Mac. Un puente, que vive dentro de la primera sala que lo toma, es lo único que el teléfono alcanza: acepta direcciones privadas, el nombre de esta Mac y un teléfono con su llave. De cada teléfono se guarda una huella, nunca su llave, y la llave del puente vive solo en `~/.pulse/credentials/`. Los teléfonos y las redes se olvidan en Ajustes › Privacidad › Teléfonos.

#### MADRE EN TU TELÉFONO · AVANCE

Tus proyectos siguen en tu Mac; el teléfono es otra ventana a ellos, por tu Wi-Fi. El plan completo vive en `docs/MOBILE.md`.

1. En la barra, **MADRE en tu teléfono** (el ícono del teléfono). La primera vez pregunta si la red es de confianza: el teléfono llega a la Mac por `http` en tu red, así que solo se ofrece en la de tu casa u oficina.
2. Escanea el QR con la cámara. El código sirve una vez y durante diez minutos. El teléfono abre **Inicio**: todos los proyectos abiertos en tu Mac, quién trabaja en cada uno y *Seguir donde ibas* con tu conversación, tu lugar y tu borrador. Agrégalo a la pantalla de inicio para abrirlo como una app.

| Desde el teléfono | |
|---|---|
| Leer, buscar, abrir archivos en el visor | Sí |
| Escribir en `#0`, `#1` y `#2` · responder elecciones · correr lo que un agente propuso | Sí |
| `STOPALL` en un proyecto, o **Detener todo** en todos desde Inicio | Sí, siempre |
| Ajustes (salvo permisos) · encender o apagar los módulos de MADRE | Sí |
| Archivos y servidores | Para ver; se trabajan mejor en la Mac |
| `#3 EDITAR`, `#4 ACCESO TOTAL`, permisos, llaves, instalar módulos de terceros, olvidar memorias, emparejar otro teléfono | En la Mac |

- **Continuidad.** Lo que dejas en la caja, la conversación y el mensaje donde ibas viajan de un lado al otro. En la Mac aparece *Continuar · proyecto* en la barra; en el teléfono, arriba de Inicio.
- **Quién lo dijo.** Lo que se escribe desde el teléfono queda en el registro con su origen («desde tu iPhone»).
- **Teléfonos y redes** en Ajustes › Privacidad › Teléfonos: cada uno con *Olvidar*, y un interruptor que apaga el acceso de todos.
- **La red** se reconoce por la dirección de hardware de su router. Si MADRE no puede leerla, la red es desconocida y el teléfono no se ofrece ahí.

- **El teléfono entra, no sale nada.** Con un teléfono emparejado, MADRE en tu teléfono escucha en tu Wi-Fi (puerto 4316) solo mientras la Mac está en una red que marcaste de confianza. Acepta únicamente direcciones privadas, el nombre de esta Mac y un teléfono con su llave. Es tráfico de tu red local; nada viaja a internet.

#### Otras líneas del CHANGELOG de 1.0

- **En el teléfono**, cada sala de Salas lleva la misma franja de sus memorias por tipo y cuántas guarda.
- **En un teléfono la barra cabe**: los íconos que no caben pasan, desde el final de tu orden, a una tecla «Más» (•••) que abre una tarjeta con ellos; Ajustes y el logo siempre quedan a la vista. Mientras la acomodas, la barra se desliza de lado para alcanzar todos sus íconos.

## 9 · Bitácora

- `2026-10-11` · Probado en Safari de iOS 26: con «Advertencia de conexión no segura» el modo solo HTTPS bloquea el puente (`Failed to navigate to an HTTP URL with HTTPS-only mode enabled`). D-M04, D-M05 y D-M08 resueltas: el teléfono sale de la 1.0 como «Próximamente» y el relevo se construye solo para las Macs del dueño. Arreglos de Safari: módulos que el puente no dejaba pasar, burbujas cortadas por una pista de grid, franja bajo la hora, `:hover` pegado al tocar, la barra de la Mac mientras carga.

- `2026-10-07` · Plan escrito. Revisión de Apex OS para reutilizar patrones. Fases 1 y 2 sin
  empezar.
- `2026-10-07` · D-M01, D-M02 y D-M03 resueltas. Empieza la fase 1.
- `2026-10-07` · Fase 1 construida (MOV-001..009). Decisiones de construcción: el puente vive
  dentro de un proyecto y el puerto hace de candado, en vez de un proceso aparte; el proyecto se elige por
  cookie para no tocar la página. Hallazgo: en macOS, Node no ve la tabla `arp`; la red se reconoce
  por `ipconfig getsummary` (IPv6). El QR propio coincide con la librería `qrcode` en 2,360
  entradas. Un iPhone real se emparejó con el QR en pantalla; el resto se probó con el navegador
  en tamaño teléfono, por la IP de la red: emparejar, Inicio, abrir proyecto, #3/#4 bloqueados,
  continuidad en los dos sentidos, olvidar.
- `2026-10-07` · Primera ronda con un iPhone real: logo de Inicio, scroll de página para que
  Safari esconda sus barras, campos a 16 px (sin zoom al tocar), barra sin desbordes, ventanas
  como hojas, Mapa de memoria fijo, Ajustes y módulos abiertos al teléfono (D-M03 ampliada).
- `2026-10-07` · «Te espera» en Inicio: el proyecto lleva en memoria lo que espera al humano (no lee el
  registro en cada consulta) y lo que lleva más de 12 horas sin respuesta deja de contar. Con
  esto la fase 1 queda completa.
- `2026-10-07` · Conversaciones en el teléfono: una hoja a la vez por encima de la barra y la caja
  (antes la tapaban y no había salida), y el teléfono ve cada conversación por su dirección
  (`/?en=<id>`, la misma maquinaria `?chat=` de la mitad derecha). Elegir o empezar una
  conversación en el teléfono ya no cambia la que el proyecto tiene abierta en la Mac: antes la Mac
  se quedaba mostrando una y enviando a otra.
- `2026-10-07` · Pasada de UX con el iPhone real. El fondo de pantalla no se veía: el fondo del
  `html` impedía que el del `body` subiera y el `body` lo tapaba. Los cierres de las hojas se
  ocultaban con los botones de ventana (comparten `surface-mode`). Un `<dialog>` enfoca su primer
  campo al abrirse y en iOS eso levanta el teclado: cada hoja abre con el foco en un ancla sin
  campo. Hojas al estilo iOS (asa, velo, deslizar para cerrar, esquinas de 20 px), caja de texto
  con más aire y una altura que sigue al teclado por `visualViewport`. Tus servidores en el teléfono
  es una lista con su estado, sin el navegador de la Mac. Queda por confirmar en el iPhone: el
  teclado, el gesto de deslizar y las áreas seguras.
- `2026-10-07` · Segunda pasada, en el Safari real del simulador de iOS (iPhone 17 Pro, iOS 26),
  que mostró lo que el emulador de Chrome escondía: en Safari «‹ Inicio» se encogía en vez de
  desbordar, así que la barra nunca pasaba teclas a «•••»; el hueco bajo la conversación medía
  906 px por medirse desde la posición de la caja; con el teclado, `getBoundingClientRect` es
  relativo a la vista visible y `innerHeight` se encoge, y la caja quedaba a media pantalla. Ahora
  la caja y la barra siguen a `visualViewport` (`--kb`, `--vv-top`) y las hojas también. El
  encabezado de cada burbuja ya no ensancha la columna, los chips caben sin deslizarse, el botón
  de conversaciones vive en la barra y no flota, y se quitaron el destello de toque, el zoom por
  doble toque y el scroll detrás de una hoja. Sobre el reloj, Safari 26 muestra la página a su
  manera; agregada a inicio, el área segura deja la barra debajo. Para probar: cada `simctl
  openurl` abre una pestaña con su propio flujo en vivo, y a las seis Safari deja de cargar
  (límite de HTTP/1.1 por servidor); se cierra Safari del simulador para empezar limpio.
- `2026-10-08` · El Mapa de memoria en el teléfono deja de ser la foto fija del cerebro (se veía como una
  mancha) y pasa a ser un mapa plano: sectores por tipo, el núcleo al centro, enlaces trazados, puntos
  de tamaño fijo en pantalla y proporcionales entre sí, un dedo mueve, dos acercan, se dibuja solo
  cuando cambia algo. La ficha sube desde abajo y no ofrece olvidar (D-M03). El núcleo de la memoria ya
  no enfoca su consola al abrirse en el teléfono.
- `2026-10-12` · El teléfono se oculta de la versión pública hasta que sea estable: solo una copia corrida desde el código fuente (con `.git`) y con `phone.preview` o `PULSE_PHONE=1` lo ofrece. Sin «Próximamente»: donde no se ofrece, ni la barra, ni Ajustes, ni el recorrido lo nombran. Sus textos para el público esperan en el anexo de arriba.
