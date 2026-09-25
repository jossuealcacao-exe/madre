// MADRE en español.
//
// La clave es la frase en inglés tal como está escrita en el código; el valor es lo que dice
// MADRE. No es una traducción literal: es la misma voz en español neutro. Lo que no se traduce
// nunca —los nombres propios de la nave (MU/TH/UR, NOSTROMO, CODE000), los nombres de los modos
// (GHOST, EXCHANGE, CREATE, CONTROL, AIRLOCK), los comandos, las rutas y los identificadores—
// se queda como está, aquí y en la boca de la tripulación.
//
// Una frase que todavía no está aquí sale en inglés, entera. Eso es a propósito.

export const ES = {
  // El compositor: lo primero que una persona lee de MADRE.
  'Type here, human. Ask the room…': 'Escribe aquí, humana. Pregúntale a la sala…',
  'CREATE on: what to make. New files land where they belong in the project; nothing existing changes.':
    'CREATE encendido: qué hacer. Los archivos nuevos caen donde les toca en el proyecto; nada de lo que ya existe cambia.',
  'Compact prose. Nothing you write is altered; only the answers get shorter.':
    'Prosa compacta. Nada de lo que escribes se altera; solo se acortan las respuestas.',
  'Off the record. Ask anything; nothing is saved, nobody else will remember it.':
    'Fuera de registro. Pregunta lo que sea; no se guarda nada y nadie más lo va a recordar.',
  'Control armed. Say what to change in the project; every action runs without asking.':
    'Control armado. Di qué cambiar en el proyecto; cada acción corre sin preguntar.',
  'Airlock open. Commands run; pushes and deploys leave the ship. Say exactly what should go out.':
    'Esclusa abierta. Los comandos corren; los push y los deploys salen de la nave. Di exactamente qué debe salir.',
  'Type here, human. MOTHER is listening.': 'Escribe aquí, humana. MOTHER está escuchando.',
  'Ask what the room remembers. @madre answers from memory with citations; it does not act.':
    'Pregunta qué recuerda la sala. @madre contesta desde la memoria con citas; no actúa.',

  // Los cinco modos de permiso. El nombre no se traduce; lo que hace, sí.
  'Off the record. Nothing is saved; gone on reload.': 'Fuera de registro. No se guarda nada; se va al recargar.',
  'Read the project and talk to the room. Writes nothing.': 'Lee el proyecto y habla con la sala. No escribe nada.',
  'Add new files where they belong in the project. Existing files stay untouched.':
    'Agrega archivos nuevos donde les toca en el proyecto. Los que ya existen no se tocan.',
  'Edit the project itself, no approval per action. Override required.':
    'Edita el proyecto mismo, sin aprobar acción por acción. Requiere anulación.',
  'Run commands, push, deploy. What leaves the ship does not come back. Override, twice.':
    'Corre comandos, hace push, despliega. Lo que sale de la nave no regresa. Anulación, dos veces.',


  // ── LA BARRA ──────────────────────────────────────────────────────────────
  'Project room': 'Sala del proyecto',
  'Live updates': 'Conexión en vivo',
  'connecting': 'conectando',
  'live': 'en vivo',
  'reconnecting': 'reconectando',
  'A newer MADRE is on npm': 'Hay una MADRE más nueva en npm',
  'STOPALL · halt every plan and every agent turn': 'STOPALL · detén todos los planes y todos los turnos',
  'Modules · optional integrations for this project': 'Módulos · integraciones opcionales para este proyecto',
  'Troubleshooting · MU/TH/UR': 'Diagnóstico · MU/TH/UR',
  'Project files panel': 'Panel de archivos del proyecto',
  'Conversations in this project': 'Conversaciones de este proyecto',
  'Theme · auto (follows the system)': 'Tema · automático (sigue al sistema)',
  'Theme · light': 'Tema · claro',
  'Theme · dark': 'Tema · oscuro',

  // ── EL PUENTE: primer contacto ────────────────────────────────────────────
  'INTERFACE · FIRST CONTACT': 'INTERFAZ · PRIMER CONTACTO',
  'One agent is enough to open the room.': 'Con un agente basta para abrir la sala.',
  'MADRE works with the AI coding agents on this computer, using the session each one already has. Install one here and sign in: the room opens by itself, no terminal.':
    'MADRE trabaja con los agentes de código que ya están en esta computadora, usando la sesión que cada uno tiene. Instala uno aquí y firma: la sala se abre sola, sin terminal.',
  'BACK TO THE ROOM': 'VOLVER A LA SALA',
  'Nothing is installed without you pressing it, and the exact command is always shown. Same diagnosis in a terminal:':
    'Nada se instala sin que tú lo aprietes, y el comando exacto siempre está a la vista. El mismo diagnóstico en una terminal:',
  'NOT INSTALLED': 'NO INSTALADO',
  'NO ADAPTER': 'SIN ADAPTADOR',
  'READY': 'LISTO',
  'SIGNED OUT': 'SIN FIRMAR',
  'Not on this computer.': 'No está en esta computadora.',
  'Not on this computer · {command}': 'No está en esta computadora · {command}',
  'version unknown': 'versión desconocida',
  'FREE WAY IN': 'ENTRADA GRATIS',
  'PASTE KEY': 'PEGAR LLAVE',
  'signs in from its own prompt:': 'firma desde su propia terminal:',
  'Or do it from a terminal: {command}': 'O hazlo desde una terminal: {command}',

  // ── EL COMPOSITOR ─────────────────────────────────────────────────────────
  'Creation lease: let the agent create files for this request, only inside .pulse/out/':
    'Permiso de creación: deja que el agente cree archivos para esta petición, solo dentro de .pulse/out/',
  'Ash: ask every agent for compact prose. Nothing you write is altered.':
    'Ash: pídele a cada agente prosa compacta. Nada de lo que escribes se altera.',
  'Attach an image or file (or drop it here)': 'Adjunta una imagen o un archivo (o suéltalo aquí)',
  'Send': 'Enviar',
  'Agent': 'Agente',
  'Consultation mode · Project writes stay under your control: agents create files only with CREATE or an opt-in standing lease, only inside .pulse/out/ · Content an agent reads may be sent to its configured model provider.':
    'Modo consulta · Lo que se escribe en el proyecto sigue bajo tu control: los agentes crean archivos solo con CREATE o con un permiso permanente que tú actives, y solo dentro de .pulse/out/ · Lo que un agente lee puede viajar a su proveedor de modelo.',

  // Quién habla, delante del campo.
  'HUMAN ›': 'HUMANA ›',
  'HUMAN · GHOST ›': 'HUMANA · GHOST ›',
  'HUMAN · CREATE ›': 'HUMANA · CREATE ›',
  'CREW · EXPENDABLE ›': 'TRIPULACIÓN · PRESCINDIBLE ›',
  'INTRUDER ›': 'INTRUSA ›',

  // ── LA PÁGINA EN BLANCO ───────────────────────────────────────────────────
  'Explain {project} to me: what it does, how it runs, and where the important code lives.':
    'Explícame {project}: qué hace, cómo corre y dónde vive el código que importa.',
  'Read the project and name the three things most likely to break. Say why, with file and line.':
    'Lee el proyecto y dime las tres cosas que tienen más probabilidad de romperse. Di por qué, con archivo y línea.',
  'What would you change first in {project}, and what would you not touch?':
    '¿Qué cambiarías primero en {project}, y qué no tocarías?',

  // ── LAS CONVERSACIONES ────────────────────────────────────────────────────
  'CONVERSATIONS': 'CONVERSACIONES',
  'NEW CONVERSATION': 'NUEVA CONVERSACIÓN',
  'Start another conversation in this project. The memory stays.':
    'Abre otra conversación en este proyecto. La memoria se queda.',
  'ONE PROJECT, ONE MEMORY. EVERY CONVERSATION FEEDS THE SAME ARCHIVE.':
    'UN PROYECTO, UNA MEMORIA. CADA CONVERSACIÓN ALIMENTA EL MISMO ARCHIVO.',
  'FILES': 'ARCHIVOS',

  // El interruptor de idioma.
  'Interface in English': 'Interfaz en inglés',
  'Interface in Spanish': 'Interfaz en español',
};
