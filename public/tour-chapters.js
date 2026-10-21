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
    lead: { es: 'Aquí ves todos tus proyectos. Un clic abre uno.', en: 'Here you see all your projects. One click opens one.' },
    news: { kind: 'new', es: 'En 0.7.2 cada proyecto se abría por su cuenta con <code>madre start</code>; Inicio los reúne a todos.', en: 'In 0.7.2 each project opened on its own with <code>madre start</code>; Home gathers them all.' },
    points: {
      es: [
        'Agrega la carpeta de cada proyecto. Ninguno se abre hasta que tú lo pidas, y agregarla no cambia nada de lo que hay dentro.',
        'Con clic derecho o ⋯ en un proyecto lo anclas a la barra o lo quitas de MADRE. Su carpeta se queda como está.',
        'Acomoda Inicio a tu gusto: arrastra las tarjetas o haz clic derecho en una para cambiarla de tamaño. «Te necesita» y «Resumen reciente» te cuentan qué pasó mientras no estabas.',
      ],
      en: [
        'Add the folder of each project. None opens until you ask, and adding it changes nothing inside.',
        'Right-click or ⋯ on a project to pin it to the bar or take it out of MADRE. Its folder stays as it is.',
        'Arrange Home your way: drag the cards, or right-click one to change its size. «Needs you» and «Recent summary» tell you what happened while you were away.',
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
    lead: { es: 'Tarjetas que te dicen cómo va tu Mac y cada proyecto. Solo aparecen las que tienen algo que contar.', en: 'Cards that tell you how your Mac and each project are doing. Only those with something to tell show up.' },
    news: { kind: 'new', es: 'Nuevos: tarjetas con lo que pasa en tu Mac y en tus proyectos. Se agregan con clic derecho en Inicio › Agregar a Inicio.', en: 'New: cards with what happens on your Mac and in your projects. Add them with right-click in Home › Add to Home.' },
    since: { kind: 'new', es: 'Llegaron después de 1.0. Se agregan con clic derecho en Inicio › Agregar a Inicio.', en: 'They came after 1.0. Add them with right-click in Home › Add to Home.' },
    points: {
      es: [
        '<b>Recursos del sistema</b>: qué tan ocupada está tu Mac y cuánta memoria le queda libre.',
        '<b>Servidores</b>: las páginas y apps que tus proyectos tienen encendidas, y si responden. Para verlas, enciende la Vista previa en el proyecto.',
        '<b>Calidad de la memoria</b>: cuánto ha aprendido cada proyecto abierto y qué le falta.',
        '<b>Entrenamiento del Coordinador</b>: cuánto le falta al Coordinador para tener un modelo propio.',
        '<b>Modelos locales</b>: la IA que corre en tu Mac, sus modelos y cuántos ejemplos lleva cada proyecto para aprender a tu manera (8/300 quiere decir 8 de 300). Ahí mismo eliges qué proyectos la usan.',
      ],
      en: [
        '<b>System resources</b>: how busy your Mac is and how much memory it has free.',
        '<b>Servers</b>: the pages and apps your projects have running, and whether they answer. To see them, turn Preview on in the project.',
        '<b>Memory quality</b>: how much each open project has learned and what it still lacks.',
        '<b>Coordinator training</b>: how far the Coordinator is from a model of its own.',
        '<b>Local models</b>: the AI that runs on your Mac, its models and how many examples each project has to learn your way (8/300 means 8 of 300). Right there you choose which projects use it.',
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
    lead: { es: 'Dentro de un proyecto están sus chats, sus archivos y su memoria.', en: 'Inside a project are its chats, its files and its memory.' },
    news: { kind: 'changed', es: 'Hay una segunda barra y un panel para cambiar de proyecto. Además, los paneles se abren al lado o en una ventana que puedes mover.', en: 'The second bar and Switch project are new, and panels open beside you or in a window you move.' },
    points: {
      es: [
        'La barra de arriba te lleva a Inicio, a otro proyecto abierto o a Ajustes.',
        'El botón de proyectos te muestra los que tienes abiertos. Una luz te avisa si alguien te espera, si un agente está trabajando o si algo ya terminó.',
        'Puedes abrir otro chat al lado o en una ventana aparte, y mover cada ventana adonde menos estorbe.',
      ],
      en: [
        'The bar at the top takes you to Home, to another open project or to Settings.',
        'The projects key shows the ones you have open. A light tells you if someone is waiting for you, if an agent is working or if something is done.',
        'You can open another chat beside this one or in a window of its own, and move each window to where it is least in the way.',
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
    lead: { es: 'Escribes en la caja de abajo y el agente que elegiste te contesta.', en: 'You write in the box at the bottom and the agent you chose answers.' },
    news: { kind: 'changed', es: 'Llegan dos módulos: Esfuerzo sugerido, que te propone bajo la caja cuánto debe pensar cada agente, y GitHub, que agrega el comando /gh.', en: 'New here: the Suggested effort module, which proposes under the box how hard each agent should think, and /gh, with the GitHub module.' },
    points: {
      es: [
        'Elige con quién hablar en el círculo junto a la caja de texto. Debajo de la caja decides cuánto puede hacer, qué modelo usa y cuánto debe pensar.',
        'Atajos al escribir: @ para llamar a un agente, # para el permiso, ! para señalar un archivo y / para un comando.',
        'Cada respuesta se puede copiar, calificar o contestar.',
      ],
      en: [
        'Choose who to talk to in the circle beside the text box. Under the box you decide how much it may do, which model it uses and how hard it should think.',
        'Shortcuts as you type: @ to call an agent, # for the permission, ! to point at a file and / for a command.',
        'Every answer can be copied, rated or replied to.',
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
    lead: { es: 'Cada mensaje lleva un permiso: lo que el agente puede hacer con él.', en: 'Every message carries a permission: what the agent may do with it.' },
    news: { kind: 'changed', es: '#4 AIRLOCK ahora se llama #4 Acceso total. Tú eliges cómo confirmar #3 y #4, y una confirmación puede valer unos minutos.', en: '#4 AIRLOCK is now #4 Full access. You choose which key opens #3 and #4, and an accepted key can last a few minutes.' },
    points: {
      es: [
        'Hay cinco niveles, de menos a más: #0 Incógnito, #1 Solo conversar, #2 Crear, #3 Editar y #4 Acceso total.',
        'Con #3 y #4, MADRE te pide confirmar antes de que el agente toque algo, y con #4 te lo pide dos veces. Cómo confirmas lo eliges en Ajustes › Permisos.',
        'Si quieres, una confirmación puede durar unos minutos. Mientras dura, la ves junto a la caja de texto.',
      ],
      en: [
        'There are five levels, from least to most: #0 Incognito, #1 Chat only, #2 Create, #3 Edit and #4 Full access.',
        'With #3 and #4, MADRE asks you to confirm before the agent touches anything, and with #4 it asks twice. How you confirm, you choose in Settings › Permissions.',
        'If you like, a confirmation can last a few minutes. While it does, you see it beside the text box.',
      ],
    },
    keys: [[{ es: 'Elegir el modo al escribir', en: 'Choose the mode as you type' }, '#']],
    where: ['room'],
  },
  {
    id: 'coordinator',
    title: { es: 'El Coordinador', en: 'The Coordinator' },
    lead: { es: 'Un agente que ve todos tus proyectos y puede pasar instrucciones de uno a otro.', en: 'An agent that sees all your projects and can pass instructions from one to another.' },
    news: { kind: 'new', es: 'En 0.7.2 cada proyecto trabajaba por su cuenta; ahora un agente los ve todos.', en: 'In 0.7.2 each project worked on its own; now one agent sees them all.' },
    points: {
      es: [
        'Le hablas en su propio espacio, desde Inicio. Puede consultar lo que pasa en cada proyecto.',
        'Desde cualquier proyecto le preguntas con /bishop. Su respuesta solo la ves tú.',
        'Por su cuenta llega hasta #2. Si algo necesita #3 o #4, te deja una propuesta y tú decides en ese proyecto.',
      ],
      en: [
        'You talk to it in its own space, from Home. It can look up what is going on in each project.',
        'From any project you ask it with /bishop. Only you see its answer.',
        'On its own it goes up to #2. If something needs #3 or #4, it leaves you a proposal and you decide in that project.',
      ],
    },
    keys: [[{ es: 'Preguntarle desde un proyecto', en: 'Ask it from a project' }, '/bishop']],
    where: ['home'],
  },
  {
    id: 'links',
    title: { es: 'Conexiones', en: 'Connections' },
    lead: { es: 'Un proyecto puede aprender de otro, si tú lo permites.', en: 'One project can learn from another, if you allow it.' },
    news: { kind: 'new', es: 'En 0.7.2, «Conexiones» era iniciar sesión de tus agentes; ahora une dos proyectos.', en: 'In 0.7.2, «Connections» was signing your agents in; now it joins two projects.' },
    points: {
      es: [
        'Tú firmas cada conexión: qué puede consultar, por cuánto tiempo y si el Coordinador puede dar instrucciones.',
        'Solo se comparten notas que ya se usan, sin datos privados. Tus archivos y tus chats nunca salen del proyecto.',
        'Puedes cancelar una conexión cuando quieras desde Conexiones, en Inicio.',
      ],
      en: [
        'You sign every connection: what it may look up, for how long and whether the Coordinator may give instructions.',
        'Only notes already in use are shared, without private data. Your files and your chats never leave the project.',
        'You can cancel a connection whenever you want from Connections, in Home.',
      ],
    },
    since: { kind: 'changed', es: 'El mapa de Conexiones en Inicio ahora es un cielo: cada proyecto es una estrella y cada conexión, un flujo de luz. Ábrelo en una ventana para explorarlo.', en: 'The Connections map in Home is now a sky: every project is a star and every connection a flow of light. Open it in a window to explore it.' },
    keys: [[{ es: 'Conectar en el Mapa de proyectos', en: 'Connect in the Project map' }, { es: 'arrastrar uno sobre otro', en: 'carry one onto another' }]],
    where: ['home'],
  },
  {
    id: 'maps',
    title: { es: 'Los mapas', en: 'The maps' },
    lead: { es: 'Dos dibujos: lo que MADRE recuerda de un proyecto y cómo se conectan tus proyectos.', en: 'Two drawings: what MADRE remembers about a project, and how your projects connect.' },
    news: { kind: 'changed', es: 'NOSTROMO ahora es el Mapa de memoria, con su tecla en la barra; el Mapa de proyectos es nuevo.', en: 'NOSTROMO is now the Memory map, with its key on the bar; the Project map is new.' },
    points: {
      es: [
        'El Mapa de memoria, en la barra del proyecto, dibuja como una estrella cada cosa que MADRE recuerda de él.',
        'El Mapa de proyectos, en Inicio, muestra tus proyectos y sus conexiones. Necesita una pantalla de al menos 900 px de ancho.',
        'Para conectar dos proyectos, arrastra uno sobre el otro en el Mapa de proyectos.',
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
    lead: { es: 'En Ajustes cambias cómo se ve y cómo trabaja MADRE. Diagnóstico te ayuda cuando algo falla.', en: 'In Settings you change how MADRE looks and works. Diagnostics helps when something fails.' },
    since: { kind: 'changed', es: 'Los Ajustes de Inicio suman IA local. En Ajustes › Agentes cada agente se pliega, y OpenCode agrupa sus modelos por proveedor.', en: 'Home\'s Settings gain Local AI. In Settings › Agents each agent folds, and OpenCode groups its models by provider.' },
    news: { kind: 'new', es: 'Lo que estaba repartido entre MU/TH/UR, ⚙ CONEXIONES y la barra ahora está en una ventana con buscador, y Diagnóstico te da la solución.', en: 'What was spread across MU/TH/UR, ⚙ CONNECTIONS and the bar now lives in one window with a search, and Diagnostics gives you the remedy.' },
    points: {
      es: [
        'Ábrelos con ⌘ , y escribe / para buscar cualquier ajuste. Lo que cambias se aplica en ese momento.',
        'En Apariencia eliges los colores, el fondo, el tema claro u oscuro y el idioma.',
        'Si algo no funciona, abre Diagnóstico y cuéntale qué pasa con tus palabras: te dice qué hacer y te da el botón para arreglarlo.',
      ],
      en: [
        'Open them with ⌘ , and type / to find any setting. What you change applies right away.',
        'In Appearance you choose the colours, the background, light or dark and the language.',
        'If something does not work, open Diagnostics and tell it what happens in your own words: it says what to do and gives you the key that fixes it.',
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
    lead: { es: 'Funciones que enciendes cuando las necesitas. Apagadas, no hacen nada.', en: 'Features you turn on when you need them. While off, they do nothing.' },
    news: { kind: 'changed', es: 'Ahora son un tablero de mosaicos, como apps. ash ahora se llama Ahorro de tokens, y llegan Esfuerzo sugerido y GitHub.', en: 'They are now a board of tiles, like apps; ash is Token saver, and Suggested effort and GitHub join them.' },
    points: {
      es: [
        'Cada mosaico tiene su interruptor. Tócalo para ver qué hace antes de encenderlo.',
        'Algunos, como Ahorro de tokens, Esfuerzo sugerido y Notas, se abren en su propia ventana.',
        'Antes de encender uno, MADRE te dice qué va a escribir y qué necesita. En el Mercado encuentras más.',
      ],
      en: [
        'Every tile has its switch. Press it to see what it does before you turn it on.',
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
    lead: { es: 'Una IA que corre en tu Mac, gratis y sin internet. Tú eliges qué proyectos la usan.', en: 'An AI that runs on your Mac, free and offline. You choose which projects use it.' },
    news: { kind: 'changed', es: 'En 0.7.2 la IA local era todo o nada; ahora se elige proyecto por proyecto.', en: 'In 0.7.2 the local AI was all or nothing; now it is chosen project by project.' },
    since: { kind: 'new', es: 'En 1.0 la IA local era todo o nada; ahora se elige proyecto por proyecto.', en: 'In 1.0 the local AI was all or nothing; now it is chosen project by project.' },
    points: {
      es: [
        'Se configura en Inicio › Ajustes › IA local. Ahí eliges si la usan todos tus proyectos, solo los que tú enciendas, o si cada proyecto lo decide en sus Ajustes.',
        'MADRE te recomienda los modelos que caben en tu equipo y te dice cuánto pesan antes de descargarlos.',
        'Un proyecto sin IA local sigue trabajando con tus agentes. Solo deja de buscar por significado, de resumir su memoria y de usar a @madre.',
      ],
      en: [
        'It is set in Home › Settings › Local AI. There you choose whether all your projects use it, only the ones you switch on, or each project decides in its Settings.',
        'MADRE recommends the models that fit your computer and tells you how big they are before you download them.',
        'A project without the local AI keeps working with your agents. It only stops searching by meaning, summing up its memory and using @madre.',
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
    lead: { es: 'Todos los atajos en una hoja. La abres con la tecla ? en cualquier pantalla.', en: 'Every shortcut on one sheet. The ? key opens it on any screen.' },
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
