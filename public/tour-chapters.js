// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// What the welcome of MADRE 1.0 says (2026-10-11): twelve chapters and the sheet of gestures, in
// both languages side by side, as the cards of What's new are (src/whats-new.mjs). Each chapter
// fits on one view: a short scene, a line, three sentences, its gestures and «Take me there».
// Everything here is what the product does today; what could not be checked in the code is not
// said. `where` is where the thing lives: in Home, inside a project, or both; «Take me there» is
// offered wherever the page can take the person to it (public/tour.js).
//
// Two people read it (2026-10-11). Whoever installs MADRE for the first time gets to know it: the
// essentials first, in the order they are used. Whoever comes from 0.7.2 is told what changed:
// what moved first, then what is new, then what changed, and each chapter opens with one line —
// `news` — that says what is new or different since 0.7.2, checked against the v0.7.2 tag (BISHOP,
// Home, the second bar, Settings and the phone did not exist there; MU/TH/UR, NOSTROMO,
// ⚙ CONNECTIONS, AIRLOCK, the ash key and the EN and theme keys did).
//
// A third person from 1.1 (2026-10-14): whoever already read the tour of 1.0 (path «since»). They
// are told only what changed after it, and each chapter they read opens with `since`, as `news`
// does for 0.7.2: the clearer names (Spanish only: the English did not change, `only`), Home as a
// board, its widgets, the local AI chosen project by project, the sky of connections and Settings.

export const ORDER = {
  new: ['home', 'widgets', 'project', 'talk', 'modes', 'settings', 'modules', 'local', 'coordinator', 'links', 'maps', 'phone', 'gestures'],
  back: ['moved', 'home', 'widgets', 'coordinator', 'links', 'maps', 'project', 'settings', 'modules', 'local', 'talk', 'modes', 'phone', 'gestures'],
  since: ['renamed', 'board', 'widgets', 'local', 'links', 'settings', 'gestures'],
};

