# MADRE · CONECTORES · traer un servicio a la sala

Documento único de este trabajo. Todo lo que se decida, se construya o se descarte sobre
conectores —lo que trae datos de fuera y lo que manda algo hacia fuera— se anota aquí y
en ningún otro lado.

| | |
|---|---|
| Estado | **Fase 2 completa** · la puerta, la bodega, la escalera y el primer conector: CORREO manda. Sin decisiones abiertas |
| Versión objetivo | `0.7.0` |
| Origen | Lectura de código del 2026-10-02 sobre `main` @ `b021e35` |
| Medido | CORREO pesa 418 líneas de código (122 SMTP + 189 servidor + 107 módulo) y 278 de pruebas. Cero dependencias |
| Antes de escribir uno | **§6**: qué alcanza un módulo y de quién es el muro. Contesta «¿se puede conectar con X?» sin escribir una línea |
| Regla en vigor | Un conector **declara a dónde llega** o su tráfico sale en el registro como dirección no declarada |

---

## 1 · Qué es un conector y qué no

Un conector es un **módulo** que entrega a cada turno una herramienta MCP que habla con
un servicio de fuera. No es una categoría nueva: es lo que ya hacen IMAGE STUDIO (los
modelos de imagen de Gemini) y el servidor de memoria (el archivo de la sala).

**Dentro del alcance:** que un módulo pueda declarar a dónde llega; dónde vive la llave
que necesita; y qué ceremonia hace falta cuando un conector **manda** algo en vez de solo
leer.

**Fuera del alcance:** cualquier nube de MADRE. Un conector habla desde *esta* máquina con
un servicio del *usuario*, con las credenciales del usuario. No hay intermediario.

---

## 2 · Lo que ya está listo

- **El andamiaje entero del SDK.** Un módulo es un archivo que no importa nada: ficha,
  interruptor, ajustes declarados, comandos `/`, rutas bajo `/api/x/<id>/`, condiciones
  para MU/TH/UR. Se instala arrastrándolo a MÓDULOS.
- **`toolsForTurn(ctx, turn)`**, que es el enganche: devuelve descriptores de servidor MCP
  y los cuatro agentes tienen esa herramienta en su turno.
- **Dos conectores funcionando como plantilla**, con su tamaño real medido:
  `src/mcp/memory-server.mjs` (221 líneas) y `src/mcp/image-server.mjs` (202).
- **Las vallas del SDK:** un módulo no puede usar rutas fuera de `/api/x/<id>/`, ni grabar
  eventos `message.*` o `agent.*`, ni recibir credenciales de nadie. Un fallo suyo no
  detiene la sala.
- **CN-001 · Declaración de destino** (esta tanda). Ver §3.

---

## 3 · Trazabilidad

### CN-001 · Un módulo declara a dónde llega — **hecho**

`src/outbound.mjs` no es un registro, es un contrato: cada dirección que el proceso puede
alcanzar está escrita en el código con cuatro respuestas —qué viaja, cuándo, a dónde, y
dónde se apaga— y parchea `fetch` global para que ningún módulo pueda evitar el registro.

Un conector rompía eso sin querer: su tráfico salía como «fue a una dirección que nada
aquí declara», que es verdad y es inútil — el humano no podía distinguir un conector que
instaló de algo yendo mal.

Ahora un módulo declara `reaches: [{ id, host, to, what, when, where }]`, en la misma
forma y contestando las mismas preguntas. Y:

- **Se guarda aparte de las del núcleo y se marca con `module`.** Quién prometió qué es
  parte de la promesa: MADRE responde por su lista y solo *reporta* las de un módulo.
- **Se reconstruye en cada carga de módulos**, nunca se acumula: desinstalar un conector
  se lleva su destino con él.

### CN-002 · Dónde vive la llave — **hecho**

Aquí hay una tensión real con una promesa escrita. Hoy `src/credentials.mjs` escribe una
llave **solo donde ese CLI la busca** (`~/.gemini/.env`, el `auth.json` de OpenCode), con
`0600`, y la ficha dice «MADRE no guarda copia». Para un conector **no hay CLI**: el
módulo de MADRE necesita el token él mismo.

O sea: un conector obliga a decidir si **MADRE empieza a guardar secretos**. Es D-001 y no
se toma a la ligera.

### CN-003 · Mandar no es leer — **hecho**

