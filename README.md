# PULSE

Una sola sala para conversar con los agentes de IA que ya están instalados en tu computadora, alrededor de un proyecto real.

## Probar el MVP local

```bash
node ./bin/pulse.mjs doctor
node ./bin/pulse.mjs start --no-open
```

Abre la URL que aparece en la terminal. Selecciona Codex, Claude, Gemini u OpenCode, o escribe una mención como `@claude` seguida de una consulta. Los cuatro adaptadores operan en modo de consulta sin edición del proyecto.

PULSE no instala ni configura proveedores. Detecta los runtimes existentes y mantiene las escrituras del proyecto bajo control del usuario. El contenido que un agente lea puede enviarse al proveedor de modelo configurado en ese agente; aplican su cuenta, límites y términos.

## Handoff durable

Cada proyecto tiene una sala estable bajo `PULSE_HOME` (por defecto `~/.pulse`). PULSE reconstruye una ventana acotada de la conversación desde su event log aunque se reinicie o se abra desde otro IDE. Cuando cambia el agente, registra `handoff.created` con el origen, el destino y el rango de eventos entregado; el transcript sigue siendo la fuente durable y no se modifica el proyecto.

Las escrituras del event log se serializan también entre procesos locales para preservar secuencias únicas si dos IDEs acceden a la misma sala.

La ventana predeterminada es de 16,000 caracteres y puede ajustarse con `PULSE_CONTEXT_MAX_CHARS`. Los mensajes antiguos se omiten antes que los recientes.

## Centinela de límites

Cuando un CLI expone telemetría de tokens por turno, PULSE la registra y la compara con un presupuesto local de la sala. Avisa al 80%, escala a crítico al 90% y marca agotado al 100%, recomendando otro agente que esté listo. El presupuesto predeterminado es de 100,000 tokens y puede ajustarse con `PULSE_SOFT_TOKEN_BUDGET`.

El presupuesto local no es la cuota oficial de la cuenta. PULSE solo mostrará un porcentaje del proveedor cuando exista una fuente fiable para ese dato; nunca lo inferirá a partir de tokens locales. El endpoint `/api/test/limits` sirve para pruebas controladas y solo existe al iniciar con `PULSE_TEST_MODE=1`.

Las fuentes oficiales de cuota se conectan como lectores opcionales y pueden devolver `null` cuando el proveedor no publique el dato. PULSE las consulta periódicamente, conserva cada lectura válida como `quota.updated` y alimenta el centinela con la procedencia `official:<fuente>`. No hay scraping ni conversión de tokens locales a cuota oficial.

Un lector implementa `{ id, agent, read() }`; `read()` devuelve `null` o `{ usedPercent, resetAt }`. Las versiones locales detectadas de Codex y OpenCode no exponen actualmente un comando CLI estable de cuota oficial, por lo que PULSE no activa ningún lector predeterminado. `opencode stats` es estadística local y no se trata como cuota de proveedor.

## Estado de adaptadores

- Codex: consulta de solo lectura habilitada.
- OpenCode: consulta restringida habilitada; PULSE inyecta permisos efímeros y no modifica la configuración global.
- Claude Code: consulta restringida habilitada con Safe Mode, herramientas locales de lectura, MCP desactivado y sesiones no persistentes.
- Gemini CLI: consulta restringida habilitada con Plan Mode y una política efímera que solo permite herramientas locales de lectura. PULSE ejecuta Gemini con un `GEMINI_CLI_HOME` temporal que solo recibe las credenciales existentes (tokens OAuth y `~/.gemini/.env`; una API key guardada en el llavero del sistema funciona sin copia); hooks, extensiones, servidores MCP y memoria del `~/.gemini` real no se cargan. El relanzamiento interno del CLI se desactiva para que el timeout controle el proceso que hace la petición.

Todos los adaptadores corren en su propio grupo de procesos. Si un agente no responde antes del timeout, PULSE termina el árbol completo (SIGTERM y, tras un periodo de gracia, SIGKILL), no solo el lanzador.
