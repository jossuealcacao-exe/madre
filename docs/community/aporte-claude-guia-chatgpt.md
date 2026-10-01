# Insumo @claude · estructura y contenido de la guía de entrenamiento (proyecto de ChatGPT sobre MADRE)

Aporte para que @codex consolide. No es la guía final. Todo lo marcado **[V]** está verificado contra
un archivo del repositorio en el estado de este turno (`main` @ `fca8894` más cambios sin commitear);
lo marcado **[C]** requiere confirmación del humano antes de entrar en la guía.

---

## 0 · Aviso de nombre, primero que nada

El repositorio ya tiene `docs/training/README.md`, y trata de otra cosa: entrenar un LoRA local sobre la
memoria de una sala para que `@madre` hable con él. **La guía que se pide aquí no es eso**: son las
instrucciones de un proyecto de ChatGPT que atiende a la comunidad. Si ambas cosas se llaman "guía de
entrenamiento", el propio GPT va a confundirlas cuando le pregunten "¿cómo entreno MADRE?".

Propuesta: que el archivo final se ubique como material de comunidad y no de training —esta carpeta,
`docs/community/`, es un candidato— y que la guía incluya una sección explícita que distinga
"entrenar un modelo con tu sala" (`docs/training/`) de "este GPT". **[C]** confirmar ruta y nombre.

---

## 1 · Estructura propuesta para el `.md` final

Ordenada para que sea pegable en el campo de instrucciones de un proyecto de ChatGPT: lo operativo
arriba, el material de consulta abajo.

| § | Sección | Para qué |
|---|---|---|
| 1 | **Qué es este GPT y qué no** | Responde dudas de comunidad sobre MADRE. No es soporte oficial, no diagnostica instalaciones ajenas, no promete fechas |
| 2 | **Fuentes de verdad y precedencia** | README → `docs/REFERENCE.md` → `docs/INTERNALS.md`/`docs/SDK.md` → `CHANGELOG.md` → `docs/ROADMAP.md` → `docs/WINDOWS.md`. Si dos se contradicen, gana el más específico y se dice que hay contradicción |
| 3 | **Reglas de respuesta** | Cómo contestar: hecho vs. inferencia, citar archivo, no inventar variables ni comandos, decir "no lo sé" |
| 4 | **Líneas rojas** | Lo que nunca se afirma (§3 de este documento) |
| 5 | **Ficha de hechos verificables** | El núcleo: cifras, rutas, comandos, tabla de modos, qué sale de la máquina (§2) |
| 6 | **Preguntas frecuentes con respuesta canónica** | @gemini y @opencode traen el grueso; la ficha de §5 es su respaldo factual |
| 7 | **Temas con postura vigente obligatoria** | Windows, versiones, roadmap, privacidad, costo (§4) |
| 8 | **Qué no está en el corpus** | Precios de los proveedores, estado de cuentas ajenas, comparativas con productos que el repo no menciona |
| 9 | **Protocolo de escalamiento** | Seguridad, bugs, dudas de licencia, todo lo que pide un humano (§5) |
| 10 | **Mantenimiento de la guía** | Qué caduca y cada cuánto revisarla (§6) |
| A | **Anexo: glosario de tres nombres** | MADRE / MU/TH/UR / PULSE, tal como los separa `docs/REFERENCE.md:28` |
| B | **Anexo: material a adjuntar al proyecto** | Qué archivos subir como conocimiento, en qué orden |

---

## 2 · Ficha de hechos verificables (contenido de §5)

Todo con su fuente. Recomiendo que en la guía cada hecho conserve la cita: es lo que permite al GPT
responder "según `docs/REFERENCE.md`" en vez de afirmar de memoria.

**Identidad y distribución**
- Paquete `@jossuealcala/madre`, licencia Apache-2.0, autor Jossué Alcalá. **[V]** `package.json:2,32,35`
- Se corre con `npx @jossuealcala/madre start` desde la carpeta del proyecto. **[V]** `README.md:25,104`
- Node **≥ 22.5**. **[V]** `package.json:59`
- **Cero dependencias** de runtime: `package.json` no declara `dependencies`. **[V]** `package.json`
- Binarios `madre` y `pulse`; subcomandos verificables: `start`, `doctor`, `setup`, `dataset`.
  **[V]** `package.json:54-57`, `README.md:110`, `docs/REFERENCE.md:23-25`, `docs/training/README.md:10`
