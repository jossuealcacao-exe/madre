# MADRE por dentro

Lo que el README no necesita contar para usar la sala, pero sí quien quiera entenderla, operarla en condiciones raras o escribir un módulo. Cada afirmación aquí corresponde a código en `src/` y tiene prueba en `test/`.

## El ledger

Cada proyecto tiene una sala estable bajo `PULSE_HOME` (por defecto `~/.pulse/rooms/<sala>/`). Su fuente de verdad es `events.jsonl`: un evento por línea, secuencia creciente, append-only para la sala. MADRE reconstruye la ventana de conversación desde ahí aunque se reinicie o se abra desde otro IDE.

Las escrituras se serializan entre procesos locales con un lock en disco, así dos IDEs sobre la misma sala nunca producen secuencias repetidas. La única operación que reescribe el ledger es el purgado de privacidad, bajo el mismo lock, atómica (archivo temporal y rename), conservando secuencias.

Cuando cambia el agente que responde, la sala registra `handoff.created` con origen, destino y el rango de secuencias entregado. El transcript sigue siendo la fuente durable; el proyecto no se toca.

Los errores de un agente se guardan acotados en `message.failed`: una línea de hasta 500 caracteres, sin stack traces, y con los términos privados sustituidos.

## El stream

`/api/events` se alimenta del ledger, no de la memoria del proceso: los eventos que otro proceso MADRE agregue a la misma sala llegan a las páginas abiertas. El sondeo lee solo los bytes nuevos cada 500 ms (`PULSE_BROADCAST_INTERVAL_MS`); un archivo que encoge, tras un purgado, reinicia el offset. Cada frame lleva `id: <secuencia>`, así un cliente que reconecta pide desde donde se quedó. Un cliente que deja de consumir se desconecta al acumular 1 MiB sin drenar (`PULSE_SSE_MAX_BUFFERED_BYTES`). Los eventos GHOST no tienen secuencia: llegan a las páginas abiertas y nunca al ledger.

La ventana de contexto que recibe un agente es de 16 000 caracteres (`PULSE_CONTEXT_MAX_CHARS`); se omiten los mensajes antiguos antes que los recientes. Un mensaje de más de 20 000 caracteres (`PULSE_MAX_MESSAGE_CHARS`) se registra y se rechaza sin invocar al agente.

## La memoria

`memory.sqlite` vive junto al ledger y se deriva de él: si falta o su esquema cambió, se reconstruye desde `events.jsonl`. Contiene:

- `entries` con FTS5 en trigramas: todo mensaje, fallo y tarjeta de comando fuera de GHOST, con su secuencia. Las respuestas enlatadas de MADRE (`synthetic`) no entran.
- `memories` con FTS5: las notas destiladas, tipadas (`decision`, `fact`, `preference`, `question`), con las secuencias que las sustentan, quién las escribió y su origen (`distilled` o `noted`).
- `entry_vectors` y `memory_vectors`: embeddings de 768 dimensiones, calculados en segundo plano y nunca en el camino crítico de un turno.

**Recall.** Cuando el transcript excede la ventana, cada turno recibe además, dentro del mismo presupuesto (`PULSE_RECALL_SHARE`, 30 % por defecto), las notas y los intercambios anteriores que coinciden con la petición. La búsqueda léxica pondera cada término por su rareza en la sala: una ruta o un nombre pesan más que una palabra común. Con vectores, se fusiona con la similitud de coseno.

**Activación en cascada.** Cada recuerdo que entra a un turno deja un renglón con el lote que compartió, así que la sala sabe qué notas llegan juntas. De ahí sale una asociación —Jaccard sobre los turnos donde cada una fue encontrada por la búsqueda misma— y el recall guarda dos huecos para ella: al traer una nota, trae también la que la acompaña, aunque no compartan una sola palabra. Solo votan los turnos donde la búsqueda las encontró por mérito propio, nunca los que la cascada creó, o la red se cerraría sobre sí misma en unos días. La fuerza es un cociente: una pareja que deja de coincidir se apaga sola. Umbral 0.34, mínimo dos coincidencias, y la búsqueda nunca pierde un hueco a manos de la asociación. `PULSE_RECALL_CASCADE=0` o el interruptor en MU/TH/UR la apagan.

