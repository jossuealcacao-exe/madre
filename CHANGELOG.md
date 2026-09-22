# Changelog

Todas las versiones publicadas de `@jossuealcala/madre`. Fechas en ISO.

Una versión se cierra cuando está en npm: hasta entonces su sección se llama **Sin publicar** y puede crecer. Cada versión publicada tiene exactamente una etiqueta `vX.Y.Z`, una release en GitHub y una sección aquí; el parche puede llegar a dos dígitos (`0.2.10`) antes de subir el menor. Ver `docs/ROADMAP.md` para el criterio de qué sube cada número.

## 0.4.0 · Sin publicar

### NOSTROMO: la sala se ve viva
- El núcleo de MADRE es una estrella: grande, oscura e imponente. Se alumbra sola, así que no tiene lado de día ni lado de noche, y no está encendida de par en par: arde hondo y se apaga casi por completo en el borde. Lo que la hace temible no es cuánto brilla sino cuánto de ella está casi apagado.
- Su superficie es roca fundida moviéndose despacio. La piel se construye una sola vez como una tira de celdas hirviendo y se envuelve alrededor del cuerpo; una segunda pasada de la misma tira corre a otro ritmo, y ese desacuerdo entre las dos es lo que se lee como flujo. Encima, masas de materia fundida cruzan la cara al paso de la lava, cada una con su propia deriva.
- Ya no hay halo. Una nube suave alrededor de una estrella la hace ver más chica, no más grande. Lo que la rodea es oscuridad, con una sola piel de luz feroz agarrada al limbo que se apaga en una fracción de radio, y más allá una mancha roja tan tenue que se lee como oscuridad encendida.
- Cuatro prominencias, grandes y lentas: arcos de materia arrancados del limbo que se levantan y vuelven a caer. Una estrella de este tamaño no parpadea, se levanta.
- Se fue el filamento oscuro que cruzaba la cara. Una línea dibujada sobre una bola se lee como una línea dibujada sobre un disco, por más que se curve.

- Los recuerdos que la sala usa reciben más pulsos. La actividad se mide de verdad: cuántas veces se recuperó ese recuerdo en un turno, hace cuánto fue la última, y cuántos temas comparte con otros. Un recuerdo que nadie pide casi no se enciende.
- La constelación se lee contra sí misma: el recuerdo más activo es el más brillante y los demás se escalan debajo. Una sala recién abierta, donde todavía no se ha recuperado nada, se sostiene con los vínculos que ya tejió; en cuanto los turnos empiezan a pedir recuerdos, el uso manda.
- También hay pulsos entre recuerdos vinculados, sin pasar por el centro: dos notas que comparten un tema se hablan directo. Lo que se ve es la red que la sala fue tejiendo, no un abanico de radios.
- Los recuerdos se dibujan 20% más chicos. Quedan como lunas alrededor del cuerpo de MADRE en vez de competirle, y como la separación entre ellos no se encogió, la constelación abre más aire.
- Cada recuerdo es una esfera iluminada desde MADRE. La luz de la sala sale toda del mismo lugar, así que cada uno tiene su propio terminador y su lado oscuro. Nada se traza encima: ni bandas cruzando la cara ni un arco brillante de un lado, que se leían como una ceja sobre un disco. La forma la hace la sombra, y nada más.
- Y cada uno respira a su propio ritmo: una micro pulsación, lo bastante chica para no leerse nunca como un destello y nunca al compás de sus vecinos.
- La tarjeta de cada recuerdo dice cuántas veces se ha recuperado y cuándo fue la última, y el encabezado cuenta cuántos están vivos.
- Misma imagen, menos máquina: la vista dejó de recalcular la constelación en cada cuadro y de pedir desenfoques al navegador. Un archivo con cuatrocientos recuerdos cuesta los mismos desenfoques que uno con doce, y son diez por cuadro en vez de noventa.
- Con movimiento reducido el halo se queda quieto: las gotas dejan de subir y de derivar, y la sala sigue dibujándose completa.

