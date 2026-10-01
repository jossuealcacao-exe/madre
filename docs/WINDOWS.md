# MADRE · PUERTO A WINDOWS · 1.0

Documento único del puerto. Todo lo que se decida, se arregle o se descarte sobre
Windows se anota aquí y en ningún otro lado. Los archivos de contexto de los agentes
(`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) apuntan a este documento, no lo copian.

| | |
|---|---|
| Estado | **Fase 0 · sin empezar** |
| Versión objetivo | `1.0.0` |
| Rama | `windows/1.0` (ver §6) |
| Origen | Auditoría de código del 2026-09-29 sobre `main` @ `fca8894` (0.5.2) |
| Regla en vigor | Hasta que este documento diga otra cosa, **MADRE no declara soporte ni no-soporte de Windows** |

---

## 1 · Qué es este puerto y qué no

MADRE funciona hoy porque tres mecanismos de POSIX sostienen su promesa central
—«leen por defecto, escriben cuando tú lo dices»—: el bit de escritura del sistema
de archivos, los grupos de proceso, y el sandbox que cada CLI monta sobre seatbelt
o Landlock. **Ninguno de los tres existe igual en Windows.**

Por eso esto no es una compatibilidad de rutas. Es la pregunta de si el techo de
permisos que MADRE promete se puede sostener en Windows, y la respuesta honesta
solo sale de probarlo contra los CLIs reales. Si la respuesta es no, este documento
también sirve para declarar no-soporte con razones, que es un resultado válido.

**Dentro del alcance:** que los cuatro agentes corran, que los modos `#0`–`#4`
signifiquen en Windows lo mismo que en macOS, que MU/TH/UR sepa diagnosticar
Windows, que el checkpoint y UNDO sean fiables.

**Fuera del alcance:** instaladores, empaquetado MSI, soporte de PowerShell como
shell de AIRLOCK más allá de lo que ya hace `cmd`, y cualquier cambio en la
promesa de que nada sale de la máquina.

---

## 2 · Lo que ya está listo

No está en cero. Existe y se verificó por lectura:

| Qué | Dónde |
|---|---|
| Resolución de ejecutables por `PATHEXT`, sin bit de ejecución | `src/runtime-detection.mjs:99-118` |
| `toolsBin` sin `/bin` en win32 | `src/runtime-detection.mjs:136` |
| Spawn de shims `.cmd` con `shell` condicionado | `src/extensions.mjs:32` |
| Abrir el navegador por `cmd /c start` | `src/server.mjs:85-86` |
| Reinicio tras actualizar, por `COMSPEC` | `src/server.mjs:1161-1162` |
| `detached` y `windowsHide` condicionados | `src/adapters/process.mjs:96`, `src/server.mjs:751` |
| Llavero de macOS con respaldo a archivo (degrada bien) | `src/auth-probe.mjs:67`, `src/quota-sources.mjs:102` |
| Plataforma inyectable como parámetro (el patrón correcto a extender) | `src/modules/ollama.mjs:11`, `src/quota-sources.mjs:94` |

---

## 3 · Trazabilidad

Cada hallazgo tiene id permanente. Un id **nunca se reusa ni se renumera**: si algo
se descarta se marca `DESCARTADO` con el motivo, no se borra la fila.

Severidades: **P0** la sala no funciona · **P1** funciona y el confinamiento no
(fallo silencioso) · **P2** error funcional acotado · **L** limitación que no se
arregla con código.

Estados: `ABIERTO` · `EN CURSO` · `ARREGLADO` · `VERIFICADO` (probado en Windows
real, no en CI) · `DESCARTADO`.

### P0 · Bloqueadores

| ID | Síntoma | Dónde | Fase | Estado |
|---|---|---|---|---|
| **WIN-001** | Los cuatro CLIs son shims `.cmd`; Node rechaza su spawn sin `shell` (`EINVAL`, parche de CVE-2024-27980). Se detectan y no se ejecutan. | `src/adapters/process.mjs:87` | 1 | ABIERTO |
| **WIN-002** | Lo mismo al leer la versión del CLI en la detección. | `src/runtime-detection.mjs:125` | 1 | ABIERTO |
| **WIN-003** | Lo mismo en el asistente de instalación. | `src/setup.mjs:116,124` | 1 | ABIERTO |
| **WIN-004** | `new URL(import.meta.url).pathname` da `/C:/…`; `realpath` falla, `invokedDirectly` queda en `false` y el servidor MCP de memoria arranca sin registrar nada. **Se cae la memoria compartida entre agentes.** | `src/mcp/memory-server.mjs:212` | 1 | ABIERTO |
| **WIN-005** | Lo mismo en el servidor MCP de imagen. | `src/mcp/image-server.mjs:195` | 1 | ABIERTO |
| **WIN-006** | Lo mismo en `bin/madre.mjs` (commit en `--version`) y en los scripts de release y empaquetado. | `bin/madre.mjs:90`, `scripts/release.mjs:16`, `scripts/pack-check.mjs:12` | 1 | ABIERTO |
| **WIN-007** | `process.kill(-pid)` no existe en Windows; el `catch` mata solo al lanzador. **STOP ALL, timeout e idle dejan CLIs huérfanos quemando cuota.** | `src/adapters/process.mjs:9` | 1 | ABIERTO |

### P1 · El confinamiento se cae en silencio

| ID | Síntoma | Dónde | Fase | Estado |
|---|---|---|---|---|
| **WIN-010** | La política de Gemini arma `argsPattern` con `${escaped}/`; el CLI reporta rutas con `\`. Ni la regla *allow* ni la *deny* de zonas prohibidas casan. **Hay que probar cuál falla: fail-closed es molesto, fail-open es grave.** | `src/adapters/gemini.mjs:31-59` | 2 | ABIERTO |
| **WIN-011** | `chmod` en Windows solo alterna el bit de solo-lectura y sobre un directorio no impide crear archivos dentro: `.pulse/` y `.madre/` quedan abiertos durante el turno. La prevención desaparece; queda solo la restauración. | `src/room/guard.mjs:44` | 2 | ABIERTO |
| **WIN-012** | `rel === '.claude/settings.local.json'` contra una ruta que llega como `.claude\settings.local.json`: ese archivo **nunca** se bloquea. | `src/room/guard.mjs:29` | 2 | ABIERTO |
| **WIN-013** | Zonas prohibidas evadibles por el sistema de archivos: regex sensibles a mayúsculas sobre FS insensible (`.ENV`, `.Git/config`), flujos alternos de datos (`.env::$DATA`) y nombres 8.3. *La parte de mayúsculas ya aplica hoy en macOS con APFS.* | `src/checkpoint.mjs:21-27` | 2 | ABIERTO |
| **WIN-014** | `0o600` se ignora en Windows salvo el bit de solo-lectura: las llaves de API quedan con la ACL heredada del directorio. **Rompe la regla de credenciales sin avisar.** | `src/credentials.mjs:19,83,114`, `src/config.mjs:24` | 2 | ABIERTO |
| **WIN-015** | El cerco de rutas compara con `startsWith` sensible a mayúsculas sobre FS insensible, y `resolve()` acepta `C:foo` (relativo al volumen) y UNC. | `src/files.mjs:30-38` | 2 | ABIERTO |
| **WIN-016** | **Trampa de diseño, no un bug existente:** «arreglar» WIN-001 con `shell: true` haría que `cmd.exe` reinterprete `&`, `|`, `^` y `%VAR%` dentro del prompt del humano y de las respuestas de los agentes. Un prompt con `& del /s` se ejecuta. La salida es resolver el `.js` detrás del shim y correrlo con `process.execPath`. | (ninguno · restricción sobre WIN-001) | 1 | ABIERTO |

### P2 · Errores funcionales

| ID | Síntoma | Dónde | Fase | Estado |
|---|---|---|---|---|
| **WIN-020** | `--sandbox workspace-write` de Codex es seatbelt/Landlock. En Windows la bandera se acepta y **no confina**. | `src/adapters/codex.mjs:31` | 2 | ABIERTO |
| **WIN-021** | Globs de Claude `Write(//${outDir}/**)`: prefijo `//` de ruta absoluta más `C:\` con backslashes. Verificar si falla el *allow*, el *disallow*, o ambos. | `src/adapters/claude.mjs:37,56` | 2 | ABIERTO |
| **WIN-022** | Shadow repo en `tmpdir()`: el límite de 260 caracteres sin `core.longpaths` rompe proyectos con `node_modules` profundo. | `src/checkpoint.mjs:39` | 2 | ABIERTO |
| **WIN-023** | `core.autocrlf=true` (default de Git for Windows): el checkpoint ve cambios donde no los hay y UNDO reescribe archivos intactos. | `src/checkpoint.mjs` | 2 | ABIERTO |
| **WIN-024** | El lock se libera borrando un directorio; con un archivo abierto Windows devuelve `EPERM`/`EBUSY`. Riesgo de sala bloqueada de forma permanente. | `src/event-store.mjs:100-120` | 2 | ABIERTO |
| **WIN-025** | `ollamaInstallPlan` / `ollamaUpdatePlan` sin rama `win32`: devuelven `undefined` y la tarjeta del módulo revienta. `@madre` local no se instala desde la sala. | `src/modules/ollama.mjs:11-33` | 3 | ABIERTO |
| **WIN-026** | El catálogo de MU/TH/UR solo tiene `darwin` y `linux`; win32 cae a `linux`. **Cero entradas win32**: `doctor` le da al usuario de Windows comandos `export` y `~/.bashrc`. | `public/troubleshooting.js:10`, `bin/madre.mjs:108` | 3 | ABIERTO |

### L · Limitaciones estructurales

| ID | Qué | Consecuencia |
|---|---|---|
| **WIN-030** | Los cuatro CLIs no tienen la misma madurez en Windows; Codex es el caso duro (WIN-020). | O se degrada CONTROL/AIRLOCK de forma explícita en Windows, o se excluye a Codex allí. **Decisión D-002.** |
| **WIN-031** | Sin `chmod`, sin grupos de proceso y sin sandbox del CLI, el checkpoint queda como única red. Restaurar no es prevenir. | La copia del producto no puede prometer en Windows lo que promete en macOS. |
| **WIN-032** | La suite (331+ pruebas) **nunca** se ha ejecutado en Windows: `.github/workflows/ci.yml:15` corre `ubuntu-latest` y `macos-latest`. | Todo lo de arriba es lectura de código. El mapa real sale de la Fase 0. |

---

## 4 · Decisiones abiertas

Ninguna se toma sin el usuario. Hasta que se cierren, las fases posteriores no arrancan.

| ID | Decisión | Bloquea | Estado |
|---|---|---|---|
| **D-001** | ¿Windows nativo, o WSL2 declarado como el camino soportado? WSL2 elimina casi toda la sección P1 a cambio de fricción de instalación. | Fase 1 completa | **ABIERTA** |
| **D-002** | Si en Fase 2 resulta que Codex no se puede confinar en Windows nativo: ¿CONTROL degradado y avisado, o Codex fuera de Windows? | Fase 2 → 3 | **ABIERTA** |
| **D-003** | `1.0.0` como versión del puerto. La regla del repo reserva mayor para cuando el ledger o la memoria dejan de ser legibles, lo que este puerto no hace; declarar una plataforma nueva es mayor a nivel de producto. Queda anotado que es una excepción consciente. | Fase 4 | **RESUELTA · 1.0.0** |
| **D-004** | ¿`.ahp/` en este repo? `project_state` lo leería y todos los agentes de la sala verían el estado verificado. Requiere el CLI de AHP+ (gestiona instance ids, locks y eventos); no se escribe a mano. | Nada · mejora la difusión | **ABIERTA** |

---

## 5 · Fases y versiones

**Fase 0 · Medir** → cierra en la versión abierta actual (no es función, no abre versión)
`windows-latest` en la matriz de CI. Un reporte de qué cae, y nada más.
Sale de aquí: los ids WIN-0xx que faltan y los que sobran.

**Fase 1 · Que arranque** → `1.0.0-alpha.1`
WIN-001..007 y WIN-016. La sala abre en Windows y los cuatro agentes contestan.
El confinamiento sigue **sin verificar** y así se dice en la interfaz.
Requiere D-001 cerrada.

**Fase 2 · Que confine** → `1.0.0-beta.1`
WIN-010..015, WIN-020..024. Cada uno probado contra el CLI real en una máquina
Windows, no en CI. Es la fase larga y la que decide si hay producto.
Cierra D-002.

**Fase 3 · Que se explique** → `1.0.0-rc.1`
WIN-025, WIN-026. Catálogo de MU/TH/UR con entradas win32 propias, plan de Ollama,
`doctor` hablando de PowerShell y no de `~/.bashrc`.

**Fase 4 · Declarar** → `1.0.0`
Se levanta la regla del encabezado. README, sitio y `SECURITY.md` dicen qué soporta
Windows y qué no, con las limitaciones de la sección L escritas sin adornos.

---

## 6 · Rama sí, repo nuevo no

**Recomendación: una rama de larga vida, `windows/1.0`, en este mismo repositorio.**

A favor de la rama:

- El puerto toca `process.mjs`, `guard.mjs`, `checkpoint.mjs`, `files.mjs`, los cuatro
  adaptadores y los dos servidores MCP. Eso **es** el núcleo. En un repo aparte serían
  dos núcleos divergiendo, y cada arreglo de 0.5.x habría que portarlo a mano.
- La disciplina de versiones del repo (una versión se cierra cuando está en npm) solo
  funciona con un historial y un `CHANGELOG.md`.
- El paquete de npm es uno solo. Un repo aparte obliga a un segundo paquete o a un
  merge final igual de grande, sin haber ganado nada en el camino.
- CI, `pack:check` y la suite ya están aquí.

En contra del repo nuevo, además de lo anterior: partiría la trazabilidad justo cuando
el objetivo es lo contrario.

Cómo se trabaja la rama:

- `windows/1.0` sale de `main` y **rebasa sobre `main`**, no al revés, mientras 0.5.x
  siga recibiendo arreglos.
- Cada commit nombra su id: `WIN-004 · los servidores MCP arrancan en Windows`.
- Lo que sirve en las tres plataformas (por ejemplo `fileURLToPath` de WIN-006, o la
  insensibilidad a mayúsculas de WIN-013, que ya afecta a macOS) se hace **en `main`**
  y se rebasa. La rama guarda solo lo que es específico de Windows.
- La rama se fusiona una vez, al cerrar la Fase 4.
- Este documento y los archivos de contexto de los agentes viven en `main` desde el
  primer día, para que cualquier agente en cualquier rama los vea.

---

## 7 · Quién está enterado

| Canal | Archivo | Alcance |
|---|---|---|
| Codex · OpenCode | `AGENTS.md` | Leído nativamente al abrir el proyecto |
| Claude Code | `CLAUDE.md` | Leído nativamente; el adaptador de MADRE lo conserva aun con `--setting-sources ''` (`src/adapters/claude.mjs:57-59`) |
| Gemini CLI | `GEMINI.md` | Leído nativamente |
| `@madre` | este documento | Lo alcanza por RAG sobre los archivos del proyecto |
| Memoria de la sala | — | Se siembra con una nota destilada al abrir la Fase 0 |
| AHP+ | — | Pendiente de **D-004** |

---

## 8 · Bitácora

Una línea por cambio de estado. Se añade al final, nunca se reescribe.

- `2026-09-29` · Auditoría de `main` @ `fca8894`. Se abren WIN-001..032 y D-001..004. Fase 0 sin empezar.