**Zonas frías.** Un recuerdo está frío cuando se cumplen tres cosas a la vez: ningún turno lo ha llevado nunca, no comparte tema con ningún otro —así que tampoco se le puede llegar de lado— y el archivo se abrió al menos doce veces desde que se escribió. La tercera es la que importa: nunca-recordado es lo que toda nota es el día que nace; frío es la oportunidad que pasó de largo. Las oportunidades se cuentan en turnos que de verdad entraron al archivo, y solo desde el día en que la sala empezó a llevar el rastro. NOSTROMO los cuenta en su cabecera y los rodea de un anillo tenue cuando se le pide.

**Qué preguntar.** La sala escribe las preguntas cuya respuesta le falta, siempre con las palabras que ya tiene y nunca inventando un tema que nadie levantó. Tres pozos: las preguntas que el archivista registró como abiertas y nadie contestó, los recuerdos fríos —preguntar es la alternativa honesta a tirar algo que nunca tuvo su oportunidad— y la clase de nota de la que el archivo anda corto (decisiones, preferencias, hechos; preguntas no, porque un archivo corto de preguntas no se arregla pidiendo más). Se toman por turnos para que un pozo lleno no sea la lista entera, y dos formas de preguntar lo mismo cuentan como una. Nada se envía: la pregunta va al compositor y la humana decide quién responde.

**Las tres pruebas.** La lectura de madurez cuenta de qué está hecho el archivo; no dice si funciona. Eso lo dice una prueba, y una prueba solo vale si puede fallar. `COVERAGE` toma preguntas reales del historial, corre el recall en el punto exacto en que cada una se hizo y lo compara con la respuesta que de verdad se dio. `CONSISTENCY` mira las contradicciones que EYECAT sigue sosteniendo, lo que quedó fuera de circulación y si las aberraciones se archivan más seguido últimamente o menos. `MATCH` vuelve a hacerle al modelo local preguntas que contestó una CLI de frontera y compara. Ninguna se gasta un turno de proveedor; la tercera corre en segundo plano y se puede detener.

Las tres se miden **contra un control**: dentro de una sala todo habla de los mismos temas, así que a un embedder cualquier par de textos le parece cercano —la primera corrida de COVERAGE dio treinta de treinta—. Para contar, lo que el archivo entregó tiene que ganarle a lo que habría entregado para otra pregunta, por un margen. Cada resultado dice cuántos casos tuvo, con qué midió (significado o palabras), la barra y la media contra el control.

**Destilación.** Cada `PULSE_DISTILL_EVERY` intercambios sin destilar, o tras `PULSE_DISTILL_IDLE_MS` de reposo, el archivista lee un lote acotado por `PULSE_DISTILL_MAX_CHARS`, del más reciente hacia atrás, y escribe hasta cinco notas. El archivista es el más barato permitido en el orden Ollama, Gemini, OpenCode, Codex, Claude; el que falla queda en banca treinta minutos y pasa el siguiente. Una sola llamada por lote, nunca durante un turno. Para los modelos locales se pide JSON estricto.

**Embeddings.** `PULSE_EMBED_PROVIDER=auto` usa Ollama si corre con un modelo de embeddings (`nomic-embed-text`), si no la key de Gemini (`gemini-embedding-001`, la misma key que usa el Gemini CLI, incluida la del llavero de macOS). Lotes de hasta 100 textos por llamada. `PULSE_EMBED=0` deja el recall léxico.

**Herramientas MCP.** Cada turno adjunta a la CLI el servidor `pulse-memory` con configuración aislada por corrida: `memory_search`, `memory_recall`, `memory_notes`, `memory_timeline`, `project_state` y `memory_note`. `memory_note` va firmada por el agente y el mensaje del turno, se rechaza en GHOST y sus notas se marcan `noted`.

**NOSTROMO y CODE000.** El servidor exige la designación del proyecto en `GET /api/memory` y `DELETE /api/memory/:id`. Ocho toques al corazón en treinta segundos sellan el archivo diez minutos (ambas rutas responden 423), expulsan la consola y disparan un mensaje cifrado con AES-256-GCM bajo el sello de la sala (`<proyecto>/.pulse/mother.env`) que todos los agentes en línea reciben decodificado como requester `mother`. Si el sello cambia o desaparece, la sala lo detecta y avisa.

