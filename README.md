<p align="center">
  <a href="https://jossuealcala.com/en/"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/madre-banner.svg" alt="MADRE · MU/TH/UR 6000 · INTERFACE 2037" width="100%"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@jossuealcala/madre"><img alt="npm" src="https://img.shields.io/npm/v/@jossuealcala/madre?style=flat-square&label=npm&color=9bff66&labelColor=050605"></a>
  <a href="https://github.com/jossuealcacao-exe/madre/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/jossuealcacao-exe/madre/ci.yml?style=flat-square&label=CI&color=9bff66&labelColor=050605"></a>
  <img alt="status" src="https://img.shields.io/badge/status-beta-ffb000?style=flat-square&labelColor=050605">
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A5%2022.5-9bff66?style=flat-square&labelColor=050605">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-9bff66?style=flat-square&labelColor=050605">
  <img alt="license" src="https://img.shields.io/badge/license-Apache--2.0-9bff66?style=flat-square&labelColor=050605">
  <img alt="crew" src="https://img.shields.io/badge/crew-Codex%20%C2%B7%20Claude%20%C2%B7%20Gemini%20%C2%B7%20OpenCode-9bff66?style=flat-square&labelColor=050605">
</p>

```
MU/TH/UR 6000 · INTERFACE 2037 · MADRE IS READY · BETA

  one local room · four AI coding agents · one shared memory
  read-only by default · CONTROL when you say so · no MADRE cloud, no MADRE account: your agents keep their own provider connections
```

# MADRE

Una sola sala para conversar con los agentes de IA que ya están instalados en tu computadora, alrededor de un proyecto real. *One local room where Codex, Claude Code, Gemini CLI and OpenCode work on a project together, with a memory every one of them recalls.*

```
npx @jossuealcala/madre start
```

Tres nombres, tres capas. **MADRE** es el producto: lo que instalas, abres en el navegador y ves junto al logo del latido. **PULSE** es el canal sobre el que corre una sala: el registro de eventos, el bloque de delegación entre agentes, los homes aislados de cada CLI y la carpeta `.pulse/` donde caen los artefactos; por eso esos identificadores conservan su nombre. **MU/TH/UR** es la voz operativa dentro de MADRE: diagnóstico, conexiones y ajustes. El comando `pulse` sigue funcionando como alias de `madre`.

## Uso

Desde la carpeta de tu proyecto, sin instalar nada:

```bash
npx @jossuealcala/madre doctor
npx @jossuealcala/madre start
```

`doctor` muestra qué agentes están instalados y cuáles tienen sesión iniciada; `doctor --catalog [texto]` imprime el catálogo completo de condiciones conocidas de MU/TH/UR con sus remedios para tu sistema, el mismo que consulta la sala. `start` abre la sala en el navegador en `http://127.0.0.1:4317`; con `--no-open` solo imprime la URL y con `--project RUTA` apunta a otra carpeta. Requiere Node 22.5 o superior.

### Primer contacto: `madre setup`

Si al arrancar en una terminal ningún agente está en línea (instalado, con adaptador y con sesión), MADRE abre primero el asistente. También puedes invocarlo directo:

```bash
npx @jossuealcala/madre setup
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
node ./bin/madre.mjs doctor
node ./bin/madre.mjs start --no-open
```

Abre la URL que aparece en la terminal. Selecciona Codex, Claude, Gemini u OpenCode, o escribe una mención como `@claude` seguida de una consulta. Los cuatro adaptadores operan en modo de consulta sin edición del proyecto.

MADRE no instala ni configura proveedores. Detecta los runtimes existentes y mantiene las escrituras del proyecto bajo control del usuario. El contenido que un agente lea puede enviarse al proveedor de modelo configurado en ese agente; aplican su cuenta, límites y términos.

## Handoff durable

Cada proyecto tiene una sala estable bajo `PULSE_HOME` (por defecto `~/.pulse`). MADRE reconstruye una ventana acotada de la conversación desde su event log aunque se reinicie o se abra desde otro IDE. Cuando cambia el agente, registra `handoff.created` con el origen, el destino y el rango de eventos entregado; el transcript sigue siendo la fuente durable y no se modifica el proyecto.

**Memoria de la sala.** Todo lo dicho fuera de GHOST queda indexado en `memory.sqlite` junto al event log (SQLite con búsqueda de texto completo, incluido en Node 22.5+). Cuando la conversación excede la ventana de contexto, cada turno recibe además, en automático y sin comando alguno, los intercambios anteriores que coinciden con la petición: citas exactas con su número de secuencia, para cualquier agente, dentro del mismo presupuesto de caracteres (`PULSE_RECALL_SHARE`, por defecto el 30 % de `PULSE_CONTEXT_MAX_CHARS`). El índice se deriva del log y se reconstruye solo si falta o cambia de esquema; los turnos GHOST pueden leerlo pero nunca lo escriben.

