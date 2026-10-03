# MADRE SDK · escribe tus propios módulos

Un módulo de MADRE es **un archivo**. Sin build, sin dependencias, sin registrarse en ningún lado. Lo copias a una carpeta, pulsas RELOAD en MODULES y aparece con su interruptor. Puedes escribirlo a mano o pedírselo a una IA con este documento como contexto.

## Dónde vive

| Carpeta | Alcance |
|---|---|
| `~/.pulse/modules/*.mjs` | Todas tus salas |
| `<proyecto>/.madre/modules/*.mjs` | Solo ese proyecto |

Ningún agente puede escribir ahí: `.madre/` es zona prohibida en CONTROL y AIRLOCK, y `~/.pulse` está fuera de todo proyecto. Un módulo entra a MADRE solo porque tú lo pusiste.

## El archivo

El `export default` es un objeto plano. MADRE lo envuelve con `defineModule`. Hay dos ejemplos
completos, y los dos funcionan tal cual:

| | qué enseña |
|---|---|
| [`hello-module.mjs`](sdk/hello-module.mjs) | lo mínimo: interruptor, un ajuste, un comando `/hello` |
| [`connector-module.mjs`](sdk/connector-module.mjs) | un conector de verdad: llave en la bodega, destino declarado, y **un solo archivo que es la ficha al importarse y el servidor MCP al ejecutarse** |

Empieza por el primero. Si tu módulo habla con algo de fuera de esta computadora, copia el
segundo: esa forma no se adivina, y el modo obvio de escribirla falla **en silencio** (ver
«Un archivo que también es servidor», abajo).

```js
export default {
  id: 'hello',            // kebab-case
  name: 'HELLO',
  summary: 'Qué hace, en una frase.',
  settings: { enabled: false, greeting: 'hola' },
  async status(ctx) { return { status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? 'on' : 'off' } }; },
  slash: [{ name: 'hello', usage: '/hello [name]', summary: 'Saluda.', async execute(ctx, args) { return { ok: true, title: 'HELLO', text: `${ctx.settings.greeting}, ${args[0] ?? 'crew'}` }; } }],
};
```

**Tu módulo no importa paquetes.** Ni a MADRE, ni al SDK, ni nada de npm. Antes de instalarlo, MADRE copia tu archivo a una carpeta temporal aparte y lo carga ahí —así revisa qué es sin que corra donde vive— y en esa carpeta no hay `node_modules`: un `import` por nombre de paquete no resuelve y la instalación falla.

Los **builtins de Node sí**, siempre: `node:fs`, `node:url`, `node:tls`, `node:child_process`. Con eso alcanza para hablar cualquier protocolo. Lo que no hay es nada que instalar.

Si necesitas `defineModule` —para calcular algo antes de definir el módulo, por ejemplo— **MADRE te lo entrega**: exporta una función y lo recibes como argumento.

```js
export default ({ defineModule }) => defineModule({
  id: 'mi-modulo',
  name: 'MI MÓDULO',
  // …lo que hayas calculado arriba
});
```

> Los módulos que vienen con MADRE sí escriben `import { defineModule } from './sdk.mjs'`, porque viven dentro del paquete. **Si le pides a un agente que te escriba uno, va a leer esos archivos y copiar esa línea** — y no va a funcionar. Dile que exporte un objeto plano, o la función de arriba.

## Lo que un módulo puede declarar