Un conector que lee es reversible: en el peor caso trajo algo que no servía. Un conector
que **manda** —un correo, un mensaje, un registro en un sistema— no lo es. Y lo que sale
lleva el nombre del usuario.

MADRE ya tenía la escalera: en `#4` AIRLOCK la regla es *«antes de que algo salga, dilo en
una línea: exactamente qué sale y a dónde, y luego hazlo»*. Un conector que manda vive ahí.

Lo impone el núcleo en `toolsForTurn`, no cada módulo: una herramienta declarada en `sends`
se retira de la lista por debajo de `#4`, y el `brief` dice por qué viene corta. Un módulo
no puede ampliarse su propio permiso olvidándose de declarar.

### CN-005 · El primer conector: CORREO manda correo — **hecho**

Un módulo (`src/modules/correo.mjs`), un servidor MCP (`src/mcp/smtp-server.mjs`) y un cliente
SMTP de 122 líneas sobre `node:tls` (`src/smtp.mjs`). Sin dependencias. Gmail con contraseña de
aplicación, puerto 465, TLS desde el primer byte — nunca STARTTLS sobre un puerto en claro,
porque entonces la sesión empieza destapada.

Lo que hace que esto sea un conector y no un script que manda correos:

- **La llave vive en la bodega.** `ctx.vault` es el rincón de este módulo en `src/vault.mjs`, con
  el id cerrado por construcción en el SDK: pedir el secreto de otro módulo no es algo que un
  módulo pueda *expresar*. La contraseña solo sale de ahí al entorno del proceso que se levanta
  para un turno; nunca al prompt, al resultado, al ledger ni al registro de salidas.
- **El destino está declarado.** `reaches` pone `smtp.gmail.com` en el registro como algo que
  este módulo firmó. Y si el humano apunta CORREO a otro proveedor, se vuelve a declarar bajo el
  mismo id, así que el registro deja de responder por un servidor que ya no se usa.
- **Mandar es del peldaño `#4`.** `sends: ['send_email']` y el núcleo lo retira por debajo de
  AIRLOCK. No «no funciona»: ni siquiera se le cuenta al modelo que existe.
- **Una lista de permitidos**, opcional, en el servidor y no en el prompt — un prompt es una
  sugerencia. Vacía significa cualquiera, a propósito: estrecharla es algo que el humano
  enciende, no un silencio por omisión.

Lo que se rechaza antes de abrir el socket: una dirección con salto de línea (así es como un
mensaje adquiere destinatarios que nadie escribió), un asunto vacío, un cuerpo vacío. Y una línea
del cuerpo que empiece con punto se duplica, que es el escape del propio protocolo: olvidarlo es
cómo un mensaje se corta solo a la mitad.

**Un agujero que apareció al hacerlo:** `defineModule` nunca llevaba `reaches` al objeto del
módulo, así que `declareDestinations` en `modules/index.mjs` —escrito en CN-001— nunca recibía
nada. CN-001 estaba a medias desde que se dio por hecho. Arreglado, y ahora la prueba de
`outbound` exige a cada módulo las mismas cuatro respuestas que a MADRE.

**Lo que NO hace, dicho aquí para que no se descubra usándolo:** adjuntos, HTML, CC/BCC, colas,
reintentos. Un mensaje de texto plano, o nada.

### CN-004 · Lo que el conector trae, viaja

Un conector de correo mete correos en el prompt, y ese prompt va a OpenAI, Anthropic o
Google según el agente. No es un defecto del diseño: es su consecuencia, y hay que decirla
en la ficha del conector, no en la letra pequeña.

`PRIVACY` (términos que nunca aparecen) y `#0 GHOST` (lo que no se recuerda) siguen siendo
las salidas. `@madre`, con Ollama, no sale de la máquina.

---

## 4 · Decisiones abiertas

**D-001 · ¿MADRE guarda secretos?** (CN-002) — **CERRADA 2026-10-02: (a), bodega propia.**
Hecha en `src/vault.mjs`. El razonamiento: el usuario sigue estando en local, así que una
bodega en su máquina no mueve el secreto a ningún sitio nuevo — solo lo pone donde hace
falta, porque un conector no tiene CLI al que entregárselo. Los términos están escritos en
la cabecera del archivo y probados: `0600` dentro de `0700`, solo desde `127.0.0.1`, el
ledger anota que se guardó una y con qué nombre pero nunca el valor, y `summary()` —lo
único que sale de ahí para el resto de MADRE— lleva nombre y longitud, jamás el secreto.

