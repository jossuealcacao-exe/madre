# PULSE

Una sola sala para conversar con los agentes de IA que ya están instalados en tu computadora, alrededor de un proyecto real.

## Uso

Desde la carpeta de tu proyecto, sin instalar nada:

```bash
npx @jossuealcala/pulse doctor
npx @jossuealcala/pulse start
```

`doctor` muestra qué agentes están instalados y cuáles tienen sesión iniciada. `start` abre la sala en el navegador en `http://127.0.0.1:4317`; con `--no-open` solo imprime la URL y con `--project RUTA` apunta a otra carpeta. Requiere Node 20 o superior.

### Primer contacto: `pulse setup`

Si al arrancar en una terminal ningún agente está en línea (instalado, con adaptador y con sesión), PULSE abre primero el asistente. También puedes invocarlo directo:

```bash
npx @jossuealcala/pulse setup
```

El asistente detecta los cuatro agentes, muestra estado, versión y sesión de cada uno, y desde ahí ejecuta el inicio de sesión propio de cada CLI: `codex login`, `claude auth login`, `opencode auth login`, y para Gemini cede la terminal a `gemini` para usar `/auth`. También permite fijar el modelo que OpenCode usará en la sala. Nada se instala ni se configura a espaldas del usuario: los instaladores solo se sugieren, y las credenciales las guarda cada CLI donde siempre. Con `--no-setup` el arranque omite el asistente.

Las preferencias que el asistente guarda viven en `~/.pulse/config.json` (o `PULSE_HOME/config.json`) y las variables de entorno tienen prioridad sobre ellas:

```json
{
  "opencode": { "model": "openai/gpt-5.6-sol" },
  "timeouts": { "default": 300000, "claude": 600000 },
  "room": { "softTokenBudget": 500000 }
}
```

Para trabajar sobre el código fuente:

```bash
node ./bin/pulse.mjs doctor
node ./bin/pulse.mjs start --no-open
```

Abre la URL que aparece en la terminal. Selecciona Codex, Claude, Gemini u OpenCode, o escribe una mención como `@claude` seguida de una consulta. Los cuatro adaptadores operan en modo de consulta sin edición del proyecto.

PULSE no instala ni configura proveedores. Detecta los runtimes existentes y mantiene las escrituras del proyecto bajo control del usuario. El contenido que un agente lea puede enviarse al proveedor de modelo configurado en ese agente; aplican su cuenta, límites y términos.

## Handoff durable

Cada proyecto tiene una sala estable bajo `PULSE_HOME` (por defecto `~/.pulse`). PULSE reconstruye una ventana acotada de la conversación desde su event log aunque se reinicie o se abra desde otro IDE. Cuando cambia el agente, registra `handoff.created` con el origen, el destino y el rango de eventos entregado; el transcript sigue siendo la fuente durable y no se modifica el proyecto.

Las escrituras del event log se serializan también entre procesos locales para preservar secuencias únicas si dos IDEs acceden a la misma sala. El stream `/api/events` se alimenta del log, no de la memoria del proceso: los eventos que otro proceso PULSE agregue a la misma sala llegan a las páginas abiertas (sondeo cada 500 ms, ajustable con `PULSE_BROADCAST_INTERVAL_MS`). El sondeo lee solo los bytes nuevos del log, no el archivo completo. Un cliente que deja de consumir el stream se desconecta cuando acumula más de 1 MiB sin drenar (`PULSE_SSE_MAX_BUFFERED_BYTES`). Cada frame lleva `id` igual a su secuencia y el cliente puede reconectar con `?since=N` o `Last-Event-ID` para recibir solo lo que le falta.

Los errores de un agente se guardan acotados en `message.failed`: una sola línea de hasta 500 caracteres, sin stack traces.

La ventana predeterminada es de 16,000 caracteres y puede ajustarse con `PULSE_CONTEXT_MAX_CHARS`. Los mensajes antiguos se omiten antes que los recientes.