### El puente: alta completa sin terminal
- Las partes que asumían un sistema tipo Unix dejaron de asumirlo: la detección reconoce las extensiones ejecutables de Windows, los instaladores se lanzan con el intérprete que toca y el reinicio usa el de cada sistema.
- El agente local también se atiende desde el puente. Ollama no es un paquete de npm, así que la tarjeta ofrece el paso que toca según el sistema y con el comando a la vista: instalarlo, despertarlo, o descargar el modelo con el que responderá. Donde MADRE no tiene forma honesta de instalarlo, entrega la descarga en vez de inventar un comando. Es el único camino sin cuenta ni tarjeta, y el que enciende la memoria local.
- Si `npm install -g` choca con las carpetas del sistema, MADRE no pide contraseña: lo dice, instala en una carpeta suya (`~/.pulse/tools`) y busca ahí además de en el `PATH`. El aviso final dice dónde quedó.
- Gemini y OpenCode, que se firman desde su propio prompt, aceptan ahora su llave en el puente y en `⚙ CONNECTIONS`. MADRE la escribe donde ese CLI la busca, con el archivo cerrado a su dueño, y no guarda copia: ni en `config.json`, ni en el registro de la sala, ni en un log. Lo único que la sala recuerda es que se puso una llave y para qué proveedor. Solo se acepta desde esta computadora, nunca por red.
- Cada escritura se verifica en el acto preguntándole al propio CLI si ya está firmado; si dice que no, MADRE devuelve los archivos como estaban y lo explica, en lugar de dejar una credencial a medias.
- Cada tarjeta dice qué hay detrás de esa puerta: con qué cuenta se firma ese agente y si hay una entrada sin pagar, con una marca `FREE WAY IN` donde la hay. La misma línea aparece en `⚙ CONNECTIONS`.
- El puente se puede volver a abrir en cualquier momento desde `⚑ CREW`, en la cabecera de MU/TH/UR, para sumar otro agente sin salir de la sala.
- Correr el comando otra vez sobre un proyecto que ya tiene sala abierta deja de levantar una segunda: MADRE reconoce la que ya está escuchando y te lleva a ella.
- La sala vacía deja de ser una página en blanco: tres primeras frases, escritas con el nombre del proyecto, que llenan el campo de texto al tocarlas.
- `madre start` ya no secuestra el arranque: la sala abre siempre, con agentes o sin ellos, y el asistente de terminal queda para quien lo pida (`madre setup`, o `madre start --setup`).
- Sin nadie en línea, la sala abre en el PUENTE: una tarjeta por agente con su estado real y la única acción que le toca. `INSTALL` corre el comando en tu máquina, a la vista y transmitido línea a línea a esa misma tarjeta; `SIGN IN` lanza el login del propio CLI para Codex y Claude Code, con su enlace; Gemini y OpenCode muestran el comando de su prompt. Los mismos botones viven ahora en `⚙ CONNECTIONS`.
- La sala vuelve a buscar los binarios cuando termina una instalación y cuando pulsas `RECHECK`: un CLI instalado desde la UX aparece en la fila sin reiniciar, y las páginas abiertas se enteran con `agents.updated`. El compositor se desbloquea solo en cuanto un agente queda listo.

### Primer contacto y la puerta para desarrollar
- La sala se construye a sí misma: en `#2` o más, un agente que escribe `<id>.module.mjs` en su borrador hace aparecer una tarjeta `module · @codex wrote …` con `INSTALL FOR EVERY ROOM` e `INSTALL FOR THIS PROJECT`. MADRE valida el archivo en una copia y lo copia a la carpeta elegida; los agentes nunca escriben ahí. Los módulos tuyos llevan la etiqueta `DEV` y se quitan con `REMOVE`; los integrados solo se apagan. Rutas de módulos externos solo bajo `/api/x/<id>/`, para que ninguno suplante una ruta del núcleo.
- Un recorrido de cuatro pasos la primera vez que se abre la sala: la sala y sus agentes, los modos, la memoria, MU/TH/UR y MODULES. Se puede saltar y vuelve desde un `?` discreto en la cabecera de MU/TH/UR.
- Módulos de terceros de verdad: un archivo `.mjs` con `export default { … }` en `~/.pulse/modules/` (todas las salas) o en `<proyecto>/.madre/modules/` (ese proyecto) aparece en MODULES con su interruptor, sin build ni registro; `RELOAD MODULES` lo recarga sin reiniciar y muestra el error exacto si no carga. Los agentes no pueden escribir en esas carpetas. El SDK gana `slash` (comandos `/nombre` que corren con el `ctx` del módulo y caen en la sala como tarjeta), `@jossuealcala/madre/sdk` como export del paquete, la guía `docs/SDK.md` y `docs/sdk/hello-module.mjs`, un módulo completo para copiar o darle a una IA.
- MODULES tiene la tarjeta `</>` "Would you like to develop for MADRE?" con las carpetas, la guía y RELOAD.