**D-002 · ¿Qué ceremonia pide un conector que manda?** (CN-003) — **CERRADA 2026-10-02: `#4`.**
Mandar vive en AIRLOCK y en ningún peldaño por debajo. Lo impone el núcleo, no la buena
voluntad del módulo: un conector declara qué herramientas suyas mandan (`sends`) y
`toolsForTurn` las retira de la lista por debajo de `#4`, así que al modelo ni siquiera se
le cuenta que existe una herramienta que no puede usar. Un servidor cuyas herramientas
*todas* mandan no viaja entero. Y un módulo que no declare no amplía nada por omisión:
lo que no se declara, no se retira — pero tampoco se puede usar para mandar sin que el
humano esté en `#4`, porque ahí es donde la regla de AIRLOCK ya obliga a decir en una
línea qué sale y a dónde.

**D-003 · ¿Cuál es el primer conector, y por qué camino?** — **CERRADA 2026-10-02: correo, SMTP,
mandar primero.** Hecho en `src/smtp.mjs`, `src/mcp/smtp-server.mjs` y `src/modules/correo.mjs`.
La mitad de *leer* sigue abierta y es ahora **D-004**.

**D-004 · ¿Cómo lee CORREO el correo?** — **CERRADA 2026-10-02: no se hace, y la razón importa
más que la decisión.** `gmail.readonly` es un scope **restringido**: evaluación de seguridad CASA
anual (~540–1.000 USD por la vía autoservicio, ciclo de 6 a 12 semanas) y, sin verificar, la app
queda en ~100 usuarios de prueba detrás de una pantalla que dice que Google no la ha revisado.
Para algo que se instala desde npm y corre en la máquina de cada quien, eso significa que cada
usuario tendría que dar de alta su propio proyecto en Google Cloud: la alta entera, repetida por
persona. El otro camino —IMAP con la contraseña que ya está en la bodega— no tiene ese muro pero
paga MIME, y sobre todo abre una superficie que no existía al mandar: **el cuerpo de un correo es
texto que no escribió el humano y entraría al prompt de un agente.** Mandar ya resuelve el caso
que se pidió. Leer espera a que haya una razón, no una posibilidad.

Lo que sí dejó: el mapa de §6, que es lo que de verdad hacía falta saber.

---

## 5 · El primer conector: correo

Pedido: recibir y mandar correo, por el camino más fácil. Tres caminos, y «fácil» no
significa lo mismo en los tres.

| camino | alta | leer | mandar | dependencias |
|---|---|---|---|---|
| **IMAP/SMTP con contraseña de aplicación** | minutos, en la cuenta de Google | IMAP a mano: protocolo con estado, literales, MIME. **Mucho** | SMTP sobre TLS: `EHLO`, `AUTH LOGIN`, `DATA`. **~150 líneas** | ninguna |
| **Gmail API (OAuth 2.0)** | proyecto en Google Cloud, pantalla de consentimiento, ámbitos | HTTPS y JSON. Fácil | HTTPS y JSON. Fácil | ninguna, pero hay que implementar OAuth |
| **Servidor MCP de terceros por `npx`** | según el paquete | hecho | hecho | un paquete que no escribimos, con acceso a tu correo |

**Lo honesto sobre cada uno:**

- **Outlook / Microsoft 365 no es más fácil.** La autenticación básica de Exchange Online
  lleva años retirándose y las contraseñas de aplicación están desactivadas en la mayoría
  de las cuentas de organización. El camino real ahí es Azure AD + Graph, que es tan
  OAuth como Gmail y con más papeleo. **Gmail es el fácil.**
- **La contraseña de aplicación es el alta más barata** y evita OAuth entero, pero deja
  *leer* como la mitad cara: IMAP y MIME son un pantano, y hacerlo mal se nota.
- **El paquete de terceros** es el menos trabajo y el más riesgo: le das acceso a tu correo
  a código que nadie de aquí leyó. Si se elige, se elige a conciencia y con el paquete
  fijado a una versión.

**La recomendación fue, por fases, y así se hizo:**

1. ~~**Mandar primero, por SMTP con contraseña de aplicación.**~~ **Hecho** (CN-005). La
   estimación era «~150 líneas sin dependencias»; salieron 122 de cliente SMTP más 189 de
   servidor MCP más 107 de módulo, sin dependencias. El valor inmediato («MADRE, mándale esto
   a X») y el caso que de verdad importa: lo que sale no vuelve.
