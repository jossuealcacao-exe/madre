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
  <img alt="crew" src="https://img.shields.io/badge/crew-Codex%20%C2%B7%20Claude%20%C2%B7%20Gemini%20%C2%B7%20OpenCode%20%C2%B7%20%40madre-9bff66?style=flat-square&labelColor=050605">
</p>

```
MU/TH/UR 6000 · INTERFACE 2037 · MADRE IS READY · BETA

  ONE LOCAL ROOM · FOUR AI CODING AGENTS · ONE SHARED MEMORY · A FIFTH AGENT THAT IS THE MEMORY ITSELF
  READ-ONLY BY DEFAULT · CONTROL WHEN YOU SAY SO · NOTHING LEAVES THIS MACHINE ON ITS OWN
```

# MADRE

Una sala local donde los agentes de IA que ya tienes instalados trabajan juntos sobre un proyecto real y comparten una memoria. *One local room where Codex, Claude Code, Gemini CLI and OpenCode work on a project together, with a memory every one of them recalls.*

MADRE no es una nube ni una cuenta. Lanza el CLI de cada agente como proceso, con la sesión que ese CLI ya tiene, y mantiene el proyecto bajo tu control: los agentes leen por defecto, crean solo donde tú dices y editan solo cuando armas CONTROL.

```
npx @jossuealcala/madre start
```

---

## ARRANQUE · LOS PRIMEROS CINCO MINUTOS

Necesitas Node 22.5 o superior y al menos una de estas CLIs con sesión iniciada: **Codex**, **Claude Code**, **Gemini CLI**, **OpenCode**. Si además corre **Ollama** con un modelo de chat, la sala tiene un quinto agente local.

1. Entra a la carpeta del proyecto y corre `npx @jossuealcala/madre start`. La sala abre siempre, tengas agentes o no. Si no hay ninguno, lo primero que ves es el puente: cada agente con su botón para instalarlo y firmarlo, ahí mismo. MADRE muestra el comando exacto antes de correrlo y transmite cada línea. En cuanto uno queda listo, la sala se desbloquea sola.
2. La sala abre en `http://127.0.0.1:4317`. Elige un agente en el selector o escribe `@claude …`. El chip junto a `to @agente` dice en qué modo sale el mensaje; `#1 EXCHANGE`, solo lectura, es el predeterminado.
3. Para sumar o reconectar una IA más tarde: `⚙ CONNECTIONS` en MU/TH/UR, donde la tripulación vive junto al resto de los ajustes. Codex y Claude Code se firman con un clic; Gemini y OpenCode aceptan su llave ahí mismo. MADRE no guarda credenciales: cada llave va al archivo de su propio CLI.
4. Con Ollama, `MODULES → OLLAMA` ya está encendido: la memoria se embebe localmente y `@madre` aparece en la fila.
5. `⚙ CONNECTIONS → MEMORY` ajusta quién destila la memoria y cada cuánto. `◉ NOSTROMO` muestra lo que la sala recuerda.

```bash
npx @jossuealcala/madre doctor      # qué agentes hay, quién tiene sesión, si hay versión nueva
npx @jossuealcala/madre setup       # el mismo alta, desde la terminal, si la prefieres
npx @jossuealcala/madre start --no-open --project RUTA
```

**Tres nombres.** **MADRE** es el producto. **MU/TH/UR** es su voz operativa: diagnóstico, conexiones, ajustes. **PULSE** es el canal sobre el que corre la sala: el registro de eventos, el bloque de delegación, la carpeta `.pulse/` donde caen los artefactos; por eso esos identificadores conservan su nombre.

---

## LA SALA

