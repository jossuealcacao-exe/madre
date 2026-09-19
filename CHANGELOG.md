# Changelog

Todas las versiones publicadas de `@jossuealcala/madre`. Fechas en ISO.

Una versión se cierra cuando está en npm: hasta entonces su sección se llama **Sin publicar** y puede crecer. Cada versión publicada tiene exactamente una etiqueta `vX.Y.Z`, una release en GitHub y una sección aquí; el parche puede llegar a dos dígitos (`0.2.10`) antes de subir el menor. Ver `docs/ROADMAP.md` para el criterio de qué sube cada número.

## 0.3.1 · 2026-09-19

### Canal de liberación: la sala avisa cuando hay versión nueva
- MADRE consulta en npm la versión `latest` una vez al día (`~/.pulse/updates.json` como caché, compartida por todas las salas). Viaja el nombre del paquete y nada más, la misma petición que hace `npx`. Encendido por defecto; se apaga en MU/TH/UR → RELEASE CHANNEL o con `PULSE_UPDATE_CHECK=0`.
- Si hay versión nueva, una alerta ámbar en la barra, del mismo corte que STOP ALL, lo dice y MU/TH/UR muestra el comando exacto según cómo corre esta copia (npx, dependencia del proyecto, global o fuente), con botón de copiar y enlace a lo que trae la release. MADRE nunca se actualiza sola mientras trabajas. `madre doctor` imprime la misma línea. Los usuarios de 0.3.0 no reciben aviso: el canal nace aquí.

### Documentación
- README reescrito y reordenado: arranque, la sala, modos, qué puede cada agente, delegación, memoria, MADRE AI, MU/TH/UR, módulos, lo que sale de la máquina y referencia. Corrige lo que no coincidía: cinco agentes, imágenes con los cuatro CLIs (Codex nativo, los demás con Image Studio), versión actual. La profundidad técnica pasa a `docs/INTERNALS.md`, que también viaja en el paquete.

### Consola
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