## 0.3.3 · 2026-09-19

### El SDK entrega herramientas a los turnos, y PLAYWRIGHT es el primero en usarlo
- `defineModule` acepta `toolsForTurn(ctx, turn)`: un módulo encendido devuelve servidores MCP (`name, command, args, env, tools, brief`) y MADRE los adjunta a la CLI de ese turno, en su corrida aislada, en Codex, Claude Code, Gemini CLI y OpenCode, y se los describe al agente en el briefing. Un módulo que falla no entrega nada y nunca rompe el turno. Image Studio y la memoria conservan su cableado propio; los módulos nuevos nacen sobre el gancho.
- Módulo **PLAYWRIGHT**: un navegador headless por turno, `@playwright/mcp` aislado, con orígenes permitidos solo en la dirección de esta MADRE. Los agentes abren la vista previa de RIPLEY, hacen clic, leen consola y red y guardan capturas en la carpeta de borrador del turno. Requiere `npm install -g @playwright/mcp` y un navegador de Playwright; el módulo lo detecta y lo dice. Apagado en GHOST.
- Git Pulse gana la mano del humano: `/git commit "mensaje"` confirma todo el árbol en local, y `/git push` muestra qué saldría y solo envía con `/git push confirm`. Ningún agente puede escribir esos comandos por ti; los comandos corren en el servidor con tu propia sesión de git.

### #4 AIRLOCK: la compuerta
- Un cuarto modo, pedido desde una sala real por un agente que no podía desplegar en `#2`. AIRLOCK es CONTROL más comandos: pruebas, builds, `git commit` y `git push`, deploys con las CLIs y las sesiones que ya viven en la máquina. Los archivos siguen bajo checkpoint y `UNDO`; lo que sale de la nave no vuelve, y por eso la anulación pide dos llaves: la designación del proyecto y la palabra `AIRLOCK`. Un titular a la vez, como CONTROL.
- Cada CLI recibe su herramienta de comandos solo en `#4`: Codex `--sandbox danger-full-access`, Claude Code `Bash`, Gemini `run_shell_command`, OpenCode `bash`. Las zonas prohibidas siguen bloqueadas. El briefing exige decir en una línea qué va a salir y adónde antes de que salga, y cerrar con los comandos corridos y lo que dejó la máquina.
- `MAX MODE` llega a `#4` en CONNECTIONS; un orquestador en `#4` puede dar `#4` a un paso (`@opencode #4: despliega a preview`). Color propio, hielo, en chip, campo, menú y badges. MU/TH/UR reconoce "modo producción" y "permiso para ejecutar comandos" como peticiones de `#4`.

### Canal de liberación, un clic
- `RESTART WITH x.y.z` en MU/TH/UR: la sala registra `room.updating`, cierra su puerto, instala la versión según cómo corre esta copia (npx, dependencia del proyecto o global) y vuelve a abrir en la misma dirección; la página espera y se recarga sola. Con agentes trabajando se niega hasta que terminen. Desde el código fuente sigue siendo `git pull`.
- La primera vez que aparece una versión nueva en la sesión, un aviso de MU/TH/UR lo dice; la alerta de la barra deja de brillar y respirar: línea ámbar fina, relleno suave, transiciones de 220 ms. Todos los controles de MADRE cambian de color con la misma curva; nada salta.

## 0.3.2 · 2026-09-19