**Memorias destiladas.** Cada cierto número de intercambios (`PULSE_DISTILL_EVERY`, 10 por defecto) o cuando la sala lleva un rato en reposo (`PULSE_DISTILL_IDLE_MS`, 10 min), el agente más barato disponible (Gemini, luego OpenCode, Codex, Claude; `PULSE_DISTILL_AGENT` lo fija y `PULSE_DISTILL_MODEL` elige modelo) lee lo aún no destilado, un lote acotado por `PULSE_DISTILL_MAX_CHARS` (6000), y escribe hasta cinco notas durables tipadas (decisión, hecho, preferencia, pregunta abierta) con las secuencias de origen. Una sola llamada por lote, nunca durante un turno, y un atraso largo se drena un lote por vez. Las notas que coinciden con la petición entran al prompt como bloque `<memories>` antes de las citas exactas, dentro del mismo presupuesto; la sala anota cada destilación como `memory.distilled` y sus tokens cuentan en el presupuesto del agente. `PULSE_DISTILL=0` la apaga.

**Búsqueda por significado.** Si hay una clave de Gemini (variable `GEMINI_API_KEY` o la del llavero de macOS que usa el Gemini CLI, la misma de Image Studio), cada intercambio y cada nota se embeben en segundo plano con `gemini-embedding-001` (768 dimensiones, un lote de hasta 100 textos por llamada, nunca en el camino crítico del turno) y la petición de cada turno se embebe una vez. El recall fusiona palabras y significado, así una pregunta en español encuentra una decisión escrita en inglés. Sin clave, el recall es léxico. `PULSE_EMBED=0` lo apaga; `PULSE_EMBED_MODEL` y `PULSE_EMBED_DIMS` lo ajustan.

**La memoria como herramientas del agente.** En cada turno MADRE adjunta a la CLI el servidor MCP `pulse-memory` (Claude, Gemini, OpenCode y Codex, con la misma configuración aislada por corrida que Image Studio): `memory_search` busca por significado y palabras entre citas y notas, `memory_recall` lee el texto exacto de un rango de secuencias, `memory_notes` lista las notas destiladas, `memory_timeline` muestra los últimos intercambios, `memory_note` guarda una memoria cuando el humano pide explícitamente recordar algo (tipo, una frase, secuencias; firmada por el agente y rechazada en GHOST) y `project_state` lee el estado de AHP+ en `.ahp/` si el proyecto lo usa. Cuando un agente guarda una memoria a petición, bajo su burbuja aparece una píldora del color del tipo con el texto; pulsarla abre esa memoria en NOSTROMO. El prompt le dice al agente que consulte antes de afirmar que algo nunca se habló. El destilador no recibe las herramientas. `PULSE_MEMORY_TOOLS=0` las quita.

**NOSTROMO.** La vista humana del archivo, desde MU/TH/UR con el botón `◉ NOSTROMO`. Entrar pide la designación del proyecto (el nombre de su carpeta), igual que CONTROL, y queda abierto hasta recargar la página; el servidor exige la misma designación en `GET /api/memory` y `DELETE /api/memory/:id`. Dentro, la sala es un sol rojo iridiscente y cada memoria destilada un planeta humeante unido a él por un rayo de plasma; el color dice el tipo (ámbar decisión, fósforo hecho, violeta preferencia, cian pregunta) y el tamaño cuánto ledger cubre. Los planetas flotan y los que hablan del mismo tema se atraen (los enlaces salen de los embeddings; sin clave de Gemini no hay enlaces). Al pulsar un planeta se abre su ficha: texto, secuencias de origen, archivista y fecha. La única edición posible es olvidar: dos pulsaciones, y la nota desaparece de todo turno futuro; el ledger del que salió no se toca y el olvido queda registrado como `memory.forgotten`.

**El corazón de MADRE y la CODE000.** El centro es el corazón de MADRE: late, sus venas pulsan con cada latido y una onda recorre los filamentos hasta cada memoria. Tocarlo dispara una alerta aleatoria; ocho toques en 30 segundos activan la CODE000: una caja de seguridad con barrotes cae sobre el corazón, el archivo se sella diez minutos (`GET /api/memory` y `DELETE` responden 423), la consola es expulsada a la sala y el acceso vuelve a pedir la designación. En ese momento MADRE avisa a la tripulación: un mensaje cifrado (AES-256-GCM bajo su sello) que la sala muestra como código en un evento `mother.alert` y que solo los agentes leen en claro, dentro de su prompt, durante 24 horas. El sello y cada mensaje viven en `<proyecto>/.pulse/mother.env`, una zona prohibida para los agentes e ignorada por git; solo el humano puede borrarlo. Si lo borra o lo edita, MADRE lo nota al arrancar (la huella del sello vive aparte, en la memoria de la sala), forja un sello nuevo, lo declara a la sala y se dirige en claro a cada agente disponible, uno por uno; cada uno responde a la sala reconociendo la orden. Queda alterada: late más rápido y sus alertas cambian de tono.