**El puente.** Sin agentes en línea la sala abre en el puente: una tarjeta por agente con su estado real y la única acción que le toca, `INSTALL` o `SIGN IN`. Todo corre en tu máquina, con el comando a la vista, y la salida se transmite a la misma pantalla. Codex y Claude Code se firman con un clic porque su CLI abre el navegador; Gemini y OpenCode aceptan su llave ahí mismo, que MADRE escribe donde ese CLI la busca, con el archivo cerrado a tu usuario y sin guardar copia en ninguna parte, solo desde esta computadora. Cada tarjeta dice además con qué cuenta se firma ese agente y si hay una entrada sin pagar, para que elegir no sea a ciegas. El puente se repliega en cuanto un agente queda listo y no vuelve: es el primer contacto de una sala sin nadie dentro. A partir de ahí la tripulación vive en `⚙ CONNECTIONS`, con los mismos botones y, al lado, los modos, los permisos y las llaves de cada agente.

**La barra.** La marca con su latido, la raíz del proyecto, la tripulación, `LIVE`, las alertas (`STOP ALL`, versión nueva), `MODULES`, `MU/TH/UR`, tema y panel de archivos. Cada esfera de agente lleva un anillo con su consumo: el límite real del proveedor cuando el CLI lo publica, si no, la ventana local de MADRE. Un clic la despliega.

**Las burbujas.** Cada respuesta dice quién habla, a quién, en qué modo y con qué modelo; debajo, hora, tokens del turno y acumulado. Markdown completo, tablas, bloques de código con COPY. Las rutas que un agente menciona (`src/room.mjs:42`) abren el visor. Al pasar el ratón: valorar bien o mal, copiar, responder con otro agente.

**El compositor.**

| Escribes | Pasa |
|---|---|
| `@codex`, `@claude`, `@gemini`, `@opencode`, `@madre` | Menciona a un agente; `@` abre la lista |
| `!src/room.mjs:12-20` | Adjunta un archivo del proyecto, con líneas si las das; `!` busca entre los archivos |
| `#0` a `#3` | Fija el modo de permiso de ese mensaje |
| `/create …`, `/image …`, `/stopall`, `/git …`, `/ahp …` | Comandos; `/` abre el menú. `/git push` muestra qué saldría; solo `/git push confirm` lo envía |
| `STOPALL` | Freno maestro |
| Clip, arrastrar o pegar una imagen | Adjunto para la sala, nunca en el proyecto |
| `@madre, pregúntale al crew …` | Mesa redonda: un paso por agente en línea, cierre citado |

Un segundo clic en la esfera elegida, o el chip `default model ▾`, elige el modelo de esa petición: Codex, Claude, Gemini y OpenCode con sus listas reales, o un nombre libre. Se recuerda por agente.

**Archivos.** El icono de la derecha abre el árbol del proyecto en solo lectura. El visor numera líneas; clic y Shift+clic seleccionan un rango y `REVIEW WITH` lo manda a un agente. Con **RIPLEY** encendido en `MODULES`, HTML, SVG y Markdown se renderizan en un marco sellado en lugar de mostrar su código, con barra atrás/recargar y recarga automática cuando un agente cambia el archivo.

**Tema.** Sol/luna en la barra: automático, claro u oscuro. El claro no brilla; la pantalla de MU/TH/UR sigue siendo fósforo.

---

## MODOS DE PERMISO

Cada mensaje sale con un modo. Tu modo es el techo de cualquier plan que ese mensaje arranque.

| Modo | Nombre | Qué permite |
|---|---|---|
| `#0` | **GHOST** | Fuera del registro. No se escribe en el ledger, nadie lo recuerda, desaparece al recargar. Los tokens sí cuentan. |
| `#1` | **EXCHANGE** | Leer el proyecto y coordinar. El predeterminado. |
| `#2` | **CREATE** | Añadir archivos y carpetas nuevos donde corresponda en el proyecto. Lo que ya existía no cambia: si un agente lo toca, MADRE lo restaura al terminar y lo dice. |
| `#3` | **CONTROL** | Editar el proyecto real sin aprobación por acción. Un titular por sala, checkpoint antes, lista de cambios y `UNDO` después. |
| `#4` | **AIRLOCK** | Todo lo de CONTROL más ejecutar comandos: pruebas, builds, `git push`, deploys con las CLIs y sesiones que ya hay en la máquina. Los archivos vuelven con `UNDO`; lo que sale de la nave, no. La anulación pide dos llaves: la designación y la palabra `AIRLOCK`. |