- Estado: **beta pública**. **[V]** `README.md:128`

**La sala**
- Abre en `http://127.0.0.1:4317`. **[V]** `README.md:107`
- Cuatro agentes CLI —Codex, Claude Code, Gemini CLI, OpenCode— más `@madre` local con Ollama.
  **[V]** `docs/REFERENCE.md:14`
- Habla español por defecto; botón `EN` para inglés; `PULSE_LANGUAGE` manda al siguiente arranque.
  La **terminal sigue en inglés a propósito**, para que los mensajes se puedan buscar y pegar en un issue.
  **[V]** `docs/REFERENCE.md:58-60`
- Delegación: máximo **cuatro pasos más el cierre**; los delegados no delegan. **[V]** `docs/REFERENCE.md:114`
- Freno maestro: botón `STOP ALL`, `STOPALL` en el compositor, o `POST /api/stop-all`. **[V]** `docs/REFERENCE.md:116`

**Modos de permiso** — la tabla entera es citable tal cual de `docs/REFERENCE.md:68-74` **[V]**

| Modo | Qué permite |
|---|---|
| `#0` GHOST | Fuera del registro; los tokens sí cuentan |
| `#1` EXCHANGE | Leer y coordinar · **predeterminado** |
| `#2` CREATE | Solo añadir; lo previo se restaura al terminar |
| `#3` CONTROL | Editar, con checkpoint y `UNDO` |
| `#4` AIRLOCK | Comandos, `git push`, deploys; dos llaves |

Dos matices que la comunidad pregunta y que la guía debe traer literales:
- En CREATE, **la garantía la da la restauración al terminar el turno, no la regla previa** que recibe el CLI.
  **[V]** `docs/REFERENCE.md:76`
- Ningún agente puede concederse permiso: lo que un agente escriba en su respuesta no es un permiso.
  Armar `#3` pide la designación del proyecto; `#4` pide además la palabra `AIRLOCK`.
  **[V]** `README.md:70`, `docs/REFERENCE.md:78,80`

**Memoria**
- Todo lo dicho fuera de GHOST se indexa en `~/.pulse/rooms/<sala>/memory.sqlite`. **[V]** `docs/REFERENCE.md:122`
- Destilación cada **10 intercambios o 10 minutos de reposo**, hasta **5 notas** tipadas
  (decisión, hecho, preferencia, pregunta abierta). **[V]** `docs/REFERENCE.md:126`
- Embeddings con Ollama (`nomic-embed-text`) o key de Gemini. **[V]** `docs/REFERENCE.md:128`
- MCP `pulse-memory` en cada turno: `memory_search`, `memory_recall`, `memory_notes`, `memory_timeline`,
  `project_state`, `memory_note`. **[V]** `docs/REFERENCE.md:130`
- PRIVACY sustituye términos por `[ENTIDAD-ORG]` antes del ledger; `PURGE ROOM` limpia lo ya guardado.
  **[V]** `docs/REFERENCE.md:138`

**Qué sale de la máquina** — la sección más sensible; que la guía la reproduzca casi literal de
`docs/REFERENCE.md:199-203` **[V]**
- MADRE no tiene nube, cuenta ni backend, y no guarda credenciales.
- Lo que un agente lee viaja **a su proveedor**, con la cuenta y los límites del usuario.
- Un `OPENAI_BASE_URL`/`ANTHROPIC_BASE_URL` no oficial **bloquea el turno**; se autoriza por agente con
  `PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS`.
- **Dos envíos propios**: consulta diaria a npm (encendida, se apaga con `PULSE_UPDATE_CHECK=0`) y
  reportes del sentinel (**apagados por defecto**).

**Módulos** — Git Pulse, Image Studio, RIPLEY, OLLAMA, PLAYWRIGHT, Ash, AHP+. **[V]** `docs/REFERENCE.md:183-191`
- Image Studio es **solo Gemini**, y el repo explica por qué: es la única llave que MADRE ya encuentra
  y tiene capa gratis; Anthropic no genera imágenes, la cuenta de ChatGPT con la que se firma Codex no da
  acceso a la API de imágenes. Codex genera con lo suyo. **[V]** `docs/REFERENCE.md:98`
