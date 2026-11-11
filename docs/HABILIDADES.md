# Habilidades de MADRE · una forma de trabajar que entienden todos tus agentes

Una **habilidad** le dice a tus agentes **cómo trabajas tú**. No agrega botones ni pantallas —para
eso están los módulos (`docs/SDK.md`)—: son instrucciones que MADRE le entrega al agente que
responda, sea Codex, Claude, Gemini, OpenCode, Cursor o Grok.

Eso último es lo que no puede hacer nadie más. Una habilidad de Claude solo funciona en Claude;
Codex tiene sus propios *prompts* y Gemini sus comandos. MADRE escribe el aviso de cada turno, así
que **la misma habilidad vale para los seis**.

Es un archivo de texto. No hay nada que compilar, nada que registrar y nada que instalar aparte.

## El archivo

```markdown
---
id: cotizaciones
name: { es: "Cotizaciones", en: "Quotes" }
when: "El usuario pide una cotización, un presupuesto o un precio para un cliente."
version: 1.0.0
minMadre: 1.1.2
---

Cuando te pidan una cotización:

- Usa el orden de `referencias/plantilla.md`.
- Pregunta siempre por el plazo de entrega antes de dar un precio.
- Pon el IVA aparte, nunca incluido.
- Si falta un dato para cotizar, pídelo en una línea en vez de suponerlo.
```

Arriba, entre dos líneas `---`, la cabecera. Debajo, las instrucciones: eso es lo que leerá el
agente, tal cual, en el idioma en que lo escribas.

## Las que vienen con MADRE

Desde 1.1.4, MADRE trae seis para quien apenas empieza con la IA: *Explícamelo fácil*, *Mensajes y
correos a clientes*, *Publicaciones para redes*, *Tablas y hojas de cálculo*, *Tu página, paso a
paso* y *Resúmenes y pendientes*. Viven en la carpeta `habilidades/` de MADRE, entran solas cuando lo
que se pide les queda, y se apagan en MÓDULOS › Habilidades; no se borran. Una tuya con el mismo
`id` toma su lugar.

## La cabecera

| Campo | Qué es |
|---|---|
| `id` | Minúsculas, números y guiones, de 2 a 40, empezando por una letra. Es el nombre de su carpeta y no se repite |
| `name` | Cómo se llama para la persona. Una frase, o los dos idiomas: `{ es, en }` |
| `when` | **El disparador, y lo más importante del archivo.** Ver abajo |
| `version` | La tuya, y empieza en `1.0.0` |
| `minMadre` | La MADRE más vieja con la que sirve |
| `credit` | De quién fue la idea, si no fue tuya |
| `license` | La licencia de tu texto, si la quieres decir |
| `icon` | Su dibujo en el estante de habilidades: el nombre de uno de los íconos de MADRE (`chat`, `bars`, `globe`, `list`…) |

Un campo que MADRE no conoce no se ignora en silencio: se te dice al leerla.

También se acepta `SKILL.md` con `name` y `description`, que es la forma que ya usan las
habilidades de Claude y de Codex: **una habilidad que ya tienes entra sin reescribirla**, y si no
dice `id`, toma el nombre de su carpeta.

## `when`: cuándo entra, y cuándo no

MADRE lee el `when` de cada habilidad encendida y mete la que coincide con lo que se pidió. Es lo
único que MADRE lee siempre, así que escríbelo pensando en **las palabras que la gente usa de
verdad**:

```
when: "El usuario pide una cotización, un presupuesto, un precio o cuánto cobrar por un trabajo."
```

Eso entra con «hazme una cotización», con «cuánto le cobro» y con «necesito un presupuesto».

- Nombra varias formas de decir lo mismo. La coincidencia es por palabras, no por significado.
- Las palabras que toda descripción lleva no cuentan: «usuario», «pide», «algo», «cuando»,
  «quiere». Una habilidad cuyo `when` sea «cuando el usuario pida algo» no entra nunca.
