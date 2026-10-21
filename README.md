<p align="center">
  <a href="https://madre.run"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/madre-banner.png" alt="MADRE · Todas tus IAs en un mismo chat · Codex, Claude Code, Gemini CLI y OpenCode" width="100%"></a>
</p>

<p align="center"><b>Español</b> · <a href="README.en.md">English</a></p>

<p align="center"><sub><b>In English:</b> MADRE puts Codex, Claude Code, Gemini CLI, OpenCode and Cursor in one local chat on your machine, with one memory they all share. It opens in your browser's language, Spanish or English. <a href="README.en.md"><b>Read the full README in English →</b></a></sub></p>

<p align="center">
  <a href="https://www.npmjs.com/package/@jossuealcala/madre"><img alt="npm" src="https://img.shields.io/npm/v/@jossuealcala/madre?style=flat-square&label=npm&color=9bff66&labelColor=050605"></a>
  <a href="https://github.com/jossuealcacao-exe/madre/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/jossuealcacao-exe/madre/ci.yml?style=flat-square&label=CI&color=9bff66&labelColor=050605"></a>
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A5%2022.5-9bff66?style=flat-square&labelColor=050605">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencias-0-9bff66?style=flat-square&labelColor=050605">
  <img alt="license" src="https://img.shields.io/badge/licencia-AGPL--3.0-9bff66?style=flat-square&labelColor=050605">
</p>

<br>

# Todas tus IAs en un mismo chat.

MADRE es una app que corre en tu computadora y junta a las IAs que ya usas (Codex, Claude Code, Gemini CLI, OpenCode y Cursor) en un solo chat. Les escribes como a una persona, leen tu proyecto y tú decides qué pueden cambiar. Todas recuerdan lo mismo, así que no repites nada cuando cambias de una a otra.

```
npx @jossuealcala/madre
```

Necesitas Node 22.5 o más nuevo y al menos un agente con sesión. No hay cuenta que crear: MADRE usa las sesiones que tus agentes ya tienen en tu máquina.

<p align="center">
  <a href="https://github.com/jossuealcacao-exe/madre/blob/main/docs/media/1.0/madre-1-0.mp4"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/madre-1-0-video.webp" alt="Ver MADRE en 90 segundos" width="100%"></a>
</p>

## Qué hace

- **Un chat, todos tus agentes.** Escribes `@codex` y contesta Codex; escribes `@claude` y Claude contesta leyendo lo que Codex acaba de decir. Sin copiar y pegar entre ventanas.
- **Tú pones el límite.** Cada mensaje lleva un permiso: `#1` solo conversa, `#2` crea archivos, `#3` los edita con un punto para deshacer, `#4` corre comandos y te pide confirmar dos veces.
- **Una memoria para todo el proyecto.** Lo que se decide se guarda, y cualquier agente lo recibe cuando hace falta, aunque lo haya dicho otro hace semanas.
- **Todos tus proyectos en Inicio.** Ves en qué va cada uno, quién te espera, y un Coordinador que puede consultar lo que aprendió cada proyecto.
- **Código, notas, recordatorios y más.** Revisas y editas el código junto al chat, preguntas por cualquier línea, y enciendes módulos cuando los necesitas.

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-agentes.webp" alt="Claude contesta después de Codex en el mismo chat de MADRE" width="100%">
</p>

## En qué te ayuda