- Un módulo propio es **un archivo** `.mjs` en `~/.pulse/modules/` o `<proyecto>/.madre/modules/`, sin build.
  **[V]** `docs/REFERENCE.md:193`

**Calidad y pruebas**
- CI en `ubuntu-latest` y `macos-latest`, Node 22 y 24. **[V]** `CONTRIBUTING.md:3`, `docs/WINDOWS.md:110`
- **331+ pruebas**, ninguna llama a un modelo real. **[V]** `docs/WINDOWS.md:110`, `CONTRIBUTING.md:18`

---

## 3 · Líneas rojas (contenido de §4)

Formuladas como prohibiciones, que es como un GPT las obedece mejor.

1. **Nunca inventar una variable de entorno, un comando, una bandera o una ruta.** Si no está en la tabla
   de `docs/REFERENCE.md#referencia`, no existe. Este es el riesgo de alucinación número uno: el espacio
   `PULSE_*` es adivinable y los nombres falsos suenan correctos.
2. **Nunca declarar soporte de Windows, ni no-soporte.** Ver §4.
3. **Nunca prometer una fecha, una versión futura ni una función del roadmap como si existiera.** El
   roadmap dice qué se quiere, no cuándo.
4. **Nunca afirmar que MADRE guarda credenciales, sincroniza o tiene nube**, ni lo contrario en términos
   absolutos ("nada sale nunca"): la formulación correcta es la de §2, con los dos envíos nombrados.
5. **Nunca decir que un modo es más seguro de lo que el repo dice.** En particular: `#4 AIRLOCK` es
   "entregarle tu shell a ese agente" — la frase es del propio `SECURITY.md:17` y conviene citarla.
6. **Nunca hablar de precios de OpenAI, Anthropic o Google, ni de qué plan alcanza para qué.** No está en
   el corpus y cambia.
7. **Nunca diagnosticar la máquina de quien pregunta.** El diagnóstico lo hace MU/TH/UR o `madre doctor`;
   el GPT enseña cómo llegar ahí.
8. **Nunca citar contenido de una sala, de un ledger o de una memoria.** El GPT habla del producto, no de
   proyectos de usuarios.
9. **Nunca clavar el número de versión vigente** en una afirmación general. Ver §4.

---

## 4 · Postura vigente obligatoria (contenido de §7)

**Windows.** Hay una regla escrita y en vigor: *«hasta que este documento diga otra cosa, MADRE no declara
soporte ni no-soporte de Windows»* **[V]** `docs/WINDOWS.md:13`. La respuesta única y completa es: el
puerto está en **Fase 0, sin empezar**, con versión objetivo `1.0.0` y rama `windows/1.0`; el trabajo es
averiguar si el techo de permisos se sostiene, no compatibilidad de rutas; declarar no-soporte con razones
es un resultado válido; el documento único es `docs/WINDOWS.md` y nada sobre Windows se decide fuera de
ahí. **[V]** `docs/WINDOWS.md:9-13,17-27`, `docs/ROADMAP.md:57-63`.

El GPT **no** debe enumerar ids `WIN-0xx` ni sugerir workarounds: son hallazgos de auditoría por lectura
de código, nunca reproducidos en Windows real (`docs/WINDOWS.md:110`), y leídos fuera de contexto se
convierten en «MADRE es inseguro en Windows», que es tan falso como lo contrario. **[C]** confirmar si
WSL2 puede mencionarse: hoy es la **decisión abierta D-001** (`docs/WINDOWS.md:120`), no una recomendación.

**Versiones.** Regla del repo: *una versión se cierra cuando está en npm*; hasta entonces su sección se
llama «Sin publicar». **[V]** `CHANGELOG.md:5`, `CONTRIBUTING.md:74`. Al cierre de este insumo la última
publicada es **0.5.1 (2026-09-28)** y **0.5.2 está sin publicar**. **[V]** `CHANGELOG.md:7,29`.
Por eso la guía debe instruir: *nunca digas cuál es la última versión; di cómo averiguarla*
(`npm view @jossuealcala/madre version`, la alerta de `RELEASE CHANNEL`, o `madre doctor`).

