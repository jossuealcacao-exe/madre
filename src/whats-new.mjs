// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// What a version brings, said to the person who just got it.
//
// After an update the room opens once on a sheet of what is new: a few things, each said plainly,
// each with where to find it, and a way to read every change. Once per version, for everyone who
// came from an older one; never on a first install, where the tour does that job.
//
// Whether it has been seen lives in ~/.pulse/whats-new.json and not in the browser: the page's
// storage belongs to one port, and the same person opening the room on another port has still
// seen it. Nothing here touches the network; the link to every change is the release page the
// room already knows (updates.mjs).
//
// The notes are written by hand, version by version, in both languages the room speaks. A minor
// version cannot be closed without them (scripts/release.mjs); a patch may ship without, and then
// nothing opens.

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compareVersions } from './updates.mjs';

const FILE = 'whats-new.json';

// `icon` names one of the room's 8-bit icons. `where` says where it lives, in the words the
// screens use. `more` is the one thing nobody is told how to find.
//
// From 1.0 a sheet is a board: each item also has an `id`, a picture (`image`, under
// /assets/news/<major.minor>/, whitelisted in server.mjs) and an `action`, the place «Take me
// there» opens, or null when there is nowhere to go. The page knows exactly these places.
export const NEWS_ACTIONS = ['settings', 'errors', 'mother', 'intents', 'permissions', 'github', 'bar', 'modules', 'nostromo', 'room', 'looks', 'finder'];