### Modos y permisos, una sola lógica
- `#2 CREATE` ya no encierra al agente en `.pulse/out/`: crea archivos y carpetas nuevos donde corresponda en el proyecto, según sus convenciones, con `.pulse/out/<turno>/` como borrador. MADRE fotografía el proyecto antes del turno; lo que apareció se conserva y se muestra como artefacto, y todo archivo previo modificado, renombrado o borrado se restaura y se avisa (`create.reverted`). Las CLIs reciben sus herramientas de escritura sobre el proyecto (Claude Code y OpenCode solo escriben si también pueden editar, verificado con los CLIs reales); la garantía de "solo añadir" la da la restauración de MADRE al terminar.
- Un orquestador puede pedir el modo de cada paso de su plan: `@codex #2: …`, `@claude #3: …`. MADRE lo acota al modo del mensaje del humano y al `MAX MODE` del agente. Bajo `#3` la palabra del orquestador basta: un paso `#2` recibe su lease de proyecto y un paso `#3` toma CONTROL para su turno, con checkpoint propio. Bajo `#1` un paso `#2` sigue pasando por la escalación.
- CONNECTIONS se reduce a dos controles por agente, `MAX MODE` y `DEFAULT MODE` (`#1` o `#2`), más dos habilidades, imágenes y web. Los interruptores `CREATE FILES` y `ALWAYS · STANDING LEASE` desaparecen; las configuraciones viejas (`write: false`, `alwaysCreate`) se siguen leyendo como `MAX MODE #1` y `DEFAULT MODE #2`.
- Los checkpoints funcionan en proyectos sin git: MADRE usa un repositorio sombra propio fuera del proyecto, así `#2` y `#3` tienen la misma reversibilidad en cualquier carpeta.

### Permisos que sí se cumplen
- OpenCode nunca había podido escribir en CREATE ni en CONTROL: sus reglas de permiso se comparan con rutas relativas al proyecto, no absolutas, y crear un archivo es la herramienta `write`, distinta de `edit`. Verificado contra opencode 1.18.4 con proyectos reales, con y sin espacios en la ruta. Ahora CREATE permite `write` y `edit` solo dentro de la carpeta del turno, y CONTROL permite todo el proyecto menos `.git/`, `.pulse/`, `.madre/`, los `.env` y `.claude/settings.local.json`.
- El checkpoint de CONTROL fotografía también los repositorios git anidados dentro del proyecto (un monorepo de sitios, cada uno con su `.git`): antes un cambio dentro de uno de ellos era invisible, la sala decía "no cambió nada" y UNDO no lo deshacía. Ahora la lista de cambios, las zonas prohibidas y UNDO cubren cada repositorio, con rutas relativas al proyecto. La fotografía se toma con `ls-files` y no con `add`, así un repo anidado sin commits ya no la rompe.


## 0.3.1 · 2026-09-19

### Canal de liberación: la sala avisa cuando hay versión nueva
- MADRE consulta en npm la versión `latest` una vez al día (`~/.pulse/updates.json` como caché, compartida por todas las salas). Viaja el nombre del paquete y nada más, la misma petición que hace `npx`. Encendido por defecto; se apaga en MU/TH/UR → RELEASE CHANNEL o con `PULSE_UPDATE_CHECK=0`.
- Si hay versión nueva, una alerta ámbar en la barra, del mismo corte que STOP ALL, lo dice y MU/TH/UR muestra el comando exacto según cómo corre esta copia (npx, dependencia del proyecto, global o fuente), con botón de copiar y enlace a lo que trae la release. MADRE nunca se actualiza sola mientras trabajas. `madre doctor` imprime la misma línea. Los usuarios de 0.3.0 no reciben aviso: el canal nace aquí.

### Documentación
- README reescrito y reordenado: arranque, la sala, modos, qué puede cada agente, delegación, memoria, MADRE AI, MU/TH/UR, módulos, lo que sale de la máquina y referencia. Corrige lo que no coincidía: cinco agentes, imágenes con los cuatro CLIs (Codex nativo, los demás con Image Studio), versión actual. La profundidad técnica pasa a `docs/INTERNALS.md`, que también viaja en el paquete.