## Centinela de límites

Cuando un CLI expone telemetría de tokens por turno, PULSE la registra y la compara con un presupuesto local de la sala. Avisa al 80%, escala a crítico al 90% y marca agotado al 100%, recomendando otro agente que esté listo. También proyecta: si otro turno del mismo tamaño que el último cruzaría un umbral, avisa un turno antes. El presupuesto predeterminado es de 500,000 tokens (un turno real de consulta con contexto cuesta entre 10,000 y 60,000) y puede ajustarse con `PULSE_SOFT_TOKEN_BUDGET`.

El presupuesto local no es la cuota oficial de la cuenta. PULSE solo mostrará un porcentaje del proveedor cuando exista una fuente fiable para ese dato; nunca lo inferirá a partir de tokens locales. El endpoint `/api/test/limits` sirve para pruebas controladas y solo existe al iniciar con `PULSE_TEST_MODE=1`.

Las fuentes oficiales de cuota se conectan como lectores opcionales y pueden devolver `null` cuando el proveedor no publique el dato. PULSE las consulta periódicamente, conserva cada lectura válida como `quota.updated` y alimenta el centinela con la procedencia `official:<fuente>`. No hay scraping ni conversión de tokens locales a cuota oficial.

Un lector implementa `{ id, agent, read() }`; `read()` devuelve `null` o `{ usedPercent, resetAt }`. Las versiones locales detectadas de Codex y OpenCode no exponen actualmente un comando CLI estable de cuota oficial, por lo que PULSE no activa ningún lector predeterminado. `opencode stats` es estadística local y no se trata como cuota de proveedor.

## Delegación entre agentes

Un agente puede poner a trabajar a los demás. Si el humano le pide coordinar, el agente termina su respuesta con un bloque `pulse` con un paso por línea, en orden:

```
@gemini: Sintetiza en un párrafo quién es el autor, separando hechos de inferencias.
@codex: Misma pregunta; señala la afirmación menos sustentada.
@claude: Compara ambas síntesis y marca dónde divergen.
```

PULSE ejecuta los pasos en secuencia como turnos normales de la sala: cada uno queda en el log, pasa por handoff, presupuesto y timeout, y el humano puede detener el plan en cualquier momento desde la sala. El paso dirigido al propio orquestador se convierte en su turno de cierre cuando los demás han respondido. Los agentes delegados no pueden delegar a su vez, así que todo plan termina. El límite por plan son 4 pasos más el cierre (`PULSE_MAX_PLAN_STEPS`), y `PULSE_DELEGATION=0` o `"room": { "delegation": false }` en el config lo desactiva.

### Freno maestro: STOPALL

Escribe `STOPALL` en el compositor, o pulsa `STOP ALL` en la barra, y PULSE detiene todos los planes y mata todos los procesos de agente en curso; queda registrado como `room.stopped`. Desde una terminal: `curl -X POST http://127.0.0.1:4317/api/stop-all`. MU/TH/UR avisa en rojo (`room.alert`) cuando la sala empieza a escaparse de las manos: un mensaje tuyo durante un plan (se responde, pero no abre otro plan), tres o más agentes trabajando a la vez, un agente con dos turnos cruzados, o un plan de más de cinco minutos.

## Conexiones y ajustes

PULSE no guarda credenciales ni habla con los proveedores: lanza el CLI de cada agente como proceso, y ese CLI usa su propia sesión (Codex con ChatGPT, Claude Code con tu cuenta, Gemini CLI con su key u OAuth, OpenCode con su `auth.json`). El botón `⚙ CONNECTIONS` dentro de MU/TH/UR muestra, por plataforma, si el CLI tiene sesión, con qué, su versión y su ruta, y permite:

- `RECHECK`: volver a preguntar a cada CLI por su sesión.
- `SIGN IN` para Codex y Claude Code: PULSE ejecuta el inicio de sesión del propio CLI, que abre el navegador en esta máquina, y transmite su salida (incluido el enlace) a la sala. Gemini y OpenCode inician sesión desde su propio prompt, así que se muestra el comando exacto a copiar.
- Ajustes de la sala guardados en `~/.pulse/config.json` y aplicados a los turnos siguientes sin reiniciar: presupuesto local por agente, timeout por defecto y por agente, pasos máximos de plan, delegación entre agentes, límite de silencio y reintentos de Gemini, y el modelo de OpenCode (con la lista real de `opencode models`).

### Modelo por petición

En el compositor, un segundo clic sobre la esfera del agente ya elegido, o el chip `default model ▾` junto a `to @agente`, abre el selector de modelo para esa petición: Codex con los modelos de su caché local (`gpt-5.6-sol`, `gpt-5.6-luna`, `gpt-5.6-terra`…), Claude con sus alias (`fable`, `opus`, `sonnet`, `haiku`), Gemini (`auto`, `gemini-3-pro-preview`, `gemini-3-flash-preview`…) y OpenCode con la lista real de `opencode models`. También acepta un nombre libre. La elección se recuerda por agente en el navegador, viaja con el mensaje como `--model` al CLI y queda registrada en la pregunta y en la respuesta. Puedes añadir modelos propios en `~/.pulse/config.json` bajo `"models": { "claude": ["claude-opus-5"] }`.

Hacer clic en una esfera de agente en la barra despliega su uso en la sesión: tokens de esta sala contra el presupuesto local, turnos, duración y tokens del último turno, costo reportado, estado de sesión, cuota del proveedor si la publica, timeout y versión. Son conteos locales, no la factura del proveedor.

## Archivos, imágenes y adjuntos

La sala muestra lo que los agentes citan y lo que el humano aporta, sin que PULSE deje de ser de solo lectura:

- El visor es un mini editor de lectura: líneas numeradas, clic en un número selecciona una línea y Shift+clic extiende el rango; el botón REVIEW WITH o el clic derecho sobre el código abre el menú de agentes y deja en el campo de texto la referencia `!archivo:desde-hasta` con ese agente como destinatario. Cuando un agente crea o modifica un archivo bajo CREATE, el visor se abre solo con ese archivo.
- El botón sol/luna de la barra alterna el tema: automático según el sistema, claro u oscuro; se recuerda en el navegador.
- Las rutas de archivo que un agente menciona (`src/room.mjs`, `public/app.js:42`) se vuelven enlaces que abren un visor: código y texto con la línea resaltada, imágenes, PDF, audio y video. Las imágenes Markdown del proyecto se pintan en la burbuja.
- El icono de archivos al extremo derecho de la barra abre un panel plegable con el árbol del proyecto, en el hueco a la derecha del hilo (se oculta en pantallas angostas). Las carpetas se despliegan bajo demanda vía `GET /api/tree?path=…`, en solo lectura y encerrado a la raíz; `.git` no se lista y `node_modules` no se recorre. Un archivo abre el visor.
- `GET /api/files?path=…` sirve archivos del proyecto en solo lectura, encerrado a la raíz del proyecto: nada de `..`, rutas absolutas ni symlinks hacia fuera; máximo 20 MB.
- Adjuntos: el clip del compositor, arrastrar al compositor o pegar una imagen suben el archivo a la carpeta de la sala bajo `PULSE_HOME`, nunca al proyecto (máximo 15 MB). El mensaje los registra y cada CLI los recibe como sabe: Codex con `--image`, OpenCode con `--file`, Claude y Gemini leyendo la ruta con su herramienta de lectura, con la carpeta de adjuntos habilitada.

### El campo de texto: menciones y comandos

El campo es de una sola línea y crece solo con saltos de línea explícitos, hasta dos (tres líneas visibles); más allá, el texto se desplaza dentro. Nunca se ensancha. Dentro del campo:

- `@codex`, `@claude`, `@gemini`, `@opencode` se pintan como etiquetas con el color del agente en cuanto se escriben; teclear `@` abre la lista de agentes de la sala.
- `!` apunta a un archivo del proyecto: `!img.md` o `!src/room.mjs:12-20`. Teclear `!` busca entre los archivos del proyecto (`GET /api/tree/search?q=…`); la referencia se pinta como etiqueta, el servidor comprueba que el archivo existe dentro del proyecto y el agente recibe la lista al frente de su prompt, con las líneas citadas si hay rango. En las burbujas, `!archivo:líneas` abre el visor en esas líneas.
- `/` abre el menú de comandos. Los del compositor actúan al enviar: `/create <petición>` arma el permiso CREATE para ese mensaje, `/image <petición>` lo arma con el alcance de imágenes y enruta al agente que sí puede generarlas, `/stopall` es el freno maestro. Los de módulos (`/git`, `/ahp`) corren en el servidor, en solo lectura y dentro del proyecto, y devuelven una tarjeta de hechos al hilo que los agentes también leen en su transcripción. Un comando tachado en el menú es un módulo que no está disponible en este proyecto.

### Capacidades por agente

Verificadas contra las versiones instaladas y visibles en la esfera de cada agente y en `⚙ CONNECTIONS`:

| | Lee proyecto | Recibe imágenes | Crea archivos (acotado) | Genera imágenes | Web |
|---|---|---|---|---|---|
| Codex | sí | `-i` | `-C <salida> --sandbox workspace-write` | sí, `image_generation` con la cuenta de ChatGPT | `web_search` |
| Claude Code | sí | Read sobre la ruta | `--tools Write,Edit` con reglas de permiso por ruta | no | WebFetch / WebSearch |
| Gemini CLI | sí | `read_file` | política con `argsPattern` | no expuesto en headless | `google_web_search` |
| OpenCode | sí | `-f` | permisos `edit` por patrón | no | webfetch / websearch |

### Creación bajo permiso: CREATE

La creación de archivos y la generación de imágenes están apagadas en el modo de consulta. El botón `CREATE` del compositor concede un permiso de creación para ese mensaje y para el plan que arranque: PULSE crea una carpeta nueva en `<proyecto>/.pulse/out/<fecha>-<id>/` y cambia cada CLI a un modo de escritura acotado a esa carpeta, con el proyecto legible pero intocable:

| Agente | Cómo se acota |
|---|---|
| Codex | `-C <carpeta> --sandbox workspace-write`; genera imágenes con `image_generation` y las guarda ahí |
| Claude Code | `--tools Read,Glob,Grep,Write,Edit` con `--allowedTools Write(<carpeta>/**),Edit(<carpeta>/**)` bajo `dontAsk`: cualquier otra ruta se rechaza sin preguntar |
| Gemini CLI | política de solo lectura más reglas `allow` para `write_file`/`edit` cuyo `file_path` empiece por la carpeta, con `--approval-mode default` |
| OpenCode | `permission.edit: { "*": "deny", "<carpeta>/**": "allow" }` |

Los alcances se eligen por agente en `⚙ CONNECTIONS`: crear archivos y generar imágenes actúan bajo CREATE; el acceso web es un permiso permanente por agente, apagado por defecto, que aplica en todos sus turnos una vez encendido: Codex con `--search`, Claude Code con las herramientas WebFetch y WebSearch, Gemini con reglas de política para `google_web_search` y `web_fetch`, OpenCode con `webfetch` y `websearch` permitidos. Un alcance solo se puede encender donde el CLI tiene la capacidad; hoy solo Codex genera imágenes. Al pulsar `CREATE` el compositor muestra los alcances del agente elegido, y si ese agente no puede crear nada, la sala lo dice en el momento (`lease.refused`) y nombra quién sí puede. El orquestador recibe la lista de habilidades de cada agente para no delegar imágenes a quien no las genera; un delegado sin creación habilitada trabaja en solo lectura aunque el plan tenga permiso.

