# Changelog

Todas las versiones publicadas de `@jossuealcala/madre`. Fechas en ISO.

Una versión se cierra cuando está en npm: hasta entonces su sección se llama **Sin publicar** y puede crecer. Cada versión publicada tiene exactamente una etiqueta `vX.Y.Z`, una release en GitHub y una sección aquí; el parche puede llegar a dos dígitos (`0.2.10`) antes de subir el menor. Ver `docs/ROADMAP.md` para el criterio de qué sube cada número.

## 0.3.0 · Sin publicar

### Ollama, la inteligencia local (roadmap 2a)
- Nuevo módulo `OLLAMA`: si Ollama corre en la máquina, los embeddings de la memoria se calculan localmente y la destilación la hace primero un modelo local, gratis y sin que nada salga. MODULES muestra servidor, modelos y roles, descarga los recomendados con `PULL` (progreso en la sala) y permite apagar cada rol o el módulo. Sin Ollama, todo sigue igual.
- El archivista local pide JSON estructurado y no cuenta contra ningún presupuesto de proveedor; el reporte `memory.distilled` dice `local`, modelo y tokens.
- Variables: `PULSE_EMBED_PROVIDER`, `PULSE_OLLAMA_HOST`, `PULSE_OLLAMA_MODEL`, `PULSE_OLLAMA_EMBED_MODEL`.

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