| Campo | Qué es |
|---|---|
| `id`, `name`, `vendor`, `summary`, `creates`, `requires` | Su ficha en MODULES. `summary` es una frase: qué hace. `creates` y `requires` son líneas cortas, una idea cada una |
| `version` | La tuya, y empieza en `1.0.0`. Si no la declaras, la ficha muestra la fecha del archivo |
| `tracks` | Si tu módulo envuelve algo de fuera, su versión no es la tuya: es la de esa cosa. Declara `{ name, npm }` o `{ name, github }` y devuelve la versión encontrada en `status(ctx)` como `runs: [{ name, version }]`. MADRE muestra esa versión y busca una más nueva sola, una vez al día, con el botón ↻ de la ficha para mirar ahora |
| `updatePlan(ctx, { latest })` | Cómo se trae esa versión nueva a esta computadora: `{ command, args, display, note, after }`. MADRE enseña `display` y no corre nada hasta que la humana lo leyó; la salida cae en la sala línea por línea. Sin comando, devuelve `{ command: null, note, download }` y la ficha manda a descargarlo |
| `updates` | `{ url }` https donde publicas **tu propio módulo**. Con eso su ficha trae un botón que va por el archivo, lo verifica igual que una instalación y lo reemplaza si pasa. Si lo instalaste desde un archivo, MADRE recuerda cuál y no necesitas declarar nada: edítalo y pide una copia nueva |
| `settings` | Valores por defecto. Viven en `~/.pulse/config.json` bajo `modules.<idEnCamelCase>`; `enabled` es el interruptor |
| `status(ctx)` | Qué muestra la tarjeta: `{ status: { installed, detail }, preflight: { ok, problems }, install: { display } }`. `install` se devuelve desde aquí; no es un campo superior del módulo |
| `status(ctx)` → `runs` | Lo que tu módulo maneja y no es MADRE: `[{ name, version, target }]`. `version` es lo que encontraste en esta computadora (`null` si no está), `target` lo que instalarías. Si coincide con `tracks.name`, esa es la versión de la ficha |
| `toggle(ctx, payload)` | Sustituye el interruptor por defecto; `confirm: 'texto'` pide confirmación antes de encender |
| `onToggle(ctx, enabled)` | Reacciona al interruptor |
| `slash` | Comandos `/nombre` que corren en el servidor con tu `ctx` y devuelven `{ ok, title, text }`. La sala los muestra como tarjeta y los agentes los leen |
| `toolsForTurn(ctx, turn)` | Servidores MCP para el turno de un agente: `[{ name, command, args, env, tools, sends, brief }]`. MADRE los adjunta a la CLI en su corrida aislada y describe `brief` al agente |
| `toolsForTurn` → `sends` | Cuáles de tus herramientas **mandan algo fuera**. El núcleo las retira por debajo de `#4` AIRLOCK: ni se le cuenta al modelo que existen. Ver abajo |
| `reaches` | A dónde llega tu módulo, en las mismas cuatro respuestas que da MADRE de las suyas. Ver abajo |
| `secrets` | Las llaves que necesitas, declaradas en vez de dibujadas: `[{ name, label, note, where }]`. MADRE pinta el campo, la guarda en su bodega bajo tu id y te la devuelve por `ctx.vault`. Ver abajo |
| `routes` | Rutas HTTP propias: `{ method, path, handler(ctx, { payload, params, url }) }` → `{ status, body }` |
| `onEvent(ctx, event)` | Cada evento del ledger |
| `controls` | Los ajustes de tu módulo, declarados en vez de dibujados: `[{ key, label, type: 'select' \| 'switch' \| 'text', options, note, invert }]`. MADRE los pinta en la ficha y los guarda en tu bloque de `config.json` |
| `onSettings(ctx, settings)` | Te avisa cuando la humana cambió uno de tus `controls`, por si algo vivo tiene que enterarse |
| `conditions` | Entradas para el catálogo de MU/TH/UR, con remedio por plataforma |

### ¿Se puede conectar con *X*?

No depende de MADRE. Un módulo puede hacer lo que pueda hacer un proceso de Node en tu
computadora: hablar TLS, levantar un servidor, guardar una llave. **Depende de cómo ese servicio
deja que un humano entregue su propia credencial**, y eso cae en tres peldaños:

| | qué pide el servicio | ¿funciona al instalarlo? |
|---|---|---|
| **A** | una llave estática en minutos: token personal, API key, contraseña de aplicación. Sin registrar app, sin revisión | **sí** |
| **B** | que cada usuario registre su propia app (OAuth sin permisos restringidos) | sí, pero el alta deja de ser «pega esto» — y tendrías que escribir OAuth |
| **C** | revisión, evaluación de seguridad o editor verificado | **no**: cada usuario tendría que ser su propio desarrollador |

En **A** está casi todo lo útil: GitHub, GitLab, Linear, Notion (integración interna), Jira,
Slack, Discord, Telegram, Stripe, Shopify, Cloudflare, Odoo, cualquier base de datos, y cualquier
API que acepte un `Authorization: Bearer`. En **B**: Google Calendar y Drive, Microsoft Graph,
Mercado Libre. En **C**: Gmail en lectura, todo Meta, banca.