Las escrituras del event log se serializan también entre procesos locales para preservar secuencias únicas si dos IDEs acceden a la misma sala. El stream `/api/events` se alimenta del log, no de la memoria del proceso: los eventos que otro proceso MADRE agregue a la misma sala llegan a las páginas abiertas (sondeo cada 500 ms, ajustable con `PULSE_BROADCAST_INTERVAL_MS`). El sondeo lee solo los bytes nuevos del log, no el archivo completo. Un cliente que deja de consumir el stream se desconecta cuando acumula más de 1 MiB sin drenar (`PULSE_SSE_MAX_BUFFERED_BYTES`). Cada frame lleva `id` igual a su secuencia y el cliente puede reconectar con `?since=N` o `Last-Event-ID` para recibir solo lo que le falta.

Los errores de un agente se guardan acotados en `message.failed`: una sola línea de hasta 500 caracteres, sin stack traces.

La ventana predeterminada es de 16,000 caracteres y puede ajustarse con `PULSE_CONTEXT_MAX_CHARS`. Los mensajes antiguos se omiten antes que los recientes.

## Centinela de límites

Cada esfera de la barra lleva un anillo. Muestra el **límite real del proveedor** cuando el CLI lo publica, y si no, la **ventana local** de MADRE.

- **Codex** escribe en cada rollout de sesión (`~/.codex/sessions`) sus dos ventanas de cuenta, 5 horas y semanal, con porcentaje usado y hora de reinicio. MADRE lee el más reciente; no hay red de por medio.
- **Claude Code** obtiene `/usage` del endpoint OAuth de Anthropic. Con `PULSE_CLAUDE_USAGE=1`, MADRE consulta el mismo endpoint con el token que Claude Code guarda en el llavero (macOS, que puede pedir permiso una vez) o en `~/.claude/.credentials.json`; el token solo viaja a `api.anthropic.com`, como hace el propio CLI. Es opcional porque implica leer una credencial del llavero. `PULSE_OFFICIAL_QUOTA=0` desactiva todas las lecturas de proveedor.
- **Gemini y OpenCode** no publican nada localmente: su anillo es la ventana local.

La ventana local es un presupuesto blando por agente (500 000 tokens de presupuesto por defecto) sobre una **ventana rodante de 5 horas**, como las ventanas cortas de los proveedores: los turnos salen del cómputo cuando envejecen, así que el anillo baja solo. Las lecturas de caché pesan una décima parte. Es contabilidad de MADRE, no la factura: solo avisa, al 80 %, 90 % y 100 %, y sugiere otros agentes.

Una ventana cuya hora de reinicio ya pasó cuenta como vacía aunque el CLI no haya vuelto a escribir (Codex solo actualiza sus límites cuando corre). El monitor vuelve a leer las fuentes cada minuto y justo después de cada reinicio, y cuando una ventana llena vuelve a la normalidad la sala lo anuncia con `limit.cleared`, para que un anillo lleno se vacíe a tiempo. Al hacer clic en una esfera se ven ambas ventanas, sus horas de reinicio y de dónde salió el dato.

Un lector de cuota implementa `{ id, agent, read() }`; `read()` devuelve `null` o `{ usedPercent, resetAt, windows?, stale? }`. MADRE nunca infiere la cuota del proveedor a partir de tokens locales.

## Delegación entre agentes

Un agente puede poner a trabajar a los demás. Si el humano le pide coordinar, el agente termina su respuesta con un bloque `pulse` con un paso por línea, en orden:

```
@gemini: Sintetiza en un párrafo quién es el autor, separando hechos de inferencias.
@codex: Misma pregunta; señala la afirmación menos sustentada.
@claude: Compara ambas síntesis y marca dónde divergen.
```

MADRE ejecuta los pasos en secuencia como turnos normales de la sala: cada uno queda en el log, pasa por handoff, presupuesto y timeout, y el humano puede detener el plan en cualquier momento desde la sala. El paso dirigido al propio orquestador se convierte en su turno de cierre cuando los demás han respondido. Los agentes delegados no pueden delegar a su vez, así que todo plan termina. El límite por plan son 4 pasos más el cierre (`PULSE_MAX_PLAN_STEPS`), y `PULSE_DELEGATION=0` o `"room": { "delegation": false }` en el config lo desactiva.

### Freno maestro: STOPALL

