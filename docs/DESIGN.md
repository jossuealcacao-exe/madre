# MADRE UX · Guía oficial de diseño

Versión 1 · septiembre de 2026 · aplica a `@jossuealcala/madre` 0.3.x.

Esta guía existe para que otra persona, u otro agente, pueda replicar el estilo de MADRE en otro servicio sin adivinar. Describe lo que está construido en `public/styles.css`, `public/app.js`, `public/index.html` y `public/brands.js`, concepto por concepto, con los valores exactos. Cuando algo sea una decisión y no un accidente, se dice por qué.

Si vas a construir con esta guía, la regla de oro es la primera línea de `styles.css`:

> **MADRE es una conversación, no un log. iMessage para el diálogo, una terminal para los metadatos, MOTHER para el ánimo.**

---

## 1 · Concepto

MADRE toma su nombre de MU/TH/UR 6000, la computadora de la nave Nostromo en *Alien* (1979). La referencia no es decorativa: define tres capas visuales que conviven en la misma pantalla y nunca se mezclan.

| Capa | Qué contiene | De dónde viene | Cómo se ve |
|---|---|---|---|
| **Diálogo** | Los mensajes entre el humano y los agentes | iMessage | Burbujas grandes, tipografía del sistema, esquinas redondas, sin mayúsculas forzadas |
| **Metadatos** | Quién habla, a quién, cuándo, cuántos tokens, qué modo, qué pasó | La terminal | Monoespaciada, 10 px, mayúsculas, tracking amplio, gris |
| **MOTHER** | Diagnóstico, memoria, alertas, control, ceremonias | La pantalla de MU/TH/UR | Fósforo verde sobre negro, scanlines, brillo, glitch, mayúsculas |

Un servicio que replique MADRE tiene que decidir qué de lo suyo es diálogo, qué es metadato y qué es MOTHER, y vestir cada cosa con su capa. El error típico es vestir todo de terminal; entonces es un log, no una conversación.

Tres principios que se repiten en cada componente:

1. **La conversación manda.** Lo que dice un agente se lee como un mensaje, con el mismo cuerpo de texto que un chat de sistema. Todo lo demás es más pequeño, más gris y más espaciado.
2. **Un color significa una cosa.** El fósforo es MADRE. El ámbar es "crear". El rojo es "control" o "terror". Cada proveedor tiene su color y lo mantiene en avatar, nombre, enlaces y código dentro de su burbuja. No se reparten colores por gusto.
3. **La ceremonia es breve y funcional.** Las animaciones duran entre 0.2 y 1.2 s, ocurren una vez y siempre comunican un estado: un latido al cargar, un desvanecimiento al pasar a GHOST, lluvia binaria al armar CONTROL. Con `prefers-reduced-motion` todas se apagan.

---

## 2 · Tokens

Todo vive en variables CSS sobre `:root`. Los componentes nunca usan un hexadecimal directo salvo en las capas de MOTHER y NOSTROMO, que tienen su propia paleta fija.

### 2.1 Superficies y texto (tema oscuro, el predeterminado)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#050605` | Fondo de página. Negro con un grado de verde |
| `--bg-2` | `#0b0d0b` | Centro del degradado radial del fondo |
| `--panel` | `#101310` | Campo de escritura, diálogos, tarjetas |
| `--panel-2` | `#171b17` | Segundo nivel dentro de un panel |
| `--line` | `rgba(255,255,255,.07)` | Separadores finos |
| `--line-2` | `rgba(255,255,255,.13)` | Bordes de botones y chips |
| `--text` | `#eef1ea` | Texto principal. Blanco roto hacia verde |
| `--text-2` | `#9aa197` | Texto secundario, metadatos activos |
| `--text-3` | `#626a5f` | Texto terciario, sellos, notas |
| `--shadow` | `0 1px 0 rgba(255,255,255,.03) inset, 0 12px 40px rgba(0,0,0,.45)` | Sombra única para burbujas y diálogos |