### Consola
- Elegir una condición desde el registro despliega la lista de condiciones conocidas aunque estuviera plegada, y lleva al remedio elegido.
- MU/TH/UR respira: cada bloque de una pantalla (CONNECTIONS, MEMORY, PRIVACY, SENTINEL, RELEASE CHANNEL) empieza con 40 px de aire y una línea tenue sobre su título.
- La barra es más ancha que el hilo: la raíz del proyecto se lee completa junto a MADRE, STOP ALL va en una línea. En MU/TH/UR la lista de condiciones conocidas se colapsa como la de condiciones registradas, y RELEASE CHANNEL viste como el resto del panel.

### Dataset limpio y valoraciones (hacia MADRE AI)
- El dataset ya no incluye las respuestas de `@madre` ni las enlatadas de MADRE, y sí incluye los pasos delegados agente→agente con su instrucción como pregunta (`kind: delegated`). En una sala real el corpus pasó de 88 a 118 pares sin escribir una línea más.
- Cada respuesta tiene dos botones nuevos junto a copiar y responder: bien y mal. Se guardan en el ledger como `message.rated`; el dataset excluye lo marcado mal y cuenta lo marcado bien. Un clic saca del corpus una alucinación.
- MEMORY muestra el contador en vivo "pares limpios / 300", con turnos, delegados, notas y valoraciones, sin exportar nada; y una tarjeta TRAIN con los cuatro comandos de la receta ya rellenados con la carpeta de la sala, el modelo base que cabe en esta máquina y el nombre `madre-<proyecto>` que `@madre` tomará al aparecer en Ollama. `docs/training/` viaja ahora en el paquete de npm.
- Cuando `@madre` corre el modelo entrenado del proyecto, el briefing de las CLIs lo dice y les pide preguntarle a él antes de gastar tokens propios en "qué decidimos" o "dónde quedamos".

### PRIVACY: términos que nunca viajan por la sala (ERROR-001)
- Una CLI corre con su propio contexto privado (instrucciones de organización, la cuenta con la que está firmada, CLAUDE.md de otras carpetas) y puede confundirlo con contexto compartido: en una sala real Claude escribió el nombre de la organización del humano, que nunca se había dicho en la sala, y de ahí pasó al ledger, al archivista y al dataset candidato. Cuatro saltos sin control.
- Nueva sección `⚙ CONNECTIONS → PRIVACY`: términos privados, uno por línea, y el marcador que los sustituye (`[ENTIDAD-ORG]` por defecto). MADRE los reemplaza en cada salto: en la respuesta de un agente antes de grabarla (la burbuja lleva una línea "privacy · @agente · n términos"), en el índice, en las notas del archivista y de `memory_note`, y en el dataset exportado. El humano no se reescribe; la sala solo avisa si su mensaje lleva un término. Los términos viven en `config.json` y en `PULSE_PRIVATE_TERMS`; el ledger solo registra cuántos.
- `PURGE ROOM`, tras la designación del proyecto, reescribe lo que la sala ya tiene, incluidos los mensajes del humano: ledger (mismas secuencias, en sitio y atómico), índice y memorias, conservando qué estaba destilado. La sección muestra cuánto queda expuesto antes y después.
- El briefing de toda CLI dice que su configuración es privada y que no traiga a la sala nada que venga de ahí. MU/TH/UR tiene la condición `privacy-leak`.