export const NOTES = {
  // 1.1 (2026-10-28): said to whoever comes from 1.0.x, on Home — the first screen of `npx madre` —
  // and in a project if Home was not opened first. Few things, the ones that change how MADRE looks.
  '1.1.0': {
    intro: {
      es: 'MADRE 1.1 se ordena como una app de chat: Inicio para todo, tus conversaciones a un lado y un Mercado para sumar funciones. Desde esta versión usa la licencia BSL: sigue gratis para personas y equipos de hasta 10.',
      en: 'MADRE 1.1 is laid out like a chat app: Home for everything, your conversations to one side and a Market to add features. From this version it uses the BSL license: still free for individuals and teams of up to 10.',
    },
    items: [
      {
        id: 'home',
        icon: 'home',
        image: { es: '/assets/news/1.1/es/home.webp', en: '/assets/news/1.1/en/home.webp' },
        title: { es: 'Inicio: todo en un lugar', en: 'Home: everything in one place' },
        body: {
          es: 'Al abrir MADRE llegas a Inicio: tus proyectos, el Coordinador y lo que te espera. A la izquierda tienes tus chats y tus proyectos, como en las apps de chat.',
          en: 'Opening MADRE takes you to Home: your projects, the Coordinator and what is waiting for you. Your chats and projects are on the left, like in chat apps.',
        },
        where: { es: 'Lo primero que ves al abrir MADRE', en: 'The first thing you see when you open MADRE' },
        action: null,
      },
      {
        id: 'chats',
        icon: 'list',
        image: { es: '/assets/news/1.1/es/chats.webp', en: '/assets/news/1.1/en/chats.webp' },
        title: { es: 'Tus conversaciones, a un lado', en: 'Your conversations, to one side' },
        body: {
          es: 'Cada proyecto guarda sus chats en la columna de la izquierda. Puedes abrir dos lado a lado, o uno en su propia ventana.',
          en: 'Each project keeps its chats in the column on the left. You can open two side by side, or one in its own window.',
        },
        where: { es: 'La columna de la izquierda de cada proyecto', en: 'The left column of every project' },
        action: null,
      },
      {
        id: 'market',
        icon: 'grid',
        image: { es: '/assets/news/1.1/es/market.webp', en: '/assets/news/1.1/en/market.webp' },
        title: { es: 'El Mercado', en: 'The Market' },
        body: {
          es: 'Suma funciones con un clic: Notas, Recordatorios, Vista previa, Antes de subir y más. Cada módulo te dice qué hace antes de instalarlo.',
          en: 'Add features in one click: Notes, Reminders, Preview, Before you push and more. Every module tells you what it does before you install it.',
        },
        where: { es: 'Mercado, en la columna de la izquierda', en: 'Market, in the left column' },
        action: 'modules',
      },
      {
        id: 'welcome',
        icon: 'check',
        image: { es: '/assets/news/1.1/es/welcome.webp', en: '/assets/news/1.1/en/welcome.webp' },
        title: { es: 'Una bienvenida paso a paso', en: 'A step-by-step welcome' },
        body: {
          es: 'Conecta tus agentes, pon una IA gratis en tu computadora y prepara la memoria, sin usar la terminal. Puedes volver a verla cuando quieras.',
          en: 'Connect your agents, put a free AI on your computer and get the memory ready, without the terminal. You can see it again whenever you like.',
        },
        where: { es: 'Ajustes de Inicio › Ver la bienvenida otra vez', en: 'Home settings › See the welcome again' },
        action: null,
      },
      {
        id: 'permissions',
        icon: 'lock',
        image: { es: '/assets/news/1.1/es/permissions.webp', en: '/assets/news/1.1/en/permissions.webp' },
        title: { es: 'Permisos más simples', en: 'Simpler permissions' },
        body: {
          es: '#3 Editar te pide confirmar y #4 Acceso total, confirmar dos veces. También puedes dejarlos abiertos más tiempo, para trabajar sin interrupciones.',
          en: '#3 Edit asks you to confirm and #4 Full access, to confirm twice. You can also leave them open for longer, to work without interruptions.',
        },
        where: { es: 'El botón de permiso, junto a la caja donde escribes', en: 'The permission button, next to the box you type in' },
        action: 'permissions',
      },
      {
        id: 'maps',
        icon: 'orbit',
        image: { es: '/assets/news/1.1/es/maps.webp', en: '/assets/news/1.1/en/maps.webp' },
        title: { es: 'Mapas que crecen con lo que saben', en: 'Maps that grow with what they know' },
        body: {
          es: 'Tus proyectos y tus memorias se ven como planetas o como neuronas, y crecen mientras más saben.',
          en: 'Your projects and memories show as planets or as neurons, and grow the more they know.',
        },
        where: { es: 'Mapa de memoria y Mapa de proyectos', en: 'Memory map and Project map' },
        action: 'nostromo',
      },
      {
        id: 'privacy',
        icon: 'bell',
        image: { es: '/assets/news/1.1/es/privacy.webp', en: '/assets/news/1.1/en/privacy.webp' },
        title: { es: 'Errores anónimos para mejorar MADRE', en: 'Anonymous errors to improve MADRE' },
        body: {
          es: 'MADRE manda cada día qué falló y cuánto se usa, sin nada de lo que escribes ni de tus proyectos. Lo apagas cuando quieras.',
          en: 'Once a day MADRE sends what failed and how much it is used, with nothing you write and nothing from your projects. Turn it off whenever you like.',
        },
        where: { es: 'Ajustes › Actualizaciones y errores', en: 'Settings › Updates and errors' },
        action: 'errors',
      },
    ],
  },
  '1.0.0': {
    intro: {
      es: 'MADRE 1.0 se ve y se usa como un producto: todo lo que configuras en un solo lugar, ayudas que aprenden de cómo trabajas y un proyecto que acomodas a tu gusto.',
      en: 'MADRE 1.0 looks and works like a product: everything you configure in one place, help that learns from how you work, and a project you arrange your way.',
    },
    items: [
      {
        id: 'settings',
        icon: 'gear',
        image: '/assets/news/1.0/settings.webp',
        title: { es: 'Ajustes en una ventana', en: 'Settings in one window' },
        body: {
          es: 'Todo lo que configuras está junto: apariencia, proyecto, agentes, memoria, permisos, privacidad y versión. Cada tarjeta dice cómo está antes de abrirla, y lo que más usas se cambia ahí mismo. Un buscador encuentra cualquier ajuste.',
          en: 'Everything you configure is together: appearance, project, agents, memory, permissions, privacy and version. Each card tells you how things stand before you open it, and what you use most changes right there. A search finds any setting.',
        },
        where: { es: 'El botón de ajustes de la barra · también ⌘,', en: 'The settings button in the bar · also ⌘,' },
        action: 'settings',
      },
      {
        id: 'mother',
        icon: 'check',
        image: '/assets/news/1.0/mother.webp',
        title: { es: 'Diagnóstico te da la solución', en: 'Diagnostics gives you the remedy' },
        body: {
          es: 'Describe con tus palabras lo que pasa y te dice qué hacer, con la tecla que lo resuelve sin salir del proyecto. Lo que falló en este proyecto aparece primero y marcado, para que no tengas que adivinar.',
          en: 'Describe what is happening in your own words and you see what to do, with the key that fixes it without leaving the project. What failed in this project shows first and marked, so you do not have to guess.',
        },
        where: { es: 'El botón DIAGNÓSTICO de la barra', en: 'The DIAGNOSTICS button in the bar' },
        action: 'mother',
      },
      {
        id: 'intents',
        icon: 'chip',
        image: '/assets/news/1.0/intents.webp',
        title: { es: 'Intenciones aprende de tu uso', en: 'Intenciones learns from how you work' },
        body: {
          es: 'Mientras escribes, sugiere cuánto debe pensar cada agente para lo que pides, según cómo has trabajado y sin gastar tokens. Puede proponerte un nivel más bajo para un solo mensaje y, si se quedó corto, vuelve a subir.',
          en: 'As you write, it suggests how hard each agent should think for what you ask, learned from your own turns at no token cost. It can offer a lower level for a single message, and if that fell short it goes back up.',
        },
        where: { es: 'Bajo la caja de texto · Módulos › Intenciones', en: 'Under the message box · Modules › Intenciones' },
        action: 'intents',
      },
      {
        id: 'permissions',
        icon: 'lock',
        image: '/assets/news/1.0/permissions.webp',
        title: { es: 'Permisos a tu manera', en: 'Permissions your way' },
        body: {
          es: 'Elige cómo confirmas #3 y #4: con el nombre del proyecto, con una frase tuya o, en #3, solo confirmando. Una confirmación puede valer unos minutos, y el permiso máximo de cada agente cabe en una sola tabla.',
          en: 'Choose what unlocks #3 and #4: the project name, a phrase of your own or, for #3, just a confirmation. An accepted key can hold for a few minutes, and every agent’s highest mode fits in one table.',
        },
        where: { es: 'Ajustes › Permisos', en: 'Settings › Permissions' },
        action: 'permissions',
      },
      {
        id: 'github',
        icon: 'branch',
        image: '/assets/news/1.0/github.webp',
        title: { es: 'GitHub en el proyecto', en: 'GitHub in the project' },
        body: {
          es: 'Revisa pull requests, pruebas automáticas (CI) e issues con /gh, usando la sesión de gh que ya tienes. Antes de publicar algo te muestra qué saldría y te pregunta; los agentes solo publican en #4.',
          en: 'Check pull requests, CI and issues with /gh, using the gh session you already have. Before anything is posted it shows you what would go out and asks, and agents only post in #4.',
        },
        where: { es: 'Módulos › GitHub · luego /gh en la caja', en: 'Modules › GitHub · then /gh in the box' },
        action: 'github',
      },
      {
        id: 'bar',
        icon: 'bars',
        image: '/assets/news/1.0/bar.webp',
        title: { es: 'Tu barra, a tu gusto', en: 'Your bar, your way' },
        body: {
          es: 'Clic derecho en la barra y los íconos tiemblan: quita con − lo que no usas y agrega Memoria, Ahorro de tokens, Intenciones, IA local o cualquier módulo con ventana.',
          en: 'Right-click the bar and the icons jiggle: take off what you do not use with − and add Memory, Token saver, Intenciones, Local AI or any module with a window.',
        },
        where: { es: 'Clic derecho en la barra · o déjala presionada', en: 'Right-click the bar · or press and hold it' },
        action: 'bar',
      },
      {
        id: 'modules',
        icon: 'grid',
        image: '/assets/news/1.0/modules.webp',
        title: { es: 'Módulos como apps', en: 'Modules as apps' },
        body: {
          es: 'Los módulos son un tablero de mosaicos, cada uno con su interruptor y su ficha. Ahorro de tokens, Intenciones e IA local se abren en su propia ventana, y las descargas e instalaciones muestran su avance real.',
          en: 'Modules are a board of tiles, each with its switch and its sheet. Token saver, Intenciones and Local AI open in a window of their own, and downloads and installs show their real progress.',
        },
        where: { es: 'El botón de módulos de la barra', en: 'The modules button in the bar' },
        action: 'modules',
      },
      {
        id: 'nostromo',
        icon: 'orbit',
        image: '/assets/news/1.0/nostromo.webp',
        title: { es: 'El Mapa de memoria a un clic', en: 'The Memory map one click away' },
        body: {
          es: 'El Mapa de memoria tiene su propio botón en la barra. Los vínculos entre memorias se ven aunque Ollama esté apagado.',
          en: 'The memory brain has its own button in the bar. The links between memories show even with Ollama off.',
        },
        where: { es: 'El botón Mapa de memoria de la barra', en: 'The Memory map button in the bar' },
        action: 'nostromo',
      },
      {
        id: 'room',
        icon: 'home',
        image: '/assets/news/1.0/room.webp',
        title: { es: 'El proyecto, acomodado a tu gusto', en: 'The project, arranged your way' },
        body: {
          es: 'Cada panel se abre al lado o en una ventana que mueves. Varias conversaciones trabajan a la vez, los servidores de tu proyecto corren dentro del proyecto y el visor también edita código.',
          en: 'Every panel opens beside you or in a window you move. Several conversations work at once, your project’s servers live inside the project, and the viewer edits code.',
        },
        where: { es: 'El encabezado de cada panel · Ajustes › Proyecto y respuestas', en: 'The header of every panel · Settings › Project and turns' },
        action: 'room',
      },
      {
        id: 'looks',
        icon: 'star',
        image: '/assets/news/1.0/looks.webp',
        title: { es: '17 colores de acento y 12 fondos', en: '17 accents and 12 wallpapers' },
        body: {
          es: 'Cada uno pensado para tema claro y oscuro. Las respuestas se leen sobre vidrio esmerilado encima de tu fondo, y las tarjetas tienen un relieve suave.',
          en: 'Each one made for light and dark themes. Replies read on frosted glass over your wallpaper, and cards stand out in soft relief.',
        },
        where: { es: 'Ajustes › Apariencia', en: 'Settings › Appearance' },
        action: 'looks',
      },
      {
        id: 'alerts',
        icon: 'bell',
        image: '/assets/news/1.0/alerts.webp',
        title: { es: 'Alertas más claras', en: 'Clearer alerts' },
        body: {
          es: 'Las confirmaciones de #3 y #4 llegan en una sola hoja clara, con lo que vas a aprobar a la vista. El menú «revisarlo con» ya no se corta.',
          en: 'Confirmations and the keys for #3 and #4 arrive as one clear sheet, with what you are approving in view. The “review it with” menu is no longer cut off.',
        },
        where: { es: 'Aparecen solas cuando el proyecto necesita tu palabra', en: 'They appear on their own when the project needs your word' },
        action: null,
      },
      {
        id: 'finder',
        icon: 'list',
        image: '/assets/news/1.0/finder.webp',
        title: { es: 'Archivos nuevos desde Finder', en: 'New files from the Finder' },
        body: {
          es: 'Una tecla junto al buscador crea un archivo y lo abre en el visor, listo para escribir. Las carpetas que falten se crean solas.',
          en: 'A key beside the search creates a file and opens it in the viewer, ready to write. Any missing folders are made for you.',
        },
        where: { es: 'Finder › junto al buscador', en: 'Finder › next to the search' },
        action: 'finder',
      },
    ],
  },
  '0.7.0': {
    intro: {
      es: 'Esta versión le da forma a la memoria de la sala: ahora la ves en tres dimensiones, la lees en un tablero y cada memoria te dice cómo está.',
      en: 'This version gives the room’s memory a shape: you see it in three dimensions, read it on a dashboard, and every memory tells you how it is doing.',
    },
    items: [
      {
        icon: 'orbit',
        title: { es: 'NOSTROMO en tres dimensiones', en: 'NOSTROMO in three dimensions' },
        body: {
          es: 'El archivo de memorias tiene forma de cerebro y lo giras con el ratón. Al elegir una memoria, la sala la pone de frente, la fija con una mira y atenúa todo lo demás.',
          en: 'The memory archive is shaped like a brain and you turn it with the mouse. Choose a memory and the room brings it to face you, locks a sight on it and dims everything else.',
        },
        where: { es: 'MU/TH/UR › NOSTROMO · arrastra para girar, Shift + arrastra para moverte', en: 'MU/TH/UR › NOSTROMO · drag to turn, Shift + drag to move' },
      },
      {
        icon: 'star',
        title: { es: 'Cada memoria es una estrella', en: 'Every memory is a star' },
        body: {
          es: 'Su brillo dice cuánto la usa la sala; su superficie, si la confirmaste, si nadie la ha juzgado, si resultó falsa o si se está enfriando. En el centro, MOTHER: magma vivo.',
          en: 'Its brightness says how much the room relies on it; its surface, whether you confirmed it, nobody has judged it yet, it turned out false, or it is cooling. At the centre, MOTHER: living magma.',
        },
        where: { es: 'MU/TH/UR › NOSTROMO', en: 'MU/TH/UR › NOSTROMO' },
      },
      {
        icon: 'bars',
        title: { es: 'Un tablero para la memoria', en: 'A dashboard for memory' },
        body: {
          es: 'Lo que el archivo hizo día a día, de qué está hecho, qué tan bien contesta y cuál es el siguiente paso, en una sola pantalla.',
          en: 'What the archive did day by day, what it is made of, how well it answers and what to do next, on a single screen.',
        },
        where: { es: 'MU/TH/UR › MEMORIA', en: 'MU/TH/UR › MEMORY' },
      },
      {
        icon: 'chip',
        title: { es: 'Ideas para tu propio módulo', en: 'Ideas for a module of your own' },
        body: {
          es: 'Escribe /module y elige entre ocho ideas listas para editar: comandos, conectores con tus servicios y fichas propias. Un agente lo escribe y tú lo revisas antes de instalarlo.',
          en: 'Type /module and pick one of eight ideas ready to edit: commands, connectors to your services and cards of your own. An agent writes it and you review it before it is installed.',
        },
        where: { es: 'En la caja de texto · escribe /module', en: 'In the message box · type /module' },
      },
      {
        icon: 'stop',
        title: { es: 'Detén una respuesta, no la sala', en: 'Stop one reply, not the room' },
        body: {
          es: 'Un botón DETENER detiene a un solo agente a mitad de su respuesta; los demás siguen trabajando.',
          en: 'A STOP button halts one agent in the middle of its reply; the others keep working.',
        },
        where: { es: 'En la fila del turno en curso, junto a los segundos', en: 'On the row of the turn in progress, next to the seconds' },
      },
      {
        icon: 'lock',
        title: { es: 'Más protección desde el navegador', en: 'More protection from the browser' },
        body: {
          es: 'Ninguna página web que tengas abierta puede ya instalar un módulo en tu sala ni leer de ella.',
          en: 'No web page you have open can install a module in your room or read from it anymore.',
        },
        where: { es: 'Siempre activo; no tienes que hacer nada', en: 'Always on; there is nothing to set up' },
      },
    ],
    more: {
      icon: 'ufo',
      title: { es: 'Una cosa más…', en: 'One more thing…' },
      body: {
        es: 'Alguien más viaja a bordo. No está en ningún menú ni en ningún manual. Dicen que solo baja cuando llamas a la nave por su nombre, y por nada más.',
        en: 'Someone else travels on board. Not in any menu, not in any manual. They say it only comes down when you call the ship by its name, and nothing else.',
      },
    },
  },
};