El fondo del `body` no es plano: un degradado radial desde `--bg-2` arriba hacia `--bg`, y encima una trama de líneas horizontales cada 3 px con `rgba(155,255,102,.035)`. Son las scanlines. Se notan apenas y hacen que la pantalla parezca un monitor y no una hoja.

### 2.2 Acentos

| Token | Valor | Significado |
|---|---|---|
| `--phosphor` | `#9bff66` | **MADRE.** Marca, burbuja del humano, botón de enviar, código, enlaces, éxito |
| `--phosphor-ink` | `#0a1405` | Texto sobre fósforo |
| `--brew` | `#28fe14` | ORDER 937 / AshCode. El verde del tema "Homebrew" de Terminal.app |
| `--warn` | `#ffd166` | Aviso: privacidad, versión nueva, condición leve |
| `--danger` | `#ff7b72` | Error, contador de MU/TH/UR |
| `--crit` | `#ff8a7a` | Crítico: presupuesto agotado, humano "expendable" |
| `--terror` | `#ff2a1f` | **MOTHER cuando deja de ser amable.** CONTROL, NOSTROMO, CODE000, INTRUDER |

`--accent` y `--accent-ink` son alias de fósforo para componentes genéricos.

### 2.3 Modos de permiso

Cuatro modos, un color cada uno. El chip, el borde del campo, el botón de enviar y el menú leen la misma variable, así que el humano sabe en qué modo está desde cualquier rincón del compositor.

| Modo | Token | Valor | Tinta | Idea |
|---|---|---|---|---|
| #0 GHOST | `--mode-0` | `#8d978c` | `#0b0d0b` | Humo. Nada se guarda |
| #1 EXCHANGE | `--mode-1` | fósforo | fósforo-ink | Leer y hablar |
| #2 CREATE | `--mode-2` | `#ffb000` | `#1a1000` | Fósforo ámbar. Crear archivos |
| #3 CONTROL | `--mode-3` | terror | `#fff3f1` | La pantalla roja. Editar el proyecto |

### 2.4 Proveedores

Cada agente lleva el color público de su proveedor para que una burbuja de Codex se lea como Codex sin logo. Los logos oficiales son marcas registradas; MADRE dibuja monogramas propios en SVG con `fill="currentColor"` para que hereden el color.

| Agente | Color | Claro | Monograma |
|---|---|---|---|
| Codex | `#10A37F` | `#0B7A5F` | Hexágono anidado |
| Claude | `#D97757` | `#B85C3C` | Asterisco de ocho puntas |
| Gemini | `#8E75E8` con degradado `#4796E3 → #8E75E8 → #D96570` a 135° | `#5B45B8` | Estrella de cuatro puntas |
| OpenCode | `#F2C94C` | `#9A7A12` | Corchetes de código |
| @madre | fósforo | fósforo claro | El latido de la marca |

El color del agente se inyecta como `--agent` en el nodo del mensaje y todo lo que está dentro lo hereda: nombre, avatar, enlaces, `code`, badge de destino.

### 2.5 Memoria (NOSTROMO)

| Tipo | Token | Valor |
|---|---|---|
| Decisión | `--mem-decision` | `#ffb000` |
| Hecho | `--mem-fact` | `#9bff66` |
| Preferencia | `--mem-preference` | `#d78cff` |
| Pregunta abierta | `--mem-question` | `#5fd6ff` |
| El sol, MADRE | `--nostromo-sun` | `#ff2a1f` |

### 2.6 Tema claro

El tema claro no es una inversión. Mantiene la identidad y quita el brillo, porque el fósforo brillando sobre blanco se ve sucio.