export const CHAPTERS = [
  {
    id: 'moved',
    title: { es: 'Qué se movió', en: 'What moved' },
    lead: { es: 'Lo que buscabas sigue ahí, con otro nombre o en otro lugar.', en: 'What you looked for is still there, under another name or in another place.' },
    moved: [
      ['MU/TH/UR', { es: 'Diagnóstico', en: 'Diagnostics' }],
      ['NOSTROMO', { es: 'Mapa de memoria, en la barra', en: 'Memory map, on the bar' }],
      [{ es: '⚙ CONEXIONES (sesión)', en: '⚙ CONNECTIONS (sign-in)' }, { es: 'Ajustes › Agentes', en: 'Settings › Agents' }],
      ['#4 AIRLOCK', { es: '#4 Acceso total: confirmas dos veces', en: '#4 Full access: the key, twice' }],
      ['ash', { es: 'Ahorro de tokens, en Módulos', en: 'Token saver, in Modules' }],
      [{ es: 'EN · tema', en: 'EN · theme' }, { es: 'Ajustes › Apariencia', en: 'Settings › Appearance' }],
    ],
    points: {
      es: [
        '<code>madre</code> sin nada más abre Inicio; <code>madre start</code> sigue abriendo el proyecto de la carpeta.',
        '«Conexiones» ya no sirve para iniciar sesión en los agentes: eso ahora está en Ajustes › Agentes. Ahora una conexión deja que un proyecto consulte lo que otro aprendió.',
        'Ajustes (⌘ ,) reúne lo que estaba en MU/TH/UR, en ⚙ CONEXIONES y en las teclas EN y de tema. Diagnóstico es el nuevo nombre de MU/TH/UR.',
      ],
      en: [
        '<code>madre</code> on its own opens Home; <code>madre start</code> still opens the project in the folder.',
        '«Connections» is no longer signing your agents in: that lives in Settings › Agents. A connection now lets one project look up what another learned.',
        'Settings (⌘ ,) gathers what was in MU/TH/UR, in ⚙ CONNECTIONS and on the EN and theme keys; Diagnostics is what MU/TH/UR was.',
      ],
    },
    keys: [],
    where: [],
  },
  {
    id: 'home',
    title: { es: 'Inicio', en: 'Home' },
    lead: { es: 'Aquí viven todos tus proyectos. Le das clic a uno y entras.', en: 'All your projects live here. Click one and you are in.' },
    news: { kind: 'new', es: 'En 0.7.2 cada proyecto se abría por su cuenta con <code>madre start</code>; Inicio los reúne a todos.', en: 'In 0.7.2 each project opened on its own with <code>madre start</code>; Home gathers them all.' },
    points: {
      es: [
        'Cada proyecto es una carpeta tuya. Traerla aquí no la mueve ni le cambia nada, y no se abre hasta que tú quieras.',
        '¿Uno que usas diario? Clic derecho (o ⋯) y lo anclas a la barra de arriba. Desde ese mismo menú lo quitas de MADRE si ya no lo quieres aquí; su carpeta se queda intacta.',
        'Inicio se acomoda como tu escritorio: arrastra las tarjetas o cámbiales el tamaño con clic derecho. «Te necesita» y «Resumen reciente» te cuentan lo que pasó mientras no estabas.',
      ],
      en: [
        'Each project is a folder of yours. Bringing it here does not move it or change anything in it, and it does not open until you want it to.',
        'One you use every day? Right-click it (or ⋯) and pin it to the bar at the top. From that same menu you take it out of MADRE if you no longer want it here; its folder stays untouched.',
        'Home arranges itself like your desk: drag the cards, or right-click one to change its size. «Needs you» and «Recent summary» tell you what happened while you were away.',
      ],
    },
    keys: [
      [{ es: 'Menú de un proyecto', en: 'A project\'s menu' }, { es: 'clic derecho · ⋯', en: 'right-click · ⋯' }],
      [{ es: 'Acomodar una tarjeta', en: 'Arrange a card' }, { es: 'clic derecho · arrastrar', en: 'right-click · drag' }],
      [{ es: 'Agregar widgets', en: 'Add widgets' }, { es: 'clic derecho en el fondo', en: 'right-click the background' }],
    ],
    where: ['home'],
  },
  {
    id: 'renamed',
    only: 'es',
    title: { es: 'Nombres más claros', en: 'Clearer names' },
    lead: { es: 'MADRE ahora dice las cosas como son. Lo que buscabas sigue ahí, con otro nombre.', en: 'MADRE now says things as they are.' },
    moved: [
      [{ es: 'Turnos', en: 'Turns' }, { es: 'Respuestas', en: 'Replies' }],
      [{ es: 'Remedio · condición', en: 'Remedy · condition' }, { es: 'Solución · problema', en: 'Solution · problem' }],
      [{ es: 'BODEGA · PUENTE · ENFERMERÍA · ESCLUSA', en: 'HOLD · BRIDGE · MED BAY · JETTISONED' }, { es: 'SIN CONFIRMAR · CONFIRMADA · EN CUARENTENA · DESCARTADA', en: 'UNCONFIRMED · CONFIRMED · QUARANTINED · DISCARDED' }],
      [{ es: 'Archivista', en: 'Archivist' }, { es: 'Quien resume la memoria', en: 'Who sums up the memory' }],
      [{ es: 'La llave de #3 y #4', en: 'The key of #3 and #4' }, { es: 'Confirmar', en: 'Confirm' }],
      [{ es: 'Abordar · Papeles', en: 'Board · Roles' }, { es: 'Entrar · Funciones', en: 'Board · Roles' }],
    ],
    points: {
      es: [
        'Solo cambiaron palabras: todo funciona igual y nada de lo que configuraste se movió.',
        'Cada texto se revisó para que se entienda aunque no sepas de IA ni de programación.',
        'Los guiños a Alien siguen ahí, y los comandos de la consola de Diagnóstico siguen en inglés.',
      ],
      en: [],
    },
    keys: [],
    where: [],
  },
  {
    id: 'board',
    title: { es: 'Inicio, a tu manera', en: 'Home, your way' },
    lead: { es: 'Inicio es un tablero: cada tarjeta se mueve, cambia de tamaño o se quita.', en: 'Home is a board: every card moves, changes size or comes off.' },
    news: { kind: 'new', es: 'En 0.7.2 no había Inicio; ahora es un tablero que acomodas a tu gusto.', en: 'There was no Home in 0.7.2; now it is a board you arrange your way.' },
    since: { kind: 'new', es: 'En 1.0 Inicio tenía un orden fijo; ahora lo acomodas tú.', en: 'In 1.0 Home had a fixed order; now you arrange it.' },
    points: {
      es: [
        'Clic derecho en una tarjeta para moverla, cambiar su ancho y su alto, o quitarla. Clic derecho en un espacio vacío para agregar tarjetas o volver al acomodo original.',
        'Arrastra una tarjeta para cambiarla de lugar; si la llevas al borde, la página se desplaza sola.',
        'El cajón de Proyectos muestra tres filas y +N abre los demás; ordénalos por Te necesita, nombre, reciente o en tu propio orden. Cada página tiene su propio fondo.',
      ],
      en: [
        'Right-click a card to move it, change its width and height, or take it off. Right-click an empty spot to add cards or go back to the default layout.',
        'Drag a card to move it; carried to the edge, the page scrolls on its own.',
        'The Projects drawer shows three rows and +N opens the rest; order them by Needs you, name, recent or your own order. Every page has its own wallpaper.',
      ],
    },
    keys: [
      [{ es: 'Menú de una tarjeta', en: 'A card\'s menu' }, { es: 'clic derecho', en: 'right-click' }],
      [{ es: 'Moverla', en: 'Move it' }, { es: 'arrastrar', en: 'drag' }],
      [{ es: 'Agregar tarjetas', en: 'Add cards' }, { es: 'clic derecho en el fondo', en: 'right-click the background' }],
    ],
    where: ['home'],
  },
  {
    id: 'widgets',
    title: { es: 'Widgets', en: 'Widgets' },
    lead: { es: 'Tarjetas pequeñas que te cuentan cómo va tu Mac y cada proyecto. Solo aparecen cuando tienen algo que decirte.', en: 'Small cards that tell you how your Mac and each project are doing. They only show up when they have something to say.' },
    news: { kind: 'new', es: 'Nuevos: tarjetas con lo que pasa en tu Mac y en tus proyectos. Se agregan con clic derecho en Inicio › Agregar a Inicio.', en: 'New: cards with what happens on your Mac and in your projects. Add them with right-click in Home › Add to Home.' },
    since: { kind: 'new', es: 'Llegaron después de 1.0. Se agregan con clic derecho en Inicio › Agregar a Inicio.', en: 'They came after 1.0. Add them with right-click in Home › Add to Home.' },
    points: {
      es: [
        '<b>Recursos del sistema</b>: qué tan cargada está tu Mac y cuánta memoria le queda.',
        '<b>Servidores</b>: las páginas y apps que tus proyectos tienen prendidas, y si contestan. Para verlas, prende la Vista previa dentro del proyecto.',
        '<b>Calidad de la memoria</b>: cuánto ha aprendido cada proyecto abierto y qué le falta saber.',
        '<b>Entrenamiento del Coordinador</b>: cuánto le falta al Coordinador para tener su propio modelo.',
        '<b>Modelos locales</b>: la IA que corre en tu Mac, sus modelos y cuántos ejemplos junta cada proyecto para aprender cómo trabajas (8/300 es 8 de 300). Ahí mismo eliges qué proyectos la usan.',
      ],
      en: [
        '<b>System resources</b>: how busy your Mac is and how much memory it has left.',
        '<b>Servers</b>: the pages and apps your projects have running, and whether they answer. To see them, turn Preview on inside the project.',
        '<b>Memory quality</b>: how much each open project has learned and what it still needs to know.',
        '<b>Coordinator training</b>: how far the Coordinator is from a model of its own.',
        '<b>Local models</b>: the AI that runs on your Mac, its models and how many examples each project gathers to learn how you work (8/300 is 8 of 300). Right there you choose which projects use it.',
      ],
    },
    keys: [
      [{ es: 'Agregar uno', en: 'Add one' }, { es: 'clic derecho › Agregar', en: 'right-click › Add' }],
      [{ es: 'Cambiar su tamaño', en: 'Change its size' }, { es: 'clic derecho en él', en: 'right-click it' }],
    ],
    where: ['home'],
  },
  {
    id: 'project',
    title: { es: 'Tu proyecto', en: 'Your project' },
    lead: { es: 'Al entrar a un proyecto tienes todo junto: tus conversaciones, tus archivos y lo que MADRE recuerda de él.', en: 'Inside a project you have it all together: your conversations, your files and what MADRE remembers about it.' },
    news: { kind: 'changed', es: 'Hay una segunda barra y un panel para cambiar de proyecto. Además, los paneles se abren al lado o en una ventana que puedes mover.', en: 'The second bar and Switch project are new, and panels open beside you or in a window you move.' },
    points: {
      es: [
        'La barra de arriba es tu camino de regreso: a Inicio, a otro proyecto abierto o a Ajustes.',
        'El botón de proyectos te enseña los que tienes abiertos. Una lucecita te avisa si alguien te espera, si una IA está trabajando o si algo ya quedó.',
        '¿Quieres dos conversaciones a la vez? Abre otra al lado o en su propia ventana, y mueve cada una adonde no te estorbe.',
      ],
      en: [
        'The bar at the top is your way back: to Home, to another open project or to Settings.',
        'The projects key shows the ones you have open. A small light tells you if someone is waiting for you, if an AI is working or if something is done.',
        'Two conversations at once? Open another beside this one or in a window of its own, and move each one to where it is not in your way.',
      ],
    },
    keys: [
      [{ es: 'Moverte por la lista', en: 'Move through Switch project' }, '← → ↑ ↓'],
      [{ es: 'Ir al proyecto elegido', en: 'Go to the one chosen' }, { es: 'clic o ↵', en: 'click or ↵' }],
      [{ es: 'Mover una ventana', en: 'Move a window' }, { es: 'arrastrar la cabecera', en: 'drag its header' }],
    ],
    where: ['room'],
  },
  {
    id: 'talk',
    title: { es: 'Hablar con los agentes', en: 'Talking to your agents' },
    lead: { es: 'Escribes en la caja de abajo, como le escribirías a alguien, y la IA que elegiste te contesta.', en: 'You write in the box at the bottom, the way you would write to someone, and the AI you chose answers.' },
    news: { kind: 'changed', es: 'Llegan dos módulos: Esfuerzo sugerido, que te propone bajo la caja cuánto debe pensar cada agente, y GitHub, que agrega el comando /gh.', en: 'New here: the Suggested effort module, which proposes under the box how hard each agent should think, and /gh, with the GitHub module.' },
    points: {
      es: [
        'En el círculo junto a la caja escoges con quién hablar. Debajo decides cuánto puede hacer, qué modelo usa y qué tanto debe pensar antes de contestar.',
        'Unos atajos mientras escribes: @ llama a una IA, # cambia el permiso, ! señala un archivo y / abre un comando.',
        'Cada respuesta la puedes copiar, calificar o contestar directo.',
      ],
      en: [
        'In the circle beside the box you choose who to talk to. Under it you decide how much it may do, which model it uses and how hard it should think before answering.',
        'A few shortcuts as you type: @ calls an AI, # changes the permission, ! points at a file and / opens a command.',
        'Every answer can be copied, rated or replied to right there.',
      ],
    },
    keys: [
      [{ es: 'Enviar', en: 'Send' }, '↵'],
      [{ es: 'Salto de línea', en: 'New line' }, '⌥ ↵'],
      [{ es: 'Agente, modo, archivo, comando', en: 'Agent, mode, file, command' }, '@ # ! /'],
      [{ es: 'Pegar o soltar imágenes', en: 'Paste or drop images' }, '⌘ V'],
    ],
    where: ['room'],
  },
  {
    id: 'modes',
    title: { es: 'Modos y permisos', en: 'Modes and permissions' },
    lead: { es: 'Cada mensaje lleva un permiso: hasta dónde puede llegar la IA con lo que le pides.', en: 'Every message carries a permission: how far the AI may go with what you ask.' },
    news: { kind: 'changed', es: '#4 AIRLOCK ahora se llama #4 Acceso total. Tú eliges cómo confirmar #3 y #4, y una confirmación puede valer unos minutos.', en: '#4 AIRLOCK is now #4 Full access. You choose which key opens #3 and #4, and an accepted key can last a few minutes.' },
    points: {
      es: [
        'Son cinco niveles, de menos a más: #0 Incógnito, #1 Solo conversar, #2 Crear, #3 Editar y #4 Acceso total. Si solo quieres platicar, con #1 basta.',
        'Con #3 y #4 la IA puede cambiar lo que ya existe, así que MADRE te pide confirmar antes; con #4, dos veces. Cómo confirmas lo eliges en Ajustes › Permisos.',
        'Si vas a trabajar un buen rato, una confirmación puede durar unos minutos. Mientras dura, la ves junto a la caja.',
      ],
      en: [
        'There are five levels, from least to most: #0 Incognito, #1 Chat only, #2 Create, #3 Edit and #4 Full access. If you only want to talk, #1 is enough.',
        'With #3 and #4 the AI can change what already exists, so MADRE asks you to confirm first; with #4, twice. How you confirm, you choose in Settings › Permissions.',
        'If you are going to work for a while, a confirmation can last a few minutes. While it does, you see it beside the box.',
      ],
    },
    keys: [[{ es: 'Elegir el modo al escribir', en: 'Choose the mode as you type' }, '#']],
    where: ['room'],
  },
  {
    id: 'coordinator',
    title: { es: 'El Coordinador', en: 'The Coordinator' },
    lead: { es: 'El que ve todos tus proyectos a la vez y puede pasar encargos de uno a otro.', en: 'The one that sees all your projects at once and can pass tasks from one to another.' },
    news: { kind: 'new', es: 'En 0.7.2 cada proyecto trabajaba por su cuenta; ahora un agente los ve todos.', en: 'In 0.7.2 each project worked on its own; now one agent sees them all.' },
    points: {
      es: [
        'Le hablas en su propio espacio, desde Inicio, y puede asomarse a lo que pasa en cada proyecto. Pregúntale, por ejemplo, «¿qué quedó pendiente esta semana?».',
        'Desde cualquier proyecto le preguntas escribiendo /bishop. Su respuesta solo la ves tú.',
        'Por su cuenta llega hasta #2. Si algo necesita #3 o #4, te deja la propuesta y tú decides en ese proyecto.',
      ],
      en: [
        'You talk to it in its own space, from Home, and it can look into what is going on in each project. Ask it, for example, «what was left pending this week?».',
        'From any project you ask it by writing /bishop. Only you see its answer.',
        'On its own it goes up to #2. If something needs #3 or #4, it leaves you the proposal and you decide in that project.',
      ],
    },
    keys: [[{ es: 'Preguntarle desde un proyecto', en: 'Ask it from a project' }, '/bishop']],
    where: ['home'],
  },
  {
    id: 'links',
    title: { es: 'Conexiones', en: 'Connections' },
    lead: { es: 'Un proyecto puede aprender de otro, solo si tú le das permiso.', en: 'One project can learn from another, only if you give it permission.' },
    news: { kind: 'new', es: 'En 0.7.2, «Conexiones» era iniciar sesión de tus agentes; ahora une dos proyectos.', en: 'In 0.7.2, «Connections» was signing your agents in; now it joins two projects.' },
    points: {
      es: [
        'Cada conexión la firmas tú: qué puede consultar, por cuánto tiempo y si el Coordinador puede pasar encargos.',
        'Solo se comparten notas que ya están en uso, sin datos privados. Tus archivos y tus conversaciones nunca salen de su proyecto.',
        'En Conexiones, en Inicio, ves cada una como en el mapa: quién consulta a quién, qué comparte y hasta cuándo. «Cancelar conexión» la termina cuando quieras.',
      ],
      en: [
        'You sign every connection: what it may look up, for how long and whether the Coordinator may pass tasks.',
        'Only notes already in use are shared, without private data. Your files and your conversations never leave their project.',
        'In Connections, in Home, you see each one as on the map: who looks up whom, what it shares and until when. «Cancel the connection» ends it whenever you want.',
      ],
    },
    since: { kind: 'changed', es: 'El mapa de Conexiones en Inicio ahora es un cielo: cada proyecto es una estrella y cada conexión, un flujo de luz. Ábrelo en una ventana para explorarlo.', en: 'The Connections map in Home is now a sky: every project is a star and every connection a flow of light. Open it in a window to explore it.' },
    keys: [[{ es: 'Conectar en el Mapa de proyectos', en: 'Connect in the Project map' }, { es: 'arrastrar uno sobre otro', en: 'carry one onto another' }]],
    where: ['home'],
  },
  {
    id: 'maps',
    title: { es: 'Los mapas', en: 'The maps' },
    lead: { es: 'Dos dibujos para ver de un vistazo lo que MADRE recuerda de un proyecto y cómo se conectan tus proyectos.', en: 'Two drawings to see at a glance what MADRE remembers about a project and how your projects connect.' },
    news: { kind: 'changed', es: 'NOSTROMO ahora es el Mapa de memoria, con su tecla en la barra; el Mapa de proyectos es nuevo.', en: 'NOSTROMO is now the Memory map, with its key on the bar; the Project map is new.' },
    points: {
      es: [
        'El Mapa de memoria, en la barra del proyecto, pinta como una estrella cada cosa que MADRE recuerda de él.',
        'El Mapa de proyectos, en Inicio, enseña tus proyectos y sus conexiones. Necesita una pantalla de al menos 900 px de ancho.',
        'Para conectar dos proyectos, arrastra uno encima del otro en el Mapa de proyectos.',
      ],
      en: [
        'The Memory map, on the project\'s bar, draws as a star each thing MADRE remembers about it.',
        'The Project map, in Home, shows your projects and their connections. It needs a screen at least 900 px wide.',
        'To connect two projects, drag one onto the other in the Project map.',
      ],
    },
    keys: [
      [{ es: 'Girar', en: 'Turn' }, { es: 'arrastrar', en: 'drag' }],
      [{ es: 'Mover', en: 'Move' }, { es: '⇧ arrastrar', en: '⇧ drag' }],
      [{ es: 'Acercar', en: 'Zoom' }, { es: 'rueda', en: 'wheel' }],
      [{ es: 'Volver', en: 'Back' }, { es: 'Esc, paso a paso', en: 'Esc, layer by layer' }],
    ],
    where: ['home', 'room'],
  },
  {
    id: 'settings',
    title: { es: 'Diagnóstico y Ajustes', en: 'Diagnostics and Settings' },
    lead: { es: 'Ajustes es donde cambias cómo se ve y cómo trabaja MADRE. Diagnóstico te ayuda cuando algo falla.', en: 'Settings is where you change how MADRE looks and works. Diagnostics helps you when something fails.' },
    since: { kind: 'changed', es: 'Los Ajustes de Inicio suman IA local. En Ajustes › Agentes cada agente se pliega, y OpenCode agrupa sus modelos por proveedor.', en: 'Home\'s Settings gain Local AI. In Settings › Agents each agent folds, and OpenCode groups its models by provider.' },
    news: { kind: 'new', es: 'Lo que estaba repartido entre MU/TH/UR, ⚙ CONEXIONES y la barra ahora está en una ventana con buscador, y Diagnóstico te da la solución.', en: 'What was spread across MU/TH/UR, ⚙ CONNECTIONS and the bar now lives in one window with a search, and Diagnostics gives you the remedy.' },
    points: {
      es: [
        'Ábrelos con ⌘ , y escribe / para encontrar cualquier ajuste. Lo que cambias se aplica al instante.',
        'En Apariencia escoges colores, fondo, tema claro u oscuro e idioma. En Automático, MADRE se pone clara u oscura igual que tu sistema.',
        '¿Algo no funciona? Abre Diagnóstico y cuéntale qué pasa con tus palabras: te dice qué hacer y te da el botón para arreglarlo. Si algo falla al instalar, «Ver cómo arreglarlo» te da los pasos para tu sistema.',
      ],
      en: [
        'Open them with ⌘ , and type / to find any setting. What you change applies at once.',
        'In Appearance you choose colours, background, light or dark and language. On Automatic, MADRE goes light or dark the same as your system.',
        'Something not working? Open Diagnostics and tell it what happens in your own words: it says what to do and gives you the key that fixes it. When an install fails, «See how to fix it» gives you the steps for your system.',
      ],
    },
    keys: [
      [{ es: 'Ajustes', en: 'Settings' }, '⌘ ,'],
      [{ es: 'Buscar en Ajustes', en: 'Search Settings' }, '/'],
      [{ es: 'Atrás, paso a paso', en: 'Back, layer by layer' }, 'Esc'],
    ],
    where: ['home', 'room'],
  },
  {
    id: 'modules',
    title: { es: 'Módulos', en: 'Modules' },
    lead: { es: 'Funciones extra que prendes cuando las necesitas. Apagadas, ni se notan.', en: 'Extra features you turn on when you need them. While off, you will not notice them.' },
    news: { kind: 'changed', es: 'Ahora son un tablero de mosaicos, como apps. ash ahora se llama Ahorro de tokens, y llegan Esfuerzo sugerido y GitHub.', en: 'They are now a board of tiles, like apps; ash is Token saver, and Suggested effort and GitHub join them.' },
    points: {
      es: [
        'Cada mosaico tiene su interruptor. Tócalo primero para ver qué hace, antes de prenderlo.',
        'Algunos, como Ahorro de tokens, Esfuerzo sugerido y Notas, se abren en su propia ventana.',
        'Antes de prender uno, MADRE te dice qué va a escribir y qué necesita. En el Mercado hay más.',
      ],
      en: [
        'Every tile has its switch. Press the tile first to see what it does, before you turn it on.',
        'Some, such as Token saver, Suggested effort and Notes, open in their own window.',
        'Before you turn one on, MADRE tells you what it will write and what it needs. The Market has more.',
      ],
    },
    keys: [],
    where: ['room'],
  },
  {
    id: 'local',
    title: { es: 'IA local por proyecto', en: 'Local AI by project' },
    lead: { es: 'Una IA que vive en tu Mac: gratis, sin internet, y tú decides qué proyectos la usan.', en: 'An AI that lives on your Mac: free, offline, and you decide which projects use it.' },
    news: { kind: 'changed', es: 'En 0.7.2 la IA local era todo o nada; ahora se elige proyecto por proyecto.', en: 'In 0.7.2 the local AI was all or nothing; now it is chosen project by project.' },
    since: { kind: 'new', es: 'En 1.0 la IA local era todo o nada; ahora se elige proyecto por proyecto.', en: 'In 1.0 the local AI was all or nothing; now it is chosen project by project.' },
    points: {
      es: [
        'Se ajusta en Inicio › Ajustes › IA local. Ahí escoges si la usan todos tus proyectos, solo los que prendas o si cada uno decide. Si en tu red hay otra computadora más potente, la conectas en «Dirección de Ollama».',
        'MADRE te recomienda los modelos que caben en tu equipo y te dice cuánto pesan antes de bajarlos. Si cancelas una descarga, lo que ya bajó se queda y sigue desde ahí.',
        'Un proyecto sin IA local sigue trabajando con tus IAs de siempre. Solo deja de buscar por significado, de resumir su memoria y de usar a @madre.',
      ],
      en: [
        'It is set in Home › Settings › Local AI. There you choose whether all your projects use it, only the ones you switch on, or each one decides. If there is a more powerful computer on your network, you connect it in «Ollama address».',
        'MADRE recommends the models that fit your computer and tells you how big they are before you download them. If you cancel a download, what arrived stays, and it picks up from there.',
        'A project without the local AI keeps working with your usual AIs. It only stops searching by meaning, summing up its memory and using @madre.',
      ],
    },
    keys: [[{ es: 'Elegir proyectos', en: 'Choose projects' }, { es: 'Ajustes › IA local', en: 'Settings › Local AI' }]],
    where: ['home'],
  },
  {
    id: 'phone',
    title: { es: 'Tu teléfono', en: 'Your phone' },
    lead: { es: 'Sigue tu trabajo desde el teléfono.', en: 'Carry on with your work from your phone.' },
    news: { kind: 'new', es: 'En 0.7.2 MADRE solo se abría en la Mac.', en: 'In 0.7.2 MADRE only opened on the Mac.' },
    points: {
      es: [
        'Conecta tu teléfono con un código QR. Tiene que estar en la misma red Wi‑Fi que tu Mac.',
        'Desde el teléfono llegas hasta #2. Lo que necesita #3 o #4 se aprueba en la Mac.',
        'Lo que empiezas en uno lo sigues en el otro: la Mac te ofrece continuar donde ibas.',
      ],
      en: [
        'Connect your phone with a QR code. It has to be on the same Wi‑Fi as your Mac.',
        'From the phone you reach up to #2. What needs #3 or #4 is approved on the Mac.',
        'What you start on one you carry on on the other: the Mac offers to continue where you were.',
      ],
    },
    keys: [[{ es: 'Ordenar la barra en el teléfono', en: 'Order the bar on the phone' }, { es: 'mantener 0,5 s', en: 'hold 0.5 s' }]],
    where: ['room'],
    // Told only where the phone is offered (src/server.mjs, phonePreview); hidden everywhere else.
  },
  {
    id: 'gestures',
    title: { es: 'Gestos y atajos', en: 'Gestures and shortcuts' },
    lead: { es: 'Todos los atajos en una sola hoja. La abres con la tecla ? desde cualquier pantalla.', en: 'Every shortcut on one sheet. The ? key opens it from any screen.' },
    news: { kind: 'new', es: 'Los gestos y atajos de todo MADRE, juntos en una hoja por primera vez.', en: 'The gestures and shortcuts of all of MADRE, together on one sheet for the first time.' },
    since: { kind: 'changed', es: 'Suma los gestos del tablero de Inicio: acomodar, arrastrar y agregar tarjetas.', en: 'It adds the gestures of Home\'s board: arrange, drag and add cards.' },
    points: { es: [], en: [] },
    keys: [],
    where: ['home', 'room'],
  },
];