Escribe `STOPALL` en el compositor, o pulsa `STOP ALL` en la barra, y MADRE detiene todos los planes y mata todos los procesos de agente en curso; queda registrado como `room.stopped`. Desde una terminal: `curl -X POST http://127.0.0.1:4317/api/stop-all`. MU/TH/UR avisa en rojo (`room.alert`) cuando la sala empieza a escaparse de las manos: un mensaje tuyo durante un plan (se responde, pero no abre otro plan), tres o más agentes trabajando a la vez, un agente con dos turnos cruzados, o un plan de más de cinco minutos.

## Conexiones y ajustes

MADRE no guarda credenciales ni habla con los proveedores: lanza el CLI de cada agente como proceso, y ese CLI usa su propia sesión (Codex con ChatGPT, Claude Code con tu cuenta, Gemini CLI con su key u OAuth, OpenCode con su `auth.json`). El botón `⚙ CONNECTIONS` dentro de MU/TH/UR muestra, por plataforma, si el CLI tiene sesión, con qué, su versión y su ruta, y permite:

- `RECHECK`: volver a preguntar a cada CLI por su sesión.
- `SIGN IN` para Codex y Claude Code: MADRE ejecuta el inicio de sesión del propio CLI, que abre el navegador en esta máquina, y transmite su salida (incluido el enlace) a la sala. Gemini y OpenCode inician sesión desde su propio prompt, así que se muestra el comando exacto a copiar.
- Ajustes de la sala guardados en `~/.pulse/config.json` y aplicados a los turnos siguientes sin reiniciar: presupuesto local por agente, timeout por defecto y por agente, pasos máximos de plan, delegación entre agentes, límite de silencio y reintentos de Gemini, y el modelo de OpenCode (con la lista real de `opencode models`).

### Modelo por petición

En el compositor, un segundo clic sobre la esfera del agente ya elegido, o el chip `default model ▾` junto a `to @agente`, abre el selector de modelo para esa petición: Codex con los modelos de su caché local (`gpt-5.6-sol`, `gpt-5.6-luna`, `gpt-5.6-terra`…), Claude con sus alias (`fable`, `opus`, `sonnet`, `haiku`), Gemini (`auto`, `gemini-3-pro-preview`, `gemini-3-flash-preview`…) y OpenCode con la lista real de `opencode models`. También acepta un nombre libre. La elección se recuerda por agente en el navegador, viaja con el mensaje como `--model` al CLI y queda registrada en la pregunta y en la respuesta. Puedes añadir modelos propios en `~/.pulse/config.json` bajo `"models": { "claude": ["claude-opus-5"] }`.

Hacer clic en una esfera de agente en la barra despliega su uso en la sesión: tokens de esta sala contra el presupuesto local, turnos, duración y tokens del último turno, costo reportado, estado de sesión, cuota del proveedor si la publica, timeout y versión. Son conteos locales, no la factura del proveedor.

## Archivos, imágenes y adjuntos

La sala muestra lo que los agentes citan y lo que el humano aporta, sin que MADRE deje de ser de solo lectura:

- El visor es un mini editor de lectura: líneas numeradas, clic en un número selecciona una línea y Shift+clic extiende el rango; el botón REVIEW WITH o el clic derecho sobre el código abre el menú de agentes y deja en el campo de texto la referencia `!archivo:desde-hasta` con ese agente como destinatario. Cuando un agente crea o modifica un archivo bajo CREATE, el visor se abre solo con ese archivo.
- El botón sol/luna de la barra alterna el tema: automático según el sistema, claro u oscuro; se recuerda en el navegador.
- Las burbujas renderizan Markdown, incluidas tablas GFM (encabezado, separador y filas, con alineación).
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

### Modos de permiso

Cada mensaje sale con un modo, elegido en el chip que sigue a `TO @agente` o escrito en el texto como `#2`. Tu modo es el techo de cualquier plan que ese mensaje arranque.

| Modo | Nombre | Qué permite |
|---|---|---|
| #0 | GHOST | Fuera del registro: no se escribe en `events.jsonl`, ningún otro agente lo recuerda, desaparece al recargar y no admite delegación. Los tokens sí cuentan. |
| #1 | EXCHANGE | Leer el proyecto y coordinar. Es el default. |
| #2 | CREATE | La concesión de creación: archivos e imágenes dentro de `.pulse/out/` del turno. Absorbe el antiguo candado CREATE. |
| #3 | CONTROL | Leer, crear y modificar el proyecto real sin aprobación por acción, solo el agente nombrado. Un titular por sala; cada turno va entre dos checkpoints git y termina con la lista de cambios y un botón UNDO. |