| Token | Claro |
|---|---|
| `--bg` / `--bg-2` / `--panel` / `--panel-2` | `#f4f5f2` / `#ffffff` / `#ffffff` / `#eef0ea` |
| `--text` / `--text-2` / `--text-3` | `#121512` / `#5a615a` / `#8b928a` |
| `--phosphor` | `#2f8a1c`, tinta `#ffffff` |
| `--brew` | `#178f0c` |
| `--bubble` | `#e9ebe6` |
| `--warn` / `--danger` / `--crit` | `#8a6a00` / `#b3261e` / `#a1301f` |
| `--mode-0` / `--mode-2` / `--mode-3` | `#6f786e` / `#a06e00` / `#d81b12`, tinta blanca |
| `--shadow` | `0 12px 40px rgba(0,0,0,.08)` |

Reglas del claro, en `:root[data-scheme="light"]`: `text-shadow: none` en todo salvo dentro de los marcos de MOTHER, NOSTROMO y OVERRIDE, que siguen siendo pantallas de fósforo; `filter: none` en la marca; las scanlines desaparecen del fondo; los halos de color de los modos se vuelven anillos de 2 px al 30 %.

Tres estados: `auto` sigue al sistema con `prefers-color-scheme`; el botón de tema en la barra fija `data-theme="light"` o `"dark"`. Se definen los tokens completos en `:root` y se redefinen en las dos ramas.

---

## 3 · Tipografía

Dos familias, nunca tres.

| Rol | Pila | Dónde |
|---|---|---|
| Diálogo | `-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", sans-serif` | Burbujas, títulos de modales, texto largo |
| Metadatos y MOTHER | `--mono: "SF Mono", ui-monospace, Menlo, Consolas, monospace` | Todo lo demás |

Escala y ritmo:

| Elemento | Tamaño | Tracking | Caja |
|---|---|---|---|
| Cuerpo de burbuja | 15 px, línea 1.5 | normal | Mixta |
| Títulos dentro de burbuja | 1em (h1 1.1em), peso 650 | −.01em | Mixta |
| Código en línea | .9em | normal | Mono, fósforo sobre fósforo al 10 % |
| Bloque de código | 12.5 px, línea 1.55 | normal | Mono, fósforo sobre `--bg` |
| Nombre del agente (`.who`) | 10 px | .12em | MAYÚSCULAS |
| Sello (`.stamp`) | 10 px | .04em | Mixta |
| Línea de sistema (`.system`) | 10.5 px, línea 1.6 | .08em | MAYÚSCULAS |
| Botones de barra | 10 px | .18em | MAYÚSCULAS |
| Chips y etiquetas | 9 a 10.5 px | .10 a .16em | MAYÚSCULAS |
| Título de MU/TH/UR | clamp(22px, 4vw, 34px), peso 700 | .24em | MAYÚSCULAS |
| Encabezados de sección MOTHER (`h3`) | 10 px, peso 400 | .28em | MAYÚSCULAS, con `▌ ` delante en fósforo |
| Cuerpo MOTHER | 12 px, línea 1.7 | .04 a .14em | MAYÚSCULAS |

La convención que más define a MADRE: **cuanto más pequeño el texto, más ancho el tracking.** Un rótulo de 9 px lleva .16em; el cuerpo de 15 px no lleva nada. Así los metadatos respiran sin competir con el diálogo.

Peso: el diálogo usa 400 y 600. Los metadatos, 400 con negritas puntuales a 600 para el nombre del agente. Nunca 800.

---

## 4 · Voz y redacción

La interfaz habla en inglés técnico corto, en mayúsculas cuando es rótulo, en frase normal cuando es mensaje. Tres voces:

**MU/TH/UR** habla en los toasts y en las notas de configuración. Siempre empieza con `MU/TH/UR › ` y sigue con una frase en minúsculas, sin punto final si es corta.
`MU/TH/UR › @claude holds CONTROL. Checkpoint taken; UNDO will be one click.`

**MOTHER** habla en las alertas de sala, en la terminal y en las respuestas de la pantalla de diagnóstico. Mayúsculas, frases nominales, ritmo de computadora de nave.
`INTERFACE 2037 READY FOR INQUIRY` · `NO CLI ONLINE · @MADRE (LOCAL) IS.` · `UNABLE TO COMPUTE. UNABLE TO CLARIFY.`

