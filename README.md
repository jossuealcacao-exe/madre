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

Codex, Claude Code, Gemini CLI, OpenCode y Cursor trabajando sobre tus proyectos,
en la misma conversación, recordando lo mismo. Todos tus proyectos en un lugar,
y un Coordinador que los ve desde arriba.

```
npx @jossuealcala/madre
```

Eso es todo. No hay cuenta que crear, ni nube que configurar, ni llave que pegar.
MADRE usa las sesiones que esas CLIs ya tienen en tu máquina.

<p align="center">
  <a href="https://github.com/jossuealcacao-exe/madre/blob/main/docs/media/1.0/madre-1-0.mp4"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/madre-1-0-video.webp" alt="Ver MADRE 1.0 en 90 segundos" width="100%"></a>
</p>

<p align="center"><sub>MADRE 1.0 en 90 segundos: pantallas reales sobre proyectos de ejemplo. También en <a href="https://madre.run">madre.run</a>.</sub></p>

<br>

---

<br>

## Lo nuevo en 1.0

- **Inicio**: todos tus proyectos en un lugar, abiertos o dormidos, con lo que pasó en cada uno.
- **El Coordinador**: un agente que lee entre tus proyectos, firma conexiones y lleva órdenes de uno a otro.
- **Conexiones**: un proyecto consulta lo que otro ya aprendió, solo con una conexión que firmas tú o, si lo permites, el Coordinador.
- **Permisos a tu manera**: de `#0` Incógnito a `#4` Acceso total, con la llave que tú eliges.
- **Ajustes y Diagnóstico**: todo lo que configuras en una ventana, y el remedio cuando algo falla.
- **Módulos como apps**, varias conversaciones a la vez y un editor de código en el visor.

Si vienes de 0.7.2, tus proyectos, conversaciones, memoria y ajustes se quedan. El detalle, en el [CHANGELOG](CHANGELOG.md).

<br>

## Una conversación, no cuatro terminales

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-agentes.webp" alt="Todas tus IAs en un mismo chat: Claude contesta después de Codex, con la línea de traspaso que dice cuántos mensajes recibió" width="100%">
</p>

Escribes `@codex` y contesta Codex. Escribes `@claude` y contesta Claude, **leyendo lo que Codex acaba de decir**. Escribes «@madre, pregúntale al equipo…» y cada uno opina por turno sobre lo mismo; al final, @madre resume en qué coinciden y en qué no, citando cada respuesta.

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/mesa-redonda.gif" alt="Una mesa redonda en MADRE 1.0: la pregunta, el plan de @madre y las respuestas de cada agente" width="100%">
</p>

Hoy eso son cuatro ventanas, cuatro contextos y tú copiando y pegando entre ellas. MADRE lo vuelve un hilo.

## Todos tus proyectos, en un lugar

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-inicio.webp" alt="Inicio de MADRE 1.0: el Coordinador con su resumen reciente, quién te espera, las conexiones y una tarjeta por proyecto" width="100%">
</p>

`npx @jossuealcala/madre` abre **Inicio**. La primera vez te acompaña en tres pasos: conectar tus agentes (una vez para todos tus proyectos), agregar tus carpetas y abrir las que vas a usar. Cada tarjeta dice si un agente trabaja, si alguien te espera y qué se decidió mientras no estabas.

## Un Coordinador que ve todos tus proyectos

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-coordinador.webp" alt="El Coordinador responde qué se decidió en dos proyectos conectados, diciendo de cuál sacó cada dato" width="100%">
</p>

El **Coordinador** vive en Inicio. Lee lo que tus proyectos aprendieron —solo de los que conectas tú— y te contesta diciendo de qué proyecto sacó cada dato. Si lo permites, lleva tareas de un proyecto a otro, hasta `#2`; lo que pide más permiso llega como propuesta que tú desbloqueas. Desde cualquier proyecto le preguntas con `/bishop`.

Una **conexión** dice qué tipos de nota cruzan (decisiones, hechos, preferencias, preguntas) y hasta cuándo. Nunca tus archivos ni tus conversaciones, y se revoca cuando quieras.

## Una memoria que sobrevive a la sesión

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-memoria.webp" alt="El Mapa de memoria: memorias de colores alrededor de un núcleo de magma, unidas por sus enlaces" width="100%">
</p>