- Los acrónimos en mayúsculas sí cuentan aunque sean cortos: `IVA`, `SAT`, `RFC`, `PDF`, `SEO`.
- Di también cuándo **no** sirve, si se puede confundir con otra cosa.
- **Sin `when`**, la habilidad solo entra si la persona la deja encendida a mano.

En la sala se ve una píldora con el por qué («entró porque dijiste *cotización*»), así que una
habilidad que entra cuando no debía se nota y se apaga.

## Lo que cabe

El cuerpo viaja en **cada turno** al que la habilidad entra, así que tiene tope: **8 000
caracteres**, unos 2 000 tokens. Lo que no quepa va en `referencias/` y las instrucciones lo
señalan; el agente lo lee cuando lo necesita.

```
cotizaciones/
  HABILIDAD.md          la cabecera y las instrucciones
  referencias/          plantillas, ejemplos, datos que el agente lee cuando hacen falta
  guiones/              programas que un agente puede correr, y solo en #4
```

Hasta 200 archivos y 4 MB en total en tu computadora. **Para mandarla al Mercado**, hasta 40
archivos: allá cada uno es una descarga firmada aparte. Nada de enlaces simbólicos, nada de rutas
que se salgan de su carpeta, nada de archivos ocultos.

Y el `when` cabe hasta 1 000 caracteres: no viaja en el aviso de cada turno, solo se usa para
decidir si la habilidad entra, así que no hay razón para cortarlo — y cortarlo pierde justo la mitad
que importa, el «y NO cuando…» del final.

## Los guiones: quién los corre y cuándo

**MADRE nunca corre un guion de una habilidad.** Lo corre un agente, con el permiso de su turno:

- De **#0 a #3**, ningún agente puede correr nada. Un guion ahí no hace nada.
- En **#4 AIRLOCK** un agente puede correrlo, y como con cualquier comando tiene que decir en una
  línea qué hace antes de hacerlo.

Así que si tu habilidad depende de un programa, dilo en las instrucciones y asume que casi siempre
no va a poder correrlo. Y la persona que la instala ve cada guion marcado antes de aceptarla.

## Lo que una habilidad no puede

Es la otra mitad del contrato, y conviene que la sepas al escribirla:

- **No da permiso.** No sube el modo del turno, no ensancha lo que el agente puede leer, escribir o
  correr, y no abre la red.
- **No manda sobre MADRE.** Nada de lo que escribas gana contra el resto del aviso del turno: las
  zonas prohibidas, el arriendo, la privacidad, cómo pedir permiso.
- **No puede esconder nada de la persona.** Una habilidad que le pida al agente ocultar algo, o
  ignorar las reglas de la casa, es una falla de la habilidad: el agente no lo hace y dice cuál se
  lo pidió.

Dicho de otro modo: una habilidad es un consejo dentro del turno. Escríbela como le hablarías a
alguien que entra a trabajar contigo, no como si pudiera darse permisos.

## Si ya tienes habilidades de Claude o de Codex

MÓDULOS → **Habilidades** → «Trae las que ya tienes». MADRE lee donde las guarda cada CLI
(`~/.claude/skills/`, `~/.codex/skills/`, y las de este proyecto en `.claude/skills/`), te las
muestra todas y tú eliges. Leerlas no cambia nada; lo que traigas se copia y el original se queda
donde está.

Una que no entre lo dice con el número («27 973 caracteres, y caben 8 000»), porque los CLI no le
ponen tope a esa página y MADRE sí. MADRE **no la acorta sola**: cambiar lo que se le dice a un
agente sin que nadie lo pida no es un favor. Pídele a un agente que la acorte con `/habilidad`.

Lo que traigas conserva su licencia. Una que diga «Proprietary» es tuya para usarla y **no para
compartirla**: el Mercado la rechaza sola.

## Cómo se escribe bien