**Privacidad.** Los términos de `config.json` se sustituyen en cuatro puntos: la respuesta del agente antes de grabarla, el índice al insertar, las notas al guardarlas y el dataset al exportarlo. El purgado reescribe ledger, índice y notas conservando secuencias y la marca de destilado. El servidor relee los términos antes de cada mensaje humano, porque `config.json` es compartido por todas las salas de la máquina.

## El centinela de límites

Cada esfera de la barra lleva un anillo. Muestra el límite real del proveedor cuando el CLI lo publica, si no, la ventana local.

- **Codex** escribe en cada rollout de sesión (`~/.codex/sessions`) sus ventanas de cuenta, de 5 horas y semanal, con porcentaje usado y hora de reinicio. MADRE lee el más reciente; no hay red de por medio.
- **Claude Code** publica `/usage` en el endpoint OAuth de Anthropic. Con `PULSE_CLAUDE_USAGE=1`, MADRE lo consulta con el token que Claude Code guarda en el llavero o en `~/.claude/.credentials.json`; el token solo viaja a `api.anthropic.com`, como hace el propio CLI. Es opcional porque implica leer una credencial. `PULSE_OFFICIAL_QUOTA=0` desactiva toda lectura de proveedor.
- **Gemini y OpenCode** no publican nada localmente: su anillo es la ventana local.

La ventana local es un presupuesto blando por agente (500 000 tokens) sobre una ventana rodante de 5 horas; los turnos salen del cómputo al envejecer, las lecturas de caché pesan una décima parte y los tokens de `@madre` pesan cero. Avisa al 80, 90 y 100 % y sugiere otros agentes. Una ventana cuya hora de reinicio ya pasó cuenta como vacía; el monitor relee las fuentes cada minuto y anuncia `limit.cleared` cuando una ventana llena vuelve a la normalidad.

Un lector de cuota implementa `{ id, agent, read() }` y `read()` devuelve `null` o `{ usedPercent, resetAt, windows?, stale? }`. MADRE nunca infiere la cuota del proveedor a partir de tokens locales.

## Los adaptadores

Cada agente corre como proceso en su propio grupo, con un home aislado que solo recibe sus credenciales existentes. Si no responde antes del timeout (180 s por defecto), MADRE termina el árbol completo: SIGTERM y, tras un periodo de gracia, SIGKILL.

- **Codex**: consulta de solo lectura; `-C <carpeta> --sandbox workspace-write` en CREATE; en CONTROL, sandbox de escritura sobre el proyecto. Genera imágenes con `image_generation` usando su cuenta de ChatGPT.
- **Claude Code**: herramientas locales de lectura, sesiones no persistentes, MCP limitado a los servidores de MADRE. En CREATE, `--allowedTools Write(//<carpeta>/**),Edit(//<carpeta>/**)` bajo `dontAsk`: la doble barra es la forma absoluta; con una sola, Claude lee la ruta como relativa al proyecto y niega toda escritura. En CONTROL, escritura permitida en el proyecto y negada en las zonas prohibidas.
- **Gemini CLI**: Plan Mode y una política efímera de solo lectura, ampliada en CREATE con reglas `allow` para `write_file` y `edit` cuyo `file_path` empiece por la carpeta. Corre con un `GEMINI_CLI_HOME` temporal: tokens OAuth y `~/.gemini/.env` sí, hooks, extensiones, servidores MCP y memoria del `~/.gemini` real no. Gemini lee `@algo` como un archivo a incluir, así que MADRE escapa cada mención como `\@nombre` y la desescapa en la respuesta. Bajo 503 o 429, el CLI reintenta con backoff durante minutos y solo escribe en stderr: MADRE lo lee en vivo, corta tras `PULSE_GEMINI_IDLE_MS`, reintenta una vez con `PULSE_GEMINI_FALLBACK_MODEL` y, si tampoco, lo dice con nombre y modelo probado.
- **OpenCode**: permisos efímeros inyectados por corrida, sin tocar la configuración global; `permission.edit` por patrón en CREATE y CONTROL. Si tu configuración no fija modelo, `run` elige el proveedor por defecto, que puede no ser el que tiene sesión: `PULSE_OPENCODE_MODEL=proveedor/modelo` lo fija.
- **@madre**: no es una CLI. Es un adaptador local sobre Ollama que recibe la transcripción reciente, lo que la memoria recuerda de la pregunta y la pregunta; nunca el briefing de las CLIs. Con una ventana de 8 192 tokens, porque la de 4 096 por defecto recorta el prompt de sistema. Lo que puede resolver sin modelo, lo resuelve: identidad, órdenes que no le corresponden, peticiones de guardar memoria y la mesa redonda, que es un plan escrito por la sala con un paso por CLI en línea y su turno de cierre.