**La sala** habla en las líneas de sistema entre burbujas: minúsculas, con el nombre del agente en negrita y la acción en el centro.
`memory · @ollama read 8 exchanges (#1467–#1840) · kept 4 memories · 42 in the archive`

Reglas:

- Los rótulos de acción son verbos o sustantivos en mayúsculas de una a tres palabras: `STOP ALL`, `EXPORT DATASET`, `PURGE ROOM`, `CHECK NOW`, `FORGET THIS MEMORY`.
- Las notas explicativas debajo de un encabezado van en mayúsculas de 10 px con tracking .12em y color tenue. Dicen qué hace la cosa y qué **no** sale de la máquina. Ejemplo: `NOTHING LEAVES THIS MACHINE UNLESS YOU SEND IT.`
- El separador universal es ` · ` (espacio, punto medio, espacio). Une métricas, estados y contexto en una sola línea: `0.3.1 · UP TO DATE`, `5 AGENTS · 5 READY · ROOM /amethyst`.
- Las flechas de destino son `→` y las respuestas `↳`. Los enlaces externos terminan en ` ↗`.
- Los agentes siempre se nombran con arroba y en minúsculas: `@codex`. El humano es `HUMAN`, `YOU`, o `CREW` cuando hay más de un agente; `INTRUDER` solo tras CODE000.
- Nunca disculpas ni relleno. Un error dice qué pasó y qué hacer: `Rating was not saved: registry HTTP 503`.

---

## 5 · Geometría y espaciado

| Concepto | Valor |
|---|---|
| Columna del hilo | `--column: min(880px, 100% − 40px)` |
| Barra superior | `min(1280px, 100% − 40px)`, más ancha que el hilo |
| Radio de burbuja | 20 px; la esquina que apunta al autor baja a 6 px |
| Radio del campo de escritura | 24 px |
| Radio de diálogos grandes | 16 px |
| Radio de botones y chips | 6 px; píldoras 999 px |
| Radio de bloque de código | 12 px |
| Altura de botón de barra | 26 px |
| Avatar | 28 px; en el selector 30 px; en tarjetas 26 px |
| Botón de enviar | 34 px, círculo |
| Icono de acción en burbuja | 26 px con SVG de 15 px |
| Ancho máximo de una fila de mensaje | 76 % |
| Separación entre mensajes | 14 px; 0 si son consecutivos del mismo autor |
| Hueco entre avatar y burbuja | 12 px |
| Gutter lateral mínimo | 20 px |

Los iconos son SVG en línea, trazo de 1.3 px en iconos de 16, 1.7 a 1.8 en iconos de 20, `stroke-linecap: round`, sin relleno salvo el glifo cuadrado de MOTHER (8 × 8 px, borde de 1 px) y el glifo sólido de STOP ALL (8 × 8 px lleno).

---

## 6 · Componentes

### 6.1 La barra

Un `header.bar` en `flex` con `gap: 18px`, mono 11 px, borde inferior `--line`. De izquierda a derecha: marca, raíz del proyecto, avatares de la tripulación, indicador LIVE, alertas (versión nueva, STOP ALL), MODULES, MU/TH/UR, tema, panel de archivos.

La **marca** es un SVG de 64 × 18 con el trazo de un electrocardiograma que se dibuja al cargar (`beat-draw`, 1.1 s) y un punto que aparece y late cada 2.6 s (`beat-idle`). La palabra MADRE entra después (`word-in`). Al pasar el ratón, el trazo brilla. La marca enlaza al sitio del autor.

La **raíz del proyecto** va tras la marca con `/ ` delante, en `--text-3`, y ocupa el espacio libre (`flex: 1 1 auto`) con elipsis solo si no cabe.

Los **botones de barra** (`.mother-button`, `.stop-all`, `.tree-button`) comparten forma: 26 px de alto, borde `--line-2`, fondo transparente, mono 10 px con tracking .18em. Al pasar el ratón toman fósforo con halo de 14 px. Los contadores son círculos de 16 px en `--danger` con texto blanco de 9 px.