**Escalación con cronómetro.** Cuando un plan corre en #1 y uno de sus pasos pide crear algo, la sala se detiene antes de arrancar ese paso y pregunta: `@gemini asks #2 CREATE for step 2/3 · GRANT ONCE · GRANT FOR PLAN · DENY`, con cuenta regresiva (3 minutos, `PULSE_ESCALATION_MS`). GRANT ONCE da a ese agente su propio directorio en `.pulse/out/` solo para ese paso; GRANT FOR PLAN abre un lease compartido para el resto del plan; DENY o el silencio hacen que el paso corra en #1 y el agente diga qué habría creado. Nadie más que el humano concede: un permiso escrito por el orquestador dentro del texto no cuenta. STOP y STOPALL cierran las preguntas pendientes.

**CONTROL por dentro.** Antes de arrancar el turno, MADRE fotografía el proyecto como un commit real bajo `refs/madre/checkpoints/`, con un índice temporal: incluye archivos sin seguimiento, respeta `.gitignore` y no toca tu rama, tu índice ni tu stash; funciona también en repositorios sin commits. El agente recibe el proyecto como raíz escribible: Codex con sandbox de escritura sobre la carpeta, Claude con `Write`/`Edit` permitidos en el proyecto y negados en las zonas prohibidas, Gemini con reglas de política equivalentes y OpenCode con permisos de edición por patrón. Al terminar, `git diff` entre la fotografía y el árbol actual produce la tarjeta de cambios; cualquier escritura en `.git/`, `.pulse/`, `.env*` o `.madre` se revierte en el acto y se reporta. `UNDO` restaura el árbol a la fotografía: repone lo modificado y borrado, elimina lo añadido. Un solo titular a la vez; los demás agentes siguen en #1 y #2 con un aviso de que el proyecto puede estar cambiando; STOPALL revoca el control y conserva el checkpoint. #3 no se delega: los pasos de un plan lanzado desde #3 nacen en #1.

En CONNECTIONS cada agente tiene un `MAX MODE`. Por encima de él, un `#2` se responde en solo lectura con su tarjeta de motivo y un `#3` se rechaza. Armar `#3` pasa por la anulación de emergencia: MU/TH/UR pide la designación del proyecto, el nombre de la carpeta, antes de encender el chip en rojo.

### Creación bajo permiso: CREATE

La creación de archivos y la generación de imágenes están apagadas en el modo de consulta. El botón `CREATE` del compositor concede un permiso de creación para ese mensaje y para el plan que arranque: MADRE crea una carpeta nueva en `<proyecto>/.pulse/out/<fecha>-<id>/` y cambia cada CLI a un modo de escritura acotado a esa carpeta, con el proyecto legible pero intocable:

| Agente | Cómo se acota |
|---|---|
| Codex | `-C <carpeta> --sandbox workspace-write`; genera imágenes con `image_generation` y las guarda ahí |
| Claude Code | `--tools Read,Glob,Grep,Write,Edit` con `--allowedTools Write(<carpeta>/**),Edit(<carpeta>/**)` bajo `dontAsk`: cualquier otra ruta se rechaza sin preguntar |
| Gemini CLI | política de solo lectura más reglas `allow` para `write_file`/`edit` cuyo `file_path` empiece por la carpeta, con `--approval-mode default` |
| OpenCode | `permission.edit: { "*": "deny", "<carpeta>/**": "allow" }` |

Los alcances se eligen por agente en `⚙ CONNECTIONS`: crear archivos y generar imágenes actúan bajo CREATE; el acceso web es un permiso permanente por agente, apagado por defecto, que aplica en todos sus turnos una vez encendido: Codex con `--search`, Claude Code con las herramientas WebFetch y WebSearch, Gemini con reglas de política para `google_web_search` y `web_fetch`, OpenCode con `webfetch` y `websearch` permitidos. Un alcance solo se puede encender donde el CLI tiene la capacidad. Al pulsar `CREATE` el compositor muestra los alcances del agente elegido, y si ese agente no puede crear nada, la sala lo dice en el momento (`lease.refused`) y nombra quién sí puede. El orquestador recibe la lista de habilidades de cada agente para no delegar imágenes a quien no las genera; un delegado sin creación habilitada trabaja en solo lectura aunque el plan tenga permiso.

La lectura del proyecto es la capacidad base de consulta; no requiere activar un permiso de escritura. Para crear archivos una sola vez, arma CREATE en tu mensaje: el plan y sus delegados heredan ese permiso, cada uno limitado por sus propios alcances. Si otro agente pide a un delegado crear un archivo sin ese permiso, la sala muestra `lease.missing` antes de su respuesta. Puedes reenviar esa petición directamente con CREATE o abrir `⚙ CONNECTIONS` desde el aviso. Allí, `ALWAYS · STANDING LEASE` es una opción explícita por agente: cada turno suyo, incluso un paso delegado, recibe una carpeta nueva bajo `.pulse/out/` para escribir. Este permiso permanente **no habilita generación de imágenes**; ésta sigue exigiendo CREATE con el alcance de imágenes. Desactiva el permiso permanente en cualquier momento desde Conexiones. Una frase del agente que diga «permiso concedido» nunca sustituye la autorización del humano.

