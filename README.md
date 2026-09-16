# PULSE

Una sola sala para conversar con los agentes de IA que ya están instalados en tu computadora, alrededor de un proyecto real.

## Uso

Desde la carpeta de tu proyecto, sin instalar nada:

```bash
npx @jossuealcala/pulse doctor
npx @jossuealcala/pulse start
```

`doctor` muestra qué agentes están listos. `start` abre la sala en el navegador en `http://127.0.0.1:4317`; con `--no-open` solo imprime la URL y con `--project RUTA` apunta a otra carpeta. Requiere Node 20 o superior.

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

## Recuperación operativa

Si PULSE se detiene a mitad de un turno, al arrancar de nuevo detecta los `agent.started` sin cierre y registra un `message.failed` recuperado para cada uno, así la interfaz no queda en "pensando". Al cerrar con Ctrl+C o `SIGTERM`, PULSE interrumpe los procesos de agente en curso, registra esos turnos como fallidos, entrega los eventos pendientes a las páginas abiertas y termina.

Cada agente tiene un timeout de 120 s por defecto. `PULSE_AGENT_TIMEOUT_MS` lo cambia para todos y `PULSE_CLAUDE_TIMEOUT_MS`, `PULSE_CODEX_TIMEOUT_MS`, `PULSE_GEMINI_TIMEOUT_MS` o `PULSE_OPENCODE_TIMEOUT_MS` para uno. Un mensaje de más de 20,000 caracteres (`PULSE_MAX_MESSAGE_CHARS`) se registra y se rechaza sin invocar al agente; el contexto inyectado ya está acotado por `PULSE_CONTEXT_MAX_CHARS`.

## Variables de entorno

| Variable | Predeterminado | Efecto |
|---|---|---|
| `PULSE_HOME` | `~/.pulse` | Raíz de las salas |
| `PULSE_SOFT_TOKEN_BUDGET` | `500000` | Presupuesto local de tokens por agente |
| `PULSE_CONTEXT_MAX_CHARS` | `16000` | Ventana de transcript inyectada |
| `PULSE_MAX_MESSAGE_CHARS` | `20000` | Tamaño máximo de un mensaje |
| `PULSE_AGENT_TIMEOUT_MS` | `120000` | Timeout de invocación para todos los agentes |
| `PULSE_<AGENTE>_TIMEOUT_MS` | — | Timeout para un agente concreto |
| `PULSE_BROADCAST_INTERVAL_MS` | `500` | Sondeo del log para el stream |
| `PULSE_SSE_MAX_BUFFERED_BYTES` | `1048576` | Límite de buffer por cliente SSE |
| `PULSE_QUOTA_POLL_INTERVAL_MS` | `60000` | Sondeo de fuentes oficiales de cuota |
| `PULSE_OPENCODE_MODEL` | — | `proveedor/modelo` para OpenCode |
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