### @madre sabe quién es y convoca al crew
- Mesa redonda: «@madre, pregúntale al crew …» o «convoca al crew y …» abre un plan escrito por la sala, no por el modelo: un paso por agente CLI en línea con la pregunta del humano y un turno de cierre en el que `@madre` resume con citas `[#n]` sin inventar consenso. Solo el humano convoca; con la delegación apagada `@madre` explica cómo pedirlo.
- Respuestas locales sin modelo: «¿quién eres / qué haces / eres el archivista?» explica que `@madre` y el archivista son el mismo modelo local en dos papeles y cómo se le enseña; «genera / guarda / aprende … memoria» explica que la memoria se destila sola y, si quien pide es un agente, lo manda a `memory_note`; las órdenes de acción de un agente reciben una respuesta para agentes. Preguntas y turnos de cierre siempre llegan al modelo.
- Las respuestas enlatadas de `@madre` se marcan `synthetic`: no entran al archivo ni a la transcripción que `@madre` vuelve a leer, así un modelo pequeño ya no las repite como si fueran suyas. Las CLIs sí las ven.
- El briefing de las CLIs dice explícito que guardar es `memory_note` propio y que a `@madre` solo se le pregunta. El chip `TO @madre` ahora dice "memory · answers & asks the crew · never writes".

## 0.3.0 · 2026-09-18

### Ollama, la inteligencia local (roadmap 2a)
- Nuevo módulo `OLLAMA`: si Ollama corre en la máquina, los embeddings de la memoria se calculan localmente y la destilación la hace primero un modelo local, gratis y sin que nada salga. MODULES muestra servidor, modelos y roles, descarga los recomendados con `PULL` (progreso en la sala) y permite apagar cada rol o el módulo. Sin Ollama, todo sigue igual.
- El archivista local pide JSON estructurado y no cuenta contra ningún presupuesto de proveedor; el reporte `memory.distilled` dice `local`, modelo y tokens.
- Variables: `PULSE_EMBED_PROVIDER`, `PULSE_OLLAMA_HOST`, `PULSE_OLLAMA_MODEL`, `PULSE_OLLAMA_EMBED_MODEL`.

### CONTROL: prevención antes que restauración
- Mientras un agente tiene CONTROL, los `.env`, `.pulse/`, `.madre/` y `.claude/settings.local.json` quedan en solo lectura a nivel de sistema de archivos y recuperan sus permisos al terminar; el aviso lista qué se bloqueó. `.git/` sigue restaurándose desde el checkpoint después del turno.

### Núcleo
- `src/room.mjs` pasa de 1204 a 908 líneas: prompt, contexto, CONTROL, escalación, archivista, vectores, presupuesto, GHOST y adjuntos viven ahora en `src/room/`, cada uno con una responsabilidad. Mismo comportamiento, misma suite.

### Dataset y modelo del proyecto (roadmap 2c)
- `EXPORT DATASET` en MEMORY y `madre dataset` en terminal escriben `train.jsonl` / `valid.jsonl` junto al ledger: los turnos reales de la sala como pares de chat redactados, más las notas destiladas como pares de recuerdo. `docs/training/` trae la receta LoRA con mlx-lm, el `Modelfile` y `train.sh`. Un modelo registrado en Ollama como `madre-<proyecto>` lo toma `@madre` automáticamente.

### @madre, el quinto agente (roadmap 2b)
- Con Ollama y un modelo de chat, `@madre` entra a la sala: responde desde todo el archivo con citas `[#n]`, dice cuando algo nunca se discutió, nunca escribe ni delega, y sus tokens locales no cuentan. Los orquestadores pueden delegarle pasos de verificación. Entra y sale con Ollama (`agents.updated`); interruptor en MODULES → OLLAMA.
- El asistente de terminal y `madre doctor` muestran Ollama junto a las CLIs (servidor, modelo de chat, embeddings) y cuentan a `@madre` como agente en línea: con Ollama corriendo la sala abre aunque ninguna CLI tenga sesión, con el aviso de conectar una para trabajar en archivos.
- `@madre` ya no se confunde de identidad ni promete lo que no hace: la identidad se repite al final del briefing, cada llamada a Ollama pide una ventana de 8k tokens (la de 4k por defecto recortaba el prompt de sistema), las órdenes de acción (convocar, delegar, ejecutar, escribir) se contestan sin llamar al modelo señalando a los agentes CLI, y el chip `TO @madre` dice "memory · answers, does not act". Los modelos de chat generales (`qwen2.5`, `llama3.1`, `gemma3`) van antes que los `-coder`.
- README: seis módulos con OLLAMA y el SDK enlazado a CONTRIBUTING, enlaces absolutos para que npm los resuelva, estado real del adaptador de Claude (MCP de memoria), y bloque "Primeros cinco minutos" con el recorrido completo desde `npx` hasta conectar las IAs desde MU/TH/UR sin volver a la terminal.