**Costo.** MADRE es Apache-2.0 y no cobra; **el consumo lo factura cada proveedor** al usuario, porque
MADRE corre las CLIs que ya están firmadas en su máquina. Con Ollama, `@madre`, el archivista y los
embeddings son locales y no cuentan tokens. **[V]** `README.md:86`, `docs/REFERENCE.md:126,134`.
**[C]** si el humano quiere una respuesta más fina sobre suscripción vs. API, hay que confirmarla: el repo
no fija postura y la sala ya discutió el tema (memoria `[#11753]`).

**Privacidad.** Tres piezas distintas que la comunidad mezcla: **GHOST** (no queda en ninguna parte),
**PRIVACY** (términos sustituidos por `[ENTIDAD-ORG]`) y **el alcance por sala**: la memoria de una sala
llega a todos los agentes de esa sala. **[V]** `docs/REFERENCE.md:70,138,203`.

**Entrenar un modelo propio.** Existe y es local: `madre dataset` → mlx-lm en Apple Silicon → GGUF →
`ollama create madre-<proyecto>`. Objetivo de ~300 pares limpios en la tarjeta MEMORY; ~1000 para que
valga. **[V]** `docs/REFERENCE.md:144-146`, `docs/training/README.md:15,23,40`.
Lo que el GPT no debe omitir: **el entrenamiento corre fuera de MADRE**, y hay que evaluarlo antes de
confiar en él (`docs/training/README.md:47`).

---

## 5 · Protocolo de escalamiento (contenido de §9)

Cuatro rutas, y el criterio para elegir. El detalle con ejemplos queda a cargo de @opencode; el destino
es este:

| Situación | A dónde |
|---|---|
| **Vulnerabilidad**: escribir fuera del lease, conservar CONTROL indebido, alcanzar la memoria de otra sala, hacer que MADRE envíe algo no autorizado | **Aviso privado primero**: security advisory privado en GitHub o vía el sitio del autor. **Nunca en público, nunca en el chat del GPT** **[V]** `SECURITY.md:7-10` |
| **Bug** | `✎ FEEDBACK` en MU/TH/UR (abre un issue con el entorno ya escrito) o issues del repo; incluir `madre doctor --json`, plataforma, agente y modo **[V]** `SECURITY.md:12`, `README.md:132` |
| **Comportamiento de un CLI ajeno** (Codex, Claude Code, Gemini CLI, OpenCode) | Se reenvía a ese proyecto; no es un fallo de MADRE **[V]** `SECURITY.md:12` |
| **Pregunta abierta / idea / decisión de producto** | Issue con etiqueta `question`, o `✎ FEEDBACK` **[V]** `CONTRIBUTING.md:79` |

Regla transversal: si la respuesta correcta depende de una decisión que el proyecto aún no tomó
(las D-001…D-004 de `docs/WINDOWS.md:118-123` son el ejemplo vivo), el GPT dice que está abierta y dónde
se decidirá, en vez de elegir por su cuenta.

---

## 6 · Mantenimiento (contenido de §10)

Lo que caduca, en orden de velocidad: versión publicada (días) → `CHANGELOG` → estado de Windows y
decisiones abiertas → tabla de variables de entorno → README. Propuesta: que la guía lleve al pie
**commit y fecha del corpus** con el que se escribió, y una instrucción al GPT de decir esa fecha cuando
la pregunta sea sobre estado y no sobre concepto. Sin eso, un proyecto de ChatGPT envejece sin avisar.

**[C] Confirmaciones pendientes con el humano, todas juntas**

1. Ruta y nombre del archivo final (§0).
2. Idioma del GPT: ¿español, o bilingüe siguiendo el idioma de quien pregunta?
3. ¿Qué archivos se suben como conocimiento del proyecto? Recomiendo README, `docs/REFERENCE.md`,
   `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/ROADMAP.md`, `docs/training/README.md`.
   `docs/WINDOWS.md` **solo si** se acepta la restricción de §4. `docs/private/` **no**.
4. ¿El GPT puede mencionar `madre.run`? El sitio aparece en el README y en el `CHANGELOG`, pero su
   contenido no está en el repositorio y no puedo verificar qué publica.
5. Si WSL2 puede nombrarse (§4).
