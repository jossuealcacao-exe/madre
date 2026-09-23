# MADRE SDK · escribe tus propios módulos

Un módulo de MADRE es **un archivo**. Sin build, sin dependencias, sin registrarse en ningún lado. Lo copias a una carpeta, pulsas RELOAD en MODULES y aparece con su interruptor. Puedes escribirlo a mano o pedírselo a una IA con este documento como contexto.

## Dónde vive

| Carpeta | Alcance |
|---|---|
| `~/.pulse/modules/*.mjs` | Todas tus salas |
| `<proyecto>/.madre/modules/*.mjs` | Solo ese proyecto |

Ningún agente puede escribir ahí: `.madre/` es zona prohibida en CONTROL y AIRLOCK, y `~/.pulse` está fuera de todo proyecto. Un módulo entra a MADRE solo porque tú lo pusiste.

## El archivo

El `export default` es un objeto plano. MADRE lo envuelve con `defineModule`. Copia [`docs/sdk/hello-module.mjs`](sdk/hello-module.mjs) y cámbialo: es un módulo completo con interruptor, un ajuste y un comando `/hello`.

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

Si prefieres importar el SDK, también vale: `import { defineModule } from '@jossuealcala/madre/sdk'` y exporta el resultado. Y si necesitas hacer algo antes de definirlo, exporta una función `({ defineModule }) => defineModule({ … })`.

## Lo que un módulo puede declarar

| Campo | Qué es |
|---|---|
| `id`, `name`, `vendor`, `summary`, `creates`, `requires` | Su ficha en MODULES. `summary` es una frase: qué hace. `creates` y `requires` son líneas cortas, una idea cada una |
| `version` | Opcional. Si la declaras, la tarjeta la muestra tal cual; si no, muestra la fecha del archivo. Los módulos que vienen con MADRE no la declaran: se mueven con la versión de MADRE |
| `settings` | Valores por defecto. Viven en `~/.pulse/config.json` bajo `modules.<idEnCamelCase>`; `enabled` es el interruptor |
| `status(ctx)` | Qué muestra la tarjeta: `{ status: { installed, detail }, preflight: { ok, problems }, install: { display } }` |
| `toggle(ctx, payload)` | Sustituye el interruptor por defecto; `confirm: 'texto'` pide confirmación antes de encender |
| `onToggle(ctx, enabled)` | Reacciona al interruptor |
| `slash` | Comandos `/nombre` que corren en el servidor con tu `ctx` y devuelven `{ ok, title, text }`. La sala los muestra como tarjeta y los agentes los leen |
| `toolsForTurn(ctx, turn)` | Servidores MCP para el turno de un agente: `[{ name, command, args, env, tools, brief }]`. MADRE los adjunta a la CLI en su corrida aislada y describe `brief` al agente |
| `routes` | Rutas HTTP propias: `{ method, path, handler(ctx, { payload, params, url }) }` → `{ status, body }` |
| `onEvent(ctx, event)` | Cada evento del ledger |
| `conditions` | Entradas para el catálogo de MU/TH/UR, con remedio por plataforma |

## El `ctx`

```
ctx = {
  projectRoot, stateRoot,          // el proyecto y ~/.pulse
  config, settings,                // config.json completo y tus ajustes con defaults
  env, agents, room,               // agentes detectados; la sala (room.capabilities(), room.record(...))
  readConfig(), updateConfig(patch),
  record(type, payload),           // escribe un evento en el ledger; tipo "algo.algo", nunca message.* ni agent.*
  services: { imageKey, ollama, … } // lo que el servidor ofrece
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

MADRE es modular y la sala puede construirse a sí misma. En `#2` o más, pídele a un agente: «crea un módulo que lea mis correos y lo prepare para instalar». Su briefing le dice dónde está esta guía y el ejemplo, y la regla: escribe **un solo archivo** llamado `<id>.module.mjs` en su carpeta de borrador. MADRE lo reconoce por el nombre y pone una tarjeta en la sala: `INSTALL FOR EVERY ROOM` o `INSTALL FOR THIS PROJECT`. Léelo, decide, un clic. MADRE lo valida en una copia, lo guarda como `<id>.mjs` en la carpeta que elegiste y aparece en MODULES con la etiqueta `DEV`.

Los agentes nunca escriben en `~/.pulse/modules` ni en `.madre/modules`: proponen, tú instalas.

Un módulo tuyo se quita desde MODULES → tarjeta `</>` → `REMOVE`; borra su archivo. Los módulos que vienen con MADRE no se quitan, se apagan.

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
