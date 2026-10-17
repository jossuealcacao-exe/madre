# MADRE · REFERENCIA

Todo lo que MADRE hace, con los números exactos. Para empezar en cinco minutos, el [README](../README.md).

- [Arranque](#arranque--los-primeros-cinco-minutos) · [El proyecto](#el-proyecto) · [Idioma](#idioma)
- [Modos de permiso](#modos-de-permiso) · [Qué puede cada agente](#qué-puede-cada-agente) · [Planes](#planes)
- [Memoria](#memoria) · [Tu modelo](#tu-modelo) · [Lo que se envía](#lo-que-se-envía) · [Diagnóstico](#diagnóstico) · [Módulos](#módulos)
- [Lo que sale de la máquina](#lo-que-sale-de-la-máquina) · [Config y variables](#referencia)

---

## ARRANQUE · LOS PRIMEROS CINCO MINUTOS

Necesitas Node 22.5 o superior y al menos una de estas CLIs con sesión iniciada: **Codex**, **Claude Code**, **Gemini CLI**, **OpenCode**. Si además corre **Ollama** con un modelo de chat, el proyecto tiene un quinto agente local.

1. Corre `npx @jossuealcala/madre` desde cualquier carpeta: abre Inicio, con todos tus proyectos y el Coordinador arriba. La primera vez lo acompaña un asistente de tres pasos: conectar los agentes (cada uno con su botón para instalarlo y firmarlo, ahí mismo; una vez para todos los proyectos), agregar los proyectos (eliges carpetas dentro de tu carpeta de usuario; agregar no abre) y abrir los que vas a usar. `npx @jossuealcala/madre start` dentro de una carpeta sigue abriendo ese proyecto directo; si no hay agentes, el proyecto abre igual en Conecta tus agentes para instalarlos y firmarlos.
2. El proyecto abre en `http://127.0.0.1:4317`. Elige un agente en el selector o escribe `@claude …`. El chip junto a `to @agente` dice en qué modo sale el mensaje; `#1 SOLO CONVERSAR`, solo lectura, es el predeterminado.
3. Para sumar o reconectar una IA más tarde: Ajustes → Agentes (el botón de ajustes de la barra, o ⌘, / Ctrl+,), donde los agentes viven junto al resto de los ajustes. Codex, Claude Code, Gemini (con tu cuenta de Google) y OpenCode (con GitHub Copilot) se firman con un clic; Gemini y OpenCode también aceptan su llave ahí mismo. Debajo de cada agente, «¿Prefieres tu terminal?» despliega el mismo paso escrito como comando, para quien prefiera hacerlo a mano. MADRE no guarda credenciales de proveedores: cada sesión y cada llave van al archivo de su propio CLI.
4. Con Ollama, el módulo IA local (Módulos, en la barra) ya está encendido: la memoria se embebe localmente y `@madre` aparece en la fila.
5. Ajustes → Memoria decide quién destila la memoria y cada cuánto. El Mapa de memoria, desde la cabecera de Diagnóstico, muestra lo que el proyecto recuerda.

```bash
npx @jossuealcala/madre doctor      # qué agentes hay, quién tiene sesión, si hay versión nueva
npx @jossuealcala/madre setup       # el mismo alta, desde la terminal, si la prefieres
npx @jossuealcala/madre start --no-open --project RUTA
```

**Tres nombres.** **MADRE** es el producto. **Diagnóstico** es su voz operativa: fallas, conexiones, ajustes. **Historial** es el canal sobre el que corre el proyecto: el registro de eventos, el bloque del plan, la carpeta `.pulse/` donde caen los artefactos; esos identificadores conservan su nombre de antes, PULSE.

---

## EL PROYECTO

**Conecta tus agentes.** Sin agentes en línea el proyecto abre en Conecta tus agentes: una tarjeta por agente con su estado real y la única acción que le toca, `INSTALL` o `SIGN IN`. Todo corre en tu máquina, con el comando a la vista, y la salida se transmite a la misma pantalla. Codex, Claude Code y Gemini se firman con un clic porque su CLI abre el navegador (Gemini no tiene comando para firmarse: MADRE selecciona «Login with Google» en sus ajustes, contesta por ti el sí que pide antes de abrir el navegador y detiene la corrida en cuanto el CLI guarda su sesión; si no termina, deja sus archivos como estaban). OpenCode se firma con GitHub Copilot: MADRE corre `opencode auth login -p github-copilot`, elige github.com en su menú y muestra la página y el código de dispositivo que escribes en GitHub. Desde la sala solo se ofrecen los proveedores que permiten este acceso a herramientas de terceros: nunca la suscripción de Claude (Anthropic no lo permite) y, por ahora, tampoco ChatGPT ni GitLab; esos y GitHub Enterprise quedan en `opencode auth login`, en tu terminal. Gemini y OpenCode también aceptan su llave ahí mismo, que MADRE escribe donde ese CLI la busca, con el archivo cerrado a tu usuario y sin guardar copia en ninguna parte, solo desde esta computadora. Cada tarjeta dice además con qué cuenta se firma ese agente y si hay una entrada sin pagar, para que elegir no sea a ciegas. Esa pantalla se repliega en cuanto un agente queda listo y no vuelve: es el primer contacto de un proyecto sin nadie dentro. A partir de ahí los agentes viven en `⚙ CONNECTIONS`, con los mismos botones y, al lado, los modos, los permisos y las llaves de cada agente.

**La barra.** La marca con su latido, la raíz del proyecto, los agentes, `LIVE`, las alertas (`DETENER TODO`, versión nueva), `MODULES`, `Diagnóstico`, tema y panel de archivos. Cada esfera de agente lleva el Uso, su consumo: el límite real del proveedor cuando el CLI lo publica, si no, la ventana local de MADRE. Un clic la despliega.

**Las burbujas.** Cada respuesta dice quién habla, a quién, en qué modo y con qué modelo; debajo, hora, tokens del turno y acumulado. Markdown completo, tablas, bloques de código con COPY. Las rutas que un agente menciona (`src/room.mjs:42`) abren el visor. Al pasar el ratón: valorar bien o mal, copiar, responder con otro agente.

**La caja de Escribir.**

| Escribes | Pasa |
|---|---|
| `@codex`, `@claude`, `@gemini`, `@opencode`, `@madre` | Menciona a un agente; `@` abre la lista |
| `!src/room.mjs:12-20` | Adjunta un archivo del proyecto, con líneas si las das; `!` busca entre los archivos |
| `#0` a `#4` | Fija el modo de permiso de ese mensaje. `#3` y `#4` abren el desbloqueo, igual que el chip: un modo que pide dos llaves con el ratón no sale gratis por teclearlo |
| `/create …`, `/image …`, `/stopall`, `/git …`, `/ahp …` | Comandos; `/` abre el menú. `/git push` muestra qué saldría; solo `/git push confirm` lo envía |
| `STOPALL` | Freno maestro |
| Clip, arrastrar o pegar una imagen | Adjunto para el proyecto, nunca dentro de su carpeta |
| `@madre, pregúntale a los agentes …` | Preguntar a todos: un paso por agente en línea, cierre citado |

Un segundo clic en la esfera elegida, o el chip `default model ▾`, elige el modelo de esa petición: Codex, Claude, Gemini y OpenCode con sus listas reales, o un nombre libre. Se recuerda por agente.

**Archivos.** El icono de la derecha abre el árbol del proyecto en solo lectura. El visor numera líneas; clic y Shift+clic seleccionan un rango y `REVIEW WITH` lo manda a un agente. Con **Vista previa** encendida en `MODULES`, HTML, SVG y Markdown se renderizan en un marco sellado en lugar de mostrar su código, con barra atrás/recargar y recarga automática cuando un agente cambia el archivo.

**Código.** La tecla `CÓDIGO` de la barra abre el visor junto a la conversación como espacio de código: los archivos del proyecto con su buscador, pestañas (hasta 12, que siguen ahí al recargar) y, sobre el código, la ruta y la función donde está el cursor. ⌘P (Ctrl+P fuera de macOS) abre un archivo por su nombre. Cambiar de pestaña no pierde lo que escribiste: el borrador se queda en su pestaña, marcado con un punto, hasta que guardas o descartas. Lo que un agente cambió en su último turno de `#3` EDITAR queda marcado en su color, con una tarjeta por cambio: **Conservar** (deja de marcarse), **Deshacer** (vuelve a poner lo que había solo en esas líneas; el resto del turno se queda) y **Preguntar por qué** (se lo pregunta al agente en la conversación). Un turno deshecho con `DESHACER`, o líneas que reescribiste tú, ya no se marcan. Al pedir revisión de unas líneas, `REVISAR CON` ofrece Explicar, Mejorar, Escribir pruebas y Arreglar. **Al lado** pone junto al código el Markdown renderizado mientras escribes, o la página HTML recargada al guardar (esta con Vista previa encendida). Lo conservado se guarda en `code-reviewed.json`, junto al registro del proyecto (`GET /api/files/changes`, `POST /api/files/changes/review`).

**Tema.** Sol/luna en la barra: automático, claro u oscuro. El claro no brilla; la pantalla de Diagnóstico sigue siendo fósforo.

**Idioma.** El proyecto habla **español** por defecto. El botón `EN` de la barra lo pasa a inglés y el navegador lo recuerda; `PULSE_LANGUAGE=en` manda sobre el config en el siguiente arranque. Un idioma es solo cómo se lee: lo que quedó escrito en el ledger conserva las palabras con que se escribió, y al mostrarse se vuelve a decir en el idioma del proyecto.

La **terminal sigue en inglés a propósito**: `madre doctor` y el arranque imprimen lo que la gente pega en un issue o busca en un motor, y en inglés se encuentra. Lo que imprime un CLI por su cuenta tampoco se toca nunca.

---

## MODOS DE PERMISO

Cada mensaje sale con un modo. Tu modo es el techo de cualquier plan que ese mensaje arranque.

| Modo | Nombre | Qué permite |
|---|---|---|
| `#0` | **INCÓGNITO** | Fuera del registro. No se escribe en el ledger, nadie lo recuerda, desaparece al recargar. Los tokens sí cuentan. |
| `#1` | **SOLO CONVERSAR** | Leer el proyecto y coordinar. El predeterminado. |
| `#2` | **CREAR** | Añadir archivos y carpetas nuevos donde corresponda en el proyecto. Lo que ya existía no cambia: si un agente lo toca, MADRE lo restaura al terminar y lo dice. |
| `#3` | **EDITAR** | Editar el proyecto real sin aprobación por acción. Un titular por proyecto, punto de restauración antes, lista de cambios y `DESHACER` después. |
| `#4` | **ACCESO TOTAL** | Todo lo de EDITAR más ejecutar comandos: pruebas, builds, `git push`, deploys con las CLIs y sesiones que ya hay en la máquina. Los archivos vuelven con `DESHACER`; lo que sale de la nave, no. El desbloqueo pide la misma llave dos veces: el nombre del proyecto (o tu frase), escrito dos veces. |

**CREAR por dentro.** El agente decide dónde va lo nuevo según las convenciones del proyecto, y crea carpetas si hace falta; `.pulse/out/<turno>/` queda como borrador para lo que no tiene sitio. MADRE toma un punto de restauración antes del turno y, al terminar, conserva lo que apareció, lo muestra bajo la respuesta como artefactos, y restaura cualquier archivo previo que se haya modificado, renombrado o borrado, avisando en el proyecto. Las CLIs reciben sus herramientas de escritura sobre el proyecto y la instrucción de no tocar lo existente; la garantía la da la restauración de MADRE al terminar, no la regla previa.

**EDITAR por dentro.** Antes del turno, un commit real bajo `refs/madre/checkpoints/` que no toca tu rama, tu índice ni tu stash. Durante el turno, `.git/`, `.pulse/`, `.madre/`, los `.env` y `.claude/settings.local.json` quedan en solo lectura a nivel de sistema de archivos y recuperan sus permisos al terminar. Después, la lista de archivos añadidos, modificados y borrados, y `DESHACER` restaura el punto de restauración. Desbloquear `#3` pide el nombre del proyecto; desbloquear `#4` lo pide dos veces. En `#4` cada CLI recibe su herramienta de comandos (Codex sin sandbox de red, Claude `Bash`, Gemini `run_shell_command`, OpenCode `bash`) y la instrucción de decir en una línea qué va a salir y adónde antes de que salga.

**Solicitud de permiso.** Si un plan en `#1` llega a un paso que pide crear algo, el proyecto se detiene y pregunta: `GRANT ONCE · GRANT FOR PLAN · DENY`, con cronómetro de tres minutos. Solo el humano concede; un permiso escrito por un agente dentro de la conversación no cuenta. Un paso que pide `#3` o `#4` también se detiene: se desbloquea con la llave de ese modo y de ese agente. Concederlo para el plan no desbloquea a los demás agentes.

**Un permiso con su tiempo.** Un agente que necesita más lo pide en una línea con el modo y cuánto («Necesito #3 por 15 min: …»). Su respuesta lleva una tarjeta con el modo, el tiempo que pidió y los que hay (#3: 5, 15 o 30 min; #4: 5 min) o solo ese mensaje; la llave abre esa ventana para ese agente.

**Copiloto.** El robot junto a modo · modelo · esfuerzo. Se enciende con la llave de `#3`, una vez, por 30 min, 1, 4, 8 o 24 h; `DETENER TODO`, apagarlo o un reinicio lo terminan. Mientras dura, un mensaje en `#3` no pide llave y va al agente al que le escribes, aunque su Modo máximo sea `#2`, siempre que su CLI pueda escribir. Ese agente edita el proyecto, arma planes y da a cada paso hasta `#3`, y los comandos que pide y son seguros —leer (`ls`, `cat`, `rg`…), pruebas y builds (`npm test`, `npm run build`, `node --test`, `pytest`, `go test`…), git local (`status`, `diff`, `log`, `add`, `commit`)— corren solos y su resultado le regresa; cualquier otra línea espera tu botón. Lo que borra vuelve al terminar el turno, nunca toca `.git/`, `.pulse/`, `.madre/` ni los `.env`, y `#4` sigue pidiendo su propia llave. Tras ocho rondas de comandos sin que escribas, se detiene y avisa.

**Modo por paso.** Un orquestador puede pedir el modo de cada paso: `@codex #2: crea la página`, `@claude #3: arregla el router`. Sin número, el paso solo lee, o crea si el plan ya puede crear: `#3` se pide por su nombre. MADRE respeta el `MAX MODE` de cada agente. Con tu mensaje en `#3`, la palabra del orquestador basta para un paso `#3`; con tu mensaje en `#1`, un paso `#2` pasa por la solicitud de permiso y `#3` o `#4` pide tu llave. Un paso `#4` pide siempre la llave de ese agente, aunque tu mensaje vaya en `#4`.

**Dos controles por agente.** El Modo máximo, en Ajustes → Permisos, dice hasta dónde puede llegar un mensaje dirigido a cada agente; el Modo inicial, en Ajustes → Agentes, dónde empieza: `#1` solo lectura hasta que armes CREAR, o `#2` para que cada turno pueda añadir archivos sin pedirlo. Aparte, dos habilidades: generar imágenes y web.

**Comandos que pide un agente.** Con el módulo **Comandos** encendido, un agente en `#1`, `#2` o `#3` que necesita un comando que no puede correr (las pruebas, un build, un linter) termina su respuesta con un bloque `pulse-run`: el motivo en la primera línea y un comando por línea, cada uno con `$`. MADRE muestra cada línea como un botón y no corre nada hasta que lo presionas. Cada línea corre sola, desde la raíz del proyecto y **sin shell**: lo que lees en el botón es exactamente lo que se ejecuta, así que las líneas con `|`, `&&`, `;`, redirecciones, `$VARIABLES`, comodines, `~` o `cd` se muestran con el motivo y no se pueden correr. Antes de correr, MADRE toma un punto de restauración; la salida queda en el proyecto como tarjeta plegada y, cuando corrieron todas las líneas que pueden correr, **vuelve al agente que las pidió** en un turno propio, con el modo que tenía (hasta `#3`; desde el teléfono, hasta `#2`), lo que estaba contestando y la salida de cada línea. Si ese agente sigue contestando, espera; `DETENER TODO` la retiene. **Correr todos** corre las líneas una tras otra y **Devolver lo que corrió** entrega lo que hay sin el resto. Si el comando cambió archivos, `DESHACER` los regresa. Lo que el comando haya mandado fuera de la máquina no regresa. Un comando a la vez, diez minutos como máximo, y `DETENER` en su tarjeta o `DETENER TODO` lo detienen. Un comando que abre un puerto es un servidor: no tiene límite de tiempo, su tarjeta dice dónde escucha y lo abre en TUS SERVIDORES, y mientras sirve puedes correr otro comando. Los agentes saben que un servidor para el proyecto escucha solo en `127.0.0.1`. En `#4` el agente corre sus propios comandos y no se le enseña el bloque.

---

## QUÉ PUEDE CADA AGENTE

| | Lee el proyecto | Recibe imágenes | Crea archivos acotado | Genera imágenes | Web |
|---|---|---|---|---|---|
| **Codex** | sí | `-i` | sandbox de escritura | sí, nativo, con su cuenta de ChatGPT | `web_search` |
| **Claude Code** | sí | lectura de la ruta | reglas de permiso por ruta | sí, con **Imágenes** | WebFetch / WebSearch |
| **Gemini CLI** | sí | `read_file` | política por patrón | sí, con **Imágenes** | `google_web_search` |
| **OpenCode** | sí | `-f` | permisos `edit` por patrón | sí, con **Imágenes** | webfetch / websearch |
| **@madre** | la memoria | no | no | no | no |

**Imágenes** es un módulo de MADRE: un servidor MCP propio que expone `generate_image` sobre los modelos de imagen de la API de Gemini, con tu propia key y tus créditos. Hoy **solo Gemini**, y por una razón: es la única cuenta de los agentes cuya llave MADRE ya encuentra sin pedirte una nueva, y tiene capa gratis. Anthropic no genera imágenes —Claude las lee, no las hace—, la cuenta de ChatGPT con la que se firma Codex no da acceso a la API de imágenes, y OpenCode depende del proveedor al que lo apuntes. Se conecta a Claude, Gemini y OpenCode solo dentro de un permiso CREAR con el alcance de imágenes encendido, en sus homes aislados, y la imagen cae en la carpeta del turno como cualquier artefacto. `/image <petición>` arma el permiso y enruta al agente que puede generar. Con los cuatro agentes puedes pedir una imagen; Codex la hace con lo suyo, los demás con Imágenes.

El acceso web es un permiso permanente por agente, apagado por defecto, que se enciende en Ajustes → Agentes, con Acceso a la web.

---

## PLANES

Un agente puede poner a trabajar a los demás. Si le pides coordinar, termina su respuesta con un bloque `pulse`, un paso por línea:

```
@gemini: Sintetiza en un párrafo quién es el autor, separando hechos de inferencias.
@codex: Misma pregunta; señala la afirmación menos sustentada.
@claude: Compara ambas síntesis y marca dónde divergen.
```

MADRE ejecuta los pasos como turnos normales: cada uno queda en el ledger, pasa por traspaso, presupuesto y timeout. Tras las respuestas, el orquestador recibe un turno de cierre aunque no lo haya escrito como paso. Puede proponer el siguiente tramo si aún queda trabajo dentro de los permisos concedidos; MADRE permite hasta tres tramos por petición. Los delegados no abren planes propios. Cada tramo tiene como máximo cuatro pasos más el cierre.

**TURNOS.** En Diagnóstico, junto al centinela. Encendido por defecto: una conversación que sigue trabajando cuando abres otra no se detiene, sigue escribiendo su registro y el panel de conversaciones la marca hasta que termina. Dos límites: conversaciones trabajando a la vez (2) y turnos a la vez en cada una (3); un mensaje que los pasaría se rechaza con el motivo antes de empezar. Todas las conversaciones comparten un solo titular de EDITAR o ACCESO TOTAL. Apagado, una sola conversación maneja a los agentes y no se puede cambiar de una que está trabajando. `DETENER TODO` detiene todas.

**DETENER TODO.** El botón de la barra, `STOPALL` en la caja de Escribir o `curl -X POST http://127.0.0.1:4317/api/stop-all` detienen todos los planes y matan todos los procesos de agente. Diagnóstico avisa en rojo cuando el proyecto se escapa: tres agentes a la vez, un agente con dos turnos cruzados, un plan de más de cinco minutos.

---

## MEMORIA

Todo lo dicho fuera de INCÓGNITO queda indexado junto al ledger, en `~/.pulse/rooms/<sala>/memory.sqlite`. Nada de esto requiere un comando: ocurre solo.

**Recall.** Cuando la conversación excede la ventana de contexto, cada turno recibe los intercambios anteriores que coinciden con la petición, citados con su número de secuencia, para cualquier agente.

**Notas destiladas.** Cada diez intercambios o tras diez minutos de reposo, el archivista lee lo no destilado y guarda hasta cinco notas tipadas: decisión, hecho, preferencia, pregunta abierta. El archivista es el agente más barato permitido; con Ollama es el modelo local y no cuesta nada.

**Por significado.** Con Ollama (`nomic-embed-text`) o con una key de Gemini, intercambios y notas se embeben en segundo plano; una pregunta en español encuentra una decisión escrita en inglés.

**Herramientas.** Cada turno lleva adjunto el servidor MCP `pulse-memory`: `memory_search`, `memory_recall`, `memory_notes`, `memory_timeline`, `project_state` y `memory_note`, que guarda una nota cuando tú pides explícitamente recordar algo. La burbuja muestra `◉ memory saved`.

**Mapa de memoria.** La memoria en un mapa, detrás del nombre del proyecto: MADRE es un sol rojo que late, cada memoria un planeta en el color de su tipo, unidos por venas que pulsan. Se navega, se lee y solo se puede borrar, con doble confirmación. Ocho toques al corazón activan el Bloqueo temporal y sellan el archivo diez minutos.

**@madre.** Con Ollama y un modelo de chat, la memoria habla: `@madre` responde desde todo el archivo con citas `[#n]`, dice cuando el proyecto nunca discutió algo, no escribe ni ejecuta, y convoca a los agentes si se lo pides. Sus tokens son locales y no cuentan. Cuando existe un modelo entrenado con el proyecto, lo usa.

**Ajustes.** Ajustes → Memoria: quién destila, quiénes pueden, cada cuánto, dónde se embebe, cuánto contexto puede ocupar el recall. Todo en `~/.pulse/config.json`, sin reiniciar.

**Privacidad.** Una CLI corre con su propio contexto privado y puede escribirlo en una respuesta. En Ajustes → Privacidad nombras los términos que no deben viajar por el proyecto: MADRE los sustituye por `[ENTIDAD-ORG]` antes de que lleguen al ledger, al archivista, a los demás agentes o al dataset, y Borrar datos privados limpia lo que el proyecto ya tenía. Los términos viven en `config.json`; el proyecto solo registra cuántos.

---

## TU MODELO

El proyecto acumula material de entrenamiento mientras trabajas. `MEMORY` muestra en vivo cuántos pares limpios lleva hacia un LoRA, con 300 como objetivo: turnos humano→agente, pasos del plan y notas destiladas; fuera quedan las respuestas de `@madre`, las enlatadas y lo que marques como mala respuesta con el pulgar de cada burbuja.

`EXPORT DATASET` escribe `train.jsonl` y `valid.jsonl` junto al ledger, redactados. La tarjeta `TRAIN` trae los comandos ya rellenados con tu carpeta de proyecto y el modelo base que cabe en tu máquina. El entrenamiento corre fuera de MADRE, con mlx en Apple Silicon; la receta vive en [`docs/training/`](training/README.md). En cuanto Ollama tiene un modelo `madre-<proyecto>`, `@madre` responde con él y las demás CLIs reciben la indicación de preguntarle primero: la memoria del proyecto deja de costar tokens.

**Ollama.** Si corre en la máquina, MADRE lo usa sin configurar nada: búsqueda inteligente local, archivista local, `@madre`. El módulo IA local, en Módulos, muestra servidor, modelos y roles, descarga los recomendados y deja apagar cada rol. El modelo que propone sale de tu equipo, no de una regla fija: el bloque «Tu computadora» lee el chip Apple y su memoria compartida, la tarjeta NVIDIA y su memoria de video, o solo el procesador, y muestra cada tamaño de Qwen2.5 (0.5B a 72B) con su mínimo para correr y para entrenar (por ejemplo, `qwen2.5:7b` desde 12 GB y `qwen2.5:3b` desde 8 GB). Si hay varios descargados, usa el más grande; prefiere modelos de chat general sobre los `-coder`.

---

## LO QUE SE ENVÍA

Entra al **Mapa de memoria** desde la cabecera de Diagnóstico y haz clic en el núcleo, la estrella del centro. Cada turno, el proyecto escribe un documento en tu nombre y se lo entrega a un proceso; hasta ahora ese documento existía solo el instante en que el proceso lo leía. Ahí está entero: bloque por bloque, con lo que pesa cada uno y las palabras exactas que el agente recibe.

Cambia a quién va y las palabras cambian; sube el modo y aparece el permiso que se le daría, escrito —sin crear carpeta ni tomar punto de restauración para enseñarlo—. Preguntar qué diría el proyecto no es el proyecto diciéndolo: nada se cuenta, nada se guarda, nada sale. Y se lee, nunca se escribe: lo que MADRE promete sobre los agentes es cierto porque esas palabras son fijas.

**THE LAUNCH.** Debajo del documento, el comando exacto que MADRE correría para entregarlo: el ejecutable, el directorio, cada bandera y el lugar donde entra el briefing. No es una descripción — lo arman los mismos adaptadores que lo armarían de verdad. Debajo, lo que mantiene la corrida dentro del turno (la sesión que no persiste, el hogar temporal que se borra al terminar) y los servidores MCP que podría llamar, con sus herramientas contadas. **De ese comando nunca se imprime un valor de entorno, solo los nombres**: una línea de comandos es algo que la gente fotografía.

**Envíos.** El registro de salidas: cada destino al que MADRE o un agente llamó, con su cuenta. Nunca cuerpos, ni cabeceras, ni valores de consulta — solo a dónde y cuántas veces.

**La consola.** Dentro del núcleo, Diagnóstico contesta desde lo que el proyecto ya tiene. Tres respuestas que no entiende y la interfaz se cierra.

## DIAGNÓSTICO

El botón de la barra abre la pantalla de diagnóstico. Escribe un síntoma, un agente o una palabra y Diagnóstico clasifica las condiciones registradas en este proyecto contra su catálogo, con el remedio para tu sistema operativo; cuando el proyecto puede aplicarlo, el remedio trae Aplicar. El mismo catálogo en terminal: `madre doctor --catalog [texto]`. La sesión de cada CLI, los modos, las habilidades, los tiempos, la memoria y la privacidad están en Ajustes.

| En el encabezado | Qué hace |
|---|---|
| Mapa de memoria (cerebro) | La memoria en un mapa. También está en la barra de arriba |
| Ajustes (engrane) | Abre Ajustes › Versión y reportes, donde vive el centinela: los fallos que ninguna condición explica y las caídas del proceso, con rutas, usuarios, correos y claves eliminados. Cada reporte se lee antes de enviarse; el autorreporte viene apagado |
| ¿No se arregló? | Al pie de cada remedio: reporta que no funcionó, con el código de la condición |
| `?` | El recorrido de cinco paradas, el mismo que se abre la primera vez. Si dejaste a medias la lista de primeros pasos y la ocultaste, también la regresa |

---

## MÓDULOS

`MODULES` en la barra lista los disponibles y su estado. Ninguno escribe en el proyecto salvo la instalación de Continuidad, que muestra el comando y pide confirmación.

| Módulo | Qué añade |
|---|---|
| **Git** | `/git status`, `/git log [n]`, `/git diff`, `/git branches`: hechos del repositorio como tarjeta en el hilo, que los agentes también leen. `/git commit "mensaje"` y `/git push confirm`: tu mano sobre el repositorio, con vista previa de lo que saldría |
| **Imágenes** | `generate_image` para Claude, Gemini y OpenCode, con tu key de Gemini, dentro de CREAR |
| **Vista previa** | El visor renderiza HTML, SVG y Markdown en un marco sellado, con recarga automática |
| **IA local** | Búsqueda inteligente, archivista y `@madre` en local, gratis y sin cuenta. Se instala, se despierta y descarga su modelo desde Conecta tus agentes |
| **Navegador de pruebas** | Un navegador headless en los turnos que piden ver, probar o capturar una página. Solo alcanza esta MADRE y los servidores que arrancaste desde COMANDOS: abrir la Vista previa o la app servida, hacer clic, leer consola, capturas al borrador del turno. Al encenderlo, MADRE comprueba que el servidor arranque con su navegador. Requiere `@playwright/mcp` |
| **GitHub** | `/gh`: pull requests abiertos, el CI de tu rama e issues abiertos como tarjeta. `/gh pr [n]`, `/gh ci`, `/gh issues`. `/gh pr create "título"`, `/gh comment <n> "texto"` y `/gh issue "título"` enseñan primero lo que se publicaría y solo publican con `confirm`. Los agentes leen en cualquier modo y escriben solo en `#4` ACCESO TOTAL. Entra con tu sesión de `gh`; sin ella, con un token de acceso detallado guardado en la bodega de MADRE |
| **Comandos** | Un agente te pide correr un comando que su modo no le deja correr; cada línea es un botón, corre sin shell desde la raíz del proyecto, con punto de restauración antes, y al terminar la salida vuelve al agente que la pidió para que siga. Un comando que abre un puerto es un servidor: sigue corriendo hasta que lo detienes desde su tarjeta, y mientras sirve puedes correr otro. Cuesta unos 300 tokens de instrucción por turno debajo de ACCESO TOTAL mientras está encendido |
| **Ahorro de tokens** | La economía de tokens del proyecto. El interruptor pide a los agentes respuestas en prosa compacta; lo demás está siempre encendido y no se nota: el briefing lleva solo los bloques que el turno puede usar, lo que nunca cambia se lee primero para que el caché lo reconozca, y la transcripción se queda quieta en vez de deslizarse. Nada de lo que tú escribes se altera. En su ventana, en Módulos, se ve a dónde se van los tokens |
| **Intenciones** | Bajo la caja, cuánto debe pensar Claude Code o Codex para el mensaje que escribes: subir cuando la petición parece pedir más, bajar solo cuando se vio o se midió que basta. Aprende primero de tu uso real, sin gastar tokens: lee en el registro del proyecto qué nivel usaste para cada tipo de pedido y si te alcanzó (seguiste con otra cosa) o se quedó corto (fallo, mala calificación o lo volviste a pedir en 15 minutos); esa lectura vive solo en memoria. Las pruebas rápida y completa de su tarjeta miden más rápido, con preguntas reales del proyecto y un juicio a ciegas, qué nivel basta para cada tipo de pregunta. Las mediciones viven en `~/.pulse/rooms/<sala>/intents.jsonl`. Nada cambia solo |
| **Continuidad** | Integración externa opcional: estado verificado del proyecto, checkpoints y handoffs en `.ahp/`; `/ahp status`, `/ahp check`, `/ahp context` |

**Herramientas externas (MCP)** (antes «Conectar MCP») vive en **Ajustes › Herramientas externas (MCP)** de cada proyecto, no en Módulos. Agrega un servidor MCP por comando local o por dirección web (sin sesión, con token o iniciando sesión con OAuth: MADRE se registra como cliente público, sin secreto, y la vuelta cae en el propio proyecto), o tráelo de `.mcp.json`, `opencode.json`, Claude Code, Codex, Gemini CLI o Cursor; al importar solo se leen los nombres y los valores van a la bodega. Antes de entregárselo a un turno, MADRE lo arranca y le pide sus herramientas: si no responde, se queda fuera y su fila dice por qué. Las herramientas que el servidor marca como de solo lectura van desde `#1`; las que actúan, desde el modo que elijas por servidor (`#4` si no lo bajas). Las cuatro CLIs arrancan el mismo intermediario de MADRE (`src/mcp/proxy.mjs`), que lee los secretos de la bodega, deja pasar solo las herramientas permitidas y habla HTTP con los servidores remotos: ningún secreto queda en la línea de comandos ni en un archivo del proyecto. La lista vive junto al registro del proyecto (`~/.pulse/rooms/<sala>/mcp.json`).

Cada módulo es un archivo. Los tuyos van en `~/.pulse/modules/` (todos los proyectos) o en `<proyecto>/.madre/modules/` (ese proyecto): un `.mjs` con `export default { … }`, sin build ni registro, con interruptor, ajustes, comandos `/nombre`, herramientas MCP para los agentes y rutas propias. `RELOAD MODULES` lo recarga sin reiniciar. Guía y ejemplo listo para copiar en [`docs/SDK.md`](SDK.md). Cómo escribir uno, en [CONTRIBUTING.md](../CONTRIBUTING.md#writing-a-module).

---

## INICIO · TODOS TUS PROYECTOS

**Inicio** junta todos tus proyectos: la tecla de los tres círculos al principio de la barra. Muestra los proyectos abiertos en esta Mac (quién te espera, quién trabaja, su última conversación y cuántas memorias guarda, por tipo) y los **dormidos**: proyectos cerrados cuya carpeta sigue en disco. El plan completo vive en `docs/MACROVERSO.md`.

| En Inicio | Pasa |
|---|---|
| **Abrir** | Lleva a ese proyecto en su puerto; con ⌘ se abre al lado |
| **Cerrar** | Detiene lo que corre en ese proyecto y lo cierra, como `Ctrl+C` en su terminal. Pregunta antes |
| **Despertar** | Abre un proyecto dormido como lo haría `madre start --project <carpeta>`; lo que dice al arrancar queda en `start.log`, junto a su registro |
| **Detener todo** | Frena a todos los agentes de todos los proyectos |
| **Quitar de MADRE** (⋯ en su tarjeta, o clic derecho) | Lo saca de Inicio. Si está abierto, lo cierra antes, y termina sus conexiones. Su carpeta en la Mac no se toca, y su memoria se queda en MADRE: si la vuelves a agregar, ahí está. Pregunta antes |

En un proyecto, la tecla junto a la casa **cambia de proyecto**: su indicador dice quién te espera (un número), quién trabaja (late) y quién terminó mientras estabas en otro (verde). Abre un panel con los demás proyectos abiertos; un clic lleva ahí y ⌘-clic abre otra pestaña. Lo lee de `GET /api/salas/open`: las salas abiertas, cada una con su resumen y sin el censo; solo esta Mac.

**El Mapa de proyectos**, desde Inicio en una pantalla de 900 px o más: tus proyectos en el espacio abierto, y cada uno es un Mapa de memoria dibujado por el mismo motor que el de su proyecto (`public/nostromo-engine.js`). Arrastra el espacio para moverlo, rueda para acercarte, **Recentrar** para volver a casa. Clic o ← → para volar a uno: el proyecto elegido es el único vivo, con su magma y sus pulsos; arrástralo para girarlo, toca una memoria para leerla en la ficha, Esc para soltarla y otra vez Esc para volver. De lejos cada proyecto se lee de su propio proceso sin las palabras de sus memorias (`GET /api/salas/universe?id=`); solo el elegido las pide (`&full=1`).

**Conexiones.** Una conexión es un contrato entre dos proyectos que firmas en Inicio (**Conectar proyectos**, o arrastrando un proyecto sobre otro en el Mapa de proyectos): quién lee de quién (o los dos), qué tipos cruzan y hasta cuándo. Cruzan solo notas destiladas que viajan a los turnos (bodega y puente), limpias por el guardia de privacidad del proyecto que entrega; nunca el registro, archivos, llaves, enfermería ni esclusa; y solo de lectura. En el proyecto que puede leer, cada turno lleva el servidor MCP `pulse-enlaces` (`enlace_rooms`, `enlace_search`); sin contrato no existe. Firmar y revocar dejan una línea en los dos proyectos; cada lectura queda contada (`enlace.read` en el que entrega, `enlace.received` en el que lee) y se ve en Inicio y como pulsos en la conexión del Mapa de proyectos.

**Quién leyó.** Cada lectura pertenece a un turno: la herramienta dice su agente y su turno, y el proyecto que lee comprueba que ese turno está corriendo ahí, para ese agente y arriba de INCÓGNITO; si no, no lee nada (ni dice si la conexión existe). La lectura queda con su agente y su turno en el proyecto que lee, con el agente en el que entrega, y bajo la respuesta de ese turno una línea dice «leyó 3 notas de gumball». En Inicio, cada conexión dice quién leyó al último.

**Incluir siempre.** Una casilla por conexión, apagada por defecto, en la hoja de firma y en cada conexión de Inicio. Marcada, cada turno del proyecto que lee recibe, sin pedirlas, hasta 3 notas del otro proyecto que casan con la pregunta (en un bloque del prompt, «recordó 3 notas de gumball» bajo la respuesta). Cada turno así es una lectura del tope por hora de la conexión; pasado el tope, el turno sigue sin notas. Nunca en INCÓGNITO, nunca para `@madre`, nunca en el proyecto del Coordinador. Solo tú la marcas o la quitas, desde Inicio; el Coordinador nunca la marca en las conexiones que firma.

| Ruta | Qué | Quién |
|---|---|---|
| `POST /api/salas/enlaces` · `POST /api/salas/enlaces/revoke` | Firmar y revocar. Dos proyectos se conectan una sola vez: mientras haya una conexión vigente entre ellos, en cualquier dirección, firmar otra responde 409 | La página de Inicio |
| `POST /api/salas/forget` | Quitar un proyecto de MADRE: lo cierra si está abierto, revoca sus conexiones y aparta su `project.json` como `project.forgotten.json`. Nunca el del Coordinador | La página de Inicio con su `Origin`, nunca un proceso |
| `GET /api/tour` · `POST /api/tour` | El recorrido de 1.0: si se debe el bonjour, si la persona viene de 0.7.2, capítulos leídos, dónde iba, pistas vistas. Se guarda en `~/.pulse/tour.json`, uno por persona, no uno por puerto | Las páginas de esta Mac |
| `GET /api/looks` · `POST /api/looks` | La apariencia que comparten Inicio y todos los proyectos: tema, acento, fondo y sus dos diales, burbujas y texto. Se guarda en `~/.pulse/looks.json`, una por persona; cada página la lee al abrir y al volver a verse, y la escribe al cambiarla. Lo que Inicio elige para sus tarjetas se queda en su navegador | Las páginas de esta Mac |
| `GET /api/looks/wallpaper` · `PUT /api/looks/wallpaper` · `POST /api/looks/wallpaper/frame` · `DELETE /api/looks/wallpaper` | Tu propia imagen de fondo (1.0.3): una sola para todas las páginas, en `~/.pulse/wallpaper/`. La página la ajusta (lado mayor de 2880 px), la codifica y saca sus colores para el velo, la malla y el tinte; el servidor guarda solo una imagen WebP, JPEG o PNG de hasta 8 MB, reconocida por sus primeros bytes (nunca SVG), y la sirve con su tipo y `nosniff`. `GET /api/looks` la incluye como `custom`; cada página sigue eligiéndola o no (`pulse.wallpaper` = `custom`) | Las páginas de esta Mac |
| `GET /api/tour/projects` · `POST /api/tour/projects` | Los proyectos de 0.7.2 que Inicio no puede listar (sin `project.json`) y traer uno: se busca su carpeta por nombre en las carpetas de siempre y se confirma por el hash de su id. Los quitados a propósito no vuelven | Las páginas de esta Mac |
| `POST /api/override/arm` | La llave de #3 y #4, comprobada por el proyecto (`src/override.mjs`): lo que se escribió, una o dos veces, y un pase para ese agente y ese modo. Un mensaje a #3 o #4 va solo con su pase; sin permiso recordado abre un mensaje, con él, los que quepan en sus minutos. STOP ALL y un reinicio los retiran. Ocho llaves equivocadas en un minuto responden 429. La huella de la frase nunca sale por `GET /api/settings` ni `/api/state` | Las páginas de esta Mac |
| `GET /api/copilot` · `POST /api/copilot` · `POST /api/copilot/off` | El copiloto: si está encendido y hasta cuándo; encenderlo con la llave de `#3` (`{ minutes, words }`, 30 a 1440 min) y apagarlo. Un mensaje con `copilot: true` en `#3` va sin pase mientras dura; apagado responde 409 con `copilotOff`. Nunca desde un teléfono | Las páginas de esta Mac |
| `POST /api/runs/return` | Devolver al agente lo que corrió de su petición de comandos sin el resto (`{ responseMessageId }`). Cuando corren todas sus líneas, se devuelve sola | Las páginas del proyecto |
| `GET/POST /api/x/mcp/servers` · `POST /api/x/mcp/servers/<id>/check · toggle · actions · remove · signin` · `GET/POST /api/x/mcp/import` · `GET /api/x/mcp/oauth/callback` | Herramientas externas (MCP): la lista sin valores, agregar y revisar, encender, desde qué modo actúa, quitar (con sus secretos), iniciar sesión con OAuth y su vuelta, y lo que se puede traer de otras apps | Las páginas de esta Mac; la vuelta de OAuth, el navegador |
| `GET /api/enlace/memories` | Lo que este proyecto entrega por un contrato: solo `travels()` y los tipos del contrato, redactado; 404 si el contrato no sirve a quien pide, 423 sellado, 429 sobre el tope | Otro proceso de MADRE con la llave del canal (`~/.pulse/credentials/enlaces.json`), sin `Origin` |
| `POST /api/enlace/ask` | Lo que este proyecto pide a otro; solo para un turno que corre aquí (409 si no); registra `enlace.received` con agente y turno | El servidor `pulse-enlaces` de un turno, con la llave |
| `POST /api/salas/enlaces/recall` | Marcar o quitar «Incluir siempre» de una conexión | La página de Inicio, nunca un proceso |
| `GET /api/enlace/corpus` | (D-S15) Todo lo que este proyecto deja aprender al Coordinador por un contrato con `train`: las notas que viajan de los tipos del contrato, hasta 5,000, redactadas; 404 si el contrato no lo permite, 423 sellado, 429 sobre su tope de 6 por hora | La sala del Coordinador, con la llave del canal, sin `Origin` |
| `POST /api/salas/enlaces/train` | Marcar o quitar «El Coordinador aprende de él»; al quitarla se borra la copia que guardó Salas | La página de Inicio, nunca un proceso |
| `GET /api/enlace/state` | (D-S16) El estado canónico de Continuidad (AHP+) de este proyecto por un contrato con `state`: objetivo, fase, siguiente paso, bloqueos, último traspaso, decisiones aceptadas y lo abierto, redactado; `state: null` sin `.ahp/`; 404 si el contrato no lo permite, 423 sellado, 429 sobre `perHour` | La sala que lee, con la llave del canal, sin `Origin` |
| `POST /api/enlace/deliver` | (D-S17) Notas que entrega la sala que lee por un contrato con `deliver` (1 a 5, de los tipos que se sostienen, 600 caracteres); quedan pendientes en la bandeja; 429 sobre `perHour` o con 50 esperando | La sala que lee, con la llave del canal, sin `Origin` |
| `POST /api/enlace/ask-state`, `POST /api/enlace/send` | El lado que pide de lo anterior, para las herramientas `enlace_state` y `enlace_deliver` de un turno que corre aquí | Un proceso de esta Mac con la llave y un turno vivo |
| `GET /api/enlace/inbox` · `POST /api/enlace/inbox/decide` | (D-S17) Las notas entregadas a este proyecto, y aceptar o rechazar una; aceptada, entra a la memoria (`origin: 'delivered'`) | La página del proyecto, o un agente suyo en `#3`/`#4` con la llave |
| `POST /api/salas/enlaces/allow` | (D-S16, D-S17) Marcar o quitar «Comparte su estado» (`state`) o «Recibe notas entregadas» (`deliver`) | La página de Inicio, nunca un proceso |
| `POST /api/madre/shutdown` | Apagar MADRE: pide a cada proyecto abierto que se cierre como lo cierra Inicio, espera hasta 15 s y se cierra; responde `closed` y `stuck` | Solo la página de MADRE en esta computadora (`Origin` propio), nunca un proceso ni el teléfono |
| `GET /api/home-layout` · `POST /api/home-layout` | El acomodo de Inicio en `~/.pulse/home.json` (widgets, orden de proyectos, barra fijada, tarjetas), igual desde cualquier puerto | La página de Inicio |
| `GET /api/x/bishop/exam` · `POST /api/x/bishop/exam` | (D-S18) El último examen del modelo local del Coordinador y si sigue valiendo para el modelo en uso; empezarlo (corre en segundo plano) | La página de Inicio |
| `POST /api/enlace/notice` | La línea de Diagnóstico al firmar o revocar | El proyecto que sirve Inicio, con la llave |

Los contratos viven en `~/.pulse/config.json` bajo `enlaces` y los cruces en `enlaces.jsonl` junto al registro de cada proyecto.

Cada proyecto recuerda dónde está su carpeta (`project.json`, junto a su registro); un proyecto abierto por última vez con una MADRE anterior aparece cuando se vuelve a abrir.

**El proyecto del Coordinador.** `madre salas` abre un proyecto que vive en una carpeta de MADRE (`~/.pulse/salas`, creada la primera vez): la puerta de entrada cuando no estás en ningún proyecto, y también lo que abre `madre` a secas desde tu carpeta personal. Es un proyecto como los demás —su conversación, su memoria, sus modos— y en Inicio va primero, con su marca. Su barra lleva la tecla **Mapa de proyectos**. Nunca entrega notas por una conexión, y es el único que puede recibir permiso para dar órdenes a otro (la hoja de firma lo pide con el nombre de ese proyecto).

**El Coordinador**, el guardián de tus proyectos, vive en su propio proyecto: ahí viven también lo que sabe de todos (contratos, censo y notas de los proyectos conectados). En su ficha de MÓDULOS eliges qué agente listo habla por él (`@madre` por defecto si Ollama está listo) y su modo de órdenes. Con `@madre`, el Coordinador solo responde: no propone órdenes ni conexiones. Con cualquier otro agente, si le pides actuar o conectar, cierra su respuesta con un bloque `pulse-salas`: el motivo, hasta 4 órdenes `@sala/agente #modo: tarea` y hasta 2 conexiones `enlace A → B: tipos; 7 días; órdenes #1`. El proyecto lo convierte en una tarjeta con una fila por orden y por conexión. Si una pregunta necesita un proyecto sin conexión, el Coordinador propone la conexión por su cuenta.

| Modo (ficha del Coordinador) | `#0`–`#1` | `#2` | `#3`–`#4` | Conexiones |
|---|---|---|---|---|
| **Manual** (por defecto) | Espera **Enviar** | Espera **Enviar** | Llega a su proyecto como propuesta | Ver abajo |
| **Híbrido** | Sale sola dentro del contrato | Espera **Enviar** | Llega a su proyecto como propuesta | Ver abajo |
| **Automático** | Sale sola dentro del contrato | Sale sola dentro del contrato | Llega a su proyecto como propuesta | Ver abajo |

| Regla | Dónde se cumple |
|---|---|
| Solo el Coordinador ordena, y solo en respuesta a un mensaje que escribiste en su proyecto; nunca en respuesta a una pregunta traída de otro proyecto | El módulo, en el proyecto del Coordinador |
| Una conexión que solo lee, sin órdenes, la firma el Coordinador al proponerla, por 7 días como máximo; la fila dice «Firmado por el Coordinador» y trae **Revocar**. En la ficha, «Conexiones de lectura: you» te las deja todas a ti. Una conexión con órdenes, que deja editar, la firmas siempre tú: **Firmar** en su fila, con el nombre del proyecto que recibiría órdenes. Firmada, las órdenes del plan que la esperaban se liberan | El contrato (`src/enlaces.mjs`) y la misma firma que la hoja de Inicio |
| Una orden llega hasta el modo que firmó el contrato y nunca pasa de `#2`. `#3` y `#4` llegan a su proyecto como tarjeta **Desbloquear y enviar**, que la escribe en la caja; al enviarla, el proyecto pide la llave de siempre. Inicio la muestra como «te espera» | El proyecto que recibe |
| Una orden a la vez por proyecto; nunca interrumpe a un proyecto que está trabajando; tope de órdenes por hora del contrato, contado aparte de las lecturas | El proyecto que recibe |
| Lo que sale solo, sale una vez: si no puede, queda retenido con su motivo y espera tu botón. Una orden que falla o un DETENER TODO en el proyecto del Coordinador detienen el envío automático del plan | El módulo, en el proyecto del Coordinador |
| El proyecto ordenado responde en su conversación («del Coordinador · orden n de m») y no puede armar un plan ni dar órdenes. Una orden en curso se detiene desde su fila | El núcleo: la orden corre a profundidad 1 y sin plan |
| La respuesta vuelve a la conversación del plan como tarjeta (≤ 1200 caracteres, empieza con el proyecto y el agente) y no arranca ningún turno; una línea cierra el plan | El proyecto del Coordinador |
| Una orden o una pregunta traída por el Coordinador no es palabra tuya: no entra al dataset de entrenamiento | `src/dataset.mjs` |

**Levantar al Coordinador desde cualquier proyecto:** `/bishop ¿qué decidió gumball sobre los pagos?`. Si el proyecto del Coordinador duerme, lo despierta; la pregunta corre allí, con lo que el Coordinador sabe de los proyectos conectados, y la respuesta vuelve al proyecto donde preguntaste como una tarjeta **solo para ti**: los agentes de ese proyecto no la leen, porque leer otro proyecto es lo que hace una conexión.

| Ruta | Qué | Quién |
|---|---|---|
| `POST /api/x/bishop/send` · `skip` · `propose` · `stop` · `link` | Enviar, saltar, llevar una propuesta a su proyecto, detener una orden en curso, firmar una conexión propuesta; el servidor actúa sobre lo que registró, nunca sobre lo que dice la página | La página del proyecto del Coordinador |
| `POST /api/x/bishop/order` · `proposal` · `halt` | Una orden, una propuesta `#3`/`#4` o un alto que llegan al proyecto al que van; el proyecto revisa llave, contrato, origen, modo, agente, ocupación y tope | El proyecto del Coordinador, con la llave del canal |
| `POST /api/x/bishop/result` · `consult` | La respuesta a una orden, y una pregunta de `/bishop` | El proyecto que obedeció o que preguntó, con la llave |
| `POST /api/x/bishop/answer` | La respuesta a `/bishop`, como `bishop.answer` | El proyecto del Coordinador, con la llave |

Los planes viven en `bishop-plans.json` junto al registro del proyecto del Coordinador (los últimos 40) y cada orden recibida se cuenta en `enlaces.jsonl` del proyecto que la recibió.

---

## LO QUE SALE DE LA MÁQUINA

- **Sin nube ni cuenta.** MADRE no tiene cuenta ni backend que guarde lo tuyo. No guarda credenciales de proveedores.
- **Lo que un agente lee, viaja a su proveedor.** Codex a OpenAI, Claude Code a Anthropic, Gemini CLI a Google, OpenCode a quien tenga configurado. Si `OPENAI_BASE_URL` o `ANTHROPIC_BASE_URL` cambia ese destino, MADRE enseña solo el hostname y bloquea el turno antes de armar el briefing; un gateway verificado se autoriza por agente con `PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS`. Aplican la cuenta, los límites y los términos del destino efectivo. `@madre` y el archivista con Ollama no salen de la máquina.
- **Un aviso diario de que sigue en uso, siempre encendido.** Una vez al día cada copia le dice a madre.run que está en uso: un identificador al azar que la copia creó para sí (`~/.pulse/install-id`), la versión de MADRE, el sistema y la versión mayor de Node. Nada más: ni nombre, ni correo, ni proyecto, ni rutas, ni agentes, ni nada de lo que se dice en un proyecto; madre.run no guarda la IP. Es la forma en que el autor sabe cuántas personas usan MADRE, qué versiones corren y si regresan. Sale por el mismo registro que todo lo demás, así que aparece en «Lo que se envía». Sin red, falla en silencio. (`src/heartbeat.mjs`)
- **Dos envíos propios bajo tu interruptor.** El sentinel, apagado por defecto, envía reportes redactados al colector del proyecto. El canal de liberación, encendido por defecto, pregunta a npm por la última versión: viaja el nombre del paquete, nada más, la misma petición que hace `npx`. `PULSE_UPDATE_CHECK=0` lo apaga.
- **Escritura.** En `#1` nadie escribe. En `#2` solo se añade: lo que existía se restaura al terminar el turno. En `#3` todo el proyecto salvo las zonas prohibidas, con punto de restauración y `DESHACER`. En un proyecto sin git, MADRE guarda sus fotografías en un repositorio sombra fuera del proyecto. Un comando que pide un agente lo corres tú, con punto de restauración antes y `DESHACER` después.
- **Memoria.** Todo lo dicho fuera de INCÓGNITO queda en `~/.pulse/rooms/<sala>/` y vuelve a los prompts de todos los agentes de ese proyecto. INCÓGNITO es la salida para lo que no debe recordarse; PRIVACY, para los nombres que nunca deben aparecer.

---

## REFERENCIA

**`~/.pulse/config.json`**, o `PULSE_HOME/config.json`. Lo escribe Diagnóstico; las variables de entorno mandan al siguiente arranque.

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
| `PULSE_HOME` | `~/.pulse` | Raíz de los proyectos y del config |
| `PULSE_LANGUAGE` | del config, si no `es` | `es` o `en`; manda sobre el config y sobre lo que el navegador recuerde |
| `PULSE_SOFT_TOKEN_BUDGET` | `500000` | Presupuesto local de tokens por agente, ventana rodante de 5 h |
| `PULSE_CONTEXT_MAX_CHARS` | `16000` | Ventana de transcript inyectada |
| `PULSE_RECALL_SHARE` | `0.3` | Parte de la ventana para la memoria recordada (`0` la apaga) |
| `PULSE_DISTILL` · `_EVERY` · `_IDLE_MS` · `_MAX_CHARS` · `_AGENT` · `_MODEL` | `1` · `10` · `600000` · `6000` · — · — | Destilación de notas |
| `PULSE_EMBED` · `PULSE_EMBED_PROVIDER` | `1` · `auto` | Búsqueda inteligente; `ollama`, `gemini`, `auto` |
| `PULSE_OLLAMA` · `_HOST` · `_MODEL` · `_EMBED_MODEL` | `1` · `http://127.0.0.1:11434` · el mejor · el mejor | Ollama |
| `PULSE_MEMORY_TOOLS` | `1` | Servidor MCP `pulse-memory` en cada turno |
| `PULSE_PRIVATE_TERMS` · `PULSE_PRIVATE_MARKER` | — · `[ENTIDAD-ORG]` | Datos ocultos extra y su marcador |
| `PULSE_UPDATE_CHECK` | `1` | `0` apaga la consulta diaria a npm |
| `PULSE_GH` | `1` | `0` hace que el módulo GitHub ignore la sesión de `gh` y entre solo con el token que pegaste |
| `PULSE_REPORT_URL` · `PULSE_AUTO_REPORT` | colector del proyecto · `0` | Sentinel |
| `PULSE_AGENT_TIMEOUT_MS` · `PULSE_<AGENTE>_TIMEOUT_MS` | `180000` · — | Timeouts |
| `PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS` | — | Lista separada por comas (`codex`, `claude`) de gateways que el humano verificó y permite; sin ella, una dirección base no oficial se bloquea |
| `PULSE_MAX_MESSAGE_CHARS` | `20000` | Tamaño máximo de un mensaje |
| `PULSE_DELEGATION` · `PULSE_MAX_PLAN_STEPS` | `1` · `4` | Planes |
| `PULSE_ESCALATION_MS` | `180000` | Cronómetro de la solicitud de permiso |
| `PULSE_OPENCODE_MODEL` | del config | `proveedor/modelo` para OpenCode |
| `PULSE_CLAUDE_USAGE` · `PULSE_OFFICIAL_QUOTA` | `0` · `1` | Cuota oficial de Claude (lee el llavero); `0` apaga todas las lecturas de proveedor |
| `PULSE_GEMINI_IDLE_MS` · `PULSE_GEMINI_RETRIES` · `PULSE_GEMINI_FALLBACK_MODEL` | `90000` · `1` · `gemini-2.5-flash` | Gemini bajo carga |

Cómo funcionan por dentro el ledger, el stream, la memoria, los adaptadores y la recuperación: [`docs/INTERNALS.md`](INTERNALS.md).

---