### SDK de módulos
- `src/modules/sdk.mjs` con `defineModule`: un módulo es un archivo con sus ajustes en `config.json`, su descripción para MODULES, su interruptor, sus rutas y sus hooks. Los seis módulos (AHP+, Image Studio, Git Pulse, AshCode, RIPLEY, Ollama) viven en `src/modules/`; `extensions.mjs` queda como capa de compatibilidad y el servidor monta las rutas de los módulos de forma genérica.

### Memoria configurable desde MU/TH/UR
- Sección `MEMORY` en CONNECTIONS: archivista preferido, quiénes pueden destilar, cada cuántos intercambios o minutos de reposo, proveedor de embeddings y porcentaje de recall. Se guarda en `config.json` y se aplica en vivo.

## 0.2.3 · 2026-09-18

### RIPLEY navega
- El visor renderiza HTML como un navegador del proyecto: la página se sirve en `/preview/project/<ruta>`, sus scripts corren y sus rutas relativas a CSS, JS, imágenes y fuentes funcionan. El marco sigue sellado: sin origen propio, sin red, sin formularios, sin acceso a MADRE, y solo carga recursos del proyecto a través de MADRE. Antes los scripts estaban bloqueados y una página construida con JavaScript se veía vacía.
- Barra mínima en el visor: atrás y recargar, con la ruta y el título de la página en pantalla. Sin URL editable: RIPLEY es un visor del proyecto, no un navegador general.
- Recarga sola cuando un agente cambia la página abierta o algo de su carpeta, en CONTROL o en un lease.
- Los errores de la página se ven: un puente de una línea dentro del marco reenvía `window.onerror`, promesas rechazadas y recursos que no cargan; el visor los muestra en una franja con `ASK THE ROOM`, que deja el error y el archivo en el compositor.

## 0.2.2 · 2026-09-18

### Corrección crítica
- Claude Code negaba toda escritura en `#2 CREATE` y `#3 CONTROL`: las reglas `Write(/ruta/**)` se leían como relativas al proyecto. Ahora van como `//ruta/**`, la forma absoluta de Claude Code; las zonas prohibidas siguen bloqueadas antes del turno.

Reproducido con el CLI real en un repositorio temporal: con una barra el archivo quedaba bloqueado sin pregunta; con dos se escribe y `.env` sigue bloqueado. Sin otros cambios respecto a 0.2.1.

## 0.2.1 · 2026-09-18 · beta pública

Primera versión pensada para manos ajenas. Requiere Node 22.5 o superior.

### Monitoreo
- Sentinel de errores en MU/TH/UR: los fallos que ninguna condición conocida explica y las caídas del proceso se guardan como reportes redactados (sin rutas, nombres, correos ni claves), con `REPORT ON GITHUB ↗` prellenado y el botón `✎ FEEDBACK`. Con el colector del autor configurado por defecto, cada reporte tiene `SEND` y existe `AUTO-REPORT`, apagado hasta que el humano lo encienda. `docs/report-collector/` trae el Worker que convierte reportes en issues.

### Sala
- Copiar y responder al final de cada respuesta: el primero lleva el texto al portapapeles; el segundo elige qué agente responde y deja la cita al frente del compositor para la directiva del humano.
- Modo claro sin resplandor: la UX conserva sus colores y pierde el brillo de tubo; MU/TH/UR y NOSTROMO mantienen sus pantallas.
- Un archivista que falla se sienta media hora y el siguiente lote lo toma otro agente; la línea de fallo dice una sola frase y guarda el registro completo en el tooltip.
- MADRE no repite el mismo juego de frases dos veces seguidas al tocar su corazón.

### Verdad y seguridad
- La frase de arranque ya no dice que nada sale de la máquina: los agentes hablan con sus proveedores. El README explica el modelo de amenazas en corto, incluida la deuda de CONTROL con Codex (zonas prohibidas revertidas después del turno).
- El reloj de escalación mantiene vivo el proceso mientras un plan espera al humano; el apagado resuelve las peticiones pendientes. En Node 22 esto cortaba la suite a la mitad.