Al terminar cada turno, PULSE compara la carpeta antes y después y registra lo aparecido como `artifacts.created`; las imágenes y archivos creados se muestran bajo la respuesta del agente y se abren en el visor. El permiso queda en el log como `lease.granted`, dura un mensaje (hay que volver a pulsar `CREATE`), lo heredan los pasos delegados, y STOPALL lo corta con todo lo demás. Añade `.pulse/` al `.gitignore` del proyecto si no quieres versionar los artefactos.

### Image Studio: imágenes para quien no las genera

Solo Codex genera imágenes de forma nativa. El módulo **Image Studio** (en `MODULES`, sin escribir nada en el proyecto) enciende un servidor MCP propio de PULSE, `src/mcp/image-server.mjs`, que expone la herramienta `generate_image` sobre los modelos de imagen de la API de Gemini (`gemini-2.5-flash-image`, `gemini-3.1-flash-image`, `gemini-3-pro-image`) con tu propia key de Gemini y sus créditos. PULSE lo conecta a Gemini CLI, Claude Code y OpenCode únicamente dentro de un permiso CREATE con el alcance de imágenes encendido, en sus homes aislados: Claude por `--mcp-config` estricto, Gemini en el `settings.json` temporal más una regla de política, OpenCode en su config efímera. La imagen se guarda en la carpeta del permiso y aparece como artefacto. Con el módulo activo, la casilla GENERATE IMAGES de esos tres agentes se vuelve seleccionable en Conexiones; MU/TH/UR explica la ruta desde `ask MU/TH/UR`. Si la key no tiene créditos, Google responde 429 y la sala lo dice con su nombre.

## Módulos

La sala puede ofrecer integraciones opcionales que se instalan en el proyecto con su propio instalador, no con código de PULSE. El botón `MODULES` de la barra lista los disponibles y su estado en el proyecto actual. Hoy hay tres:

- **Git Pulse** (integrado, sin instalación): `/git status`, `/git log [n]`, `/git diff` y `/git branches` traen a la sala la rama, los cambios sin confirmar, los últimos commits o el resumen del diff, en solo lectura y sin gastar un turno de agente. La tarjeta queda en el registro como `command.output` y entra en el contexto que reciben los agentes, así todos razonan sobre los mismos hechos del repositorio. Requiere que el proyecto sea un repositorio git.
- **Image Studio** (integrado): ver la sección anterior.
- **AHP+** (`@jossuealcala/ahp-plus`): estado verificado del proyecto, checkpoints y handoffs entre sesiones de IA, guardado en `.ahp/`. PULSE lo detecta por `.ahp/manifest.json` y lo instala con `npx --yes @jossuealcala/ahp-plus@1.4.1 setup . --platforms <agentes detectados>`, pidiendo adaptadores solo para los agentes presentes en la máquina que AHP+ soporta (Codex, Claude, OpenCode). Una vez instalado, `/ahp status`, `/ahp check` y `/ahp context` consultan su estado desde el campo de texto.

Instalar un módulo es la única acción con la que PULSE escribe en el proyecto. Por eso el botón muestra primero el comando exacto y exige confirmación; la ejecución se transmite en vivo a la sala y queda registrada en el log como `extension.install.started`, `extension.install.output` y `extension.install.finished`. La consulta a los agentes sigue siendo de solo lectura.

## Recuperación operativa

Si PULSE se detiene a mitad de un turno, al arrancar de nuevo detecta los `agent.started` sin cierre y registra un `message.failed` recuperado para cada uno, así la interfaz no queda en "pensando". Al cerrar con Ctrl+C o `SIGTERM`, PULSE interrumpe los procesos de agente en curso, registra esos turnos como fallidos, entrega los eventos pendientes a las páginas abiertas y termina.