Las **alertas de barra** usan la forma de STOP ALL con su color: STOP ALL armado es terror con `text-shadow` y klaxon; la versión nueva es `--warn` respirando (`update-breathe`, 2.8 s). Siempre `white-space: nowrap`: una alerta nunca se parte en dos líneas.

### 6.2 Mensajes

Una fila es `grid: 28px 1fr` con el avatar abajo a la izquierda y una columna de tres partes:

1. **`.who`** encima: mono 10 px mayúsculas en el color del agente. Puede llevar badges (píldoras con borde `--line-2`): `answering @codex`, `step 2/4`, `closing turn`, `handoff note`, el modelo, el modo si no es #1, `ASH CODE`. Si el mensaje responde a otro, una cita `↳ …` en itálica gris de hasta 90 caracteres.
2. **`.bubble`**: fondo `--bubble` (`#1c201c`), texto 15 px, padding `12px 16px`, radio 20 con la esquina inferior izquierda a 6, sombra `--shadow`. Markdown renderizado dentro con márgenes de 9 px entre párrafos. Los bloques de código son "la terminal dentro del mensaje": fondo `--bg`, borde `--line-2`, texto fósforo, etiqueta de lenguaje arriba a la izquierda en 9.5 px y botón COPY arriba a la derecha.
3. **`.stamp`** debajo: hora, tokens del turno (`2.1k tok`) y acumulado (`Σ 9.2k`), en mono 10 px `--text-3`.

La burbuja del **humano** invierte todo: fondo fósforo, tinta oscura, esquina inferior derecha a 6, alineada a la derecha, sombra del propio color al 25 %, y el sello muestra `→ @agente · hora`. Si el humano está en CONTROL, el nombre pasa de `HUMAN ›` a `MU/TH/UR · CONTROL @AGENTE ›`.

Las **acciones** (`.bubble-actions`) aparecen al pasar el ratón bajo la burbuja: valorar bien, valorar mal, copiar, responder con otro agente. Son iconos de 26 px sin borde; la valoración activa se pinta en fósforo o terror.

Bajo una burbuja pueden colgar **pistas**: `◉ memory saved` con píldoras por tipo de nota en su color, o `privacy · @claude · 2 private terms replaced with [ENTIDAD-ORG]` en `--warn`.

### 6.3 Líneas de sistema

Centradas, mono 10.5 px mayúsculas `--text-3`, con negritas en `--text-2`. Sirven para handoffs (`@codex → @claude`, con cada nombre en su color vía `--from` y `--to`), memoria, privacidad, planes, alertas de sala. Nunca tienen fondo ni borde. Una línea que avisa va en `--warn`; una memoria olvidada, en terror.

### 6.4 El compositor

`.field` es una caja `--panel` con borde `--line-2` y radio 24 px que crece con el texto. Dentro: la etiqueta `HUMAN ›` en mono, el textarea, y a la derecha los botones CREATE, ORDER 937, adjuntar y enviar. El botón de **enviar** es un círculo de 34 px en el color del modo con halo de 18 px.

Encima está el **selector**: los avatares de la tripulación a 30 px; el elegido lleva un anillo de 3.5 px en su color separado por 2 px de fondo. A su lado, `to @claude`, el **chip de modo** (`#1 EXCHANGE ▾`, borde y texto en el color del modo) y el **chip de modelo**. Para @madre, una nota `memory · answers & asks the crew · never writes`.

El compositor cambia con el modo: en CONTROL el campo toma borde terror con doble halo; en CREATE, ámbar; con ORDER 937, el verde `--brew`; al arrastrar un archivo, fósforo. El placeholder también cambia por modo y agente.

Debajo de todo, una línea `.safety` en mono 9.5 px mayúsculas centrada que dice qué modo rige y qué puede salir de la máquina.

### 6.5 Menús flotantes

