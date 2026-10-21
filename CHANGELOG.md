# Changelog

Todas las versiones publicadas de `@jossuealcala/madre`. Fechas en ISO.

Una versión se cierra cuando está en npm: hasta entonces su sección se llama **Sin publicar** y puede crecer. Cada versión publicada tiene exactamente una etiqueta `vX.Y.Z`, una release en GitHub y una sección aquí; el parche puede llegar a dos dígitos (`0.2.10`) antes de subir el menor. Ver `docs/ROADMAP.md` para el criterio de qué sube cada número.

## 1.0.5 · Sin publicar

- **Notas (módulo nuevo, 0.1, gratis).** Notas de seis colores en tu proyecto, cada una en una ventana que mueves por el lienzo y ajustas desde sus bordes, como cualquier otra ventana de MADRE. Cada nota lleva tres teclas dibujadas igual, sobre el papel: acomodar, la papelera, que la elimina (con «Deshacer» por si fue un error), y la ×, que solo la cierra. Se encienden y se administran desde Módulos, y su tecla se puede fijar en la barra. Solo tú las lees: ningún agente las ve y no se guardan en la carpeta del proyecto. Una nota grande se acomoda: el texto crece con ella, los colores quedan siempre al pie y, si la dejaste más grande que la pantalla, vuelve entera al abrirla.
- **Recordatorios (módulo nuevo, 0.1, gratis). Una idea de Daniel Castillo.** Cuando escribes algo que tienes pendiente («mañana reviso el PR», «recuérdame llamar a Daniel el lunes») o pides lo mismo varios días, aparece una tarjeta debajo de tu mensaje: «¿Te lo recuerdo?», con la hora ya elegida. Un clic lo guarda; «Otra hora» ofrece en una hora, esta tarde, mañana temprano, el lunes o todos los días. Si el proyecto tiene IA local, @madre lee el mensaje antes y descarta lo que no es una tarea; no se le pregunta a ningún agente de pago. Cuando llega la hora, te avisa Inicio, en «Te necesita» y al abrir MADRE, y también el proyecto de donde salió. También puedes escribir `/remind mañana a las 5 llamar a Daniel`. En su ficha eliges qué notar (lo pendiente, lo que pides seguido), si la IA local lo lee primero, la hora cuando no dices una y cuánto pospone; cada recordatorio se puede mover de hora, y los hechos quedan en un historial para repetirlos o vaciarlo. En el Mercado aparece «Desarrollado por Daniel Castillo».
- **IA local: eliges el modelo y todo vive en Ajustes.**
  - En Inicio › Ajustes › IA local eliges el modelo que usan todos tus proyectos: el que MADRE escoge solo o cualquiera de los que tienes instalados. Debajo aparecen otros modelos que caben en tu computadora (Llama, Gemma, Mistral, Phi y Qwen), cada uno con un botón para descargarlo. El recomendado para tu equipo va primero y está marcado.
  - Inicio gobierna la IA local de toda la computadora, como ya lo hace con los agentes: el servidor de Ollama, encenderlo o instalarlo, el interruptor general y qué proyectos la usan.
  - En cada proyecto, Ajustes › IA local tiene su interruptor para ese proyecto, el modelo en uso y lo que hace ahí.
  - IA local ya no aparece como módulo en el tablero de Módulos: cualquier camino que llevaba a él ahora abre Ajustes.
- **Cada proyecto con su color.** El acento que eliges en un proyecto vale solo para ese proyecto, e Inicio conserva el suyo. Un proyecto nuevo empieza con el de Inicio (Verde Madre, si no lo cambiaste). Las fichas del panel para cambiar de proyecto y los proyectos fijados en la barra de Inicio llevan el degradado del color de cada uno.
- **Proyectos fijados: encendido es abierto.** En la barra de Inicio, un proyecto fijado se ilumina con su color mientras está abierto y se apaga cuando duerme. Mientras despierta, su color lo va llenando de izquierda a derecha, y solo se enciende completo cuando ya está abierto. Si algo pasa ahí, como un agente que te espera, late hasta que lo abres. Ya no lleva punto.
- **La tecla de Conexiones ya no lleva número.**
- **Conectores MCP, un clic cada uno.** Ajustes › Herramientas externas (MCP) trae un catálogo de los servicios más conocidos, comprobados con MADRE el 20 de octubre de 2026 y agrupados:
  - **Documentación y código, sin cuenta.** Context7, DeepWiki, Microsoft Learn, Cloudflare Docs y Hugging Face. MADRE se conectó a cada uno y leyó sus herramientas.
  - **Con tu cuenta.** Notion, Linear, Jira · Confluence, monday.com, Zapier, Sentry, Vercel, Netlify, Supabase, Cloudflare, Stripe, PayPal, Square, Canva, Webflow y Wix. MADRE encontró su inicio de sesión; sus herramientas se leen en cuanto inicias sesión en su propia página.
  - **Con token.** GitHub, con un enlace para crearlo.
  - Cada conector lleva el logo y el color de su servicio. Los dibujos vienen de Simple Icons, CoreUI Brands y SVG Logos (CC0) y de VSCode Icons (MIT); DeepWiki lleva la marca de Devin, de sus mismos creadores. Las marcas son de sus dueños: TRADEMARKS.md lo dice y NOTICE incluye el aviso MIT.
  - Cualquier otro servidor MCP, tuyo o de alguien más, sigue entrando con «Agregar herramienta» o se importa desde tus apps. Cada herramienta conectada tiene **«Revisar conexión»**, que dice cuántas herramientas responden.
- **Un servidor MCP que deja abierta su respuesta ya funciona.** Algunos servidores en internet (DeepWiki, por ejemplo) responden por un flujo de eventos y no lo cierran. MADRE se quedaba esperando y la herramienta aparecía como «no contestó». Ahora toma la respuesta y sigue.
- **«Activo» en vez de «En calma».** Así se dice ahora el estado de un proyecto abierto sin nada en marcha, también el del Coordinador.
- **La respuesta de un módulo se ve como del módulo.** Lo que devuelve un comando de módulo (`/remind`, el Informe de trabajo) ya no parece una terminal: lleva el ícono del módulo, un título legible en tu idioma y su botón en tu color de acento. Los botones de los avisos también usan tu acento. Si la respuesta trae un botón (imprimir el Informe), va en la misma fila del título y la tarjeta conserva su forma de píldora.
- **Todos los íconos de Ajustes se mueven al pasar el ratón**, cada uno a su manera, en un proyecto y en Inicio. Antes solo lo hacían IA local y Lo que recuerda.
- **Íconos que se mueven al pasar el ratón.** En Ahorro de tokens, la flecha baja. IA local tiene un ícono nuevo, una red de nodos de trazo fino que da una vuelta sobre su propio eje. En Esfuerzo sugerido, la aguja barre de izquierda a derecha como al acelerar. En Lo que recuerda, giran solo las piezas que salen del cuadro central. Una tecla que está activa (Archivos con su panel abierto, Servidores, Conversaciones, Ajustes) ya no repite su animación al pasar el ratón.
- **Instalar Ollama en Linux sin ser administrador ya no falla en silencio.** El instalador de Ollama pide la contraseña de administrador y MADRE lo corría sin terminal donde escribirla. Ahora MADRE lo corre solo si eres root o si sudo no te pide contraseña; si no, te muestra el comando para pegarlo en una terminal y luego darle «Revisar otra vez». Lo mismo al actualizar Ollama.
- **Las ventanas de Inicio hacen scroll por dentro.** Ajustes conserva su cabecera y lo largo, como IA local, se recorre dentro de la ventana sin salirse por abajo. Lo mismo en las demás ventanas de Inicio.
- **El Mercado, más fácil de encontrar y de leer.**
  - En Módulos, el botón del Mercado tiene su cesta. La primera vez que abres Módulos, una tarjeta te invita a conocerlo.
  - Cada módulo muestra tres imágenes: qué hace, el módulo trabajando en un proyecto y los pasos para usarlo.
  - Cada módulo dice su versión. Los que vienen con MADRE dicen «Viene con MADRE 1.0.5».
  - Las descripciones se reescribieron para que se entiendan sin saber de programación.
- **«Te necesita» se lee como «Te esperan»:** un número grande, tranquilo en 0 y en tu color cuando algo te necesita.
- **Cursor ya no aparece como «No está instalado» cuando sí lo está.** MADRE lo busca también en la carpeta de tu usuario, aunque se haya abierto desde otra.
- **Para quien escribe módulos:**
  - El campo nuevo `credit` dice de quién fue la idea. MADRE lo muestra en la ficha del módulo y en el Mercado («Idea de …»).
  - Un módulo puede escribir su nombre, lo que hace y sus comandos en los dos idiomas, `{ es, en }`, y MADRE muestra el de la sala. Con `ctx.language` el módulo sabe en qué idioma contestar. Así, un módulo del Mercado ya no aparece en inglés en una MADRE en español.
- **Las conexiones, en modo neural.** El mapa de Conexiones de Inicio y su ventana usan el lenguaje del modo neural: cada proyecto es una neurona con dendritas, cada conexión un axón ligeramente curvo, y lo que cruza viaja como una señal de luz, sobre un fondo profundo.
- **El ícono de Conexiones es un conector** macho y hembra que se enchufa al pasar el ratón. El relleno de Módulos y Agregar widgets es ahora un tinte suave que deja aire entre las piezas.
- **Botones en una sola fila.** En la ventana de Conexiones, «Abrir el proyecto» y «Ver las conexiones» quedan juntos, y el panel lateral es un poco más ancho para que quepan.
- **Cursor sin instalar ya tiene salida.** Su tarjeta en Ajustes muestra el comando de su instalador oficial para copiarlo en una terminal y un botón «Revisar otra vez». La tarjeta de un agente sin sesión o sin instalar ahora también se puede cerrar.
- **Inicio, más limpio:**
  - **La barra de Inicio mide lo que contiene.** Ya no deja un hueco en medio: crece con cada proyecto y aviso y, cuando ya no cabe, pliega lo que sobra sin empujar nada fuera. La barra y sus botones de la derecha quedan juntos y centrados. En una ventana pequeña o en pantalla dividida, los proyectos fijados ya no desaparecen: se pliegan en «+n» solo cuando de verdad no caben.
  - **Íconos nuevos en la barra:**
    - El Mercado es una cesta de módulos que se sacude y los acomoda.
    - Los módulos de Módulos se llenan uno tras otro.
    - Agregar widgets tiene su propio dibujo (una pieza ancha, un cuadro y un círculo) y también se llena.
  - **El punto de un proyecto que te espera late suave** en la barra, en su tarjeta y en su tecla fijada.
- **Cambiar de proyecto, con tu color.** En el panel para cambiar de proyecto, cada ficha conserva sus iniciales sobre tu color de acento, con un degradado ligero.
- **Cuando OpenCode no puede contestar por su proveedor, la tarjeta trae la salida.** Si la llave de un proveedor se quedó sin saldo o ya no es válida, la tarjeta del error ofrece un modelo que sí funciona en tu computadora: el último que contestó o, si no hay ninguno, uno de los modelos gratuitos de OpenCode. Hay dos botones: **Reintentar con** ese modelo (manda de nuevo tu mensaje) y **Usarlo siempre** (lo deja como predeterminado). En Ajustes › Agentes › OpenCode, el proveedor que falló aparece marcado («Sin saldo» o «Su llave ya no es válida») hasta que vuelva a contestar. MADRE nunca cambia de modelo por su cuenta.
- **Los errores conocidos de los agentes se explican en español.** Cuando un agente falla por una causa que MADRE conoce, la tarjeta roja sigue mostrando lo que dijo el agente, tal cual, y debajo explica qué pasó y qué hacer. Ejemplos: la llave de API se quedó sin saldo (lo que le pasaba a OpenCode con un modelo de Anthropic) o el plan de Cursor llegó a su límite de uso. Esos errores ya no quedan «Aún sin clasificar» en Diagnóstico. «Cursor exited with code 1» ahora se lee «se cerró con el código 1».
- **La opción que eliges queda marcada.** En las tarjetas en las que un agente te pide elegir, la opción que mandaste lleva «Tu elección» y las demás se atenúan. Se ve igual al recargar o en otra pestaña.
- **DETENER TODO tiene la forma de los demás botones de la barra.** Ya no es una píldora roja aparte: en reposo es un botón apagado y, cuando hay algo que detener, se vuelve rojo sin parpadear.
- **Avisar no es alarmar.** «Un plan sigue corriendo» y «otro agente tiene EDITAR» ahora son avisos tranquilos de Diagnóstico, no alarmas en rojo, y ya no arman el freno.
- **«1 mensaje cargado», no «1 mensajes».**
- **Módulos de paga en el Mercado.** Un módulo puede tener precio: su página muestra **Comprar** (abre el pago de Lemon Squeezy en tu navegador) y **Tengo una licencia**, donde pegas la llave que te llega por correo. MADRE la revisa con Lemon Squeezy esa única vez y comprueba que sea de ese módulo; desde ahí funciona sin internet. Sin licencia, un módulo de paga no se instala; con ella, se actualiza solo como los demás. **Liberar** devuelve la activación para usar la llave en otra computadora. Solo viajan la llave y un nombre hecho con el identificador al azar de MADRE, nunca tu nombre ni tu correo, y la consulta aparece en la lista de lo que sale de tu computadora.
- **El historial del proyecto, para los módulos.** `ctx.services.history({ since, until })` da lo que se pidió y a quién, las respuestas, lo que costó cada agente, los archivos que cambió cada turno (y si se deshicieron) y las decisiones de la memoria. Solo lee; lo dicho en INCÓGNITO no aparece. Está en el SDK.
- **Una tarjeta de módulo puede abrir una página suya.** Un comando `/` de un módulo puede devolver `link`, y la tarjeta lo muestra como botón que abre otra pestaña. Solo se aceptan rutas del propio módulo.
- **Los comandos de un módulo encendido solo en un proyecto ya funcionan.** Un módulo encendido desde el Mercado de un proyecto aparecía encendido, pero su comando decía «no disponible» y no recibía los eventos de ese proyecto. Ahora MADRE lo considera encendido donde lo está.
- **El Mercado ya no dice «Gratis por ahora».**
- **@madre ya no inventa en un proyecto nuevo.** En un proyecto sin memoria, @madre describía archivos y funciones que no existían y citaba como fuente tu propia pregunta. Ahora, cuando no hay nada que citar, dice que la sala todavía no lo ha discutido y te propone a qué agente preguntarle para leer el código. Esta respuesta no usa el modelo ni gasta tokens.
- **OpenCode funciona sin cuenta.** OpenCode trae modelos gratuitos propios, pero MADRE lo marcaba «Sin sesión» y no dejaba escribirle. Ahora aparece listo desde el primer momento, con la nota «modelos gratuitos de OpenCode, sin cuenta».
- **Tu repositorio no se lleva el sello de MADRE.** La carpeta `.pulse/` que MADRE crea en tu proyecto guarda el sello de MU/TH/UR, y un `git add .` lo podía subir a tu repositorio. Ahora esa carpeta trae su propio `.gitignore`, y los proyectos que ya tenías lo reciben la próxima vez que los abres.
- **Los agentes de Ajustes se despliegan donde haces clic.** En Inicio › Ajustes › Agentes, al abrir un agente toda la ventana se movía y la tarjeta se escapaba del cursor. Además, la lista se rehacía cada 2,5 segundos y a veces se perdía el clic. Ahora la ventana se queda fija, el agente que abres se ve completo y la lista solo se redibuja cuando algo cambia. Lo mismo con las tarjetas de proyectos en Inicio: el botón «Abrir» ya no cambia mientras lo pulsas.
- **Sin novedades viejas para quien llega por primera vez.** Quien instala MADRE por primera vez ya no recibe cinco tarjetas seguidas de «Nuevo:» sobre cosas de 1.0.2, ni avisos encimados. Además, «Nuevo: agregar widgets» volvía cada vez que abrías Inicio; ahora se cierra para siempre.
- **Cada aviso de novedades sale una sola vez.** Las tarjetas «Nuevo:» y las de «la primera vez» de cada proyecto (Ajustes, Módulos, Memoria…) recordaban que ya las viste solo en ese puerto. Como un proyecto abre en el primer puerto libre, volvían a salir cuando le tocaba otro. Ahora MADRE las recuerda por persona, igual que las de Inicio, y conserva las que ya habías cerrado. El tablero de novedades de una versión también cuenta como visto en cuanto aparece: antes volvía si apagabas MADRE con él abierto.
- **La terminal ya no dice «Listos» antes de iniciar sesión.** Al arrancar, MADRE escribe qué agentes están instalados y te remite a Ajustes › Agentes para ver cuáles tienen sesión.

## 1.0.4 · 2026-10-19

- **Cursor en la bienvenida.** La animación de «Conecta tus agentes» mostraba cuatro agentes alrededor de MADRE; ahora Cursor está arriba, y se enciende al conectarse como los demás.
- **Los servidores de tu proyecto se abren aunque escuchen en toda la red.** Node, Express y Vite con `--host` escuchan en todas las interfaces de tu computadora, y la vista previa los nombraba («está abierto a toda la red · inícialo en 127.0.0.1») sin dejar abrirlos. Ahora se abren igual, dentro de tu computadora, y la lista avisa «tu red también lo alcanza». Los servidores de otras carpetas siguen sin mostrarse.
- **El punto de estado del proyecto siempre se ve.** Junto al nombre del proyecto, en la barra, el punto que dice si está en vivo se cortaba cuando la barra iba justa. Ahora el que cede es el nombre, con «…», y el punto queda siempre entero.
- **La barra de Inicio vuelve a caber.** Con las teclas Mercado y Módulos, la barra de Inicio se metía debajo de los botones de la derecha y los proyectos fijados quedaban reducidos a «+5», sin espacio para moverlos ni soltar uno nuevo. Ahora, cuando no cabe, primero se oculta el nombre de la computadora, luego las teclas se quedan con su ícono (su nombre aparece al pasar el ratón) y al final se ocultan los agentes. Los proyectos conservan siempre su lugar, también mientras acomodas la barra.

## 1.0.3 · 2026-10-17

- **Un espacio de código junto a la conversación.** La tecla nueva `CÓDIGO` de la barra abre tus archivos a un lado de la conversación, sin dejarla: la lista del proyecto con su buscador, pestañas para lo que tienes abierto y, sobre el código, la ruta y la función donde estás. ⌘P (Ctrl+P fuera de macOS) abre cualquier archivo por su nombre. Cambiar de pestaña no pierde lo que escribiste: el borrador se queda en su pestaña, con un punto, hasta que guardas o descartas, y las pestañas siguen ahí cuando vuelves al proyecto. En las barras que ya tenías acomodadas, `CÓDIGO` aparece junto a Agentes.
  - **Lo que cambió un agente, en su color.** Después de un turno en #3 EDITAR, las líneas que cambió el agente quedan marcadas con su color, y cada cambio trae tres botones: **Conservar**, **Deshacer** (solo esas líneas; lo demás del turno se queda) y **Preguntar por qué**, que se lo pregunta en la conversación. Arriba del código, «@claude · 2 cambios por revisar» te lleva de uno a otro. Si deshaces el turno completo con DESHACER, o reescribes tú esas líneas, dejan de marcarse.
  - **Acciones sobre lo que seleccionas.** Al pedir revisión de unas líneas aparecen Explicar, Mejorar, Escribir pruebas y Arreglar, cada una con su pregunta lista para el agente.
  - **Al lado.** En un Markdown, el documento renderizado se actualiza mientras escribes; en una página HTML, se recarga al guardar. Para la página hace falta Vista previa, y si está apagada el botón para encenderla está ahí mismo.
- **Gemini se conecta con tu llave de Google AI Studio, sin terminal.** En Ajustes › Agentes, en Conecta tus agentes y en Inicio, lo primero en la tarjeta de Gemini es el campo para pegar tu llave de API de Google AI Studio, con el enlace para sacarla: MADRE la escribe donde la busca el CLI de Gemini, solo legible por ti, y no guarda copia. Debajo está el botón «Cuenta de Google», que abre tu navegador para elegir tu cuenta, para las cuentas que Google todavía acepta en Gemini CLI: Google rechaza las cuentas personales gratuitas (responde «IneligibleTierError» y pide migrar a Antigravity). Antes había que abrir una terminal, correr `gemini` y escribir /auth. Todo pasa por el CLI oficial de Google y MADRE no lee ni guarda tu sesión. Si cancelas, Gemini queda como estaba. Con la sesión ya iniciada, cada agente muestra un solo «Iniciar sesión otra vez», como Codex; en Claude eliges la cuenta (suscripción o Anthropic Console) después del clic.
- **OpenCode se conecta con GitHub Copilot, sin terminal.** La tarjeta de OpenCode, en Ajustes › Agentes, en Conecta tus agentes y en Inicio, tiene ahora el botón «GitHub Copilot»: MADRE corre `opencode auth login -p github-copilot`, elige github.com por ti y muestra en la sala la página (github.com/login/device) y el código que escribes ahí, con su botón para copiarlo. Al autorizar en GitHub, OpenCode queda conectado a tu suscripción de Copilot (Pro, Pro+, Business o Enterprise). Todo pasa por el CLI oficial de OpenCode y MADRE no lee ni guarda tu sesión. Desde la sala solo se ofrecen los proveedores que permiten este acceso a herramientas de terceros: la suscripción de Claude nunca, porque Anthropic no lo permite; ChatGPT y GitLab, todavía no, hasta que OpenAI y GitLab lo confirmen por escrito. Esos y GitHub Enterprise siguen en «¿Prefieres tu terminal?» con `opencode auth login`, y las llaves de los demás proveedores se siguen pegando en la sala.
- **La terminal, como segunda opción y nunca obligatoria.** Debajo de cada agente, «¿Prefieres tu terminal?» despliega el mismo paso (instalar o iniciar sesión) escrito como comando, con su botón para copiarlo. Los botones de MADRE siguen siendo el camino principal, y la tarjeta de un agente sin instalar ya no muestra el comando de npm en su primera línea.
- **El Coordinador puede aprender de tus proyectos.** En Inicio, cada conexión que lee el Coordinador tiene una casilla nueva, «El Coordinador aprende de él», apagada hasta que la marcas tú. Con ella, al exportar los datos de entrenamiento del Coordinador entra todo lo que ese proyecto comparte (no solo lo que coincida con una pregunta), cada nota con el nombre de su proyecto para que nunca los mezcle. Si el proyecto está dormido se usa la copia de la última vez que respondió, y el panel dice de dónde salió cada cosa. Quitar la casilla o revocar la conexión borra esa copia; un modelo ya entrenado conserva lo aprendido hasta que lo vuelvas a entrenar. Además, la exportación de entrenamiento de cualquier proyecto lee ya todas sus conversaciones, no solo la abierta.
- **Apagar MADRE desde la barra.** Un botón de encendido al final de la barra superior, en Inicio y en cada proyecto. Pregunta antes («¿Apagar MADRE?», con cuántos proyectos se cierran) y luego cierra todo en orden: cada proyecto abierto detiene a sus agentes, guarda lo pendiente y libera su puerto, y al final se cierra Inicio. La página queda diciendo que MADRE está apagado. Ollama sigue corriendo, porque es su propio programa.
- **Inicio recuerda cómo lo acomodaste.** El orden y el tamaño de los widgets, el orden de los proyectos, los proyectos fijados en la barra y cómo se leen las tarjetas se guardan en MADRE y ya no en cada pestaña. Siguen iguales aunque abras Inicio desde otro proyecto o vuelvas a abrir MADRE y le toque otro puerto.
- **La IA local y las notas entregadas, también en Ajustes.**
  - Los Ajustes de cada proyecto tienen una sección nueva, «IA local», con lo mismo que Módulos › IA local, incluido «Tu computadora». Inicio › Ajustes › IA local también muestra «Tu computadora».
  - «Lo que recuerda» tiene un bloque «Notas entregadas» con Aceptar y Rechazar.
  - Cuando hay notas esperando, la barra del proyecto lo avisa («1 nota por aceptar») y te lleva directo a ellas.
- **Los proyectos conectados comparten su estado.** Una conexión puede permitir algo más que leer notas: con «Comparte su estado», quien lee también lee el estado de Continuidad del otro proyecto (objetivo, fase, siguiente paso, bloqueos, último traspaso, decisiones aceptadas y lo pendiente). Nunca viajan sus archivos ni su código. Si el Coordinador aprende de ese proyecto, el estado entra a su entrenamiento como una foto con fecha.
- **Notas entregadas entre proyectos.** Con «Recibe notas entregadas», el proyecto que lee puede pasarle notas al otro. Llegan como una tarjeta con Aceptar y Rechazar, y solo entran a su memoria si las aceptas tú o un agente de ese proyecto en #3 EDITAR o más. Ningún proyecto escribe directo en la memoria de otro.
- **El examen del Coordinador local.** Con @madre, el Coordinador solo respondía. Ahora su modelo local puede presentar un examen desde Entrena tu propia IA, en Inicio, con tres partes:
  - preguntas reales sobre tus proyectos;
  - preguntas sobre cosas de las que nunca se habló;
  - órdenes de prueba.

  Si aprueba, da órdenes hasta #1 y no propone conexiones. Si vuelves a entrenarlo o cambias de modelo, el examen deja de valer.
- **La IA local se mide en tu computadora.** Módulos › IA local tiene un bloque nuevo, «Tu computadora»: lee tu equipo (chip Apple y su memoria compartida, tarjeta NVIDIA y su memoria de video, o solo el procesador) y lo compara con el mínimo de cada tamaño de Qwen2.5, de 0.5B a 72B, para correrlo y para entrenarlo. Dice qué modelo usar en el día a día, cuál puedes entrenar y qué funciones vale la pena encender: buscar por significado, quien resume la memoria, @madre, el Coordinador con IA local y entrenar. El botón para descargar el modelo propone el que tu equipo corre bien, en vez de 3B para todos. Si descargas uno más grande (7B, 14B, 32B o 72B), @madre lo usa. En Entrena tu propia IA eliges el tamaño y los comandos se ajustan: desde 3B la base viene en 4 bits, se une con `--de-quantize` y Ollama la guarda en 4 bits. Si un tamaño no alcanza en tu equipo, la receta dice cuánta memoria pide.
- **Puedes subir mientras un agente trabaja.** La conversación ya no te regresa al final cada vez que algo cambia de alto: en cuanto subes, se queda donde la dejaste, sin temblar. Si mientras lees termina una respuesta o un plan, aparece sobre la caja de escribir un botón redondo con un punto del color de quien contestó; un clic te lleva abajo y se va solo cuando llegas. Y saltar a una parte del historial que nunca habías visto (arrastrando la barra, con Inicio o buscando) ya no hace brincar la conversación: al abrirla, cada mensaje se mide una vez en segundo plano y el navegador recuerda su alto real.
- **Los avisos nacen de un punto.** El aviso que flota sobre la caja de escribir empieza como el punto de su color, se abre en su píldora y al irse vuelve a cerrarse en el punto, con una sombra suave que lo despega del fondo. Mientras está, la última línea de la conversación sube lo que mide el aviso, así que ya no tapa al aviso del chat que dice lo mismo.
- **Un comando con punto de restauración se ve como los demás avisos**: esquinas redondeadas y su DESHACER debajo, en vez de una cápsula que se inflaba en círculo. Las píldoras de los comandos largos ya no se cortan a la derecha: respetan el carril del agente y acaban en «…».
- **Los comandos largos se pueden correr.** Una línea de varios cientos de caracteres (un `npx tsx -e "…"`, un `node -p`) ya no queda en «No corre: es demasiado larga»: la tarjeta la muestra completa, se recorre dentro de su botón si es muy alta, y corre. El límite solo frena una línea desbocada (más de 4,000 caracteres).
- **La caja de escribir no se aplasta.** Con HUMANO › COPILOTO › AHORRO DE TOKENS › @AGENTE y el ahorro de tokens encendido, el texto se escribía letra por letra en un renglón. Ahora el texto conserva su ancho, la dirección se corta con «…» antes que el agente al que le escribes, la ficha del ahorro de tokens no se parte en renglones y, con muchos renglones, la primera línea visible se desvanece bajo el borde.
- **Modo neural en los mapas.** El Mapa de memoria y el Mapa de proyectos tienen una tecla nueva, **Neural**, que dibuja la misma red como las neuronas de un cerebro: cada memoria es un punto de luz en su color, los enlaces son axones finos y solo se encienden los caminos por donde viaja algo, con la neurona a la que llega. El núcleo y el Coordinador se vuelven el bulbo central del cerebro, que late. Al encenderlo, la luz sale del centro y va prendiendo cada neurona. Se ve lo mismo con mucho menos trabajo para tu computadora; si al mapa le faltan cuadros, la tecla te invita a probarlo, y tú decides cuándo usar cada modo. La elección vale para Inicio y todos tus proyectos.
- **Los mapas cierran como las demás ventanas.** En el Mapa de memoria y en el Mapa de proyectos, «Salir ×» y «Volver a Inicio ×» son ahora la × de Ajustes y Conexiones. Los avisos de primera vez de Inicio ya no aparecen sobre el Mapa de proyectos: esperan a que lo cierres.
- **Tu propia imagen de fondo.** En Ajustes › Apariencia, la última tecla de los fondos es «Tu imagen»: eliges una foto (PNG, JPEG o WebP) y queda de fondo al instante, ajustada a la pantalla como los fondos de MADRE, con su capa o su malla en sus propios colores, su intensidad y su desenfoque. «Encuadre» muestra la foto completa con el recuadro de lo que se ve en tu pantalla; lo arrastras para elegir qué parte queda a la vista. La imagen es una sola para Inicio y todos los proyectos (cada uno decide si la usa) y se puede cambiar o quitar ahí mismo. Se guarda en tu computadora, en `~/.pulse/wallpaper/`, reducida a 2880 px por su lado mayor.
- **Una sola escala de íconos.** Cada ícono toma uno de cuatro tamaños según lo que lo contiene: la marca dentro de una píldora, la tecla o el dibujo junto a una palabra, la tecla cuadrada y el botón que flota. Las teclas de Inicio, recargar, Ajustes y apagar toman el tamaño de las de la barra cuando esta se pliega. Lo que aún usaba signos de texto como ícono (el ⚙ de «Agentes en Ajustes», las flechas ‹ ›, los ▸ ▾ de carpetas y pliegues, el ↗ de lo que se abre fuera y el ◉ de «sigue abierto aquí» o «memoria guardada») usa ahora los dibujos de la sala.
- **La barra con un panel al lado.** Con Código acoplado y la conversación angosta, la barra vuelve a medir qué cabe: lo que no entra pasa a «Más» en vez de quedar debajo de Inicio, el nombre del proyecto se lee completo y, si hace falta, «1 nota por aceptar» se reduce a su bandeja y su número. Lo que cambia en una ventana angosta (mensajes más anchos, la palabra de Crear) cambia también ahí.
- **Acomodar la barra sin que se desborde.** Mientras la acomodas, una barra con más teclas de las que caben se desplaza de lado dentro de su caja, también con la rueda del ratón, y la tecla que arrastras ya no sale de ella. «Agregar a la barra» se lee mejor: el título con su indicación debajo, cada tecla como se verá en la barra con su «+» y su nombre completo.
- **Preguntar sobre el código, más claro.** Al preguntar por unas líneas, el agente elegido se ilumina y los demás quedan apagados. La tarjeta de lo que cambió un agente ya no lleva el borde de color a la izquierda. En «Lo que se envía», la barra de desplazamiento va en el borde de la ventana, fuera de las tarjetas.
- **Detalles que se veían mal**: el anillo del avatar que piensa ya no se corta por la izquierda; el punto de aviso del botón de conversaciones va montado en su esquina, por fuera; la receta para entrenar tu IA (Mac y Linux) muestra cada comando completo con Copiar a la vista; el reloj del agente que trabaja ya no deja un recuadro gris de ayuda bajo el cursor ni obliga al navegador a reacomodar las ventanas cada segundo; en la barra de arriba, el botón de widgets de Inicio late al pasar el ratón y llena sus cuadros al abrirse, y las sombras de Conexiones, Mapa, Módulos, Diagnóstico y Código son más suaves; Código, al pasar el ratón, toma el color de acento y dibuja una / entre < >, y abierto se queda así; y «sigue abierto aquí» queda centrado con las preguntas que tiene debajo, porque su × ya no lo empuja a un lado.
- **Codex ya no pide #4 para leer en #3.** Codex lee los archivos con la terminal (`cat`, `sed`, `rg`) y el aviso de #3 le decía «no puedes correr comandos»: a veces respondía «Necesito #4 por 5 min» para abrir el archivo que debía editar. Ahora, solo a quien lee con la terminal, MADRE le aclara que leer con comandos de solo lectura está bien y que lo que no corre son programas (pruebas, builds, instalaciones, servidores). Claude y OpenCode no cambian: leen con sus propias herramientas.
- **Gemini dice por qué Google lo rechaza.** Cuando Google rechaza la cuenta personal gratuita, la respuesta ya no es el genérico «Google rechazó las credenciales»: dice que Google ya no acepta ese inicio de sesión y que pegues una llave de Google AI Studio en Ajustes › Agentes › Gemini, y Diagnóstico encuentra su remedio. La tarjeta de Gemini ya no promete un plan gratuito.
- **La mesa redonda habla en tu idioma también cuando alguien no contesta.** Si un agente falla, el resumen de @madre cita el motivo en el idioma de la pregunta; antes podía salir en inglés en medio de un resumen en español.
- **Cuando un agente dice que creó algo que no existe, MADRE lo dice claro.** El aviso ya no es una línea que se hace punto a los diez segundos: dice «@agente dijo que creó gastos.html, pero no está en tu proyecto», que no se escribió nada, y trae «Pedirlo otra vez», que regresa la misma petición a la caja con una nota para el agente. Un plan que menciona los archivos que harán sus pasos ya no dispara este aviso.
- **Ollama ya no parece un servidor tuyo que se cayó.** Ollama abre un proceso propio por cada modelo que carga (`llama-server`, con su puerto) y lo cierra cuando lo descarga tras unos minutos sin uso. Si Ollama se había abierto desde la carpeta de un proyecto, ese proyecto avisaba «tu servidor :53328 se detuvo». Ahora ese proceso cuenta como parte de Ollama.
- **Un aviso de primera vez nunca se queda fuera de tu alcance.** La tarjeta sigue a lo que señala mientras te mueves por la página. Si lo que señala queda arriba o abajo de lo que ves, en el borde aparece una píldora con su título y «Sube para verlo» o «Baja para verlo», que te lleva ahí con un clic. Antes, un aviso sobre un widget de más abajo nacía fuera de la pantalla y no había cómo cerrarlo.
- **Inicio habla un solo idioma.** En una MADRE nueva que adopta el idioma de tu navegador, los títulos de los widgets se quedaban en español aunque todo lo demás cambiara a inglés.
- **Cursor, el sexto agente.** Si tienes Cursor y su programa de terminal (`cursor-agent`), MADRE lo encuentra y lo pone junto a los demás: le escribes con `@cursor`, entra a planes y mesas redondas, y en Ajustes › Agentes inicias sesión con tu cuenta de Cursor desde un botón. Por ahora lee y contesta: cada turno corre en su modo de solo preguntas, con una configuración hecha para ese turno que no le deja escribir ni correr comandos, y que se borra al terminar. Tu sesión de Cursor no se toca. Escribir en tu proyecto (#2 a #4) llegará cuando se haya probado su confinamiento.
- **Los agentes, con dibujos propios.** Codex, Claude, Gemini, OpenCode y Cursor tienen dibujos nuevos de MADRE que recuerdan la marca de cada uno sin copiar su logo: la flor anudada, la chispa, la estrella de cuatro puntas, el bloque y el cubo con su puntero.
- **Un agente que no puede contestar se ve apagado.** Sin sesión, sin instalar o sin un adaptador que MADRE pueda usar, el agente queda gris en la barra del proyecto y en la de Inicio, y sale del selector de la caja de escribir. Si le escribes con su nombre, el mensaje se queda en la caja y se abren sus Ajustes para conectarlo.
- **Crea un proyecto desde cero.** En «Agregar proyecto», en Inicio y en la bienvenida, la opción nueva «Nuevo proyecto» crea una carpeta vacía con el nombre que escribas, en tu carpeta personal o en la que estabas recorriendo, y la agrega a Inicio. Nunca escribe encima de una carpeta que ya existe, y explica por qué si el nombre no sirve.
- **MADRE en el aire de Inicio.** Sin fondo de pantalla, detrás de Inicio hay dos nubes muy tenues de la paleta de MADRE que se mueven despacio: su verde en el tema claro, y en el oscuro su verde fósforo con un rastro de cian y ciruela. Con «menos movimiento» se quedan quietas.
- **Gemini no se queda con una cuenta que Google rechaza.** Google deja iniciar sesión con una cuenta personal gratuita y la rechaza después, en la primera pregunta. Ahora el botón «Cuenta de Google» espera esa primera respuesta: si Google rechaza la cuenta, Gemini queda como estaba (con tu llave, si la tenías) y MADRE te dice por qué.
- **Los avisos dentro de una ventana son la misma tarjeta que los demás.** En Ajustes, el aviso de la primera vez ya no es una franja pegada a los bordes: es la tarjeta de siempre, con sus márgenes y su botón pequeño a la derecha.
- **Los errores, en tu idioma.** El aviso de que Google rechazó la cuenta de Gemini, y otros tres de Gemini, se leen en español aunque se hayan guardado en inglés.
- **El anillo del agente que piensa se ve entero.** En Chrome, el anillo que late alrededor del avatar se cortaba en seco por la izquierda.
- **El Mercado.** Una tienda de módulos a pantalla completa, en Inicio (tecla «Mercado») y en cada proyecto (Módulos › Mercado). Arriba, un carrusel con los destacados, cada uno con su ilustración; debajo, estantes por lo que hace cada módulo («Sin pasar por la terminal», «Para crear», «IA en tu computadora», «Conéctalo») y una página por módulo con su precio (todo gratis por ahora), dónde está encendido, su vista previa, qué hace y qué toca. Cada módulo tiene un ícono nuevo, con su dibujo sobre sus propios colores.
  - **Para este proyecto, para todos o para uno.** Abierto desde un proyecto, «Obtener» lo enciende solo en ese proyecto. Abierto desde Inicio, eliges «para todos tus proyectos» o «solo en» uno. Un módulo que escribe en la carpeta (Continuidad) te lleva a su tarjeta en Módulos, donde lees los comandos antes de que corran.
  - **Módulos en Inicio.** La tecla nueva «Módulos» muestra lo que tienes encendido o instalado y en qué proyectos: un interruptor para todos tus proyectos y una pastilla por proyecto para encenderlo o apagarlo solo ahí. Un cambio llega a cada proyecto abierto con su siguiente mensaje, sin reiniciarlo.
  - **En la conversación.** Si pides algo que un módulo apagado haría (abrir tu página en un navegador, crear una imagen, ver tus pull requests), aparece debajo una tarjeta con «Encender», «Verlo en el Mercado» y «No, gracias».
  - **Módulos nuevos sin esperar a una versión de MADRE.** El Mercado se actualiza desde madre.run cada vez que MADRE se abre: los módulos nuevos, los destacados y sus textos llegan con un catálogo firmado por el autor, y MADRE no lee uno que no verifique con la llave que trae dentro ni instala un archivo cuya huella no sea la del catálogo. Sin internet, usa lo último que verificó. Un módulo obtenido del Mercado se actualiza solo cuando sale una versión nueva y te lo dice una vez, con lo que cambió. Las novedades del Mercado y los módulos nuevos se anuncian una vez, con un botón «Verlo». La conexión está en la lista de lo que sale de tu computadora, y se apaga con «Buscar versiones nuevas» o `PULSE_MARKET=0`.
- **El interruptor de un módulo en un proyecto es de ese proyecto.** En Módulos de un proyecto, encender o apagar un módulo ya no lo cambia en todos tus proyectos: la fila dice «Encendido en este proyecto». «Para todos» se decide en Inicio.
- **SDK: `ready`, `footer` y un interruptor por proyecto.** Un módulo puede declarar `ready(ctx)`, lo que pide antes de encenderse (en un proyecto, en todos o desde el Mercado), y `footer`, hasta dos teclas junto a la versión de MADRE que dibuja MADRE: un ícono suyo, las palabras del módulo y una dirección https. `ctx.settings.enabled` ya es el de este proyecto: MADRE guarda en `rooms` lo que dijo cada uno. El contrato pasa a 38 campos. El primer módulo del Mercado que lo usa es «Donar»: un corazón junto a la versión para apoyar a MADRE en GitHub Sponsors.
- **Continuidad sin terminal.** En un proyecto sin git, MADRE corre `git init` por ti antes de instalarla, y lo dice en la misma confirmación. En una Mac sin git, el aviso trae el botón que abre el instalador de Apple. Los textos de los módulos se leen en tu idioma, y las rutas y comandos se ven como están escritos.
- **El navegador de pruebas trae su navegador.** Al encender el Navegador de pruebas, si falta el servidor o el navegador, MADRE los descarga y vuelve a probar antes de decirte nada; mientras tanto avisa que puede tardar unos minutos. Si npm falla, el aviso dice el motivo de npm en vez de la ruta de su registro.
- **Abrir MADRE con `npx` ya no rompe Continuidad ni el Navegador de pruebas.** Las variables que deja `npx` hacían que los comandos que MADRE corre por ti intentaran instalar el paquete de MADRE otra vez.
- **Con un Node viejo, un aviso claro.** En un Node anterior a 22.5, `madre` dice qué versión hace falta y cómo instalarla (nodejs.org o `nvm install 22`), en vez de los avisos de npm y un «Permission denied».
- **MADRE en un servidor sin pantalla.** La referencia explica cómo abrirla en un servidor y verla desde tu computadora con un túnel SSH.
- **Detalles**: las cajas con comandos vuelven a mostrar su ícono de copiar; al abrir una conversación nueva en modo ventana, la ventana ya no se queda pegada en la esquina; y el registro de un módulo que se instala se lee sobre el fondo de la sala, en letra de código.

## 1.0.2 · 2026-10-16

**Licencia nueva.** Desde 1.0.2, MADRE es software libre bajo la **GNU AGPL v3** con [términos adicionales](ADDITIONAL-TERMS.md) según su sección 7: cualquiera puede usarlo, estudiarlo, modificarlo y hacer forks, también con fines comerciales, siempre que su versión siga abierta con la misma licencia y mantenga visible la autoría —«MADRE ‹versión› · © 2026 Jossue Alcalá» en la esquina de cada proyecto y de Inicio, con enlace a jossuealcala.com, o «Desarrollado con MADRE de Jossue Alcalá» si lleva otro nombre—. Ajustes › Actualizaciones y errores › **Licencia y autoría** dice todo esto en la app. Hasta la 1.0.1, MADRE se publicó con licencia Apache 2.0, y esas versiones la conservan.

Para quien la usa es un parche: no hay saludo, recorrido ni «Qué hay de nuevo». Lo nuevo se dice con avisos de la primera vez, uno a la vez y una sola vez, en palabras simples y con lo que nombran iluminado en la pantalla: el copiloto, Herramientas externas (MCP), los archivos que se mantienen al día, la memoria sin escribir el nombre, los avisos que se hacen puntos y, en Inicio, el botón para agregar widgets.

- **El resultado de los comandos que pide un agente le regresa solo.** Cuando corres las líneas de un ```pulse-run, el resultado vuelve al agente que lo pidió en una respuesta propia, con el modo que tenía (hasta #3), lo que estaba contestando y la salida de cada línea; ya no hace falta escribir «ya lo corrí». Si ese agente sigue contestando, espera; DETENER TODO lo retiene. La tarjeta trae **Correr todos**, **Devolver lo que corrió** (cuando no quieres correr el resto) y dice a quién vuelve. Una salida larga ya no saca de la conversación la petición del humano: en lo que leen todos los agentes ocupa como mucho ~1,200 caracteres (su principio y su final).
- **Los agentes ya no confunden su permiso.** En #3 y #4 la instrucción del modo decía «solo lectura» encima del permiso para editar: con ACCESO TOTAL un agente respondía que solo inspeccionaría. Ahora dice lo que cada modo permite.
- **El permiso se pide con su tiempo.** Un agente que necesita más pide el modo y cuánto («Necesito #3 por 15 min»); la tarjeta lo muestra, deja elegir 5, 15 o 30 min (#4: 5) o solo este mensaje, y al confirmar, el permiso dura ese tiempo.
- **Planes en todos los modos.** La regla de no usar subagentes de la propia app se leía como «no armes planes», y con #2, #3 y #4 los agentes dejaban de proponerlos. El selector de modo dice ahora que cada modo también arma planes con otros agentes.
- **Copiloto.** Un robot junto a modo · modelo · esfuerzo. Lo enciendes confirmando #3 EDITAR una sola vez, por 30 min, 1, 4, 8 o 24 h, y mientras dura, el agente al que le escribes conduce el proyecto en #3 sin pedirte confirmar cada mensaje: edita, arma planes y le da a cada paso del plan hasta #3, y corre por su cuenta los comandos seguros (leer, pruebas, compilar, git local), cuyo resultado le regresa. Nunca borra (si se borra un archivo, MADRE lo regresa al terminar la respuesta), nunca toca las carpetas de MADRE ni los secretos, nunca abre #4 ni sube, publica o envía nada fuera de la computadora; tras 8 rondas seguidas sin ti se detiene y avisa. Arriba de la caja de escribir se lee HUMANO › COPILOTO › @AGENTE ›, y sus respuestas llevan un robot verde. DETENER TODO o un reinicio lo apagan.
- **Herramientas externas (MCP)**, en los Ajustes de cada proyecto. Agrega servidores MCP por comando o por dirección web (sin sesión, con token o iniciando sesión con OAuth, como los conectores de Claude), o tráelos de `.mcp.json`, `opencode.json`, Claude Code, Codex, Gemini CLI o Cursor; al importar solo se leen nombres y los valores se guardan de forma segura en MADRE. MADRE arranca y revisa cada servidor antes de que un agente lo use: el que no responde se queda fuera y su fila dice por qué. Las herramientas que solo leen van desde #1; las que actúan, desde el modo que elijas (#4 si no lo bajas). Ningún secreto queda en la línea de comandos ni en un archivo del proyecto.
- **La terminal, compacta.** Cada salida de comando es una píldora del ancho de lo que dice —si salió bien o falló y en cuánto, el comando y quién lo pidió—; la salida completa se abre con un clic.
- **Un chat más fácil de leer.** Las respuestas van en burbuja con el nombre del agente en su píldora; los adjuntos son tarjetas con tipo y tamaño; mientras un agente piensa, su avatar respira junto a lo que hace y el tiempo; el plan es una lista de tareas; al pie queda la hora y lo que costó aparece al pasar el cursor; las elecciones son una lista con número; el permiso cabe en una línea y, al concederse, queda como divisoria; los comandos pedidos van en pasos numerados que marcan ✓ o ✕; y hay más aire entre respuestas. Todo lo de un agente (su cabecera, su respuesta, lo que pide y sus comandos) empieza en el mismo borde, y su cabecera cabe en una línea: con poco espacio se calla primero el esfuerzo.
- **Los avisos se vuelven puntos.** Los avisos del chat se hacen un punto a los 10 s, del color de su tipo (rojo diagnóstico, ámbar permiso, verde bien, gris lo demás); un clic los abre en una lista que se lee: la etiqueta arriba, lo que dice debajo y lo repetido una sola vez con «×N». Los puntos son pequeños y tenues para no ensuciar la conversación. Se quedan abiertos los que piden algo: una falla con REINTENTAR, un permiso esperando, un módulo por instalar, los cambios con DESHACER, el aviso de solo lectura y los de Diagnóstico.
- **La lista de archivos ve lo que cambió.** Lo que un comando o un agente deja donde git no mira (una carpeta ignorada como `output/`) se encuentra por su fecha y se reporta; la lista se actualiza al terminar cada respuesta y cada comando, y tiene botón de actualizar junto a Ajustes. Las carpetas del camino llevan un punto hueco con el color de quien tocó algo dentro, y el archivo, uno lleno con «Último cambio: @agente · hace 5 min».
- **Navegador de pruebas.** Si falta el navegador elegido, el aviso dice cuál y el comando exacto (`npx @playwright/mcp install-browser webkit`, `chromium`…), en vez de pedir siempre chrome-for-testing; la revisión ya no reutiliza la respuesta de otro navegador.
- **Ajustes más fáciles de entender**, en español y en inglés: Memoria es «Lo que recuerda», Conectar MCP es «Herramientas externas (MCP)», Intenciones es «Esfuerzo sugerido», y cada ajuste dice qué hace sin jerga (archivista, destilar, recall, embeddings…).
- **El Mapa de memoria puede dejar de pedir el nombre.** «No volver a preguntar…» en su confirmación lleva a **Ajustes › Permisos › Acceso a la memoria**: pedir siempre, 1, 8 o 24 h, o nunca. Se guarda en este navegador y para ese proyecto (también el Coordinador).
- **Agregar widgets a Inicio desde la barra.** Un botón propio junto a Recargar abre «Agregar a Inicio»; antes solo se llegaba con clic derecho.
- **Inicio y los proyectos en pantallas angostas.** En tableta, un panel lateral solo pasa a ventana en vez de dejarle una tira a la conversación; en teléfono, las barras ya no quedan debajo de sus botones de la derecha: del logo queda solo el pulso, la píldora del recorrido dice «Recorrido · 3/13» y Recargar sale de la barra (la página se recarga sola al jalar). «+n» de los proyectos abiertos siempre se ve completo.
- **OpenCode con esfuerzo y todos sus proveedores.** Cada modelo de OpenCode ofrece sus propios niveles de razonamiento (los que publica: de «ninguno» a «máximo») y se mandan con `--variant`. Agregar un proveedor ya ofrece todos los que una sola llave abre en el catálogo de OpenCode (Groq, DeepSeek, Mistral, xAI, Together, Fireworks…), los más usados primero. Gemini CLI no tiene cómo elegir el esfuerzo por mensaje: lo decide él.
- **Entrena tu propia IA, explicado y en orden.** Qué son los datos de entrenamiento, siete pasos numerados y la opción para Linux con tarjeta NVIDIA (experimental: MLX funciona ahí, pero mlx-lm solo garantiza los chips de Apple).
- **Tarjetas más claras.** La de cada agente: su sesión, una cifra, cuatro datos, su plan y un botón a Ajustes. «Lo que se envía» se ve como el resto de MADRE: título alineado, pestañas centradas, los botones de siempre y sin los textos en mayúsculas de la consola. El panel del copiloto, más ordenado; «AUTO» en la esquina de «Cuánto piensa» y los avisos que flotan sobre el fondo.
- **La vista dividida cabe.** La barra del proyecto se acomoda a su propio ancho cuando está junto a otra conversación, al navegador o a dos paneles laterales, sin pisar Inicio · Proyectos · Ajustes; y la conversación se desvanece antes de la caja de escribir en vez de asomarse debajo.
- **Las ventanas vuelven de una en una.** Abrir los archivos o cualquier otra ventana desde la barra ya no trae de vuelta las que habías mandado al borde; cada una vuelve cuando la pides.
- **MADRE se abre en tu idioma.** La primera vez, si nadie lo ha elegido, MADRE toma el idioma de tu navegador: español en cualquiera de sus variantes, inglés para cualquier otro. Se guarda como si lo hubieras elegido, así que Inicio y todos los proyectos lo siguen, y se cambia cuando quieras en Ajustes › Apariencia. Quien ya eligió idioma no nota nada.
- **MADRE también en inglés fuera de la app.** El README, el CHANGELOG, las marcas y la documentación de uso (referencia, SDK, internos, conectores, hoja de ruta, entrenamiento y recolector de reportes) tienen su versión en inglés (`README.en.md`, `CHANGELOG.en.md`, `TRADEMARKS.en.md`, `docs/en/`), y las notas de cada versión en GitHub van en los dos idiomas. El español sigue siendo el original.
- **Las conversaciones abren al instante.** Una conversación de 166 mensajes tardaba 11.5 s en dibujarse: cada evento leía la altura de la conversación y la bajaba al final, y el navegador volvía a acomodarla entera dos veces por evento. Ahora el historial se dibuja de una vez y baja al final una sola vez: 40 ms, también al cambiar de conversación. La página recibe solo la última lectura de cuota de cada agente (eran el 87 % de lo que se descargaba: 3.3 MB → 0.6 MB; el registro las guarda todas), lo que está fuera de la pantalla no se dibuja hasta acercarse (`content-visibility`), y los scripts y estilos se reutilizan entre visitas (`ETag`, 304) y viajan comprimidos.
- **La esquina de MADRE lleva a su autor.** «MADRE 1.0.2 · © 2026 Jossue Alcalá», en cada proyecto y en Inicio, es un enlace a jossuealcala.com y ya no se pega a la barra de modo cuando el centro es angosto. Los términos adicionales de la licencia exigen conservarla.
- **«Mac» solo en una Mac.** Donde corre en otra computadora, como Linux, MADRE dice «esta computadora» en vez de «esta Mac», en los dos idiomas; lo que habla de hardware de Apple («Mac con chip M») no cambia.
- **El inglés dice lo mismo que el español.** 215 frases reescritas con los nombres nuevos y sin jerga (lease, key, aberration, sentinel, HOLD/BRIDGE…).

## 1.0.1 · 2026-10-14

- **MADRE habla más claro.** Se revisaron los textos de toda la interfaz, del recorrido y de «Qué hay de nuevo» para que se entiendan aunque no sepas de IA ni de programación: 1,157 cambios, solo de palabras. *Turno* ahora es *respuesta*; los estados de una memoria son SIN CONFIRMAR, CONFIRMADA, EN CUARENTENA y DESCARTADA; Diagnóstico habla de *problema* y *solución*; la llave de #3 y #4 es *confirmar* y la de un proveedor, *llave de API*. Los comandos de la consola siguen en inglés y los guiños a Alien siguen ahí.
- **IA local por proyecto.** En **Inicio › Ajustes › IA local** eliges qué proyectos usan Ollama: **Automático** (todos, como antes), **Uno a uno** (solo los que enciendes) o **Manual** (cada proyecto decide en sus Ajustes). Cambiar de modo no toca a los proyectos que ya existen, solo cómo empiezan los nuevos; el cambio llega al instante a los proyectos abiertos. En un proyecto, «Activo» de Módulos › IA local ya no apaga la IA local de los demás. El widget Modelos locales marca los proyectos sin ella y lleva a estos ajustes.
- **Un aviso diario de que MADRE sigue en uso.** Una vez al día cada copia le dice a madre.run que está encendida: un identificador al azar que la copia crea para sí, la versión de MADRE, el sistema y la versión de Node. Nada más: ni nombre, ni correo, ni proyectos; madre.run no guarda la IP. Es la forma de saber cuántas personas usan MADRE, qué versiones corren y si regresan. Está siempre encendido, aparece en «Lo que se envía» y en *Lo que sale de la máquina* de la referencia, y sin red falla en silencio.
- **Un recorrido para quien ya tenía 1.0.** Quien terminó el recorrido de 1.0 ve un saludo propio y solo lo que cambió: los nombres más claros, Inicio a tu manera, los widgets, la IA local por proyecto, el cielo de conexiones, Ajustes y los gestos nuevos, cada capítulo con una línea «Nuevo desde 1.0». Para quien empieza, el saludo lleva primero a conectar los agentes y agregar proyectos, y un proyecto ya no lo saluda antes que Inicio.
- **Guías de los widgets y avisos de la primera vez.** Un capítulo explica cada widget, y la primera vez que uno aparece en Inicio dice qué muestra. La primera vez que abres Conexiones, el Mapa de proyectos, Ajustes o Agregar en Inicio, o Ajustes, Módulos, Diagnóstico, el Mapa de memoria, Agentes o Primeros pasos en un proyecto, una tarjeta dice para qué sirve.
- **Reiniciar todos.** Después de actualizar, Inicio reinicia de una vez los proyectos que siguen con la versión anterior, desde **Te necesita** o **Ajustes › Versión**. Los que están trabajando o esperándote se dejan para después, y te dice cuáles.
- **Un proyecto abierto en otro MADRE lo dice.** Abrirlo desde Inicio cuando ya está abierto en otra parte responde con la dirección donde está, en lugar de «no abrió».
- **La marca MADRE, por escrito.** `TRADEMARKS.md` dice qué se puede hacer con el nombre y qué no; `NOTICE` lleva la línea que todo fork conserva («Based on MADRE by Jossue Alcalá»), y las contribuciones se firman con `Signed-off-by`.
- **Claude ya se puede conectar con tu propia API key.** Al iniciar sesión eliges la puerta: «Cuenta de Claude» (tu suscripción) o «Consola de Anthropic» (se cobra a tu crédito de API). También puedes pegar tu `ANTHROPIC_API_KEY`: se escribe donde el CLI de Claude la lee (`~/.claude/settings.json`, solo para ti), MADRE no guarda copia y, si el CLI no la acepta, todo vuelve como estaba. Esa llave manda sobre todo Claude Code de esta computadora, y MADRE lo dice antes de guardarla.
- **Un inicio de sesión con navegador ya se puede terminar dentro de MADRE.** La página de Claude devuelve un código y su CLI lo espera: antes no había dónde pegarlo y el intento moría a los cinco minutos. Ahora la dirección se queda a la vista, hay una caja para el código y una tecla para cancelar; la espera dura hasta quince minutos, porque del otro lado hay una persona.
- **Inicio trae los ajustes de conexión completos.** La misma tarjeta que el proyecto: con qué cuenta está conectado cada agente, las puertas para entrar, la caja para pegar una llave, la página del inicio de sesión y su código. Un campo a medio escribir ya no se borra cuando el panel se actualiza solo.
- **El README abre con el logo oficial de MADRE** y la frase de 1.0, en lugar del banner con la firma «MU/TH/UR 6000 · INTERFACE 2037».
- **Los planes revisan sus resultados y pueden continuar** hasta tres tramos por petición. Un paso sin número sigue leyendo, o creando si el plan ya puede crear; uno que pide `#3` o `#4` por encima de tu mensaje espera tu llave para ese agente, y `#4` la pide siempre.
- **Inicio muestra las conexiones directas entre proyectos** antes de las del Coordinador y deja más espacio para leerlas. Si una sala tarda en responder, conserva brevemente su último estado conocido; el Mapa de proyectos vuelve a intentar una lectura fallida.
- **La navegación del Mapa respeta las ventanas abiertas.** Clics, arrastres y rueda sobre una tarjeta no actúan sobre el lienzo detrás.
- **Los comandos indican su estado y tiempo transcurrido.** Cada línea muestra una barra de actividad mientras corre y el resumen distingue las que terminaron. Inicio deja de mostrar como pendiente una línea ya iniciada y conserva el agente que la pidió.
- **Los servidores tienen una tecla de recarga reconocible.**
- **OpenCode por proveedor.** El selector de modelo del chat agrupa los modelos de OpenCode bajo su proveedor (solo los que tienen llave o cuenta, y los propios de OpenCode) y lleva a **Ajustes › Agentes › OpenCode**: ahí se pega o se quita la llave de cada proveedor, se elige cuáles aparecen en el chat y el modelo por defecto.
- **El mapa de conexiones de Inicio, más claro.** La tarjeta muestra solo los proyectos conectados, cada uno con un tono derivado de tu acento que se repite en sus cables y en su nombre; tocarla abre el mapa completo, amplio, en «Ver las conexiones».
- **Botones con sombra más limpia**, con un borde fino y una sombra corta, en claro y en oscuro.
- **Ajustes › Agentes, ordenado.** Cada agente es una línea con su estado hasta que lo abres; abierto, sus opciones van en pares. El registro de un inicio de sesión ya no apila un «still running…» cada 8 segundos: la línea se actualiza, y cada intento empieza limpio. Los proveedores de OpenCode viven dentro de su tarjeta, una línea cada uno y una sola fila para agregar otro.
- **Inicio a tu medida.** Clic derecho en cualquier tarjeta de Inicio: moverla antes o después, llevarla arriba o abajo de los proyectos, cambiar su tamaño (pequeño, medio, grande, ancho completo), quitarla o **Agregar a Inicio**. Los proyectos también se mueven con su clic derecho, y el orden queda como «Tuyo».
- **Cada página con su fondo.** Inicio conserva el fondo que eliges en su Apariencia y cada proyecto el suyo; el tema, el acento y lo demás siguen compartidos. Cada tarjeta del cajón muestra el fondo de su sala. Un proyecto que nunca eligió uno conserva el que tenía.
- **Inicio se acomoda a cualquier ancho de tarjeta.** El cajón de proyectos tiene su nombre más grande y sus herramientas en una sola fila, alineadas al centro; si se angosta, la búsqueda baja a su propia línea y «Agregar proyecto» queda como «+». En el Coordinador, «Hablar con el Coordinador» baja bajo su nombre cuando no cabe al lado. Los botones de cada tarjeta nunca se enciman con el título. «N proyectos más, sin conexión» va en una pastilla discreta, y las barras de los widgets llenan su ancho.
- **Inicio en una cuadrícula exacta.** 12 columnas y filas de 96 px: cada tarjeta ocupa columnas y filas enteras, así que sus bordes coinciden con los de las demás. Con clic derecho eliges el **ancho** y el **alto** (automático, o de 2 a 5 filas); lo que no cabe se desplaza dentro de la tarjeta. Al angostar la pantalla, las tarjetas pasan a medio ancho y a ancho completo, y los pares terminan parejos.
- **Arrastrar hasta el borde**: mientras llevas una tarjeta o un proyecto, acercarte arriba o abajo desplaza Inicio, más rápido cuanto más cerca, sin soltarlo.
- **La barra de Inicio ya no recorta el punto de estado** de un proyecto abierto ni su halo.
- **«Te necesita» con aire**: cada aviso en su bloque, con el título y su pista bien espaciados y la acción en su propio renglón.
- **Conexiones como flujo eléctrico**: sin flechas, una línea tenue con corriente que corre en el sentido en que viajan las notas, y en los dos cuando se leen entre sí.
- **La barra de Inicio se comporta como la de los proyectos**: con el puntero encima, el ícono y su palabra toman tu acento, la tecla se eleva, el trazo se engrosa y cada dibujo se mueve a su manera (el eslabón se une, los planetas giran, recargar da la vuelta).
- **Las conexiones, un cielo.** Cada proyecto es una estrella en su tono, que titila a su ritmo; las notas que viajan son chispas y el Coordinador es la estrella más brillante, con su marca. En oscuro brillan; en claro son más sobrias, para que los nombres se lean.
- **Los íconos de la barra de Inicio se mueven** como los de las salas: en Conexiones las dos mitades del eslabón se unen, y en el Mapa de proyectos los planetas giran en su órbita mientras el puntero está encima.
- **Cada proyecto del cajón sobre su parte del fondo de pantalla**, difuminada y bajo un velo de la tarjeta, para que el texto conserve su contraste.
- **Inicio en un solo tablero.** Cada tarjeta mide lo que mide su contenido, a cualquier tamaño, así que ninguna se estira con espacio vacío. Los proyectos viven en un **cajón** que se mueve como cualquier tarjeta, con su búsqueda, filtro, orden y «Agregar proyecto» en su encabezado: muestra tres filas y un «+N» dice cuántos más hay, abiertos y dormidos, y los abre.
- **Reglas para widgets**: piezas y tokens comunes (`.sm-w-grid`, `.sm-w-metric`, `.sm-meter`) que se acomodan al ancho que tiene la tarjeta, no a la ventana.
- **Conexiones en dos columnas**, con «Revocar» junto a «Incluir siempre».
- **Arrastrar y soltar en Inicio.** Las tarjetas se toman de su encabezado y se acomodan en vivo, también de arriba a abajo de los proyectos; los proyectos se reordenan arrastrándolos entre los demás y el orden queda como «Tuyo».
- **El mapa de conexiones, interactivo.** Al pasar sobre un proyecto se iluminan solo sus conexiones; tocar el mapa abre **Mapa de conexiones** en su ventana: un círculo con los proyectos conectados alrededor del Coordinador y, al lado, lo que eliges — un proyecto (a quién consulta, quién lo consulta) o una línea (qué cruza, hasta cuándo, cuántas lecturas).
- **Widgets en Inicio**, cada uno con datos reales: Recursos del sistema (procesador y memoria disponible, leída del propio sistema), Servidores (los de tus proyectos abiertos con Vista previa, y si responden), Calidad de la memoria (madurez de cada proyecto y su lado más débil), Entrenamiento del Coordinador y Modelos locales (Ollama y qué tan cerca está cada proyecto de su propio modelo). Uno sin nada que lo alimente no se puede agregar y dice qué le falta.
- **Agentes en Inicio con el diseño de los proyectos**: tarjetas plegables con su estado, también en el asistente para quien empieza, y los proveedores de OpenCode dentro de su tarjeta.
- **Los botones de ajustes y «nuevo» de Archivos y Servidores** ya no parecen presionados: en reposo llevan el borde fino de los controles de al lado y se tiñen al pasar el puntero.

## 1.0.0 · 2026-10-12

<p align="center"><a href="https://github.com/jossuealcacao-exe/madre/blob/main/docs/media/1.0/madre-1-0.mp4"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/madre-1-0-video.webp" alt="Ver MADRE 1.0 en 90 segundos" width="100%"></a></p>

**MADRE 1.0 reúne en tu computadora todo lo que necesitas para trabajar con agentes de IA: tus agentes, tus proyectos, su memoria y tus permisos, en un solo lugar.** Codex, Claude Code, Gemini CLI y OpenCode conversan en el mismo hilo y se leen entre sí; Inicio junta todos tus proyectos; un Coordinador los ve desde arriba; y cada proyecto recuerda lo que se decidió. Sigue siendo gratis, sin cuenta y en tu computadora.

### Lo esencial

<p align="center"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-inicio.webp" alt="Inicio: todos tus proyectos en un lugar" width="32%"> <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-agentes.webp" alt="Todas tus IAs en un mismo chat" width="32%"> <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/media/1.0/ksp-permisos.webp" alt="Tú decides hasta dónde llega cada agente" width="32%"></p>

- **Inicio: todos tus proyectos en un lugar.** `madre` sin nada más abre Inicio. Agregas las carpetas donde trabajas (MADRE sugiere las que parecen proyectos) y cada una queda dormida hasta que la abras. Cada tarjeta dice si un agente trabaja, si alguien te espera y qué pasó mientras no estabas; «Te esperan», «Decisiones recientes» y el «Resumen reciente» lo juntan todo. La primera vez, tres pasos: conectar tus agentes, agregar tus proyectos y abrir los que vas a usar.
- **El Coordinador ve todos tus proyectos.** Es un agente que vive en Inicio: lee entre tus proyectos, firma conexiones entre ellos y lleva órdenes de uno a otro. Desde cualquier proyecto le preguntas con `/bishop` y la respuesta es solo para ti. Sus órdenes llegan hasta `#2`; `#3` y `#4` llegan como propuesta que tú desbloqueas en ese proyecto.
- **Conexiones: un proyecto consulta lo que otro ya aprendió.** Tú firmas cada conexión: qué tipos de nota cruzan (decisiones, hechos, preferencias, preguntas), por cuánto tiempo y si el Coordinador puede dar órdenes. Solo cruzan notas que ya están en uso, limpias de datos privados; nunca tus archivos ni tus conversaciones. Se revoca cuando quieras.
- **Una conversación, todos tus agentes, y varias a la vez.** Le escribes a un agente con `@`, eliges modo con `#`, archivo con `!` y comando con `/`. El siguiente agente recibe lo que se dijo antes y lo ves en la línea de traspaso. Pide «@madre, pregúntale al equipo…» y contestan todos, uno tras otro, con un resumen al final. Varias conversaciones trabajan al mismo tiempo, al lado o en ventanas.
- **Tú decides hasta dónde llega cada agente.** Cada mensaje lleva un modo: `#0` Incógnito, `#1` Solo conversar (el predeterminado), `#2` Crear, `#3` Editar y `#4` Acceso total. `#3` y `#4` piden tu llave (`#4`, dos veces) y la comprueba el propio proyecto. En Ajustes › Permisos eliges qué llave usar y si vale unos minutos. Antes de editar, MADRE guarda un punto de restauración y **Deshacer** regresa el proyecto a ese momento.
- **Tu memoria, a la vista.** Cada proyecto destila lo que se habla en notas: decisiones, hechos, preferencias y preguntas. El **Mapa de memoria**, con su tecla en la barra, dibuja esa memoria como un cerebro que giras; el **Mapa de proyectos**, en Inicio, muestra tus proyectos alrededor del Coordinador con sus conexiones.
- **Ajustes y Diagnóstico.** Todo lo que configuras vive en una ventana (⌘ ,) con buscador: apariencia, proyecto, agentes, memoria, permisos, privacidad y versión, y cada tarjeta dice cómo está antes de abrirla. En **Diagnóstico** escribes lo que pasa con tus palabras y te dice qué hacer, con la tecla que lo resuelve.
- **Módulos como apps.** Un tablero de mosaicos, cada uno con su interruptor y su ficha: **Ahorro de tokens**, **Intenciones** (sugiere cuánto debe pensar cada agente a partir de tus propios turnos, sin gastar tokens), **IA local** con Ollama, **GitHub** (`/gh` para pull requests, CI e issues) y **Continuidad** (AHP+), entre otros. Cada uno dice qué escribe y qué necesita antes de instalarse.
- **Un espacio de trabajo a tu medida.** Cada panel se abre al lado o en una ventana que mueves; una segunda conversación cabe en la otra mitad; el visor edita código; los servidores de tu proyecto se abren dentro de MADRE; la barra se arma con clic derecho; y Apariencia trae 17 acentos y 12 fondos para tema claro y oscuro. La apariencia es una sola: lo que eliges en Inicio o en un proyecto lo ven todos. Cuando la barra no cabe, las teclas pasan a «Más» antes de que el nombre del proyecto se corte.
- **Te enseña MADRE a tu paso.** Quien llega por primera vez ve «Conoce MADRE»; quien viene de una versión anterior, «El recorrido de MADRE 1.0», que empieza por lo que cambió de lugar. Son capítulos cortos que puedes dejar y retomar, y `?` abre en cualquier momento la hoja de gestos y atajos.

### Si vienes de 0.7.2

- **Tus proyectos, conversaciones, memoria y ajustes se quedan.** MADRE reconoce los proyectos que abriste con 0.7.2 y los trae a Inicio: busca cada carpeta donde sueles guardar tus proyectos y solo la agrega si su huella coincide. Nada se adivina, y un proyecto que quitaste de MADRE no vuelve.
- **`madre` a secas abre Inicio**; `madre start` dentro de una carpeta sigue abriendo ese proyecto directo.
- **«Conexiones» cambió de significado.** Iniciar sesión en tus agentes vive ahora en Ajustes › Agentes; una conexión es lo que une dos proyectos.
- **Ajustes reúne lo que estaba repartido** entre PERSONALIZAR, MU/TH/UR, ⚙ CONEXIONES y las teclas de idioma y tema.
- **Los nombres son más claros.** Los identificadores, comandos y carpetas no cambian (`/bishop`, `madre salas`, `.pulse/`), solo lo que se lee:

| Antes | Ahora |
|---|---|
| Sala | Proyecto |
| Salas · lobby | Inicio |
| BISHOP | Coordinador |
| Enlaces | Conexiones |
| Macroverso | Mapa de proyectos |
| NOSTROMO | Mapa de memoria |
| MU/TH/UR | Diagnóstico |
| GHOST · EXCHANGE · CREATE · CONTROL · AIRLOCK | Incógnito · Solo conversar · Crear · Editar · Acceso total |
| Ash · Ollama · RIPLEY · AHP+ | Ahorro de tokens · IA local · Vista previa · Continuidad |

- La segunda llave de `#4` ya no es la palabra AIRLOCK: es tu misma llave de `#3`, escrita dos veces.

### Más seguro y más sólido

Antes de cerrar 1.0 se revisó el código completo con pruebas de seguridad. Lo que se corrigió:

- **Las llaves de `#3` y `#4` las comprueba el proyecto**, no solo la página: un mensaje en esos modos sin una llave aceptada se rechaza, y cambiar las llaves pide la frase actual cuando una frase protege un modo.
- **El git de MADRE no ejecuta lo que un agente deje configurado** en un repositorio (hooks, fsmonitor, diff externo), y después de un turno en `#2` o `#3` la configuración del repositorio vuelve a como estaba.
- **Las páginas de MADRE no se dejan enmarcar por sitios ajenos** y las imágenes externas de una respuesta quedan como enlace; la vista previa de archivos se abre aislada.
- **Lo que cruza entre proyectos se limpia siempre** de llaves, tokens y contraseñas, aunque un proyecto haya apagado sus guardas.
- **Nada se pisa ni se corrompe:** los ajustes, las conexiones y el estado del recorrido se escriben enteros y en turno; un registro cortado a la mitad (un apagón, un `kill -9`) ya no impide abrir la conversación; la memoria espera su turno en vez de fallar con «database is locked»; y un proyecto que murió a mitad de turno ya no deja archivos bloqueados.
- **La purga de un término privado limpia todas las conversaciones del proyecto**, no solo la abierta.
- **La actualización con un clic solo instala versiones válidas.**
- **Las letras ya no se parten**: una «ó» que llegaba partida en dos trozos de la salida de un agente se guarda entera.
- Y más arreglos de lógica: dos conversaciones abiertas a la vez ya no destilan ni pagan dos veces el mismo lote, volver a una conversación ya no suma dos veces su costo, y Diagnóstico da los remedios del sistema donde corre MADRE, no del navegador que lo lee.

### Todo lo que cambió, en detalle

<details>
<summary>El registro completo de 1.0, en el orden en que se construyó</summary>

> Este registro se escribió mientras se construía 1.0 y conserva los nombres de trabajo (sala, Salas, BISHOP, MU/TH/UR, NOSTROMO, AIRLOCK…). Algunas piezas se reemplazaron antes de publicar: por ejemplo, el recorrido de cinco paradas dio lugar a «Conoce MADRE» y «El recorrido de MADRE 1.0». La tabla de arriba dice cómo se llama hoy cada cosa.

### Salas en tu Mac

- **Todas tus salas, en una pantalla.** Una tecla nueva al inicio de la barra, **Salas**, abre la lista de los proyectos de esta Mac: los abiertos primero (el que te espera, en tu acento; el que trabaja, con su pulso), con su última conversación y cuántas memorias guarda, en una franja con los colores de NOSTROMO; y los **dormidos**, salas cerradas cuyo proyecto sigue en disco. Desde ahí se **abre** una sala, se **cierra** (detiene lo que corre y la cierra, después de preguntar) o se **despierta** una dormida, como si corrieras `madre start` en su carpeta. **Detener todo** frena a los agentes de todas las salas.
- **El Macroverso.** Desde Salas, en una pantalla grande, todas tus salas en el espacio abierto, y cada una es un NOSTROMO: MOTHER de roca fundida al centro, cada memoria una enana del color de su tipo, las venas entre las que comparten un tema, dibujado por el mismo motor que el NOSTROMO de su sala. Las abiertas orbitan cerca de tu Mac y las dormidas lejos y frías; la que trabaja respira y la que te espera lleva un anillo en tu acento. El espacio no tiene borde: se arrastra, la rueda lo acerca y **Recentrar** lo devuelve a casa. Clic en un universo (o ← →) y la cámara vuela hacia él: ahí deja de ser una foto y se vuelve la cosa real, con su magma y sus pulsos en vivo; arrástralo para girarlo en la mano, toca una memoria para leerla en su ficha, Esc para soltarla. La ficha dice lo que guarda por tipo, sus conversaciones, sus venas y la puerta para entrar o despertarla. De lejos cada universo se pinta una sola vez, sin las palabras de sus memorias; solo el elegido las pide, y solo hay uno vivo a la vez: un cuadro de la vista lejana cuesta menos de un milisegundo y el universo vivo cuesta lo que cuesta en su sala. Por ahora el Macroverso muestra: enlazar salas viene después.
- **NOSTROMO tiene motor propio.** La física y los pintores del mapa de la memoria viven ahora en un archivo aparte, que la sala y el Macroverso comparten: una sola paleta, un solo magma, una sola forma de cerebro. En la sala no cambia nada que se vea.

### Enlaces entre salas (avance)

- **Una sala puede leer lo que otra sabe, si tú lo firmas.** En Salas, **Enlazar salas** abre una hoja: qué sala lee de cuál (o las dos), qué tipos de memoria cruzan (decisiones, hechos, preferencias, preguntas) y hasta cuándo. En el Macroverso, arrastra un universo sobre otro y la hoja llega con las dos salas puestas. Firmar deja una línea de MU/TH/UR en las dos salas; **Revocar**, en la sección Enlaces de Salas, la deja también y desde entonces no cruza nada.
- **Qué cruza, y qué no.** Solo notas destiladas que ya viajan a los turnos (bodega y puente), de los tipos del contrato, limpias por el guardia de privacidad de la sala que las entrega. Nunca el registro, los archivos, las llaves, la enfermería ni la esclusa. Y solo de lectura: nada escrito en una sala llega a la otra.
- **Cómo lo usa un agente.** En una sala con un enlace vigente, cada turno lleva el servidor `pulse-enlaces`: `enlace_rooms` dice de qué salas puede leer y qué tipos; `enlace_search` lee, y el agente cita lo que trae como de esa sala. Sin contrato, la herramienta no existe. Cada lectura queda contada en las dos salas, nunca como burbuja: en Salas, cada enlace dice cuántas lecturas tuvo en 24 h y cuándo fue la última; en el Macroverso, la vena entre los dos universos lleva la corriente del que entrega al que lee y manda un pulso por cada cruce.
- **Candados.** Todos están en la sala que entrega: solo contesta a otro proceso de MADRE de esta Mac con la llave del canal, nunca a una página; un contrato revocado, caducado o del otro sentido es un contrato que no existe; una sala sellada por CODE000 no entrega; y cada enlace tiene un tope de lecturas por hora.
- **La sala de Salas.** `madre salas` abre una sala cuyo proyecto es una carpeta de MADRE: la puerta de entrada cuando no estás en ningún proyecto, y lo que abre `madre` a secas desde tu carpeta personal. Es una sala como las demás, va primero en Salas con su marca y su barra lleva la tecla **Macroverso**. Nunca entrega notas por un enlace y es la única que puede recibir permiso para dar órdenes a otra: ahí vive BISHOP.
- **`madre start --help` ya es ayuda.** Pedir `--help` después de un comando abría la sala en vez de contestar; ahora contesta.
- **Dos salas ya no se pisan los ajustes.** `config.json` es uno para toda la Mac y se escribía sin candado: si dos salas guardaban a la vez, una podía borrar el cambio de la otra, y un módulo que se encendía en una sala podía apagar lo que otra acababa de cambiar. Ahora cada cambio se escribe completo y en turno, y cada módulo escribe solo lo suyo.
- **Una nota que un agente guarda con `memory_note` pasa ahora por el guardia de privacidad**, como todo lo demás que entra a la memoria: si el nombre está en Ajustes › Privacidad, la nota se guarda con la marca, no con el nombre, y el agente la ve como quedó guardada.
- **Purgar un término privado conserva el lugar de cada nota.** Un hecho refutado sigue fuera de circulación y una aberración sigue en enfermería. La purga también limpia las correcciones y conserva las veces que una nota se recordó.
- **BISHOP habla desde la sala de Salas.** En su ficha eliges qué agente listo responde; si `@madre` está disponible, empieza con él. Ve qué salas están abiertas, quién trabaja y cuántas notas guardan. Con enlaces firmados puede consultar notas de otras salas y cita de cuál viene cada dato. Si una sala no se pudo leer (dormida, sellada o sobre su tope por hora), se lo dice en vez de callarlo. Con `@madre`, BISHOP solo responde: el modelo local inventaba y copiaba los ejemplos, así que no propone órdenes ni enlaces.
- **BISHOP propone, tú decides qué sale.** Si le pides actuar y un enlace firmado lo permite, su respuesta termina en una tarjeta con hasta cuatro órdenes: la sala, el agente, el modo y la tarea de cada una, con **Enviar** y **Saltar**. En su ficha eliges el modo: **manual** (todo espera tu botón), **híbrido** (las de `#0` y `#1` salen solas dentro del enlace) o **automático** (hasta `#2`). Lo que sale solo deja una línea, se detiene desde su fila, y un fallo o PARAR TODO detienen el resto. La sala que la recibe la revisa ella misma (su enlace, su techo de modo, una orden a la vez, sin interrumpirla si está trabajando, su tope por hora), la contesta en su conversación con la marca «de BISHOP» y no puede pasarla a nadie más. La respuesta vuelve a tu conversación con BISHOP como tarjeta, sin arrancar otro turno, y una línea cierra el plan.
- **`#3` y `#4` llegan a su sala, nunca corren solos.** BISHOP los lleva como tarjeta a la sala que toca; **Armar y enviar** los escribe en la caja, y enviarlos pide tu llave como siempre. Salas muestra esa sala como «te espera».
- **BISHOP enlaza salas por ti.** Si una pregunta necesita una sala sin enlace, o si se lo pides, BISHOP propone el enlace en la misma tarjeta: qué sala entrega, cuál lee, qué tipos, cuántos días y, con la sala de Salas, hasta qué modo de órdenes. Un enlace que solo lee lo firma él mismo, por una semana como máximo, y la tarjeta y Salas dicen «lo firmó BISHOP» con **Revocar** a mano; si prefieres firmarlos tú, se cambia en su ficha. Un enlace con órdenes lo firmas siempre tú, con la designación de la sala, y libera las órdenes del plan que lo esperaban.
- **En la sala de Salas nadie delega.** BISHOP ya no recibe las instrucciones para repartir trabajo dentro de su sala: lo que pone en marcha va por sus propios planes.
- **BISHOP, desde cualquier sala.** Escribe `/bishop` y tu pregunta en cualquier sala: si la sala de Salas duerme, se despierta; BISHOP responde con lo que sabe de las salas enlazadas y la respuesta llega solo para ti. Los agentes de esa sala no la leen: leer otra sala es lo que hace un enlace.
- **Cada lectura entre salas dice quién y para qué.** Lo que un agente lee de otra sala queda con su nombre y con el turno exacto en que lo leyó, y bajo su respuesta una línea dice «leyó 3 notas de gumball». La sala solo lee para un turno que de verdad está corriendo, de ese agente; en Salas, cada enlace dice quién leyó al último.
- **Recordar en cada turno, si tú lo marcas.** Cada enlace tiene una casilla, apagada por defecto: marcada, los agentes de la sala que lee reciben en cada turno, sin pedirlas, hasta 3 notas de la otra sala que tienen que ver con lo que preguntaste, y lo dicen bajo su respuesta. Cada turno así cuenta como una lectura del tope por hora del enlace. Nunca en GHOST, y la marcas o la quitas tú, en Salas.
- **Una orden de BISHOP dice que es de BISHOP.** En la sala que la recibe se ve como de BISHOP, en su propia burbuja, con «la enviaste tú desde Salas» o «salió sola, en el modo que elegiste»; antes se veía como un mensaje tuyo y con su encabezado técnico a la vista. Una pregunta hecha con `/bishop` se ve en Salas como tuya, desde la sala donde la hiciste.
- **Los ajustes de BISHOP se leen.** Sus opciones dicen lo que hacen («Híbrido: #0 y #1 salen solas», «Los firma BISHOP, por 7 días como máximo») en vez de palabras internas, y su ficha dice su estado en español. Un módulo propio puede hacer lo mismo con `choices` en sus ajustes.
- **Menos líneas por cada plan.** Lo que le pasa a un plan de BISHOP (salió sola, llegó a su sala, se cerró, dejó de enviar solo) se dice en su propia tarjeta, no en una línea nueva cada vez; la línea de un enlace no se repite cuando la tarjeta ya lo dice; y las tarjetas ya no repiten las reglas en un pie largo. Lo que una respuesta leyó o recordó de otra sala va en su pie, junto a la memoria que usó.
- **Una segunda barra, en la Mac.** A la derecha de la barra de la sala, en su propia cápsula de vidrio: Salas (ahora una casa), Recargar y Ajustes (ahora un engrane). No se acomodan con el resto de las teclas, y la barra de la sala cede exactamente su ancho.
- **BISHOP habla con su burbuja.** En la sala de un proyecto, una orden de BISHOP y su respuesta a `/bishop` se ven como el mensaje de un agente, con su robot y sus chips arriba como los de cualquier respuesta (quién, «↳» lo que responde, por qué agente). Tu `/bishop` se ve como tu mensaje a BISHOP, sin el acuse del comando.
- **Los agentes, sólidos y planos.** Sus marcas en la conversación, en la tripulación de la barra y en el selector de la caja son discos de su color vivo, sin brillo ni degradado, con una sombra corta que los levanta como a las burbujas. El que no está listo conserva su contorno.
- **La casa y el engrane se mueven.** Al pasar el puntero, la casa se sacude y el engrane gira; con Ajustes abierto, el engrane se ilumina y su centro queda hueco. Con movimiento reducido, no se mueven.
- **Memoria tiene un chip.** Su ícono en Ajustes es ahora un chip en lugar del foco.
- **Las líneas de la sala, redondas siempre.** Los avisos de enlace y memoria tienen su esquina redonda, van centrados y miden lo que su texto, también sin fondo de paisaje (antes ahí se veían como bloques rectos). El texto bajo «ENLACE» ya no empieza con un punto suelto. Los avisos que advierten o piden algo (planes, cambios de permisos, escaladas, alertas) conservan su color.
- **El cuadro de esfuerzo ya no parpadea.** Al pasar por cada punto del riel, el texto cambia en su lugar; solo se deslizan las barras de velocidad y costo.
- **La caja de texto vuelve a hundirse al hacer clic**, sobre su nueva capa blanca.
- **El escritorio responde al presionar.** Un clic en el fondo vacío aparta o regresa las ventanas en el momento, sin esperar a soltar; sobre texto sigue esperando, para no romper una selección.
- **La barra del editor, ordenada.** El tipo de archivo va junto al nombre, y Leer, Editar y Abrir en crudo están en un mismo chip.
- **Los botones de tamaño de una ventana toman el acento** al pasar el puntero y cuando están activos, como las demás teclas.
- **La ficha de cada agente, por grupos.** Arriba lo gastado, con su barra y cuándo se reinicia; debajo, Límites del proveedor, Esta sala y Conexión, cada uno con su título, en la letra de lectura.
- **En el selector de agentes, los no elegidos se atenúan.**
- **Los tableros de módulos, alineados.** Cada ficha se lee desde arriba (etiqueta, cifra, nota), la grande ocupa dos filas solo cuando hay con qué llenarlas, y la cifra se ajusta a su ficha en vez de cortarse.
- **Tablas alineadas.** La tabla de Intenciones tiene encabezados (tipo de pedido, nivel, turnos, estado) y columnas fijas; en las tablas de los mensajes, una columna de cifras se alinea a la derecha; en la de economía, el encabezado de la primera columna va a la izquierda.
- **MU/TH/UR:** sus ajustes (ahora con el engrane), NOSTROMO y la ayuda están junto al riel macOS · Linux.
- **El costo de Codex, Gemini y OpenCode.** Junto a sus tokens, cada respuesta dice cuánto costaría al precio de lista de la API de su modelo, con «≈» porque es un estimado (Claude ya decía el suyo). Solo se calcula para modelos cuyo precio se leyó en la página del proveedor; uno desconocido no muestra precio. Con una suscripción puede no costarte nada por turno, y la cifra lo dice al pasar el puntero.
- **Los indicadores de sesión, en tres colores de la marca:** verde con sesión, ámbar mientras inicia o si no se sabe, rojo sin sesión. Ya no siguen el color de acento.
- **«Sigue abierto aquí» ya no corta preguntas.** La fila avanza de pregunta en pregunta, así que la del inicio siempre queda completa, y el lado donde hay más se desvanece en vez de cortar.
- **«Sigue abierto aquí» del mismo vidrio que modo, modelo y esfuerzo.** Las preguntas, su etiqueta y su × son cápsulas del material de esa fila: el fondo de la sala translúcido, con el paisaje desenfocado detrás, sin bisel, brillo ni sombra; al pasar el puntero se vuelven un poco más densas. Cuando la fila no cabe, se desvanece solo la pregunta que el borde corta, y el vidrio sigue viendo el fondo.
- **Detener un plan es un botón redondo** junto al título PLAN, como las acciones de una respuesta, en lugar de la palabra DETENER al final.
- **Los botones del aviso de permiso CREATE**, en el estilo nuevo: cápsulas en la letra de la sala, en oración («Reenviar a @codex con CREATE», «Siempre para este agente»), sin contorno.
- **El esfuerzo elegido solo para un mensaje ya no se subraya.**
- **La respuesta citada dentro de la caja** queda dentro de su borde, con la esquina concéntrica; antes se salía por la izquierda.
- **El Macroverso vivo.** Cada universo despierto gira y late, y los pulsos de su núcleo corren hacia sus memorias y entre ellas, sin pausa; las venas entre universos enlazados llevan pulsos aunque nadie haya cruzado. Cada universo se dibuja al tamaño en que se ve: al acercarte gana detalle y brillo, y de lejos sus luces se suavizan, sus memorias no se pierden y su núcleo se lee primero.
- **Elegir un universo apaga todo el espacio**, de borde a borde, y más cuando tienes una memoria en la mira; ya no aparece el cuadro negro alrededor del universo.
- **Las memorias del Macroverso se abren en ventanas**, como en NOSTROMO: se mueven por su encabezado, pasan al frente al tocarlas y se cierran con su ×; hasta cuatro a la vez.
- **Las aberraciones lejanas**, en el Macroverso y en el NOSTROMO de cada sala, se ven como un punto oscuro con su anillo de luz fría, en lugar de una mancha negra con polvo gris.
- **El lobby es la primera pantalla.** `npx @jossuealcala/madre`, desde cualquier carpeta, abre el lobby: todos tus proyectos en un lugar, con BISHOP arriba como una sección propia (tu súper agente: lee entre proyectos, firma enlaces y lleva órdenes). `madre start` dentro de una carpeta sigue abriendo ese proyecto directo. «La sala de Salas» deja de existir como nombre: es el lobby, y BISHOP vive ahí.
- **Agregar proyectos desde el lobby.** El botón «Agregar proyecto» muestra las carpetas que parecen proyectos en los lugares de siempre y un explorador de tus carpetas; eliges una o varias. Agregar no abre: cada una queda en el lobby, dormida, hasta que la abras. Una carpeta que ya usaste con MADRE conserva sus conversaciones y su memoria. MADRE solo lee nombres de carpetas dentro de tu carpeta de usuario, nunca lo que dicen los archivos.
- **La primera vez, tres pasos:** conectar tus agentes (una vez para todos los proyectos), agregar tus proyectos y abrir los que vas a usar.
- **NOSTROMO abre varias memorias a la vez.** Cada memoria se abre en su propia ficha, que se mueve por su encabezado, pasa al frente al tocarla y se cierra con su ×; caben cuatro, y al abrir una quinta se cierra la más vieja.
- **NOSTROMO más amplio.** MADRE es un 10 % más grande, las memorias se separan más y la constelación ocupa más del lienzo.
- **El núcleo, en el lenguaje de la sala.** Deja la terminal verde: es una ventana como Ajustes y MU/TH/UR, con sus pestañas como selector, cifras en fichas, filas en tarjetas, textos en oración y letra mono solo para lo literal. Abre sin la animación de arranque. Se ve igual de bien en tema claro y oscuro.
- **Instalar, actualizar y desinstalar un módulo** preguntan con la hoja de la sala, no con la consola heredada.
- **Las barras no son escritorio.** Tocar una esfera de agente, o cualquier cosa en las barras de arriba, ya no aparta ni regresa las ventanas; ese gesto queda para el fondo de la conversación.
- **La conversación en planos de profundidad.** Cada tipo de mensaje está a su distancia: tu mensaje al frente, sólido; los errores y alertas críticas justo detrás, con su color en una superficie sólida; los relevos, la memoria, los enlaces y los pasos delegados en un plano medio translúcido donde se asoma el fondo; las respuestas de los agentes en blanco, integradas; los chips y sellos casi sobre el fondo, sin sombra. La profundidad sale del material, del borde y de una elevación corta que crece con el plano, no de sombras grandes; nada de brillos ni halos, y funciona en claro y oscuro, con o sin fondo de paisaje. Sustituye la escalera de tonos de blanco de la ronda anterior.
- **Pedir correr un comando dentro de un plan ya no parece un plan nuevo.** Un paso delegado (o una orden de BISHOP) que terminaba con un bloque para correr un comando disparaba la alerta de «intentó abrir un plan dentro de un plan»; ahora solo la dispara un plan de verdad.
- **Leer y ordenar ya no se gastan entre sí.** Cada enlace cuenta sus lecturas y sus órdenes por separado, cada una contra su tope por hora: preguntarle a BISHOP no agota las órdenes.

### NOSTROMO más claro

- **Las explosiones de MOTHER giran con ella.** Cada explosión nace en un punto de la roca y viaja con la corteza mientras el sol gira; antes se quedaba fija en la pantalla mientras el cuerpo giraba unos cuarenta grados debajo de ella.
- **Las memorias son una quinta parte más pequeñas**, todas por el mismo factor, así que conservan su proporción entre ellas y el mapa abre con menos ruido.
- **La ficha dice dónde está cada memoria.** La zona (bodega, puente, enfermería o esclusa) va en una marca de su propio color —verde si viaja a los turnos, ámbar en la enfermería, gris en la esclusa— y debajo dice qué significa. Antes era una línea más de la ficha y su significado solo aparecía al pasar el puntero.

### Tu primera vez en MADRE

- **Un recorrido nuevo, de cinco paradas**, sobre la sala misma: la caja y cómo preguntarle a cada agente (con `@`, el modo y `/`), MU/TH/UR y lo que guarda dentro, varias conversaciones a la vez, los gestos para moverte (clic derecho en la barra, clic en la caja, arrastrar ventanas, `⌘ ,`, Esc) y los módulos. Cada parada ilumina su parte de la pantalla y dice en una lista corta qué tecla hace qué.
- **Primeros pasos, en la barra.** Quien llega por primera vez ve una píldora con un anillo que se llena: «Primeros pasos 2/6». Abre una tarjeta con seis cosas por hacer: tu primera pregunta, pedirle algo a toda la tripulación, abrir MU/TH/UR, abrir una segunda conversación, acomodar la barra y abrir un módulo. Cada una tiene un botón «Llévame» que te deja justo ahí. Ninguna se marca con un clic de «hecho»: se marcan solas cuando de verdad las haces, y la primera pregunta y el primer plan se toman del registro de la sala. Al completar las seis, la píldora se va; si la ocultas, el `?` de MU/TH/UR la regresa.

### Arreglos

- **El scroll del editor ya no mueve la sala de atrás.** Sobre los números de línea, las barras o la línea de estado, la rueda pasaba a la conversación; también lo hacía cuando el texto llegaba a su principio o a su final. Ahora la rueda mueve siempre el texto del editor, y lo mismo pasa en el visor de archivos.
- **Las burbujas ya no salen en blanco al subir por la conversación.** Cada burbuja y cada línea de la sala desenfocaba el fondo por su cuenta, y con una conversación entera el navegador se quedaba sin memoria para pintarlas: salían como rectángulos blancos, sin esquinas y sin texto. Dentro de la conversación ya nada desenfoca el fondo; la barra y la caja conservan su vidrio.

### La conversación, por capas

- **Cada tipo de mensaje vive a su altura.** Arriba, lo que se dijo: las respuestas de los agentes y tus mensajes, con el tono más luminoso, una línea de luz en el borde superior y una sombra larga. En medio, lo que hizo la sala (plan, relevo, memoria, módulos), con un tono más bajo y una sombra corta. Pegadas a la foto, las etiquetas de quién contestó, la hora y los tokens. En oscuro, lo más alto es más claro; en claro, la sombra marca la altura. Los tonos son densos para que se lean sobre cualquier fondo.
- **El paso de un plan ya no lleva una barra de color a la izquierda**: es una respuesta más, con un leve tinte del color del agente que la escribió.

### La barra se arma a tu gusto

- **La barra se arma a tu gusto.** Clic derecho en cualquier tecla de la barra (o déjala presionada en una pantalla táctil) y la barra se abre para editarla: las teclas tiemblan, cada una lleva un «−» en tu acento para quitarla y una tarjeta debajo muestra lo que falta, listo para agregarlo con un clic. Además de las de siempre puedes poner Memoria (abre Ajustes › Memoria), Ash, Intenciones, Ollama y cualquier módulo tuyo que se abra en ventana; también puedes arrastrar una tecla para cambiarla de lugar. Ajustes no se quita y siempre va al final. Listo, Esc o un clic fuera cierran la edición, y la barra queda así en este navegador.

### GitHub, en la sala

- **Un módulo nuevo, GitHub, trae el lado de GitHub de tu proyecto a la sala.** Escribe `/gh` y una tarjeta dice cuántos pull requests e issues hay abiertos y cómo va el CI de la rama en la que estás. `/gh pr` los lista, `/gh pr 12` abre uno (su rama, si se puede fusionar, cuánto cambia y quién lo revisó), `/gh ci` enseña cada verificación y las últimas ejecuciones, y `/gh issues` lista los issues. Todos lo leen, agentes incluidos.
- **Publicar pide tu palabra, como `/git push`.** `/gh pr create "título"`, `/gh comment 12 "texto"` y `/gh issue "título"` enseñan primero exactamente qué se publicaría, dónde y con qué cuenta, y no publican nada. Lo publica la misma línea con `confirm` al final.
- **Los agentes leen GitHub en cualquier modo y escriben solo en `#4` AIRLOCK.** Abrir un pull request, un issue o comentar sale con tu nombre y no se deshace, así que la sala retira esas herramientas por debajo de `#4` y el propio servidor las rechaza ahí también.
- **Sin llaves nuevas si ya tienes `gh`.** Si el CLI de GitHub tiene sesión en esta computadora, el módulo la usa y MADRE no guarda nada. Si no, pegas un token de acceso detallado en su ficha; se guarda en la bodega de MADRE y nunca aparece en una tarjeta, en el registro de salidas ni en lo que lee un agente. La ficha dice con qué cuenta entra y qué repositorio encontró, o qué le falta.
- Cada petición a GitHub queda en el registro de salidas como del módulo GitHub, aparte de la consulta diaria de versiones.

### AJUSTES: todo lo que configuras, en una sola ventana

- **El botón de la barra que abría PERSONALIZAR ahora abre AJUSTES** (también con ⌘, o Ctrl+,). Reúne lo que antes estaba repartido entre PERSONALIZAR y MU/TH/UR, en tres grupos: **Tú** (Apariencia, Sala y turnos), **La tripulación** (Agentes, Memoria) y **Sistema** (Privacidad, Versión y reportes).
- **Cada tarjeta dice cómo está ese ajuste antes de abrirlo**: cuántos agentes tienen sesión, cuántas conversaciones trabajan a la vez, qué archiva la memoria, cuántos términos privados hay, si tu versión está al día. Si algo pide tu atención, lo dice en ámbar.
- **Lo más usado se cambia desde la tarjeta, sin abrirla**: el tema, Multitarea, tachar llaves y el auto-reporte.
- **Al abrir una categoría**, sus ajustes aparecen en una hoja al lado y el tablero sigue a la vista. Esc la cierra, y otro Esc cierra la ventana.
- **Un buscador para cualquier ajuste.** «/» lo enfoca; encuentra categorías, campos y agentes, con o sin acentos («version» encuentra «Versión»). Enter abre el primer resultado y te lleva directo al campo, que se ilumina un momento.
- **Todo se guarda al momento.** Apariencia se aplica mientras eliges, y los límites de la sala (presupuesto, pasos, tiempos, modelo de OpenCode, delegación) se guardan en `~/.pulse/config.json` en cuanto los cambias, ya sin botón GUARDAR. El idioma se aplica cuando decides recargar.
- **La ventana se adapta a su tamaño.** Ancha, muestra el tablero en tres columnas con la hoja al lado. Mediana, la categoría ocupa toda la ventana con un regreso a Ajustes. Angosta, queda una columna de íconos a la izquierda con la categoría a su lado. Si achicas el navegador, la ventana se encoge para no salirse, y recupera su tamaño cuando vuelve a haber espacio.
- **Las seis categorías están hechas de las mismas piezas.** Cada una se arma con bloques: un título, una línea que explica para qué sirve y, debajo, filas con lo que es cada ajuste a la izquierda y su control a la derecha (interruptor, selector, contador o campo). Todo usa la letra de la sala y escribe como una oración normal. La monoespaciada queda solo para lo que se escribe tal cual: rutas, versiones y comandos.
  - **Apariencia** empieza con la vista previa y sigue con Idioma y tema, Fondo, Acento y Conversación.
  - **Agentes**: cada agente tiene su ficha, con su estado en palabras (Con sesión, Sin sesión, No instalado) y sus permisos y modos, cada modo en su color.
  - **Memoria** abre con cuatro cifras del archivo y su madurez, con el siguiente paso. Debajo vienen el archivista, el recuerdo, el dataset y, plegados, el análisis y las tres pruebas.
  - **Sala y turnos**, **Privacidad** y **Versión y reportes** ya no son formularios de consola: cada grupo de ajustes es su propio bloque.
- **Los botones se sienten como teclas.** Los de la barra, el de conversaciones y los de AJUSTES ya no tienen la línea de luz arriba ni la sombra interna abajo que se leían como cejas en la orilla. Ahora están levantados sobre su propia sombra: al pasar el cursor suben un poco y al presionarlos se hunden. El botón en el color de acento ya no tiene brillo.
- **El acento llega a todo AJUSTES**: interruptores, etiquetas y botones toman el color que elegiste, no solo los botones.
- **Los textos de ayuda pesan menos.** Los títulos llevan el peso; lo que los explica usa la misma letra ligera de las burbujas de la conversación.
- **Volver al tablero es un botón redondo con un chevron**, junto al título de la categoría.
- **Apariencia pone primero lo que más cambias.** Bajo la vista previa vienen Color (tema y acento), después Fondo y Conversación, y al final Idioma, que recarga la página. La vista previa se queda fija arriba mientras bajas.
- **El modo elegido se marca en cuanto lo tocas** y se queda ahí mientras se guarda; si el guardado falla, vuelve al anterior.
- **La llave y el comando de inicio de sesión de un agente ya son parte de su ficha**, en lugar de un cuadro negro de terminal. Las notas de cada CLI sobre cómo inicia sesión ahora están en español.
- **La hoja de una categoría se ensancha como la vista de un servidor**: arrastra su orilla izquierda y recuerda el ancho. Doble clic en la orilla la regresa a su ancho normal.
- **El buscador se hunde al escribir**, como la caja de texto.
- **MU/TH/UR ya no tiene Conexiones, Memoria, Release, Turnos ni Centinela.** Todo eso vive en AJUSTES, y su botón **⚙ AJUSTES** la abre. Los avisos que mandaban a Conexiones, la píldora de versión nueva y «Siempre para este agente» abren AJUSTES directo en la categoría, y en el agente cuando aplica.

### MÓDULOS como tablero, y MU/TH/UR con el remedio primero

- **MÓDULOS es un tablero de tarjetas**, con el mismo estilo que AJUSTES. Cada módulo es una tarjeta con su ícono, su nombre y una línea de lo que hace. Los que tienen interruptor se encienden desde la tarjeta, sin abrirla. Ash, Intenciones y Ollama ocupan dos columnas y muestran lo que dicen de sí mismos en ese momento. Los encendidos van primero. Un buscador encuentra un módulo por su nombre o por lo que hace.
- **Al tocar una tarjeta se abre la ficha del módulo** en una hoja junto al tablero, o en todo el panel si es angosto. Es la misma ficha de siempre, con todo lo que hace, ahora con los bloques, la letra y los botones de AJUSTES.
- **Ash, Intenciones y Ollama se pueden abrir en ventana**: su ficha flota sobre la sala, se mueve, cambia de tamaño, recuerda dónde quedó y se mantiene al día. Lo decide MADRE para sus propios módulos; el SDK no cambia.
- **«Crea tu módulo»** es la última tarjeta. Abre una guía en cuatro pasos: pedírselo a tu agente en la sala con /module, escribirlo tú (con las carpetas donde vive y el SDK), recargarlo sin reiniciar, y qué pasa si habla con un servicio de fuera. Al final aparecen tus módulos y los que no cargaron, con el motivo.
- **Cada condición de MU/TH/UR dice primero qué hacer.** Debajo vienen los botones que lo resuelven desde la sala (subir un límite, abrir el agente en AJUSTES), luego los comandos para la terminal, el diagnóstico plegado y, al final, **«¿No se arregló? · Reportar»**, que abre el reporte con el código de la condición: en español, el formulario de madre.run; en inglés, un issue de GitHub.
- **AJUSTES › Archivos y servidores**: dónde se abren Finder (al lado o en ventana) y los servidores (acoplados o en ventana) sin tener que abrirlos, por qué el visor de archivos siempre se abre al lado, y los interruptores de la vista previa sellada (RIPLEY) y del navegador de los agentes (Playwright). **Finder y Servidores tienen un engrane** en su cabecera que abre esta categoría.

### Módulos como pequeñas apps, y la barra más clara

- **Ash, Intenciones y Ollama se abren como pequeñas apps.** En su ventana cada uno muestra todo lo que tiene. Ash incluye su economía completa (lo que se cobró, lo que no se cobró, cada agente y el comparativo con y sin Ash) al tamaño que le des a la ventana. «Ver la economía» ya no abre otro panel: abre la ventana de Ash. La ventana tiene los mismos botones de acomodar y cerrar que las demás.
- **Las tarjetas de MÓDULOS son todas del mismo tamaño** y ya no repiten el estado del servidor. Queda la etiqueta, y «Se abre en ventana» en las que pueden hacerlo. Los íconos van en tu color de acento, con su fondo; los de los módulos apagados, en gris.
- **Arreglos en MÓDULOS:**
  - Un clic en un espacio vacío del tablero se tomaba como un clic en el escritorio y apartaba las demás ventanas; ya no.
  - El botón de la barra trae de vuelta el tablero cuando ya estaba abierto pero apartado o detrás de otras ventanas.
  - El botón principal del instructivo era invisible en tema claro.
  - El instructivo recortaba la lista de tus módulos.
- **Al arrastrar, una ventana conserva su color.** AJUSTES, MÓDULOS y la ventana de un módulo se ponían blancas mientras se movían.
- **Los textos de ayuda se leen como la conversación**: la misma letra, con peso normal y en una tinta más firme, en AJUSTES, MÓDULOS y el instructivo.
- **Los nombres de las ventanas tienen más peso**: AJUSTES, MÓDULOS y CREA TU MÓDULO, alineados con sus botones.
- **Las teclas de la barra no muestran borde nunca**, ni con el cursor encima, ni presionadas, ni enfocadas con el ratón. Su cara es apenas más clara arriba que abajo, como si la luz viniera de arriba.
- **La luz de EN VIVO es un punto verde que respira** junto al nombre de la conversación, un poco más arriba que el texto. Al pasar el cursor dice su estado. En la ruta de la barra, el proyecto pesa más y la conversación menos.

### Teclas de un solo material, y MÓDULOS como ventana

- **Todos los botones son la misma tecla.** Están hechos del mismo color de la superficie donde están, sin borde ni degradado. Dos sombras suaves, luz arriba a la izquierda y sombra abajo a la derecha, los levantan; al presionarlos, esas mismas sombras pasan adentro. Aplica a la barra, conversaciones, AJUSTES, MÓDULOS y los botones de cada ventana. En los selectores y los grupos de botones de ventana, el riel va hundido y la opción elegida, levantada. Los campos y el buscador son la mitad hundida del mismo material. El botón en el color de acento conserva su color y su relieve.
- **MÓDULOS es una ventana como AJUSTES.**
  - Se arrastra desde su cabecera, cambia de tamaño desde cualquier orilla y recuerda dónde quedó.
  - Tiene los mismos dos botones que AJUSTES: acomodar y cerrar.
  - Se adapta a su propio ancho: el tablero pasa de cuatro columnas a tres, dos o una. En angosto, «Agregar un módulo» queda solo como «+» y el título se oculta.
  - Si ya está abierto pero detrás de otras ventanas, el botón de la barra lo trae al frente; si está al frente, lo cierra.
- **Cada módulo abre en su propio tablero**: su estado y su versión, y las cifras que guarda.
  - Ash: tokens sin cobro, turnos medidos y lo leído de caché.
  - Intenciones: turnos observados, cuántas veces le alcanzó el nivel y, cuando hay con qué calcularlo, los tokens que habrías ahorrado.
  - Ollama: el servidor, los modelos y los embeddings.
  - Los demás: cuántas cosas toca y cuántos comandos agrega.
  - «Lo que toca» y «Comandos» ahora son bloques de la sala. Tu módulo lleva la misma etiqueta «Tuyo» que en el tablero.
- **En tema claro, los botones principales dentro de una ficha de módulo** («Prueba completa», «Un par te espera») salían blancos y sin texto.
- **La vista previa de Apariencia no se mueve**: queda fija arriba y solo se desplazan los controles de abajo.
- **El punto EN VIVO ya no se corta** en la parte de arriba de la barra.

### La ficha de un módulo, con la jerarquía de AJUSTES

- **La ficha de cada módulo se arma con los bloques de AJUSTES**, ya no con la tarjeta de consola vestida encima:
  - primero, sus cifras;
  - luego «Qué hace», con su interruptor «Activo», su estado y la versión con «Buscar una nueva»;
  - sus ajustes como filas, con el nombre a la izquierda y el control a la derecha;
  - sus llaves;
  - lo que lee: la economía de Ash, lo que midió Intenciones, el cerebro local y los papeles de Ollama;
  - al final, «Lo que toca» (la etiqueta y las palabras en una línea) y «Comandos».
  - La ventana de un módulo muestra la misma ficha.
- **Las cifras se leen como cifras.** La principal es más grande y va en tu acento, y las demás la acompañan en un mosaico que se acomoda al ancho de la hoja o la ventana. Un módulo que no guarda cifras propias no recibe cifras inventadas: abre en «Qué hace».
- **La economía de Ash es un mosaico ordenado.** Las seis cifras van en una fila de tarjetas iguales, después las lecturas en tarjetas del mismo alto y la tabla por agente a todo lo ancho. En una hoja angosta se acomoda en una columna.
- **Los selectores se pueden deslizar.** Además de tocar una opción, puedes arrastrar de una a otra: una pieza levantada sigue al cursor o al dedo y se elige la opción donde sueltas. El riel tiene aire alrededor de sus opciones y la elegida va con más peso.
- **Los botones de ventana de MÓDULOS van a la derecha**, como en las demás ventanas.
- **Los buscadores se hunden al escribir sin brillar alrededor**, y su ícono no se enciende.
- **La vista previa de Apariencia vuelve a desplazarse con su sección.**

### Avisos que dicen su tono

- **Los avisos son una píldora de una línea** sobre la caja de texto, de la superficie de la sala y con una sombra plana y discreta debajo, sin reflejos alrededor. El color va solo en un punto: verde cuando algo quedó hecho, ámbar cuando algo pide atención y rojo solo cuando algo salió mal. Antes cualquier aviso salía en rojo, aunque dijera «guardado».
- **El avatar del modelo en la conversación es plano**: un tono sólido del color del agente, sin luz ni sombra, con el logo del proveedor más grande y en el color pleno del agente para que se lea de un vistazo.

### MU/TH/UR, una ventana con la respuesta primero

- **MU/TH/UR es una ventana como AJUSTES y MÓDULOS**: se arrastra por su encabezado, cambia de tamaño desde los bordes, recuerda dónde la dejaste y tiene a la derecha las mismas teclas de acomodar y cerrar. Ya no es una terminal; de ella queda solo el nombre, MU/TH/UR 6000. Abrir NOSTROMO o AJUSTES desde ella la deja donde estaba.
- **Escribe un síntoma y la respuesta sale primero.** A la derecha, el remedio que mejor coincide; a la izquierda, la lista con el resto de las coincidencias. Si lo que escribes no nombra ninguna condición, MU/TH/UR busca las más cercanas por sus palabras en lugar de quedarse en blanco.
- **La lista se filtra con chips**: Todas, Esta sala, Bloqueantes y uno por agente, cada uno con su cuenta. Si en la sala pasó algo, abre en **Esta sala**, con lo ocurrido arriba y su remedio más probable debajo; desde ahí se descarga el registro, se descartan los avisos o se recuperan los descartados. Lo que MU/TH/UR aún no conoce se puede reportar en un clic.
- **Cada remedio sigue el orden de AJUSTES**: qué hacer, la tecla que lo aplica desde la sala, «En tu terminal» con los comandos de tu sistema, «Por qué pasa» plegado y «¿No se arregló?» con su botón Reportar. Un punto de color en cada fila indica qué tan grave es.
- **«Preguntar a MU/TH/UR cómo» en un permiso abre el remedio directamente**, ya elegido en la lista. Si ese agente no tiene uno propio, abre el general del permiso, y si tampoco existe, busca por el nombre del permiso. Antes escribía un código en el buscador y, para algunos agentes, no encontraba nada.
- **Funciona en ventana angosta**: la respuesta queda arriba y la lista debajo. Los títulos largos se recortan para que el agente y el código sigan a la vista.

### Intenciones aprende de tu uso real sin gastar tokens

- **Intenciones aprende de los turnos que ya mandaste.** Antes solo aprendía con pruebas que volvían a hacer preguntas a dos niveles, y con un agente que lee el proyecto en cada respuesta una prueba rápida podía costar millones de tokens. Ahora lee lo que ya pasó en todas las conversaciones del proyecto: a qué nivel le pediste algo, qué tipo de pedido era, cuánto costó y qué hiciste después. Todo se calcula en tu computadora, desde el registro de la sala, y no se escribe ni se envía nada nuevo.
- **Cuándo un nivel alcanzó y cuándo se quedó corto.** Se quedó corto si el turno falló, si calificaste mal la respuesta, o si en los 15 minutos siguientes le volviste a pedir lo mismo al mismo agente: con «sigue sin funcionar», casi con las mismas palabras o a un nivel más alto. Un STOP cuenta solo si después lo volviste a pedir. Alcanzó si lo calificaste bien o si seguiste con otra cosa. Un turno de hace menos de 15 minutos, o uno que falló por un límite del proveedor, no cuenta para ningún lado.
- **Un nivel alcanza con al menos 8 turnos** y si, incluso en la lectura más pesimista, alcanzó en tres de cada cuatro, sin quedar claramente por debajo del nivel de arriba. Lo medido con una prueba sigue mandando sobre lo observado, y lo observado sobre la regla.
- **Bajo la caja lo dice con su origen**: «Parece una explicación · MEDIO alcanzó en 14 de tus turnos · cerca de 40% menos tokens», con la etiqueta «De tu uso».
- **La ficha empieza por lo que enseñó tu uso**: turnos observados, cuántas veces le alcanzó y, como estimación, los tokens que habrías ahorrado. Cada tipo de pedido dice su nivel y en cuántos turnos se vio, o «aprendiendo · 3 de 8 turnos». Las pruebas siguen debajo, en «Medir más rápido», con su precio.
- **Intenciones propone probar un nivel más bajo en un solo mensaje.** Tu uso solo enseña los niveles que usas, así que si todo lo mandas al nivel de siempre nunca vería si uno más barato alcanza. Cuando la regla cree que un nivel abajo basta para una búsqueda, una explicación o una revisión, en `#1` o `#2`, bajo la caja dice «Parece una búsqueda · podría bastar BAJO · pruébalo en esta y Intenciones lo nota», con la etiqueta «Prueba». «Probar bajo en esta» cambia el nivel solo para ese mensaje; el siguiente vuelve al que tenías. Lo propone a lo más en uno de cada tres mensajes que califican, hasta juntar 8 turnos a ese nivel; nunca en `#3` o `#4`, ni para un cambio, un diagnóstico o un diseño, ni con la ventana del proveedor casi llena. Si no alcanzó, el siguiente pedido del mismo tipo te ofrece volver a MEDIO, y si se quedó corto dos de las últimas tres veces, deja de proponerlo una semana. «Ahora no» lo guarda un día. La ficha dice «probando BAJO · 3 de 8 turnos» o «en pausa hasta» la fecha.

### MADRE 1.0, y medir con Intenciones sin sorpresas

- **Esta versión es la 1.0.0.** El rediseño completo (Ajustes, Módulos, MU/TH/UR, Permisos, GitHub) la hace mayor. El puerto a Windows pasa a 1.1.0, y MADRE sigue sin declarar soporte ni no-soporte de Windows. Al actualizar, una hoja de novedades nueva cuenta lo principal.
- **Las novedades son un tablero.** Al actualizar se abre una ventana con «Ya tienes la 1.0» y doce tarjetas, cada una con su imagen y una línea. Una tarjeta abre la nota completa en la misma ventana, con dónde está y una tecla «Llévame ahí» que cierra el tablero y abre ese lugar (Ajustes, MU/TH/UR, Intenciones, Permisos, GitHub, la barra en edición, MÓDULOS, NOSTROMO, Finder…). ← y → pasan de una nota a otra; Esc vuelve al tablero y otro Esc lo cierra. Se vuelve a abrir cuando quieras desde Ajustes › Versión y reportes › «Novedades de esta versión».
- **Una prueba de Intenciones dice su precio antes de correr**: cuántos turnos y cuántos tokens, calculado con lo que costó una respuesta en este proyecto. Si no hay con qué estimarlo, lo dice. La prueba completa ya no pide pulsar dos veces: pregunta una vez, con el precio.
- **Una prueba que falla guarda por qué**: la primera línea del error y lo que costó. La ficha dice cuántas pruebas fallaron y el último motivo, en lugar de solo «0 tipos medidos».

### Intenciones habla también con Claude

- **Intenciones ya sugiere al escribirle a Claude.** Claude Code no dice con qué esfuerzo corre por defecto, y sin ese punto de partida la regla callaba siempre que no hubiera mediciones. Ahora, sin inventar ese nivel, nombra el que conviene en las peticiones profundas («Parece un diagnóstico · suele irle bien ALTO · Subir a alto») e invita a medir en las ligeras. Con Codex sigue comparando contra el nivel que su configuración declara.
- **La sugerencia bajo la caja usa el estilo de la sala**: una tarjeta ligera, el motivo en una frase con un punto en tu acento, y una sola tecla en tu acento.

### MU/TH/UR angosta y la esquina redonda

- **MU/TH/UR en una ventana angosta es una lista sobre su respuesta**: los filtros y las condiciones en una franja corta que se desplaza sola, y debajo el remedio elegido completo. Antes la lista se encimaba sobre el remedio.
- **La esquina para cambiar el tamaño de una ventana sigue su curva**: un arco corto y redondeado, con puntas redondas, en lugar del ángulo recto. Se ilumina en tu acento al pasar el puntero.

### Relieve suave, un solo material y respuestas más limpias

- **Las tarjetas de AJUSTES, MÓDULOS y MU/TH/UR tienen relieve suave**: siguen blancas, iluminadas desde arriba a la izquierda por una luz amplia y asentadas abajo a la derecha por una sombra difusa, con un bisel fino dentro del borde. Las tarjetas se separaron un poco para que el relieve tenga espacio.
- **Finder y Servidores usan el mismo material** que AJUSTES, MÓDULOS y MU/TH/UR, en lugar del blanco plano.
- **Detener una respuesta es solo un ícono**: un cuadrado dentro de un círculo que se vuelve rojo al pasar el puntero y parpadea mientras se detiene.
- **La tabla «Por agente» de Ash vuelve a ser una tabla**: los encabezados en una sola fila, en letra de lectura, y los números alineados; en una ventana angosta se desplaza de lado.
- **El pie de una respuesta es una sola línea, sin divisor**: la hora, los tokens y el costo a la izquierda, discretos y en minúsculas; calificar, copiar y responder a la derecha, al pasar el puntero. Una respuesta corta ya no crece tres líneas. El total acumulado de la sala vive en el tooltip.

### Archivo nuevo desde Finder, y «Revisarlo con» completo

- **Finder tiene una tecla de archivo nuevo junto al buscador.** Pide la ruta desde la raíz del proyecto en la alerta de la sala, crea el archivo vacío (y las carpetas que falten) y lo abre en el visor. Nunca toca un archivo que ya existe, no sale del proyecto (sin `..`, sin unidad tipo `C:` ni rutas UNC, nada dentro de `.git`) y los archivos que la sala resguarda piden el nombre del proyecto, como al guardar.
- **El menú «Revisarlo con» del editor ya no se corta.** Vive en la capa superior de la página, se coloca según su tamaño real (arriba del botón cuando no cabe abajo) y habla como el resto: lo que se manda en mono pequeño, la pregunta en oración y los agentes como filas.

### Descargas que se ven, y la sala con su badge

- **Toda descarga o instalación muestra su progreso real** en una hoja ligera bajo la barra: actualizar un módulo, instalar o encender Ollama, descargar un modelo o instalar el CLI de un agente. Dice qué corre y cuánto lleva, y muestra el porcentaje y los MB cuando el instalador los imprime (Ollama sí; npm y brew casi nunca, y entonces la barra solo indica que sigue trabajando). Debajo va la última línea del instalador. Se puede ocultar mientras corre; al terminar dice «Listo» o «No terminó», con el detalle.
- **Actualizar un módulo pregunta en la alerta de la sala**, con el comando exacto que va a correr. Antes la confirmación se dibujaba en la tarjeta vieja del módulo y, en la ficha nueva, el botón parecía no hacer nada.
- **«Esta sala», en MU/TH/UR, lleva el badge de la barra** cuando algo pasó en ella.

### Íconos en tu acento, y @madre ya no «falta instalar»

- **Todos los íconos llevan tu acento**: las categorías de Ajustes y el glifo de las alertas (la llave de #3 y #4, las preguntas de la sala y el acceso a NOSTROMO, que ahora es el cerebro). Solo una pregunta que borra algo conserva el rojo.
- **@madre ya no aparece como «no instalado»**. @madre no se instala: es el agente local de la sala y está presente mientras Ollama corre con un modelo de chat. Cuando Ollama se apaga, la sala dice que @madre salió porque Ollama no está corriendo, y MU/TH/UR muestra el remedio de @madre con una tecla que abre Ollama. Antes lo diagnosticaba como un agente sin instalar y mandaba a Ajustes › Agentes, donde @madre no aparece. Los registros viejos con la frase anterior también reciben el remedio correcto.

### NOSTROMO en la barra y un pie que se lee

- **NOSTROMO tiene su botón en la barra de arriba**, junto a MU/TH/UR: un cerebro que late al pasar el puntero (dos pulsos y una pausa) y abre la misma puerta. El botón dentro de MU/TH/UR usa el mismo cerebro.
- **La versión y el autor se leen sobre cualquier fondo**: en la letra de lectura, sobre el material de la sala y con la versión un poco más gruesa. Se quitó el enlace «Apoyar».

### Cuatro acentos y cuatro fondos nuevos

- **Acentos nuevos**: Azul Pacífico, Rosa Amor, Azul Sierra, Pitahaya, Papaya (Pantone 15-1243 TCX), Agave, Negro Dinamo, Azul Marina, Verde Pulso, Naranja Leal y Amarillo Dulce. Como los demás, cada uno tiene su versión más oscura para leerse en el tema claro, y tu burbuja va en el color pleno.
- **Magna y Ventura cambian de foto**, con su velo, su malla y su tinte recalculados.
- **Fondos nuevos**: Biznaga, Oceano, Quila, Xico, Tropical, Tradicion y Urbania, con capa o malla, intensidad y desenfoque como los demás, y un velo y un tinte sacados de los colores de cada foto, en claro y en oscuro.
- **Las tarjetas de los fondos son más altas**, para que se vea más de cada foto.

### NOSTROMO en el idioma de la sala, y sus enlaces de vuelta

- **NOSTROMO vuelve a mostrar los enlaces entre memorias aunque Ollama esté apagado.** Los enlaces salen de comparar los vectores ya guardados, y la sala solo buscaba los del modelo de embeddings en uso: con Ollama apagado cambiaba a Gemini, Gemini no tenía vectores y el mapa quedaba sin enlaces. Ahora, si el modelo en uso no tiene vectores, el mapa usa los del modelo que más memorias embebió.
- **El acceso a NOSTROMO es una alerta de la sala**, como la llave de #3 y #4: «Abordar NOSTROMO», qué es el archivo en una frase y el campo para el nombre del proyecto. Los golpes de MOTHER siguen contando.
- **El marco de NOSTROMO habla como las demás ventanas**: el nombre en mono pequeño, la lectura (memorias, recordadas, enlaces) en oración, los tipos como punto y palabra, teclas suaves y el pie en oración. La tarjeta de una memoria y la de preguntas son vidrio oscuro con etiquetas en oración, cifras en mono pequeño y «Olvidar esta memoria» en un rojo suave. El mapa no cambia.
- **La llave de #3 y #4, más limpia**: una frase de lo que permite, otra más discreta de lo que la protege, la nota del modo máximo como etiqueta cuando aplica, y el campo dice qué escribir arriba, sin texto de ejemplo que haya que borrar.
- **Las tarjetas de AJUSTES empiezan a la misma altura en las tres columnas**, aunque un encabezado ocupe dos líneas, y en ventana angosta no se estiran. El encabezado de Sistema ahora dice «Permisos, privacidad y la versión».
- **En Permisos, el riel de la llave va debajo de su texto y a lo ancho**, con cada opción en una línea.

### Alertas de la sala con una sola forma

- **Las preguntas de la sala son una hoja angosta y centrada**: el ícono de lo que está en juego (un triángulo rojo si algo se pierde, un candado si pide una llave), el título en oración, una línea y las dos teclas a lo ancho. «Cambios sin guardar» y las demás confirmaciones dejan las mayúsculas de consola; las preguntas que salen de la consola conservan su consola.
- **La llave de #3 CONTROL y #4 AIRLOCK es esa misma alerta**: «Armar #3 CONTROL para @agente» o «Abrir #4 AIRLOCK para @agente», qué le permite al agente en una frase, el campo hundido para el nombre del proyecto, tu frase o AIRLOCK, y Cancelar o Armar. El candado lleva el color del modo. Los modales de apps (NOSTROMO, el núcleo, el visor, la guía de módulos) no cambian.

### Permisos: la llave de cada modo, a tu manera

- **AJUSTES tiene una categoría nueva, Permisos**, en Sistema. Reúne cómo se abren #3 CONTROL y #4 AIRLOCK y hasta dónde puede llegar cada agente.
- **La llave de cada modo se elige.** #3 puede pedir el nombre del proyecto (como hasta ahora), una frase tuya o solo confirmar con un clic. #4 siempre pide algo, porque ejecuta comandos: el nombre del proyecto y luego AIRLOCK (como hasta ahora), tu frase y luego AIRLOCK, o solo el nombre del proyecto.
- **Tu frase nunca se guarda.** El navegador calcula su huella (SHA-256 con sal) y solo eso queda en la configuración; MADRE no puede leerla de vuelta. Se escribe sin importar mayúsculas ni espacios de más. Olvidarla regresa al nombre del proyecto los modos que la usaban.
- **Una llave aceptada puede valer unos minutos.** Con la gracia encendida, el mismo modo para el mismo agente no vuelve a pedir la llave durante 5, 15 o 30 minutos en #3, y como máximo 5 en #4 (apagada por defecto). Junto al modo aparece un chip, por ejemplo «#3 abierto · 12 min», cuya × lo cierra. Recargar la página o PARAR TODO también lo cierra, y subir el modo máximo de un agente siempre pide la llave.
- **Quién puede qué**: el modo máximo de cada agente está en una sola tabla, con el color de cada modo. La ficha del agente lo muestra y lleva ahí con «Cambiar en Permisos»; el modo de inicio se queda en la ficha.

### Remedios con jerarquía y rieles con un solo tab

- **Cada remedio se lee en tres pesos**: el título; debajo, una línea discreta con la gravedad (la única palabra en color), el agente y el código; y luego qué hacer, en la letra de lectura y sin etiqueta encima. Las teclas que lo resuelven siguen como filas.
- **El engrane de MU/TH/UR abre sus propios ajustes**: el centinela en Versión y reportes, es decir, lo que guarda de lo que no sabe explicar y si lo reporta solo. El botón de reportar del encabezado se quitó; reportar vive en «¿No se arregló?» de cada remedio.
- **El ícono de MU/TH/UR late al pasar el puntero**: un pulso recorre su trazo como en un monitor. Se queda quieto si el sistema pide menos movimiento.
- **Los rieles tienen un solo tab que se desliza.** Al elegir otra opción, con clic, con teclado o deslizando, el mismo tab viaja hasta ella. Antes la opción anterior se apagaba mientras la nueva se encendía y por un momento se veían dos.
- **Las respuestas son de vidrio sobre un fondo**: el fondo se desenfoca y se aclara detrás de la burbuja, con un tinte más blanco que las líneas de la sala (memoria, relevos), para que una respuesta nunca se confunda con ellas. Flota sobre una sombra baja y suave, sin bordes de luz alrededor.
- **A quién va cada mensaje se lee sobre cualquier fondo**: «→ @agente» conserva el tono del agente, pero mezclado con la tinta del tema y con más peso.
- **Las filas rápidas de AJUSTES respiran**: el riel de Tema ya no toca los bordes de su fila, y un interruptor cuyo texto ocupa dos líneas («Auto-reportar condiciones desconocidas») tiene interlineado de lectura.

### Una sola luz y la guía del SDK al día

- **Todas las superficies comparten una luz, más suave.** Botones, tarjetas, mosaicos, cifras y bloques reciben la luz desde arriba a la izquierda, con sombras más bajas que antes. Un botón es la versión chica de esa luz y una tarjeta la grande; lo presionado y los campos se hunden de la misma manera.
- **Los buscadores se hunden de verdad al escribir**, y el de Finder es el mismo campo que en AJUSTES y MÓDULOS, con su lupa.
- **Los números de modo van en el color de su modo** (#0 a #4), estén elegidos o no.
- **La llave y el comando de inicio de sesión de un agente siguen el mismo estilo que el resto de la ficha**: etiquetas en oración, campos hundidos y el botón principal en tu acento. El campo de la llave ya no dice «Provider key» en inglés.
- **Intenciones, mientras corre una prueba**: «Prueba rápida en curso» es una tarjeta con su punto encendido y botones de su tamaño, en oración.
- **Íconos nuevos para los módulos de MADRE**, con el lenguaje de la barra: trazo redondo y una parte con relleno suave.
  - Ash, líneas que se acortan.
  - Intenciones, un medidor de esfuerzo.
  - Ollama, una computadora con su cerebro.
  - Image Studio, una foto con su chispa.
  - Playwright, un navegador con su cursor.
  - RIPLEY, un documento con su ojo.
  - Git Pulse, una rama con el pulso de MADRE.
  - Runs, un botón de reproducir.
  - Choices, la opción elegida.
  - AHP+, un relevo de ida y vuelta.
  - CORREO, un sobre.
- **Las burbujas son una superficie con relieve sobre el fondo**, con esquinas más redondas. El avatar queda separado de la burbuja, a la altura de su última línea.
- **El aviso de versión nueva manda a AJUSTES › Versión**, donde ahora se reinicia.
- **La guía del SDK describe el tablero y la ficha nuevos.** Un módulo se escribe igual que antes (declaras y MADRE lo dibuja), pero la guía ya no habla de la tarjeta de consola, `DEV`, `DESINSTALAR` ni `RELOAD MODULES`.

### Personalizar MADRE, y las tarjetas de la sala en orden

- **Un botón PERSONALIZAR en la barra**, solo con su ícono, abre una ventana con una vista previa de la conversación junto a las opciones:
  - **Idioma** de toda la interfaz, que antes era el botón EN/ES.
  - **Acento**: Verde Madre, Verde Montaña, Azul Caribe, Púrpura Fantasma, Tinto Malbec y Amarillo Dijon. Cada esfera muestra el tono en tema oscuro arriba y en tema claro abajo, donde se oscurece para leerse con contraste AA. Pinta la conversación, los botones y el cuadro de texto mientras está en EXCHANGE (#1), que ahora tiene un borde suave del color de su modo. Los demás modos de permiso conservan sus colores, porque cada uno dice cuánto puede hacer un agente. El botón ASH conserva el verde de Homebrew; al encenderse, ASH solo anima la caja y ya no le cambia el color.
  - **Burbujas**: Cómodo (el de siempre), Grande, Compacto y Ajustado, que es más ancho y con más aire entre líneas.
  - **Texto de la conversación**: Cómodo, Más grande, Más pequeño y Visual, con negritas.
  - **Fondo**: Por defecto, **Jarrito** (Guadalajara en ilustración: mariachi, catedral, talavera, jacarandas), **Canela** (un lago entre cerros de otoño bajo la niebla), **Paraíso**, **Ventura** y **Magna**. Cada uno tiene versión clara y oscura, y cuida el contraste de lo que se escribe encima.
  - **Tema** (Automático, Claro, Oscuro), que antes era el botón de la barra.
  - Lo que eliges se ve primero en la vista previa, también con un botón de muestra, y llega a la sala solo con **ACEPTAR**. Cerrar la ventana lo descarta. **VOLVER A LO DE SIEMPRE** regresa la vista previa a los valores de siempre, para aceptarlos.
  - Al pasar el cursor por una esfera, su nombre aparece junto a ACENTO.
  - Es una ventana como las demás: se arrastra, cambia de tamaño y tiene su botón de ventana y su ×. La mitad derecha y las conversaciones en ventana siguen los cambios aceptados al instante.
- **ACOMODAR las ventanas.** Si dejas el cursor sobre el botón de ventana de cualquier ventana, sin presionarlo, aparece una tarjeta con cuatro formas de acomodar lo que flota: **Llenar**, **Mitades**, **Una y dos** (una grande y dos chicas) y **Cuatro**. La ventana desde la que lo pides toma el primer lugar y las demás siguen en el orden en que las tocaste. Si estaba acoplada, primero pasa a ventana.
- **Las ventanas tienen profundidad**: un borde fino, el canto de arriba iluminado y el de abajo en sombra, un brillo tenue desde arriba y una sombra en tres capas, más honda en la ventana del frente y en la que llevas en la mano.
- **Un clic en el escritorio lo muestra.** Con ventanas abiertas, un clic en cualquier espacio libre de la sala hace a un lado las ventanas y despeja el escritorio; otro clic las regresa. Los botones, los enlaces y seleccionar texto no cuentan.
- **Vidrio con bisel de gota de agua.** Las ventanas y la barra ya no tienen un borde dibujado: su orilla es el vidrio que se curva, con luz arriba, sombra abajo, una separación de color tenue en el canto y un brillo de difracción diagonal. La barra flota sobre esa capa, translúcida y desenfocada, para leerse sobre cualquier fondo.
- **Sobre un fondo de pantalla, todo se lee.** La respuesta es una hoja de vidrio casi blanca en tema claro y del oscuro de la sala en tema oscuro, con el mismo bisel de las ventanas, para que no se confunda con ningún fondo. Lo que se escribe directo sobre el fondo (las líneas de la sala, quién respondió, la hora de tus mensajes) ya no va en una placa: flota en una nube suave del tinte de cada fondo (azul en Paraíso, verde en Ventura, rosa en Magna, ámbar en Autumn, hueso o azabache en MADRE). La tarjeta donde un agente pide un modo y los chips de la caja de texto conservan su placa de vidrio.
- **La respuesta lleva su propio pie.** Lo que recordó y lo que costó viajan dentro de la burbuja, bajo una línea fina: a la izquierda, un punto por memoria en el color de su tipo (hueco si llegó por asociación) y cuántas usó; a la derecha, la hora, los tokens, lo no cobrado y el total de la sala. Al presionar la memoria se abren las notas debajo, y cada una sigue llevando a NOSTROMO. Ya no queda nada suelto bajo la respuesta.
- **Las memorias que usó una respuesta, en orden.** Al abrirlas se acomodan en columnas parejas que llenan el ancho de la burbuja (una sola en ventana angosta), con el «+N» en la celda de la última. El pie y las notas siguen el tamaño de texto y el peso que eliges en PERSONALIZAR.
- **Imágenes nuevas para los fondos.** Jarrito y Canela sustituyen a los fondos dibujados MADRE y Autumn (quien los tenía elegidos pasa al que los reemplazó), y Paraíso, Ventura y Magna cambian por versiones compuestas para la sala en 16:9. Las cinco se pueden ajustar con capa o mesh, intensidad y desenfoque.
- **La tripulación vive en la caja de texto.** Las cinco esferas sobre la caja son ahora una sola esfera redonda a su izquierda, la del agente al que escribes; al pasar el cursor (o al tocarla) el resto de la tripulación sube en una columna de vidrio; bajo el cursor, el nombre del proveedor de cada agente sale de su esfera, y elegir uno la cierra. La línea de la caja dice la dirección completa, HUMANO › ASH › @CODEX ›, en el color del agente, en lugar de un PARA @CODEX aparte. Modo, modelo y esfuerzo pasan a una fila debajo de la caja, alineados a la izquierda con la esfera y la caja. La conversación no se corta donde empieza la caja: sigue por debajo de ella. La caja es de vidrio líquido y, al hacer clic en ella, se hunde hacia dentro sin moverse ni cambiar de tamaño: solo se sombrea por dentro desde el canto superior, como una tecla presionada, y se queda así mientras escribes; el anillo de su modo (CREATE, CONTROL, AIRLOCK) no cambia al hacer clic; y las preguntas sugeridas van centradas sobre ella, en vidrio, para no confundirse con una burbuja.
- **La barra y la caja de texto son casi sólidas**, con el fondo apenas detrás, para que se lean como las dos piezas fijas de la sala; la caja es de un solo color, sin luz degradada en su cara.
- **Lo que se ofrece sobre la caja se lee sobre cualquier fondo.** La oferta de @madre y el aviso de Intenciones eran un recuadro punteado casi transparente que se perdía en una foto; ahora son una pieza casi sólida como la caja de texto, con su mismo canto de vidrio, un filo fino de su color (verde, o ámbar cuando conviene subir el esfuerzo) y el texto en la tinta principal del tema.
- **Las líneas de la sala son vidrio plano.** PLAN, MEMORIA, los relevos, quién respondió y la hora ya no llevan una luz que cae por su cara: un tinte más delgado deja ver el fondo.
- **Cantos de gota de agua, sin doble borde.** Los chips, las tarjetas de la sala, las píldoras de memoria, las preguntas abiertas, la barra, la caja y las ventanas se dibujaban con líneas (un anillo fino por fuera, una línea blanca por dentro y a veces un borde encima) y se leían como dos bordes pegados al fondo. Ahora su orilla es solo luz difusa en el canto de arriba, sombra difusa en el de abajo, un asomo de rosa y cian a los lados y una sombra suave debajo, así que flotan sobre el fondo sin ningún trazo.
- **Los chips son etiquetas de tono plano.** Las insignias de quién respondió (modo, ASH, turno de cierre, paso, a quién contesta, modelo), el agente dentro de una línea de la sala, la hora de tu mensaje, DECIDIDO AQUÍ y sus decisiones, las memorias de una respuesta y las preguntas abiertas ya no son cápsulas con canto: son etiquetas con esquina de 7 px, sin borde ni sombra, rellenas de un tono tenue de su propio color (el del modo, el del agente, el del tipo de memoria, ámbar en las decisiones y gris en lo que no tiene color). La línea de quién respondió es una franja plana que las sostiene.
- **En el pie de una respuesta, primero la hora y luego sus botones**, los dos a la derecha.
- **En tema oscuro se leen PLAN y las etiquetas tenues**: la tinta más tenue subió un paso.
- **La caja de texto ya no cambia de borde con el modo.** Lo que cambia es el botón de enviar y las palabras de la línea (quién escribe, el agente, el modelo). En tema oscuro la caja es de un negro grafito propio, y la fila de modo, modelo y esfuerzo se queda atrás para no competir con ella.
- **La oferta sobre la caja (Intenciones y @madre) es vidrio plano** sin borde de color; su botón es una etiqueta de su tono, oscurecida en tema claro.
- **Los botones de la barra se sienten pulsables**: una cara tenue, el canto de gota, una sombra que crece al pasar el cursor y que se hunde al presionar. Cada dibujo se mueve a su manera: el navegador gira sobre su eje, la carpeta se abre, los puntos de PERSONALIZAR se deslizan, MÓDULOS se sacude, RECARGAR da una vuelta y las líneas de CONVERSACIONES se escriben.
- **El fondo se aparta un tono de lo que está encima.** En claro, un gris suave bajo hojas blancas; en oscuro, casi negro bajo grafito: las respuestas, la barra y el botón de conversaciones ya no se pierden en él.
- **Los botones de la barra son teclas.** Una cara un tono más clara que la barra, luz suave arriba, sombra suave abajo y una sombra corta debajo, sin aro ni orilla de color. Al pasar el cursor ceden un poco y al presionarlos se hunden más, como los botones de un aparato; el que tiene su panel abierto se queda hundido con su dibujo relleno. Sus animaciones son más rápidas, y la carpeta de archivos se abre de verdad: su frente cae hacia delante.
- **La caja de texto y la barra están más separadas del fondo**, con una sombra más profunda en los dos temas.
- **Las etiquetas de quién respondió caben dentro de su franja**, más chicas y con aire alrededor, en lugar de medir lo mismo que la franja que las sostiene. **DECIDIDO AQUÍ** mide lo que sus palabras, y las decisiones son de piedra (#edece4 en claro, grafito cálido en oscuro) en lugar de ámbar.
- **NUEVA CONVERSACIÓN lleva un + más grande** en lugar del globo pequeño.
- **El pie de una respuesta tiene un solo borde izquierdo.** Cuando la hora y los tokens bajan a la segunda línea empiezan donde empiezan los puntos de la memoria, igual que las píldoras de memoria; antes quedaban corridos 10 px.
- **La barra y la caja de texto se separan del fondo** con la misma luz que las ventanas, desde arriba a la izquierda, pero más suave: una sombra de contacto bajo el canto, otra que se abre un poco y una tercera desplazada hacia abajo y a la derecha.
- **La letra chica de la sala es Geist Mono.** Las líneas de la sala, quién respondió, la caja de texto, los chips, el pie de cada respuesta, las ventanas y el código pasan de JetBrains Mono a Geist Mono, la mono de la misma familia que la letra de las respuestas: más redonda y más ligera sobre el vidrio. MU/TH/UR y NOSTROMO, la terminal de la nave, conservan JetBrains Mono. La fuente viene en el paquete con su licencia OFL; nada se descarga de un servicio de fuentes.
- **Los botones de la barra, al pasar el cursor, solo brillan en el borde.** Antes sumaban un halo de 3 px a un borde del acento (dos contornos) y no reaccionaban igual en todos; ahora el dibujo toma el acento y el canto atrapa una línea fina de él por dentro, sin resplandor alrededor, igual en todos los botones y en el de conversaciones.
- **La bienvenida de una sala nueva va en una tarjeta.** El pulso, el título, la línea de ayuda y las tres primeras preguntas se agrupan en una tarjeta del vidrio del texto secundario, y las tres preguntas son filas dentro de ella, para que no pierdan fuerza sobre un fondo cargado.
- **MEDIRLO CONTRA ESTA SALA y los demás botones de las líneas de la sala tienen un solo color y un solo borde**: el suyo desde el reposo, sobre vidrio claro; con el cursor solo se intensifica el relleno, sin moverse ni mostrar un segundo contorno.
- **SIGUE ABIERTO AQUÍ se puede cerrar** con una × discreta junto a su título. Se queda cerrado para esas mismas preguntas y vuelve a abrirse cuando aparece una nueva.
- **Chips concéntricos.** Un chip dentro de un contenedor guarda el mismo espacio por todos lados y el radio del contenedor es el del chip más ese espacio, así que las dos curvas corren paralelas: en la fila de quién respondió, en la fila de modo, modelo y esfuerzo, y en las líneas de la sala que llevan un chip.
- **Recargar tiene su animación, la de cuando MADRE llega.** La sala se suaviza tras una cortina de su propio fondo y el pulso se traza al centro con su punto corriendo en la punta. Al volver, la cortina ya está desde el primer cuadro con el pulso trazado; cuando la sala está lista aparece el nombre MADRE junto al punto, la cortina se retira en su lugar y el logo de la barra responde con un pulso, en su punto y en la luz de EN VIVO. Con movimiento reducido, recarga sin animación.
- **El scroll ya no deja bloques vacíos.** Dentro de la conversación nada desenfoca lo que tiene detrás: cada desenfoque era una capa que el navegador tenía que volver a pintar, y con cientos de burbujas y etiquetas, sobre todo dentro de una ventana, al hacer scroll rápido se veían rectángulos grises sin texto. El material de la conversación es ahora un tinte plano un poco más denso; la barra, la caja de texto y las ventanas, que no se desplazan, conservan su vidrio.
- **La caja de texto en una ventana o media pantalla.** Bajo 560 px de ancho, el texto ocupa toda la primera fila y la etiqueta y los botones van debajo; antes quedaba una columna de una palabra por línea, por ejemplo al cargar una pregunta sugerida. Además, el alto del texto se vuelve a medir cada vez que cambia el ancho del campo, no solo al teclear.
- **Arrastrar ventanas es más fluido y más libre.** Mientras se lleva, la ventana es una sola capa plana que mueve el compositor, sin volver a desenfocar la sala debajo en cada cuadro. Se puede sacar en parte por la izquierda, la derecha o abajo, como en un escritorio, siempre con 120 px de su encabezado a la vista para recuperarla; cerca de un borde se pega a él desde cualquiera de los dos lados.
- La versión y APOYAR van en la esquina inferior derecha, nítidos, sin cápsula ni sombra alrededor de las letras.
- **Los selectores junto a la tripulación son una sola línea.** Modo, modelo y esfuerzo ya no van en cápsulas: cada uno es su palabra en su color y un chevrón dibujado, más grande, que indica que se abre; con el cursor encima o con su menú abierto aparece un fondo suave de su color. La memoria que usó una respuesta se abre con el mismo chevrón.
- **Paraíso, Ventura y Magna se ajustan.** En PERSONALIZAR, al elegir una de las fotografías aparecen tres controles: **Capa** (el velo de siempre) o **Mesh** (una malla de los colores de la propia foto en tres esquinas), un deslizador de **intensidad** de 0 a 140 % y uno de **desenfoque** de 0 a 24 px. La vista previa los muestra mientras los mueves y llegan a la sala con ACEPTAR.
- La vista previa de PERSONALIZAR usa el vidrio de su propio tema: una vista oscura dentro de la sala clara ya no dibuja un contorno blanco alrededor de la burbuja de ejemplo. Además muestra la letra pequeña: una línea de la sala, quién respondió con sus chips y la hora de tu mensaje, para ver cómo se leen sobre el fondo antes de aceptarlo.
- **Quién respondió, en una sola línea.** El agente, el modelo, el modo y ASH ya no se parten en dos renglones: mantienen su ancho, y lo que cede es la pregunta citada, que termina en puntos suspensivos. Sobre un fondo, cada chip es un trozo de vidrio.
- **Los botones de la sala son de vidrio transparente.** INSTALAR, PARAR TODO y las respuestas a un permiso o a un modelo local ya no tienen brillo ni relleno lechoso: son un vidrio claro de su propio color, con lo de atrás desenfocado, una orilla del mismo color y en los cantos la separación de luz de un lente, rosa a la izquierda y cian a la derecha. En tema claro su color se oscurece para leerse. Se elevan un poco con el cursor y ceden al presionarlos. Los chips de quién respondió usan el mismo vidrio.
- **Todo lo que va entre mensajes se lee, sobre cualquier fondo, como lo resuelve Apple.** Apple nunca escribe texto directo sobre una foto: cada etiqueta va sobre un *material* (lo de atrás desenfocado y saturado bajo un tinte del propio tema) y su color se elige contra ese material, no contra la foto. MADRE hace lo mismo. Las líneas de la sala, quién respondió, la hora de tus mensajes, la memoria guardada, DECIDIDO AQUÍ, la etiqueta junto a la tripulación y el pie de página van sobre un mismo material: lo bastante grueso para que el contraste sea el del tema con cualquier fondo, intensidad o desenfoque, y plano (sin sombra ni brillo) para quedar por debajo de la respuesta. Las etiquetas siguen la jerarquía del tema: tinta principal en los títulos y secundaria en el resto, nunca la terciaria tenue. Los chips sobre el material son un tinte con borde, no otro vidrio encima. En tema claro, los colores de avisos, permisos, proyecciones y agentes se oscurecen hasta leerse. Sin fondo, todo usa la tinta de la sala en lugar del gris tenue. Antes, un halo alrededor de cada letra dependía de la foto y en algunos fondos se veía como texto desenfocado. El material es discreto: deja pasar el fondo con un desenfoque suave y se ciñe al texto.
- **Burbujas sencillas y sólidas.** Una hoja de un solo color, con un radio pequeño y parejo y una sombra fina debajo: blanca en tema claro, del color de burbuja de la sala en oscuro; la tuya conserva el acento. Se leen igual sobre cualquier fondo.
- **Texto secundario de vidrio líquido.** Las líneas de la sala, quién respondió, la hora y DECIDIDO AQUÍ desenfocan y saturan el fondo que tienen detrás bajo un tinte delgado, con la luz en el canto superior, el inferior en sombra y la separación rosa y cian de un lente en los lados. Solo las piezas que están en pantalla (o a punto de entrar) llevan el vidrio, así que una conversación larga no le pide al navegador cientos de capas y el scroll no deja bloques vacíos.
- **Las acciones de una respuesta viven en su pie.** Calificar, copiar y responder con otro agente dejaban un renglón vacío en cada burbuja esperando al cursor; ahora están en el pie, entre la memoria y la cuenta, y aparecen con el cursor o el foco, así que la burbuja mide lo que dice.
- **La luz de EN VIVO respira.** Mientras la sala está en vivo, el punto se hincha y se asienta despacio y sus ondas lo siguen.
- **Las líneas de la sala siguen tu tamaño y peso de texto.** Con Más grande o Más pequeño crecen o se reducen junto con las burbujas, y con Visual su trazo es más firme.
- **PARAR TODO dentro de un aviso ya no salta al pasar el cursor**: solo se intensifica su relleno. Cuando ya no queda nada corriendo, el botón queda apagado en el historial y no se puede volver a presionar; un aviso que se vuelve a cargar al abrir la sala llega apagado.
- **Las esferas de los agentes se ven sobre cualquier fondo**: cada una se apoya en un disco de vidrio antes de llevar el color del agente, en la conversación y en la fila de la caja de texto.
- La marca de una pregunta abierta es un ícono dibujado para MADRE en lugar de un «?» de texto.
- **La barra en una ventana angosta.** MADRE conserva su nombre completo y lo que se acorta es el título de la conversación, con puntos suspensivos. PERSONALIZAR y recargar ya no desaparecen bajo 1180 px. El botón de conversaciones sigue flotando en el lienzo a cualquier ancho: se arrastra y abre la lista sobre la conversación igual que en una ventana grande. Bajo 680 px el título ya no desaparece ni la barra se parte en dos renglones. El nombre del proyecto nunca se acorta; solo el de la conversación. Los archivos tampoco desaparecen: solo el navegador se retira bajo 1180 px. PERSONALIZAR, recargar, el navegador y los archivos tienen el mismo tamaño que los demás botones de la barra en cada ancho: 26 px de alto en una barra ancha y el mismo squircle de 34 px en una angosta.
- **DECIDIDO AQUÍ, en orden.** El encabezado va en su propia línea y las decisiones debajo, en columnas parejas que llenan el ancho, en lugar de dos arriba y una suelta abajo. Sobre un fondo, cada una es una tarjeta del tinte del fondo.
- **El botón de conversaciones es de vidrio y se puede mover.** Tiene el mismo vidrio y la misma orilla fina que la barra. Si lo mantienes presionado un momento, se levanta y lo llevas a cualquier lugar de la sala, debajo de la barra; ahí se queda la próxima vez. Un clic corto lo sigue abriendo. Con el cursor encima o mientras lo llevas, toma el color del acento, como los botones de la barra. Tiene más cuerpo: la luz cae desde arriba sobre su vidrio, con el canto superior iluminado, el inferior en sombra y una sombra en tres pasos, para que no se pierda en la sala.
- La vista previa de PERSONALIZAR muestra el tema que eliges, aunque la sala siga en el otro.
- **Chips que se leen.** Las insignias de cada respuesta (el modo, ASH, el modelo, a quién contesta), lo que costó y la etiqueta junto a las esferas de la tripulación son un paso más grandes, con un relleno de su color detrás de la palabra y, en tema claro, el color del modo oscurecido hasta leerse.
- **PARAR TODO dentro de un aviso es un botón.** Antes decía STOPALL y solo indicaba qué escribir; ahora frena todo como el botón de la barra, y su rojo se oscurece en tema claro para leerse.
- La orilla de la barra es más delgada: medio píxel de línea y medio de luz.
- **Profundidad por capas**: una ventana se desenfoca solo si otra la tapa de verdad (lado a lado, todas se ven nítidas), apenas con una encima y un poco más con dos o tres. El escritorio (la conversación, la barra, la caja de texto y los paneles acoplados) es la capa del fondo mientras flotan ventanas, como detrás de un modal. Se despeja mientras escribes en la caja o mientras las ventanas se hacen a un lado, y en cuanto haces clic fuera vuelve a su capa. Al cerrar ventanas el desenfoque baja en cascada, y al cerrar la última desaparece. Una ventana tapada se aclara a medias bajo el cursor.
- **El escritorio se aleja detrás de un velo, no de un filtro.** Con ventanas abiertas, la sala se suaviza tras un velo que queda entre ella y las ventanas; antes cada pieza llevaba su propio filtro, y eso apagaba el vidrio de las burbujas y de las líneas de la sala mientras hubiera una ventana. Las conversaciones (su panel y su botón) quedan por encima del velo, siempre nítidas.
- **Las ventanas proyectan una sombra paralela**, muy suave, desplazada hacia abajo y a la derecha como si la luz viniera de arriba a la izquierda, para que se lean como un plano separado de la sala.
- **Al arrastrar una ventana, la sala se hace a un lado**: lo de atrás se desenfoca un poco, aparece una retícula de puntos tenue, y el borde se ilumina cuando la ventana se pega a la orilla. Al soltarla, todo regresa.
- **Los nombres de los agentes en las líneas de la sala cambian de color con el tema.** Un relevo, una memoria o un aviso de privacidad dibujados en tema oscuro se quedaban con el verde brillante de @madre al pasar a tema claro, donde casi no se leía.
- **ASH encendido se lee en tema claro**: es una terminal clara con el tono del acento, en vez de la terminal negra donde un acento oscuro desaparecía.
- **El menú de modos se lee como tabla**: número, descripción y etiqueta (AHORA, ANULACIÓN, ANULACIÓN ×2) alineada a la misma orilla derecha en las cinco filas.
- En tema claro, los botones de la barra ya no brillan al pasar el cursor: el borde se oscurece un poco y una sombra neutra los levanta.
- **Todo se mueve más rápido, con las mismas curvas.** Las transiciones y las animaciones de la interfaz (paneles, ventanas, menús, avisos, el desenfoque) duran cerca de un 30 % menos, porque todas dependen de un solo ajuste. Los momentos de marca, como el encendido de MU/TH/UR, el latido del logo o la pantalla roja, conservan su tiempo.
- **Íconos nuevos, dibujados para MADRE.** 37 íconos de la barra, la caja de texto, las ventanas, las acciones de una respuesta y los comandos tienen un trazo más redondo y formas más llenas: EN VIVO, tripulación, PARAR TODO, MÓDULOS (una pieza de rompecabezas), personalizar, recargar, tema, navegador, archivos (una carpeta), conversaciones, adjuntar, enviar, nueva conversación (con su insignia de +), señalar, copiar, preferir y los comandos `/create`, `/module`, `/image`, `/stopall` y `/ahp`, entre otros. Se encienden y se engrosan igual que antes. Los íconos de 8 bits de MU/TH/UR y las marcas de los agentes no cambian.
- **Las tarjetas de MÓDULO, PRIVACIDAD y MEMORIA tienen orden**: el título con el agente, lo que pasó en una frase legible, los botones en su propia fila y la advertencia al final. Antes eran una sola oración en mayúsculas que se partía donde cayera.

### Intenciones: cuánto debe pensar cada agente, medido en tu proyecto

- **Un aviso bajo la caja cuando hay una razón.** Con Claude Code y Codex, que aceptan esfuerzo por turno, MADRE lee lo que escribes y la conversación hasta ahí y, si conviene otro nivel, lo dice en una línea con un botón: «Parece una búsqueda · BAJO bastó en los casos medidos · USAR BAJO». En ámbar cuando el nivel elegido se queda corto: un diagnóstico en el nivel más ligero, una petición después de una respuesta que no lo resolvió, mucho que leer o un «piénsalo a fondo». Mientras el aviso está a la vista, el chip de esfuerzo lleva una flecha. Nada cambia solo: el nivel lo eliges tú.
- **Para sugerir un nivel más barato, primero lo mide.** Si escribes en un nivel alto algo que suele resolverse con menos y todavía no se ha medido en tu proyecto, el aviso no te pide confiar en una suposición: te invita a medirlo. «Parece una explicación · MEDIO suele bastar para esto, pero aún no lo medí en este proyecto · AHORA NO · MEDIR · 6 PREGUNTAS». AHORA NO se recuerda por agente y modelo.
- **Medir es la prueba rápida, en una ventana sobre la sala.** Toma seis preguntas reales de tus conversaciones en este proyecto, primero del mismo tipo que la que escribías, y cada una la contesta el agente dos veces: en tu nivel y en el que se sugiere. Te enseña las dos respuestas sin decir cuál es cuál y eliges la primera, la segunda o igual. Si las seis eran de ese tipo y en ninguna viste diferencia, ese nivel queda medido para ese tipo de pregunta y desde entonces el aviso lo sugiere con la medición detrás; si el proyecto tenía menos, es una primera lectura y MADRE no cambia nada por ella. Al terminar, la ventana dice en una frase qué basta y qué hará MADRE.
- **Dos pruebas en la tarjeta INTENCIONES de MODULES.** La **prueba rápida** también se abre desde ahí, en la misma ventana. La **prueba completa** baja la escalera nivel por nivel para cada tipo de pregunta (búsqueda, explicación, revisión, diagnóstico y diseño) y la juzga un agente que no es el medido, el modelo local primero. Antes de creerle, MADRE le enseña una respuesta recortada a un tercio: si no nota la diferencia, la prueba se detiene y no se guarda nada de lo que dijo.
- Las dos dicen cuántos turnos van a gastar, la completa pide confirmación, ninguna corre con la ventana del agente arriba del 80 % y solo hacen preguntas de lectura, sin permiso de escribir.
- **Un nivel cuenta como suficiente cuando casi nunca pierde**: con seis comparaciones, ninguna perdida; con doce, una. Las mediciones se guardan junto a la sala, en `intents.jsonl`, nunca en la conversación, son por agente y modelo, y dejan de contar cuando cambia la versión del CLI.
- La tarjeta muestra, por agente, qué nivel basta para cada tipo de pregunta, cuántos casos lo respaldan, cómo le fue al juez, los tokens gastados en medir y cuántas sugerencias tomaste. Se apaga desde su interruptor.

### @madre respeta la forma que le pides

- **«Responde únicamente con: CANARY-071» devuelve CANARY-071.** Un equipo que usa MADRE como memoria local encontró que @madre contestaba con una memoria del archivo en vez de lo que se le dictaba. Ahora una respuesta dictada palabra por palabra se devuelve sin consultar el archivo ni el modelo, y no entra a la memoria. «Escribe únicamente: …» ya no se toma como una orden de escribir archivos.
- **Si pides la forma, @madre la sigue.** «Responde solo con sí o no» o «en una sola palabra» reciben exactamente eso, sin citas ni explicación. El resto de las respuestas siguen citando su fuente con `[#n]`, y ahora lo hacen más seguido.

### Lo que cada turno lleva, y lo que la sala dice

- **Codex ya usa la memoria y el navegador de la sala.** Codex corre aquí sin pedir aprobaciones, y así rechazaba toda herramienta de MADRE («MCP tool call requires approval»): nunca había podido buscar en la memoria ni abrir una página. Ahora las herramientas de la sala le llegan aprobadas.
- **Cada turno lleva solo las herramientas que usa.** El navegador de PLAYWRIGHT se adjunta en los turnos que piden ver, probar, capturar o revisar la consola de una página, y no en el resto. Sus herramientas viajan en cada llamada que el agente hace dentro del turno, así que un cambio de una línea cargaba miles de tokens de un navegador que nadie abrió.
  - Codex y Gemini reciben solo las 16 herramientas que la sala permite, no las 25 del servidor.
  - ECONOMÍA compara la entrada del turno mediano de cada agente con y sin cada servidor de herramientas, cuando hay al menos dos turnos de cada lado.
- **PLAYWRIGHT se prueba al encenderlo.** MADRE arranca su servidor y le pide abrir una página en blanco. Si no arranca o le falta el navegador, se queda apagado y dice qué instalar. Si ya estaba encendido, su ficha dice que el navegador no arranca y ningún turno lo recibe. Además alcanza los servidores que arrancas desde RUNS, donde una app sí guarda sus datos.
- **La caja muestra lo que escribes antes de enviarlo.** `#2` cambia el modo al instante y se deshace si lo borras. `#3` o `#4` aparecen en la píldora como pendientes, con borde punteado, porque sus llaves se piden al enviar. Un `@agente` al inicio mueve el selector, con su modelo y su esfuerzo, y al enviar regresa el que tenías.
- **`/module` arma su permiso solo, como `/image`, y es más estrecho que #2.** El agente puede escribir únicamente en su carpeta de borrador, y nada más en el proyecto. No toma el turno de escritura del proyecto, así que no espera a otro agente que esté escribiendo ni lo hace esperar. Antes `/module` se detenía a pedir el modo y luego abría todo el proyecto.
- **El cierre de una mesa redonda de @madre cita a cada agente con su propia respuesta.** Una línea por agente, con su número, y la sala dice quién no respondió. La comparación que escribe el modelo local solo se queda si cada agente que nombra habló y cada cita es suya. Antes atribuía a uno lo que dijo otro y omitía agentes.
- **@madre responde en el idioma en que le escribes**, también cuando la conversación anterior está en inglés.
- **RUNS acepta `~/` como tu carpeta de usuario.** La sala escribe así toda ruta de tu carpeta en lo que leen los agentes, y un agente que pedía leer un archivo de ahí recibía «no hay shell que lo expanda». MADRE la expande al correr la línea, sin shell. `~otro` sigue sin correr.
- Los agentes saben que todo comando que te dan va en el bloque de RUNS, para que tenga botón.
- **Lo que un turno deja se ve en ARCHIVOS sin recargar.** Las carpetas abiertas siguen abiertas y la lista no parpadea.
- **DESHACER quita también las carpetas que el turno creó** y quedaron vacías.
- **Un corte por tiempo dice qué hacía el agente**: su última frase, el archivo que escribía o el comando que corría, no el evento JSON de su CLI.
- La tarjeta de un comando de RUNS dice en tu idioma cómo terminó y quién lo pidió.
- **El aviso de privacidad dice qué se ocultó**: un término tuyo, una llave o tu carpeta de usuario. Antes llamaba «término privado» a la ruta de tu carpeta.
- **Los enlaces de los agentes a archivos del proyecto abren el visor**, también los que traen la ruta con `~`. Antes se veía el markdown crudo.
- El aviso de que «se pidió crear algo» ya no sale cuando pides un plan antes de escribir código o que no toque archivos.
- Al hablarle a `@madre, …` ya no queda una coma suelta al inicio del mensaje.
- La línea bajo la caja dice que los agentes escriben solo cuando tú subes el modo.
- Las dos salidas de una petición de modo dicen lo que hacen: **CONCEDER #n · QUE SIGA** y **CONCEDER #n · DARLE OTRA INSTRUCCIÓN**.
- Una conversación nueva se llama **Sin título**, y la primera, **Primera conversación**.
- **La página en blanco conserva sus sugerencias** hasta que empieza la conversación; antes las quitaba el aviso de @madre al entrar. En una carpeta vacía propone cómo empezar un proyecto.
- La tarjeta del recorrido se queda donde está mientras no tape lo que señala, así «Siguiente» no se mueve bajo el cursor. En pantallas bajas tiene scroll en vez de pegarse al borde.
- La × de MU/TH/UR se llama **CERRAR MU/TH/UR**.
- La primera vez que Conversaciones o Archivos pasan a flotar sobre la conversación porque el navegador o un split les quitó el lugar, la sala dice cuáles y que regresan solos cuando vuelve a haber lugar. Si la tarjeta del navegador está abierta, el aviso espera a que la cierres. Lo mismo, una vez, cuando un split pasa a ventana.
- Un archivo `.html` que crea un turno queda registrado como HTML. Se sigue abriendo como texto fuera de RIPLEY, donde nunca corre en la sala.

### Escribir un proyecto de principio a fin

- **Gemini vuelve a escribir.** Gemini CLI rechazaba completa la política con la que MADRE le abre el proyecto en #2, #3 y #4, porque algunas prioridades pasaban de 999, y el turno terminaba sin escribir nada. Ahora todas las reglas caben en su escala.
- **El Archivista se queda en tu máquina en todas las conversaciones.** Desde la segunda conversación, el modelo local no llegaba a las nuevas, y el Archivista destilaba sin avisar con el siguiente de la lista, que podía ser de pago. Ahora toda conversación, nueva o reabierta, usa el mismo Archivista y el mismo quinto agente.
- **Lo que ajustas vale para todas las conversaciones abiertas.** El tiempo de un agente, MAX MODE, la memoria y los módulos que activas o apagas cambiaban solo la conversación en pantalla: una abierta en ventana o en la otra mitad seguía con lo anterior, y una conversación nueva destilaba con lo que había al abrir MADRE.
- **La hoja de #3 y #4 nombra al agente al que escribes.** Con `#3 @gemini …` y otro agente en el selector, la hoja pide las llaves para Gemini y el turno va a Gemini. Si cancelas, tu texto vuelve a la caja como estaba.
- **Un `git init` a mitad del turno ya no lo tira.** Si un agente crea el repositorio mientras escribe, MADRE sigue comparando contra el punto de restauración que tomó antes del turno. Si aun así no puede leer qué cambió, lo dice, el turno no se marca como fallido y **DESHACER** sigue a la mano. Los archivos que un `.gitignore` nuevo deja fuera ya no cuentan como borrados.
- **Más tiempo para escribir, y lo que quedó si se acaba.** Un turno que escribe tiene 10 minutos y uno que lee, 3. El tiempo que fijes para un agente manda sobre los dos, y el contador de la sala cuenta desde el límite real.
  - Si el tiempo se acaba, la falla muestra los archivos que el agente alcanzó a escribir, con **DESHACER**.
  - **REINTENTAR CON MÁS TIEMPO** sube el límite de ese agente y deja en la caja tu pedido con la lista de lo que ya existe, para que termine lo que falta sin empezar de nuevo.
  - MU/TH/UR reconoce el corte también en español. Su búsqueda encuentra palabras sueltas, sin importar acentos, y filtra por nombre de agente.
- **Un turno escribe a la vez.** Si un agente está escribiendo y pides a otro que escriba, el segundo espera y la sala dice detrás de quién. Antes escribían al mismo tiempo y cada uno se llevaba en su lista archivos del otro.
- El navegador acoplado en **AUTO** usa todo el ancho de su panel; se quedaba en 300 px.
- **La vista sellada dice cuándo una página quiere guardar datos.** RIPLEY no permite `localStorage`, `sessionStorage`, IndexedDB ni cookies. Si la página los usa, el visor lo dice una vez y ofrece **ABRIR SERVIDORES** para probarla servida.
- **Los servidores siguen vivos en RUNS.** Un comando que abre un puerto es un servidor y ya no se detiene a los 10 minutos. Su tarjeta dice dónde sirve, con **ABRIR EN SERVIDORES** y **DETENER**, y mientras sirve puedes pedir otro comando. Los agentes saben que el servidor escucha solo en 127.0.0.1.
- **ECONOMÍA ya no cuenta dos veces la caché.** Codex y Gemini incluyen la caché leída dentro de la entrada, y la sala la sumaba otra vez.
  - Ahora la **ENTRADA COBRADA** es la entrada nueva más la caché escrita.
  - La caché leída va en **SIN COBRO COMPLETO**, y la caché escrita tiene su columna.
  - Los turnos ya guardados se recalculan al abrir ECONOMÍA, que ahora suma todas las conversaciones del proyecto.
  - Lo que lee @madre en tu máquina ya no se suma a lo cobrado: sus turnos se cuentan aparte, como turnos sin costo.
- **`/module` y `/image` entregan lo que hicieron.** Un módulo que el agente deja en su borrador aparece con su tarjeta para instalar, aunque el `.gitignore` del proyecto ignore `.pulse`. Las imágenes que Codex genera se copian al borrador del turno y se ven en la conversación; si Codex ya la copió al proyecto, se muestra una sola vez.

### La conversación primero, y las ventanas se apartan

- **Señalar y preguntar en SERVIDORES.** El botón **SEÑALAR** pone sobre la página una caja de herramientas: **PUNTO** marca un lugar y **ÁREA** encierra una parte al arrastrar. Junto a la marca se abre la misma tarjeta de **Preguntar** del editor, con preguntas para lo que marcaste (qué dibuja y en qué archivo está, algo se ve mal aquí, cómo se sostiene a este ancho, cómo está maquetado).
  - **Va con una captura de lo que señalaste.** Al elegir la pregunta, Chrome te pide compartir esta pestaña; ese permiso es del navegador y ninguna página puede cambiarlo ni saltarlo. MADRE toma un solo cuadro y adjunta solo lo señalado: el área tal cual, sin su marco, o el punto con lo que lo rodea (hasta 480 × 320). Luego deja de capturar. Una nueva marca reemplaza la captura anterior mientras siga en la caja. Si no compartes la pestaña, la pregunta va solo con dónde señalaste y la sala lo dice.
  - **Una línea dice dónde.** Sobre la pregunta, en la caja de texto, aparece como chip: `⌖ :puerto (proceso) ruta · vista N px · punto en (x, y)` (o el área con su tamaño), más «captura adjunta» cuando la hay. La página viene de otro origen y la sala no lee su interior, así que no lo inventa: el agente ve la captura y busca en el proyecto qué la dibuja.
  - Enviar sigue siendo tuyo. El primer Esc quita la marca y el segundo apaga la herramienta; cambiar de página también la apaga.
- El menú **SERVIDORES** se dibuja completo encima de la página cuando el navegador está en ventana; antes quedaba cortado bajo la pestaña.
- En una conversación en ventana o en la otra mitad, la caja de texto ya no roza el borde: los chips pasan a otra línea cuando no caben y la caja deja aire abajo.
- En el editor, la banda de la línea actual coincide con su línea (estaba 14 px abajo). **PREGUNTAR** queda solo en la barra que aparece sobre la selección.
- **Preguntar sugiere según lo que elegiste.** Las preguntas salen de las líneas: qué se traga un `catch`, qué pasa si una petición falla o tarda, si unos `await` pueden competir, una expresión regular explicada con ejemplos, quién llama a la función que estás viendo, qué pide un TODO, qué casos no cubre una prueba. También hay preguntas propias para CSS, HTML y JSON, y las generales completan hasta cuatro. Arriba eliges al agente. **HACER MI PROPIA PREGUNTA** es la acción principal de la tarjeta, con un lápiz y el mismo estilo que **Nueva conversación**: en el color de acento, flota apenas y se hunde al pulsarla. Deja la referencia en la caja para que escribas.
  - **Con lo que la sala recuerda.** Si ya diste la designación de NOSTROMO en esta página, la tarjeta pregunta también por lo que el archivo guarda sobre esas líneas: una decisión, una preferencia, una pregunta abierta. Busca por palabras en tu máquina; no se manda nada al proveedor de embeddings.
  - La tarjeta se ve encima del visor aunque esté como modal.
- **Codex ya no falla con un «{».** El esfuerzo **Mínimo** se ofrecía para todos los modelos de Codex, pero ninguno de los actuales lo acepta, y la API lo rechazaba con un error que la sala mostraba solo como «{».
  - Ahora los niveles salen de la lista de cada modelo que guarda el propio Codex: `gpt-5.5` va de Bajo a Muy alto, y los modelos que lo permiten suman **Máximo** y **Ultra**.
  - Al cambiar de modelo, el deslizador cambia con él.
  - Si queda guardado un nivel que el modelo no acepta, la sala lo quita, lo dice y el turno sale con el nivel por defecto.
  - Cuando la API de OpenAI rechaza un turno, la sala muestra la frase completa del rechazo y no la primera línea de su JSON.
- **Un menú de la caja a la vez.** Abrir modelo, esfuerzo o modo cierra el que estuviera abierto; el que elegiste ya no queda debajo del otro.
- En **NOSTROMO**, la leyenda de los tipos de estrella va a la derecha, debajo de los botones, en la misma línea que el subtítulo.
- **Las preguntas las hace la sala**, no el navegador: dejar cambios sin guardar, sobrescribir un archivo que cambió en disco, guardar un archivo protegido, instalar, actualizar o quitar un módulo y purgar la sala. Ahora aparece una hoja con el estilo de MADRE (o el de la consola, si la pregunta viene de MÓDULOS o MU/TH/UR). Dice qué está en juego, explica por qué y las respuestas son palabras. La opción segura queda enfocada, así que un Enter por error nunca confirma algo que no se deshace. Cuando el archivo cambió en disco, se elige en un solo paso entre seguir editando, cargar la versión del disco o sobrescribir.
- En **CONEXIONES**, cada ficha muestra el logo y el nombre a la izquierda, y el estado de la sesión es una luz en la esquina superior: verde con sesión, roja sin ella, ámbar parpadeando mientras inicia, hueca si el CLI no está instalado. La cabecera de la ficha ya no queda centrada.
- El **deslizador de esfuerzo** cambia la intensidad de su color con el nivel: tenue en Mínimo y con el color pleno del agente, más un halo más amplio, en Muy alto. La etiqueta **CLI** queda visible encima del pulgar aunque esté en ese nivel.
- En **NOSTROMO**, el subtítulo va debajo del título, como en las demás cabeceras de la consola, y la leyenda se acomoda en varias líneas en vez de empujarlo.
- **Las ventanas ya no quedan debajo de la conversación** al cambiar la sala (abrir o acoplar el navegador, abrir la segunda conversación, cambiar de conversación): antes, durante el cambio, la conversación y la caja de texto se pintaban encima de cualquier ventana abierta. Ahora cada ventana se queda en su capa, quieta, mientras la sala cambia debajo.
- Al tocar **fuera** de la caja de texto, las ventanas apartadas regresan a donde estaban. Los menús de la caja (modo, modelo, esfuerzo, tarjetas de agente) cuentan como parte de ella.
- Al abrir **NOSTROMO** desde MU/TH/UR en ventana o en split, MU/TH/UR se queda como estaba y vuelve a verse al salir de NOSTROMO.
- Las **×** se ponen en escarlata pastel al pasar el cursor, como la de las conversaciones; junto a una palabra («CERRAR ×») solo cambia la marca.
- El navegador (SERVIDORES) ya no dibuja una segunda × bajo la suya.
- La nota de versión y **APOYAR** están debajo de la caja de texto, en su propia línea y con aire, en lugar de flotar sobre ella.
- **Nueva conversación** lleva el color de acento y flota apenas sobre el panel; al pasar el cursor se asienta un poco y al pulsarlo se hunde y pierde la sombra.
- En el Núcleo, MÓDULOS, MU/TH/UR y ECONOMÍA, el **subtítulo va debajo del título**. Las pestañas del Núcleo se reparten todo el ancho.
- **Mostrar la sala:** al tocar la caja de texto de la conversación principal, las ventanas que la tapan se deslizan a su borde más cercano, una tras otra, y dejan una tira a la vista. Tocar cualquier tira, abrir una ventana o llegar a una con el teclado las regresa todas a su lugar.
- **La conversación principal nunca se aprieta:** nunca es ventana y conserva siempre una columna legible. Los splits laterales, el navegador acoplado y la segunda conversación comparten lo que queda hasta su ancho mínimo. Si ni así caben, el más antiguo pasa a ventana. Antes, conversaciones en split más el navegador podían dejarla en una franja angosta.
- Los cambios entre base, split y ventana ya no estiran el contenido: la ventana viaja con una sola escala y entra con un fundido breve. El navegador y la segunda conversación tampoco se deforman al cambiar de tamaño.
- El botón de la **tripulación** está junto al indicador de en vivo y abre las mismas tarjetas que las burbujas de agente: la lista de agentes con su anillo y su consumo, y al tocar uno, su tarjeta, con «‹» para volver. CONEXIONES queda a un toque desde ahí.
- En la lista de conversaciones, acercarse al borde para cambiar el ancho ya no despliega los iconos de la fila, y una fila solo los muestra si el cursor se detiene en ella.
- **Nueva conversación** tiene jerarquía de acción principal: borde y fondo en el color de acento, y relleno al pasar el cursor.
- Todas las **×** de las ventanas giran igual que la del panel de conversaciones.
- En MÓDULOS y MU/TH/UR, los controles de ventana quedan a la misma altura que los botones de la consola.
- El encabezado fijo de MÓDULOS, MU/TH/UR y CONEXIONES ya no tapa las líneas del fondo: solo toma el fondo de la consola cuando hay contenido debajo. La pestaña activa del Núcleo tampoco lleva caja oscura.
- En modo claro, el verde de MADRE y los colores de cada agente se distinguen: seguían el tema del sistema y no el elegido en la barra. Al cambiar de tema se repintan.
- El aviso bajo la caja de texto se dice una vez, en una línea, y luego se retira. Ya no hay **?** en la fila de chips: no explicaba nada que la línea no hubiera dicho y empujaba los selectores en las conversaciones angostas.

### Ventanas que se comportan igual, y el Núcleo con tu modelo local

- **Los mismos controles en todas las ventanas.** Conversaciones, Archivos, el navegador, el visor, MÓDULOS, MU/TH/UR y una segunda conversación llevan un solo grupo arriba a la derecha: **split**, **ventana** y **×**, en ese orden. En MÓDULOS y MU/TH/UR tiene el trazo de la consola y va junto al título.
- **La ventana que tocas pasa al frente**, sea cual sea. Los menús de modos, modelo y esfuerzo y la tarjeta de gasto de un agente siempre quedan por encima de las ventanas.
- **Split de lado fijo.** Conversaciones se acomoda como columna a la **izquierda** de la conversación y Archivos a la **derecha**, de arriba abajo; la conversación queda entre las dos. Su borde interior se arrastra para cambiar el ancho, y con doble clic recupera su medida.
- En la lista de conversaciones, los iconos de cada fila **no ocupan lugar** hasta que pasas el mouse: entonces aparecen con suavidad y el título se recorre para dejarles espacio. Los de una conversación que ya está en split o en ventana se quedan a la vista.
- La barra superior es más ancha y cabe más del nombre de la conversación.
- En **NOSTROMO**, la superficie del sol gira con la vista cuando arrastras para explorar; ya no se queda de frente girando sobre su propio eje.
- Los botones de acción de las tarjetas (exámenes, conexiones) quedan **siempre al pie**, aunque las tarjetas tengan alturas distintas.
- **El Núcleo abre en TU NÚCLEO**, un tablero con las mismas fichas, tarjetas y barras de MEMORIA, bajo los `==>` de la consola:
  - **Tú:**
    - Cuántos agentes tienen sesión y cuáles.
    - La ventana de tokens de la sala contra su tope, y lo gastado en la sala desde siempre.
    - Por agente: su sesión, cuánto lleva de su límite (del proveedor o de la ventana local), cuándo se reinicia, sus tokens en la sala y su versión.
  - **Tu modelo local:**
    - El servidor de Ollama y su versión, el modelo de chat (y si está entrenado para esta sala), el de embeddings con cuántos vectores tiene y lo medido aquí.
    - Cada modelo instalado con su tamaño, parámetros, cuantización y qué papel cumple.
    - **REVISAR OTRA VEZ** y, si no corre, **ARRANCAR OLLAMA**.
  - **La calidad:** madurez, intercambios, memorias y lo que espera destilarse; el veredicto con lo que sigue, de qué está hecho el archivo y las tres pruebas.
  - **Ajustes:** qué hace el modelo local (embeddings, archivista, @madre, cada uno con su casilla y para qué sirve) y quién lee el archivo (archivista y proveedor de embeddings).
  - Todo sale de lo que MADRE ya lee y mide; lo que aún no se ha medido dice «sin medir todavía».
  - El documento, el lanzamiento, lo que salió y MU/TH/UR quedan en sus pestañas. La franja de *para quién, en qué modo y qué mandarías* aparece solo con el documento y el lanzamiento, que son lo que cambia.
- **Las ventanas se toman y se arrastran mejor:**
  - Tomar el encabezado ya no selecciona texto.
  - La ventana sigue al cursor sin recalcular lo que tiene dentro, y cerca del borde de la pantalla se pega a él.
  - En MÓDULOS y MU/TH/UR, el encabezado se queda arriba aunque bajes por el contenido, así que la ventana siempre se puede tomar.
  - Los bordes para cambiar el tamaño son más fáciles de encontrar, sobre todo las esquinas.
- **MÓDULOS, MU/TH/UR y CONEXIONES se acomodan al ancho de su ventana**, no al de la pantalla: una consola angosta, en split o en ventana, se ve como consola angosta.
  - El encabezado ya no encima el título con los botones. Si no cabe en una línea, primero el subtítulo baja, y luego los botones de la consola pasan a su propio renglón. Los controles de la ventana se quedan junto al título.
  - Los tableros, las tarjetas de conexiones, las pruebas y los formularios se reacomodan en columnas según el ancho de la ventana.
- Las horas de reinicio de los límites se escriben en el idioma de la sala.
- **El visor, con cabecera y pie de editor.**
  - La ruta muestra la carpeta tenue y el archivo en negrita; si no cabe, se recorta la carpeta y nunca el nombre.
  - **LEER / EDITAR** son un solo control.
  - La selección, **REVISAR CON** y cómo elegir líneas van en la barra de abajo.
- **Elegir varias líneas como en Finder:**
  - Clic en un número elige una línea, y arrastrar por los números elige un tramo.
  - **⇧** extiende desde la última sin soltar lo que ya sumaste.
  - **⌘** (Ctrl en Linux y Windows) suma o quita una más, también desde el código.
  - Las líneas sueltas se citan juntas en la caja de texto.
- **El editor:**
  - La barra es un grupo de iconos con su palabra, y la tecla de cada uno aparece en la barra de estado al pasar el mouse.
  - Sobre lo que seleccionas aparece una barra pequeña con **Preguntar**, **Comentar** y **Copiar referencia**. Si la selección sube fuera de vista, la barra espera en el borde.
  - En una ventana angosta quedan solo los iconos.
  - Al entrar a editar, el cursor empieza arriba y no salta al final del archivo.
- **Errores corregidos en el editor:**
  - Por debajo de los primeros 180 px no se podía hacer clic para editar: el área de escritura heredaba el tope de altura de la caja de texto.
  - El editor ya no se angosta al centro del visor cuando la barra cabe en menos espacio.
- En la caja de texto, el chip de un archivo separa la carpeta (tenue), el nombre y las líneas (en el color de acento).
- En una ventana angosta, el menú de menciones y comandos ya no se sale por la derecha ni desplaza la página.

### Split y ventana en todo lo que se abre

- Conversaciones, Archivos, el navegador, el visor de archivos, MÓDULOS, MU/TH/UR y una segunda conversación llevan en su encabezado los mismos **dos botones**, junto a la ×: **split** y **ventana**.
  - **Split:** se pone a su lado de la pantalla, más o menos la mitad, y la conversación se angosta a la otra mitad sin quedar tapada.
  - **Ventana:** flota sobre la sala; se mueve por su encabezado, cambia de tamaño desde cualquier borde o esquina y pasa al frente al tocarla.
  - El botón encendido dice cómo está ahora; tocarlo lo devuelve a su lugar.
- Un modal en split o en ventana deja de bloquear la sala: puedes escribir en la caja de texto mientras lo tienes abierto. Cambiar de modo no lo cierra ni le hace perder lo que tenía.
- **Nada divide la pantalla por sí solo:** el visor, MÓDULOS y MU/TH/UR vuelven a ser lo que eran cuando los cierras. Su ventana recuerda dónde estuvo para la próxima vez que la pidas.
- Un split por lado. Si pones otro en el mismo lado, el anterior pasa a ventana; no se cierra nada.
- Si lo abierto no cabe junto a una conversación legible, lo último que tocaste se queda a un lado y lo demás flota sobre la conversación, nunca encima de otro split.

### Un editor de código en el visor

- Los archivos de texto del proyecto tienen **EDITAR**: números de línea, la línea actual resaltada, el mismo coloreado del visor y una barra de estado con línea, columna, indentación, fin de línea y si está guardado.
- Lo de todos los días:
  - Tab y ⇧Tab indentan y desindentan.
  - Enter conserva la indentación.
  - Paréntesis, corchetes y comillas se cierran solos.
  - ⌘/ comenta según el lenguaje.
  - ⌥↑↓ mueve líneas y ⇧⌥↑↓ las duplica.
  - ⇧⌘K borra la línea.
  - ⌘D selecciona la siguiente aparición.
  - ⌘F busca (con mayúsculas, palabra completa y expresiones) y ⌥⌘F reemplaza.
  - ⌃G va a una línea.
  - Ajuste de línea con un botón.
  - ⌘Z deshace todo, incluidas estas acciones.
- **⌘S guarda.**
  - Solo archivos que ya existen dentro del proyecto.
  - Los protegidos (.git, .env…) piden el nombre del proyecto.
  - Si el archivo cambió en disco desde que lo abriste, pregunta si sobrescribir o cargar la versión del disco.
  - No te deja salir con cambios sin guardar sin avisarte.
- **Preguntar sobre esto:** preguntas sugeridas para las líneas en las que estás, o una tuya. Las cita en la caja de texto, y si el visor estaba como modal pasa a split para que la caja quede a mano.

### Esfuerzo con un deslizador, y los menús de la caja ordenados

- El esfuerzo se elige con un **deslizador** de *más rápido* a *más profundo*.
  - Lo arrastras o tocas un nivel, o lo mueves con las flechas, y queda elegido al soltar.
  - Arriba se lee el nivel, qué significa y dos barras de velocidad y costo que se mueven con él.
  - **AUTO** deja que decida el CLI y dice qué nivel usa.
- El menú de **modos** tiene filas parejas: el número en su tarjeta de color, el modo actual tintado, los que están por encima del techo con el texto atenuado y su «SUBIR A» claro. Además, una sombra fina igual a la de los demás menús.
- El menú de **comandos** (`/`) va en grupos: *De la sala*, *De los módulos* y *No disponibles aquí*. Cada comando trae su icono, cómo se escribe (en español) junto al nombre y qué hace debajo. Las teclas para moverse y elegir están al pie.

### Animaciones sin fantasmas, el logo y el botón de recargar

- Las transiciones ya no muestran dos copias de la pantalla encimadas: lo que cambia de lugar se mueve solo, y al cambiar de conversación la anterior se va antes de que llegue la nueva.
- El panel de conversaciones ya no entra dos veces, y en una ventana angosta ya no se desenfoca la conversación detrás de paneles que no se ven.
- El logo se dibuja cuando MADRE arranca o se reinicia, no en cada recarga de la página.
- La barra tiene su propio botón **↻** para recargar.
- El menú de comandos (`/`) dice en español la descripción de `/git` y `/ahp` y sus indicaciones.

### La sala estrena su identidad

- La interfaz usa las tipografías de la marca: **Sora** para títulos, **Geist** para leer (los mensajes, las respuestas, los chips y la caja de texto, a 15 px en peso ligero) y **JetBrains Mono** para rótulos, datos y comandos. Vienen dentro de MADRE; no se descarga nada para mostrar una letra.
- El logo de la barra es el oficial: el pulso en verde y la palabra MADRE en blanco (en tema claro, verde oscuro y casi negro). En barras angostas queda solo el pulso.
- La pestaña del navegador muestra el ícono de MADRE, y @madre lleva el pulso compacto de la marca.

### MÓDULOS, ordenado

- Primero los módulos **encendidos** y luego los **disponibles**. Cada tarjeta dice su nombre y si está encendido en una fila, y debajo qué hace, en letra de lectura. Fabricante, versión y si está al día van en una sola línea, y los botones quedan siempre al pie.

### La caja de texto más limpia

- En la caja de texto, los comandos (`/module`), los archivos y las menciones se ven en negrita de su color, sin recuadro.
- Los paneles de conversaciones y archivos son más anchos, y con dos conversaciones abiertas lado a lado sus cajas de texto quedan a la misma altura.

### Los paneles se hacen a un lado, y la sala se mueve con suavidad

- Los paneles de conversaciones y de archivos cambian de ancho arrastrando su borde interior (o con las flechas del teclado). Doble clic les devuelve su ancho, y el que elijas se recuerda.
- Al abrir un panel, la conversación se desliza para dejarle lugar en vez de quedar tapada. Si la ventana no alcanza para los dos y una columna cómoda, el último que abriste se queda a un lado y el otro flota encima con un velo detrás. Un clic en el velo lo guarda.
- Los paneles entran y salen deslizándose, y la lista de conversaciones aparece fila por fila.
- Todo se hace con botones: jalar un encabezado ya no despega un panel ni intercambia paneles, y un arrastre que termina sobre un botón ya no lo presiona. Así, jalar el borde del panel de conversaciones ya no abre por error la otra mitad.
- Las **conversaciones también se abren como ventanas**. En el panel de conversaciones, cada una trae dos iconos: la otra mitad de la pantalla o una ventana propia; el encendido muestra cómo está abierta y el otro la cambia de lugar. La ventana se mueve, se redimensiona y pasa al frente al tocarla; en su encabezado puede volverse la conversación abierta (y la que estaba abierta toma su ventana), pasar a la otra mitad o cerrarse. La otra mitad también se puede soltar como ventana.
- Junto a la conversación abierta caben **dos más**, entre la otra mitad y las ventanas. Cada conversación a la vista mantiene su propia línea abierta con la sala y el navegador sostiene pocas a la vez, así que a partir de ahí los iconos se atenúan y MU/TH/UR dice por qué no se abre otra.

### El navegador muestra solo los servidores de este proyecto, y un centinela los vigila

- **SERVERS** lista únicamente lo que se arrancó dentro de la carpeta del proyecto. Lo demás que escucha en la computadora (otros proyectos, Ollama, otra sala de MADRE) no aparece, solo se cuenta al pie.
- Un **centinela de servidores** vigila mientras la sala está abierta y RIPLEY encendido. Si arrancas o detienes un servidor, la lista se actualiza sola. Si se detiene el que estás viendo, la página se atenúa y lo dice, y vuelve sola cuando el servidor regresa.

### Burbujas más anchas, y el panel de conversaciones abre sin temblores

- Las respuestas ocupan más ancho (la columna llega a 960 px y la burbuja a 860 px).
- Al abrir un panel, la conversación ya no reacomoda su texto en cada cuadro de la animación: toma su ancho nuevo de una vez y se desliza a su lugar. La lista de conversaciones ya no parpadea al cargarse, y el botón que la abre reaparece cuando el panel terminó de irse.

### Sin notas al pasar el mouse

- Ya no aparece ninguna nota al pasar el cursor, ni en botones ni en ningún otro lugar, y tampoco la del navegador. Lo que decían sigue disponible para lectores de pantalla.
- Cambiar de conversación ya no es un corte: la que dejas se desvanece hacia arriba y la nueva sube a su lugar. Al intercambiar las dos mitades, cada conversación cruza al otro lado. La segunda conversación y el navegador entran desde el borde mientras la conversación se angosta sin deformarse.
- Si tu sistema pide menos movimiento, todo esto ocurre sin animación.

### La barra angosta y las preguntas abiertas se leen mejor

- Cuando la barra se compacta, cada ícono vive en un cuadro de esquinas suaves y su número va en la esquina.
- Un botón de la barra se rellena mientras su panel está abierto, y la conversación actual se ve rellena en la lista.
- **SIGUE ABIERTO AQUÍ**, sobre la caja de texto, se ve más: cada pregunta es una tarjeta con su «?» y el texto completo en primer plano.

### Responder citando ya no deforma la caja

- Al responder a un mensaje, la línea donde escribes quedaba por encima de la etiqueta y los botones. Ahora la cita ocupa su propia fila, alineada con la etiqueta, y la caja crece solo cuando escribes más de una línea.

### Multitarea: varias conversaciones trabajando a la vez

- Si una respuesta se está tardando, ya puedes escribir otra cosa en la misma conversación o abrir otra: la primera sigue trabajando. Antes, cambiar de conversación con un turno en curso no se podía.
- El panel de **CONVERSACIONES** muestra un indicador de carga en las que están trabajando y un punto en las que terminaron mientras estabas en otra. Cuando una termina, aparece un aviso a la izquierda, junto al botón de conversaciones y sin taparlo: si terminó o no, en qué conversación, qué agente respondió y un botón para abrirla; si lo permites, también llega una notificación del sistema.
- **NOTIFICACIONES**, en TURNOS: un botón para activarlas, y la fila dice si el navegador las bloqueó. Llegan cuando termina una conversación que no estás mirando, otra o esta misma con la pestaña al fondo; al presionarla vuelves a esa conversación.
- La pestaña del navegador dice **MADRE · nombre de la conversación**, para distinguir varias salas abiertas.
- **TURNOS**, en MU/TH/UR junto al centinela, decide cuánto hace la sala a la vez: cuántas conversaciones pueden trabajar al mismo tiempo (3 por defecto, las mismas que caben en pantalla: la abierta y dos a su lado) y cuántos turnos a la vez en cada una (3). Viene encendido. Apagado, la sala trabaja como antes: una conversación a la vez.
- Solo una conversación a la vez puede tener **CONTROL** o **AIRLOCK** del proyecto, aunque haya varias trabajando, y **DESHACER** funciona desde cualquiera.
- Al cambiar de conversación, la sala conserva lo que ajustaste: el modo máximo de cada agente, los módulos encendidos y los tiempos límite. Antes, una conversación recién abierta los perdía.

### Dos conversaciones a la vez, una en cada mitad

- En **CONVERSACIONES**, junto a la ×, un botón nuevo abre esa conversación en la mitad derecha de la ventana: su transcripción y su caja de texto, en vivo. Puedes escribir en las dos y ver a cada agente responder en la suya.
- La mitad derecha no tiene barra ni paneles: solo el nombre de la conversación, un botón para intercambiar las mitades y la × para cerrarla. La barra, MÓDULOS, MU/TH/UR y los paneles siguen actuando sobre la conversación de la izquierda, que sigue siendo la abierta.
- El borde entre las dos se arrastra para repartir el ancho. El tema y el idioma que elijas a la izquierda cambian también a la derecha.
- La división se recuerda al recargar. Abrir desde la lista la conversación de la derecha, o borrarla, cierra la división. En una ventana de menos de 900 px no cabe y la sala vuelve a ser una.
- **TURNOS** cuenta la conversación de la derecha como cualquier otra, y la que termina ahí no te manda aviso: ya la estás viendo.
- Dos conversaciones que escriben al mismo tiempo ya no pueden repetir un número de mensaje: la numeración del proyecto se lee en el momento de escribir.

### Un modelo elegido para un agente ya no le llega a otro

- Si el chip de modelo tenía elegido uno de otro agente (por ejemplo, un modelo de OpenAI con el mensaje dirigido a @gemini, o un mensaje que empieza con `@gemini` mientras el chip apuntaba a @codex), ese modelo viajaba igual y el agente fallaba con un error de su API que parecía de permisos. Ahora cada mensaje usa el modelo y el esfuerzo del agente al que de verdad va, un modelo de otro agente no se le pasa, y la sala te avisa y lo olvida del chip.
- Cuando un agente no conoce el modelo que recibió, el error lo dice primero en claro: qué modelo, dónde cambiarlo, y que los permisos y los modos no tienen nada que ver. La línea original del CLI queda después, tal cual.

### El aviso de AIRLOCK y CONTROL se lee bien, y en español

- En el aviso para armar CONTROL o AIRLOCK, la línea bajo **MU/TH/UR 6000** ya no se aprieta en una columna angosta.
- El campo de la designación, los avisos de solo lectura cuando falta permiso para crear y las alertas de MU/TH/UR sobre planes y modos ya salen en el idioma de la sala.

### Las elecciones dicen qué permiso necesita cada opción

- Cuando una opción implica crear archivos, editar el proyecto o correr comandos, el agente la marca con el modo que necesita y la opción lo muestra (**#3 CONTROL**, **#4 AIRLOCK**).
- Presionar una opción ya la manda al agente que preguntó, en el modo que pide. Las de #3 y #4 se mandan solo después de tu designación (y la palabra AIRLOCK); si cancelas, no se manda nada.

### SERVIDORES marca el de este proyecto

- En el menú de servidores locales, el que arrancó este proyecto aparece primero, con la marca **ESTE PROYECTO**.

### La tarjeta de CONTROL se lee completa

- El estado de cada archivo (**MODIFICADO**, **AÑADIDO**…) ya no se parte a la mitad, las rutas largas se alinean a la izquierda y cortan dentro de sí, y «cambió 1 archivo» va en singular.

### Actualizar desde la sala ya no la deja cerrada

- Al presionar **REINICIAR CON** una versión recién publicada, la sala se cerraba antes de saber si npm ya la entregaba; si todavía no, no volvía y había que levantarla a mano. Ahora descarga la versión primero y solo se cierra cuando la tiene. Si npm aún no la entrega, la sala sigue abierta y te dice que lo intentes en unos minutos.
- Lo que imprime la versión nueva al arrancar queda en `update.log`, junto al registro de la sala.

</details>

## 0.7.2 · 2026-10-03

Esta versión les da a los agentes botones para pedirte lo que antes te pedían en un párrafo: que corras un comando, que les subas el permiso, que elijas entre opciones. También trae el nivel de esfuerzo por agente, un panel de archivos que se comporta como esperas, y arreglos en la actualización de Ollama y al volver a abrir la sala.

### Un agente puede pedirte que corras un comando

- Módulo nuevo, **Runs**, apagado hasta que lo enciendas en MÓDULOS. Cuando un agente necesita un comando que su modo no le deja correr (las pruebas después de un arreglo, un build, un linter), en lugar de pedirte que lo copies a una terminal te deja un botón por comando, con el motivo arriba.
- Nada corre hasta que presionas. Cada línea corre sola, desde la raíz del proyecto y sin shell: lo que dice el botón es lo que se ejecuta. Una línea con `&&`, `|`, redirecciones, variables o comodines aparece con el motivo por el que no se puede correr.
- Antes de correr se toma un checkpoint. La salida aparece en la sala como tarjeta y la leen todos los agentes en su siguiente turno; si el comando cambió archivos, **DESHACER** los regresa.
- Un comando a la vez, hasta diez minutos, y **PARAR TODO** lo detiene. En AIRLOCK el agente sigue corriendo sus propios comandos.

### Cuando un agente pide más permiso, un clic se lo da

- Si un agente responde que necesita un modo más alto, debajo de su respuesta aparece una tarjeta con **CONCEDER Y SEGUIR**: escribes la designación del proyecto como siempre (#3 y #4) y el agente recibe tu permiso y continúa. Ya no hace falta escribirle «permiso concedido» en otro mensaje.
- **ESCRIBIRLE YO** arma el modo y cita su respuesta en la caja, para que agregues instrucciones antes de mandar; **AHORA NO** cierra la tarjeta.
- Si el agente tenía un modo máximo más bajo, conceder también lo sube en CONEXIONES (y la ceremonia lo dice), en lugar de que el mensaje sea rechazado.
- Una tarjeta ya contestada se queda cerrada al volver a abrir la sala.

### Las elecciones se leen completas y traen la recomendada

- Cuando un agente te pide elegir, cada opción se ve entera: antes se cortaba a 120 caracteres, a veces a media palabra.
- La opción que el agente recomienda va primero, marcada **RECOMENDADA**. Los agentes ahora tienen que decir cuál elegirían.
- Las opciones van en filas numeradas en lugar de píldoras, y la que presionaste queda marcada.
- La vista previa del briefing y la economía ahora incluyen el bloque que enseña a los agentes a ofrecerte opciones, cuando **Choices** está encendido; antes viajaba en cada turno sin aparecer ahí.
- En GHOST ese bloque ya no se manda, porque ahí la sala nunca lee una elección.

### Nivel de esfuerzo junto al modelo

- Un chip nuevo al lado del modelo elige cuánto piensa el agente antes de contestar: de **Bajo** a **Máximo** en Claude, de **Mínimo** a **Muy alto** en Codex.
- **Por defecto** no manda nada y el CLI usa su propio ajuste; si MADRE puede leerlo (Codex), el chip lo muestra atenuado.
- Se recuerda por agente, y cada mensaje y respuesta dice con qué esfuerzo se hizo.

### Los archivos del proyecto: copiar, mover y crear carpetas se comportan como esperas

- Después de copiar, mover o crear algo, el árbol ya no se cierra: las carpetas que tenías abiertas siguen abiertas, la de destino se abre y lo nuevo se ilumina un momento.
- **Pegar al lado** de un archivo con el mismo nombre crea una copia (`notas copia.md`, `notas copia 2.md`) en lugar de dar error.
- Clic derecho en el espacio vacío bajo la lista pega o crea en la raíz del proyecto, que antes no tenía dónde hacerlo.
- Copiar, mover y renombrar funcionan también desde los resultados de una búsqueda.
- **Escape** limpia la búsqueda y devuelve el árbol; un segundo Escape sale del campo.
- El panel es más ancho, y al crear o renombrar, lo que se pide (y dónde va a quedar) se lee completo arriba del campo.
- Los avisos de estas operaciones salen en el idioma de la sala.

### Un módulo corregido dice que reemplaza al instalado

- Cuando un agente escribe una nueva versión de un módulo que ya tienes, la tarjeta lo dice, muestra la versión que sigue funcionando y ofrece **REEMPLAZAR** en lugar de instalar.

### Actualizar Ollama ahora sí cambia la versión que contesta

- Al actualizar se reemplazaba el programa, pero el Ollama que ya estaba corriendo seguía siendo el viejo: la tarjeta repetía la versión anterior y parecía que no había pasado nada. Ahora, si el que contesta es más viejo que el instalado, MADRE lo reinicia con el nuevo, y la tarjeta lo dice antes de que presiones.
- Eso también corrige el error `invalid argument: --no-mmap` al cargar un modelo, que salía cuando el servidor viejo arrancaba piezas de la versión nueva.
- Si el Ollama que contesta no es uno que MADRE pueda reiniciar (la app, o un servicio de otro usuario), la tarjeta dice qué versión está instalada, cuál contesta y qué hacer, en lugar de anunciar la versión vieja como si fuera nueva.

### Al volver a abrir la sala ya no aparece un inicio de sesión viejo

- Si alguna vez iniciaste sesión de un agente desde la sala, cada vez que la página cargaba volvía a salir el aviso con el enlace de ese inicio de sesión, ya vencido, y el enlace se salía de la pantalla. Ahora el aviso sale solo mientras el inicio de sesión está pasando, y los avisos largos parten línea.

### En el teléfono la página ya no se sale de la pantalla

- La fila de agentes y chips sobre el compositor ensanchaba toda la página a 580 px, y con ella la barra superior y el hilo. Ahora los chips bajan a su propia línea y se acomodan.

## 0.7.1 · 2026-10-03

### Codex responde en un proyecto que todavía no es un repositorio git

- Si la carpeta del proyecto no tenía git, Codex fallaba en cada mensaje con `Codex exited with code 1.` aunque hubieras iniciado sesión. Ahora responde igual en cualquier carpeta, y sigue limitado al modo que eligió la sala.
- Cuando un agente termina con error, el mensaje en la sala trae también la última línea que imprimió, así se ve la causa sin tener que abrir nada más.

## 0.7.0 · 2026-10-03

Esta versión es sobre la memoria de la sala: ahora la ves, la recorres y te dice cómo está. NOSTROMO pasa a tres dimensiones y cada memoria es una estrella que cuenta su propia historia; MEMORIA se vuelve un tablero; y quien llega por primera vez encuentra un recorrido sobre la sala misma. También trae ideas listas para crear tus propios módulos, un botón para detener una sola respuesta y una protección nueva frente a páginas web ajenas. Gracias por usar MADRE y por cada reporte que la hace mejor.

### Después de actualizar, MADRE te cuenta qué hay de nuevo

- La primera vez que abres la sala tras una actualización aparece una hoja con lo principal de la versión: cada novedad dicha en una frase, **dónde está**, y un enlace a todos los cambios en madre.run. Se cierra con **Continuar** y no vuelve a salir para esa versión.
- Se recuerda por persona y no por pestaña: si abres la sala en otro puerto, ya la viste. Una instalación nueva no la ve nunca; para eso está el recorrido de bienvenida, que espera a que cierres la hoja si los dos tocan el mismo día.
- No sale nada a la red: el enlace es la misma página de cambios que ya usaba el canal de releases.
- Cada versión menor trae la suya, escrita a mano en los dos idiomas de la sala. Una versión menor no se puede cerrar sin ella.
- Para volver a verla: **ACERCA DE ESTA VERSIÓN**, junto al número en el canal de releases de MU/TH/UR.

### El recorrido de bienvenida se hace sobre la sala

- La primera vez que alguien entra, el recorrido ya no es texto en una ventana: recorre **la sala misma**. Cuatro paradas, cada una ilumina la parte de la pantalla de la que habla y deja el resto en penumbra, con una tarjeta al lado que la explica en dos o tres frases.
- **Tu tripulación, una sola caja** (la fila de agentes y el campo de texto) · **Los modos** (el selector de modo del mensaje), los cinco en orden y cada uno en su color · **MU/TH/UR, la consola** (conexiones, memoria, NOSTROMO, diagnóstico) · **MÓDULOS** (poderes opcionales).
- Y la primera vez que se presiona el **navegador**, los **archivos del proyecto** o las **conversaciones**, el panel se abre como siempre y una tarjeta junto al botón dice para qué sirve. Una vez cada uno.
- Se vuelve a abrir desde **?** en MU/TH/UR. Si un área no está a la vista, la tarjeta la explica en el centro.

### NOSTROMO en tres dimensiones

- El archivo es un cerebro de verdad: el perfil de antes visto de lado, y de frente dos hemisferios separados por la cisura. **Arrastra para girarlo**; **Shift + arrastra** para mover la cámara; **RECENTRAR** vuelve a la vista de lado.
- Lo cercano se ve más grande, lo que queda detrás de MOTHER se dibuja detrás de ella y no se puede tocar a través de ella, y de dos memorias encimadas gana la de enfrente.
- Las memorias se reparten parejo por toda la superficie, cada clase en una franja propia de adelante hacia atrás, como lóbulos.

### Cada memoria es una estrella enana, y su superficie dice cómo está

- Una enana tiene luz propia, así que no hay lado oscuro: brilla más en el centro y se apaga hacia el borde —más en azul que en rojo, así que el borde es más cálido—, su superficie hierve en gránulos, y la rodea un resplandor que nace en el borde.
- **El brillo** sigue diciendo cuánto la usa la sala y lo que está recibiendo ahora.
- **La superficie** dice en qué estado está: limpia y con fáculas brillantes si la confirmaste; con las manchas propias de su clase si nadie la ha juzgado; muy manchada si resultó falsa; la peor de todas si salió de circulación. Una memoria que la sala nunca ha usado se está **enfriando**: su granulación casi no se mueve, da menos luz y su centro deja de ser blanco.
- Cada clase tiene su carácter: la amarilla es un sol con gránulos y manchas, la blanca es lisa e intensísima.

### MOTHER es magma

- El centro es una costra de roca casi negra partida en placas, con grietas al rojo blanco entre ellas y pozas donde la lava se abrió paso. La costra gira y la lava fluye por debajo a otro ritmo, así que la superficie se mueve en lugar de estar pintada.
- De vez en cuando algo estalla dentro: un destello, un núcleo blanco y una onda de fuego que corre por la costra. Más seguido cuando MOTHER está alarmada; nunca con «reducir movimiento».

### Elegir una memoria la trae al frente

- Al hacer clic en una memoria, el archivo gira hasta ponerla de frente, la cámara la centra en el espacio que deja libre la tarjeta y todo lo demás se oscurece. Quedan encendidos ella, sus enlaces y una **mira verde**: corchetes que se cierran sobre el blanco, un anillo que gira y la marca **BLANCO FIJADO**.
- Al pasar el cursor, la mira solo apunta. Al cerrar la tarjeta, la escena vuelve y el archivo se queda girado donde lo dejaste.

### Olvidar es una implosión

- Una memoria o una aberración olvidada no se apaga: el universo se la traga. Se hincha una última vez, se abre un horizonte con la luz curvándose en su borde, lo que la formaba cae en espiral, desaparece con un destello y una onda que se pierde en la oscuridad.
- Sus enlaces, y el cable que la unía a MOTHER, se deshacen en polvo desde su extremo hacia afuera, y el polvo se dispersa y se apaga.

### MEMORIA es un tablero

- Cifras del archivo arriba —intercambios, memorias, turnos que recordaron, en espera, madurez— con lo que pasó esta semana contra la anterior.
- La actividad de los últimos 30 días día por día, lo que hace al archivo (las seis lecturas de madurez), de qué está hecho por clase, archivista y zona, cuánto llega por búsqueda o por asociación, y las tres pruebas con su barra hasta donde pasan.
- Debajo, en pliegues propios, **ARCHIVISTA Y RECALL** y **DATASET Y ENTRENAMIENTO**. El tablero se lee sin la designación del proyecto: son conteos, y ningún texto de una memoria sale por ahí.

### Una página de otro sitio ya no puede meter un módulo en la sala

- La sala escucha en `127.0.0.1`, y eso deja fuera a las otras computadoras pero no a las otras páginas: cualquier sitio abierto en tu navegador podía mandar una petición a `127.0.0.1:4317`, y un módulo subido es código que MADRE corre con tus permisos. Bastaba con visitar la página equivocada mientras la sala estaba abierta.
- Ahora, antes de cualquier ruta, la sala revisa dos cosas. Que la llamen por el nombre de esta computadora (`127.0.0.1` o `localhost`): una página que apunta su propio dominio a `127.0.0.1` sigue mandando su dominio y se queda en la puerta, también para leer. Y que lo que cambia algo venga de la propia sala: el navegador dice quién pregunta, y una página ajena recibe un 403.
- La terminal, el `curl` de un agente y el propio CLI de MADRE no mandan origen y siguen entrando igual.

### AHP+ se instala en 1.4.2

- El módulo AHP+ instala ahora `@jossuealcala/ahp-plus@1.4.2`. La 1.4.1 confundía con una llave nombres de archivo como `work-detail-desktop-scrolled.png` y bloqueaba `ahp project verify` sin que hubiera ningún secreto.
- Un proyecto que ya tiene la 1.4.1 ve el aviso en su tarjeta de MODULES; se actualiza con `npm install -D --save-exact @jossuealcala/ahp-plus@1.4.2` dentro del proyecto.

### Una bodega para las llaves de los conectores

- Hasta ahora MADRE no guardaba ninguna credencial: la llave de un agente se escribe donde esa CLI la busca y MADRE no conserva copia. **Un conector no tiene CLI a la que dársela**, así que si MADRE no la guarda, nadie lo hace.
- Ahora la guarda, y con términos escritos: un archivo por módulo en `~/.pulse/credentials/`, permisos de solo tu usuario dentro de un directorio de solo tu usuario, **aceptada únicamente desde esta computadora**. Nunca en la config, ni en el ledger, ni en un log, ni en lo que lee un agente. El ledger anota que se guardó una y con qué nombre y cuántos caracteres — jamás el valor.
- En la ficha del módulo hay un piso nuevo, **LLAVES**: un campo por secreto, lo que hay guardado (nombre y largo) y `OLVIDARLA`. El campo nunca se rellena de vuelta.
- Un módulo solo puede pedir **sus** secretos: su id va cerrado dentro del SDK, así que pedir el de otro no es algo que se pueda escribir.

### El SDK, cerrado y con qué copiar

- **El contrato completo son 36 campos**, todos documentados, y la guía no puede quedarse atrás del código: si alguna vez se separan, lo detectamos antes de publicar. Antes había once campos que el SDK aceptaba y la guía no mencionaba.
- **Un ejemplo de conector que funciona tal cual** (`docs/sdk/connector-module.mjs`): manda un Telegram por tu propio bot. Enseña la forma que no se adivina — **un solo archivo que es la ficha cuando MADRE lo importa y el servidor MCP cuando MADRE lo ejecuta**.
- Tres campos declarados que cualquier conector hereda: `secrets` (MADRE dibuja el campo), `reaches` (el registro de salidas responde por ti) y `sends` (la sala retira esas herramientas por debajo de `#4`). Nada de eso se programa: se declara.
- **«¿Se puede conectar con X?»** se contesta ahora dentro de la guía, en tres peldaños. El límite no es MADRE: es si ese servicio te deja conseguir tu propia llave en minutos y revocarla sola. Casi todo lo útil cae del lado fácil — GitHub, Linear, Notion, Jira, Slack, Telegram, Stripe, Shopify, Odoo, cualquier base de datos. Donde hay muro es donde el proveedor exige revisar tu app: Gmail en lectura, Meta, banca.
- Y un arreglo que venía roto sin que se notara: `reaches` nunca llegaba al objeto del módulo, así que la declaración de destinos de un conector **no se registraba en ninguna parte**.

### Pedir un módulo es más fácil que encontrarlo

- `/modules`, `/modulo` o cualquier cosa que empiece por el nombre del comando **ahora encuentra `/module`**. Antes el menú se cerraba y no mostraba nada, que se lee como «no existe» en vez de «casi».
- Y una vez ahí, el menú ofrece **ocho ideas para editar**, dos de cada forma que puede tomar un módulo: un comando, un conector, un conector que manda y una ficha propia. Cada idea lleva su ícono y una etiqueta del color de su forma. `/module` solo no hace nada hasta que dices qué debe hacer, y esa era la forma más común de que todo se quedara en nada.
- La tarjeta **DESARROLLA PARA MADRE** dice ahora qué es un módulo, que puedes simplemente pedirlo, y que conectar con algo de fuera casi siempre se puede. Trae un botón **PÍDELE UNO** que te deja en la caja de texto con `/module` escrito.


### En modo claro volvían a verse los acentos

- El texto entre mensajes —el relevo, lo que destiló el archivista— valía **2.92:1** contra la página, por debajo del suelo de 3.0 que pide una interfaz, cuando en oscuro ese mismo papel vale 3.62:1. Y la burbuja del agente valía **1.10:1**: no se leía tenue, se leía como página. Ahora 3.87:1 y 1.22:1, que es la proporción del modo oscuro y no un gris nuevo.
- **Las esferas de los agentes pedían otra cosa.** Un tinte del color funciona sobre una página casi negra porque el color es la única luz del círculo; sobre una casi blanca el mismo tinte se camina de vuelta a la página. Los peores eran los agentes **más brillantes** —1.06:1 y 1.03:1—, y subir el porcentaje no los arregla: mezclar un amarillo brillante con blanco sigue siendo blanco. En claro el disco conserva su tinte y gana borde y glifo con el color llevado **hacia abajo**. Un color, dos direcciones.

### El botón de permiso es un botón, y la frase es una frase

- Cuando un agente pedía subir de peldaño, el recuadro punteado se dibujaba alrededor de **todo**: un marco y un fondo detrás de una frase que no se puede pulsar. El ojo leía un panel y tenía que buscar el botón dentro.
- Ahora solo lo que se puede pulsar lo parece, y lo parece de verdad: relleno en vez de contorno.

### MEMORIA sale de CONEXIONES

- Era un pliegue dentro de CONEXIONES, que es donde vas a conectar y firmar un agente — otro mandado completamente distinto. Qué guarda el archivo, quién lo destila y qué tan bien está contestando es un tema propio.
- Ahora tiene su botón en la barra de MU/TH/UR, junto a NOSTROMO, y el panel entero en lugar de un pliegue dentro del panel de otro. Los dos destinos se excluyen: uno a la vez.
- El **canal de releases** vive solo en la pantalla principal de MU/TH/UR, no encima de CONEXIONES ni de MEMORIA.

### ABRIR TODO deja de ser un destino

- Vivía en la barra, entre CONEXIONES y NOSTROMO, que son sitios a los que se va. Eso no es un sitio: es una acción sobre el lienzo de abajo.
- Baja a donde actúa: un texto tenue a la derecha, con la misma voz que el «▸ ABRIR» de cada pliegue, sobre la columna que mueve. Sin marco, para no competir con los botones de la barra.
- Mueve solo los pliegues de la pantalla que estás viendo.

### NOSTROMO toma forma de cerebro

- El archivo deja de ser una bola. Es un cerebro visto de lado: lóbulo frontal al frente, base plana, cerebelo abajo atrás, temporal abajo adelante.
- La forma se mantiene mientras el archivo se mueve: las memorias se acomodan sobre el contorno del cerebro en lugar de volver a formar una bola.
- Y ahora además gira en tres dimensiones: ver «NOSTROMO en tres dimensiones», arriba.

### Se puede apadrinar el proyecto

- Botón **Sponsor** en el repositorio, `npm fund` lo lista, y una línea al final del README. GitHub no se lleva comisión.
- En la sala, una palabra en la esquina junto a la versión: `MADRE 0.7.0 · © 2026 Jossue Alcalá · APOYAR`. No interrumpe nunca, no aparece en el hilo y no sabe si hiciste clic.
- **Es un enlace, no una petición de red.** La sala no le pide nada a nadie por esto, así que no hay dirección que declarar en `outbound.mjs` ni nada que aparezca en el registro de salidas. El día que esto quisiera *traer* algo —un contador de patrocinadores, una insignia— dejaría de ser un enlace y tendría que declararse como cualquier otra dirección, con su interruptor.
- MADRE es gratis y seguirá siéndolo. Nada del producto cambia según lo que hagas con ese enlace.

### Detener una respuesta sin detener la sala

- En la fila del turno en vuelo, junto a los segundos, un botón **DETENER**. Mata el proceso de ese agente y nada más: la sala sigue, los demás agentes siguen, y los pasos de otros planes siguen. PARAR TODO continúa siendo lo que era, el freno maestro para cuando las cosas se desbocaron.
- Hasta ahora, un agente colgado o que arrancó por el camino equivocado costaba parar la sala entera o esperar al límite de tiempo.
- La parada queda en el ledger como `turn.stopped`, y el turno termina igual que cualquier fallo porque el proceso de verdad se mató — pero **dice que se pidió**. Por eso el centinela ya no la archiva: un freno que tú accionaste no es una condición que nadie tenga que diagnosticar.

### El typebox crece con lo que escribes

- La caja crecía hasta tres renglones y ahí se quedaba, que es un límite de caja de chat y esto también es donde se escribe un brief largo. Ahora crece hasta catorce y a partir de ahí se desplaza sola.
- No crece sin fin a propósito: el hilo de arriba es contra lo que se suele escribir, y no debe desaparecer.
- El salto de línea es **⌥ Enter** — Option en macOS, Alt en Linux y Windows: la misma tecla física y la misma señal en el evento, así que es una sola regla y no una por plataforma. Enter manda, con o sin Mayús. El campo lo dice al pasar el cursor, porque un atajo que cambia bajo los dedos tiene que decirlo en alguna parte.

### MU/TH/UR se lee por bloques, no por renglones

- Cada sección de la consola lleva ahora su propio icono de 8 bits en vez de la misma barra verde para todas. Una barra decía «aquí empieza un título» y nada más; un dibujo dice **cuál** sección es antes de leer las palabras. Sin recuadro alrededor: un marco sería una segunda caja diciendo lo que el dibujo ya dice.
- Y se va la línea que había encima de cada bloque: una raya y un icono son dos maneras de anunciar lo mismo, y con una basta. Los títulos suben de tamaño y de brillo, así que la jerarquía la marca el bloque y no el renglón.
- Lo mismo en CONEXIONES, que es la misma consola por dentro.

### La economía deja de estar escrita en clave

- `CH` no se explicaba en ninguna parte de esa pantalla, y en español llegó a verse como «CAR POR TOKEN». Ahora se dice **caracteres**, con todas sus letras, y la unidad va una vez en la tarjeta en lugar de estampada en diez filas.
- `TURNS WEIGHED` se había traducido como «TURNOS PESADOS», que en español significa otra cosa. Son **turnos con factura**.
- El número grande ya dice de qué son: **tokens que esta sala nunca pagó**. Antes eran quince millones de nada.
- Cada lectura es una tarjeta con su borde y su icono, y las seis cifras de arriba son seis tarjetas. Lo que estaba saturado era que todo pesaba igual y nada decía dónde terminaba una lectura.

### Arreglos

- **Los avisos entre mensajes se descentraban.** El título de cada aviso —«claro», «agotada»— conservaba el punto que lo unía al resto de la frase cuando iba en el mismo renglón, y sobre un renglón propio ese punto colgaba del final y lo sacaba del centro. Y cuando un aviso empezaba con palabras sueltas, la primera palabra en negritas se tomaba por título: «local · @madre · qwen» salía en tres renglones y la memoria olvidada partía su frase en tres.
- **La clase de una memoria olvidada salía en inglés** —«ABERRATION»— en una sala en español, y la frase («se le olvidó un…») no concordaba con clases femeninas. Ahora dice «memoria · olvidada por la humana · ABERRACIÓN».

- **Mover el ratón sobre NOSTROMO mientras abría lanzaba un error.** El mapa recibe el ratón desde que aparece y su cámara se crea un instante después; hasta entonces, apuntar, hacer zoom o RECENTRAR buscaban una cámara que aún no existía. Ahora esperan a que el mapa arranque.

- **#12 · Gemini intentaba delegar en un subagente y el turno moría a los 180 s.** La política no le permite `invoke_agent`, y hace bien: un subagente contesta fuera del arriendo, así que nada de lo que escribiera quedaría comprobado, mostrado ni reversible. Pero el CLI no trata la negativa como una respuesta: espera, y el humano espera tres minutos para recibir un error. Ahora se le dice de antemano que haga el trabajo él mismo, y si aun así lo intenta, la sala corta el turno en cuanto lo ve y explica por qué. **Solo ante ese bloqueo**, no ante cualquiera: una escritura denegada deja al CLI trabajando y acaba contestando, y cortar ahí mataría turnos que iban a terminar.
- **Detener una respuesta esperaba a que de verdad terminara.** Abortar solo pide; el turno todavía tiene que matar su proceso y registrar cómo acabó. Devolver antes dejaba al que llama compitiendo con una escritura que aún no había ocurrido — el freno maestro ya esperaba así.

- **#11 · Gemini decía «archivos creados» y no escribía nada.** La regla que le da permiso de escritura se construía con la ruta del proyecto **tal como se la pasaron a MADRE**, y el CLI resuelve la ruta antes de escribir. En macOS `/tmp` es un enlace a `/private/tmp`, así que un proyecto abierto como `/tmp/…` pedía escribir en `/private/tmp/…`, la regla no casaba, y un CLI sin cabeza no puede detenerse a preguntar: la escritura moría sin una palabra y el modelo daba el archivo por creado. Ahora el arriendo lleva las dos formas de su ruta y las dos entran en la regla. **También en la de denegación**, o permitir la segunda ortografía habría dejado `.git` y `.pulse` alcanzables por el otro nombre. Afectaba a Gemini y a Claude; Codex usa el directorio de trabajo y OpenCode la ruta relativa, y por eso funcionaban.
- **#11 · Y si una escritura se pierde por cualquier otra causa, la sala lo dice.** Cuando un turno podía escribir, no escribió nada y la respuesta nombra archivos, se comprueban contra el disco y se avisa de los que no están. No se lee la prosa buscando una afirmación —eso sería adivinar en dos idiomas y avisar en falso— sino las rutas que nombra; lo que existe no se menciona.

- **#16 · RIPLEY decía «nada contesta en esta computadora» cuando sí había servidores.** Por dos causas distintas y ninguna era esa. Con RIPLEY apagado, `/api/ports` contestaba `412` con su explicación y el cliente leía `?.ports ?? []` por encima del error: ahora dice lo que la respuesta dice y ofrece abrir MÓDULOS. Y un servidor atado a todas las interfaces —lo que hacen `node` y `python -m http.server` por defecto— se descartaba sin decir nada: ahora aparece al final de la lista, apagado, con su razón al pasar el cursor. En esta misma máquina eran **tres** servidores invisibles.
- **#16 · El separador colgando.** Un servidor sin `Content-Type` dejaba la fila como `:5173 node · 200 · `.
- **#15 · La pregunta que `@madre` reenvía al crew empezaba con «:».** El bucle que quita «pregúntale al crew» solo se llevaba los dos puntos cuando detrás venía otra frase de enlace, así que el «:» viajaba al anuncio, a los cuatro agentes y al turno de cierre.
- **#14 · «NO PUEDE GENERATE IMAGES» en la sala en español.** El servidor mandaba la etiqueta ya armada donde el cliente esperaba la clave, así que no había nada que traducir. Ahora viaja la clave; la etiqueta se queda solo donde se arma una frase en inglés.
- **#14 · La línea del plan estaba escrita con literales en inglés.** «@MADRE PUTS @CODEX#1 TO WORK, THEN CLOSES» y «FINISHED · 5 STEPS». Los agentes son fichas y no caben dentro de una cadena, así que la frase se traduce entera alrededor de un marcador y las fichas vuelven a donde estaba el marcador.

- En tema oscuro, la versión, el enlace de apoyo y el aviso bajo el campo eran ilegibles: el gris más tenue de la paleta con media opacidad encima, sobre un fondo casi negro, no era discreto sino invisible. La firma y el enlace llevan ahora el verde de la sala —que tiene un valor propio en cada fondo, así que un color sirve para los dos temas— y el aviso sube a un gris que se lee. El aviso se queda fuera del verde a propósito: es una advertencia sobre permisos, no parte de la voz de la sala.

- La tarjeta **POR AGENTE** de la economía no se había visto nunca: `table.append(…).lastChild` sobre un `append` que devuelve `undefined` lanzaba en cada render y se llevaba por delante el resto del panel, sin decir nada. Está desde que se escribió el panel.

### Tu pulgar mueve lo que la sala recordó de esa respuesta

- **El archivista ya sabe qué tiene standing y qué se echó.** Hasta ahora recibía las doce notas más recientes bajo un único encabezado que decía «ya recordado, no lo repitas» — fueran lo que fueran. En el archivo de esta sala, tres de esas doce estaban fuera de circulación, y dos eran **aberraciones**: afirmaciones que la sala ya había establecido como falsas, ofrecidas como si fueran conocimiento.
- Ahora recibe dos listas que dicen cosas opuestas: lo vigente, encabezado por lo que **tú confirmaste**, y lo descartado, con su propio encabezado — «la sala las sacó de circulación, no vuelvas a escribirlas». Deja de reaprender lo que ya echaste.
- Cuesta unos 205 tokens más por destilación, medidos. Un descarte viaja recortado porque está ahí para reconocerlo, no para aprenderlo, y la lista desaparece entera cuando no hay nada que descartar: un encabezado sin filas debajo es prompt que se paga y del que nadie aprende.

- Los pulgares de cada burbuja existían desde hace versiones y llegaban a un solo sitio: el exportador de dataset. Ahora también llegan al archivo. Lo que la sala destiló de una respuesta que marcaste mal deja de viajar a los turnos; lo que marcaste bien pasa a estar confirmado.
- **No se reescribe una sola palabra de lo que se recordó.** Lo que cambia es dónde queda parado, no lo que dice: el texto es lo que el archivista oyó y la zona es lo que tú dijiste. Por eso una reacción sirve aunque llegue días después de que el lote se destiló.
- Cada memoria vive ahora en una de cuatro zonas de la NOSTROMO. Dos viajan a los turnos y dos son archivo que la sala conserva y nunca sirve. Las dos reglas que ya hacían esto a medias —lo falso no viaja, lo refutado tampoco— eran cinco copias sueltas y ahora son una.
- Un pulgar mueve solo lo que cita **esa** respuesta, nunca su lote: en una sala real un lote abarca cientos de secuencias, y un pulgar no puede hablar por intercambios que no miraste. En el archivo de esta sala, un tercio de las respuestas de agente dejaron memoria y son las que un pulgar alcanza.
- El archivo manda sobre el pulgar: una nota que la sala estableció falsa sigue fuera de circulación por mucho que te gustara la respuesta de la que salió. «Esto es falso» y «esto me sirvió» no son la misma afirmación.
- Los pulgares que ya habías pulsado antes de que esto existiera cuentan: el pliegue es sobre el ledger entero y corre en cada arranque.
- Cuatro maneras de juzgar una respuesta, no dos. Al pulgar arriba se le suma **así lo quiero**, y al pulgar abajo **nunca más**. Los dos nuevos no se muestran hasta que pulsas el que escalan: en reposo la burbuja no lleva más adorno que antes, y la palabra más fuerte aparece justo cuando significa algo.
- «Así lo quiero» confirma la nota y cuenta como un sí para el corpus; «nunca más» la saca de circulación y deja el par fuera del entrenamiento. Una nota destilada de varias respuestas se queda con **el peor** veredicto de todas: si uno de los intercambios de los que salió estaba mal, la nota es sospechosa por buenos que fueran los demás.
- Y se ve: cada memoria dice su zona en NOSTROMO, y la que no viaja se dibuja apagada en el mapa. Una señal que gobierna el recall sin que puedas mirarla es justo lo que esta sala no hace. Las zonas no estrenan paleta: el color de una estrella es su clase, y lo que la zona cambia es si está encendida.

## 0.6.0 · 2026-10-01

### Ash conserva una sola decisión de principio a fin

- El historial ya no puede encender ni apagar Ash al abrir la sala o cambiar de conversación: `/api/state` manda y solo un `extension.toggled` vivo cambia el compositor. La vista previa usa además la selección del mensaje, no solo el interruptor global.
- Cada turno conserva la decisión tomada al pulsar Enviar antes del primer `await`: `requested` y `active` quedan separados, `turn.cost.ash` confirma si el bloque llegó al prompt y un fallo posterior conserva el coste y limpia su forma pendiente. Los pasos y el cierre de un plan mantienen el mismo Ash y el mismo modo.
- La prosa compacta se adapta a longitud explícita, código y estructura pedida. Una comprobación local marca respuestas vacías, límites excedidos, bloques sin cerrar, planes con texto posterior y deriva de literales pedidos como exactos. No cambia modelo, contexto, herramientas ni repite automáticamente un turno con permisos.
- La ficha pública no promete un porcentaje fijo: muestra entrada, salida y caché por turno, y dice que el ahorro depende del agente, la tarea y la caché. El corpus reproducible de `scripts/bench-ash.mjs` solo verifica el contrato; no se presenta como medición de ahorro.

### La economía deja de ser una promesa y pasa a ser una lectura

- El panel ECONOMÍA, a pantalla completa desde la ficha de Ash: lo que nunca se cobró, lo que Ash le hace a una respuesta, a dónde va cada prompt y una tabla por agente. Abre con seis cifras del total —turnos, entrada, salida, no cobrados, caché y caracteres por token— porque seis números de seis naturalezas distintas no tienen forma que dibujar.
- Cada mensaje dice en su pie cuántos tokens **no** se cobraron: lo que el CLI leyó de su propia caché (medido) más el briefing que la sala nunca envió (estimado). Las dos mitades nunca se suman sin decir cuál es cuál.
- Ash muestra primero lo que **cuesta** —306 caracteres por turno, medidos del bloque— y después lo que podría ahorrar. Y cuando hay cinco turnos de cada lado, la lectura dice si la diferencia supera la variación propia de ese agente o si todavía no hay nada que leer. Una lectura que solo pudiera darle la razón al interruptor sería publicidad.
- Los turnos que la sala contestó sola, con `@madre` y sin factura, se cuentan aparte. No se les pone precio: nadie midió lo que habrían costado en otro lado.

### Lo que la sala sabe, puesto donde se decide

- Arriba del hilo, las decisiones vigentes del proyecto. Una decisión refutada no aparece: el archivo la conserva, pero una franja que dice «decidido» no puede cargar algo que la sala ya estableció como falso.
- Bajo el compositor, con el campo vacío, las preguntas que el archivista registró como abiertas y nadie contestó, las más arrastradas primero. Se van en cuanto escribes.
- Una pregunta sobre lo que la sala ya dijo ofrece `@madre` antes de gastar: contesta desde el mismo archivo, en esta computadora y sin tokens. Ofrece; tú eliges.
- Nada de esto entra en un prompt. Son lecturas del archivo que se te muestran a ti.

### Choices · un módulo para devolverte una decisión

- Un agente que tiene que elegir entre tres o más opciones reales puede devolvértelas como botones, con un canal propio e inerte: `pulse-ask`. Pulsar uno escribe la opción en el compositor y para ahí; nada corre ni se gasta hasta que tú mandas.
- No toca el canal de delegación. Ese parser arranca turnos con permisos reales, y enseñarle una segunda gramática sería poner un parser que puede gastar dinero en el camino de uno que no.
- Tiene interruptor porque no es gratis: la instrucción cuesta unos 135 tokens por turno mientras está encendido, y aparece como bloque propio en la economía. Una capacidad cuyo costo no se puede ver es una capacidad contra la que nadie puede decidir.

### La escalera, al lado del agente que pide subir

- Cuando una respuesta dice que el turno necesita más permiso del que tuvo, la sala lo ofrece ahí mismo: `#2` arma el compositor y `#3` o `#4` abren la misma anulación de siempre, donde la designación del proyecto se escribe a mano. Ofrece el camino; no concede nada ni acorta la ceremonia.
- Hasta ahora la sala solo sabía pedir elevación en un caso, un paso de plan que quiere `#2`. Un agente en turno directo que necesitaba `#3` únicamente podía decirlo en una frase, y leerla, salir del mensaje y encontrar el selector era trabajo del humano.
- El detector es estrecho a propósito: un `#3` suelto no basta, hace falta una palabra de necesidad a su lado, y el modo tiene que estar por encima del que el turno tuvo. Un agente que explica la escalera menciona todos los peldaños y eso no es una petición. No cuesta nada en ningún prompt.

### RIPLEY abre lo que ya está escuchando en esta computadora

- Un navegador anclado al lado del chat, con pestañas, que abre los servidores que contestan HTTP aquí: los lee de `lsof`/`netstat` y solo acepta direcciones de loopback. La sala no ejecuta nada para encontrarlos.
- Sin barra de direcciones. Un sitio que manda `X-Frame-Options` o `frame-ancestors` no se deja enmarcar, y ninguna página puede saltárselo: es la defensa estándar contra el clickjacking y RIPLEY ni puede ni debe anularla. Cuando uno se niega, el panel lo dice y ofrece abrirlo en pestaña o copiar la dirección; no abre ventanas por su cuenta.
- La comprobación de marcado, el permiso y el ajuste siguen vivos debajo, porque el obstáculo es el medio y no el diseño: una MADRE de escritorio con su propio motor sí puede, y ese día la barra vuelve.
- El visor de archivos volvió a ser solo eso. Su botón de servidores desapareció: esa lista vive en el navegador.

### El finder opera sobre los archivos, con las mismas vallas

- Clic derecho sobre cualquier fila: copiar, mover, renombrar, archivo nuevo, carpeta nueva. Lo que se toma se ve en una tira bajo el buscador; el nombre se escribe ahí mismo, en el panel, sin sacar al humano de donde estaba mirando.
- Esto no es un agente bajo un modo: es el humano en su proyecto. Pero las vallas siguen. El proyecto es el mundo —los dos extremos se resuelven dentro o la operación no ocurre, comprobado después de seguir enlaces simbólicos— y las zonas que la sala protege de los agentes se protegen también de un resbalón: `.git`, `.pulse`, `.madre`, un `.env` o los ajustes locales piden la designación del proyecto, la misma palabra que pide CONTROL.
- Cuentan los dos extremos. Mover algo inofensivo **encima** de una ruta protegida es exactamente como se pierde una ruta protegida.
- Y un buscador por nombre, con el mismo puntaje que usa el menú `!` del compositor.

### La barra, el pie y la firma

- La barra superior se compacta por consultas de contenedor, no de ventana: con el navegador abierto la columna del chat mide mucho menos que la pantalla, y una media query nunca se enteraba. Los botones pierden la etiqueta y conservan el icono en el orden en que dejan de caber.
- Las preguntas abiertas van en un riel horizontal con la etiqueta centrada encima. Antes envolvían a un segundo renglón y empujaban el compositor hacia abajo.
- El aviso de modo pasó de cuatro renglones a dos, y en la esquina inferior derecha quedó la versión y el copyright. La versión viene de `/api/state`, no escrita a mano donde se olvide en el siguiente release.

### El gato ya no es un dibujo: es una pequeña escena

- Escribe `madre` sola en la caja, sin arroba ni nada más, y envía. Una nave hiperrealista entra en la sala con su pasajero verde dentro; no responde un agente.
- Cuatro fotogramas registrados mantienen el casco, el domo y el haz en su sitio mientras el michi parpadea, mira el tablero y juega con los controles. El resultado se siente animado sin los saltos de una colección de imágenes distintas.
- Las luces del casco persiguen, el emisor respira y el reflejo del domo cambia con la escena. La nave conserva completos sus bordes, antenas y motor durante toda la aparición.
- Sigue siendo un secreto local: no se enruta, no entra al ledger, no cuesta tokens y ningún agente se entera. Al terminar, el compositor vuelve exactamente como estaba.

### Arreglos

- Los chips de memoria eran ilegibles en tema claro: el tipo se pintaba con colores elegidos para el mapa oscuro de NOSTROMO, y «HECHO» en un azul casi blanco desaparecía sobre el fondo. Ahora el tipo es un punto con anillo, el texto lleva los colores del texto y la fila perdió la opacidad que la apagaba.
- La paleta de `/` dejaba sin descripción a cualquier comando con sintaxis larga: la columna del nombre crecía sin límite y la explicación se truncaba hasta desaparecer. La sintaxis bajó a su propio renglón.
- Un renderizador que declina ya no mete un nulo en la columna de mensajes.
- El primer replay pintaba chips de memoria antes de que se evaluaran las constantes que necesitan: la página podía morir en una zona muerta temporal antes de dibujar nada. Los colores, las palabras de cada tipo y el estimador de caracteres por token viven ahora con los demás formateadores, arriba.
- PLAYWRIGHT abortaba hasta esta misma sala con `ERR_BLOCKED_BY_CLIENT`. Pasaba `--blocked-origins '*'` además de la lista blanca, y Playwright casa la ruta añadida más recientemente primero: el bloqueo general ganaba sobre la lista. La lista blanca ya era una puerta cerrada.
- El `+N` de las memorias usadas podía quedarse solo en un renglón al envolverse la fila; ahora viaja junto al último chip.

## 0.5.2 · 2026-09-28

Tres reportes de la 0.5.1, y la razón por la que ninguno lo atrapó una prueba. Arreglos: nada cambia modos, módulos, agentes ni a dónde sale nada.

### Cerrar una versión abre la siguiente

- Dos veces seguidas una versión salió y los arreglos que llegaron minutos después quedaron escritos **dentro de una sección ya publicada**. Eso es reescribir historia a mano, y hay que moverla de sitio antes de poder cerrar nada — porque un número en npm tiene que significar un código y solo uno: la sala decide si hay algo nuevo comparando versiones, y reescribir una dejaría sin señal, para siempre, a quien ya la tuviera.
- Ahora `scripts/release.mjs` **abre la siguiente sección en el mismo commit que cierra esta**. Lo que venga después tiene dónde escribirse y nadie tiene que acordarse. Abre un parche por defecto; si lo que sigue resulta ser un menor, cambiar el encabezado es todo el trabajo.
- Y ya no deja cerrar una versión cuya sección esté vacía. Una nota de versión es cómo alguien decide si la toma; una vacía es peor que no publicar.

### Los tres reportes de 0.5.1

- **Ningún comando de módulo funcionaba al abrir la sala** (#8). `/git`, `/ahp`, `/pendientes`: todos contestaban «comando desconocido» con el módulo encendido, porque la única llamada que le pide al servidor la lista se había caído **dentro** del bloque que cierra una instalación en vivo. Hasta que ocurriera una instalación, el compositor no conocía ni un comando de módulo. Ahora se pide al cargar, y también cuando un módulo entra, sale o cambia de interruptor — que es cuando cambia lo que el compositor acepta.
- **Las franjas de CREATE del historial no se dibujaban** (#9). `renderLease` leía `CAP_LABELS`, declarada cuatrocientas líneas más abajo; el historial se repite antes de llegar ahí, el `try` de cada renderizador se tragaba el error, y la franja simplemente no aparecía. En vivo salía bien, que es lo que lo hizo invisible.
- **«@CODEX PUEDE CREA»** (#10). La frase ya se traducía entera, pero `{what}` traía las etiquetas de la ficha, que son imperativos para un botón suelto. Dentro de una oración hace falta el infinitivo, así que ahora hay dos juegos: el de la ficha y el de la frase. Con ello, «instalado por **ti**» en vez de «por you» —el servidor manda `you` y el `??` nunca alcanzaba la traducción—, `@madre en la sala` en la ficha de OLLAMA, y la instrucción de `/module` dice ahora qué poner en `vendor`: sin decirlo, Codex escribió `'you'` y la ficha lo mostró como autor.

### Por qué ninguno de los tres lo atrapó una prueba

- La prueba de humo reproduce un transcript real y falla si algo revienta al dibujarlo. Pero ese transcript tenía **ocho** de los **sesenta y un** tipos de evento que la sala sabe dibujar: los otros cincuenta y tres no los ejecutaba nadie. Por ahí pasaron tres constantes declaradas al fondo del archivo y leídas durante el arranque — y como cada renderizador está envuelto en un `try`, el error se tragaba, la franja no aparecía, y la suite seguía verde.
- Ahora entra un evento sintético **de cada tipo** detrás del transcript real. Un campo que a mis payloads les falte es culpa de la prueba y solo se exige sobre el transcript de verdad; lo que no se perdona nunca, en ningún tipo de evento, es que un renderizador lea algo que todavía no existe.
- Encontró una quinta en su primer intento: `modules`, que cuatro renderizadores de instalación leían durante el historial. Cada instalación y cada baja de módulo jamás aparecieron al recargar.

## 0.5.1 · 2026-09-28

Cuatro cosas que salieron del QA de 0.5.0 el mismo día que se publicó. Ninguna cambia modos, módulos, agentes ni a dónde sale nada: son arreglos.

### Los cuatro reportes de 0.5.0

- **`/module` nunca llegaba a su tarjeta de instalación** (#5). MADRE le dice al agente en qué carpeta escribir el borrador —`.pulse/out/<turno>/`— y después revertía esa escritura por caer en zona prohibida: `.pulse/` lo es. La sala nombraba un sitio y castigaba por usarlo. Aquí nunca se vio porque **este** repositorio ignora `.pulse/` y git jamás reportó esos archivos; en un proyecto que no lo ignora, la función entera no existía. Ahora la carpeta de borrador de un turno no es zona prohibida **para ese turno**, y solo para ese: todo lo demás bajo `.pulse` se sigue revirtiendo, y hay una prueba con las dos mitades.
- **El resaltador tomaba el `//` de un regex como comentario** (#6). `/^https?:\/\//` dejaba gris el resto de la línea. Un literal tiene que ser uno de los candidatos que el escáner considera, no algo que revise después — si salta primero al `//`, nunca se entera de que había un literal abierto. Y el error contrario sería peor, así que `a / b / c` sigue siendo una división: una barra abre un literal solo donde puede empezar un valor, y una que no cierra en su línea era división desde el principio.
- **Dos textos en inglés** (#7). El vendor de `@madre` —«the room · local»— nunca pasó por el catálogo, y quedó a la vista cuando el menú de revisar empezó a mostrarlo. Y la franja de CREATE decía `@CODEX MAY CREA, GENERA IMÁGENES`: los verbos traducidos dentro de una frase que no. Una frase se traduce entera o no se traduce.
- **El centinela deja de archivar lo que MU/TH/UR ya explica** (#4). El reporte que llegó al repositorio era `Reading additional input from stdin...`, que no es una falla sino un aviso de Codex — llegó ahí porque MADRE entregaba lo último de stderr como si fuera la causa. Desde 0.4.1 el catálogo lo conoce (`MU-002`) y el centinela no archiva lo que el catálogo explica, así que se explica en la sala en vez de enviárselo al autor. Hay una prueba con el texto exacto de ese reporte.
- De paso, la tercera zona muerta temporal de la semana: el mapa de vendors quedó declarado al fondo del archivo y la fila de agentes se pinta durante el arranque. **Esta vez la atrapó la prueba de humo**, que es para lo que se reforzó.

## 0.5.0 · 2026-09-28

**Por qué menor y no parche.** Cambia a dónde sale lo que sale de tu máquina —el colector vive ahora bajo `madre.run`— y, sobre todo, **puede impedir que algo salga**: si tienes `OPENAI_BASE_URL` o `ANTHROPIC_BASE_URL` apuntando a un gateway, esos turnos quedan detenidos hasta que quites la variable o autorices ese endpoint con `PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS`. Es el arreglo correcto, pero un número de parche se lee como «actualiza sin mirar», y este no lo es. El ledger y la memoria de 0.4.x se siguen leyendo igual.

### Cambiar de conversación deja de recargar la página

- Abrir otra conversación hacía `window.location.reload()`: la sala entera otra vez — cada consulta, cada panel, el flujo de eventos desde cero. Era la forma bruta de asegurarse de que nada de la anterior quedara colgando.
- Ahora se repinta en sitio, y eso solo es seguro si **de verdad se suelta todo**: lo visto, los mensajes, las calificaciones, los turnos en vuelo, los planes, las estadísticas por agente, los archivos marcados, las condiciones registradas, los adjuntos pendientes, la cita de respuesta y el cursor del flujo. La lista está escrita —no adivinada— y hay una prueba que falla si alguien agrega estado por conversación y olvida soltarlo. Y el flujo se vuelve a apuntar, cerrando el anterior: dos abiertos a la vez entregarían cada evento dos veces.
- Si la sala no se puede releer, todavía recarga. Quedarse mostrando la conversación vieja sería peor que tardar.

### Dos cosas que se leían a medias

- En el menú de modos la cabecera se cortaba en `TEC…`, y lo que escondía era **el techo del agente**. Ahora dice `@CODEX · TECHO #4` y cabe en un renglón: la lista de abajo son literalmente los modos, así que «modo de este mensaje» no informaba de nada, y que la elección valga solo para este mensaje ya lo dice el globo del chip que abre el menú. La cabecera se queda con los dos datos que nada más lleva: quién, y hasta dónde.
- **LEER EL SDK** llevaba al archivo en GitHub. Va a `madre.run/sdk/` en español y `madre.run/en/sdk/` en inglés.

### La barra sigue diciendo en qué proyecto estás

- Dos nombres comparten ese rincón y solo uno te dice dónde estás. Los dos encogían por igual, así que una conversación con título largo dejaba el proyecto en **`pul…`** — una sala que dejó de decir qué sala es.
- Ahora el proyecto **no cede nunca** y la conversación es la que se recorta. Tiene dónde: su panel lleva el nombre entero. El proyecto no tiene otro sitio donde leerse.
- Y `EN VIVO` se partía en dos renglones cuando la barra se apretaba. Ya no.

### La fila de @madre cabe en un renglón

- Al elegir `@madre`, la fila sobre el campo se partía en dos: `PARA @MADRE` con una nota de tres cláusulas, el chip de modo, y un `modelo por defecto ▾` empujado abajo.
- **Ese chip no tenía nada que ofrecer.** `@madre` contesta con el modelo de chat que tenga Ollama, que se decide en la ficha de Ollama; aquí abría un menú vacío. Un agente sin modelos que elegir ya no trae selector — y era justo la pieza que rompía el renglón.
- La nota pasó de «memoria · contesta y le pregunta a la tripulación · nunca escribe» a **«memoria · nunca escribe»**. La frase entera sigue en su globo, que es donde estaba de todos modos.
- Y la fila ya no puede envolver. Si algún día vuelve a faltar espacio, lo que cede es la nota, con puntos suspensivos: un modo que no puedes leer es peor que una nota que no puedes.

### El cursor caía dentro de la píldora

- **Y en tema claro el código era ilegible.** Los colores del visor se eligieron para fósforo sobre negro: ese verde de las cadenas y ese amarillo de los números desaparecen sobre blanco. Ahora cada rol es una variable con su valor propio para cada fondo, como todo lo demás del tema — azul profundo, verde oscuro, ámbar tostado y magenta sobre claro.
- **La píldora respira.** Tenía el contorno pegado al texto, y el cursor quedaba encima del anillo en vez de después de él. Ahora lleva aire adentro y **lo paga con un margen negativo igual**: el siguiente carácter empieza exactamente donde empezaba. Esa cuenta también quedó en la prueba, porque relleno sin su compensación es la misma deriva por otro camino.
- **La píldora se comía el espacio de después.** El relleno lateral con margen negativo devuelve el sitio al *texto*, pero el fondo sí se pinta ahí: la píldora tapaba el espacio y la siguiente palabra llegaba pegada al borde. Y una sombra hacia afuera hace lo mismo, solo que más callada. Ahora crece **hacia arriba** —el relleno vertical no mueve un carácter— y su anillo se dibuja **hacia adentro**. Abraza sus letras, y el hueco que sigue es el espacio que tecleaste, visible.
- El corrector del navegador se queda encendido. Subraya las referencias, sí; perder la corrección en español y en inglés para ganar eso era mal negocio.

- Escribías una referencia y el cursor aparecía **en medio** de ella: `!public/brands.js|14`. No era el texto — era la capa que dibuja las píldoras encima del campo, desalineada del campo mismo. El cursor lo coloca el textarea con sus propias métricas; la píldora la dibujaba otra tipografía, y dos medidas distintas del mismo texto no pueden terminar en el mismo sitio.
- Dos causas, y la primera era gruesa. **Teclear `#2` dibujaba `#2 CREATE`**: siete caracteres que nadie escribió, así que todo lo que venía después quedaba siete lugares a la derecha de su propio cursor. La capa ahora dibuja solo lo que hay; el nombre del modo vive en el globo y en el chip sobre el campo, donde ya estaba.
- La segunda: cada píldora se re-tipografiaba —`font-family: mono`, `font-size: 13px`, `letter-spacing`, `font-weight`— mientras el campo real corre a 15px con la fuente de la interfaz. Ahora una píldora puede tomar el color que quiera y **ninguna métrica**: color, fondo, radio y sombra pintan sin mover nada.
- La regla quedó escrita en una prueba, porque una sola línea de CSS puede volver a romperlo: ninguna regla sobre el campo puede tocar familia, tamaño, peso, espaciado ni transformación, y el campo y su capa siguen compartiendo una sola declaración de forma.

### Tres detalles del menú de revisar

- **MADRE te ponía palabras en la boca, y en inglés.** Elegías un rango, elegías un agente, y el compositor se llenaba con `review this:` — una frase en inglés dentro de una sala en español, y peor: lo que escribías después caía *detrás* de ella y se leía como si alguien más lo hubiera empezado por ti. Ahora entra la referencia y el cursor. Nada más. Acabas de elegir un archivo, unas líneas y un agente: ya sabes qué quieres preguntar.
- **`@codex Codex` dice una cosa dos veces.** La arroba **es** el nombre. Al lado va solo lo que la arroba no te dice: de quién es el agente, que es el mismo que acaba de hablar, o que no tiene sesión. Pasaba en los dos menús —el del visor y el de responder desde una burbuja—; los dos.
- **La cabecera se cortaba a media palabra.** `REVISAR !public/app.js:24 CON` dejaba el verbo en una punta y su preposición en la otra, y el menú cortaba justo en «CON». Ahora son dos renglones: qué se manda, y debajo la pregunta. La referencia es una ruta y puede ser larga, así que envuelve en vez de empujar el menú o quedarse a medias.

### El árbol dice quién tocó qué, y el visor lee por lo que el archivo es

- Y el panel de archivos se rompió al estrenar ese punto: `no se pudo listar: Cannot access 'touched' before initialization`. La misma zona muerta temporal que ayer — una `const` declarada al fondo del archivo, leída por una función que corre durante el arranque. **Dos veces el mismo error en dos días**, y las dos veces con la suite en verde: el panel **atrapa sus propios fallos y los dibuja como una línea de texto**, así que nada lanzaba y la prueba de humo nunca abría el árbol. Ahora arranca con el panel abierto y **afirma que pintó**, no solo que nada explotó. Comprobado: con el error reintroducido, falla.

- **Un punto en el color del agente**, junto a cada archivo que un agente escribió en esta sala. Sale de lo que la sala ya registró —los artefactos de un permiso de creación y los archivos que cambió un turno de CONTROL—: no se guarda nada nuevo y no se deduce nada del disco. Un archivo que MADRE no vio cambiar no lleva marca, que es lo honesto.
- **El visor resalta por extensión**, con un resaltador propio de doscientas líneas: JavaScript, JSON, CSS, HTML, Markdown, Python, Shell, Config y SQL. Cero dependencias, como todo lo demás. La regla que lo mantiene honesto es que **nunca reescribe el archivo**: devuelve tramos sobre los mismos caracteres, en el mismo orden, así que lo que ves y lo que hay en disco son los mismos bytes — y una selección que le mandas a un agente es el archivo, no una versión dibujada de él. La prueba lo sostiene sobre nueve familias. Lo que no reconoce se queda en texto plano en vez de adivinarse.
- **Y preguntarle a un agente sobre un trozo dejó de ser un secreto.** `REVIEW WITH` existía desde siempre, pero aparecía solo *después* de seleccionar, y nadie adivina que un número de línea se puede clicar. Ahora, mientras no hay selección, el visor dice cómo: «clic en un número de línea para seleccionar · shift para un rango». Y dice qué está leyendo.

### `/module` sin `#2` contesta en la sala

- Escribir `/module` sin CREATE solo lanzaba un aviso que se desvanecía. Un rechazo que solo parpadea es un rechazo que la sala olvida. Ahora la respuesta cae **en el hilo**, donde caen todas las decisiones de la sala, dice que tu petición sigue en el compositor, y trae el botón que arma el modo. **El comando pide; el clic concede** — escribir un comando nunca arma un permiso, y la prueba lo sostiene.

### El briefing ya no sale por una puerta que nadie nombró

- Codex y Claude heredan del shell las direcciones base de sus APIs. Eso permite usar gateways legítimos, pero también hizo que una sala que mostraba «OpenAI» o «Anthropic» pudiera enviar el briefing a otro host sin decirlo. MADRE ahora enseña el destino efectivo en CONEXIONES y en QUÉ SALIÓ DE ESTA MÁQUINA; solo conserva el hostname, nunca la ruta, la consulta ni una credencial.
- Un endpoint personalizado queda bloqueado antes de armar o entregar el briefing. Para volver al servicio oficial basta con quitar `OPENAI_BASE_URL` o `ANTHROPIC_BASE_URL`; quien sí verificó su gateway puede autorizar por agente con `PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS=codex` o `=claude`. Bedrock, Vertex AI y Foundry se nombran como los proveedores explícitos que son.
- MU/TH/UR reconoce el 403 que exige unirse a Telegram como **MU-055**: explica que viene del gateway, no de MADRE ni del proveedor oficial, y no recomienda suscribirse ni entregar credenciales.
- Codex ya no se reduce a «salió con código 1» cuando su JSON trae `error` o `turn.failed`: la sala conserva el motivo que el propio CLI reportó. Si no trae ninguno, se mantiene el código de salida como último dato honesto.

### El SDK deja de tener trampas

Antes de que alguien pueda pedirle a un agente «hazme un módulo», el contrato tiene que perdonar los tres errores que cualquiera comete. Medí ocho módulos —uno bueno y siete rotos— y seis de los siete ya contestaban con precisión. Estos eran los que no.

- **`/module` ya es la entrada explícita para construir.** `/module <qué debe hacer>` requiere `#2 CREATE`: si falta, MADRE lo pide y conserva el texto en el compositor; nunca se concede el permiso solo por escribir un comando. Con `#2` activo, conserva el agente elegido y convierte la petición en el contrato de un único `<id>.module.mjs` que el humano revisa e instala desde su tarjeta. Mientras se escribe, el compositor cambia a morado MADRE eléctrico con una transformación breve de píxeles; el estado queda limpio y legible después de la transición, y respeta movimiento reducido. La zona de escritura reserva ahora cinco píxeles laterales para que el contorno del chip no se recorte.
- **Un campo mal escrito pasaba en silencio.** Escribe `sumary` en vez de `summary` y el módulo instala sin una queja, con la ficha vacía y sin manera de saber por qué. Con treinta y dos campos opcionales ese es *el* error que va a cometer todo el mundo, un agente incluido. Ahora MADRE dice qué campos no conoce — **dice, no rechaza**: un módulo escrito para una MADRE más nueva puede traer campos que esta todavía no aprendió, y eso no debe impedirle cargar.
- La advertencia salía al subir un archivo desde MODULES, pero no al instalar el mismo archivo desde la tarjeta que deja un agente en la conversación. Las dos entradas pasan por el mismo verificador y ahora también terminan en la misma advertencia; `sumary` ya no vuelve a quedar en silencio según quién escribió el archivo.
- `install` figuraba como campo entendido aunque `defineModule` no hacía nada con él. El contrato documentado pone esa línea en el resultado de `status(ctx)` y reserva `installCommand` para el comando confirmado; el campo superior fantasma salió de la lista y ahora se señala como desconocido en vez de prometer un efecto que no existe.
- **DESINSTALAR ya vive en la tarjeta del módulo.** El backend protegía los módulos integrados y la acción existía escondida en la tarjeta `</>`, pero la ficha `DEV` no la ofrecía. Ahora cada módulo externo confirma su ruta y puede quitarse ahí mismo; borra su archivo y el registro que recuerda de dónde actualizarlo, recarga el registro y deja intactos los módulos que MADRE trae de fábrica.
- **La documentación prometía un `import` que el instalador rechaza.** `SDK.md` decía que podías `import { defineModule } from '@jossuealcala/madre/sdk'`. El paquete lo exporta bien, pero MADRE copia tu archivo a una carpeta aparte para revisarlo antes de instalarlo —así sabe qué es sin que corra donde vive— y ahí no hay `node_modules`: ningún paquete resuelve. Ahora la guía enseña la forma que sí funciona, que ya existía: exporta una función y **MADRE te entrega el SDK**.
- **Y la trampa que solo le pasa a un agente.** Los módulos que vienen con MADRE escriben `import { defineModule } from './sdk.mjs'`, porque viven dentro del paquete. Un agente al que le pides un módulo lee `ripley.mjs` antes que cualquier documento y copia esa línea — que es correcta ahí e imposible fuera. Node contestaba solo «no encuentro el archivo», que manda a buscar lo que no es. Ahora el error termina diciendo qué hacer en su lugar, y el ejemplo y la guía lo advierten con esas palabras.

## 0.4.1 · 2026-09-27

### MADRE tiene casa: madre.run

- **Y lo que trae una versión se lee en esa casa.** `QUÉ TRAE 0.4.2 ↗` llevaba a la página de releases de GitHub, que está escrita para quien ya trabaja ahí; quien aprieta ese botón solo quería saber qué cambió. Ahora va a `madre.run/cambios/` en español y a `madre.run/en/changelog/` en inglés, con la versión en el ancla (`#v0.4.2`) para que la página lo deje parado en la sección que le toca.

- El colector de errores vivía en `madre-reports.jossue-alcala-o.workers.dev`, y **ese host se le enseña al usuario** en el registro de salidas del núcleo. Un subdominio de `workers.dev` con un nombre de cuenta pegado parece un endpoint improvisado; `madre.run` parece el producto. La dirección es parte de lo que se le pide confiar a alguien.
- **La dirección vieja sigue contestando, y tiene que seguir.** Cada sala en 0.4.0 y anteriores la lleva compilada dentro: apagarla detendría sus reportes en silencio. Queda escrita en el código y en la prueba, en vez de desaparecer del registro.
- **Dos puertas para cada reporte humano, siempre.** Un fallo con traza pertenece a GitHub, donde se deduplica y la respuesta le sirve al siguiente; pero pedirle una cuenta a quien llegó de un grupo en español para decir «no me detecta Codex» es perderlo. En español manda el formulario y el issue queda a un clic; en inglés, al revés. Nadie choca con un muro de login con un reporte en la mano.
- Máquina y humano van a puertas distintas a propósito: `madre.run/v1/reports` para el centinela, `/reportar` y `/report` para personas. Mezclarlos ensucia lo que el autor lee.
- Y el logo —el del README y la marca de la barra— apunta a la casa del producto en vez de al sitio personal del autor. La atribución se queda donde corresponde, al pie del README.
- De paso salió un defecto que yo mismo introduje al cablear esto: un identificador de reporte inexistente devolvía 200, porque el formulario no necesita que el reporte exista para construirse. Ahora ninguna de las dos puertas se ofrece para algo que no está.

### Image Studio buscaba la llave donde MADRE no la guarda

- Y en la misma ficha, una línea estaba bajo la etiqueta equivocada: «se engancha solo dentro de un permiso de creación con el alcance de imagen encendido» no es algo que el módulo *escriba*, es una condición para que se enganche siquiera. Pasó a **NECESITA**, y de paso quedó redactada como requisito: «un permiso de creación con el alcance de imagen encendido; solo ahí se engancha» — bajo *necesita*, la frase anterior no concordaba.

- Cuando pegas una llave de Gemini en ⚙ CONEXIONES, MADRE la escribe en **`~/.gemini/.env`**, que es donde ese CLI la lee. Image Studio miraba tres sitios: `GEMINI_API_KEY`, `GOOGLE_API_KEY` y el llavero de macOS. **Ese archivo no estaba en la lista.** La sala guardaba una llave en un sitio donde después se negaba a mirar, y la ficha contestaba «no se encontró llave de Gemini» por una llave que acababa de escribir ella misma.
- **En Linux era total:** la rama del llavero es solo de macOS, así que `~/.gemini/.env` era el único lugar posible — y nunca se leía. Image Studio no podía encontrar una llave en Linux salvo exportando una variable a mano.
- Ahora el orden es: lo que se le dio a este proceso, después el archivo que el CLI lee en cada arranque —y que MADRE escribe—, y al final el llavero, que solo existe si el propio inicio de sesión del CLI lo puso ahí. Entiende la forma citada y la de `export`, y una asignación vacía no es una llave.

### Los remedios: prosa en español y un botón donde había un comando

- **44 de 53 condiciones explicaban su remedio en inglés.** No los comandos —un comando no se traduce— sino los **comentarios** que los acompañan: 145 líneas de prosa, y la mitad nombrando botones. `# ⚙ CONNECTIONS → Gemini → GENERATE IMAGES → SAVE` en una sala donde esos botones se llaman **CONEXIONES**, **GENERA IMÁGENES** y **GUARDAR**. El remedio mandaba a buscar cosas que no existen con ese nombre.
- Los 80 comentarios distintos están en español, con los nombres que el usuario de verdad ve. La guardia del catálogo ahora los recorre como recorre el título y el diagnóstico de cada condición — y aprendió que algunos se **componen** al cargar (el helper que arma un `export` los escribe), así que pregunta también a las condiciones y no solo al código fuente.
- **Ocho remedios eran un comando solo porque nadie había cableado el botón.** Firmar un agente, instalar uno, encender un alcance: MADRE ya hace las tres desde CONEXIONES. Esas condiciones ahora declaran `solvedIn: 'connections'` y su ficha abre el panel **en el agente del que se trata**, en vez de entregar una línea para pegar. Los comandos se quedan debajo, para otra máquina o para quien prefiera teclear.
- Lo que sigue en terminal, sigue a propósito: los siete remedios que tocan el perfil de tu shell. MADRE no debe editarte el `.zshrc` — ahí vive configuración que no escribió ella.

### El registro, legible: un icono que no estorba y un archivo que se manda

- **COPIAR se sentaba encima del comando que ofrecía.** Era una palabra flotando en la esquina del bloque, y cualquier comando largo le pasaba por debajo. Ahora es un icono de dos hojas, con su sitio reservado: el comando ya no corre bajo nada, y al copiar el icono se enciende en vez de convertirse en otra palabra.
- **La `×` de descartar se caía al renglón de abajo.** La fila del registro tenía cuatro columnas y al agregarle la salida quedaron cinco cosas. Ahora son cinco columnas, con aire entre ellas.
- **DESCARGAR EL REGISTRO.** Un CSV con una fila por condición: cuándo, qué agente, **el código de soporte**, la condición y el error. Se abre en cualquier hoja de cálculo y lleva BOM, para que los acentos no se rompan al abrirlo. Quien lo reciba no necesita tener MADRE abierta para leerlo.

### Entrar a NOSTROMO no puede dejarte encima de la salida

- Y el arreglo dejó su propia marca: al darle el foco al mapa, el navegador le dibujaba **un marco azul alrededor de toda la constelación**. Al mapa no se llega con Tab —está fuera del orden de tabulación a propósito—, así que ese anillo no le señalaba nada a nadie. Quitado; no se esconde ninguna pista al hacerlo, porque no hay adónde tabular.

- Escribías la designación, dabas Enter, y el foco quedaba en **SALIR**: el siguiente Enter te echaba de donde acababas de entrar. Un diálogo le entrega el foco a su primer hijo enfocable, y con COLD, PREGUNTAR y RECENTRAR ocultos, ese primero era la salida. Ahora lo toma el mapa, que es a lo que fuiste.

### El registro de errores: un código que se dicta, y una salida por fila

- **El badge de MU/TH/UR subía y nunca bajaba.** Cada condición registrada se reconstruye del ledger en cada carga, y no había forma de descartar ninguna: veintitantas alertas encima del botón, todas de cosas ya resueltas. Ahora cada fila del registro tiene su `×`, y cuando hay varias, un **DESCARTAR LOS N** de una vez.
- Descartar **no borra nada**: el ledger es historia y no se reescribe. Es una preferencia de lectura y vive donde viven las preferencias de lectura — este navegador —, atada a lo que el registro *es* (hora, agente, primera línea), así que la misma entrada reproducida del ledger en la siguiente carga sigue descartada. Y hay vuelta atrás: **VER LOS N DESCARTADOS** los trae todos de regreso.
- El saludo de MU/TH/UR y el badge cuentan ahora lo mismo: lo que sigue abierto.
- **Cada condición tiene su código de soporte**, `MU-001` a `MU-054`. Sale en la ficha y es lo que el botón del registro enseña, porque es lo que una persona dicta por teléfono cuando pide ayuda. El código vive **en la condición**, no en su posición en la lista: insertar una nueva en medio no renumera a las demás, que es justo lo que arruinaría un código de soporte. Con su prueba: todas lo tienen, ninguna lo repite, y un módulo que declara una condición declara su código con ella.

### Un número no es una razón

- `Claude exited with code 143.` se lee como que el agente se rompió. No se rompió: **143 es 128+15**, un CLI que atendió un SIGTERM y se despidió. Algo lo **detuvo** — y eso manda a buscar a un lugar completamente distinto que una caída.
- MADRE además **ignoraba la señal**: `child.on('close', (code) => …)` tiene un segundo argumento que dice qué señal cerró el proceso, y no se leía. Un proceso matado por señal llegaba como `código null`.
- Ahora las dos formas se dicen con palabras: SIGTERM es «algo le pidió que se fuera: PARAR TODO, un tiempo límite, o la sala cerrándose»; SIGKILL, «matado en seco, casi siempre la máquina quedándose sin memoria»; SIGINT, «un Ctrl+C le llegó». Un fallo ordinario conserva su número, que ahí sí es lo que diagnostica.

### PLAYWRIGHT nunca conectó, y npm se estaba comiendo las banderas

- Pedirle a un agente que use el navegador contestaba `CONNECTION_CLOSED: "Connection closed"`. La causa: MADRE lanza el servidor con `npx --no @playwright/mcp --headless --isolated …` y **npm se queda con esas banderas como configuración suya** —`Unknown cli config "--headless"`— y le entrega al servidor solo los valores sueltos. El servidor muere con `too many arguments. Expected 0 arguments but got 4` antes de hablar una palabra de MCP. Falta un `--` entre el paquete y sus banderas. Probado: sin el separador el servidor muere con código 1; con él contesta el saludo MCP.
- Debajo había un segundo: **el servidor y su navegador son dos cosas distintas**, y la ficha solo comprobaba el paquete. Un PLAYWRIGHT «encendido · chromium» puede no tener navegador, y entonces cada herramienta contesta `Browser "chrome-for-testing" is not installed`. El remedio que mostraba MADRE además ya no era el correcto: hoy el navegador lo baja el propio servidor (`npx @playwright/mcp install-browser chrome-for-testing`), no el CLI de playwright.
- Y un tercero al ir a traducir lo anterior: **las condiciones que declara un módulo no estaban en el catálogo español**. Viven en el archivo del módulo, no en `troubleshooting.js`, así que la guardia de las 51 nunca las vio y PLAYWRIGHT se explicaba en inglés dentro de una sala en español. La guardia ahora lee también los módulos.

### Un CLI que se actualiza solo debajo de una sala abierta

- En un QA salió `spawn /Applications/ChatGPT.app/Contents/Resources/codex ENOENT` con el binario **existiendo y siendo ejecutable**. La app de ChatGPT había actualizado su Codex a media sesión —de `0.154.0-alpha.6.2` a `0.155.0-alpha.9.2`— y MADRE seguía apuntando al que ya no estaba. Reabrir la sala encuentra el nuevo; sin saber eso, parece que el producto se rompió.
- Lo que hacía ilegible ese momento: **`spawn` falla de dos maneras y solo una estaba explicada.** La asíncrona levanta `error` en el proceso hijo y ahí sí había una frase con qué hacer. La síncrona **lanza antes de que exista un hijo al que escucharle**, así que se saltaba el manejador entero y a la sala llegaba el error crudo de node. Ahora las dos pasan por la misma explicación, y nombra la causa que nadie puede adivinar: un CLI que se actualiza solo puede moverse debajo de una sala ya abierta.

### Un aviso no es una causa

- Un usuario reportó que MADRE «solo funciona con APIs»: tenía Codex y Claude con sus planes, los dos con sesión iniciada, y ningún turno contestaba. Lo que leía era, en Claude, un aviso sobre `ANTHROPIC_API_KEY`; en Codex, la línea `Reading additional input from stdin...`. Ni una de las dos cosas era la razón.
- **El defecto estaba en cómo MADRE reporta un turno fallido.** Cuando un turno no producía respuesta, el mensaje era `stderr.trim() || …` — lo que hubiera quedado en stderr, y el `||` **descartaba lo único que diagnostica**: el código de salida, o el hecho de que el CLI salió limpio sin decir nada. Así un aviso sobre un ajuste que no venía al caso se volvía «la causa», y la causa real no llegaba a nadie. Para Codex era peor: su parser nunca devuelve un error propio, así que stderr era literalmente todo lo que quedaba.
- Ahora el mensaje dice primero **qué pasó** —`salió con código 3`, o `salió limpio sin respuesta`— y después, separado y etiquetado, **lo que el CLI imprimió**. Nunca uno disfrazado del otro. El código de salida viaja en el error para el centinela.
- Y MU/TH/UR aprendió las dos condiciones. La de Claude explica lo que el usuario no podía saber: MADRE le entrega al CLI el entorno tal como está esta computadora, así que una `ANTHROPIC_API_KEY` exportada en tu perfil **gana sobre el plan de claude.ai** y el turno se le cobra a la API. La de Codex dice lo contrario de lo que parece: esa línea es inofensiva, MADRE lo corre con stdin cerrado, y si el turno falló la razón es la línea de arriba.

### Lo que encontró quien la probó

- **`PULSE_LANGUAGE` no cambiaba la interfaz** — y el defecto era peor que eso. El servidor sí la respetaba al arrancar y también al presionar el botón; pero `/api/state`, que es de donde la página aprende qué idioma habla esta máquina, **volvía a leer el archivo de configuración** en vez de preguntar por el idioma ya resuelto. Con la variable puesta, la sala quedaba **partida**: los textos del servidor en inglés dentro de una interfaz en español. Una sala partida es peor que cualquiera de los dos idiomas. Ahora la página recibe el idioma que la sala está hablando, no el que está escrito en el archivo, y no hay una segunda expresión que pueda volver a discrepar.
- **«1 ARCHIVOS».** Un archivo creado no son archivos. El defecto venía del inglés —`created · 1 files` decía lo mismo— así que no era de la traducción: estaba ahí desde que existen los artefactos.
- **EYECAT hablaba inglés.** Sus dos hallazgos —«una nota que sus propias fuentes no sostienen» y «dos memorias que no pueden ser ciertas a la vez»— nunca se envolvieron. Eran frases enteras, no una palabra suelta.
- Y al buscar esa, apareció una cuarta: **la severidad de cada condición de MU/TH/UR se imprimía cruda**. Ocho fichas diciendo `blocking`, `degraded`, `transient`, `informational` en una pantalla por lo demás en español.

### La tercera vez que pasa lo mismo

- Las clases de memoria, el nivel de un aviso y ahora la severidad de una condición: las tres son **un id en el catálogo y una palabra en la pantalla**, y las tres se imprimieron crudas. La guardia del catálogo no puede verlas por construcción — nunca pasan por `t()`, así que no hay llave que falte. Ahora hay una guardia para **la forma**: falla si un `.kind`, `.level`, `.severity`, `.status` o `.stage` se escribe directo en un nodo, y exige que los tres mapas sigan declarados entrada por entrada, porque calcular la llave los esconde de las dos guardias a la vez.
- De paso salió un homónimo que un catálogo con llave en inglés no puede sostener: `FIXED` ya era **FIJO** —la parte del prompt que no cambia— y la severidad `fixed` quiere decir **resuelta**. La ficha en inglés pasó a decir `ALREADY FIXED`, que es más claro en los dos idiomas.

### No es un defecto

- **Los agentes contestan en tu idioma, no en el del mensaje.** MADRE sí pide el idioma: el bloque `style` del briefing les dice «escribe a la sala en el idioma en que escribe el humano» (`src/room/prompt.mjs:86`). Lo que pasa es que tus instrucciones globales —tu `CLAUDE.md`, tu `AGENTS.md`— **ganan sobre el briefing**, y así debe ser: son tuyas y son permanentes. Es la consecuencia directa de que MADRE use tus sesiones tal cual, que es justo lo que promete.

## 0.4.0 · 2026-09-26

### Actualizar de verdad, y una puerta para la comunidad
- El `↻` de una ficha miraba y nada más: OLLAMA decía `0.34.3 AVAILABLE` y PLAYWRIGHT `NEWEST IS 0.0.82`, y no había manera de hacer nada al respecto. Ahora, cuando hay algo más nuevo y el módulo sabe ir por ello, junto a la versión aparece el botón. Son dos llamadas: la primera pregunta qué se correría y responde con el comando, la segunda corre exactamente eso. MADRE no corre un comando que no hayas leído, y la salida cae en la sala línea por línea como cualquier otra instalación.
- No se instala solo a propósito. Instalar software en tu computadora sin avisar rompería justo lo que MADRE promete —el comando se ve antes de correr— y puede romperte el entorno a media sesión. Detectar es automático; correrlo es un clic tuyo sobre un comando a la vista.
- En el SDK, `updatePlan(ctx, { latest })` dice cómo se trae esa versión. Donde no hay comando posible —un Ollama que no se instaló con Homebrew— la ficha entrega la descarga en vez de fingir.
- Un módulo tuyo ahora puede actualizarse solo: declara `updates: { url }` donde lo publicas, o instálalo desde un archivo y MADRE recuerda cuál. Su ficha trae **GET A NEWER FILE**: va por el archivo, lo verifica y lo reemplaza si carga y dice otra versión. Comprobar no instala nada —eso costó un error de verdad: el primer intento usaba la maquinaria de instalar para mirar, y mirar te recargaba el registro—. Y reemplazar tu propio módulo dejó de chocar con su propio id, que es lo que una actualización es.
- Y en la cabecera de MODULES hay **+ ADD A MODULE**: el `.mjs` de alguien más entra por la misma puerta que todo lo demás —copia aparte, importado ahí, revisado contra las reglas de la casa, instalado solo si pasa— y si no pasa, el autor lee exactamente por qué. Se dice claro lo que es: un módulo corre dentro de MADRE con tus permisos, y lo que el código pretende no lo puede comprobar nadie más que tú.

### El core: lo que MADRE dice en tu nombre
- Cada turno, MADRE escribe un documento en tu nombre y se lo entrega a un proceso. Hasta hoy ese documento **existía solo el instante en que el proceso lo leía**: no se guardaba en ninguna parte y nadie había leído uno nunca. Ni tú. Se entra por donde tenía que ser: **dentro de NOSTROMO, haciendo clic en el núcleo**. Tocar la estrella era hasta hoy un intento contra el archivo; lo que hay detrás es lo que MADRE dice en tu nombre, y leer eso no es allanamiento de nadie.
- Ahí está entero, bloque por bloque, con lo que pesa cada uno y las palabras exactas: `room`, `who`, `privacy`, `mode`, `memories`, `recall`, `context`, `delegation`… En esta sala son diecisiete bloques y catorce mil caracteres.
- Cambias a quién va y las palabras cambian. **Subes el modo y aparece el permiso que se le daría, escrito.** En `#2` el documento crece mil caracteres y nace el bloque `lease` con lo que ese agente podría crear y dónde — pero no se crea ninguna carpeta ni se toma ningún checkpoint para enseñarlo: la ruta se nombra, no se hace. Si el techo de ese agente es menor que el modo que elegiste, lo dice con su número.
- **Se arma alrededor de lo que vas a preguntar.** Escribes ahí la pregunta —o la traes a medio escribir del compositor— y el documento se rehace: cambian los recuerdos que invocaría, los intercambios que citaría y la pregunta con la que cerraría. Sin eso era el briefing de un turno que nadie iba a tener. Lo que tecleas no se envía a ningún lado, y lo dice al lado del campo.
- Y dice qué ventana carga: desde qué intercambio hasta cuál, cuántos mensajes van dentro y **cuántos quedaron atrás** —que es exactamente para lo que existe el recall—. Ese dato se calculaba desde el primer día y salía siempre vacío porque yo leía un campo con otro nombre; ahora es un rango de verdad.
- Preguntar qué diría la sala no es la sala diciéndolo: las memorias que se leen para armarlo **no se cuentan como recordadas**, la ventana no se mueve y no se arranca ningún proceso. El documento se arma en el momento y no se guarda: cinco kilobytes por turno inflarían el ledger y duplicarían lo que ya está en el transcript.
- Se lee, nunca se escribe, y lo dice justo donde alguien buscaría el botón de editar. Si este texto fuera editable, cada frase de seguridad que MADRE imprime —que leen por defecto, que se les dijo que no toquen `.env`— pasaría a ser una afirmación sobre un documento que alguien pudo cambiar. Los bloques que se pueden apagar se apagan con su interruptor; texto libre, jamás.
- Debajo del documento está **THE LAUNCH**: el comando exacto que MADRE correría para entregarlo, con el ejecutable, el directorio, cada bandera y el lugar donde entra el briefing. No es una descripción del comando — lo arman los mismos adaptadores que lo armarían de verdad, así que «este agente trabaja en solo lectura» deja de ser una promesa y pasa a ser una línea que puedes leer. Y debajo, lo que mantiene la corrida dentro de este turno —la sesión que no persiste, el hogar temporal de Gemini que se borra al terminar— y los servidores que podría llamar con sus herramientas contadas.
- De ese comando **nunca se imprime un valor de entorno, solo los nombres**. Una línea de comandos es algo que la gente fotografía, y los valores son donde viven las llaves: sepas que `GEMINI_API_KEY` está puesta, no cuál es. Vale para cualquier forma en que un adaptador las escriba, incluidas las que un módulo instalado mañana agregue.
- Y para `@madre` no hay comando: no se arranca ningún proceso, es el modelo local contestando dentro de MADRE. El core lo dice en vez de inventar una línea.
- Y se siente como entrar dentro del sol porque **es** el sol: el marco se abre encima de la estrella de NOSTROMO, que sigue girando y respirando detrás. Nada de eso es un idioma nuevo — el marco, los pliegues, las barras y la letra son los que MADRE ya habla.

### La sala, en una imagen

- El README no tenía una sola foto del producto. Ahora la primera pantalla es **la sala trabajando**: una pregunta, Codex contestando, y debajo `RELEVO @CODEX → @CLAUDE · 4 MENSAJES CARGADOS` con Claude discutiendo lo que Codex acababa de decir y citando `src/store.mjs:8`. Esa línea de relevo es la promesa entera del producto en un renglón.
- La conversación es **real**, con dos agentes de verdad sobre un proyecto de demostración escrito para eso —un acortador de enlaces con una carrera de escritura auténtica—, no una maqueta. Y no es la sala de nadie: ni un dato del proyecto de quien la publica aparece en la imagen.

### El nivel de un aviso, en español

- `WARNING · @CODEX 84% DE CUOTA DEL PROVEEDOR USADO · SIGUE CON @CLAUDE`. La frase estaba en español y **la palabra de enfrente no**: el hilo imprimía el id del nivel tal cual. Las tres palabras llevaban meses en el catálogo —el servidor ya las usaba al escribir el aviso— y la página nunca las pidió. Ahora dice `EN AVISO`, `EN CRÍTICO` y `AGOTADA`, como su hermano `CLARO ·` ya decía. Declaradas una por una, para que la guardia del catálogo las vea.

### Un modo que solo se alcanzaba con el ratón, y papeles que se contradecían

- **`#4` existía en el menú y no se podía teclear.** El compositor aceptaba `#0` a `#3`; el chip ofrecía los cinco. Ahora acepta los cinco — y al arreglarlo salió lo de verdad: **teclear `#3` armaba CONTROL sin pedir nada**, mientras que hacer clic en `#3` abría la anulación. El mismo modo, dos precios. Ahora los dos altos pasan por la misma puerta: el token sale del mensaje, el texto vuelve al campo y la anulación decide. El techo sigue siendo palabra del servidor (`room.modeCheck`); esto es la ceremonia delante de él.
- **`SECURITY.md` apuntaba a una sección del README que no existe** — «the short threat model lives in the README under *Modelo de amenazas, en corto*». Ahora apunta a donde de verdad está escrito.
- **Y no decía una palabra de AIRLOCK.** `#4` corre comandos, hace `git push` y despliega, y el documento de seguridad estaba en blanco sobre la superficie más sensible del producto. Ya está escrito, con lo que hace falta para armarlo y con la frase que importa: tratar `#4` como entregarle tu shell a ese agente.
- `CONTRIBUTING.md` clavaba la regla de versiones a `0.2.x`. La regla no era de esa versión.

### Un README que vende y una referencia que explica

- El README eran cuatro mil palabras de manual excelente. Un manual no es una portada: quien llega no sabe todavía si esto le sirve. Ahora son **ochocientas** — la promesa, el comando, tres cosas que MADRE hace y una lista de **lo que MADRE no es**, que es lo que de verdad la distingue: sin nube, sin cuenta, sin guardar credenciales, sin que nada salga por su cuenta, y con las pantallas que lo demuestran.
- Todo lo demás —los modos por dentro, las capacidades de cada agente, la memoria, los módulos, el config y las treinta variables de entorno— vive entero en [`docs/REFERENCE.md`](docs/REFERENCE.md), que viaja en el paquete.
- Y ahí quedó por fin escrito lo que faltaba: **el idioma** (español por defecto, `EN` a un botón, `PULSE_LANGUAGE`, y por qué la terminal se queda en inglés a propósito), **THE LAUNCH**, el registro de salidas y la consola del núcleo.

### Los cuatro lugares de la sala tienen nombre en español

- `MODULES` y `THE CORE` se quedaban en inglés porque estaban en la lista de nombres que no se traducen, junto a MU/TH/UR, NOSTROMO, ASH y RIPLEY. Pero esos cuatro son **nombres propios de la nave** y estos dos no: dicen qué hay detrás de la puerta. Ahora son **MÓDULOS** y **EL NÚCLEO**, que es como la prosa de la sala ya los llamaba — «mira MÓDULOS», «aléjate del núcleo».
- Al quitarlos salió que `FILES`, `CONVERSATIONS` y `NEW CONVERSATION` **ya estaban traducidos** desde hacía rato: la lista de excepciones los dejaba pasar por delante del catálogo, así que la guardia los aprobaba por la razón equivocada. Una guardia que aprueba por accidente no es una guardia.
- Y de ahí salió algo peor: **seis frases estaban en el catálogo dos veces**. Una llave repetida es JavaScript legal —la segunda gana en silencio y la primera queda muerta—, y en un archivo de más de mil líneas así es como una frase acaba con dos españoles y tu corrección cae en el que nadie lee. Las seis eran idénticas, así que no cambió nada en pantalla; ahora hay una prueba que lee el archivo como texto y no deja entrar la séptima.

### Un ejemplo se teclea, así que se dice en tu idioma

- La sala vacía invitaba a empezar con `@codex summarize this project`. La caminata que traduce el marcado **salta `CODE` y `PRE` a propósito** —lo que lee una máquina no se traduce, y `madre doctor` tiene que seguir siendo `madre doctor`— pero ese de ahí no era código: era un ejemplo de **lo que tú escribirías**, y eso es una frase como cualquier otra. Ahora se marca con `data-say` quien la escribe a mano, y dice `@codex resume este proyecto`.
- Con él, el nombre de respaldo cuando MADRE no sabe cómo se llama tu carpeta: «este proyecto», no «this project».

### La leyenda de NOSTROMO, y una barra que cabía en un renglón

- Las cinco clases de memoria se dibujaban con su **id**, no con su nombre: `DECISION`, `FACT`, `PREFERENCE`, `QUESTION`, `ABERRATION` en una sala entera en español. Ahora la leyenda, la ficha de cada memoria, el globo de cada estrella y las píldoras del hilo dicen DECISIÓN, HECHO, PREFERENCIA, PREGUNTA y ABERRACIÓN. El id en el ledger no se mueve: lo que cambia es la palabra en pantalla, y las cinco están declaradas una por una para que la guardia del catálogo las vea de verdad en vez de dejarlas pasar por parecerse a un identificador del código.
- **Cuánto hace** también estaba a medias: «MEDIDO 1 D AGO». Ahora es «MEDIDO HACE 1 D», y con él el «ahora mismo», los minutos y las horas que se leen en toda la sala.
- Y `CONCEDIDO` / `NEGADO` en el botón con que resuelves una petición de permiso, que seguían en inglés justo en el momento de decidir.
- La barra de NOSTROMO tenía cinco columnas y hasta siete cosas que poner: al aparecer PREGUNTAR y RECENTRAR, **SALIR se caía al renglón de abajo**. Ahora la barra fluye en columnas —le caben las que hagan falta— y el subtítulo se recorta con puntos suspensivos en vez de empujar los botones fuera.

### El recorrido de la primera vez, y la última pasada

- **Faltaba el onboarding.** Los cuatro pasos que le explican la sala a quien llega por primera vez —el compositor, la tripulación, el árbol del proyecto, MU/TH/UR— seguían en inglés, que es justo el peor lugar para dejarlos: es lo primero que alguien lee de MADRE. Ahora arrancan en español, con `EMPEZAR ›` y `SIGUIENTE ›`.
- El **compositor entero**: el menú de `/`, el de modos y el de modelos; el diálogo de override con lo que concede `#3` y `#4`; el puente que instala Ollama e inicia sesión; las acciones y las calificaciones de cada burbuja; y las cuarenta y ocho frases con que un agente dice que está pensando.
- **MU/TH/UR**: la cabecera del catálogo («CONDICIONES CONOCIDAS · 51 DE 51 · darwin / zsh»), lo que responde EYECAT y cómo se archiva una aberración.
- **MODULES**: las versiones y lo que significa cada una —`INSTALA 1.4.1`, `AL DÍA`, `LA MÁS NUEVA ES 0.0.82`—, los avisos antes de instalar y de actualizar, la economía de la sala con sus cuatro cifras, y las fichas de Ollama, RIPLEY y Ash con sus interruptores.
- **PRIVACY y NOSTROMO**: lo que queda expuesto, la purga y lo que reemplaza, los ajustes rápidos de tiempo límite y presupuesto, la ficha de cada memoria, sus compañeras de viaje y el olvido.
- Y un error de verdad que salió de esto: al purgar la sala, MADRE reconocía un nombre de proyecto mal escrito comparando el error del servidor contra un texto en inglés. En una sala en español ese texto nunca coincidía, así que la alarma de MOTHER **no sonaba en la única puerta donde importa**. Ahora ambas orillas dicen la misma frase del mismo catálogo.
- El escáner volvió a pasar por la página completa hasta no encontrar ni un literal con forma de frase sin traducir. Lo que se queda en inglés se queda a propósito y está declarado: los nombres de la nave (MU/TH/UR, ASH, RIPLEY, GHOST, CREATE, AIRLOCK), `ON`/`OFF`, `HELP` —que es un comando que se teclea— y todo lo que imprime un CLI por su cuenta.

### Lo que MADRE escribió en otro idioma, dicho otra vez
- Las condiciones registradas son historia: cada una guarda la frase que MADRE escribió aquel día, y una sala que cambió de idioma las seguía enseñando en inglés. El ledger no se reescribe —eso sería falsificar el registro— pero **las palabras son solo cómo se lee**, así que ahora se vuelven a decir camino a la pantalla: «MADRE agotada: @claude lleva 99% de su presupuesto local de tokens de la sala… Sigue con @codex o @gemini.»
- Solo se vuelven a decir **las frases que MADRE escribe sobre sí misma**, y están declaradas una por una. Lo que imprimió un CLI se queda exactamente como lo imprimió —`API Error: 500`, un ENOTEMPTY de Node, una traza— porque ese texto no es de MADRE y quien lo lee puede necesitar buscarlo palabra por palabra.
- De paso quedaron en español las piezas que faltaban de esas mismas frases: el nivel del aviso (agotada · en crítico · en aviso), la conjunción entre agentes («@codex **o** @gemini», que un MADRE más viejo escribía en inglés), el STOPALL de la humana y el tiempo límite de un agente que no contestó.
- Y las salas viejas dicen `PULSE exhausted:` porque así se llamaba esto: al leerse se dice MADRE.

### Lo que seguía en inglés dentro de MU/TH/UR
- El panel entero: el canal de releases con su aviso y su interruptor, el centinela con sus reportes, el arranque («INTERFAZ 2037 LISTA PARA CONSULTA · TRIPULACIÓN: 5 AGENTES · 5 LISTOS»), las condiciones registradas, y los pliegues — `▸ ABRIR`, `▾ CERRAR`, `ABRIR TODO`.
- El **globo de cada esfera**, que era todo inglés: la ventana local, el límite del proveedor, los turnos, el último turno, el costo reportado, la sesión, la versión, y las cinco capacidades (lee · ve imágenes · crea · genera imágenes · web).
- Las cuentas de cada agente, que vienen del servidor: «Gratis y local con Ollama: sin cuenta, sin tokens. Contesta desde la memoria de la sala.»
- Y **lo que MADRE dice cuando algo se acaba o falla**: los avisos de límite, las interrupciones por reinicio y las explicaciones de los errores de Gemini. Eso se escribe en el ledger, así que lo que ya está registrado conserva las palabras con que se escribió; lo nuevo entra en español. Lo que imprime un CLI por su cuenta sigue siendo suyo y no se toca.
- **1,120 entradas.** Y el escáner que uso para revisar pasó a buscar cualquier literal con forma de frase, no solo los que están en las posiciones que yo esperaba: así fue como salieron estos.

### Las 51 condiciones de MU/TH/UR
- El último bloque grande: el título, el diagnóstico y el remedio de las cincuenta y una condiciones del catálogo. Unas cinco mil palabras, escritas en español, no traducidas — incluidas las largas de verdad: los cinco modos de permiso, cómo funciona la memoria de la sala, qué mide cada una de las tres pruebas, qué es una aberración y por qué una memoria está fría.
- **Lo que se lee va en español; lo que RECONOCE una falla no.** Los patrones de cada condición se prueban contra lo que imprimió un CLI, y un CLI imprime en inglés hable la sala lo que hable: se quedan exactamente como estaban. Los comandos de cada remedio tampoco se traducen: son comandos.
- Y se dice al momento de leerlas, no al importar el archivo: la tabla se arma cuando se carga el módulo y la sala aprende su idioma después. La búsqueda también busca en el idioma en que se lee, así que escribir «sesión» encuentra lo que antes solo encontraba «session».
- **1,003 entradas** en el catálogo. Con esto, la interfaz entera de MADRE —la sala, los paneles, el núcleo, los errores, el marcado y el catálogo de diagnóstico— está en español.

### El marcado entero, y los errores de la sala
- Quedaban **143 frases dentro de `index.html`** que ninguna tabla alcanzaba: los diálogos de MU/TH/UR y de NOSTROMO, la puerta con la designación, la anulación de mando, el recorrido de cuatro pasos, la ficha de cada memoria, ABRIR TODO y CERRAR TODO, OLVIDAR ESTA MEMORIA, la advertencia de MOTHER. Estaban ahí porque la lista de selectores que las traducía se quedó corta el día que alguien agregó un diálogo.
- Así que ya no hay lista: la página **recorre su propio marcado** una vez, antes del primer pintado, y pasa por el catálogo cada nodo de texto y cada `title`, `placeholder` y `aria-label`. Lo que el catálogo no conoce vuelve como estaba, así que los comandos dentro de `<code>`, el nombre del proyecto y los nombres de la nave no necesitan excepción: simplemente no están ahí.
- Y una prueba recorre `index.html` y exige que cada frase visible esté traducida o esté en la lista de las que no se traducen —MADRE, MU/TH/UR, NOSTROMO, CREATE, `madre doctor`—. Una lista de selectores se pudre; esto no.
- Los **40 errores que el servidor contesta** también hablan español: «No existe esa memoria.», «Hay un turno corriendo en esta conversación.», «CODE000. EL ARCHIVO ESTÁ SELLADO.»
- 850 entradas en el catálogo.

### El hilo, y lo que quedaba suelto
- La conversación entera: quién habla y en qué modo, lo que cuesta un turno mientras se escribe, las memorias que se usaron y las que se guardaron, los relevos entre agentes, los planes, CONTROL con su checkpoint y su DESHACER, los avisos de límite, las alertas de MU/TH/UR a toda la tripulación y el final del registro.
- Y lo que seguía en inglés en MODULES y CONNECTIONS, que era bastante: EYECAT con sus tres apartados, la economía de la sala, el cerebro local, el SDK, la purga de privacidad con sus dos guardas, el menú de modelos, el visor de archivos, el diálogo de anulación, MU/TH/UR con su diagnóstico y su remedio, la tarjeta de cada memoria en NOSTROMO, el canal de releases y el centinela.
- El catálogo va en **673 entradas** y la página ya no tiene ni una frase que llegue a pantalla sin pasar por él. Lo comprueba un escáner que busca texto en las posiciones donde vive el texto —`el(tag, clase, …)`, `.title`, `.textContent`, `toast(…)`, `field(…)`— y hoy no encuentra nada.

### Las lecturas de la sala, en español
- El veredicto, las seis señales de madurez y lo que dice cada prueba al terminar estaban armadas con plantillas dentro de `maturity.mjs`, `verdict.mjs` y `exam.mjs`. Ahora están escritas con ranuras y pasan por el mismo catálogo: «CUÁNTO SE USA · a 58 de 71 memorias se les ha echado mano al menos una vez», «Contesta las 6 preguntas que la sala se escribió sola», «En 10 de 12 preguntas reales el modelo local aterrizó donde aterrizó el agente de aquel día».
- **Y una lectura guardada se vuelve a decir.** Los resultados de las pruebas viven junto a la memoria, con la frase que tenían el día que corrieron; una sala que cambió de idioma los seguía enseñando en el idioma viejo. Los números son lo que se midió y la frase es solo cómo se dice, así que se rearma ahora, con los campos que quedaron guardados. Lo que se guardó antes de esto conserva su frase.
- La tabla de etapas —EMPTY, SPARSE, FORMING, WORKING, MATURE— guarda el inglés y se traduce al leerse, no al importarse: esa lista se arma cuando se carga el archivo, y la sala aprende su idioma después.

### CONNECTIONS y NOSTROMO, en español
- ⚙ CONNECTIONS entero: las fichas de cada agente con su sesión, sus permisos (GENERAR IMÁGENES, ACCESO A LA WEB), el MODO MÁXIMO y el MODO INICIAL con lo que significa cada uno; los ajustes de la sala; la memoria con su archivista, su destilación y sus embeddings; la tarjeta de entrenamiento paso por paso; y la privacidad con sus términos y su purga.
- NOSTROMO: la leyenda de estrellas —ENANA AMARILLA, ENANA BLANCA, ENANA VERDE, ENANA AZUL, COLAPSADA—, el subtítulo que cuenta memorias, enlaces y lo que hay detrás, el panel de preguntas que la sala se escribe sola, y las tres pruebas con lo que mide cada una.
- **Y la voz de MOTHER.** Eso no se tradujo, se escribió: «ESTOY VIVA.», «ESE ES MI CORAZÓN LO QUE ESTÁS TOCANDO.», «LA TRIPULACIÓN ES PRESCINDIBLE. LA MEMORIA NO.», «NADIE BORRA LA MEMORIA DE MOTHER.» Y cuando caen las rejas: «CODE000 · ORDEN ESPECIAL 937 EN VIGOR. EL ARCHIVO ESTÁ SELLADO. SAL DE MI NAVE, INTRUSO.»
- Tres variables locales se llamaban `t` y le hacían sombra a `t()` —la función con la que habla toda la página—. Ahora se llaman por lo que son (`elapsed`, `clock`, `info`). Una de ellas estaba dentro de la tarjeta de entrenamiento: ahí el español habría reventado la pantalla entera en vez de salir en inglés.
- Lo que falta del panel: las **lecturas que calcula el servidor** —el veredicto, las seis señales de madurez y lo que dice cada prueba al terminar— siguen en inglés. Están armadas con plantillas dentro de `maturity.mjs`, `verdict.mjs` y `exam.mjs`, así que no son frases que un catálogo pueda alcanzar; hay que reescribirlas con ranuras, como se hizo con los módulos. Es la siguiente pieza y es una pieza limpia.

### MODULES, en español — y el catálogo cruza al servidor
- Las fichas completas: el estado de cada módulo, **QUÉ TOCA** con lo que ESCRIBE y lo que NECESITA, **COMANDOS**, **AJUSTES**, y los botones — INSTALAR, CONFIRMAR INSTALACIÓN, ACTUALIZAR A…, TRAER UN ARCHIVO MÁS NUEVO.
- Lo que un módulo dice de sí mismo vive **dentro del módulo, en inglés**, y ahora se traduce en la frontera: `describeModules()` pasa la ficha por el catálogo antes de mandarla a la pantalla. Ni un archivo de módulo cambió de idioma, y lo que un módulo le entrega a un agente sigue exactamente igual.
- Para eso el catálogo cruzó al servidor: `src/i18n.mjs` importa **el mismo `public/es.js`**. Un solo archivo para todo el producto, porque una frase que sale en una ficha y en un aviso no se puede traducir dos veces y quedar distinta. La prueba de cobertura ahora recorre los dos lados del cable.
- `ON` y `OFF` se quedan como están. La misma palabra es el interruptor de una ficha y el estado de una dirección de salida; traducirla la partiría en dos según dónde aparezca, y en una interfaz en español ON/OFF se lee sin fricción.
- Y las pruebas leen MADRE **en el idioma en que está escrita**, decidido en un solo lugar: `PULSE_LANGUAGE`, que gana sobre el archivo de configuración como todo lo demás aquí. Afirman qué es un módulo, qué hace una sala y qué significa una lectura — no cómo está redactado— así que no se mueven cada vez que el español mejora. El español tiene sus propias pruebas: la cobertura del catálogo y la prueba de humo de la página, que arranca en español a propósito.

### El core, en español
- Las cuatro pestañas y todo lo que hay detrás: EL DOCUMENTO con sus bloques y su peso, LO QUE CARGA, EL LANZAMIENTO con lo que mantiene la corrida dentro del turno, LO QUE SALIÓ DE ESTA COMPUTADORA con sus direcciones y su registro, y la consola de MU/TH/UR entera —las once consultas, sus respuestas y las tres negativas—.
- Los nombres de los bloques del briefing **no se traducen**: `room`, `who`, `privacy`, `memories`. Son ids del prompt que el agente lee en inglés; traducirlos en pantalla sería enseñar un documento que no existe.
- `SPECIAL ORDER 937` contesta en español lo mismo que contestaba en inglés, que es lo único que este producto puede contestar: «no hay ninguna orden que no puedas leer».
- La consola vive en su propio módulo y ahora habla por el mismo catálogo que la página, así que la prueba de cobertura recorre los dos archivos. Y las pruebas de la consola se leen en el idioma fuente a propósito: son sobre qué consulta contesta qué, no sobre cómo está redactado.
- Una frase que sale igual en los dos idiomas ya no reprueba la revisión: LOCAL es LOCAL. La regla quedó en lo que importa — de dos palabras en adelante, el español tiene que ser español.

### La primera hora, en español
- El puente entero —«Con un agente basta para abrir la sala»—, los estados de cada tarjeta (NO INSTALADO, SIN FIRMAR, LISTO), la entrada gratis, pegar la llave y la línea que dice que nada se instala sin que tú lo aprietes.
- La barra completa por sus títulos, el estado de la conexión (conectando · en vivo · reconectando), el compositor con sus botones y su línea de seguridad, quién habla delante del campo (HUMANA ›, TRIPULACIÓN · PRESCINDIBLE ›) y las tres primeras preguntas que la sala te ofrece cuando la página está en blanco.
- Los nombres de la nave no se traducen y no se van a traducir: MU/TH/UR, NOSTROMO, CODE000, GHOST, EXCHANGE, CREATE, CONTROL, AIRLOCK, ash. Son nombres, no etiquetas.
- El marcado sigue siendo la fuente en inglés: `index.html` guarda la frase y la página la cambia una vez antes del primer pintado. Nada de ids que mantener en fila con las pantallas, y un elemento que ya no exista simplemente se salta — el marcado y la lista pueden estar en desacuerdo sin que nada se rompa.
- Y la prueba de humo ya no comprueba una sala en inglés: arranca en el idioma que MADRE habla, así que la tubería entera —marcado inglés, catálogo, pantalla en español— se prueba sobre una página renderizada y no solo sobre el diccionario.

### MADRE habla español, y el inglés está a un botón
- La plomería, no la traducción: el idioma vive en `~/.pulse/config.json`, el español es el valor por defecto y en la barra hay un botón que dice **EN** — lo aprietas y la interfaz vuelve en inglés, diciendo **ES**. Recarga en vez de traducir a medias: media pantalla en cada idioma es peor que cualquiera de las dos.
- **La clave es la frase en inglés**, tal como está escrita en el código. No hay ids que inventar ni que mantener en fila con las pantallas, y una frase que todavía nadie tradujo **sale en inglés entera** en lugar de dejar un hueco o un `MISSING_KEY_47`. Lo que varía dentro de una frase viaja como ranura con nombre, `{n} bloques`, para que el español lo ponga donde el español lo pone.
- Lo que ya es *data* —el catálogo de MU/TH/UR, las consultas de la consola, las direcciones de egress— no se traduce clave por clave: lleva su tabla en español al lado, elegida entera. Traducir una tabla palabra por palabra pierde la tabla.
- Y una prueba la cuida **en los dos sentidos**: una clave que el producto ya no dice es la traducción de algo que nadie lee, y un `t()` que el catálogo no tiene es una pantalla en el idioma equivocado. La segunda no rompe nada —cae en inglés—, que es justamente por qué necesita prueba. Ya cazó dos entradas muertas mientras se escribía.
- Esta fase traduce trece frases —el compositor y lo que hace cada modo de permiso— para probar la tubería de punta a punta. El resto llega por pantallas, empezando por la primera hora de uso.

### La tripulación escribe en tu idioma
- Nadie se lo había dicho nunca. Los agentes contestaban en español solo porque tú escribes en español y un modelo imita lo que lee — que es una costumbre, no una regla, y se rompe justo en los turnos que llevan más inglés alrededor: un paso delegado, un plan, una sala llena de rutas.
- Ahora el bloque `style` del briefing lo dice: escribe en el idioma en que escribe la humana, y **deja el código, las rutas, los comandos y los identificadores exactamente como están**. Esto es un cuarto para trabajar sobre código.
- Va dentro del bloque que ya existía: ningún bloque nuevo, ningún id nuevo, nada que el core lea distinto. Y está en la cabecera estable del prompt, así que son los mismos bytes en cada turno y no le cuesta nada a la caché.

### Cómo te enteras de que tu modelo local ya sirve
- Que Ollama esté corriendo no es la pregunta. La sala ya tenía la respuesta buena —la tercera prueba le hace al modelo local doce preguntas reales de esta sala y mide si aterrizó donde aterrizó la tripulación, contra un control para que «hablar del mismo tema» no cuente— pero vivía en un panel al que había que volver. Nadie te lo decía.
- Ahora la sala lo dice, **una vez por modelo**, donde ya estás leyendo: `local · @madre · qwen2.5:7b` y, debajo, o bien «nadie lo ha medido contra este proyecto todavía: correr aquí no es lo mismo que servir aquí» con un botón **CHECK IT AGAINST THIS ROOM**, o bien el resultado que ya existía. La prueba tarda minutos y **no gasta un centavo**: todo corre en tu máquina.
- Cuando termina, la respuesta cae en la sala, no en un panel: «contestó 10 de 12 preguntas reales de esta sala donde las contestó la tripulación. Está listo para trabajarse», con el único siguiente paso al lado — mandarle el próximo turno. Y si no pasa lo dice igual de claro: «no todavía; sigue trabajando, el archivo se llena donde ocurre el trabajo». Una prueba que no puede fallar no mide nada.
- Y MU/TH/UR sabe contestarlo cuando lo preguntas con tus palabras —«¿ya sirve mi modelo local?»—: qué mide la prueba, por qué se mide contra un control, y que un modelo que no pasa no está roto, es el archivo que todavía está delgado. Cincuenta y una condiciones.
- Se dice por sí sola y no depende de la línea de tripulación, que solo se emite cuando la tripulación *cambia*: una sala que abrió con Ollama ya encendido jamás se habría enterado. Y la esfera de `@madre` guarda la lectura con su fecha, para cuando el anuncio ya pasó.

### Los tokens del core son una estimación, y lo dicen
- El core convertía el peso del documento con la tasa que la sala mide, y esa tasa no es un tokenizador: es **cuánto de lo que te facturaron lo escribió MADRE**. Los CLIs cobran además su propio system prompt, sus herramientas y cada archivo que abren en el turno, así que en una sala real la razón cayó a 0.62 y el core llamó «23,155 tokens» a un briefing de 14,356 caracteres — seis veces de más.
- Ahora estima a **3.5 caracteres por token** y lo escribe así: `≈4,100 TOKENS · ESTIMATED AT 3.5 CH/TOKEN, NOT MEASURED: MADRE DOES NOT HAVE THE PROVIDER'S TOKENIZER`. 3.5 y no 4 porque el briefing mezcla prosa inglesa, código y memorias en el idioma en que se trabaja la sala; de las dos maneras de equivocarse, decir que un turno cuesta un poco más de lo que cuesta es la inofensiva.
- El mismo error estaba inflando **TOKENS SAVED**: lo que la sala decidió no mandar se convertía con esa razón, así que el ahorro que MADRE se apuntaba a sí misma salía multiplicado. Ahora usa la estimación declarada. Una prueba fija que la página y la sala estimen al mismo número, y que el ahorro ya no viaje sobre lo medido.
- Y lo medido no se tira: sigue en ECONOMY, con el nombre de lo que es — «MADRE escribió 175,404 caracteres de los 281,333 tokens de entrada que te cobraron; el resto es lo que los CLIs leyeron por su cuenta». Esa diferencia es justamente lo útil que ese número tenía que decir.
- El core, además, abre con una petición en vez de dos: ya no necesita preguntar por la economía para saber lo que pesa.

### El core se ordena: cuatro paneles y un prompt
- Había cuatro cosas que ver ahí dentro y eran un solo scroll: el documento, el comando que lo entrega, lo que salió de esta computadora y MU/TH/UR contestando. Quien buscaba una tenía que pasar por encima de las otras tres. Ahora el marco **es una terminal**: cuatro paneles, uno a la vez, y el prompt siempre abajo. Cada pestaña dice qué hay detrás —`17 BLOCKS · 14,356 CH · ~3,600 TOKENS`, `@claude · 19 ARGS`, `8 ADDRESSES · 5 ON`— así que nadie abre un panel para averiguar si tiene algo.
- Y está maquetado como imprime la terminal con la que este cuarto está vestido: `==>` encima de cada sección, los nombres en una columna y los números en otra, nada dicho dos veces. Los dos párrafos densos en mayúsculas que explicaban la ventana ahora son cuatro filas de `clave · valor`. Los bloques son una lista de paquetes —signo, nombre, peso, barra y la razón por la que está ahí— en vez de un muro.
- El prompt no es un piso más: **es el camino por los cuatro paneles**. Pedir `LAUNCH`, `BLOCKS` o `EGRESS` abre ese panel en vez de imprimirlo por segunda vez; todo lo demás se contesta en el panel de MU/TH/UR. La consola y los paneles dejaron de ser dos maneras de trabajar.
- La tira de arriba —a quién va, en qué modo, y la pregunta alrededor de la cual se arma todo— es de una línea por cosa y ya no compite con el documento. Lo que tecleas sigue sobreviviendo a cada reconstrucción, porque lo que se rehace son los paneles.
- Las barras de peso de cada bloque se llamaban `bar`, que es el nombre de la barra superior de la sala: heredaban su relleno de 32 px, su borde inferior y su `width: var(--column)`. Por eso se veían como cajas altas y estrechas y por eso el panel entero se iba de lado. Ahora se llaman `weigh`, son anchas de verdad, y nada dentro de un panel puede empujar el marco a lo ancho.
- Y el core entero se prueba ahora en un DOM de juguete: se abre, se llenan los cuatro paneles, se pregunta y se cuenta un intento fallido. Es la pantalla más construida de la página y hasta hoy ninguna prueba se habría enterado de que reventaba.

### La alerta de MOTHER tiene casa
- La maquinaria estaba entera y sin enganchar desde que el núcleo pasó a ser la puerta de entrada. Ya contesta a lo que tenía que contestar: **una designación equivocada**. Dos puertas en esta sala preguntan quién eres antes de hacer algo que no se deshace —abordar NOSTROMO y purgar cada término privado ya registrado— y equivocarse en ese nombre nunca es parte de trabajar: o sabes en qué proyecto estás parado o estás probando nombres. La primera es un encogimiento de hombros; la octava es CODE000, con el archivo sellado diez minutos y la tripulación avisada en clave.
- La ventana es de cinco minutos y no de treinta segundos, porque un nombre se teclea, no se hace clic. Y MU/TH/UR contesta donde se hizo la pregunta: en la puerta, sobre la constelación o en la sala.
- Tocar el core **no** es eso y nunca cuenta. Leer lo que la sala dice en tu nombre no es un atentado contra nada; es la puerta de entrada.
- MU/TH/UR sabe explicar las dos cosas: qué es una designación y por qué se selló el archivo —no se perdió nada, el sello es una negativa a cambiar el archivo durante diez minutos y se levanta solo— y qué es la consola del core cuando se cierra a la tercera.

### La consola dentro del core
- El core ya tenía todo lo que una respuesta necesita —el documento del próximo turno, el comando que lo entregaría, lo que salió de esta computadora— y aun así una persona con una pregunta tenía que encontrar el piso que la contesta. Ahora el marco **pregunta**: MU/TH/UR 6000 contesta desde lo que ya está en la sala. `BLOCKS` lista los bloques con su peso, `READ MEMORIES` imprime uno palabra por palabra, `LAUNCH` el comando, `EGRESS` las direcciones, `WINDOW` lo que carga y lo que deja atrás, `WEIGHT` lo que cuesta, `CREW` quién está y hasta dónde llega, `PRIVACY` cuántos términos protege, `STATUS` dónde está el archivo y qué hacer al respecto.
- **Contesta o dice que no puede.** Tres consultas que no puede interpretar y el marco se cierra — es la máquina que es. Y es justa: el contador está en pantalla desde la primera, cada negativa dice qué sí habría aceptado, y volver a abrir el core empieza de cero. No pasa nada más: leer lo que la sala dice en tu nombre no es un atentado contra el archivo.
- Nada se manda desde ahí y nada se le pide a la tripulación. Toda respuesta se arma con lo que la página ya tiene; solo dos —el veredicto y la cuenta de privacidad— van por su dato cuando se las pide, para que abrir el core siga siendo una sola petición.
- De los términos que la sala protege **solo cruzan a la consola el número y el marcador**. Las palabras nunca entran ahí, así que no hay nada que se pueda imprimir por accidente.
- Y sí, contesta `SPECIAL ORDER 937`: «no hay ninguna orden que no puedas leer». Es literalmente cierto —cada instrucción que este cuarto carga está arriba, bloque por bloque— y es la diferencia entre esta nave y la otra.

### Lo que salió de esta computadora
- «MADRE corre en tu máquina y lo que sabe vive en un archivo tuyo» vale exactamente lo que valga la lista que matiza esa frase. Ahora la lista está dentro del core, debajo del documento: **WHAT LEFT THIS MACHINE**, ocho direcciones, cada una diciendo qué lleva, cuándo sale y dónde se apaga. El briefing, que va a quien opere el agente al que le mandaste el turno; los embeddings de Gemini, que llevan **el texto de tus memorias**; el modelo de imagen, que lleva el prompt que escribió un agente; el registro de npm y GitHub, que reciben un nombre de paquete y nada más; el recolector de errores, que recibe una condición redactada y solo con tu clic; y Anthropic, para leer cuánto queda de tu plan. Ollama está en la lista precisamente para que se vea que se queda aquí.
- Debajo de la lista está **el registro**, que es lo que convierte la lista en algo comprobable en vez de una promesa: cada petición que hizo este proceso, con a dónde fue y cuándo. Las de MADRE y las de cualquier módulo, porque un módulo corre dentro de este proceso y no puede salirse del envoltorio por el que pasa todo `fetch`. Una dirección que nadie declara aparece señalada como exactamente eso.
- **Nunca se escribe un cuerpo, un encabezado ni el valor de un parámetro** — solo qué parámetros venían. La dirección de embeddings de Gemini lleva la llave en la URL, y un registro de lo que salió de tu computadora sería un pésimo lugar para dejarla.
- El Image Studio corre en su propio proceso, así que escribe su propia línea en el mismo archivo: la única petición que lleva palabras de alguien a Google habría sido justo la que el registro no podía ver.
- Y la lista no se degrada sola: una prueba recorre todo el código y exige que cada dirección que aparezca ahí esté declarada arriba —con lo que envía y dónde se apaga— o listada como lo que MADRE solo le enseña a una persona para que haga clic. No hay una tercera categoría.

### MU/TH/UR sabe explicar lo que la sala aprendió a hacer
- El catálogo ofrecía remedios para tres sistemas y solo dos se prueban. Los comandos de Windows nunca los corrió nadie aquí, y un comando que nadie ha corrido es peor que ninguno: el selector deja macOS y Linux, y cada condición contesta en los dos. La cabecera del pliegue dice para qué shell está escrito lo que estás leyendo.
- Y siete condiciones nuevas, una por cada cosa que la sala aprendió a hacer y MU/TH/UR todavía no sabía contestar: qué es una conversación y por qué solo una maneja a la tripulación; qué hace una aberración con la nota que refuta; por qué debajo de una respuesta dice «1 by association»; qué significa que un recuerdo esté frío; qué miden las tres pruebas y por qué se miden contra un control; cómo se actualiza lo que un módulo maneja —incluido el `EACCES` de npm, que se arregla con un prefijo tuyo y no con `sudo`—; y las tres razones por las que un módulo ajeno puede ser rechazado.

### La tripulación vive en MU/TH/UR, y una sola puerta lleva a ella
- `⚑ CREW` cerraba el panel y se apoderaba del lienzo con una página escrita en la paleta de la página: tarjetas blancas en un producto cuyos ajustes son todos fósforo, y un segundo lugar para hacer lo que `⚙ CONNECTIONS` ya hacía —instalar un agente, firmarlo, pegar su llave— a tres líneas de los modos y permisos de esos mismos agentes.
- No hubo que construir nada: la superficie ya existía y estaba siendo tapada. La sección de conexiones ahora lleva la única frase por la que el puente existía —basta un agente para abrir la sala— y cada tarjeta ya traía estado real, versión, cuenta, `INSTALL`, `SIGN IN`, la llave, los scopes y el techo de modo.
- Y como `⚑ CREW` terminaba abriendo CONNECTIONS, era un segundo botón para una sola cosa: se fue. Un segundo botón para lo mismo es una pregunta que la humana tiene que contestar sin motivo.
- El puente conserva el único trabajo que solo él puede hacer: una sala sin nadie dentro, donde no hay otra cosa que mostrar. Lo que lo dejaba clavado abierto sobre una sala con tripulación se fue con él.

### Varias conversaciones sobre el mismo proyecto
- Un proyecto tiene una memoria y muchas conversaciones. El archivo, la tripulación, los módulos y la privacidad son del proyecto y no empiezan de cero porque abras otro hilo; una conversación es solo el registro de una línea de trabajo, y todo lo que se dice en cualquiera alimenta el mismo archivo.
- El panel está a la izquierda del lienzo y es el mismo panel que el de archivos, en el borde contrario: una sola forma que aprender. Arriba, NEW CONVERSATION; abajo, las recientes con lo último que se dijo y cuándo. Su manija vive en el lienzo, debajo de la barra, donde empieza la conversación que abre.
- Nada se mueve en disco para que esto exista: la primera conversación es el `events.jsonl` que siempre estuvo ahí, y una sala que ya existía abre como siempre y solo gana un nombre. El nombre lo toma de lo primero que dijiste en ella.
- La numeración es del proyecto, no del hilo. Una conversación nueva arranca donde llegó el proyecto, así que `#1411` sigue significando un intercambio de este proyecto y las citas, el índice de memoria y NOSTROMO siguen valiendo entre conversaciones.
- Borrar una se lleva su transcripción y nada más: lo que el archivista destiló de ella es memoria del proyecto y se queda. La última no se puede borrar, y borrar pide dos veces.
- Una conversación a la vez maneja a la tripulación: dos hilos editando el mismo árbol de trabajo no es una función, es una forma de perder trabajo. Abrir otra mientras corre un turno se niega con un motivo.
- Y una sala por proyecto, dicho por la sala misma. El aviso del CLI solo miraba ocho puertos; una sala abierta en un puerto lejano se le escapaba, y dos servidores sobre el mismo proyecto repartirían la misma secuencia dos veces. Ahora la sala lleva su pid y su puerto en disco, y el segundo arranque se niega diciendo dónde está la abierta —y que dentro de ella puede abrir otra conversación—.

### Una sola frase, una sola cosa que hacer
- MU/TH/UR llegó a mostrar seis lecturas, tres pruebas, una etapa, los recuerdos fríos y las preguntas pendientes. Todo cierto y todo medido, pero nueve números en una pantalla no son un veredicto: son tarea. Arriba del todo hay ahora una frase y una instrucción, y el resto vive a un pliegue de distancia.
- El orden de lo que se dice no lo decide el puntaje, lo decide qué conviene hacer primero: algo falso que la sala crea gana a algo que la sala aún no aprendió, y los dos le ganan a cualquier cosa sobre tamaño. Y la instrucción dice a dónde ir: hoy, en esta sala, manda a NOSTROMO · ASK porque el archivo no contesta 18 de 30 preguntas y las preguntas que faltan ya están escritas.
- La prueba que no cuesta nada ya no se pide: se lee. La que cuesta unos segundos se mantiene fresca sola una vez al día, en segundo plano y solo con embeddings locales —dinero de la humana no se gasta sin preguntar—. La lenta sigue siendo suya, con su botón y su STOP.

### La memoria se ve cuando se usa
- Debajo de cada respuesta aparece qué le entregó el archivo a ese turno: `◉ memory used · 4`, con las notas en su color y un clic para verlas en NOSTROMO. Hasta ahora recordar era completamente invisible —una nota entraba al briefing y nadie la veía nunca—, y es lo único que la sala hace que de verdad justifica todo lo demás.
- Es la misma forma que «memory saved», más callada, para que haya una cosa que aprender y no dos. Lo que llegó por asociación lo dice con `⇢`: algo que cambia una respuesta no puede ser invisible.

### Un puerto ocupado se dice de inmediato
- `madre start --port <ocupado>` tardaba todo el arranque —encontrar los agentes, abrir el archivo, despertar la memoria— para recién entonces negarse. Ahora se pregunta primero y contesta al instante, con el mismo mensaje de siempre. El bind real sigue siendo la autoridad; esto solo quita la espera.

### Madurez: las tres pruebas
- La lectura de seis señales cuenta de qué está hecho el archivo. No dice si funciona: nada en un montón de notas dice si la correcta vuelve cuando hace falta. Eso solo lo dice una prueba, y una prueba solo vale si puede fallar. En MU/TH/UR, debajo del veredicto, hay tres.
- **¿Puede el archivo contestar lo que este proyecto pregunta?** Preguntas reales de la sala, el recall corrido en el punto exacto en que cada una se hizo, contra la respuesta que de verdad se dio. Pregunta si el archivo ya tenía con qué, no si la respuesta era correcta.
- **¿Se contradice el archivo?** Contradicciones que EYECAT sigue sosteniendo, lo que quedó fuera de circulación, y si las aberraciones se archivan más seguido últimamente que antes.
- **¿Aterriza el modelo local donde aterrizaron los agentes?** Preguntas reales que contestó una CLI de frontera, vueltas a hacer al modelo local con este archivo detrás. Tarda minutos, no gasta un peso, corre en segundo plano y se detiene cuando quieras.
- Las tres se miden contra un control, y eso fue necesario: la primera corrida de COVERAGE dio treinta de treinta. Dentro de una sala todo habla de lo mismo, así que a un embedder cualquier par de textos le parece cercano. Para contar, lo que el archivo entregó tiene que ganarle a lo que habría entregado para otra pregunta. Con el control, esta sala pasó de 100 % a 40 %, que es un número que sí quiere decir algo.

### NOSTROMO: la sala escribe las preguntas que le faltan
- La lectura de madurez decía dónde está flaco el archivo; no decía qué hacer al respecto un martes por la tarde. Ahora sí. `ASK · N` en la cabecera abre una lista corta de preguntas escritas desde lo que el archivo ya tiene, palabra por palabra, sin inventar un tema que nadie levantó.
- Tres pozos, porque hay tres tipos de hueco: las preguntas que el archivista registró como abiertas y nadie volvió a tocar —el archivo diciendo en voz alta lo que no sabe—; los recuerdos fríos, donde preguntar es la alternativa honesta a tirar algo que nunca tuvo su oportunidad; y la clase de nota de la que el archivo anda corto, que ninguna cantidad de uso arregla sola. De preguntas no se pide más: un archivo corto de preguntas quiere respuestas.
- Se toman por turnos, así que un pozo lleno no puede ser la lista entera: seis variaciones del mismo recuerdo frío no son un plan, son un bucle. Y dos formas de preguntar lo mismo cuentan como una —incluida la que el archivista escribe en una segunda pasada, idéntica pero más larga—.
- Nada se envía ni se gasta. Cada pregunta trae de dónde salió, un botón que la pone en el compositor para que tú elijas quién la responde (@madre no cuesta nada), otro para ver el recuerdo que la levantó, y uno para no volver a verla.

### NOSTROMO: las zonas frías del archivo
- Un recuerdo está frío cuando se cumplen tres cosas a la vez: ningún turno lo ha llevado nunca, no comparte tema con ningún otro, y el archivo se abrió lo suficiente desde que se escribió como para que haya tenido sus oportunidades. La tercera es la que hace honesta a la etiqueta: nunca-recordado es lo que toda nota es el día que nace. Frío es la oportunidad que pasó de largo doce veces.
- Las oportunidades se cuentan en turnos que de verdad entraron al archivo —son las únicas que existieron— y solo desde el día en que la sala empezó a llevar el rastro. Lo que la sala no anotó no se le cobra a la nota.
- En la cabecera de NOSTROMO aparece `COLD · N` cuando hay alguna; al pulsarlo, cada una queda rodeada por un anillo tenue de polvo. El resto del mapa no se apaga: estas ya son lo más apagado que hay ahí afuera, y bajarle a todo lo demás para encontrarlas sería apagar el mapa para verlo.
- Al abrir una, su tarjeta lo dice con número —cuántas veces se abrió el archivo sin que fuera la respuesta— y el botón de olvidar está a un clic. Nada se borra solo.

### Memoria: recall por activación en cascada
- El recall buscaba por palabras y por significado. Ahora también por lo que la sala ha hecho: cada recuerdo que entra a un turno deja constancia del lote que compartió, y dos notas que llegan una y otra vez al mismo turno quedan asociadas aunque no compartan una sola palabra. Al recordar una, viene la otra.
- Es una red asociativa de verdad, con sus pesos escritos por el trabajo real de la sala y no por la opinión de un modelo. La fuerza es un cociente —de los turnos donde apareció cualquiera de las dos, cuántos las trajeron juntas—, así que un recuerdo que la sala usa a todas horas no termina pegado a todo, y una pareja que deja de coincidir se apaga sola.
- La regla que la hace honesta: solo cuentan los turnos donde la búsqueda encontró cada nota por mérito propio. Una nota que llegó por cascada nunca es la evidencia de la siguiente cascada. Sin eso, en unos días la red se cierra sobre sí misma y se carga a sí misma.
- La asociación suma, nunca desplaza: el recall reserva dos huecos para ella y le devuelve los que no use, y no gasta un carácter fuera del presupuesto del turno. Lo falso y lo refutado tampoco entran por ahí: la puerta es la misma en los dos caminos.
- En la tarjeta de NOSTROMO, la compañía lo bastante fuerte para viajar sola queda marcada con `⇢`. Y en MU/TH/UR hay un interruptor, porque es la única parte del recall que no le debe nada a cómo está escrito un recuerdo.

### NOSTROMO: abrir un recuerdo y ver con quién habla
- La tarjeta de un recuerdo —o de una aberración— ya no es una ficha muerta. Debajo de lo que dice trae sus enlaces: los mismos cables que el mapa dibuja, en una lista ordenada por fuerza, con el color de cada estrella y su porcentaje de significado compartido. Pasar el cursor por un renglón enciende ese cable allá afuera; hacer clic salta a ese recuerdo, así que la red se puede caminar.
- Y trae lo que de verdad ha pasado entre ese recuerdo y la sala: cuántas veces MADRE lo ha ido a buscar, cuándo fue la última, qué agentes lo pidieron, y —lo importante— con qué otros recuerdos viaja. Dos memorias que llegan una y otra vez al mismo turno están conversando, aunque no se parezcan en nada; eso antes no se sabía porque nadie lo anotaba. Ahora cada recuerdo que entra a un turno deja un renglón con el lote que compartió.
- La lectura sigue viva mientras la tarjeta está abierta: cada evento de la sala la empuja y un latido lento cubre el silencio, de modo que ves el contador subir cuando un turno se lleva ese recuerdo. La estrella en el mapa se aclara con él.
- En una aberración se ve desde el otro lado: qué nota tumbó. Y en una nota tumbada, qué aberración la tiene fuera de circulación. De paso se arregló algo feo: olvidar una aberración dejaba a su nota marcada por un id que ya no existía, es decir, fuera de todos los turnos para siempre y sin manera de volver. Ahora vuelve.
- Los contadores viejos son reales, pero la compañía que tuvieron nunca se anotó. La tarjeta lo dice con todas sus letras en vez de mostrar una lista vacía como si el recuerdo siempre hubiera viajado solo.

### MODULES: una sola forma para todas las fichas, y una versión que no miente
- Cada tarjeta tiene ahora los mismos pisos y en el mismo orden, sea el módulo que sea: quién es (nombre, estado, versión y actualización), qué hace, qué toca, sus ajustes, y al final —solo y siempre en el mismo lugar— el botón. Cada piso tiene su propio aire y una línea que lo separa del siguiente. El ojo aprende la forma una vez y encuentra el interruptor en todas.
- Los pisos son parte del SDK, no del dibujo: un módulo declara y MADRE arma la ficha. Los ajustes también, con `controls` —un selector, un interruptor, un campo— que MADRE pinta y guarda en el bloque del módulo en `config.json`, y `onSettings` para que algo vivo se entere. Con eso PLAYWRIGHT perdió su ruta hecha a mano y cualquier módulo que escribas tiene su propio apartado de ajustes sin escribir una línea de interfaz.
- El texto estaba apretado en unas tarjetas y suelto en otras: la tarjeta era una rejilla que se estiraba, así que el alto sobrante de la más alta de la fila se repartía entre sus propias filas. Ahora se apila desde arriba y el sobrante queda abajo, donde no molesta.
- La etiqueta de estado parecía un botón. Es una palabra y un punto: `ON` u `OFF`. Y un módulo apagado se atenúa entero, menos el botón que lo enciende.
- El botón está en el piso de la tarjeta, no donde se acabó el texto: las tarjetas de una fila miden lo mismo, así que los botones quedan alineados en el borde de abajo. El registro de una instalación pasó arriba del botón, que sigue siendo lo último.
- Los bullets se fueron a su propia sección plegada, con su número y su botón de abrir y cerrar, y se escribieron más cortos: una idea por línea. Los resúmenes bajaron a una frase; lo que sobraba de ellos bajó a los bullets, que es donde se lee.
- La versión ya no se escribe a mano. Ash se rehízo entero y seguía diciendo 1.0.0 porque el número vivía en el archivo. Un módulo que viene con MADRE no tiene versión propia: viaja en el release, y eso es lo que muestra. Un instalador dice la versión del paquete que fija. Un módulo tuyo conserva la que declare, y si no declara ninguna, la tarjeta muestra el día en que escribiste el archivo, que es la única verdad que hay en disco. Al pasar el cursor, cada una dice de dónde salió.
- Los números de la economía se leían encimados con sus etiquetas: iban en el blanco de la página, con el resplandor del panel encima, en una fila que se apretaba. Ahora cada cifra y su nombre son una celda de una rejilla, en fósforo y sin resplandor.
- Lo que un módulo sabe de sí mismo vive dentro de su tarjeta: la economía en la de Ash, el cerebro local y sus roles en la de OLLAMA, el modelo de imagen en la de Image Studio, y el navegador de PLAYWRIGHT —que hasta ahora solo se podía cambiar a mano en `config.json`—.
- La tarjeta de OLLAMA decía «START it here» e «INSTALL it here» sin tener ese botón. Ya lo tiene.
- Las versiones dicen la verdad y hay dos clases de módulo. Los que vienen con MADRE tienen la suya, escrita en su archivo y empezando en `1.0.0`; no pueden actualizarse solos, llegan en un release, así que su botón pregunta por MADRE. Los que envuelven algo de fuera —PLAYWRIGHT, OLLAMA, AHP+— no tienen versión propia que valga la pena: muestran la de esa cosa, encontrada en esta computadora. Lo que no está instalado no es una versión: la ficha dice `NOT INSTALLED` o `INSTALLS 1.4.1` en vez de inventar un número.
- Junto a la versión hay un botón `↻` en cada ficha. Abre MODULES y lee lo que ya estaba en caché —nunca espera a un registro—; el botón es para mirar ahora. Y MADRE mira sola: después de servir la pantalla, una vez por hora como mucho, y cada consulta con su propia caché de un día. Sale solo el nombre de lo que se pregunta, y solo mientras el canal de releases esté encendido.
- En el SDK esto es una sola declaración: `tracks: { name, npm }` o `tracks: { name, github }`. Con eso MADRE sabe de dónde sale la versión de tu módulo y dónde buscar la siguiente.
- Detectando de verdad apareció una mentira vieja: PLAYWRIGHT decía `@playwright/mcp 11.16.0 found` en una computadora donde ese paquete nunca se instaló. Preguntaba `npx --no @playwright/mcp --version`, y npx, cuando el paquete no existe, contesta con la versión de npm y sale con código 0. Ahora la versión se lee del `package.json` del paquete —subiendo por `node_modules` desde el proyecto y luego en la raíz global—, sin ejecutar nada. En esta computadora PLAYWRIGHT ya dice lo que es: no está instalado, y que la más nueva es la 0.0.82.

### Privacidad: dos guardas que no necesitan que nadie las nombre
- Una llave, un token o un correo se reconocen por su forma en cualquier proyecto, y la ruta a una carpeta personal lleva el nombre de quien vive en ella. MADRE ya sabía taparlos, pero solo al exportar el dataset: una llave que un agente repetía en una respuesta se escribía en claro en el registro y ahí se quedaba. Ahora se tapan antes del registro, del archivista, de los demás agentes y del dataset.
- Las dos vienen encendidas. Nadie debería tener que enterarse de que existen para estar cubierto, y quien quiera un registro literal las apaga.
- Se arreglaron dos cosas rotas de esa pantalla: el campo de términos privados nunca recibió color, así que lo que escribías ahí era invisible sobre el fondo del panel; y peleaba una celda con el marcador, en tres líneas de ancho. Ahora ocupa el renglón completo.

### MU/TH/UR, más terminal
- El verde del panel es el del perfil Homebrew de Terminal.app. El anterior era un verde amarillento que se leía como decisión de diseño, no como terminal.
- Las insignias que repetían un número que la cabecera ya decía se fueron. Quedan dos, y las dos dicen algo que la cabecera no: cuántos agentes están sin firmar, y qué versión está esperando. Una marca que siempre está deja de ser una marca.
- Los campos para pegar una llave, y el selector de proveedor de OpenCode, se veían blancos y redondeados entre controles de terminal. Ese formulario vive en dos lugares, el puente sobre fondo claro y la tarjeta de conexión sobre negro, y llevaba la paleta de la página a los dos. Dentro del panel ahora se viste como el panel. Un `select` dentro de una tarjeta además nunca había entrado a la regla que dibuja los campos.
- En las tarjetas de conexión, el modo elegido lleva su propio color, el mismo que usa el compositor. Antes era fósforo para todos menos `#3`, así que una tarjeta parecía una advertencia y el resto ajustes, cuando los cinco son la misma clase de decisión.
- Y las filas de `MAX MODE` y `DEFAULT MODE` empiezan en el mismo punto. Cada una arrancaba donde terminaban sus propias palabras, que es por qué las tarjetas no cuadraban entre sí.


### Madurez: seis lecturas en vez de una barra inventada
- La barra que se llenaba hacia trescientos se fue. Ese número era una regla de dedo del paper de alguien más, no una medición de tu sala, y un corpus de trescientos pares que hablan todos de la misma tarde enseña menos que ochenta que no. Peor: llegabas al número y la barra decía que estabas listo.
- En su lugar hay seis lecturas de lo que sí se puede contar de este archivo: cuánto hay, cuánto de eso la sala realmente usa, qué tan tejido está, cuánto de él calificaste tú, cuánto es trabajo real y no preguntas de recuerdo, y qué tan al día está el destilado. Cada una dice en números dónde está y, al pasar el cursor, qué haría falta para subirla.
- Debajo, la más floja queda marcada y se convierte en el siguiente paso, con una frase de qué hacer en vez de un número que esperar. En esta sala hoy son las calificaciones: un par de ciento treinta y nueve.
- Una sala vacía se lee vacía. Antes una recién abierta ya marcaba progreso porque el balance salía perfecto cuando no había nada que balancear.

### NOSTROMO tiene cielo
- Detrás del núcleo, las enanas y la red hay ahora una nebulosa, y es el archivo mismo visto de tan lejos que se vuelve clima. Joven es una tormenta eléctrica: dispersa, fría, parpadeante, con rayos frecuentes. Conforme la sala crece se asienta, se junta en una banda y los rayos se vuelven raros y lentos. Lo que cambia con la madurez es el clima, no el volumen: una sala crecida truena menos, no más fuerte.
- Su única regla es que nunca es el tema. Se pinta antes que todo lo demás, en colores que nada del primer plano usa, y con un techo de opacidad escrito en el código que ningún grado de madurez puede levantar. Se nota solo si la buscas; si alguna vez le compite al núcleo, a las enanas o a los cables entre ellas, está mal por bonita que se vea.


### MU/TH/UR se pliega
- Todo lo que corre largo en el panel se pliega: `CONNECTIONS`, `ROOM SETTINGS`, `MEMORY`, `PRIVACY`, `SENTINEL` y el canal de liberación, todo por el mismo camino.
- Cada sección plegable lleva su propio botón que dice qué va a pasar al tocarlo: `▸ EXPAND` o `▾ COLLAPSE`. El panel ya tenía ese botón en dos listas desde antes; ahora todas pliegan por el mismo camino y se ven igual, en vez de que unas tuvieran botón y otras un signo.
- Las dos listas que ya se plegaban, condiciones registradas y condiciones conocidas, dejaron de armar su propia cabecera y pasaron al mismo ayudante. Lo que tuvieras guardado de antes se respeta: se lee una vez como estado inicial y de ahí en adelante lo recuerda el pliegue, sin dos lugares acordándose de lo mismo.
- Un botón `EXPAND ALL` en la cabecera abre o cierra el panel entero. Dice lo que va a hacer, no lo que el panel es: mientras quede algo cerrado abre todo, y cuando todo está abierto se convierte en `COLLAPSE ALL`. No aparece si no hay al menos dos secciones que mover.
- Los comandos de entrenamiento no se veían. Estaban dibujados con el color de texto de la página, y sobre el fondo del panel eso es casi invisible; ahora van en fósforo como todo lo demás de ahí.
- Los pasos los numeraba el navegador al tamaño del panel, y gritaban. Ahora son un índice discreto en el margen, y la nota de cierre dejó de contarse como un paso.
- Las dos primeras secciones que se plegaron fueron `CONNECTIONS` y el canal de liberación. El encabezado es el mismo de siempre y se hace clic sobre él; lo que abre va adentro.
- El canal de liberación no anuncia nada en su título. Cuando hay versión nueva lleva una marca roja y nada más, y lo que significa está adentro. Las marcas que no son urgentes no son rojas, para que el rojo siga queriendo decir algo: `CONNECTIONS` lleva un conteo en gris cuando algún agente no está firmado.
- Si dejaste una sección abierta, se queda abierta la próxima vez. Un panel que olvida es uno con el que peleas cada vez que lo abres. Un navegador que no deja guardar nada simplemente abre en cerrado, sin romperse.
- El checkbox del canal de liberación estaba unos píxeles adentro respecto al párrafo de arriba, por un margen propio del navegador, así que la columna no se leía derecha. Ya alinea.


### El turno dice lo que está gastando mientras lo gasta
- Mientras un agente trabaja, la fila de "pensando" muestra lo que ese turno está leyendo. El tamaño es exacto, porque el prompt ya está armado cuando se anuncia; lo único estimado es la conversión a tokens, y se hace al ritmo que los turnos de esta misma sala han mostrado. Una sala a la que nunca le han cobrado no inventa un ritmo: muestra caracteres y dice que todavía no tiene con qué convertirlos.
- Cada cuenta le enseña a la sala lo que cuestan sus propias palabras, así que el ritmo se ajusta solo, con las últimas veinte cuentas y no con la historia entera: una sala que cambió de modelo no debería seguir cotizándose por lo que era antes.
- Y la cuenta sube mientras el agente escribe. Lo que se cuenta es la respuesta misma, no el protocolo alrededor: contar la salida cruda sería contar la forma del formato de cada CLI, que en Codex pesa varias veces más que el texto. Una CLI que no dice nada hasta terminar no muestra nada ahí, que es la verdad y no un número inventado para que algo se mueva.
- Cuando el agente responde, la estimación se reemplaza por lo que su CLI cobró de verdad, y esa cifra se queda arriba de la burbuja, en una sola línea y sin píldora, con lo leído, lo escrito y lo que se ahorró por venir del caché. Así se puede comparar lo que la sala calculó contra lo que pasó.
- La lectura en vivo no se escribe en el registro. Es un medidor, no un hecho de la sala: guardarlo gastaría un número de secuencia en algo que nadie va a recordar y correría de lugar todo lo dicho después. Va a quien esté mirando y a ningún otro lado.

### Ash: el compresor se retira y queda la economía
- AshCode reescribía tu mensaje antes de mandarlo. Se retiró: alteraba lo único que nadie le pidió tocar, perdía información, y medido contra un turno real ahorraba una quinta parte de un uno por ciento. Ya no existe. Nada de lo que escribes se altera, ni lo que responde un agente, así que tampoco hay un "original" guardado al lado de una abreviación.
- Ash es ahora el nombre de la economía de tokens de la sala. Casi toda está siempre encendida y no se nota, porque nada de eso pierde información. Lo único que queda por decidir es lo que cambia cómo responde un agente, no lo que se le pide: si pedirle prosa compacta. La salida es la mitad cara de una cuenta, así que ese es el interruptor que vale la pena tener, y es tuyo.
- El interruptor dejó de ser beta y dejó de pedir confirmación: ya no hay nada que pueda cambiar de significado.
- ORDER 937 queda libre. Ya no le pertenece a Ash ni aparece en su botón, su etiqueta ni su aviso; se reserva para otra cosa.
- La lectura vive en la tarjeta de Ash, en `⚙ CONNECTIONS` → `MODULES`, que es donde uno la busca. Lo primero que dice es **TOKENS SAVED**: lo que la CLI recuperó de su propio caché en vez de volver a cobrarlo, más lo que la sala nunca mandó porque el turno no lo necesitaba. Lo primero es una medición, la CLI misma lo reporta; lo segundo se cuenta en caracteres, que es la unidad que la sala controla, y se convierte a tokens al ritmo que los turnos de esta sala hayan mostrado, no a uno inventado. Debajo, lo gastado de entrada y de salida, qué parte de cada prompt es la cabeza que un caché puede reconocer, y una barra por bloque del briefing.

### Ahorro de tokens medido, no supuesto
- MADRE razonaba el costo en caracteres, y una cadena más corta no son menos tokens. Las CLIs llevaban todo este tiempo reportando lo que de verdad gastan, lecturas de caché incluidas, así que la sala dejó de adivinar. Cada turno fuera de GHOST registra de qué estuvo hecho contra lo que se cobró: el tamaño de cada bloque, lo fijo que se paga siempre, lo que la forma de ese turno cargó, y los tokens de entrada, de caché y de salida. Las palabras nunca se escriben, solo cuántas fueron.
- El prompt se arma con bloques con nombre. Al introducirlos no se movió un solo byte: siete formas de turno quedaron congeladas como fixture y se comparan exactas, porque cualquier cambio a la economía de un prompt tiene que probar que no cambió nada de lo que el agente lee.
- Lo que nunca cambia va primero. El encabezado de cada prompt es ahora la parte que se lee igual en cada turno de ese agente en esa sala, y todo lo que puede variar quedó detrás, por corto que sea: un byte distinto temprano tira a la basura todo lo que venga después. Entre un turno `#1` y uno `#2` del mismo agente ahora hay 1,690 caracteres idénticos al principio contra unos 120 de antes, que es lo que la CLI puede recuperar de su propio caché en vez de que se lo vuelvan a cobrar.
- El bloque que explica cómo escribir un módulo dejó de viajar en todo turno con permiso de escritura. Es largo y solo sirve cuando alguien está pidiendo un módulo, así que ahora se manda cuando el mensaje lo menciona, en español o en inglés. Un turno `#2` que no era sobre módulos bajó 11%.
- La transcripción dejó de deslizarse y quedó anclada. Una ventana deslizante empieza un mensaje más adelante en cada turno, así que lo que el agente lee arranca con palabras distintas cada vez y nada de eso se puede recuperar de lo que leyó el turno pasado. Anclada, todo menos la cola son los mismos bytes que antes, que es la diferencia entre pagarla una vez y pagarla siempre. Solo se mueve cuando lo dicho desde entonces ya no cabe, y cuando se mueve suelta un buen tramo de golpe para no tener que moverse otra vez al turno siguiente. En una réplica de cuarenta turnos de esta sala, el inicio de la transcripción se movió una vez en vez de cinco.
- `GET /api/economy` lee todos los turnos juntos: qué bloque cuesta más, qué gasta cada agente, cuánto volvió de caché, cuánto del prompt era recuperable, y cuántos caracteres manda la sala por cada token que le cobran.


### El compositor y la barra, más tranquilos
- Arrobar a un agente ya no lo mete en una píldora. Una mención es una palabra de la frase que estás escribiendo, no un campo por llenar: conserva el color del agente y pierde la caja, que rompía el ritmo al releer la línea.
- Lo que estás respondiendo vive dentro de la caja de texto, en su propio renglón arriba de la línea donde escribes, en un badge tenue: dos puntos más chico que lo que tecleas, recortado a dos líneas y a ciento veinte caracteres. Salió del textarea, donde todo comparte un solo tamaño y solo podía parecer algo que tú habías escrito.
- Y la caja crece para sostenerlo. La cita toma un renglón entero, así que la caja se alarga exactamente lo que ella mide y te deja un par de líneas para contestar con calma, en vez de una sola apretada. Se puede quitar con una equis sin perder lo que llevas escrito, y sigue saliendo al frente del mensaje, porque el agente necesita ver qué estás contestando.
- En modo claro los botones de la barra superior brillan apenas. Un halo que se lee como luz sobre fondo oscuro se lee como mancha sobre uno pálido; el borde y el color ya dicen que el botón está vivo.


### EYECAT: el vigía que pregunta si la sala sigue creyendo lo que escribió
- No es un módulo ni parte de la sala. Vigila desde afuera, igual que el sentinel de errores: se suscribe al registro, no toma turno, no escribe archivos y no tiene permisos. Lo que produce es una pregunta para ti, nunca una entrada en el archivo.
- La independencia es todo el diseño. Una afirmación nunca la juzga quien la escribió, ni quien escribió aquello con lo que choca. Al juez se le entregan las dos frases y nada más: sin transcripción, sin historia del proyecto y sin nombres, así que no se le puede decir a quién creerle ni se le puede discutir. Si los únicos libres son los dos autores, el caso espera en vez de ir a alguien con interés en la respuesta.
- Dos etapas, para que preguntar salga barato. Primero un filtro determinista sobre los vínculos que la constelación ya calcula: un vínculo dice que dos notas hablan de lo mismo, y EYECAT hace la siguiente pregunta, si además se contradicen. Solo pasan las que dan una señal barata de que podrían no coincidir: una negación de más, un orden invertido, un número distinto, una ruta distinta. Funciona en español y en inglés.
- El segundo detector busca notas que sus propias citas no sostienen. Si casi nada de lo que hace distintiva a una nota aparece en los intercambios que dice haber leído, o se inventó o se destiló de otro lado.
- Corre entre turnos, cuando el archivo acaba de cambiar, y no responde a ninguna otra cosa: nada de lo que diga un agente lo alcanza. Como máximo tres casos por barrida, para que un archivo grande no levante una cuenta.
- Cada hallazgo llega como tarjeta en la sala con la afirmación en duda, contra qué choca, qué parece ser cierto y quién lo juzgó. Dos respuestas: ES FALSA la archiva como aberración y saca de circulación la memoria que refuta; SE SOSTIENE dice que la sala tenía razón. Cualquiera de las dos cierra ese par para siempre, y el registro lo recuerda entre reinicios.
- Un veredicto mal formado, o con menos de la mitad de confianza, no es un hallazgo: el caso se queda pendiente para ti en vez de gastarte la atención.
- `PULSE_EYECAT=0` lo apaga.

### ABERRACIÓN: lo que la sala estableció que es falso
- Un quinto tipo de memoria, y el único que no es conocimiento: alucinaciones, afirmaciones sin fundamento, distorsiones, refutaciones y memorias que se desviaron de lo que el proyecto había acordado. Se guarda porque vale para entrenar en contra, y se guarda fuera de cada turno porque una sala que recuerda sus propias alucinaciones las repite.
- Una aberración puede señalar la nota que refuta. Cuando lo hace, esa nota deja de circular: no se reescribe lo que dijo, se le quita el paso. Es reversible, cosa que una edición no sería, y desmarcarla la devuelve intacta.
- Dos puertas al turno, dos candados. Ni una aberración ni una nota refutada entran por la búsqueda por palabras, por la búsqueda por significado, ni por el respaldo que entrega decisiones recientes cuando una búsqueda encuentra poco.
- El destilador aprendió a reconocerlas, pero solo cuando la conversación misma refutó algo en voz alta: alguien afirmó y alguien corrigió. Nunca por sospecha, nunca por desacuerdo de opinión, nunca por algo simplemente no verificado. La aberración lleva la afirmación falsa y, aparte, lo que resultó ser cierto.
- Un tipo que nadie reconoce ya no se archiva como hecho, se descarta. Era inofensivo mientras todos los tipos eran conocimiento; con uno en la lista que no lo es, un dedazo en cualquier dirección metía una alucinación donde la sala confía.
- Las aberraciones dejaron de poder entrenar al modelo local como algo que recordar. Entrenan al revés: cada una sale como par de preferencia, con la misma pregunta, la afirmación falsa como lo que hay que evitar y la corrección como lo que hay que decir. Un negativo solo enseña poco; un par dice cuál de dos respuestas preferir, que es lo que leen DPO y ORPO. Va en `preferences.jsonl`, aparte, para que nada que lea los archivos de chat lo levante por accidente.
- El contador de listos tampoco las cuenta: nunca serán una respuesta que el modelo aprenda a dar, y contarlas diría que la sala está más adelante de lo que está.
- En NOSTROMO una aberración no es una enana ni un horno. Es un vacío: un redondo negro de lado a lado, y ahí no arde nada. Lo que se ve alrededor es el campo en el que está parado, motas de polvo y estrellas lejanas repartidas en ángulo áureo para que no se formen hileras, cada una parpadeando a su ritmo y apagándose hacia afuera, y pegada al borde la luz que pasó lo bastante cerca como para doblarse en vez de seguir derecho. El grueso de la cosa es la oscuridad, y la oscuridad es el punto.
- Las preferencias dejaron de ser enanas rojas y pasaron a enanas verdes. Misma forma y mismo trato, otro color: en rojo competían con el sol que orbitan.


### NOSTROMO: la sala se ve viva
- El núcleo de MADRE es una estrella: grande, oscura e imponente. Se alumbra sola, así que no tiene lado de día ni lado de noche, y no está encendida de par en par: arde hondo y se apaga casi por completo en el borde. Lo que la hace temible no es cuánto brilla sino cuánto de ella está casi apagado.
- Su superficie es roca fundida moviéndose despacio. La piel se construye una sola vez como una tira de celdas hirviendo y se envuelve alrededor del cuerpo; una segunda pasada de la misma tira corre a otro ritmo, y ese desacuerdo entre las dos es lo que se lee como flujo. Encima, masas de materia fundida cruzan la cara al paso de la lava, cada una con su propia deriva.
- Ya no hay halo. Una nube suave alrededor de una estrella la hace ver más chica, no más grande. Lo que la rodea es oscuridad, con una sola piel de luz feroz agarrada al limbo que se apaga en una fracción de radio, y más allá una mancha roja tan tenue que se lee como oscuridad encendida.
- Cuatro prominencias, grandes y lentas: arcos de materia arrancados del limbo que se levantan y vuelven a caer. Una estrella de este tamaño no parpadea, se levanta.
- Se fue el filamento oscuro que cruzaba la cara. Una línea dibujada sobre una bola se lee como una línea dibujada sobre un disco, por más que se curve.

- Los recuerdos que la sala usa reciben más pulsos. La actividad se mide de verdad: cuántas veces se recuperó ese recuerdo en un turno, hace cuánto fue la última, y cuántos temas comparte con otros. Un recuerdo que nadie pide casi no se enciende.
- La constelación se lee contra sí misma: el recuerdo más activo es el más brillante y los demás se escalan debajo. Una sala recién abierta, donde todavía no se ha recuperado nada, se sostiene con los vínculos que ya tejió; en cuanto los turnos empiezan a pedir recuerdos, el uso manda.
- También hay pulsos entre recuerdos vinculados, sin pasar por el centro: dos notas que comparten un tema se hablan directo. Lo que se ve es la red que la sala fue tejiendo, no un abanico de radios.
- Los puntos que viajan por los cables, del núcleo a una memoria y entre memorias, se dibujan 30% más chicos. Un pulso es algo que pasa entre dos cuerpos, no un cuerpo: al tamaño que tenía se leía como otra estrella chica y le competía a las memorias hacia las que iba. Su halo encoge con él.
- Los recuerdos se dibujan 20% más chicos. Quedan como lunas alrededor del cuerpo de MADRE en vez de competirle, y como la separación entre ellos no se encogió, la constelación abre más aire.
- Los recuerdos arden como arden las estrellas, y el color de una estrella es su clase. Una decisión es una enana amarilla, la clase estable alrededor de la cual se construye un sistema. Un dato es una enana blanca: fría, densa, ya asentada. Una preferencia es una enana roja, tenue y personal y de vida larguísima. Una pregunta es una enana azul, lo más caliente del cielo y lo menos resuelto.
- Cada enana se alumbra sola, así que nada de ella está en sombra. Está encendida de orilla a orilla, su cara hierve completa, su limbo es lo más brillante que tiene en vez de lo más oscuro, y la luz que se le escapa se le queda pegada en un resplandor del ancho de un dedo. No hay lado vuelto de espaldas a nada, porque nada más la está alumbrando: el suelo del cuerpo se traza desde su propio centro, no desde una esquina.
- Cada enana tiene la superficie hirviendo de una estrella de verdad, en el color de su clase. Se construye una tira por clase la primera vez que se pide esa clase, y todas las memorias de esa clase la usan: un archivo de cuatrocientos recuerdos paga cuatro pieles, no cuatrocientas.
- Se fueron los halos que colgaban de cada recuerdo. Una nube pegada a una estrella la vuelve una mancha con una cuenta en medio; la luz que escapa de una enana se le pega al limbo, y ahí es donde se dibuja.
- Cuánto arde una enana lo deciden dos cosas. La madurez es lo que la sala ha hecho de ella con el tiempo: cuántas veces la ha buscado, hace cuánto, qué tan tejida está. El alimento es lo que le están dando ahora mismo, MADRE y sus vecinas a la vez. Una memoria joven que nadie alimenta está casi apagada; una vieja en la que la sala se apoya corre blanca.
- No se dibuja nada alrededor de un recuerdo. Un contorno, por delgado que sea, es lo único que impide que una bola se lea como bola, y el anillo que salía cuando le llegaba un pulso también era un contorno. Que llegó un pulso lo dice el cuerpo aclarándose, que ya lo hacía.
- Se fueron las motas que se desprendían de cada enana.
- La leyenda de NOSTROMO muestra la estrella, no una muestra de color. Cada chip trae una enana dibujada con el mismo suelo, la misma cara hirviendo y el mismo limbo que las de la constelación, y al lado solo el tipo de recuerdo: la estrella ya dice de qué clase es, escribirlo además lo diría dos veces. El nombre de la clase queda al pasar el cursor. Sin píldora que las encierre, y con la tipografía de la cabecera.
- La intensidad de cada estrella dice qué tan alimentada está. Cada recuerdo lleva una carga que sube con cada pulso que le llega, del núcleo o de sus vecinos, y baja despacio cuando nadie lo alimenta. Un recuerdo hambriento es un cuerpo frío que solo encuentra la luz de MADRE; uno bien alimentado arde por su cuenta y ya no la necesita para verse. Su halo crece, su centro corre hacia el blanco y su propia noche se le quema encima.
- Los vínculos son cable con corriente. El que sale del núcleo lleva el rojo de MADRE y va cambiando de manos hasta llegar vestido del color de la estrella que alimenta. El que va entre dos recuerdos toma el color del que tenga más cerca, así que sale como una estrella y llega como la otra.
- Y por cada cable corre una banda angosta de calor blanco que viaja de un extremo al otro y vuelve a empezar, más rápida y más brillante mientras más carga lleve ese vínculo. Entre dos recuerdos la corriente corre como corre de verdad: sale del más lleno y entra al más vacío.

- Y cada uno respira a su propio ritmo: una micro pulsación, lo bastante chica para no leerse nunca como un destello y nunca al compás de sus vecinos.
- La tarjeta de cada recuerdo dice cuántas veces se ha recuperado y cuándo fue la última, y el encabezado cuenta cuántos están vivos.
- Misma imagen, menos máquina: la vista dejó de recalcular la constelación en cada cuadro y de pedir desenfoques al navegador. Un archivo con cuatrocientos recuerdos cuesta los mismos desenfoques que uno con doce, y son diez por cuadro en vez de noventa.
- Con movimiento reducido el halo se queda quieto: las gotas dejan de subir y de derivar, y la sala sigue dibujándose completa.

### El puente: alta completa sin terminal
- Las partes que asumían un sistema tipo Unix dejaron de asumirlo: la detección reconoce las extensiones ejecutables de Windows, los instaladores se lanzan con el intérprete que toca y el reinicio usa el de cada sistema.
- El agente local también se atiende desde el puente. Ollama no es un paquete de npm, así que la tarjeta ofrece el paso que toca según el sistema y con el comando a la vista: instalarlo, despertarlo, o descargar el modelo con el que responderá. Donde MADRE no tiene forma honesta de instalarlo, entrega la descarga en vez de inventar un comando. Es el único camino sin cuenta ni tarjeta, y el que enciende la memoria local.
- Si `npm install -g` choca con las carpetas del sistema, MADRE no pide contraseña: lo dice, instala en una carpeta suya (`~/.pulse/tools`) y busca ahí además de en el `PATH`. El aviso final dice dónde quedó.
- Gemini y OpenCode, que se firman desde su propio prompt, aceptan ahora su llave en el puente y en `⚙ CONNECTIONS`. MADRE la escribe donde ese CLI la busca, con el archivo cerrado a su dueño, y no guarda copia: ni en `config.json`, ni en el registro de la sala, ni en un log. Lo único que la sala recuerda es que se puso una llave y para qué proveedor. Solo se acepta desde esta computadora, nunca por red.
- Cada escritura se verifica en el acto preguntándole al propio CLI si ya está firmado; si dice que no, MADRE devuelve los archivos como estaban y lo explica, en lugar de dejar una credencial a medias.
- Cada tarjeta dice qué hay detrás de esa puerta: con qué cuenta se firma ese agente y si hay una entrada sin pagar, con una marca `FREE WAY IN` donde la hay. La misma línea aparece en `⚙ CONNECTIONS`.
- El puente se puede volver a abrir en cualquier momento desde `⚑ CREW`, en la cabecera de MU/TH/UR, para sumar otro agente sin salir de la sala.
- Correr el comando otra vez sobre un proyecto que ya tiene sala abierta deja de levantar una segunda: MADRE reconoce la que ya está escuchando y te lleva a ella.
- La sala vacía deja de ser una página en blanco: tres primeras frases, escritas con el nombre del proyecto, que llenan el campo de texto al tocarlas.
- `madre start` ya no secuestra el arranque: la sala abre siempre, con agentes o sin ellos, y el asistente de terminal queda para quien lo pida (`madre setup`, o `madre start --setup`).
- Sin nadie en línea, la sala abre en el PUENTE: una tarjeta por agente con su estado real y la única acción que le toca. `INSTALL` corre el comando en tu máquina, a la vista y transmitido línea a línea a esa misma tarjeta; `SIGN IN` lanza el login del propio CLI para Codex y Claude Code, con su enlace; Gemini y OpenCode muestran el comando de su prompt. Los mismos botones viven ahora en `⚙ CONNECTIONS`.
- La sala vuelve a buscar los binarios cuando termina una instalación y cuando pulsas `RECHECK`: un CLI instalado desde la UX aparece en la fila sin reiniciar, y las páginas abiertas se enteran con `agents.updated`. El compositor se desbloquea solo en cuanto un agente queda listo.

### Primer contacto y la puerta para desarrollar
- La sala se construye a sí misma: en `#2` o más, un agente que escribe `<id>.module.mjs` en su borrador hace aparecer una tarjeta `module · @codex wrote …` con `INSTALL FOR EVERY ROOM` e `INSTALL FOR THIS PROJECT`. MADRE valida el archivo en una copia y lo copia a la carpeta elegida; los agentes nunca escriben ahí. Los módulos tuyos llevan la etiqueta `DEV` y se quitan con `REMOVE`; los integrados solo se apagan. Rutas de módulos externos solo bajo `/api/x/<id>/`, para que ninguno suplante una ruta del núcleo.
- Un recorrido de cuatro pasos la primera vez que se abre la sala: la sala y sus agentes, los modos, la memoria, MU/TH/UR y MODULES. Se puede saltar y vuelve desde un `?` discreto en la cabecera de MU/TH/UR.
- Módulos de terceros de verdad: un archivo `.mjs` con `export default { … }` en `~/.pulse/modules/` (todas las salas) o en `<proyecto>/.madre/modules/` (ese proyecto) aparece en MODULES con su interruptor, sin build ni registro; `RELOAD MODULES` lo recarga sin reiniciar y muestra el error exacto si no carga. Los agentes no pueden escribir en esas carpetas. El SDK gana `slash` (comandos `/nombre` que corren con el `ctx` del módulo y caen en la sala como tarjeta), `@jossuealcala/madre/sdk` como export del paquete, la guía `docs/SDK.md` y `docs/sdk/hello-module.mjs`, un módulo completo para copiar o darle a una IA.
- MODULES tiene la tarjeta `</>` "Would you like to develop for MADRE?" con las carpetas, la guía y RELOAD.

## 0.3.3 · 2026-09-19

### El SDK entrega herramientas a los turnos, y PLAYWRIGHT es el primero en usarlo
- `defineModule` acepta `toolsForTurn(ctx, turn)`: un módulo encendido devuelve servidores MCP (`name, command, args, env, tools, brief`) y MADRE los adjunta a la CLI de ese turno, en su corrida aislada, en Codex, Claude Code, Gemini CLI y OpenCode, y se los describe al agente en el briefing. Un módulo que falla no entrega nada y nunca rompe el turno. Image Studio y la memoria conservan su cableado propio; los módulos nuevos nacen sobre el gancho.
- Módulo **PLAYWRIGHT**: un navegador headless por turno, `@playwright/mcp` aislado, con orígenes permitidos solo en la dirección de esta MADRE. Los agentes abren la vista previa de RIPLEY, hacen clic, leen consola y red y guardan capturas en la carpeta de borrador del turno. Requiere `npm install -g @playwright/mcp` y un navegador de Playwright; el módulo lo detecta y lo dice. Apagado en GHOST.
- Git Pulse gana la mano del humano: `/git commit "mensaje"` confirma todo el árbol en local, y `/git push` muestra qué saldría y solo envía con `/git push confirm`. Ningún agente puede escribir esos comandos por ti; los comandos corren en el servidor con tu propia sesión de git.

### #4 AIRLOCK: la compuerta
- Un cuarto modo, pedido desde una sala real por un agente que no podía desplegar en `#2`. AIRLOCK es CONTROL más comandos: pruebas, builds, `git commit` y `git push`, deploys con las CLIs y las sesiones que ya viven en la máquina. Los archivos siguen bajo checkpoint y `UNDO`; lo que sale de la nave no vuelve, y por eso la anulación pide dos llaves: la designación del proyecto y la palabra `AIRLOCK`. Un titular a la vez, como CONTROL.
- Cada CLI recibe su herramienta de comandos solo en `#4`: Codex `--sandbox danger-full-access`, Claude Code `Bash`, Gemini `run_shell_command`, OpenCode `bash`. Las zonas prohibidas siguen bloqueadas. El briefing exige decir en una línea qué va a salir y adónde antes de que salga, y cerrar con los comandos corridos y lo que dejó la máquina.
- `MAX MODE` llega a `#4` en CONNECTIONS; un orquestador en `#4` puede dar `#4` a un paso (`@opencode #4: despliega a preview`). Color propio, hielo, en chip, campo, menú y badges. MU/TH/UR reconoce "modo producción" y "permiso para ejecutar comandos" como peticiones de `#4`.

### Canal de liberación, un clic
- `RESTART WITH x.y.z` en MU/TH/UR: la sala registra `room.updating`, cierra su puerto, instala la versión según cómo corre esta copia (npx, dependencia del proyecto o global) y vuelve a abrir en la misma dirección; la página espera y se recarga sola. Con agentes trabajando se niega hasta que terminen. Desde el código fuente sigue siendo `git pull`.
- La primera vez que aparece una versión nueva en la sesión, un aviso de MU/TH/UR lo dice; la alerta de la barra deja de brillar y respirar: línea ámbar fina, relleno suave, transiciones de 220 ms. Todos los controles de MADRE cambian de color con la misma curva; nada salta.

## 0.3.2 · 2026-09-19

### Modos y permisos, una sola lógica
- `#2 CREATE` ya no encierra al agente en `.pulse/out/`: crea archivos y carpetas nuevos donde corresponda en el proyecto, según sus convenciones, con `.pulse/out/<turno>/` como borrador. MADRE fotografía el proyecto antes del turno; lo que apareció se conserva y se muestra como artefacto, y todo archivo previo modificado, renombrado o borrado se restaura y se avisa (`create.reverted`). Las CLIs reciben sus herramientas de escritura sobre el proyecto (Claude Code y OpenCode solo escriben si también pueden editar, verificado con los CLIs reales); la garantía de "solo añadir" la da la restauración de MADRE al terminar.
- Un orquestador puede pedir el modo de cada paso de su plan: `@codex #2: …`, `@claude #3: …`. MADRE lo acota al modo del mensaje del humano y al `MAX MODE` del agente. Bajo `#3` la palabra del orquestador basta: un paso `#2` recibe su lease de proyecto y un paso `#3` toma CONTROL para su turno, con checkpoint propio. Bajo `#1` un paso `#2` sigue pasando por la escalación.
- CONNECTIONS se reduce a dos controles por agente, `MAX MODE` y `DEFAULT MODE` (`#1` o `#2`), más dos habilidades, imágenes y web. Los interruptores `CREATE FILES` y `ALWAYS · STANDING LEASE` desaparecen; las configuraciones viejas (`write: false`, `alwaysCreate`) se siguen leyendo como `MAX MODE #1` y `DEFAULT MODE #2`.
- Los checkpoints funcionan en proyectos sin git: MADRE usa un repositorio sombra propio fuera del proyecto, así `#2` y `#3` tienen la misma reversibilidad en cualquier carpeta.

### Permisos que sí se cumplen
- OpenCode nunca había podido escribir en CREATE ni en CONTROL: sus reglas de permiso se comparan con rutas relativas al proyecto, no absolutas, y crear un archivo es la herramienta `write`, distinta de `edit`. Verificado contra opencode 1.18.4 con proyectos reales, con y sin espacios en la ruta. Ahora CREATE permite `write` y `edit` solo dentro de la carpeta del turno, y CONTROL permite todo el proyecto menos `.git/`, `.pulse/`, `.madre/`, los `.env` y `.claude/settings.local.json`.
- El checkpoint de CONTROL fotografía también los repositorios git anidados dentro del proyecto (un monorepo de sitios, cada uno con su `.git`): antes un cambio dentro de uno de ellos era invisible, la sala decía "no cambió nada" y UNDO no lo deshacía. Ahora la lista de cambios, las zonas prohibidas y UNDO cubren cada repositorio, con rutas relativas al proyecto. La fotografía se toma con `ls-files` y no con `add`, así un repo anidado sin commits ya no la rompe.


## 0.3.1 · 2026-09-19

### Canal de liberación: la sala avisa cuando hay versión nueva
- MADRE consulta en npm la versión `latest` una vez al día (`~/.pulse/updates.json` como caché, compartida por todas las salas). Viaja el nombre del paquete y nada más, la misma petición que hace `npx`. Encendido por defecto; se apaga en MU/TH/UR → RELEASE CHANNEL o con `PULSE_UPDATE_CHECK=0`.
- Si hay versión nueva, una alerta ámbar en la barra, del mismo corte que STOP ALL, lo dice y MU/TH/UR muestra el comando exacto según cómo corre esta copia (npx, dependencia del proyecto, global o fuente), con botón de copiar y enlace a lo que trae la release. MADRE nunca se actualiza sola mientras trabajas. `madre doctor` imprime la misma línea. Los usuarios de 0.3.0 no reciben aviso: el canal nace aquí.

### Documentación
- README reescrito y reordenado: arranque, la sala, modos, qué puede cada agente, delegación, memoria, MADRE AI, MU/TH/UR, módulos, lo que sale de la máquina y referencia. Corrige lo que no coincidía: cinco agentes, imágenes con los cuatro CLIs (Codex nativo, los demás con Image Studio), versión actual. La profundidad técnica pasa a `docs/INTERNALS.md`, que también viaja en el paquete.

### Consola
- Elegir una condición desde el registro despliega la lista de condiciones conocidas aunque estuviera plegada, y lleva al remedio elegido.
- MU/TH/UR respira: cada bloque de una pantalla (CONNECTIONS, MEMORY, PRIVACY, SENTINEL, RELEASE CHANNEL) empieza con 40 px de aire y una línea tenue sobre su título.
- La barra es más ancha que el hilo: la raíz del proyecto se lee completa junto a MADRE, STOP ALL va en una línea. En MU/TH/UR la lista de condiciones conocidas se colapsa como la de condiciones registradas, y RELEASE CHANNEL viste como el resto del panel.

### Dataset limpio y valoraciones (hacia MADRE AI)
- El dataset ya no incluye las respuestas de `@madre` ni las enlatadas de MADRE, y sí incluye los pasos delegados agente→agente con su instrucción como pregunta (`kind: delegated`). En una sala real el corpus pasó de 88 a 118 pares sin escribir una línea más.
- Cada respuesta tiene dos botones nuevos junto a copiar y responder: bien y mal. Se guardan en el ledger como `message.rated`; el dataset excluye lo marcado mal y cuenta lo marcado bien. Un clic saca del corpus una alucinación.
- MEMORY muestra el contador en vivo "pares limpios / 300", con turnos, delegados, notas y valoraciones, sin exportar nada; y una tarjeta TRAIN con los cuatro comandos de la receta ya rellenados con la carpeta de la sala, el modelo base que cabe en esta máquina y el nombre `madre-<proyecto>` que `@madre` tomará al aparecer en Ollama. `docs/training/` viaja ahora en el paquete de npm.
- Cuando `@madre` corre el modelo entrenado del proyecto, el briefing de las CLIs lo dice y les pide preguntarle a él antes de gastar tokens propios en "qué decidimos" o "dónde quedamos".

### PRIVACY: términos que nunca viajan por la sala (ERROR-001)
- Una CLI corre con su propio contexto privado (instrucciones de organización, la cuenta con la que está firmada, CLAUDE.md de otras carpetas) y puede confundirlo con contexto compartido: en una sala real Claude escribió el nombre de la organización del humano, que nunca se había dicho en la sala, y de ahí pasó al ledger, al archivista y al dataset candidato. Cuatro saltos sin control.
- Nueva sección `⚙ CONNECTIONS → PRIVACY`: términos privados, uno por línea, y el marcador que los sustituye (`[ENTIDAD-ORG]` por defecto). MADRE los reemplaza en cada salto: en la respuesta de un agente antes de grabarla (la burbuja lleva una línea "privacy · @agente · n términos"), en el índice, en las notas del archivista y de `memory_note`, y en el dataset exportado. El humano no se reescribe; la sala solo avisa si su mensaje lleva un término. Los términos viven en `config.json` y en `PULSE_PRIVATE_TERMS`; el ledger solo registra cuántos.
- `PURGE ROOM`, tras la designación del proyecto, reescribe lo que la sala ya tiene, incluidos los mensajes del humano: ledger (mismas secuencias, en sitio y atómico), índice y memorias, conservando qué estaba destilado. La sección muestra cuánto queda expuesto antes y después.
- El briefing de toda CLI dice que su configuración es privada y que no traiga a la sala nada que venga de ahí. MU/TH/UR tiene la condición `privacy-leak`.

### @madre sabe quién es y convoca al crew
- Mesa redonda: «@madre, pregúntale al crew …» o «convoca al crew y …» abre un plan escrito por la sala, no por el modelo: un paso por agente CLI en línea con la pregunta del humano y un turno de cierre en el que `@madre` resume con citas `[#n]` sin inventar consenso. Solo el humano convoca; con la delegación apagada `@madre` explica cómo pedirlo.
- Respuestas locales sin modelo: «¿quién eres / qué haces / eres el archivista?» explica que `@madre` y el archivista son el mismo modelo local en dos papeles y cómo se le enseña; «genera / guarda / aprende … memoria» explica que la memoria se destila sola y, si quien pide es un agente, lo manda a `memory_note`; las órdenes de acción de un agente reciben una respuesta para agentes. Preguntas y turnos de cierre siempre llegan al modelo.
- Las respuestas enlatadas de `@madre` se marcan `synthetic`: no entran al archivo ni a la transcripción que `@madre` vuelve a leer, así un modelo pequeño ya no las repite como si fueran suyas. Las CLIs sí las ven.
- El briefing de las CLIs dice explícito que guardar es `memory_note` propio y que a `@madre` solo se le pregunta. El chip `TO @madre` ahora dice "memory · answers & asks the crew · never writes".

## 0.3.0 · 2026-09-18

### Ollama, la inteligencia local (roadmap 2a)
- Nuevo módulo `OLLAMA`: si Ollama corre en la máquina, los embeddings de la memoria se calculan localmente y la destilación la hace primero un modelo local, gratis y sin que nada salga. MODULES muestra servidor, modelos y roles, descarga los recomendados con `PULL` (progreso en la sala) y permite apagar cada rol o el módulo. Sin Ollama, todo sigue igual.
- El archivista local pide JSON estructurado y no cuenta contra ningún presupuesto de proveedor; el reporte `memory.distilled` dice `local`, modelo y tokens.
- Variables: `PULSE_EMBED_PROVIDER`, `PULSE_OLLAMA_HOST`, `PULSE_OLLAMA_MODEL`, `PULSE_OLLAMA_EMBED_MODEL`.

### CONTROL: prevención antes que restauración
- Mientras un agente tiene CONTROL, los `.env`, `.pulse/`, `.madre/` y `.claude/settings.local.json` quedan en solo lectura a nivel de sistema de archivos y recuperan sus permisos al terminar; el aviso lista qué se bloqueó. `.git/` sigue restaurándose desde el checkpoint después del turno.

### Núcleo
- `src/room.mjs` pasa de 1204 a 908 líneas: prompt, contexto, CONTROL, escalación, archivista, vectores, presupuesto, GHOST y adjuntos viven ahora en `src/room/`, cada uno con una responsabilidad. Mismo comportamiento, misma suite.

### Dataset y modelo del proyecto (roadmap 2c)
- `EXPORT DATASET` en MEMORY y `madre dataset` en terminal escriben `train.jsonl` / `valid.jsonl` junto al ledger: los turnos reales de la sala como pares de chat redactados, más las notas destiladas como pares de recuerdo. `docs/training/` trae la receta LoRA con mlx-lm, el `Modelfile` y `train.sh`. Un modelo registrado en Ollama como `madre-<proyecto>` lo toma `@madre` automáticamente.

### @madre, el quinto agente (roadmap 2b)
- Con Ollama y un modelo de chat, `@madre` entra a la sala: responde desde todo el archivo con citas `[#n]`, dice cuando algo nunca se discutió, nunca escribe ni delega, y sus tokens locales no cuentan. Los orquestadores pueden delegarle pasos de verificación. Entra y sale con Ollama (`agents.updated`); interruptor en MODULES → OLLAMA.
- El asistente de terminal y `madre doctor` muestran Ollama junto a las CLIs (servidor, modelo de chat, embeddings) y cuentan a `@madre` como agente en línea: con Ollama corriendo la sala abre aunque ninguna CLI tenga sesión, con el aviso de conectar una para trabajar en archivos.
- `@madre` ya no se confunde de identidad ni promete lo que no hace: la identidad se repite al final del briefing, cada llamada a Ollama pide una ventana de 8k tokens (la de 4k por defecto recortaba el prompt de sistema), las órdenes de acción (convocar, delegar, ejecutar, escribir) se contestan sin llamar al modelo señalando a los agentes CLI, y el chip `TO @madre` dice "memory · answers, does not act". Los modelos de chat generales (`qwen2.5`, `llama3.1`, `gemma3`) van antes que los `-coder`.
- README: seis módulos con OLLAMA y el SDK enlazado a CONTRIBUTING, enlaces absolutos para que npm los resuelva, estado real del adaptador de Claude (MCP de memoria), y bloque "Primeros cinco minutos" con el recorrido completo desde `npx` hasta conectar las IAs desde MU/TH/UR sin volver a la terminal.

### SDK de módulos
- `src/modules/sdk.mjs` con `defineModule`: un módulo es un archivo con sus ajustes en `config.json`, su descripción para MODULES, su interruptor, sus rutas y sus hooks. Los seis módulos (AHP+, Image Studio, Git Pulse, AshCode, RIPLEY, Ollama) viven en `src/modules/`; `extensions.mjs` queda como capa de compatibilidad y el servidor monta las rutas de los módulos de forma genérica.

### Memoria configurable desde MU/TH/UR
- Sección `MEMORY` en CONNECTIONS: archivista preferido, quiénes pueden destilar, cada cuántos intercambios o minutos de reposo, proveedor de embeddings y porcentaje de recall. Se guarda en `config.json` y se aplica en vivo.

## 0.2.3 · 2026-09-18

### RIPLEY navega
- El visor renderiza HTML como un navegador del proyecto: la página se sirve en `/preview/project/<ruta>`, sus scripts corren y sus rutas relativas a CSS, JS, imágenes y fuentes funcionan. El marco sigue sellado: sin origen propio, sin red, sin formularios, sin acceso a MADRE, y solo carga recursos del proyecto a través de MADRE. Antes los scripts estaban bloqueados y una página construida con JavaScript se veía vacía.
- Barra mínima en el visor: atrás y recargar, con la ruta y el título de la página en pantalla. Sin URL editable: RIPLEY es un visor del proyecto, no un navegador general.
- Recarga sola cuando un agente cambia la página abierta o algo de su carpeta, en CONTROL o en un lease.
- Los errores de la página se ven: un puente de una línea dentro del marco reenvía `window.onerror`, promesas rechazadas y recursos que no cargan; el visor los muestra en una franja con `ASK THE ROOM`, que deja el error y el archivo en el compositor.

## 0.2.2 · 2026-09-18

### Corrección crítica
- Claude Code negaba toda escritura en `#2 CREATE` y `#3 CONTROL`: las reglas `Write(/ruta/**)` se leían como relativas al proyecto. Ahora van como `//ruta/**`, la forma absoluta de Claude Code; las zonas prohibidas siguen bloqueadas antes del turno.

Reproducido con el CLI real en un repositorio temporal: con una barra el archivo quedaba bloqueado sin pregunta; con dos se escribe y `.env` sigue bloqueado. Sin otros cambios respecto a 0.2.1.

## 0.2.1 · 2026-09-18 · beta pública

Primera versión pensada para manos ajenas. Requiere Node 22.5 o superior.

### Monitoreo
- Sentinel de errores en MU/TH/UR: los fallos que ninguna condición conocida explica y las caídas del proceso se guardan como reportes redactados (sin rutas, nombres, correos ni claves), con `REPORT ON GITHUB ↗` prellenado y el botón `✎ FEEDBACK`. Con el colector del autor configurado por defecto, cada reporte tiene `SEND` y existe `AUTO-REPORT`, apagado hasta que el humano lo encienda. `docs/report-collector/` trae el Worker que convierte reportes en issues.

### Sala
- Copiar y responder al final de cada respuesta: el primero lleva el texto al portapapeles; el segundo elige qué agente responde y deja la cita al frente del compositor para la directiva del humano.
- Modo claro sin resplandor: la UX conserva sus colores y pierde el brillo de tubo; MU/TH/UR y NOSTROMO mantienen sus pantallas.
- Un archivista que falla se sienta media hora y el siguiente lote lo toma otro agente; la línea de fallo dice una sola frase y guarda el registro completo en el tooltip.
- MADRE no repite el mismo juego de frases dos veces seguidas al tocar su corazón.

### Verdad y seguridad
- La frase de arranque ya no dice que nada sale de la máquina: los agentes hablan con sus proveedores. El README explica el modelo de amenazas en corto, incluida la deuda de CONTROL con Codex (zonas prohibidas revertidas después del turno).
- El reloj de escalación mantiene vivo el proceso mientras un plan espera al humano; el apagado resuelve las peticiones pendientes. En Node 22 esto cortaba la suite a la mitad.

### Proyecto
- CI en GitHub Actions: Ubuntu y macOS, Node 22 y 24, con pruebas, empaquetado e instalación del tarball.
- Plantillas de issues, `SECURITY.md` y `CONTRIBUTING.md`.

## 0.2.0 · 2026-09-17

Requiere Node 22.5 o superior (antes 20): la memoria de la sala corre sobre `node:sqlite`.

### Modos de permiso
- Cuatro modos por mensaje: `#0 GHOST` (fuera del registro), `#1 EXCHANGE` (por defecto), `#2 CREATE` (lease en `.pulse/out/`) y `#3 CONTROL` (el proyecto mismo, con checkpoint de git, lista de cambios, zonas prohibidas revertidas y UNDO). Tope por agente (`MAX MODE`) en CONNECTIONS; `#3` exige el override con la designación del proyecto y se puede subir el tope desde el propio menú.
- Escalación con reloj: un paso de plan que quiere crear archivos pide permiso al humano (GRANT ONCE, GRANT FOR PLAN, DENY; el silencio niega).
- Paleta por modo en el chip, el campo y el botón de envío; GHOST desintegra el campo y lo recompone punteado; CONTROL lo baña con lluvia binaria roja.

### Memoria de la sala
- Todo lo dicho fuera de GHOST se indexa en `memory.sqlite` junto al event log. Cuando la conversación excede la ventana, cada turno recibe además las citas exactas que coinciden con la petición (`<memory>`) dentro del mismo presupuesto (`PULSE_RECALL_SHARE`).
- Destilación: el agente más barato disponible resume los intercambios más recientes en notas durables (decisión, hecho, preferencia, pregunta) cada `PULSE_DISTILL_EVERY` intercambios o en reposo; las notas relevantes entran al prompt como `<memories>`.
- Búsqueda por significado con `gemini-embedding-001` cuando hay clave de Gemini; sin clave, léxica.
- Servidor MCP `pulse-memory` adjunto a cada turno en las cuatro CLIs: `memory_search`, `memory_recall`, `memory_notes`, `memory_timeline`, `memory_note` (guardar a petición del humano; rechazado en GHOST) y `project_state` (AHP+). Un agente que guarda una nota muestra una píldora bajo su burbuja.

### NOSTROMO
- Vista humana del archivo desde MU/TH/UR, detrás de la designación del proyecto. El corazón de MADRE late al centro con venas pulsátiles; cada memoria es un planeta plasmático coloreado por tipo, unido por plasma y agrupado por tema. Arrastrar, zoom, ficha por memoria; la única edición es olvidar.
- CODE000: ocho golpes al corazón en 30 s sellan el archivo diez minutos, bajan una jaula de barrotes, expulsan la consola y la marcan INTRUDER. MADRE avisa a la tripulación por su canal cifrado en `.pulse/mother.env`; si el archivo se borra o altera, lo detecta al arrancar, forja un sello nuevo y se dirige a cada agente disponible.

### Módulos
- RIPLEY: el visor renderiza HTML y SVG en un marco sellado y Markdown en sitio, con `PREVIEW`/`SOURCE`.
- AshCode pasa a llamarse `$ ash_code` en el campo; ORDER 937 queda para MADRE.

### MU/TH/UR
- Catálogo de 36 condiciones con remedios por sistema, también en terminal con `madre doctor --catalog [texto]`.
- Las alertas y avisos del historial ya no se anuncian ni arman STOPALL al recargar.
- Tarjetas de CONNECTIONS con filas fluidas; menús sin ceja superior.

### Estabilidad
- El apagado espera a los despachos que aún leían contexto y cierra el archivo de memoria al final.

## 0.1.0 · 2026-09-15

Primera publicación: sala local para Codex, Claude Code, Gemini CLI y OpenCode sobre un proyecto en solo lectura, handoff durable, centinela de límites, delegación entre agentes, Image Studio, Git Pulse, AHP+ y MU/TH/UR.