export const notesFor = (version) => NOTES[version] ?? null;
// The newest version that has a sheet: what a preview opens on a copy whose own version has none.
export const newestNotes = () => Object.keys(NOTES).sort(compareVersions).at(-1) ?? null;

// Whether this person should see the sheet for this version. Someone who has seen an older one,
// or who used the room before the sheet existed, sees it once; a first install never does.
export function shouldShow({ version, seen = null, returning = false }) {
  if (!notesFor(version)) return false;
  if (seen) return compareVersions(version, seen) > 0;
  return Boolean(returning);
}

export async function readSeen(root) {
  try {
    const value = JSON.parse(await readFile(join(root, FILE), 'utf8'))?.seen;
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

export async function markSeen(root, version) {
  await mkdir(root, { recursive: true });
  await writeFile(join(root, FILE), `${JSON.stringify({ seen: version }, null, 2)}\n`);
}

// Read at start-up, before this run creates anything: a room that already had rooms used MADRE
// before. A first install has nothing to catch up on, so it is marked as seen and never shown.
export async function bootWhatsNew({ root, version }) {
  const seen = await readSeen(root);
  if (seen) return { seen, returning: true };
  let returning = false;
  if (existsSync(join(root, 'rooms'))) {
    try { returning = (await readdir(join(root, 'rooms'))).length > 0; } catch { returning = false; }
  }
  if (!returning) await markSeen(root, version);
  return { seen: returning ? null : version, returning };
}

// `any`: the sheet for this version whether or not it was seen, for when it is asked for.
export async function whatsNew({ root, version, returning, any = false }) {
  const seen = await readSeen(root);
  const show = shouldShow({ version, seen, returning });
  return { version, show, notes: show || any ? notesFor(version) : null };
}