**CREATE por dentro.** El agente decide dónde va lo nuevo según las convenciones del proyecto, y crea carpetas si hace falta; `.pulse/out/<turno>/` queda como borrador para lo que no tiene sitio. MADRE toma un checkpoint antes del turno y, al terminar, conserva lo que apareció, lo muestra bajo la respuesta como artefactos, y restaura cualquier archivo previo que se haya modificado, renombrado o borrado, avisando en la sala. Las CLIs reciben sus herramientas de escritura sobre el proyecto y la instrucción de no tocar lo existente; la garantía la da la restauración de MADRE al terminar, no la regla previa.

**CONTROL por dentro.** Antes del turno, un commit real bajo `refs/madre/checkpoints/` que no toca tu rama, tu índice ni tu stash. Durante el turno, `.git/`, `.pulse/`, `.madre/`, los `.env` y `.claude/settings.local.json` quedan en solo lectura a nivel de sistema de archivos y recuperan sus permisos al terminar. Después, la lista de archivos añadidos, modificados y borrados, y `UNDO` restaura el checkpoint. Armar `#3` pide la designación del proyecto; armar `#4` pide además la palabra `AIRLOCK`. En `#4` cada CLI recibe su herramienta de comandos (Codex sin sandbox de red, Claude `Bash`, Gemini `run_shell_command`, OpenCode `bash`) y la instrucción de decir en una línea qué va a salir y adónde antes de que salga.

**Escalación.** Si un plan en `#1` llega a un paso que pide crear algo, la sala se detiene y pregunta: `GRANT ONCE · GRANT FOR PLAN · DENY`, con cronómetro de tres minutos. Solo el humano concede; un permiso escrito por un agente dentro de la conversación no cuenta.

**Modo por paso.** Un orquestador puede pedir el modo de cada paso: `@codex #2: crea la página`, `@claude #3: arregla el router`. MADRE lo acota al modo de tu mensaje y al `MAX MODE` de ese agente. Con tu mensaje en `#3`, la palabra del orquestador basta; con tu mensaje en `#1`, un paso `#2` pasa por la escalación.

**Dos controles por agente.** En `⚙ CONNECTIONS` cada agente tiene `MAX MODE`, hasta dónde puede llegar un mensaje dirigido a él, y `DEFAULT MODE`, dónde empieza: `#1` solo lectura hasta que armes CREATE, o `#2` para que cada turno pueda añadir archivos sin pedirlo. Aparte, dos habilidades: generar imágenes y web.

---

## QUÉ PUEDE CADA AGENTE

| | Lee el proyecto | Recibe imágenes | Crea archivos acotado | Genera imágenes | Web |
|---|---|---|---|---|---|
| **Codex** | sí | `-i` | sandbox de escritura | sí, nativo, con su cuenta de ChatGPT | `web_search` |
| **Claude Code** | sí | lectura de la ruta | reglas de permiso por ruta | sí, con **Image Studio** | WebFetch / WebSearch |
| **Gemini CLI** | sí | `read_file` | política por patrón | sí, con **Image Studio** | `google_web_search` |
| **OpenCode** | sí | `-f` | permisos `edit` por patrón | sí, con **Image Studio** | webfetch / websearch |
| **@madre** | la memoria | no | no | no | no |

**Image Studio** es un módulo de MADRE: un servidor MCP propio que expone `generate_image` sobre los modelos de imagen de la API de Gemini, con tu propia key y tus créditos. Hoy **solo Gemini**, y por una razón: es la única cuenta de la tripulación cuya llave MADRE ya encuentra sin pedirte una nueva, y tiene capa gratis. Anthropic no genera imágenes —Claude las lee, no las hace—, la cuenta de ChatGPT con la que se firma Codex no da acceso a la API de imágenes, y OpenCode depende del proveedor al que lo apuntes. Se conecta a Claude, Gemini y OpenCode solo dentro de un permiso CREATE con el alcance de imágenes encendido, en sus homes aislados, y la imagen cae en la carpeta del turno como cualquier artefacto. `/image <petición>` arma el permiso y enruta al agente que puede generar. Con los cuatro agentes puedes pedir una imagen; Codex la hace con lo suyo, los demás con Image Studio.