### Proyecto
- CI en GitHub Actions: Ubuntu y macOS, Node 22 y 24, con pruebas, empaquetado e instalación del tarball.
- Plantillas de issues, `SECURITY.md` y `CONTRIBUTING.md`.

## 0.2.0 · 2026-09-17

Requiere Node 22.5 o superior (antes 20): la memoria de la sala corre sobre `node:sqlite`.

### Modos de permiso
- Cuatro modos por mensaje: `#0 GHOST` (fuera del registro), `#1 EXCHANGE` (por defecto), `#2 CREATE` (lease en `.pulse/out/`) y `#3 CONTROL` (el proyecto mismo, con checkpoint de git, lista de cambios, zonas prohibidas revertidas y UNDO). Tope por agente (`MAX MODE`) en CONNECTIONS; `#3` exige el override con la designación del proyecto y se puede subir el tope desde el propio menú.
- Escalación con reloj: un paso de plan que quiere crear archivos pide permiso al humano (GRANT ONCE, GRANT FOR PLAN, DENY; el silencio niega).
- Paleta por modo en el chip, el campo y el botón de envío; GHOST desintegra el campo y lo recompone punteado; CONTROL lo baña con lluvia binaria roja.

### Memoria de la sala
- Todo lo dicho fuera de GHOST se indexa en `memory.sqlite` junto al event log. Cuando la conversación excede la ventana, cada turno recibe además las citas exactas que coinciden con la petición (`<memory>`) dentro del mismo presupuesto (`PULSE_RECALL_SHARE`).
- Destilación: el agente más barato disponible resume los intercambios más recientes en notas durables (decisión, hecho, preferencia, pregunta) cada `PULSE_DISTILL_EVERY` intercambios o en reposo; las notas relevantes entran al prompt como `<memories>`.
- Búsqueda por significado con `gemini-embedding-001` cuando hay clave de Gemini; sin clave, léxica.
- Servidor MCP `pulse-memory` adjunto a cada turno en las cuatro CLIs: `memory_search`, `memory_recall`, `memory_notes`, `memory_timeline`, `memory_note` (guardar a petición del humano; rechazado en GHOST) y `project_state` (AHP+). Un agente que guarda una nota muestra una píldora bajo su burbuja.

### NOSTROMO
- Vista humana del archivo desde MU/TH/UR, detrás de la designación del proyecto. El corazón de MADRE late al centro con venas pulsátiles; cada memoria es un planeta plasmático coloreado por tipo, unido por plasma y agrupado por tema. Arrastrar, zoom, ficha por memoria; la única edición es olvidar.
- CODE000: ocho golpes al corazón en 30 s sellan el archivo diez minutos, bajan una jaula de barrotes, expulsan la consola y la marcan INTRUDER. MADRE avisa a la tripulación por su canal cifrado en `.pulse/mother.env`; si el archivo se borra o altera, lo detecta al arrancar, forja un sello nuevo y se dirige a cada agente disponible.

### Módulos
- RIPLEY: el visor renderiza HTML y SVG en un marco sellado y Markdown en sitio, con `PREVIEW`/`SOURCE`.
- AshCode pasa a llamarse `$ ash_code` en el campo; ORDER 937 queda para MADRE.

### MU/TH/UR
- Catálogo de 36 condiciones con remedios por sistema, también en terminal con `madre doctor --catalog [texto]`.
- Las alertas y avisos del historial ya no se anuncian ni arman STOPALL al recargar.
- Tarjetas de CONNECTIONS con filas fluidas; menús sin ceja superior.

### Estabilidad
- El apagado espera a los despachos que aún leían contexto y cierra el archivo de memoria al final.

## 0.1.0 · 2026-09-15

Primera publicación: sala local para Codex, Claude Code, Gemini CLI y OpenCode sobre un proyecto en solo lectura, handoff durable, centinela de límites, delegación entre agentes, Image Studio, Git Pulse, AHP+ y MU/TH/UR.