**La regla**, si no quieres leer la tabla: vale la pena cuando la credencial se consigue en menos
de cinco minutos sin ser desarrollador, se revoca sola, y lo que tu módulo trae o saca cabe en una
línea de la ficha. El catálogo largo y por qué, en
[§6 de `CONECTORES.md`](https://github.com/jossuealcacao-exe/madre/blob/main/docs/CONECTORES.md#6--qu%C3%A9-alcanza-un-m%C3%B3dulo-y-de-qui%C3%A9n-es-el-muro), en el repositorio.

### Un archivo que también es servidor

`toolsForTurn` devuelve `args` que apuntan a un archivo, y tú solo tienes uno. No hacen falta dos:
**el tuyo es la ficha cuando MADRE lo importa y el servidor MCP cuando MADRE lo ejecuta.** Sabe
cuál de las dos cosas es al final del archivo.

```js
import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const SELF = fileURLToPath(import.meta.url);

// …export default { …, toolsForTurn: () => [{ command: process.execPath, args: [SELF], … }] }

const real = async (p) => (p ? realpath(p).catch(() => p) : null);
if ((await real(process.argv[1])) === (await real(SELF))) serve();
```

**Resuelve las dos rutas antes de compararlas.** `process.argv[1] === SELF` parece lo mismo y casi
siempre lo es: cuando MADRE lo lanza, le pasa el mismo `SELF` que ya resolvió el cargador de Node.
Pero en cuanto **corres el archivo tú a mano para probarlo** —`node ~/.pulse/modules/tuyo.mjs`, o
cualquier ruta que pase por `/tmp`, que en macOS es un enlace a `/private/tmp`— `argv[1]` conserva
lo que tecleaste y `SELF` no. La comparación da falso, `serve()` nunca corre, el proceso arranca,
no contesta nada y **sale con éxito**. No imprime un error porque, sobre el papel, no hubo ninguno.
Dos líneas te ahorran esa tarde.

### Si tu módulo habla con un servicio de fuera

Declara a dónde llega. `src/outbound.mjs` no es un registro de salidas: es un contrato, y
parchea `fetch` global para que ningún módulo pueda evitarlo. Un conector que no declara su
destino sale en el registro como «fue a una dirección que nada aquí declara» — verdad, e
inútil para quien intenta distinguir tu módulo de una fuga.

```js
reaches: [{
  id: 'gmail',
  host: 'gmail.googleapis.com',
  to: 'Google · Gmail, con tu cuenta',
  what: 'El asunto y el cuerpo del correo que el agente redactó.',
  when: 'cuando un agente usa la herramienta de envío',
  where: 'MODULES → CORREO',
}]
```

Las cuatro respuestas son las mismas que da MADRE de las suyas, y por la misma razón: quien
lee el registro merece saber qué viaja, cuándo, a dónde y dónde se apaga. Tu declaración se
guarda **aparte** de las del núcleo y marcada con tu `id`, porque quién prometió qué es parte
de la promesa. Se reconstruye en cada carga: desinstalar tu módulo se lleva su destino.

Si apuntas tu módulo a otro servidor en tiempo de ejecución, vuelve a declarar con el **mismo
`id`**: así se reemplaza la entrada en vez de dejar al registro respondiendo por una dirección
que ya no usas.

### Si tu módulo necesita una llave

Decláralas y no las pidas tú. MADRE dibuja un campo de contraseña en el piso `LLAVES` de tu
ficha, acepta el valor **solo desde esta computadora** (`127.0.0.1`), lo guarda en
`~/.pulse/credentials/<tu-id>.json` con permisos `0600` dentro de un directorio `0700`, y anota
en el ledger que se guardó una y **con qué nombre y qué longitud, jamás el valor**.

```js
secrets: [{
  name: 'app-password',
  label: 'APP PASSWORD',
  note: 'No es la contraseña de tu cuenta. Una de aplicación, que puedes revocar sola.',
  where: 'https://myaccount.google.com/apppasswords',   // enlace a dónde sacarla
}]
```

Y la lees por `ctx.vault`, que viene acotado a tu módulo:

```js
await ctx.vault.get('app-password')    // el valor, solo para ti
await ctx.vault.held()                 // [{ module, name, bytes }] — nombres y tamaños, nunca valores
await ctx.vault.keep(name, value)      // guardar
await ctx.vault.forget(name)           // olvidar; sin nombre, todas las tuyas
```

Tu id va cerrado dentro del SDK, así que pedir el secreto de otro módulo no es algo que puedas
*escribir*. La ficha solo muestra que hay una guardada y cuántos caracteres tiene.

**El valor va al entorno del proceso que tú levantas, y a ningún otro sitio.** No al prompt, no
al `brief`, no a un resultado de herramienta, no al ledger.

### Si tu módulo manda algo

Leer se deshace: en el peor caso trajiste algo que no servía. **Mandar no.** Un correo, un
mensaje, un registro en el sistema de alguien más: eso sale con el nombre de quien abrió la sala
y no vuelve.

Por eso el envío vive en `#4` AIRLOCK, donde la regla ya obliga al agente a decir en una línea
qué sale y a dónde antes de que salga. **Lo impone el núcleo, no tu buena voluntad:**

```js
tools: ['buscar_correo', 'mandar_correo'],
sends: ['mandar_correo'],       // por debajo de #4 esta se retira de la lista
```

Si *todas* las herramientas de un servidor mandan, el servidor entero no viaja por debajo de
`#4`. Si alguna no manda, viaja el servidor con la lista recortada y un `brief` que dice por qué
viene corto. Y lo que decides comprobar, compruébalo **en tu servidor y no en el `brief`**: un
prompt es una sugerencia.

**¿Se puede conectar con *X*?** La respuesta no depende de MADRE sino de cómo ese servicio deja
que un humano entregue su propia llave, y está mapeada en tres peldaños —con catálogo— en
[§6 de `CONECTORES.md`](https://github.com/jossuealcacao-exe/madre/blob/main/docs/CONECTORES.md#6--qu%C3%A9-alcanza-un-m%C3%B3dulo-y-de-qui%C3%A9n-es-el-muro), en el repositorio.
Léela antes de escribir nada: ahorra descubrir a la mitad que el servicio exige una revisión
anual de seguridad para dejarte pasar.

El diseño entero de los conectores está en
[`CONECTORES.md`](https://github.com/jossuealcacao-exe/madre/blob/main/docs/CONECTORES.md), en el repositorio. El primero que existe —CORREO, que manda correo por SMTP
sin una sola dependencia— es `src/modules/correo.mjs` y se lee en diez minutos.

## Publicarlo

La ficha de un módulo tuyo trae **GET A NEWER FILE**: MADRE va por el archivo —a la `url` que declaraste o al archivo desde el que lo instalaste—, lo verifica en una copia aparte y solo reemplaza al instalado si carga, respeta las reglas de la casa y dice una versión distinta. Verificar no instala nada.

Y en la cabecera de MODULES hay **+ ADD A MODULE** para instalar el `.mjs` de alguien más. Pasa por la misma puerta que todo lo demás. Dicho claro, porque es lo que es: un módulo corre **dentro de MADRE, con los permisos de quien la abre**. MADRE comprueba que cargue y que no se salga de su corral —id propio, rutas solo bajo `/api/x/<id>/`, jamás encima de un módulo de MADRE—; lo que el código *pretende* no lo puede comprobar nadie más que tú.

## La ficha

Todas las fichas de MODULES tienen los mismos pisos, en el mismo orden. No dibujas una tarjeta: declaras, y MADRE la arma. Es lo que hace que nueve módulos —y el tuyo— se lean igual.

| Piso | Qué muestra | De dónde sale |
|---|---|---|
| 1 · Quién es | el nombre, `ON`/`OFF`, quién lo hizo, la versión, el botón `↻` y lo que encontró la última mirada | `name`, `vendor`, `version` o `tracks`, `status(ctx).status.detail` |
| 2 · Qué hace | una frase, no tres | `summary` |
| 3 · Qué toca | lo que escribe y lo que necesita, plegado, con su número al lado | `creates`, `requires` (y `commands`, en su propio pliegue) |
| 4 · Ajustes | lo tuyo: selectores, interruptores, campos | `controls`, y lo que tu módulo lea de sí mismo |
| 5 · Llaves | un campo por secreto, lo que hay guardado (nombre y largo, nunca el valor) y `OLVIDARLA` | `secrets` |
| 6 · El interruptor | install, enable o disable. Solo, y siempre abajo | `toggle` / `installCommand` |

El estado es una palabra y un punto —`ON` u `OFF`—, nunca un botón: las acciones se presionan abajo. La principal queda al final; un módulo `DEV` también ofrece `DESINSTALAR`, mientras que uno integrado solo puede apagarse. Un módulo apagado se atenúa entero menos esa fila.

## El `ctx`

```
ctx = {
  projectRoot, stateRoot,          // el proyecto y ~/.pulse
  config, settings,                // config.json completo y tus ajustes con defaults
  env, agents, room,               // agentes detectados; la sala (room.capabilities(), room.record(...))
  readConfig(), updateConfig(patch),
  record(type, payload),           // escribe un evento en el ledger; tipo "algo.algo", nunca message.* ni agent.*
  services: { imageKey, ollama, … }, // lo que el servidor ofrece
  vault: { get, held, keep, forget } // tus secretos, y solo los tuyos
}
```

`turn`, en `toolsForTurn`: `{ agent, mode, lease, scratchDir, port, roomDir }`. `mode` va de 0 a 4; en 0 (GHOST) nada se guarda, decide si quieres entregar herramientas ahí.

## Reglas de la casa

- **Nada sale de la máquina por su cuenta.** Si tu módulo habla con un servicio, dilo en `summary` y en `requires`, y hazlo solo cuando el humano lo pida.
- **No guardes credenciales.** Usa las sesiones que ya viven en la máquina.
- **No escribas en el proyecto** desde un módulo; para eso están los modos de los agentes. Un módulo que instala algo en el proyecto es `kind: 'installer'` y muestra el comando antes de correrlo.
- **Falla suave.** Una excepción en `toolsForTurn` entrega nada; en un comando, la tarjeta dice el error. Nunca rompas el turno de un agente.
- **Voz MADRE.** Rótulos en mayúsculas cortos, notas que digan qué no sale de la máquina, `MU/TH/UR › ` cuando hables en un aviso.

## Que lo construya tu IA, en la sala

Escribe `/module <lo que debe hacer>` en el compositor. Es la entrada explícita al flujo guiado: si `#2 CREATE` no está activo, MADRE te pide elegirlo y conserva intacta tu petición. Con `#2` activo, mantiene el agente que elegiste y le entrega el contrato del SDK y el ejemplo. El agente debe escribir **un solo archivo** llamado `<id>.module.mjs` en su carpeta de borrador; no puede instalarlo por su cuenta.

MADRE reconoce ese nombre y pone una tarjeta en la sala: `INSTALL FOR EVERY ROOM` o `INSTALL FOR THIS PROJECT`. Léelo, decide, un clic. MADRE lo valida en una copia, lo guarda como `<id>.mjs` en la carpeta que elegiste y aparece en MODULES con la etiqueta `DEV`. También puedes pedir lo mismo en lenguaje natural mientras estés en `#2` o más; `/module` hace explícito el formato y no concede permisos por sí solo.

Los agentes nunca escriben en `~/.pulse/modules` ni en `.madre/modules`: proponen, tú instalas.

Un módulo tuyo lleva `DEV` y se quita desde su propia tarjeta con `DESINSTALAR` —también aparece en la tarjeta `</>`—. MADRE confirma el archivo exacto, borra ese archivo y su registro de origen para actualizaciones, y lo retira de la sala sin reiniciarla. No borra archivos que el módulo haya creado ni sus ajustes guardados. Los módulos que vienen con MADRE no muestran ese botón: no se quitan, se apagan.

## Lo que un módulo no puede tocar

Un módulo corre dentro del proceso de MADRE con tus permisos: instala solo lo que leíste. MADRE, por su parte, protege su núcleo así:

- Sus rutas HTTP viven bajo `/api/x/<id>/`; un módulo con rutas fuera de ahí no carga, así ninguno puede suplantar `/api/state`, `/api/messages` o cualquier ruta propia de MADRE.
- No puede usar el `id` de un módulo integrado ni de otro ya cargado.
- `record()` rechaza los tipos de evento reservados (`message.*`, `agent.*`); no puede fabricar turnos ni mensajes.
- No recibe credenciales de nadie; usa, como MADRE, las sesiones que ya viven en la máquina.
- Un error en `toolsForTurn` entrega nada; en un comando, la tarjeta dice el error; al cargar, la tarjeta `</>` dice qué archivo y por qué. Nada de eso detiene la sala.

## Probarlo

1. Copia el archivo a `~/.pulse/modules/`.
2. En la sala, MODULES → `RELOAD MODULES`. Si el archivo tiene un error, la tarjeta de desarrollo lo dice con la línea exacta.
3. Enciéndelo con su interruptor. Escribe `/tu-comando` en el compositor.
4. Cambia el archivo y vuelve a RELOAD: no hace falta reiniciar la sala.

Con una IA: pásale este documento y `hello-module.mjs`, describe lo que quieres y pídele un solo archivo `.mjs` con `export default { … }`. Lo demás lo hace MADRE.