Cada agente tiene un timeout de 180 s por defecto; la burbuja de espera muestra los segundos transcurridos y el límite. `PULSE_AGENT_TIMEOUT_MS` lo cambia para todos y `PULSE_CLAUDE_TIMEOUT_MS`, `PULSE_CODEX_TIMEOUT_MS`, `PULSE_GEMINI_TIMEOUT_MS` o `PULSE_OPENCODE_TIMEOUT_MS` para uno. Un mensaje de más de 20,000 caracteres (`PULSE_MAX_MESSAGE_CHARS`) se registra y se rechaza sin invocar al agente; el contexto inyectado ya está acotado por `PULSE_CONTEXT_MAX_CHARS`.

## Variables de entorno

| Variable | Predeterminado | Efecto |
|---|---|---|
| `PULSE_HOME` | `~/.pulse` | Raíz de las salas |
| `PULSE_SOFT_TOKEN_BUDGET` | `500000` | Presupuesto local de tokens por agente |
| `PULSE_CONTEXT_MAX_CHARS` | `16000` | Ventana de transcript inyectada |
| `PULSE_MAX_MESSAGE_CHARS` | `20000` | Tamaño máximo de un mensaje |
| `PULSE_AGENT_TIMEOUT_MS` | `180000` | Timeout de invocación para todos los agentes |
| `PULSE_<AGENTE>_TIMEOUT_MS` | — | Timeout para un agente concreto |
| `PULSE_BROADCAST_INTERVAL_MS` | `500` | Sondeo del log para el stream |
| `PULSE_SSE_MAX_BUFFERED_BYTES` | `1048576` | Límite de buffer por cliente SSE |
| `PULSE_QUOTA_POLL_INTERVAL_MS` | `60000` | Sondeo de fuentes oficiales de cuota |
| `PULSE_OPENCODE_MODEL` | `opencode.model` del config | `proveedor/modelo` para OpenCode |
| `PULSE_DELEGATION` | activado | `0` impide que los agentes deleguen turnos |
| `PULSE_MAX_PLAN_STEPS` | `4` | Pasos máximos por plan de delegación |
| `PULSE_TEST_MODE` | — | `1` habilita `/api/test/limits` |

## Empaquetado

`npm run pack:check` empaqueta el proyecto, lo instala en un directorio vacío y ejecuta el CLI instalado: `--help`, `doctor` y un arranque del servidor que sirve la sala y cierra limpio con `SIGTERM`. No invoca ningún modelo.

## Estado de adaptadores

- Codex: consulta de solo lectura habilitada.
- OpenCode: consulta restringida habilitada; PULSE inyecta permisos efímeros y no modifica la configuración global. Si tu configuración de OpenCode no fija modelo, `run` elige el proveedor por defecto, que puede no ser el que tiene sesión válida; fija `PULSE_OPENCODE_MODEL=proveedor/modelo` (por ejemplo `openai/gpt-5.6-sol`) al arrancar PULSE.
- Claude Code: consulta restringida habilitada con Safe Mode, herramientas locales de lectura, MCP desactivado y sesiones no persistentes.
- Gemini CLI: consulta restringida habilitada con Plan Mode y una política efímera que solo permite herramientas locales de lectura. PULSE ejecuta Gemini con un `GEMINI_CLI_HOME` temporal que solo recibe las credenciales existentes (tokens OAuth y `~/.gemini/.env`; una API key guardada en el llavero del sistema funciona sin copia); hooks, extensiones, servidores MCP y memoria del `~/.gemini` real no se cargan. El relanzamiento interno del CLI se desactiva para que el timeout controle el proceso que hace la petición.

Todos los adaptadores corren en su propio grupo de procesos. Si un agente no responde antes del timeout, PULSE termina el árbol completo (SIGTERM y, tras un periodo de gracia, SIGKILL), no solo el lanzador.

## Licencia

Apache-2.0. Ver `LICENSE` y `NOTICE`.