Los menús de modo, modelo y "responder con" son cajas `--panel` con borde `--line-2`, radio 12 px, sombra `--shadow`, y una fila de título en mono 9.5 px mayúsculas. Las opciones son filas con nombre en negrita y una `hint` a la derecha en `--text-3`. La opción del modo activo lleva un punto que parpadea (`mode-dot`) junto a `NOW`. Una opción bloqueada se muestra atenuada con su razón, y el menú ofrece `RAISE TO #3` cuando el tope del agente lo impide.

### 6.6 Toast

Una sola caja fija, centrada sobre el compositor, `--panel` con borde `--danger` al 40 %, radio 12 px, padding `9px 14px`, entra con `toast-in` en 0.22 s. Texto en la voz de MU/TH/UR. Un toast a la vez; el nuevo sustituye al anterior.

### 6.7 Formularios de configuración (CONNECTIONS)

`.room-form` es una rejilla de dos columnas de `label` verticales: el rótulo en mono 10 px mayúsculas `--ph-dim` y el control debajo. Los controles guardan al cambiar, sin botón de guardar; el toast confirma en la voz de MU/TH/UR. Los interruptores son `label.toggle` con checkbox nativo en `accent-color: #9bff66`. Los grupos de casillas llevan un rótulo `MAY DISTIL:` a la izquierda. Una fila `.full` cruza las dos columnas para botones de acción con su nota al lado (`EXPORT DATASET · 109 / 300 CLEAN PAIRS`).

---

## 7 · La pantalla de MOTHER (MU/TH/UR)

Un `dialog` a pantalla completa con backdrop `rgba(0,0,0,.82)` desenfocado 6 px. Dentro, `.mother-frame`:

- Paleta propia y fija, independiente del tema: `--ph: #9bff66`, `--ph-dim: rgba(155,255,102,.45)`, `--ph-faint: rgba(155,255,102,.14)`.
- Fondo: radial de `#0a1506` a `#020402` más scanlines de 3 px al 5 %.
- Todo en `--mono`, color `--ph`, tracking .04em, `text-shadow: 0 0 6px rgba(155,255,102,.45)`. Ese resplandor es lo que la hace pantalla y no página.
- Entra con `mother-on` (0.5 s): opacidad de 0 a 1, `scaleY(.96)` a 1, brillo 2 a 1. Es el encendido de un CRT.

Anatomía de arriba abajo:

1. **Cabecera** en rejilla `auto 1fr auto`: título `MU/TH/UR 6000`, subtítulo `MADRE · INTERFACE 2037 · TROUBLESHOOTING` en `--ph-dim`, y botones planos de borde `--ph-dim` (`⚙ CONNECTIONS`, `◉ NOSTROMO`, `✎ FEEDBACK`, `END SESSION ×`). Línea inferior `--ph-dim`.
2. **Secciones** (`.mother-section`): encabezado `h3` de 10 px con `▌ ` delante; si es colapsable, el encabezado es un botón con el caret `▾ COLLAPSE` / `▸ EXPAND` a la derecha y recuerda su estado en `localStorage`. Debajo, una nota en 10 px `--ph-dim`, luego controles (`.sentinel-controls`) con interruptores y botones planos.
3. **Boot**: un `pre` de 12 px que escribe línea a línea con cursor `█` parpadeando (`blink`, 1 s a pasos). `INTERFACE 2037 READY FOR INQUIRY`, la tripulación, las condiciones abiertas.
4. **Inquiry**: una línea con `›` y un input sin borde, y a la derecha el selector de plataforma `MACOS LINUX WINDOWS` como pestañas.
5. **Condiciones registradas**: filas `64px 92px 1fr auto` con hora, agente en su color, la primera línea del error y las condiciones que MU/TH/UR reconoce como píldoras.
6. **Condiciones conocidas**: rejilla `auto-fill, minmax(380px, 1fr)` de tarjetas con borde `--ph-dim`, cabecera `severidad @agente id`, título en fósforo, `DIAGNOSIS`, `REMEDY` y los comandos por sistema.