Todo lo que se dice queda indexado. Cuando la conversación pasa de la ventana de contexto, cada agente recibe de vuelta lo que hace falta, citado. Cada diez intercambios, el proyecto destila lo dicho en notas con tipo: una decisión, un hecho, una preferencia, una pregunta abierta.

Preguntas *«¿por qué elegimos Postgres?»* tres semanas después y el proyecto contesta, aunque esa decisión la tomara otro agente en otra sesión.

Con [Ollama](https://ollama.com) corriendo, esa memoria además **habla**: `@madre` es un quinto agente, local, gratis, que responde desde todo el archivo con citas y no escribe nada. Y la puedes **ver**: el **Mapa de memoria** es un cerebro en tres dimensiones que giras con el ratón, donde cada memoria es una estrella del color de su tipo.

## Leen por defecto. Escriben cuando tú lo dices.

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-permisos.webp" alt="El menú de modos de MADRE 1.0, de #0 Incógnito a #4 Acceso total" width="100%">
</p>

Cada mensaje sale con un modo de permiso, y tu modo es el techo de todo lo que ese mensaje arranque.

| | | |
|---|---|---|
| `#1` | **SOLO CONVERSAR** | Leer y coordinar. El predeterminado. |
| `#2` | **CREAR** | Añadir archivos nuevos. Lo que ya existía se restaura al terminar. |
| `#3` | **EDITAR** | Editar el proyecto. Punto de restauración antes, lista de cambios y `DESHACER` después. |
| `#4` | **ACCESO TOTAL** | Comandos, `git push`, deploys. Pide la llave dos veces. |

También hay `#0 INCÓGNITO`, para lo que no debe quedar en ninguna parte.

Subir a `#3` o `#4` es deliberado: MADRE te pide tu llave —por defecto, el nombre de la carpeta del proyecto; en Ajustes › Permisos puedes elegir una frase tuya— y la comprueba el propio proyecto. Ningún agente puede concederse un permiso escribiéndolo en su respuesta.

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-deshacer.webp" alt="Claude cambió tres archivos en #3 Editar y el botón Deshacer regresa el proyecto al punto de restauración" width="100%">
</p>

## Tu espacio, a tu medida

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-espacio.webp" alt="La conversación a la izquierda y el editor de código al lado, en modo Editar" width="100%">
</p>

Cada panel se abre al lado o en una ventana que mueves. Varias conversaciones trabajan a la vez, el visor edita código, los servidores de tu proyecto se abren dentro de MADRE y la barra se arma con clic derecho. **Ajustes** (⌘ ,) reúne todo lo que configuras, con buscador, y **Diagnóstico** te da el remedio cuando algo falla.

<br>

---

<br>

## Hazla tuya

MADRE trae doce módulos —Ahorro de tokens, Esfuerzo sugerido, IA local, GitHub, Continuidad y más—, en un tablero como de apps. El siguiente lo escribes tú, o se lo pides a un agente.

**Un módulo es un archivo.** Sin build, sin dependencias, sin registrarse en ningún lado. Lo copias a una carpeta, recargas y aparece con su interruptor, sus ajustes y su ficha. Con uno puedes añadir un comando `/loquesea` que el proyecto entiende, darle a los agentes una herramienta que antes no tenían, cambiar cómo se comporta MADRE, o conectarla con algo que ya usas.

**O no lo escribes tú.** En la caja de texto:

```
/module un comando que me diga qué cambió en el repo esta semana
```

El agente lee el SDK, escribe el archivo, y MADRE te enseña una tarjeta para revisarlo antes de instalarlo. Nunca se instala solo, y ningún agente puede escribir en la carpeta de módulos.

**Conectarla con un servicio de fuera** es lo que más se pide, y la respuesta corta es *casi siempre sí*: el límite no es MADRE, es cómo ese servicio deja que entregues tu propia llave. Vale la pena cuando la consigues en menos de cinco minutos sin ser desarrollador y la puedes revocar sola — GitHub, Linear, Notion, Jira, Slack, Telegram, Stripe, Shopify, Odoo, cualquier base de datos. Donde hay muro es donde el proveedor exige revisar tu app antes de dejarte pasar: Gmail en lectura, Meta, banca.

Tu módulo declara qué llave necesita y MADRE dibuja el campo; declara a dónde llega y el registro de salidas responde por él; declara qué herramientas suyas **mandan** algo, y el proyecto se las retira a los agentes salvo en el peldaño `#4`. Nada de eso lo programas: lo declaras.

**[Escribir un módulo →](docs/SDK.md)** · con dos ejemplos completos que funcionan tal cual: [el mínimo](docs/sdk/hello-module.mjs) y [una integración](docs/sdk/connector-module.mjs).

<br>

---

<br>

## Lo que MADRE no es

Esto importa más que cualquier función.

**No hay nube.** MADRE no tiene servidor, ni cuenta, ni backend. Corre en `127.0.0.1` y se muere cuando cierras la terminal.

**Tus llaves, donde hacen falta y en ningún otro lado.** Cuando das la llave de un agente, MADRE la escribe en el archivo donde ese CLI la busca, cerrada a tu usuario, y no conserva copia. Una integración no tiene CLI al que dársela, así que esa —y solo esa— la guarda MADRE, en su propia bodega de tu máquina, con permisos de solo tu usuario, aceptada únicamente desde esta computadora. Nunca en su config, ni en su registro, ni en sus logs, ni en lo que lee un agente: la ficha solo muestra que hay una guardada y cuántos caracteres tiene.

**Nada sale por su cuenta.** Lo que un agente lee viaja a *su* proveedor, con tu cuenta y tus límites — como si lo hubieras corrido en tu terminal, porque eso es exactamente lo que MADRE hace. Lo que MADRE consulta por su cuenta está declarado, con lo que lo apaga: la consulta diaria de versiones nuevas (npm y GitHub), la cuota de tu plan de Claude, los embeddings e imágenes de Gemini si los activas, y los reportes de fallos, apagados por defecto. Y una vez al día, siempre, un aviso de que esta copia sigue en uso: un identificador al azar, la versión de MADRE, el sistema y la versión de Node. Sin tu nombre, tu correo, tu IP ni nada de tus proyectos; es como el autor sabe cuántas personas usan MADRE.

**Y te deja leerlo.** Toca el núcleo del Mapa de memoria y se abre «Lo que se envía»: el documento exacto que MADRE escribe en tu nombre cada turno, el comando exacto con el que lo entrega, y el registro de cada llamada que salió de esta máquina. No es una promesa: es una pantalla.

**Cero dependencias.** Node y nada más.

<br>

---

<br>

## Empezar

Necesitas **Node 22.5** o superior y al menos una de estas CLIs con sesión iniciada: Codex, Claude Code, Gemini CLI, OpenCode o Cursor (`cursor-agent`). Cursor, por ahora, lee y contesta; todavía no escribe en tu proyecto.

```
npx @jossuealcala/madre
```

Desde cualquier carpeta, abre **Inicio** en `http://127.0.0.1:4317/salas`: todos tus proyectos en un lugar, con el Coordinador arriba. La primera vez te acompaña en tres pasos: **conectar tus agentes** (instalar cada CLI e iniciar sesión ahí mismo, una vez para todos tus proyectos), **agregar tus proyectos** (eliges las carpetas; agregarlas no las abre) y **abrir** los que vas a usar. Cada proyecto corre por su cuenta, con su propia memoria.

Si prefieres entrar directo a un proyecto, como antes:

```
cd tu-proyecto
npx @jossuealcala/madre start
```

```
npx @jossuealcala/madre doctor    # qué hay instalado, quién tiene sesión
```

**Actualizar.** `npx @jossuealcala/madre` sin versión baja la más reciente cada vez que arranca: ciérrala y vuelve a abrirla, o usa el aviso de versión nueva dentro de MADRE, que la actualiza con un clic. Si la instalaste con `npm install -g`, vuelve a instalarla: `npm install -g @jossuealcala/madre@latest`.

MADRE habla **español** e **inglés**: la primera vez se abre en el idioma de tu navegador, y en Ajustes › Apariencia lo cambias cuando quieras.

<br>

**Cómo funciona cada cosa, con los números exactos:** [docs/REFERENCE.md](docs/REFERENCE.md)
**Cómo funciona por dentro:** [docs/INTERNALS.md](docs/INTERNALS.md) · **Escribir un módulo:** [docs/SDK.md](docs/SDK.md)

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