Los alcances de imagen de Claude, Gemini y OpenCode se cumplen con **Image Studio**: el servidor MCP `src/mcp/image-server.mjs`, adjunto solo dentro de un lease con el alcance encendido, que genera con la API de imágenes de Gemini y guarda el archivo en la carpeta del turno.

## CREATE por dentro

Un turno en `#2` toma la misma fotografía que CONTROL, sin asiento: varios turnos `#2` pueden correr a la vez. Al terminar, `diff` contra la fotografía: los archivos añadidos se conservan y se registran como `artifacts.created` con su ruta en el proyecto; los modificados, renombrados o borrados se restauran desde la fotografía y se anuncian en `create.reverted`. Las zonas prohibidas se restauran igual que en CONTROL. Cada CLI recibe sus herramientas de escritura sobre el proyecto: Claude Code niega `Write` si `Edit` no está permitido en la misma ruta y OpenCode deja sin herramienta de escritura si `edit` está denegado (ambos verificados con el CLI real), así que en `#2` van juntas y la garantía de "solo añadir" es la restauración posterior, no la regla previa. Gemini recibe solo `write_file`. El `scratchDir` bajo `.pulse/out/` sigue existiendo para lo que no tiene sitio y para Image Studio.

En un plan, el modo de cada paso es el mínimo entre lo que pidió el orquestador (`@agente #n:`), el techo del plan (el modo del mensaje humano) y el `MAX MODE` del agente. Bajo techo `#3`, un paso `#2` recibe un lease de proyecto emitido a nombre del orquestador y un paso `#3` toma CONTROL con su propio checkpoint, uno a la vez. Bajo techo `#1`, un paso `#2` pasa por la escalación al humano.

## CONTROL por dentro

Antes del turno, MADRE fotografía el proyecto como un commit real bajo `refs/madre/checkpoints/` con un índice temporal (en un proyecto sin git, en un repositorio sombra bajo el directorio temporal del sistema, con el proyecto como árbol de trabajo): incluye archivos sin seguimiento, respeta `.gitignore`, no toca tu rama, tu índice ni tu stash, y funciona en repositorios sin commits. Mientras dura el turno, `.env*`, `.pulse/`, `.madre/` y `.claude/settings.local.json` quedan en solo lectura a nivel de sistema de archivos y recuperan sus permisos al terminar. Después, `git diff` contra el checkpoint da la lista de cambios; cualquier escritura en una zona prohibida que hubiera pasado se revierte desde el checkpoint y se nombra. `UNDO` restaura el checkpoint completo.

## Recuperación operativa

Si MADRE se detiene a mitad de un turno, al arrancar detecta los `agent.started` sin cierre y registra un `message.failed` recuperado para cada uno. Al cerrar con Ctrl+C o `SIGTERM`, interrumpe los procesos de agente en curso, registra esos turnos como fallidos, entrega los eventos pendientes a las páginas abiertas y termina. Los planes se ejecutan en secuencia y los delegados no delegan, así que todo plan termina; `STOPALL` corta cualquier cosa en curso.

## Empaquetado y pruebas

`npm test` corre la suite con `PULSE_OLLAMA=0` para no tocar un Ollama real; ninguna prueba llama a un modelo. `npm run pack:check` empaqueta, instala en un directorio vacío y ejecuta el CLI instalado: `--help`, `doctor` y un arranque del servidor que sirve la sala y cierra limpio con `SIGTERM`. `PULSE_TEST_MODE=1` habilita `/api/test/limits` para simular ventanas de cuota.