Los botones dentro de MOTHER no tienen radio. Son rectángulos de borde `--ph-dim`, texto `--ph` de 9.5 px con tracking .16em, y al pasar el ratón se rellenan con `--ph-faint`. Las cajas de comando llevan el mismo borde, fondo `--ph-faint`, código en fósforo y botón COPY.

El botón MU/TH/UR de la barra tiene un huevo de pascua: mantener el ratón 3 s o hacer scroll sostenido 4 s lo va tiñendo de terror (`arming`, transición de 3 s).

---

## 8 · NOSTROMO

El mapa de la memoria detrás de la designación del proyecto. Un `dialog` negro total (`::backdrop: #000`) con un canvas de mundo infinito: MADRE es un sol rojo `#ff2a1f` que late en el centro con venas que pulsan hacia las memorias; cada memoria es un planeta de plasma en el color de su tipo, con un halo; las relaciones son hilos tenues. Pan con arrastre, zoom con rueda. Al tocar un planeta se abre su ficha con `FORGET THIS MEMORY`, que exige un segundo clic dentro de 4 s. Al tocar a MADRE aparece una alerta; al octavo intento, CODE000: jaula, expulsión, y el humano pasa a `INTRUDER`. El rótulo del botón NOSTROMO en la barra es terror sobre borde terror al 55 %.

Para replicarlo en otro servicio: la memoria se mira, no se edita. Solo se puede borrar, y borrar cuesta un gesto deliberado.

---

## 9 · Movimiento

Duraciones y curvas, todas en `styles.css`:

| Nombre | Duración | Qué comunica |
|---|---|---|
| `beat-draw`, `beat-dot`, `beat-idle`, `word-in` | 1.1 s / 1 s / 2.6 s bucle / 0.6 s | La marca vive |
| `mother-on` | 0.5 s | Encendido de CRT al abrir MOTHER |
| `blink`, `cursor-blink` | 1 s a pasos | Cursor de terminal |
| `toast-in`, `hint-in`, `status-in`, `remedy-in`, `tree-in` | 0.2 a 0.6 s | Algo llegó |
| `hint-glow` | 2.4 s una vez | Una píldora nueva pide la mirada |
| `mode-dot` | bucle | El modo activo respira en el menú |
| `ghost-dissolve` | ~1 s | El campo se desintegra en puntos y se reintegra al entrar en GHOST |
| `rain-in` | ~1 s | Lluvia binaria roja sobre campo y viewport al armar CONTROL |
| `control-sweep`, `control-type`, `terror-flicker` | 0.4 a 1.2 s | Barrido rojo y parpadeo de la pantalla en CONTROL |
| `ash-sweep`, `ash-type` | 0.4 a 1 s | Barrido verde `--brew` al activar ORDER 937 |
| `phosphor-flicker` | 1.1 s a pasos | La burbuja del humano parpadea cuando MOTHER lo marca |
| `klaxon`, `alert-in`, `terror-in` | 0.8 s a pasos | Alertas de sala y de OVERRIDE denegado |
| `override-shake` | 0.35 s | Designación incorrecta |
| `update-breathe` | 2.8 s bucle | Hay versión nueva |
| `bounce` | 1.2 s bucle | Puntos de "escribiendo" |

Reglas: una ceremonia por evento, nunca dos a la vez; las de estado (CONTROL, GHOST, ORDER) se disparan al **entrar** al estado, no mientras dura; y `@media (prefers-reduced-motion: reduce)` apaga todas y deja el estado final visible.

---

## 10 · Estados y semántica del color

| Situación | Color | Dónde se ve |
|---|---|---|
| Normal, MADRE, éxito | fósforo | Marca, humano, enviar, código, `memory saved` |
| Crear | ámbar `--mode-2` | Chip, campo, enviar, toasts de lease |
| Control, terror, memoria intocable | terror | Chip, campo, STOP ALL armado, NOSTROMO, CODE000 |
| Fuera de registro | humo `--mode-0` | Chip, campo desvanecido |
| Aviso, privacidad, versión nueva | `--warn` | Líneas de sistema, alerta de barra, sección PRIVACY |
| Error, contador de condiciones | `--danger` | Toast, badge de MU/TH/UR |
| Presupuesto agotado, `EXPENDABLE` | `--crit` | Anillo del avatar, nombre del humano |
| Offline / detectado sin sesión | `--text-3` con borde discontinuo / continuo | Avatares de la barra |