- **Dejas de saltar entre terminales.** Cuatro IAs, un hilo.
- **No explicas tu proyecto cada vez.** La memoria se lo cuenta al agente que preguntes.
- **No te llevas sustos.** Ningún agente cambia un archivo sin que subas el permiso, y lo que hace se puede deshacer.
- **Aprendes rápido.** La primera vez, MADRE te muestra cada cosa paso a paso, y el [manual](https://madre.run/manual/) trae capturas de cada pantalla.

## Lo nuevo en 1.0.5

- Un manual con capturas reales y cada paso marcado, dentro de MADRE y en PDF.
- Pistas que te enseñan Inicio y tu primer proyecto en minutos; si ya usabas MADRE, solo ves lo nuevo.
- Notas y Recordatorios, que también le pides a cualquier agente.
- En Código, preguntas por cualquier línea: explicar, mejorar, escribir pruebas o arreglar.
- Conectores con un clic: GitHub, Notion, Linear, Stripe y más.
- Cursor y Gemini muestran los modelos de tu plan, y Cursor ya trabaja con los cuatro permisos.

El detalle está en el [CHANGELOG](CHANGELOG.md).

## Tus datos

- **No hay nube.** MADRE no tiene servidor ni cuenta. Corre en `127.0.0.1` y se cierra cuando cierras la terminal.
- **Tus llaves no se copian.** Cada agente guarda su propia sesión; si pegas una llave, MADRE la escribe donde ese agente la busca y no conserva copia.
- **Sabes qué sale.** Lo que lee un agente viaja a su proveedor, con tu cuenta, como si lo corrieras en tu terminal. En Diagnóstico ves cada cosa que sale de tu computadora y cómo apagarla.
- **Cero dependencias.** Node y nada más.

## Empezar

```
npx @jossuealcala/madre             # abre Inicio
npx @jossuealcala/madre start       # abre directo el proyecto de la carpeta donde estás
npx @jossuealcala/madre doctor      # qué agentes hay y cuáles tienen sesión
```

MADRE se actualiza sola: el mismo comando baja la versión más nueva, y dentro de MADRE un aviso te deja actualizar con un clic. Habla español e inglés; la primera vez usa el idioma de tu navegador.

- **Manual:** [madre.run/manual](https://madre.run/manual/), también dentro de MADRE en Ajustes › Sistema.
- **Cómo funciona cada cosa:** [docs/REFERENCE.md](docs/REFERENCE.md) · **Por dentro:** [docs/INTERNALS.md](docs/INTERNALS.md) · **Escribir un módulo:** [docs/SDK.md](docs/SDK.md)

<br>

---

<br>

## Estado

Beta pública. El núcleo está probado y bajo CI en macOS y Linux con Node 22 y 24; la superficie sigue cambiando. Las decisiones que todavía duelen están escritas, sin adornos, en [*Lo que sale de la máquina*](docs/REFERENCE.md#lo-que-sale-de-la-máquina).

Una versión se cierra cuando está en npm. El detalle de cada una en [CHANGELOG.md](CHANGELOG.md); lo que viene, en el [roadmap](https://github.com/jossuealcacao-exe/madre/blob/main/docs/ROADMAP.md).

Problemas: desde cada remedio de Diagnóstico («¿No se arregló?») o en [issues](https://github.com/jossuealcacao-exe/madre/issues).
Seguridad: [SECURITY.md](SECURITY.md) · Contribuir: [CONTRIBUTING.md](CONTRIBUTING.md)

MADRE es gratis y seguirá siéndolo. Si te ahorra tiempo y quieres que siga creciendo,
puedes [apadrinarla](https://github.com/sponsors/jossuealcacao-exe). Nada del producto
cambia según lo que hagas con ese enlace.

AGPL-3.0 con términos adicionales · © 2026 [Jossue Alcalá](https://jossuealcala.com)

El código es software libre bajo la [GNU AGPL v3](LICENSE) con [términos adicionales](ADDITIONAL-TERMS.md):
úsalo, modifícalo y haz forks, siempre que tu versión siga abierta con la misma licencia y conserve
visible la autoría —«MADRE ‹versión› · © 2026 Jossue Alcalá» en la esquina de cada proyecto y de Inicio,
con enlace a jossuealcala.com, o «Desarrollado con MADRE de Jossue Alcalá» si lleva otro nombre—. El
nombre **MADRE**, su logo y madre.run son marcas de Jossue Alcalá: una versión modificada lleva otro
nombre. Hasta la 1.0.1, MADRE se publicó con licencia Apache 2.0. Qué se puede y qué no:
[TRADEMARKS.md](TRADEMARKS.md).

<br>

```
NOBODY DELETES MOTHER'S MEMORY.
```
