# MADRE · CONECTORES · traer un servicio a la sala

Documento único de este trabajo. Todo lo que se decida, se construya o se descarte sobre
conectores —lo que trae datos de fuera y lo que manda algo hacia fuera— se anota aquí y
en ningún otro lado.

| | |
|---|---|
| Estado | **Fase 1 completa** · la puerta, la bodega y la escalera. Falta el primer conector (D-003) |
| Versión objetivo | `0.7.x` |
| Origen | Lectura de código del 2026-10-02 sobre `main` @ `b021e35` (0.6.1 sin publicar) |
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

**D-003 · ¿Cuál es el primer conector, y por qué camino?** Ver §5.

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

**Mi recomendación, por fases:**

1. **Mandar primero, por SMTP con contraseña de aplicación.** Es el valor inmediato
   («MADRE, mándale esto a X»), son ~150 líneas sin dependencias, y obliga a resolver
   D-001 y D-002 sobre el caso que de verdad importa: lo que sale no vuelve.
2. **Leer después**, decidiendo entonces entre IMAP propio y la API de Gmail con OAuth —
   con la ventaja de que para esa fecha D-001 ya estará resuelta.

---

## 6 · Quién está enterado

`AGENTS.md`, `CLAUDE.md` y `GEMINI.md` apuntarán a este documento cuando empiece la fase 2.
No lo copian.

---

## 7 · Bitácora

| fecha | qué |
|---|---|
| 2026-10-02 | **D-001 cerrada: bodega propia** (`src/vault.mjs`) y **D-002 cerrada: mandar solo en `#4`**, impuesto por el núcleo. Con esto la fase 1 queda completa: declarar destino, guardar la llave y la escalera del envío. |
| 2026-10-02 | Documento abierto. **CN-001 hecho**: un módulo declara sus destinos (`reaches`), se guardan aparte de los del núcleo y marcados, y se reconstruyen en cada carga. D-001 (dónde vive la llave), D-002 (ceremonia para mandar) y D-003 (el primer conector) abiertas. Medido: los dos conectores que ya existen pesan 202 y 221 líneas. |