El **anillo de uso** del avatar es un `conic-gradient` con el porcentaje de presupuesto gastado en el color del agente, y en `--crit` cuando pasa el umbral.

---

## 11 · Accesibilidad

- Cada control tiene `aria-label` o texto visible; los selectores son `role="radiogroup"` con `aria-checked`; los colapsables llevan `aria-expanded`; los diálogos son `<dialog>` nativos.
- Contraste: texto principal sobre fondo ≥ 12:1 en oscuro; los metadatos en `--text-3` bajan a ~4.5:1 deliberadamente, porque son secundarios y siempre acompañan a un texto principal legible. En claro, el fósforo se oscurece a `#2f8a1c` para mantener 4.5:1 sobre blanco.
- Todo funciona con teclado: los avatares del selector responden a Espacio y Enter; los menús se cierran con clic fuera y Escape.
- `hidden` se controla con el atributo, nunca con `display` inline.
- Toda animación respeta `prefers-reduced-motion`.

---

## 12 · Cómo replicar MADRE en otro servicio

Orden de trabajo recomendado para un agente que construya con esta guía:

1. **Copiar los tokens** de la sección 2 tal cual, en `:root` con las dos ramas de tema claro. No renombrar; el vocabulario (fósforo, terror, humo, ámbar) es parte de la identidad.
2. **Fondo con scanlines** y degradado radial en oscuro; plano en claro.
3. **Declarar las tres capas** del servicio nuevo: qué es diálogo (sans 15 px, burbujas), qué es metadato (mono 10 px, mayúsculas, gris) y qué es MOTHER (fósforo, pantalla completa, mayúsculas). Si no hay una tercera capa, no inventarla: la marca y los acentos fósforo bastan.
4. **Una barra** de 26 px de alto en sus controles, marca latiendo a la izquierda, alertas con el corte de STOP ALL a la derecha.
5. **Un solo color por significado.** Antes de agregar un color, buscar si ámbar, terror, warn o el proveedor ya lo dicen.
6. **La voz.** Toasts que empiezan con `MU/TH/UR › `, notas en mayúsculas que dicen qué no sale de la máquina, ` · ` como separador, `→` y `↳`.
7. **Ceremonias cortas** solo al cambiar de estado, apagadas con reduced-motion.
8. **La pantalla verde** solo para diagnóstico, memoria y control. Nunca para el contenido principal.

Lo que no es MADRE, aunque se parezca: fondos verdes en el diálogo, texto del cuerpo en mono, más de un acento por pantalla, logos de proveedores, animaciones en bucle sobre contenido, degradados decorativos, sombras de colores sin significado, esquinas cuadradas fuera de MOTHER, esquinas redondas dentro de MOTHER.

---

## 13 · Referencia rápida de archivos

| Archivo | Contiene |
|---|---|
| `public/styles.css` | Todos los tokens, componentes y animaciones. ~1 070 líneas, una hoja |
| `public/app.js` | La UI completa sin framework; `el()` crea nodos, `paint()` inyecta `--agent` |
| `public/brands.js` | Colores y monogramas por proveedor; punto de sustitución por logos oficiales con licencia |
| `public/index.html` | Esqueleto: barra, hilo, compositor, `safety`, diálogos de MOTHER, NOSTROMO, OVERRIDE, visor |
| `public/troubleshooting.js` | Catálogo de condiciones: severidad, `match`, diagnóstico, remedio y comandos por sistema |
| `docs/madre-banner.svg` | El banner del README con la marca y la paleta |

Cero dependencias en el cliente. Sin build. Lo que se ve es lo que hay en estos archivos.