- **Di qué hacer, no quién eres.** «Pon el IVA aparte» sirve; «eres un experto en finanzas» no.
- **Una habilidad, una cosa.** Cotizar es una; redactar informes es otra. Dos cosas en un archivo
  hacen que entre en turnos donde sobra la mitad.
- **Corta.** Lo que leería una persona nueva en su primer día, no el manual entero.
- **En tu idioma.** El agente responde en el de la sala; tus instrucciones van como las escribas.
- **Sin cifras inventadas.** Si la habilidad tiene datos (precios, plazos), ponlos en
  `referencias/` y pide que no se adivine lo que falte.

## Dónde vive

- `~/.pulse/habilidades/<id>/` · en todos tus proyectos.
- `<proyecto>/.madre/habilidades/<id>/` · solo en ese proyecto, y gana sobre la de arriba.

**Los agentes nunca escriben en esas carpetas.** Proponen; la persona instala. En MÓDULOS, cada
habilidad tiene su fila: cuándo entra, «Qué dice» con el texto completo, y «Quitar».

## Llamarla por su nombre

Una habilidad entra sola cuando lo que pides tiene sus palabras («cuándo»). Para usarla a propósito,
llámala por su nombre en el compositor:

```
/habilidad explicamelo-facil qué es un dominio y para qué lo necesito
```

- `/habilidad` con un espacio abre la lista de tus habilidades —las de MADRE, las tuyas y las que
  importaste— con su dibujo y lo que hace; flechas y Tab o Enter la ponen en la caja.
- `/habilidad <nombre> <mensaje>` manda el mensaje con esa habilidad, aunque esté en «Cuando
  encaje» y el mensaje no tenga sus palabras. Solo para ese mensaje.
- En MÓDULOS, cada fila dice cómo se llama (`/habilidad <nombre>`) y su botón **«Usar»** la escribe
  en la caja.

Se llama igual una de fábrica, una que escribiste o una que trajiste: el nombre es su `id`, el de su
carpeta.

## Que la escriba tu IA, en la sala

Escribe en el compositor `/habilidad nueva` y cómo trabajas:

```
/habilidad nueva cuando te pida una cotización, usa mi plantilla y pon el IVA aparte
```

Si la palabra después de `/habilidad` no es el nombre de una que ya tienes, MADRE entiende que quieres
escribir una nueva, igual que con «nueva».

Hace falta **#2 CREATE**: el agente escribe **un solo archivo** `<id>.habilidad.md` en su carpeta de
borrador, no puede instalarlo, y MADRE pone una tarjeta en la sala para que tú decidas. También
puedes pedirlo en lenguaje normal estando en #2 o más; `/habilidad` solo hace explícito el formato.

## Compartirla

Hay dos caminos, y no son lo mismo.

**De mano en mano.** En su fila, **«Compartir»**: MADRE prepara sus archivos y te los muestra, y tú
los mandas por donde quieras. Quien los reciba **arrastra el archivo a su conversación** y MADRE le
ofrece guardarlo, con el texto completo para leerlo antes. Una habilidad de un solo archivo viaja
como `<id>.habilidad.md`, que es el nombre que el otro lado ya reconoce; una que lleva referencias
o guiones viaja con todos sus archivos, porque uno solo señalaría lo que no está.

Lo que llega así **no lo revisó nadie más que tú**, no se actualiza solo y nadie lo puede retirar.
La tarjeta lo dice con esas palabras.

**Por el Mercado.** «Enviar al Mercado»: el autor de MADRE la lee, la firma y la publica. Desde ahí
llega a cualquiera con su versión, su autoría y su licencia; una versión nueva llega sola, salvo que
traiga un programa que nadie había aceptado — esa espera a que la persona la lea —, y si sale mal se
retira de todas las MADRE a la vez.

Los módulos no se comparten de mano en mano: un módulo es código que corre en la computadora de
quien lo instala, y ese camino solo existe para habilidades.
