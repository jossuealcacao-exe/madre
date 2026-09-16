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

## Módulos

La sala puede ofrecer integraciones opcionales que se instalan en el proyecto con su propio instalador, no con código de PULSE. El botón `MODULES` de la barra lista los disponibles y su estado en el proyecto actual. Hoy hay uno:

- **AHP+** (`@jossuealcala/ahp-plus`): estado verificado del proyecto, checkpoints y handoffs entre sesiones de IA, guardado en `.ahp/`. PULSE lo detecta por `.ahp/manifest.json` y lo instala con `npx --yes @jossuealcala/ahp-plus@1.4.1 setup . --platforms <agentes detectados>`, pidiendo adaptadores solo para los agentes presentes en la máquina que AHP+ soporta (Codex, Claude, OpenCode).

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