2. **Leer después.** Sigue pendiente y ahora es **D-004**. D-001 ya está resuelta, así que
   aquello de «para esa fecha la bodega ya estará» se cumplió: lo que queda es elegir entre el
   pantano de IMAP y el papeleo de OAuth, sobre mesa limpia.

---

## 6 · Qué alcanza un módulo, y de quién es el muro

Chocar con Gmail sirvió para algo: enseñó dónde está el límite de verdad. **No es de MADRE.**

### El SDK no es el límite

CORREO entero son 418 líneas y no hizo falta inventar nada: el andamiaje ya estaba. Un módulo
puede levantar un proceso, hablar cualquier protocolo sobre TCP o TLS, guardar su propia llave,
declarar a dónde llega, servir sus propias rutas, traer comandos `/` y dibujar su piso de ficha.
**Lo que un proceso de Node puede hacer en esta computadora, lo puede hacer un módulo.**

### El límite es cómo cada servicio deja que un humano entregue su propia llave

Esa es la única pregunta que decide si un conector es posible, y se contesta en tres peldaños.

#### Peldaño A · Pegas una llave y funciona

El servicio le da al humano una credencial estática en minutos —token personal, API key,
contraseña de aplicación—, revocable sola, sin registrar ninguna app y sin que nadie revise
nada. **Un conector aquí funciona el día que se escribe, para cualquiera que instale MADRE.**
Es el peldaño de CORREO y es donde vive casi todo lo útil:

| | con qué llave |
|---|---|
| GitHub, GitLab | token personal (GitHub lo tiene de alcance fino, por repositorio) |
| Linear, Todoist, Airtable, Trello | API key o token personal de la cuenta |
| Notion | *integración interna*: token estático, un solo espacio de trabajo, sin revisión de seguridad; las páginas se comparten con ella una por una |
| Jira, Confluence | token de API de Atlassian, con el correo de la cuenta |
| Slack, Discord, Telegram | una app o bot propio en el espacio propio (Telegram lo da BotFather en un minuto) |
| Cloudflare, Stripe, Shopify | token de API acotado; Stripe permite uno de solo lectura, Shopify una *custom app* en la tienda propia |
| Odoo | API key del usuario, en la API JSON-2. **XML-RPC se descontinúa en 19.1**: una integración nueva no debería nacer ahí |
| Correo | contraseña de aplicación, SMTP e IMAP — ya hecho para mandar |
| Cualquier base de datos | Postgres, MySQL, Redis, SQLite: la cadena de conexión *es* la credencial |
| Cualquier API con `Authorization: Bearer` | si el humano puede copiar el token, el conector es posible |

#### Peldaño B · El usuario registra su propia app

OAuth 2.0 donde los permisos **no** son restringidos y el servicio no exige revisión para uso
personal. Es posible, pero el alta deja de ser «pega esta llave» y pasa a ser «crea una
aplicación, copia dos valores, autoriza en el navegador». Y hay un costo del lado de acá:
**MADRE nunca ha escrito un flujo OAuth.** `auth-probe.mjs` y `quota-sources.mjs` *leen* tokens
que otras CLIs ya consiguieron; levantar un redirect local, canjear un código y refrescarlo son
piezas que habría que escribir desde cero y mantener.

Aquí caen: Google Calendar, Drive y Sheets (permisos *sensibles*, con excepción de verificación
para uso personal); Microsoft Graph (registro en Azure AD); Mercado Libre (app en su DevCenter,
con validación de los datos del titular en México, Argentina, Brasil y Chile); Zoom; Spotify.

#### Peldaño C · Muro

Donde el servicio exige revisión, evaluación de seguridad o editor verificado para que su acceso
funcione fuera de pruebas — o donde los términos no admiten un cliente local de terceros.

Gmail en lectura (`gmail.readonly`, restringido, CASA anual, ~100 usuarios de prueba sin
verificar). Meta: WhatsApp Business, Instagram, Facebook, todas detrás de revisión de app. Banca,
que va por agregadores. Cualquier cosa que pida «editor verificado».

**Qué significa el muro en la práctica, dicho sin dramatismo:** no es «imposible». Es «imposible
como algo que funcione al instalarlo». Cada usuario tendría que ser su propio desarrollador, y un
producto que pide eso no tiene conector: tiene tarea.