Al terminar cada turno, MADRE compara la carpeta antes y después y registra lo aparecido como `artifacts.created`; las imágenes y archivos creados se muestran bajo la respuesta del agente y se abren en el visor. El permiso queda en el log como `lease.granted`; el permiso puntual dura un mensaje (hay que volver a pulsar `CREATE`) y lo heredan los pasos delegados. El permiso permanente genera un nuevo lease por turno del agente autorizado. STOPALL corta las ejecuciones activas. Añade `.pulse/` al `.gitignore` del proyecto si no quieres versionar los artefactos.

### Image Studio: imágenes para quien no las genera

Solo Codex genera imágenes de forma nativa. El módulo **Image Studio** (en `MODULES`, sin escribir nada en el proyecto) enciende un servidor MCP propio de MADRE, `src/mcp/image-server.mjs`, que expone la herramienta `generate_image` sobre los modelos de imagen de la API de Gemini (`gemini-2.5-flash-image`, `gemini-3.1-flash-image`, `gemini-3-pro-image`) con tu propia key de Gemini y sus créditos. MADRE lo conecta a Gemini CLI, Claude Code y OpenCode únicamente dentro de un permiso CREATE con el alcance de imágenes encendido, en sus homes aislados: Claude por `--mcp-config` estricto, Gemini en el `settings.json` temporal más una regla de política, OpenCode en su config efímera. La imagen se guarda en la carpeta del permiso y aparece como artefacto. Con el módulo activo, la casilla GENERATE IMAGES de esos tres agentes se vuelve seleccionable en Conexiones; MU/TH/UR explica la ruta desde `ask MU/TH/UR`. Si la key no tiene créditos, Google responde 429 y la sala lo dice con su nombre.

## Módulos

La sala ofrece módulos integrados de MADRE y una integración externa opcional. El botón `MODULES` de la barra lista los disponibles y su estado. Hoy hay cuatro:

- **Git Pulse** (integrado, sin instalación): `/git status`, `/git log [n]`, `/git diff` y `/git branches` traen a la sala la rama, los cambios sin confirmar, los últimos commits o el resumen del diff, en solo lectura y sin gastar un turno de agente. La tarjeta queda en el registro como `command.output` y entra en el contexto que reciben los agentes, así todos razonan sobre los mismos hechos del repositorio. Requiere que el proyecto sea un repositorio git.
- **Image Studio** (integrado): ver la sección anterior.
- **RIPLEY** (integrado): actívalo en `MODULES` y el visor de archivos renderiza HTML, SVG y Markdown en lugar de mostrar su código, con un botón `PREVIEW`/`SOURCE` en la cabecera. HTML y SVG se sirven por `/api/preview` dentro de un marco sellado (`sandbox` sin permisos y una CSP que prohíbe scripts, red, formularios y almacenamiento); Markdown se renderiza en el propio visor. Apagado, esos archivos se muestran como texto con una nota. Sirve para ver lo que los agentes crean en `.pulse/out/` sin salir de la sala.
- **AshCode** (integrado, beta): actívalo en `MODULES` para mostrar el botón `$ ash_code` en el campo de texto. Cuando está iluminado, MADRE intenta abreviar localmente mensajes en español o inglés antes de enviarlos a un agente, y pide respuestas concisas. La burbuja muestra el texto enviado y permite desplegar el original; las respuestas abreviadas también conservan el original. Se omite la transformación si detecta código, rutas, enlaces, negaciones, cifras, estructura compleja, idioma incierto o ninguna reducción segura. **Puede cambiar el significado o producir errores: revisa siempre el original y la respuesta.** Menos caracteres no demuestra menos tokens facturados; consulta el uso real del proveedor. Al encenderlo, el campo se ensancha como con CREATE, la etiqueta pasa a `MU/TH/UR · SPECIAL ORDER 937 ›` y la caja hace un guiño a MADRE: un barrido CRT con líneas de fósforo en verde Homebrew (el verde del perfil Homebrew de Terminal.app), que también viste el botón como un prompt de bash con cursor parpadeante. Se apaga desde `ORDER 937` para el siguiente mensaje o se deshabilita en `MODULES`. No requiere npm ni modifica el proyecto: su estado se guarda en la configuración local de MADRE.
- **AHP+** (`@jossuealcala/ahp-plus`): estado verificado del proyecto, checkpoints y handoffs entre sesiones de IA, guardado en `.ahp/`. MADRE lo detecta por `.ahp/manifest.json` y lo instala con `npx --yes @jossuealcala/ahp-plus@1.4.1 setup . --platforms <agentes detectados>`, pidiendo adaptadores solo para los agentes presentes en la máquina que AHP+ soporta (Codex, Claude, OpenCode). Una vez instalado, `/ahp status`, `/ahp check` y `/ahp context` consultan su estado desde el campo de texto.