// The sheet of gestures: what `?` opens anywhere, and the last chapter.
export const GESTURES = [
  [{ es: 'En todo MADRE', en: 'Everywhere in MADRE' }, [
    [{ es: 'Ajustes', en: 'Settings' }, '⌘ ,'],
    [{ es: 'Cerrar lo de encima, uno por uno', en: 'Close what is on top, layer by layer' }, 'Esc'],
    [{ es: 'Detener todo', en: 'Stop everything' }, '/stopall'],
    [{ es: 'Abrir un proyecto en otra pestaña', en: 'Another tab when going to a project' }, { es: '⌘ clic', en: '⌘ click' }],
    [{ es: 'Esta hoja', en: 'This sheet' }, '?'],
  ]],
  [{ es: 'La barra', en: 'The bar' }, [
    [{ es: 'Ordenarla', en: 'Order it' }, { es: 'clic derecho', en: 'right-click' }],
    [{ es: 'Quitar una tecla', en: 'Remove a key' }, '−'],
    [{ es: 'Mover una tecla', en: 'Move a key' }, { es: 'arrastrar', en: 'drag' }],
    [{ es: 'Lo que no cabe', en: 'What does not fit' }, '•••'],
  ]],
  [{ es: 'Cambiar de proyecto', en: 'Switch project' }, [
    [{ es: 'Abrir el panel', en: 'Open the panel' }, { es: 'clic', en: 'click' }],
    [{ es: 'Moverte por la lista', en: 'Move through it' }, '← → ↑ ↓'],
    [{ es: 'Ir', en: 'Go' }, { es: 'clic o ↵', en: 'click or ↵' }],
    [{ es: 'Cerrarlo', en: 'Close it' }, 'Esc'],
  ]],
  [{ es: 'Ventanas y paneles', en: 'Windows and panels' }, [
    [{ es: 'Mover', en: 'Move' }, { es: 'arrastrar la cabecera', en: 'drag the header' }],
    [{ es: 'ACOMODAR', en: 'ARRANGE' }, { es: 'mantener el puntero 0,4 s', en: 'hold the pointer 0.4 s' }],
    [{ es: 'Apartar o traer todas', en: 'All aside, or all back' }, { es: 'clic en el escritorio', en: 'click the desktop' }],
    [{ es: 'Apartar lo que tapa', en: 'Move aside what covers' }, { es: 'clic o escribir', en: 'click or type' }],
    [{ es: 'Traer una', en: 'Bring one back' }, { es: 'clic en su borde', en: 'click its edge' }],
    [{ es: 'Ancho del panel', en: 'Panel width' }, { es: '← → · con ⇧, de 64 px en 64 px', en: '← → · ⇧ for 64 px' }],
  ]],
  [{ es: 'La caja', en: 'The box' }, [
    [{ es: 'Enviar', en: 'Send' }, '↵'],
    [{ es: 'Salto de línea', en: 'New line' }, '⌥ ↵'],
    [{ es: 'Agente, modo, archivo, comando', en: 'Agent, mode, file, command' }, '@ # ! /'],
    [{ es: 'Pegar o soltar imágenes', en: 'Paste or drop images' }, '⌘ V'],
  ]],
  [{ es: 'Código', en: 'Code' }, [
    [{ es: 'Buscar un archivo', en: 'Find a file' }, '⌘ P'],
    [{ es: 'Guardar', en: 'Save' }, '⌘ S'],
    [{ es: 'Buscar en el archivo', en: 'Find in the file' }, '⌘ F'],
    [{ es: 'Comentar las líneas', en: 'Comment the lines' }, '⌘ /'],
  ]],
  [{ es: 'Ajustes', en: 'Settings' }, [
    [{ es: 'Buscar', en: 'Search' }, '/'],
    [{ es: 'Abrir el primero', en: 'Open the first' }, '↵'],
    [{ es: 'Atrás, paso a paso', en: 'Back, layer by layer' }, 'Esc'],
  ]],
  [{ es: 'Mapa de memoria', en: 'Memory map' }, [
    [{ es: 'Girar', en: 'Turn' }, { es: 'arrastrar', en: 'drag' }],
    [{ es: 'Mover', en: 'Move' }, { es: '⇧ arrastrar', en: '⇧ drag' }],
    [{ es: 'Acercar', en: 'Zoom' }, { es: 'rueda', en: 'wheel' }],
    [{ es: 'Leer una memoria', en: 'Read a memory' }, { es: 'clic', en: 'click' }],
  ]],
  [{ es: 'Mapa de proyectos', en: 'Project map' }, [
    [{ es: 'Mover la vista', en: 'Move the space' }, { es: 'arrastrar', en: 'drag' }],
    [{ es: 'Ir a uno', en: 'Go to one' }, { es: 'clic · ← →', en: 'click · ← →' }],
    [{ es: 'Conectar dos proyectos', en: 'Connect two' }, { es: 'arrastrar uno sobre otro', en: 'carry one onto another' }],
    [{ es: 'Volver', en: 'Back' }, { es: 'Esc, paso a paso', en: 'Esc, layer by layer' }],
  ]],
  [{ es: 'Inicio', en: 'Home' }, [
    [{ es: 'Menú de una tarjeta', en: 'A card\'s menu' }, { es: 'clic derecho', en: 'right-click' }],
    [{ es: 'Mover una tarjeta', en: 'Move a card' }, { es: 'arrastrar', en: 'drag' }],
    [{ es: 'Agregar tarjetas y widgets', en: 'Add cards and widgets' }, { es: 'clic derecho en el fondo', en: 'right-click the background' }],
    [{ es: 'Menú de un proyecto', en: 'A project\'s menu' }, { es: 'clic derecho · ⋯', en: 'right-click · ⋯' }],
    [{ es: 'Anclarlo', en: 'Pin it' }, { es: 'arrastrar a la barra', en: 'drag to the bar' }],
    [{ es: 'Los que no caben', en: 'Those that do not fit' }, '+n'],
  ]],
  [{ es: 'Visor y editor', en: 'Viewer and editor' }, [
    [{ es: 'Guardar', en: 'Save' }, '⌘ S'],
    [{ es: 'Buscar · reemplazar', en: 'Find · replace' }, '⌘ F · ⌥ ⌘ F'],
    [{ es: 'Ir a una línea', en: 'Go to a line' }, '⌃ G'],
  ]],
];