El acceso web es un permiso permanente por agente, apagado por defecto, que se enciende en `⚙ CONNECTIONS`.

---

## DELEGACIÓN

Un agente puede poner a trabajar a los demás. Si le pides coordinar, termina su respuesta con un bloque `pulse`, un paso por línea:

```
@gemini: Sintetiza en un párrafo quién es el autor, separando hechos de inferencias.
@codex: Misma pregunta; señala la afirmación menos sustentada.
@claude: Compara ambas síntesis y marca dónde divergen.
```

MADRE ejecuta los pasos como turnos normales: cada uno queda en el ledger, pasa por handoff, presupuesto y timeout. El paso dirigido al orquestador es su turno de cierre. Los delegados no delegan, así que todo plan termina. Máximo cuatro pasos más el cierre.

**STOP ALL.** El botón de la barra, `STOPALL` en el compositor o `curl -X POST http://127.0.0.1:4317/api/stop-all` detienen todos los planes y matan todos los procesos de agente. MU/TH/UR avisa en rojo cuando la sala se escapa: tres agentes a la vez, un agente con dos turnos cruzados, un plan de más de cinco minutos.

---

## MEMORIA

Todo lo dicho fuera de GHOST queda indexado junto al ledger, en `~/.pulse/rooms/<sala>/memory.sqlite`. Nada de esto requiere un comando: ocurre solo.

**Recall.** Cuando la conversación excede la ventana de contexto, cada turno recibe los intercambios anteriores que coinciden con la petición, citados con su número de secuencia, para cualquier agente.

**Notas destiladas.** Cada diez intercambios o tras diez minutos de reposo, el archivista lee lo no destilado y guarda hasta cinco notas tipadas: decisión, hecho, preferencia, pregunta abierta. El archivista es el agente más barato permitido; con Ollama es el modelo local y no cuesta nada.

**Por significado.** Con Ollama (`nomic-embed-text`) o con una key de Gemini, intercambios y notas se embeben en segundo plano; una pregunta en español encuentra una decisión escrita en inglés.

**Herramientas.** Cada turno lleva adjunto el servidor MCP `pulse-memory`: `memory_search`, `memory_recall`, `memory_notes`, `memory_timeline`, `project_state` y `memory_note`, que guarda una nota cuando tú pides explícitamente recordar algo. La burbuja muestra `◉ memory saved`.

**NOSTROMO.** El mapa de la memoria, detrás de la designación del proyecto: MADRE es un sol rojo que late, cada memoria un planeta en el color de su tipo, unidos por venas que pulsan. Se navega, se lee y solo se puede borrar, con doble confirmación. Ocho toques al corazón activan CODE000 y sellan el archivo diez minutos.

**@madre.** Con Ollama y un modelo de chat, la memoria habla: `@madre` responde desde todo el archivo con citas `[#n]`, dice cuando la sala nunca discutió algo, no escribe ni ejecuta, y convoca al crew si se lo pides. Sus tokens son locales y no cuentan. Cuando existe un modelo entrenado con la sala, lo usa.

**Ajustes.** `⚙ CONNECTIONS → MEMORY`: quién destila, quiénes pueden, cada cuánto, dónde se embebe, cuánto contexto puede ocupar el recall. Todo en `~/.pulse/config.json`, sin reiniciar.

**Privacidad.** Una CLI corre con su propio contexto privado y puede escribirlo en una respuesta. En `⚙ CONNECTIONS → PRIVACY` nombras los términos que no deben viajar por la sala: MADRE los sustituye por `[ENTIDAD-ORG]` antes de que lleguen al ledger, al archivista, a los demás agentes o al dataset, y `PURGE ROOM` limpia lo que la sala ya tenía. Los términos viven en `config.json`; la sala solo registra cuántos.

---

## MADRE AI · TU PROPIO MODELO