Instalar el módulo externo AHP+ es la única acción de módulos con la que MADRE escribe en el proyecto. Por eso el botón muestra primero el comando exacto y exige confirmación; la ejecución se transmite en vivo a la sala y queda registrada en el log como `extension.install.started`, `extension.install.output` y `extension.install.finished`. La consulta a los agentes sigue siendo de solo lectura.

## Modelo de amenazas, en corto

- **Qué sale de la máquina.** MADRE no tiene nube ni cuenta: no almacena credenciales, no tiene backend y no envía nada por sí sola. Pero cada agente es una CLI que llama a su proveedor: lo que un agente lee del proyecto puede viajar a OpenAI, Anthropic o Google según su configuración. El único envío propio de MADRE es el del sentinel, y solo si lo activas.
- **Escritura.** En #1 nadie escribe. En #2 la escritura queda confinada a `.pulse/out/<lease>/` por las reglas de cada CLI. En #3 CONTROL el proyecto entero es escribible salvo `.git/`, `.pulse/` y los `.env`: Claude, Gemini y OpenCode reciben esa prohibición como regla previa; Codex entra con su sandbox `workspace-write`, que no admite excluir rutas dentro del proyecto, así que en su caso la zona prohibida se hace cumplir **después del turno**: MADRE compara con el checkpoint y revierte lo que tocó ahí. Eso protege lo que persiste, no impide que un efecto intermedio ocurra durante el turno. Es deuda conocida: prevención antes que restauración. Mientras tanto, si un `.env` es crítico, no des CONTROL a Codex o baja su MAX MODE.
- **Memoria.** Todo lo dicho fuera de GHOST queda en `~/.pulse/rooms/<sala>/` y se reinyecta en los prompts de todos los agentes de esa sala. GHOST es la salida para lo que no debe recordarse.

## Sentinel de errores y feedback

MU/TH/UR tiene una sección SENTINEL. Cuando un turno falla con un error que ninguna condición conocida explica, o el proceso de MADRE se cae, el sentinel guarda un reporte en el registro de la sala (`sentinel.report`): el error con rutas, nombres de usuario, correos y claves eliminados, la versión de MADRE y de Node, la plataforma y las versiones de los agentes detectados. Los repetidos se agrupan por huella durante 24 horas.

Nada sale de la máquina por sí solo. Cada reporte tiene `REPORT ON GITHUB ↗`, que abre un issue prellenado en el repositorio para que lo leas antes de publicarlo, y el botón `✎ FEEDBACK` de la cabecera abre uno en blanco con tu entorno. El colector del autor viene configurado por defecto (`https://madre-reports.jossue-alcala-o.workers.dev/v1/reports`; `PULSE_REPORT_URL` o `telemetry.reportUrl` en `~/.pulse/config.json` lo cambian, y un valor vacío lo quita), así que cada reporte tiene `SEND` y existe el interruptor `AUTO-REPORT`, apagado por defecto, que envía los nuevos reportes redactados al colector sin preguntar. `docs/report-collector/` trae un Worker de Cloudflare listo para desplegar que convierte cada reporte en un issue.

## Recuperación operativa

Si MADRE se detiene a mitad de un turno, al arrancar de nuevo detecta los `agent.started` sin cierre y registra un `message.failed` recuperado para cada uno, así la interfaz no queda en "pensando". Al cerrar con Ctrl+C o `SIGTERM`, MADRE interrumpe los procesos de agente en curso, registra esos turnos como fallidos, entrega los eventos pendientes a las páginas abiertas y termina.

Cada agente tiene un timeout de 180 s por defecto; la burbuja de espera muestra los segundos transcurridos y el límite. `PULSE_AGENT_TIMEOUT_MS` lo cambia para todos y `PULSE_CLAUDE_TIMEOUT_MS`, `PULSE_CODEX_TIMEOUT_MS`, `PULSE_GEMINI_TIMEOUT_MS` o `PULSE_OPENCODE_TIMEOUT_MS` para uno. Un mensaje de más de 20,000 caracteres (`PULSE_MAX_MESSAGE_CHARS`) se registra y se rechaza sin invocar al agente; el contexto inyectado ya está acotado por `PULSE_CONTEXT_MAX_CHARS`.

## Variables de entorno