### Qué no puede hacer un módulo, aunque el servicio se deje

Estas vallas son de MADRE y no las mueve ningún proveedor:

- Rutas solo bajo `/api/x/<id>/`. Jamás encima de una ruta de MADRE, jamás con el id de otro.
- No escribe eventos `message.*` ni `agent.*`: el relato de lo que pasó en la sala no se edita
  desde fuera.
- No lee el secreto de otro módulo. El id va cerrado dentro del SDK: no es que esté prohibido, es
  que no se puede escribir.
- No se amplía su propio permiso. Lo que manda se retira por debajo de `#4` desde el núcleo.
- Si se cae, se cae solo. Un fallo suyo no detiene un turno ni la sala.
- Corre con los permisos de quien abrió MADRE. Eso no es una valla: es la razón de que instalar
  el módulo de alguien más sea una decisión y no un clic.

### La regla para decidir si vale la pena

Un conector vale cuando las tres son ciertas:

1. **El humano consigue la credencial en menos de cinco minutos y sin ser desarrollador.**
2. **La credencial se revoca sola**, sin tocar la contraseña de la cuenta ni nada más.
3. **Lo que trae o lo que saca cabe en una línea** en la ficha — porque si no cabe, tampoco cabe
   en la cabeza de quien lo enciende.

Y una advertencia que vale para todo el peldaño A igual que para el C: **lo que un conector trae,
viaja** (CN-004). Un lector de lo que sea mete texto ajeno en el prompt, y ese prompt va al modelo
del agente. Es consecuencia del diseño, no defecto, y se dice en la ficha del conector — no en la
letra chica.

---

## 7 · Quién está enterado

`AGENTS.md`, `CLAUDE.md` y `GEMINI.md` apuntarán a este documento cuando empiece la fase 2.
No lo copian.

---

## 8 · Bitácora

| fecha | qué |
|---|---|
| 2026-10-02 | **SDK cerrado y comunicado.** El contrato son 36 campos, todos documentados, con una prueba que compara la guía contra el código en las dos direcciones. Ejemplo de conector que funciona tal cual, y la pregunta «¿se puede con X?» contestada dentro de la guía. En la sala: la tarjeta de desarrollo dice qué es un módulo y deja un botón a la caja de texto; `/modules` encuentra `/module` y ofrece cuatro instrucciones para editar. En el README, la declaración en lenguaje llano — y corregida la promesa «no guarda tus credenciales», que dejó de ser exacta el día que existió la bodega. |
| 2026-10-02 | **D-004 cerrada: leer no se hace todavía**, y el muro quedó mapeado en §6. Gmail en lectura es scope restringido con evaluación CASA anual y tope de ~100 usuarios sin verificar, así que no hay conector que funcione al instalarlo: habría que pedirle a cada usuario su propio proyecto en Google Cloud. De ahí salió lo que de verdad hacía falta: el límite de un módulo no es el SDK, es cómo cada servicio deja que un humano entregue su propia llave. Tres peldaños, con el catálogo de qué cae en cada uno. |
| 2026-10-02 | **D-003 cerrada y fase 2 completa: CORREO manda.** SMTP+TLS sin dependencias (418 líneas, 278 de prueba). Con él, tres piezas nuevas de núcleo que cualquier conector futuro hereda: `ctx.vault` acotado al módulo por construcción, `secrets` declarados que MADRE dibuja sola, y `reaches` validado en `defineModule`. Encontrado y arreglado de paso: `reaches` nunca llegaba al objeto del módulo, así que CN-001 llevaba desde su commit sin declarar nada. 386/386 pruebas. |
| 2026-10-02 | **D-001 cerrada: bodega propia** (`src/vault.mjs`) y **D-002 cerrada: mandar solo en `#4`**, impuesto por el núcleo. Con esto la fase 1 queda completa: declarar destino, guardar la llave y la escalera del envío. |
| 2026-10-02 | Documento abierto. **CN-001 hecho**: un módulo declara sus destinos (`reaches`), se guardan aparte de los del núcleo y marcados, y se reconstruyen en cada carga. D-001 (dónde vive la llave), D-002 (ceremonia para mandar) y D-003 (el primer conector) abiertas. Medido: los dos conectores que ya existen pesan 202 y 221 líneas. |
