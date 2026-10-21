// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
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
    lead: { es: 'Todos tus proyectos en un lugar, abiertos o dormidos.', en: 'All your projects in one place, open or asleep.' },
    news: { kind: 'new', es: 'En 0.7.2 cada proyecto se abría por su cuenta con <code>madre start</code>; Inicio los reúne a todos.', en: 'In 0.7.2 each project opened on its own with <code>madre start</code>; Home gathers them all.' },
    points: {
      es: [
        'Agrega las carpetas de tus proyectos; ninguna se abre hasta que tú lo decidas. Clic derecho o ⋯ en un proyecto para anclarlo a la barra o quitarlo de MADRE; su carpeta no se toca.',
        'Inicio es un tablero: clic derecho en cualquier tarjeta para moverla, cambiar su tamaño o quitarla, y en el fondo para agregar widgets. También puedes arrastrarlas.',
        'Te esperan, Decisiones recientes y Resumen reciente te cuentan qué pasó mientras no estabas.',
      ],
      en: [
        'Add folders: they do not open until you want them to. Right-click or ⋯ on a project to pin it to the bar or remove it from MADRE; its folder is not touched.',
        'Home is a board: right-click any card to move it, resize it or take it off, and the background to add widgets. You can drag them too.',
        'Waiting for you, Recent decisions and the Recent summary tell you what happened while you were away.',
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
    lead: { es: 'Tarjetas que muestran lo que pasa en tu Mac y en tus proyectos. Solo se ofrecen si hay algo que las alimente.', en: 'Cards that show what happens on your Mac and in your projects. Only offered when something feeds them.' },
    news: { kind: 'new', es: 'Nuevos: tarjetas con lo que pasa en tu Mac y en tus proyectos. Se agregan con clic derecho en Inicio › Agregar a Inicio.', en: 'New: cards with what happens on your Mac and in your projects. Add them with right-click in Home › Add to Home.' },
    since: { kind: 'new', es: 'Llegaron después de 1.0. Se agregan con clic derecho en Inicio › Agregar a Inicio.', en: 'They came after 1.0. Add them with right-click in Home › Add to Home.' },
    points: {
      es: [
        '<b>Recursos del sistema</b>: qué tan ocupado está el procesador y cuánta memoria queda libre.',
        '<b>Servidores</b>: los servidores que corren en tus proyectos abiertos y si responden. Necesita la Vista previa encendida en el proyecto.',
        '<b>Calidad de la memoria</b>: qué tan madura está la memoria de cada proyecto abierto y cuál es su punto más débil.',
        '<b>Entrenamiento del Coordinador</b>: cuánto le falta a la memoria del Coordinador para entrenar un modelo propio.',
        '<b>Modelos locales</b>: Ollama, sus modelos y cuántos ejemplos lleva cada proyecto para entrenar el suyo (8/300 son 8 de 300). Desde ahí eliges qué proyectos usan la IA local.',
      ],
      en: [
        '<b>System resources</b>: how busy the processor is and how much memory is free.',
        '<b>Servers</b>: the servers running in your open projects and whether they answer. It needs Preview on in the project.',
        '<b>Memory quality</b>: how grown each open project\'s memory is, and its weakest side.',
        '<b>Coordinator training</b>: how far the Coordinator\'s memory is from training a model of its own.',
        '<b>Local models</b>: Ollama, its models and how many examples each project has toward its own (8/300 is 8 of 300). From there you choose which projects use the local AI.',
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
    lead: { es: 'Cada proyecto tiene su conversación, sus archivos y su memoria.', en: 'Each project has its own conversation, files and memory.' },
    news: { kind: 'changed', es: 'Hay una segunda barra y un panel para cambiar de proyecto. Además, los paneles se abren al lado o en una ventana que puedes mover.', en: 'The second bar and Switch project are new, and panels open beside you or in a window you move.' },
    points: {
      es: [
        'La segunda barra te lleva a Inicio, a otro proyecto abierto o a Ajustes, y te deja recargar.',
        'Cambiar de proyecto muestra los que tienes abiertos. Su luz te avisa si alguien te espera, si un agente está trabajando o si algo terminó.',
        'Abre otra conversación al lado o en una ventana aparte, y acomoda los paneles como quieras.',
      ],
      en: [
        'The second bar takes you to Home, to another open project, to reload and to Settings.',
        'Switch project shows the ones you have open; its light says if someone waits for you, if an agent is working or if something finished.',
        'Open another conversation beside this one or in a window, and arrange the panels as you like.',
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
    lead: { es: 'Una conversación, todos tus agentes.', en: 'One conversation, every agent.' },
    news: { kind: 'changed', es: 'Llegan dos módulos: Intenciones, que sugiere bajo la caja cuánto debe pensar cada agente, y GitHub, que agrega el comando /gh.', en: 'New here: the Intenciones module, which suggests under the box how hard each agent should think, and /gh, with the GitHub module.' },
    points: {
      es: [
        'Elige el agente en el orbe. El modo, el modelo y el esfuerzo están en una fila bajo la caja de texto.',
        'Escribe @ para elegir un agente, # para un modo, ! para un archivo y / para un comando.',
        'Cada respuesta se puede calificar, copiar o responder.',
      ],
      en: [
        'Choose the agent in the orb; mode, model and effort sit in one row under the box.',
        'Type @ for an agent, # for a mode, ! for a file and / for a command.',
        'Every answer can be rated, copied or replied to.',
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
    lead: { es: 'Cada mensaje lleva un nivel de permiso: hasta dónde puede llegar el agente.', en: 'Every message says how far the agent may go.' },
    news: { kind: 'changed', es: '#4 AIRLOCK ahora se llama #4 Acceso total. Tú eliges cómo confirmar #3 y #4, y una confirmación puede valer unos minutos.', en: '#4 AIRLOCK is now #4 Full access. You choose which key opens #3 and #4, and an accepted key can last a few minutes.' },
    points: {
      es: [
        'Los niveles, de menos a más: #0 Incógnito, #1 Solo conversar, #2 Crear, #3 Editar y #4 Acceso total.',
        '#3 y #4 te piden confirmar, y #4 lo pide dos veces. Cómo confirmas lo eliges en Ajustes › Permisos.',
        'Una confirmación puede valer unos minutos; mientras dura, la ves junto a la caja.',
      ],
      en: [
        '#0 Incognito, #1 Chat only, #2 Create, #3 Edit and #4 Full access.',
        '#3 and #4 ask for your key, and #4 asks for it twice. Which key, you choose in Settings › Permissions.',
        'An accepted key can last a few minutes; while it does, you see it beside the box.',
      ],
    },
    keys: [[{ es: 'Elegir el modo al escribir', en: 'Choose the mode as you type' }, '#']],
    where: ['room'],
  },
  {
    id: 'coordinator',
    title: { es: 'El Coordinador', en: 'The Coordinator' },
    lead: { es: 'Un agente que ve todos tus proyectos desde arriba.', en: 'An agent that sees all your projects from above.' },
    news: { kind: 'new', es: 'En 0.7.2 cada proyecto trabajaba por su cuenta; ahora un agente los ve todos.', en: 'In 0.7.2 each project worked on its own; now one agent sees them all.' },
    points: {
      es: [
        'Consulta todos tus proyectos, firma conexiones y lleva órdenes de uno a otro. Le hablas en su propio proyecto, desde Inicio.',
        'Desde cualquier proyecto le preguntas con /bishop, y la respuesta es solo para ti.',
        'Sus órdenes llegan hasta #2. Para #3 y #4 te deja una propuesta, y tú la apruebas en ese proyecto.',
      ],
      en: [
        'It reads across your projects, signs connections and carries orders from one to another. You talk to it in its own project, from Home.',
        'From any project you ask it with /bishop, and the answer is for you only.',
        'Its orders go up to #2; #3 and #4 arrive as a proposal you unlock in that project.',
      ],
    },
    keys: [[{ es: 'Preguntarle desde un proyecto', en: 'Ask it from a project' }, '/bishop']],
    where: ['home'],
  },
  {
    id: 'links',
    title: { es: 'Conexiones', en: 'Connections' },
    lead: { es: 'Un proyecto puede consultar lo que otro ya aprendió.', en: 'One project can look up what another has already learned.' },
    news: { kind: 'new', es: 'En 0.7.2, «Conexiones» era iniciar sesión de tus agentes; ahora une dos proyectos.', en: 'In 0.7.2, «Connections» was signing your agents in; now it joins two projects.' },
    points: {
      es: [
        'Tú firmas cada conexión: qué puede consultar, por cuánto tiempo y si el Coordinador puede dar órdenes.',
        'Solo se comparten notas que ya están en uso, sin datos privados. Nunca tus archivos ni tus conversaciones.',
        'Cada par de proyectos se conecta una sola vez, y puedes cancelar la conexión cuando quieras desde Conexiones, en Inicio.',
      ],
      en: [
        'You sign every connection: what it looks up, for how long, and whether the Coordinator may give orders.',
        'Only notes already in use cross, cleaned of private data; never your files nor your conversations.',
        'Two projects are connected once; you revoke it whenever you want from Connections, in Home.',
      ],
    },
    since: { kind: 'changed', es: 'El mapa de Conexiones en Inicio ahora es un cielo: cada proyecto es una estrella y cada conexión, un flujo de luz. Ábrelo en una ventana para explorarlo.', en: 'The Connections map in Home is now a sky: every project is a star and every connection a flow of light. Open it in a window to explore it.' },
    keys: [[{ es: 'Conectar en el Mapa de proyectos', en: 'Connect in the Project map' }, { es: 'arrastrar uno sobre otro', en: 'carry one onto another' }]],
    where: ['home'],
  },
  {
    id: 'maps',
    title: { es: 'Los mapas', en: 'The maps' },
    lead: { es: 'Tu memoria y tus proyectos, de un vistazo.', en: 'Your memory and your projects, at a glance.' },
    news: { kind: 'changed', es: 'NOSTROMO ahora es el Mapa de memoria, con su tecla en la barra; el Mapa de proyectos es nuevo.', en: 'NOSTROMO is now the Memory map, with its key on the bar; the Project map is new.' },
    points: {
      es: [
        'El Mapa de memoria tiene su tecla en la barra del proyecto: cada estrella es algo que MADRE recuerda de él.',
        'El Mapa de proyectos, en Inicio, muestra tus proyectos y sus conexiones. Necesita una pantalla de 900 px o más.',
        'En el Mapa de proyectos, arrastra un proyecto sobre otro para conectarlos.',
      ],
      en: [
        'The Memory map has its key on the project\'s bar: every star is something MADRE remembers about it.',
        'The Project map, in Home, shows your projects and their connections; it needs a screen of 900 px or more.',
        'In the Project map, carry one project onto another to connect them.',
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
    lead: { es: 'Todo lo que configuras, en un lugar; y la solución cuando algo falla.', en: 'Everything you set, in one place; and the remedy when something fails.' },
    since: { kind: 'changed', es: 'Los Ajustes de Inicio suman IA local. En Ajustes › Agentes cada agente se pliega, y OpenCode agrupa sus modelos por proveedor.', en: 'Home\'s Settings gain Local AI. In Settings › Agents each agent folds, and OpenCode groups its models by provider.' },
    news: { kind: 'new', es: 'Lo que estaba repartido entre MU/TH/UR, ⚙ CONEXIONES y la barra ahora está en una ventana con buscador, y Diagnóstico te da la solución.', en: 'What was spread across MU/TH/UR, ⚙ CONNECTIONS and the bar now lives in one window with a search, and Diagnostics gives you the remedy.' },
    points: {
      es: [
        'Ajustes se abre con ⌘ , y se busca con /. Los cambios se aplican al instante.',
        'Apariencia tiene los colores de acento y los fondos para tema claro y oscuro, y también el idioma.',
        'En Diagnóstico describes con tus palabras lo que pasa, y te dice qué hacer y con qué tecla resolverlo.',
      ],
      en: [
        'Settings opens with ⌘ , and is searched with /. Changes apply at once.',
        'Appearance has the accents and wallpapers for light and dark, and the language too.',
        'In Diagnostics you say what happens in your own words and it tells you what to do, with the key that fixes it.',
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
    lead: { es: 'Funciones extra que le agregas a MADRE, como apps.', en: 'What you add to MADRE, like apps.' },
    news: { kind: 'changed', es: 'Ahora son un tablero de mosaicos, como apps. ash ahora se llama Ahorro de tokens, y llegan Intenciones y GitHub.', en: 'They are now a board of tiles, like apps; ash is Token saver, and Intenciones and GitHub join them.' },
    points: {
      es: [
        'Un tablero de mosaicos, cada uno con su interruptor y su ficha.',
        'Ahorro de tokens, Intenciones e IA local se abren en su propia ventana.',
        'Continuidad (AHP+), GitHub y los demás te dicen qué escriben y qué necesitan antes de instalarlos.',
      ],
      en: [
        'A board of tiles, each with its switch and its sheet.',
        'Token saver, Intents and Local AI open in their own window.',
        'Continuity (AHP+), GitHub and the rest say what they write and what they need before they are installed.',
      ],
    },
    keys: [],
    where: ['room'],
  },
  {
    id: 'local',
    title: { es: 'IA local por proyecto', en: 'Local AI by project' },
    lead: { es: 'Eliges qué proyectos usan Ollama, la IA que corre en tu Mac sin gastar tokens ni enviar nada.', en: 'You choose which projects use Ollama, the AI that runs on your Mac with no tokens spent and nothing sent.' },
    news: { kind: 'changed', es: 'En 0.7.2 la IA local era todo o nada; ahora se elige proyecto por proyecto.', en: 'In 0.7.2 the local AI was all or nothing; now it is chosen project by project.' },
    since: { kind: 'new', es: 'En 1.0 la IA local era todo o nada; ahora se elige proyecto por proyecto.', en: 'In 1.0 the local AI was all or nothing; now it is chosen project by project.' },
    points: {
      es: [
        'En Inicio › Ajustes › IA local hay tres modos: Automático (todos), Uno a uno (solo los que enciendes) y Manual (cada proyecto decide en sus Ajustes).',
        'Cambiar de modo no cambia a ningún proyecto que ya existe: solo decide cómo empiezan los nuevos.',
        'Un proyecto sin IA local sigue trabajando con sus agentes. Solo deja de usar la búsqueda por significado, el resumen de la memoria y @madre.',
      ],
      en: [
        'In Home › Settings › Local AI there are three modes: Automatic (all), One by one (only those you switch on) and Manual (each project decides in its Settings).',
        'Changing the mode changes no project that already exists: it only decides how new ones start.',
        'A project without the local AI keeps working with its agents; it only stops using search by meaning, the memory summary and @madre.',
      ],
    },
    keys: [[{ es: 'Elegir proyectos', en: 'Choose projects' }, { es: 'Ajustes › IA local', en: 'Settings › Local AI' }]],
    where: ['home'],
  },
  {
    id: 'phone',
    title: { es: 'Tu teléfono', en: 'Your phone' },
    lead: { es: 'Sigue donde ibas, desde el teléfono.', en: 'Carry on where you were, from your phone.' },
    news: { kind: 'new', es: 'En 0.7.2 MADRE solo se abría en la Mac.', en: 'In 0.7.2 MADRE only opened on the Mac.' },
    points: {
      es: [
        'Empareja tu teléfono con un código QR, en la misma red Wi‑Fi que tu Mac.',
        'Desde el teléfono llegas hasta #2; #3 y #4 se quedan en la Mac.',
        'Lo que empiezas en uno lo sigues en el otro: la Mac te ofrece continuar donde ibas.',
      ],
      en: [
        'Pair your phone with a QR code, on the same Wi‑Fi as your Mac.',
        'From the phone you reach up to #2; #3 and #4 stay on the Mac.',
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
    lead: { es: 'Los gestos y atajos de MADRE. Abre esta hoja con ? cuando quieras.', en: 'What is done with your hands. This sheet opens with ? at any moment.' },
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
