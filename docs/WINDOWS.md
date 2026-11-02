# MADRE · WINDOWS · WSL2 desde 1.1.0; nativo, pendiente

Documento único del puerto. Todo lo que se decida, se arregle o se descarte sobre
Windows se anota aquí y en ningún otro lado. Los archivos de contexto de los agentes
(`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) apuntan a este documento, no lo copian.

| | |
|---|---|
| Estado | **WSL2, publicado en 1.1.0** (2026-10-28). Puerto nativo: Fase 0, sin empezar y solo si hay demanda |
| Versión objetivo | WSL2: `1.1.0`. Nativo: sin versión |
| Rama | `windows/1.0` (ver §6; conserva su nombre aunque la versión objetivo pasó a 1.1.0) |
| Origen | Auditoría de código del 2026-09-29 sobre `main` @ `fca8894` (0.5.2) |
| Regla en vigor | Desde 1.1.0 (2026-10-28) se dice **«MADRE funciona en Windows dentro de WSL2»**; nada promete Windows nativo. Abierta en Windows nativo, `bin/madre.mjs` explica cómo llegar a WSL2 y se detiene |

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
| **WIN-028** | Inicio no deja agregar ni crear proyectos: `inside()` compara con `/` y las rutas de Windows usan `\`; además compara mayúsculas sobre un sistema que no las distingue. Toda carpeta da «Solo carpetas dentro de tu carpeta de usuario». Reportado por un usuario el 2026-10-28. Arreglo: comparar con `path.relative`, que sirve en las tres plataformas (`insideFolder`, probado con las reglas de `path.win32`). | `src/salas.mjs:111` | 1 | ARREGLADO |
| **WIN-033** | Instalar en Windows tomaba una hora y terminal: activar WSL, crear el usuario de Ubuntu, Node, zstd y `npx`. Un ingeniero con 15 años de experiencia se rindió (Jossue AI, 2026-10-31), y 46 de las 56 copias de 1.1.0 son de WSL. Arreglo: `installer/windows` (NSIS). Es un `.exe` de doble clic que enciende WSL (`--install --no-distribution`, único paso con permiso de administrador), crea el Linux propio «MADRE» (`--install Ubuntu-24.04 --name MADRE`), corre `inside-setup.sh` como root y deja el lanzador `MADRE.exe`, que no abre ventana. Tras reiniciar, «MADRE» en el escritorio es una copia del instalador que termina (sin `RunOnce`: ver la bitácora del 2026-10-31). | `installer/windows/`, `scripts/windows-installer.mjs` | 1 | HECHO, FALTA PROBAR EN WINDOWS |

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
| **WIN-026** | El catálogo de MU/TH/UR solo tiene `darwin` y `linux`; win32 cae a `linux`. **Cero entradas win32**: `doctor` le da al usuario de Windows comandos `export` y `~/.bashrc`. Avance 2026-10-28 (`ux/refresh`): columnas `wsl` y `win32`; `win32` dice que la versión para Windows llega en la 1.1 y remite a WSL (D-001) antes de los comandos de Linux, y MU-072 «MADRE en Windows» explica cómo instalar WSL. Siguen faltando comandos propios para Windows nativo. | `public/troubleshooting.js:10`, `bin/madre.mjs:108` | 3 | ABIERTO |
| **WIN-027** | El módulo Runs corre el `argv[0]` que pide un agente con `spawn` sin shell. `npm`, `npx` y casi todo lo instalado por npm son shims `.cmd`: el spawn falla con `EINVAL` y la tarjeta dice que el comando no arrancó. No se arregla con `shell: true` (WIN-016): la línea que el humano aprobó dejaría de ser la que corre. Misma salida que WIN-001. | `src/room/runs.mjs` | 1 | ABIERTO |
| **WIN-029** | Ollama no se instala desde MADRE en WSL: su instalador oficial exige `zstd` y un Ubuntu recién puesto no lo trae; sale con «exit 1» y MADRE lo clasifica como fallo desconocido. Visto en el diagnóstico de 1.1.0 (7 copias nuevas en WSL, 20 veces, 2026-10-31). Mientras tanto, sin actualizar MADRE: `sudo apt install -y nodejs zstd` en los pasos de Windows de madre.run y del manual, una entrada en problemas comunes y la guía de Jossue AI. Arreglado en 1.1.1: con apt, la línea instala `zstd` antes del script (también la que se entrega para la terminal) e `installTrouble` lo reconoce (`zstd-missing`). | `src/modules/ollama.mjs:28`, `src/setup-trouble.mjs` | 3 | ARREGLADO |

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
| **D-001** | ¿Windows nativo, o WSL2 declarado como el camino soportado? WSL2 elimina casi toda la sección P1 a cambio de fricción de instalación. | Fase 1 completa | **RESUELTA · WSL2** (2026-10-28). En Windows, MADRE corre dentro de WSL2: por `npx` dentro de WSL2 desde la 1.1.0 y, más adelante, bajo la app de Tauri (1.2.0: ventana en Windows, núcleo en WSL). Windows nativo queda para después y solo si hay demanda real. Motivo: conserva el confinamiento de Linux sin reinventarlo (sección P1) y una sola persona mantiene un solo núcleo. La bienvenida guía la instalación de WSL (`docs/private/BIENVENIDA-1.0.6.md`). |
| **D-002** | Si en Fase 2 resulta que Codex no se puede confinar en Windows nativo: ¿CONTROL degradado y avisado, o Codex fuera de Windows? | Fase 2 → 3 | **ABIERTA** |
| **D-003** | Versión del puerto. Se resolvió como `1.0.0` (excepción consciente: declarar una plataforma nueva es mayor a nivel de producto). El 2026-10-07 cambió: la `1.0.0` se libera con el rediseño de la interfaz, sin declarar soporte ni no-soporte de Windows, y el puerto pasa a `1.1.0`, una menor, porque no rompe el ledger ni la memoria. | Fase 4 | **RESUELTA · 1.1.0** (2026-10-28: la 1.1.0 sale con WSL2; el puerto nativo queda sin versión) |
| **D-004** | ¿`.ahp/` en este repo? `project_state` lo leería y todos los agentes de la sala verían el estado verificado. Requiere el CLI de AHP+ (gestiona instance ids, locks y eventos); no se escribe a mano. | Nada · mejora la difusión | **ABIERTA** |

---

## 5 · Fases y versiones

**Fase 0 · Medir** → cierra en la versión abierta actual (no es función, no abre versión)
`windows-latest` en la matriz de CI. Un reporte de qué cae, y nada más.
Sale de aquí: los ids WIN-0xx que faltan y los que sobran.

**Fase 1 · Que arranque** → `1.1.0-alpha.1`
WIN-001..007 y WIN-016. La sala abre en Windows y los cuatro agentes contestan.
El confinamiento sigue **sin verificar** y así se dice en la interfaz.
Requiere D-001 cerrada.

**Fase 2 · Que confine** → `1.1.0-beta.1`
WIN-010..015, WIN-020..024. Cada uno probado contra el CLI real en una máquina
Windows, no en CI. Es la fase larga y la que decide si hay producto.
Cierra D-002.

**Fase 3 · Que se explique** → `1.1.0-rc.1`
WIN-025, WIN-026. Catálogo de MU/TH/UR con entradas win32 propias, plan de Ollama,
`doctor` hablando de PowerShell y no de `~/.bashrc`.

**Fase 4 · Declarar** → `1.1.0`
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
- `2026-10-03` · Se abre WIN-027 (comandos que el humano corre por un agente, módulo Runs), sobre la misma restricción que WIN-016.
- `2026-10-07` · D-003 cambia: la `1.0.0` es el rediseño de la interfaz y el puerto apunta a `1.1.0`. La rama conserva el nombre `windows/1.0`.
- `2026-10-28` · **D-001 resuelta: WSL2.** Dos casos reales: Juan (Windows nativo, no pudo crear proyectos y terminó en WSL) y Carlos (Linux en una máquina virtual por SSH). La 1.1.0 lleva WSL2 bajo la app de Tauri; Windows nativo, después y solo si hay demanda. Se abre WIN-028 (Inicio no agrega ni crea proyectos: `inside()` en `src/salas.mjs` compara con `/`).
- `2026-10-28` · WIN-028 arreglado en `ux/refresh` (`insideFolder` con `path.relative`; prueba con `path.win32`). Falta verificarlo en un Windows real.
- `2026-10-28` · Diagnóstico con columnas WSL y Windows y doce tarjetas nuevas de la bienvenida (MU-061..072) en `ux/refresh`; un proyecto dentro de WSL lee la columna de WSL. WIN-026 avanza, sigue abierto.
- `2026-10-28` · **1.1.0 publicada con Windows por WSL2** (R-17, R-19). La app de Tauri pasa a la 1.2.0. Abierta en Windows nativo, MADRE explica cómo llegar a WSL2 y se detiene (`bin/madre.mjs`, `test/windows-guard.test.mjs`). La lista de espera recibe un solo correo (madre-landing, `src/waitlist-mail.mjs`).
- `2026-10-31` · Se abre WIN-029 (Ollama no se instala en WSL sin `zstd`), visto en el diagnóstico anónimo de 1.1.0. Se resuelve por fuera, sin publicar versión: madre.run, manual y Jossue AI dicen instalar `zstd` junto con Node.
- `2026-10-31` · **WIN-033: instalador de Windows (1.1.1).** Un `.exe` de doble clic, sin PowerShell ni terminal. Crea un Linux propio de MADRE con su usuario, sin cuenta que crear. `inside-setup.sh` se probó en un Ubuntu 24.04 limpio (Docker) y la CI lo repite. El `.exe` se construye con makensis en macOS y Linux. **Falta probarlo en Windows 10 y 11 reales** (WIN-032): GitHub no corre WSL2. Sin firma de código, Windows muestra «Windows protegió tu PC» la primera vez. La Firma de artefactos de Azure no está disponible para personas en México; queda decidir un certificado OV o esperar. WIN-029 arreglado en código.
- `2026-10-31` · **WIN-033: el instalador, marcado por 4 de 71 antivirus** en VirusTotal (CrowdStrike, Trapmine, SecureAge, Arctic Wolf: todos de aprendizaje automático; Microsoft Defender limpio), con las etiquetas «persistence» y «obfuscated». Se quitan las señales: sin compresión (`SetCompress off`), información de versión completa en el instalador y en `MADRE.exe`, y sin `RunOnce` (tras reiniciar, el acceso «MADRE» abre una copia del instalador). El instalador tiene su propio número (1.0.0) y se guarda en `installer/windows/MADRE-Instalador.exe`: `release.mjs` adjunta siempre ese archivo y ya no lo reconstruye, porque una huella nueva empieza su reputación de cero. Falta la firma de código o la Microsoft Store (MSIX, gratis para personas desde 2025, la firma Microsoft).
- `2026-11-02` · **WIN-033: el instalador pedía reiniciar sin fin** (reporte de una persona en Windows). Decidía «WSL recién encendido» solo porque `wsl --version` fallaba, y ese comando solo responde con el WSL de la Microsoft Store (Windows 10 21H1+ con KB5020030, Windows 11 con KB5019157). En un Windows sin esa actualización, o si se negaba el permiso, cada vuelta pedía reiniciar otra vez. Instalador **1.0.1**: guarda en `HKCU\Software\MADRE\Instalador` cuándo empezó la sesión de Windows en que pidió reiniciar; si Windows ya se reinició y `--version` sigue fallando, dice que falta una actualización y abre `madre.run/windows#actualizar` en lugar de pedir otro reinicio. El permiso negado se dice como tal. El mínimo sube de 19041 (2004) a 19043 (21H1), el más viejo donde corre el WSL de la Store. Huella nueva (`ea6dc059…`): la reputación ante SmartScreen y los antivirus empieza de cero. MADRE no cambia de versión. **Falta probarlo en Windows real.**