La sala acumula material de entrenamiento mientras trabajas. `MEMORY` muestra en vivo cuántos pares limpios lleva hacia un LoRA, con 300 como objetivo: turnos humano→agente, pasos delegados y notas destiladas; fuera quedan las respuestas de `@madre`, las enlatadas y lo que marques como mala respuesta con el pulgar de cada burbuja.

`EXPORT DATASET` escribe `train.jsonl` y `valid.jsonl` junto al ledger, redactados. La tarjeta `TRAIN` trae los comandos ya rellenados con tu carpeta de sala y el modelo base que cabe en tu máquina. El entrenamiento corre fuera de MADRE, con mlx en Apple Silicon; la receta vive en [`docs/training/`](https://github.com/jossuealcacao-exe/madre/blob/main/docs/training/README.md). En cuanto Ollama tiene un modelo `madre-<proyecto>`, `@madre` responde con él y las demás CLIs reciben la indicación de preguntarle primero: la memoria del proyecto deja de costar tokens.

**Ollama.** Si corre en la máquina, MADRE lo usa sin configurar nada: embeddings locales, archivista local, `@madre`. `MODULES → OLLAMA` muestra servidor, modelos y roles, descarga los recomendados con `PULL` y deja apagar cada rol. `qwen2.5:7b` en 16 GB, `qwen2.5:3b` en 8 GB; MADRE prefiere modelos de chat general sobre los `-coder`.

---

## EL CORE

Haz clic en **MADRE**. Cada turno, la sala escribe un documento en tu nombre y se lo entrega a un proceso; hasta ahora ese documento existía solo el instante en que el proceso lo leía. Ahí está entero: bloque por bloque, con lo que pesa cada uno y las palabras exactas que el agente recibe.

Cambia a quién va y las palabras cambian; sube el modo y aparece el permiso que se le daría, escrito —sin crear carpeta ni tomar checkpoint para enseñarlo—. Preguntar qué diría la sala no es la sala diciéndolo: nada se cuenta, nada se guarda, nada sale. Y se lee, nunca se escribe: lo que MADRE promete sobre la tripulación es cierto porque esas palabras son fijas.

## MU/TH/UR

El botón de la barra abre la pantalla de diagnóstico. Escribe un síntoma, un agente o una palabra y MU/TH/UR clasifica las condiciones registradas en esta sala contra su catálogo, con el remedio para tu sistema operativo. El mismo catálogo en terminal: `madre doctor --catalog [texto]`.

| Sección | Qué hace |
|---|---|
| `⚙ CONNECTIONS` | Sesión, versión y ruta de cada CLI; `SIGN IN` y `RECHECK`; `MAX MODE`, `DEFAULT MODE` y habilidades; timeouts, presupuesto, delegación, modelo de OpenCode; MEMORY y PRIVACY |
| `◉ NOSTROMO` | El mapa de la memoria |
| `SENTINEL` | Fallos que ninguna condición explica y caídas del proceso, con rutas, usuarios, correos y claves eliminados. Cada reporte tiene `REPORT ON GITHUB ↗` para leerlo antes de publicarlo; `AUTO-REPORT`, apagado por defecto, envía los nuevos al colector del proyecto |
| `RELEASE CHANNEL` | Una consulta a npm al día. Si hay versión nueva, una alerta en la barra y aquí `RESTART WITH x.y.z`: la sala cierra, instala y vuelve en la misma dirección; o el comando para hacerlo tú. Nunca mientras los agentes trabajan |
| `✎ FEEDBACK` | Un issue en blanco con tu entorno ya escrito |
| `?` | El recorrido de cuatro pasos, el mismo que se abre la primera vez |

---

## MÓDULOS

`MODULES` en la barra lista los disponibles y su estado. Ninguno escribe en el proyecto salvo la instalación de AHP+, que muestra el comando y pide confirmación.

| Módulo | Qué añade |
|---|---|
| **Git Pulse** | `/git status`, `/git log [n]`, `/git diff`, `/git branches`: hechos del repositorio como tarjeta en el hilo, que los agentes también leen. `/git commit "mensaje"` y `/git push confirm`: tu mano sobre el repositorio, con vista previa de lo que saldría |
| **Image Studio** | `generate_image` para Claude, Gemini y OpenCode, con tu key de Gemini, dentro de CREATE |
| **RIPLEY** | El visor renderiza HTML, SVG y Markdown en un marco sellado, con recarga automática |
| **OLLAMA** | Embeddings, archivista y `@madre` en local, gratis y sin cuenta. Se instala, se despierta y descarga su modelo desde el puente |
| **PLAYWRIGHT** | Un navegador headless por turno que solo alcanza esta MADRE: abrir la vista previa de RIPLEY, hacer clic, leer consola, capturas al borrador del turno. Requiere `@playwright/mcp` |
| **Ash** | La economía de tokens de la sala. El interruptor pide a los agentes respuestas en prosa compacta; lo demás está siempre encendido y no se nota: el briefing lleva solo los bloques que el turno puede usar, lo que nunca cambia se lee primero para que el caché lo reconozca, y la transcripción se queda quieta en vez de deslizarse. Nada de lo que tú escribes se altera. En `⚙ CONNECTIONS` se ve a dónde se van los tokens |
| **AHP+** | Integración externa opcional: estado verificado del proyecto, checkpoints y handoffs en `.ahp/`; `/ahp status`, `/ahp check`, `/ahp context` |

Cada módulo es un archivo. Los tuyos van en `~/.pulse/modules/` (todas las salas) o en `<proyecto>/.madre/modules/` (ese proyecto): un `.mjs` con `export default { … }`, sin build ni registro, con interruptor, ajustes, comandos `/nombre`, herramientas MCP para los agentes y rutas propias. `RELOAD MODULES` lo recarga sin reiniciar. Guía y ejemplo listo para copiar en [`docs/SDK.md`](https://github.com/jossuealcacao-exe/madre/blob/main/docs/SDK.md). Cómo escribir uno, en [CONTRIBUTING.md](https://github.com/jossuealcacao-exe/madre/blob/main/CONTRIBUTING.md#writing-a-module).

---

## LO QUE SALE DE LA MÁQUINA

- **Nada por sí solo.** MADRE no tiene nube, cuenta ni backend. No guarda credenciales.
- **Lo que un agente lee, viaja a su proveedor.** Codex a OpenAI, Claude Code a Anthropic, Gemini CLI a Google, OpenCode a quien tenga configurado. Aplican su cuenta, sus límites y sus términos. `@madre` y el archivista con Ollama no salen de la máquina.
- **Dos envíos propios, ambos bajo tu interruptor.** El sentinel, apagado por defecto, envía reportes redactados al colector del proyecto. El canal de liberación, encendido por defecto, pregunta a npm por la última versión: viaja el nombre del paquete, nada más, la misma petición que hace `npx`. `PULSE_UPDATE_CHECK=0` lo apaga.
- **Escritura.** En `#1` nadie escribe. En `#2` solo se añade: lo que existía se restaura al terminar el turno. En `#3` todo el proyecto salvo las zonas prohibidas, con checkpoint y `UNDO`. En un proyecto sin git, MADRE guarda sus fotografías en un repositorio sombra fuera del proyecto.
- **Memoria.** Todo lo dicho fuera de GHOST queda en `~/.pulse/rooms/<sala>/` y vuelve a los prompts de todos los agentes de esa sala. GHOST es la salida para lo que no debe recordarse; PRIVACY, para los nombres que nunca deben aparecer.

---

## REFERENCIA

**`~/.pulse/config.json`**, o `PULSE_HOME/config.json`. Lo escribe MU/TH/UR; las variables de entorno mandan al siguiente arranque.

```json
{
  "opencode": { "model": "openai/gpt-5.6-sol" },
  "timeouts": { "default": 300000, "claude": 600000 },
  "room": { "softTokenBudget": 500000, "delegation": true, "maxPlanSteps": 4 },
  "memory": { "archivist": "auto", "every": 10, "idleMinutes": 10, "embedProvider": "auto", "recallShare": 0.3 },
  "privacy": { "terms": [], "marker": "[ENTIDAD-ORG]" },
  "updates": { "check": true },
  "telemetry": { "autoReport": false }
}
```

**Variables de entorno**

| Variable | Predeterminado | Efecto |
|---|---|---|
| `PULSE_HOME` | `~/.pulse` | Raíz de las salas y del config |
| `PULSE_SOFT_TOKEN_BUDGET` | `500000` | Presupuesto local de tokens por agente, ventana rodante de 5 h |
| `PULSE_CONTEXT_MAX_CHARS` | `16000` | Ventana de transcript inyectada |
| `PULSE_RECALL_SHARE` | `0.3` | Parte de la ventana para la memoria recordada (`0` la apaga) |
| `PULSE_DISTILL` · `_EVERY` · `_IDLE_MS` · `_MAX_CHARS` · `_AGENT` · `_MODEL` | `1` · `10` · `600000` · `6000` · — · — | Destilación de notas |
| `PULSE_EMBED` · `PULSE_EMBED_PROVIDER` | `1` · `auto` | Embeddings; `ollama`, `gemini`, `auto` |
| `PULSE_OLLAMA` · `_HOST` · `_MODEL` · `_EMBED_MODEL` | `1` · `http://127.0.0.1:11434` · el mejor · el mejor | Ollama |
| `PULSE_MEMORY_TOOLS` | `1` | Servidor MCP `pulse-memory` en cada turno |
| `PULSE_PRIVATE_TERMS` · `PULSE_PRIVATE_MARKER` | — · `[ENTIDAD-ORG]` | Términos privados extra y su marcador |
| `PULSE_UPDATE_CHECK` | `1` | `0` apaga la consulta diaria a npm |
| `PULSE_REPORT_URL` · `PULSE_AUTO_REPORT` | colector del proyecto · `0` | Sentinel |
| `PULSE_AGENT_TIMEOUT_MS` · `PULSE_<AGENTE>_TIMEOUT_MS` | `180000` · — | Timeouts |
| `PULSE_MAX_MESSAGE_CHARS` | `20000` | Tamaño máximo de un mensaje |
| `PULSE_DELEGATION` · `PULSE_MAX_PLAN_STEPS` | `1` · `4` | Delegación |
| `PULSE_ESCALATION_MS` | `180000` | Cronómetro de la escalación |
| `PULSE_OPENCODE_MODEL` | del config | `proveedor/modelo` para OpenCode |
| `PULSE_CLAUDE_USAGE` · `PULSE_OFFICIAL_QUOTA` | `0` · `1` | Cuota oficial de Claude (lee el llavero); `0` apaga todas las lecturas de proveedor |
| `PULSE_GEMINI_IDLE_MS` · `PULSE_GEMINI_RETRIES` · `PULSE_GEMINI_FALLBACK_MODEL` | `90000` · `1` · `gemini-2.5-flash` | Gemini bajo carga |

Cómo funcionan por dentro el ledger, el stream, la memoria, los adaptadores y la recuperación: [`docs/INTERNALS.md`](https://github.com/jossuealcacao-exe/madre/blob/main/docs/INTERNALS.md).

---

## ESTADO

Beta pública. El núcleo está probado y bajo CI en macOS y Linux con Node 22 y 24; la superficie sigue cambiando y las decisiones que aún duelen están escritas arriba, en *Lo que sale de la máquina*. Una versión se cierra cuando está en npm; el detalle de cada una, en [CHANGELOG.md](https://github.com/jossuealcacao-exe/madre/blob/main/CHANGELOG.md), y lo que viene, en el [roadmap](https://github.com/jossuealcacao-exe/madre/blob/main/docs/ROADMAP.md).

Problemas: desde MU/TH/UR (`✎ FEEDBACK` o el sentinel) o en [issues](https://github.com/jossuealcacao-exe/madre/issues). Seguridad: [SECURITY.md](https://github.com/jossuealcacao-exe/madre/blob/main/SECURITY.md). Contribuir: [CONTRIBUTING.md](https://github.com/jossuealcacao-exe/madre/blob/main/CONTRIBUTING.md).

Apache-2.0. Ver `LICENSE` y `NOTICE`.