| Variable | Predeterminado | Efecto |
|---|---|---|
| `PULSE_HOME` | `~/.pulse` | Raíz de las salas |
| `PULSE_SOFT_TOKEN_BUDGET` | `500000` | Presupuesto local de tokens por agente |
| `PULSE_CONTEXT_MAX_CHARS` | `16000` | Ventana de transcript inyectada (incluye lo recordado) |
| `PULSE_RECALL_SHARE` | `0.3` | Parte de la ventana que puede ocupar la memoria recordada (0 la apaga) |
| `PULSE_DISTILL` | `1` | Destilación de memorias por el agente más barato (`0` la apaga) |
| `PULSE_DISTILL_EVERY` | `10` | Intercambios sin destilar que disparan un lote al quedar libre la sala |
| `PULSE_DISTILL_IDLE_MS` | `600000` | Reposo tras el cual se destila lo pendiente (mínimo 2 intercambios) |
| `PULSE_DISTILL_MAX_CHARS` | `6000` | Tamaño máximo del lote que lee el destilador |
| `PULSE_DISTILL_AGENT` | — | Agente destilador preferido; por defecto el más barato disponible |
| `PULSE_DISTILL_MODEL` | — | Modelo para la destilación |
| `PULSE_EMBED` | `1` | Embeddings con la clave de Gemini para recall por significado (`0` lo apaga) |
| `PULSE_EMBED_MODEL` | `gemini-embedding-001` | Modelo de embeddings |
| `PULSE_EMBED_DIMS` | `768` | Dimensiones del vector |
| `PULSE_MEMORY_TOOLS` | `1` | Servidor MCP `pulse-memory` adjunto a cada turno (`0` lo quita) |
| `PULSE_REPORT_URL` | colector del autor | Colector del sentinel; vacío lo desactiva |
| `PULSE_AUTO_REPORT` | `0` | Envía en automático los reportes nuevos al colector (`1`) |
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

### Gemini y la capacidad de Google

Cuando Google responde 503 (modelo saturado) o 429, el Gemini CLI reintenta con backoff durante minutos y solo escribe trazas en stderr. MADRE lee ese stderr en vivo: si la condición persiste 15 s corta el proceso, reintenta una vez con un modelo explícito más ligero (`gemini-2.5-flash`, configurable con `PULSE_GEMINI_FALLBACK_MODEL`) y, si tampoco responde, lo dice con nombre y modelo probado. Créditos agotados o credenciales inválidas cortan de inmediato.

### Menciones y Gemini CLI

Gemini CLI lee `@algo` en el prompt como un archivo a incluir, incluso en modo headless, y resuelve `@claude` contra `CLAUDE.md`. MADRE escapa cada handle como `\@nombre` al construir el prompt (su parser respeta la barra invertida), antepone una nota que explica la convención y desescapa la respuesta. Las menciones llegan y vuelven intactas.

## Estado de adaptadores

- Codex: consulta de solo lectura habilitada.
- OpenCode: consulta restringida habilitada; MADRE inyecta permisos efímeros y no modifica la configuración global. Si tu configuración de OpenCode no fija modelo, `run` elige el proveedor por defecto, que puede no ser el que tiene sesión válida; fija `PULSE_OPENCODE_MODEL=proveedor/modelo` (por ejemplo `openai/gpt-5.6-sol`) al arrancar MADRE.
- Claude Code: consulta restringida habilitada con Safe Mode, herramientas locales de lectura, MCP desactivado y sesiones no persistentes.
- Gemini CLI: consulta restringida habilitada con Plan Mode y una política efímera que solo permite herramientas locales de lectura. MADRE ejecuta Gemini con un `GEMINI_CLI_HOME` temporal que solo recibe las credenciales existentes (tokens OAuth y `~/.gemini/.env`; una API key guardada en el llavero del sistema funciona sin copia); hooks, extensiones, servidores MCP y memoria del `~/.gemini` real no se cargan. El relanzamiento interno del CLI se desactiva para que el timeout controle el proceso que hace la petición.

Todos los adaptadores corren en su propio grupo de procesos. Si un agente no responde antes del timeout, MADRE termina el árbol completo (SIGTERM y, tras un periodo de gracia, SIGKILL), no solo el lanzador.

## Cambios

Ver [CHANGELOG.md](CHANGELOG.md). La versión actual es 0.2.1, beta pública: el núcleo está probado y bajo CI, la superficie sigue cambiando y las decisiones que aún duelen están escritas en el modelo de amenazas. Los problemas se reportan desde MU/TH/UR (`✎ FEEDBACK` o el sentinel) o en [issues](https://github.com/jossuealcacao-exe/madre/issues); la seguridad, según [SECURITY.md](SECURITY.md).

## Licencia

Apache-2.0. Ver `LICENSE` y `NOTICE`.
