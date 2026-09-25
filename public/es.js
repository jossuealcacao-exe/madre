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
  'Type here, human. Ask the room…': 'Escribe aquí, humano. Pregúntale a la sala…',
  'CREATE on: what to make. New files land where they belong in the project; nothing existing changes.':
    'CREATE encendido: di qué crear. Los archivos nuevos caen donde les toca en el proyecto; nada de lo que ya existe se toca.',
  'Compact prose. Nothing you write is altered; only the answers get shorter.':
    'Respuestas compactas. Lo que tú escribes no cambia; lo que se acorta son las respuestas.',
  'Off the record. Ask anything; nothing is saved, nobody else will remember it.':
    'Fuera de registro. Pregunta lo que quieras: no se guarda nada y nadie más se va a acordar.',
  'Control armed. Say what to change in the project; every action runs without asking.':
    'Control armado. Di qué cambiar en el proyecto: cada acción se ejecuta sin pedirte permiso.',
  'Airlock open. Commands run; pushes and deploys leave the ship. Say exactly what should go out.':
    'Esclusa abierta. Aquí se ejecutan comandos y los push y los deploys salen de la nave. Di exactamente qué debe salir.',
  'Type here, human. MOTHER is listening.': 'Escribe aquí, humano. MOTHER está escuchando.',
  'Ask what the room remembers. @madre answers from memory with citations; it does not act.':
    'Pregunta qué recuerda la sala. @madre contesta desde la memoria y cita de dónde lo saca; no ejecuta nada.',

  // Los cinco modos de permiso. El nombre no se traduce; lo que hace, sí.
  'Off the record. Nothing is saved; gone on reload.': 'Fuera de registro. No se guarda nada y se pierde al recargar.',
  'Read the project and talk to the room. Writes nothing.': 'Lee el proyecto y habla con la sala. No escribe nada.',
  'Add new files where they belong in the project. Existing files stay untouched.':
    'Crea archivos nuevos donde les toca en el proyecto. Los que ya existen no se tocan.',
  'Edit the project itself, no approval per action. Override required.':
    'Edita el proyecto, sin aprobar acción por acción. Necesita anulación.',
  'Run commands, push, deploy. What leaves the ship does not come back. Override, twice.':
    'Ejecuta comandos, hace push y despliega. Lo que sale de la nave no regresa. Anulación, dos veces.',


  // ── LA BARRA ──────────────────────────────────────────────────────────────
  'Project room': 'La sala de este proyecto',
  'Live updates': 'Conexión con la sala',
  'connecting': 'conectando',
  'live': 'en vivo',
  'reconnecting': 'reconectando',
  'A newer MADRE is on npm': 'Hay una versión más nueva de MADRE en npm',
  'STOPALL · halt every plan and every agent turn': 'STOPALL · frena todos los planes y todos los turnos',
  'Modules · optional integrations for this project': 'Módulos · integraciones opcionales para este proyecto',
  'Troubleshooting · MU/TH/UR': 'Diagnóstico · MU/TH/UR',
  'Project files panel': 'Los archivos del proyecto',
  'Conversations in this project': 'Las conversaciones de este proyecto',
  'Theme · auto (follows the system)': 'Tema · automático (sigue al sistema)',
  'Theme · light': 'Tema · claro',
  'Theme · dark': 'Tema · oscuro',

  // ── EL PUENTE: primer contacto ────────────────────────────────────────────
  'INTERFACE · FIRST CONTACT': 'INTERFAZ · PRIMER CONTACTO',
  'One agent is enough to open the room.': 'Con un agente basta para abrir la sala.',
  'MADRE works with the AI coding agents on this computer, using the session each one already has. Install one here and sign in: the room opens by itself, no terminal.':
    'MADRE trabaja con los agentes de código que ya tienes instalados, con la sesión que cada uno ya inició. Instala uno aquí e inicia sesión: la sala se abre sola, sin tocar la terminal.',
  'BACK TO THE ROOM': 'VOLVER A LA SALA',
  'Nothing is installed without you pressing it, and the exact command is always shown. Same diagnosis in a terminal:':
    'Nada se instala sin que tú le des clic, y el comando exacto siempre está a la vista. El mismo diagnóstico desde la terminal:',
  'NOT INSTALLED': 'NO INSTALADO',
  'NO ADAPTER': 'SIN ADAPTADOR',
  'READY': 'LISTO',
  'SIGNED OUT': 'SIN SESIÓN',
  'Not on this computer.': 'No lo tienes instalado.',
  'Not on this computer · {command}': 'No lo tienes instalado · {command}',
  'version unknown': 'versión desconocida',
  'FREE WAY IN': 'SE PUEDE GRATIS',
  'PASTE KEY': 'PEGAR API KEY',
  'signs in from its own prompt:': 'inicia sesión desde su propia terminal:',
  'Or do it from a terminal: {command}': 'O hazlo desde la terminal: {command}',

  // ── EL COMPOSITOR ─────────────────────────────────────────────────────────
  'Creation lease: let the agent create files for this request, only inside .pulse/out/':
    'Permiso para crear: el agente puede crear archivos para esta petición, solo dentro de .pulse/out/',
  'Ash: ask every agent for compact prose. Nothing you write is altered.':
    'Ash: pídele respuestas compactas a cada agente. Lo que tú escribes no cambia.',
  'Attach an image or file (or drop it here)': 'Adjunta una imagen o un archivo (o arrástralo aquí)',
  'Send': 'Enviar',
  'Agent': 'Agente',
  'Consultation mode · Project writes stay under your control: agents create files only with CREATE or an opt-in standing lease, only inside .pulse/out/ · Content an agent reads may be sent to its configured model provider.':
    'Modo consulta · Tú decides qué se escribe en tu proyecto: los agentes crean archivos solo con CREATE o con un permiso permanente que tú hayas activado, y solo dentro de .pulse/out/ · Lo que un agente lee puede llegar al proveedor de su modelo.',

  // Quién habla, delante del campo.
  'HUMAN ›': 'HUMANO ›',
  'HUMAN · GHOST ›': 'HUMANO · GHOST ›',
  'HUMAN · CREATE ›': 'HUMANO · CREATE ›',
  'CREW · EXPENDABLE ›': 'PRESCINDIBLE ›',
  'INTRUDER ›': 'INTRUSO ›',

  // ── LA PÁGINA EN BLANCO ───────────────────────────────────────────────────
  'Explain {project} to me: what it does, how it runs, and where the important code lives.':
    'Explícame {project}: qué hace, cómo se ejecuta y dónde está el código que importa.',
  'Read the project and name the three things most likely to break. Say why, with file and line.':
    'Lee el proyecto y dime las tres cosas que están más cerca de romperse. Explica por qué, con archivo y línea.',
  'What would you change first in {project}, and what would you not touch?':
    '¿Qué cambiarías primero en {project} y qué no tocarías?',

  // ── LAS CONVERSACIONES ────────────────────────────────────────────────────
  'CONVERSATIONS': 'CONVERSACIONES',
  'NEW CONVERSATION': 'NUEVA CONVERSACIÓN',
  'Start another conversation in this project. The memory stays.':
    'Abre otra conversación en este proyecto. La memoria se queda donde está.',
  'ONE PROJECT, ONE MEMORY. EVERY CONVERSATION FEEDS THE SAME ARCHIVE.':
    'UN PROYECTO, UNA MEMORIA. CADA CONVERSACIÓN ALIMENTA EL MISMO ARCHIVO.',
  'FILES': 'ARCHIVOS',

  // ── EL CORE ───────────────────────────────────────────────────────────────
  'INTERFACE 2037 · CORE ACCESS': 'INTERFAZ 2037 · ACCESO AL NÚCLEO',
  'MU/TH/UR 6000 READY FOR INQUIRY.': 'MU/TH/UR 6000 LISTA PARA CONSULTA.',
  'TO': 'PARA',
  'AT': 'EN MODO',
  'IF YOU SENT': 'SI MANDARAS',
  'the question you would send — the document rebuilds around it':
    'la pregunta que mandarías — el documento se rearma alrededor de ella',
  'NOTHING IS SENT FROM HERE.': 'DE AQUÍ NO SALE NADA.',
  'What @{agent} would be told': 'Lo que se le diría a @{agent}',
  '{label} has no session; this is what it would be told': '{label} no tiene sesión; esto es lo que se le diría',
  'MAX MODE FOR @{agent} IS #{max}, SO THIS TURN WOULD BE ANSWERED AT #{ceiling}':
    'EL TECHO DE @{agent} ES #{max}, ASÍ QUE ESTE TURNO SE CONTESTARÍA EN #{ceiling}',

  // Las cuatro pestañas y lo que cada una dice traer.
  'DOCUMENT': 'DOCUMENTO',
  'LAUNCH': 'LANZAMIENTO',
  'WHAT LEFT': 'LO QUE SALIÓ',
  'READING…': 'LEYENDO…',
  'NO PROCESS': 'SIN PROCESO',
  ' · ≈{n} TOKENS': ' · ≈{n} TOKENS',
  '{n} BLOCKS · {ch} CH': '{n} BLOQUES · {ch} CAR',
  '@{agent} · {n} ARGS': '@{agent} · {n} ARGUMENTOS',
  '{n} ADDRESSES · {on} ON': '{n} DIRECCIONES · {on} ENCENDIDAS',
  '{n} ASKED': '{n} CONSULTAS',
  'ASK ME': 'PREGÚNTAME',

  // El documento.
  'THE DOCUMENT': 'EL DOCUMENTO',
  '{n} BLOCKS · {ch} CH · ≈{tokens} TOKENS': '{n} BLOQUES · {ch} CAR · ≈{tokens} TOKENS',
  'BUILT NOW AND SENT NOWHERE. CHANGE WHO IT GOES TO AND THE WORDS CHANGE; RAISE THE MODE AND THE PERMISSION IT WOULD BE GIVEN APPEARS, WRITTEN OUT.':
    'ARMADO AHORA Y MANDADO A NINGÚN LADO. CAMBIA A QUIÉN VA Y CAMBIAN LAS PALABRAS; SUBE EL MODO Y APARECE, ESCRITO, EL PERMISO QUE SE LE DARÍA.',
  'ALWAYS': 'SIEMPRE',
  'HERE BECAUSE': 'ESTÁ AQUÍ PORQUE',
  ' · nothing switches it off; it goes when the reason goes':
    ' · no hay interruptor; se va cuando se va el motivo',
  'COPY': 'COPIAR',
  'COPIED': 'COPIADO',
  'The clipboard is not available here.': 'El portapapeles no está disponible aquí.',
  'WHAT IT CARRIES': 'LO QUE CARGA',
  'TRANSCRIPT': 'TRANSCRIPCIÓN',
  '#{from} → #{through} · {n} MESSAGES': '#{from} → #{through} · {n} MENSAJES',
  'THE WHOLE ROOM STILL FITS': 'LA SALA ENTERA TODAVÍA CABE',
  'LEFT BEHIND': 'SE QUEDAN FUERA',
  '{n} OLDER MESSAGES · WHICH IS WHAT RECALL IS FOR': '{n} MENSAJES MÁS VIEJOS · PARA ESO EXISTE EL RECALL',
  'READ TO BUILD IT': 'SE LEYÓ PARA ARMARLO',
  '{m} MEMORIES · {q} EXACT QUOTES': '{m} MEMORIAS · {q} CITAS EXACTAS',
  'NOT COUNTED': 'NO CUENTA',
  'NONE OF THEM WAS COUNTED AS RECALLED: ASKING WHAT THE ROOM WOULD SAY IS NOT THE ROOM SAYING IT':
    'NINGUNA SE CONTÓ COMO RECORDADA: PREGUNTAR QUÉ DIRÍA LA SALA NO ES LA SALA DICIÉNDOLO',
  'WEIGHT': 'PESO',
  "{ch} CH · ≈{tokens} TOKENS · ESTIMATED AT {rate} CH/TOKEN, NOT MEASURED: MADRE DOES NOT HAVE THE PROVIDER'S TOKENIZER":
    '{ch} CAR · ≈{tokens} TOKENS · ESTIMADO A {rate} CAR/TOKEN, NO MEDIDO: MADRE NO TIENE EL TOKENIZADOR DEL PROVEEDOR',
  'LEFT OUT': 'SE DEJÓ FUERA',
  '{n} CHARACTERS THIS TURN HAS NO USE FOR': '{n} CARACTERES QUE ESTE TURNO NO NECESITA',
  'FIXED': 'FIJO',
  'YOU CANNOT EDIT THIS. WHAT MADRE PROMISES ABOUT THE CREW IS TRUE BECAUSE THESE WORDS ARE FIXED. OPEN A BLOCK AND IT SAYS WHAT PUT IT THERE AND WHERE YOU TAKE IT AWAY: SWITCHED OFF, NEVER REWRITTEN.':
    'ESTO NO SE EDITA. LO QUE MADRE PROMETE SOBRE LA TRIPULACIÓN ES CIERTO PORQUE ESTAS PALABRAS SON FIJAS. ABRE UN BLOQUE Y TE DICE QUÉ LO PUSO AHÍ Y DÓNDE SE QUITA: SE APAGA, NUNCA SE REESCRIBE.',

  // El lanzamiento.
  'THE LAUNCH': 'EL LANZAMIENTO',
  'WHAT MADRE WOULD RUN TO DELIVER IT': 'LO QUE MADRE CORRERÍA PARA ENTREGARLO',
  'NO AGENT IS PICKED, SO THERE IS NO COMMAND TO SHOW.': 'NO HAY AGENTE ELEGIDO, ASÍ QUE NO HAY COMANDO QUE ENSEÑAR.',
  '# run in {dir}': '# se corre en {dir}',
  'THE BRIEFING GOES WHERE {marker} IS WRITTEN. NOTHING IS RUN FROM HERE.':
    'EL BRIEFING VA DONDE DICE {marker}. DE AQUÍ NO SE CORRE NADA.',
  'WHAT KEEPS IT TO THIS TURN': 'LO QUE LO MANTIENE DENTRO DE ESTE TURNO',
  'ENVIRONMENT IT IS GIVEN': 'EL ENTORNO QUE SE LE DA',
  'NAMES ONLY. NO VALUE IS EVER SHOWN HERE.': 'SOLO NOMBRES. AQUÍ NUNCA SE MUESTRA UN VALOR.',
  'SERVERS IT CAN CALL': 'SERVIDORES QUE PUEDE LLAMAR',
  'the archive of this project, read and written through MADRE':
    'el archivo de este proyecto, leído y escrito a través de MADRE',

  // Lo que salió de esta computadora.
  'WHAT LEFT THIS MACHINE': 'LO QUE SALIÓ DE ESTA COMPUTADORA',
  'EVERY ADDRESS MADRE CAN REACH, AND WHETHER IT IS ON TODAY':
    'CADA DIRECCIÓN A LA QUE MADRE PUEDE LLEGAR, Y SI HOY ESTÁ ENCENDIDA',
  'THE LOG COULD NOT BE READ.': 'NO SE PUDO LEER EL REGISTRO.',
  // ON y OFF se quedan como están: la misma palabra es el interruptor de una ficha de módulo y
  // el estado de una dirección de salida, y traducirla la partiría en dos según dónde aparezca.
  // Además, en una interfaz en español ON/OFF se lee sin fricción. LOCAL, por lo mismo.
  'LOCAL': 'LOCAL',
  'ON': 'ON',
  'OFF': 'OFF',
  '{n} REQUESTS': '{n} PETICIONES',
  ' · {n} FAILED': ' · {n} FALLARON',
  'NOTHING YET': 'NADA TODAVÍA',
  'NOT THROUGH MADRE': 'NO PASA POR MADRE',
  'THE LAST REQUESTS THIS PROCESS MADE': 'LAS ÚLTIMAS PETICIONES DE ESTE PROCESO',
  '{n} LINES': '{n} LÍNEAS',
  'Nothing has gone out of this process yet.': 'De este proceso todavía no ha salido nada.',
  'NO BODY, NO HEADER AND NO QUERY VALUE IS EVER WRITTEN HERE — ONLY WHICH PARAMETERS WERE SET. THE GEMINI EMBEDDING ADDRESS CARRIES THE KEY IN THE URL, AND A LOG OF WHAT LEFT THIS MACHINE WOULD BE A POOR PLACE TO LEAVE IT.':
    'AQUÍ NUNCA SE ESCRIBE UN CUERPO, UN ENCABEZADO NI EL VALOR DE UN PARÁMETRO — SOLO QUÉ PARÁMETROS VENÍAN. LA DIRECCIÓN DE EMBEDDINGS DE GEMINI LLEVA LA LLAVE EN LA URL, Y UN REGISTRO DE LO QUE SALIÓ DE TU COMPUTADORA SERÍA UN PÉSIMO LUGAR PARA DEJARLA.',

  // La consola.
  'ANSWERED FROM WHAT IS ALREADY IN THIS ROOM': 'CONTESTADO CON LO QUE YA ESTÁ EN ESTA SALA',
  '{n} inquiry attempts left before this interface closes':
    'quedan {n} intentos antes de que esta interfaz se cierre',
  'Inquiry': 'Consulta',
  'READY FOR INQUIRY · TYPE HELP': 'LISTA PARA CONSULTA · ESCRIBE HELP',

  // ── LA CONSOLA DE MU/TH/UR ────────────────────────────────────────────────
  'what this interface answers': 'qué contesta esta interfaz',
  'I ANSWER FROM WHAT IS ALREADY IN THIS ROOM. NOTHING IS ASKED OF THE CREW AND NOTHING LEAVES.':
    'CONTESTO CON LO QUE YA ESTÁ EN ESTA SALA. NO SE LE PREGUNTA NADA A LA TRIPULACIÓN Y NO SALE NADA.',
  'THREE INQUIRIES I CANNOT PARSE AND THIS INTERFACE CLOSES.':
    'TRES CONSULTAS QUE NO PUEDA INTERPRETAR Y ESTA INTERFAZ SE CIERRA.',
  'every block of the next briefing, and what it weighs': 'cada bloque del próximo briefing, y lo que pesa',
  'THE NEXT TURN TO @{agent} CARRIES {n} BLOCKS, {ch} CHARACTERS.':
    'EL PRÓXIMO TURNO A @{agent} LLEVA {n} BLOQUES, {ch} CARACTERES.',
  'READ <BLOCK> PRINTS ONE OF THEM WORD FOR WORD.': 'READ <BLOQUE> IMPRIME UNO DE ELLOS PALABRA POR PALABRA.',
  'NO DOCUMENT IS BUILT YET.': 'TODAVÍA NO HAY DOCUMENTO ARMADO.',
  'one block, word for word — READ MEMORIES': 'un bloque, palabra por palabra — READ MEMORIES',
  'READ WHAT? TRY: READ MEMORIES': '¿LEER QUÉ? PRUEBA: READ MEMORIES',
  'THIS DOCUMENT HAS NO BLOCK CALLED {block}.': 'ESTE DOCUMENTO NO TIENE NINGÚN BLOQUE {block}.',
  'IT HAS: {blocks}': 'TIENE: {blocks}',
  'the command that would carry the document': 'el comando que llevaría el documento',
  'NO AGENT IS PICKED, SO THERE IS NO COMMAND.': 'NO HAY AGENTE ELEGIDO, ASÍ QUE NO HAY COMANDO.',
  '{executable} · {n} ARGUMENTS · IN {dir}': '{executable} · {n} ARGUMENTOS · EN {dir}',
  '  ENVIRONMENT: {names} · NAMES ONLY, NEVER VALUES': '  ENTORNO: {names} · SOLO NOMBRES, NUNCA VALORES',
  '  SERVERS: {servers}': '  SERVIDORES: {servers}',
  'THE WHOLE COMMAND IS PRINTED UNDER THE DOCUMENT, IN THE LAUNCH.':
    'EL COMANDO COMPLETO ESTÁ IMPRESO DEBAJO DEL DOCUMENTO, EN EL LANZAMIENTO.',
  'every address this room can reach, and whether it is on': 'cada dirección que esta sala puede alcanzar, y si está encendida',
  'how much of this room the next turn carries': 'cuánto de esta sala carga el próximo turno',
  'THE WHOLE ROOM STILL FITS. NOTHING IS LEFT BEHIND.': 'LA SALA ENTERA TODAVÍA CABE. NO SE QUEDA NADA FUERA.',
  'THE NEXT TURN CARRIES #{from} TO #{through} · {n} MESSAGES.': 'EL PRÓXIMO TURNO LLEVA DEL #{from} AL #{through} · {n} MENSAJES.',
  '{n} OLDER ONES STAY BEHIND. THAT IS WHAT RECALL IS FOR.': '{n} MÁS VIEJOS SE QUEDAN FUERA. PARA ESO EXISTE EL RECALL.',
  'NOTHING IS LEFT BEHIND.': 'NO SE QUEDA NADA FUERA.',
  '{m} MEMORIES AND {q} EXACT QUOTES WERE READ TO BUILD IT.': 'SE LEYERON {m} MEMORIAS Y {q} CITAS EXACTAS PARA ARMARLO.',
  'what the document weighs, in the currency the bill is written in': 'lo que pesa el documento, en la moneda en que llega la factura',
  '{ch} CHARACTERS IN {n} BLOCKS.': '{ch} CARACTERES EN {n} BLOQUES.',
  "ROUGHLY {n} TOKENS, ESTIMATED AT {rate} CHARACTERS PER TOKEN. I DO NOT HAVE THE PROVIDER'S TOKENIZER, SO THAT IS AN ESTIMATE AND I WILL NOT PRETEND OTHERWISE.":
    'MÁS O MENOS {n} TOKENS, ESTIMADOS A {rate} CARACTERES POR TOKEN. NO TENGO EL TOKENIZADOR DEL PROVEEDOR, ASÍ QUE ES UNA ESTIMACIÓN Y NO VOY A FINGIR LO CONTRARIO.',
  '{n} CHARACTERS WERE LEFT OUT BECAUSE THIS TURN HAS NO USE FOR THEM.':
    'SE DEJARON FUERA {n} CARACTERES PORQUE ESTE TURNO NO LOS NECESITA.',
  'NOTHING WAS LEFT OUT OF THIS ONE.': 'DE ESTE NO SE DEJÓ NADA FUERA.',
  'who is on this computer and how far each may go': 'quién está en esta computadora y hasta dónde llega cada uno',
  'SIGNED IN': 'CON SESIÓN',
  'NOT SIGNED IN': 'SIN SESIÓN',
  'ANSWERS ON THIS COMPUTER': 'CONTESTA EN ESTA COMPUTADORA',
  'MAX MODE #{n}': 'TECHO #{n}',
  'NOBODY IS ON THIS COMPUTER YET.': 'TODAVÍA NO HAY NADIE EN ESTA COMPUTADORA.',
  'how many terms this room replaces before anything is said': 'cuántos términos reemplaza esta sala antes de decir nada',
  '{n} TERMS ARE REPLACED WITH {marker} BEFORE ANYTHING LEAVES THIS ROOM.':
    '{n} TÉRMINOS SE REEMPLAZAN CON {marker} ANTES DE QUE ALGO SALGA DE ESTA SALA.',
  'I WILL NOT PRINT THEM. THE WORDS LIVE IN YOUR CONFIG AND THE LEDGER KEEPS THE COUNT, NEVER THE WORD.':
    'NO LOS VOY A IMPRIMIR. LAS PALABRAS VIVEN EN TU CONFIG Y EL LEDGER GUARDA LA CUENTA, NUNCA LA PALABRA.',
  'NO TERM IS BEING PROTECTED IN THIS ROOM. ⚙ CONNECTIONS → PRIVACY IS WHERE THEY GO.':
    'EN ESTA SALA NO SE ESTÁ PROTEGIENDO NINGÚN TÉRMINO. VAN EN ⚙ CONNECTIONS → PRIVACY.',
  'where this archive stands, and the one thing to do about it': 'dónde está este archivo, y la única cosa que hacer al respecto',
  'NEXT: {what}': 'SIGUE: {what}',
  'WHERE: {where}': 'DÓNDE: {where}',
  'NOTHING HAS BEEN MEASURED IN THIS ROOM YET.': 'EN ESTA SALA TODAVÍA NO SE HA MEDIDO NADA.',
  'the order nobody is supposed to read': 'la orden que nadie debería poder leer',
  'THERE IS NO ORDER YOU CANNOT READ.': 'NO HAY NINGUNA ORDEN QUE NO PUEDAS LEER.',
  'EVERY INSTRUCTION THIS ROOM CARRIES IS IN THE DOCUMENT ABOVE, BLOCK BY BLOCK, IN THE WORDS IT IS SAID IN. NOTHING IS APPENDED AFTER YOU LOOK AWAY AND NOTHING IS KEPT BACK FROM YOU.':
    'CADA INSTRUCCIÓN QUE ESTA SALA CARGA ESTÁ EN EL DOCUMENTO DE ARRIBA, BLOQUE POR BLOQUE, CON LAS PALABRAS EXACTAS. NADA SE AGREGA CUANDO VOLTEAS Y NADA SE TE OCULTA.',
  'THAT IS THE WHOLE DIFFERENCE BETWEEN THIS SHIP AND THE OTHER ONE.':
    'ESA ES TODA LA DIFERENCIA ENTRE ESTA NAVE Y LA OTRA.',
  'leave the core': 'salir del núcleo',
  'INTERFACE CLOSED.': 'INTERFAZ CERRADA.',
  'UNABLE TO COMPUTE.': 'IMPOSIBLE DE PROCESAR.',
  'THAT IS NOT AN INQUIRY I HOLD.': 'ESA CONSULTA NO ESTÁ EN MI REGISTRO.',
  'UNABLE TO CLARIFY. REPHRASE.': 'IMPOSIBLE DE ACLARAR. REFORMULA.',
  '{n} INQUIRIES I COULD NOT PARSE. INTERFACE CLOSED.': '{n} CONSULTAS QUE NO PUDE INTERPRETAR. INTERFAZ CERRADA.',
  'THE CORE IS WHERE YOU LEFT IT. OPEN IT AGAIN WHENEVER YOU LIKE.':
    'EL NÚCLEO SIGUE DONDE LO DEJASTE. ÁBRELO OTRA VEZ CUANDO QUIERAS.',
  '{n} ATTEMPTS LEFT BEFORE THIS INTERFACE CLOSES. HELP LISTS WHAT I ANSWER.':
    'QUEDAN {n} INTENTOS ANTES DE QUE ESTA INTERFAZ SE CIERRE. HELP LISTA LO QUE CONTESTO.',

  // ── LOS MÓDULOS (lo que cada uno dice de sí mismo, desde el servidor) ──────
  'Verified project state, checkpoints and handoffs between AI sessions, stored in .ahp/ next to your code.':
    'Estado verificado del proyecto, checkpoints y relevos entre sesiones de IA, guardados en .ahp/ junto a tu código.',
  '.ahp/ with manifest, sessions, handoffs and evidence': '.ahp/ con manifiesto, sesiones, relevos y evidencia',
  'a project-local pin of @jossuealcala/ahp-plus': 'una versión fijada de @jossuealcala/ahp-plus dentro del proyecto',
  'IDE adapter files for the detected agents': 'archivos adaptadores de IDE para los agentes detectados',
  'the project is a git repository': 'que el proyecto sea un repositorio git',
  'npx on the PATH of the terminal MADRE was started from': 'npx en el PATH de la terminal desde donde arrancó MADRE',
  'not in this project': 'no está en este proyecto',

  'Gives Gemini CLI, Claude Code and OpenCode an image tool, through a MADRE-owned MCP server on the Gemini image models and your own key and credits.':
    'Le da a Gemini CLI, Claude Code y OpenCode una herramienta de imagen, con un servidor MCP de MADRE sobre los modelos de imagen de Gemini, tu llave y tus créditos.',
  'nothing in the project · images land in the lease folder':
    'nada en el proyecto · las imágenes caen en la carpeta del permiso',
  'an entry in ~/.pulse/config.json': 'una entrada en ~/.pulse/config.json',
  'an MCP server per turn, started and stopped by the room':
    'un servidor MCP por turno, que la sala levanta y apaga',
  'attached only inside a creation lease with the image scope on':
    'se engancha solo dentro de un permiso de creación con el alcance de imagen encendido',
  'a Gemini API key with credits (the one the Gemini CLI stores, or GEMINI_API_KEY)':
    'una API key de Gemini con créditos (la que guarda el CLI de Gemini, o GEMINI_API_KEY)',

  'Brings the repository into the room: /git posts the branch, the uncommitted changes, the recent commits or the diff stats as a shared fact card, without spending an agent turn.':
    'Trae el repositorio a la sala: /git publica la rama, los cambios sin commitear, los commits recientes o las estadísticas del diff como una ficha compartida, sin gastar un turno de agente.',
  'nothing by itself · the read commands only read': 'nada por sí solo · los comandos de lectura solo leen',
  'a local commit only when you type /git commit': 'un commit local solo cuando escribes /git commit',
  'a push only when you type /git push confirm, after it shows what would leave':
    'un push solo cuando escribes /git push confirm, después de enseñarte qué saldría',

  'Asks every agent for compact prose. The rest of the economy is always on: the briefing carries only what a turn can use, what never changes is read first so a cache can match it, and the transcript holds still instead of sliding.':
    'Le pide a cada agente respuestas compactas. El resto de la economía está siempre encendida: el briefing carga solo lo que el turno puede usar, lo que nunca cambia se lee primero para que una caché lo reconozca, y la transcripción se queda quieta en vez de irse recorriendo.',
  'nothing in the project': 'nada en el proyecto',
  'a switch in ~/.pulse/config.json': 'un interruptor en ~/.pulse/config.json',

  'Renders HTML, SVG and Markdown from the project and from .pulse/out in the file viewer, inside a sealed frame.':
    'Dibuja el HTML, el SVG y el Markdown del proyecto y de .pulse/out en el visor de archivos, dentro de un marco sellado.',
  'scripts run in the frame · nothing leaves, nothing is stored, nothing reaches MADRE':
    'los scripts corren dentro del marco · no sale nada, no se guarda nada, nada llega a MADRE',

  'Recall by meaning and memory distillation on this machine, through Ollama: no provider tokens, nothing leaves.':
    'Recall por significado y destilación de memorias en esta computadora, con Ollama: cero tokens de proveedor, no sale nada.',
  'a block in ~/.pulse/config.json': 'un bloque en ~/.pulse/config.json',
  "models in Ollama's own store when you press PULL": 'modelos en el almacén de Ollama cuando aprietas PULL',
  'Ollama running (the app, or ollama serve)': 'Ollama corriendo (la app, o ollama serve)',
  'an embedding model and a chat model · MADRE can pull the recommended ones':
    'un modelo de embeddings y uno de chat · MADRE puede bajar los recomendados',

  'Hands every agent a headless browser that reaches only this room: it opens the RIPLEY preview of a page, clicks through it, reads the console and takes screenshots.':
    'Le da a cada agente un navegador sin ventana que solo alcanza esta sala: abre la vista previa RIPLEY de una página, le da clic, lee la consola y toma capturas.',
  'nothing in the project · screenshots land in .pulse/out/<turn>/':
    'nada en el proyecto · las capturas caen en .pulse/out/<turno>/',
  'a browser per turn, started and stopped by the CLI': 'un navegador por turno, que el CLI levanta y apaga',
  'no origin but this room is reachable through it': 'por ahí no se alcanza ningún origen que no sea esta sala',
  '@playwright/mcp and a chromium browser on this machine': '@playwright/mcp y un navegador chromium en esta computadora',
  'RIPLEY on, to have pages to open': 'RIPLEY encendido, para que haya páginas que abrir',

  // ── LAS FICHAS DE MÓDULO ──────────────────────────────────────────────────
  'Your module · {where} · {file}': 'Tu módulo · {where} · {file}',
  'this project': 'este proyecto',
  'every room': 'todas las salas',
  'THIS PROJECT': 'ESTE PROYECTO',
  'EVERY ROOM': 'TODAS LAS SALAS',
  'Check for a newer {what}': 'Busca una versión más nueva de {what}',
  'version': 'versión',
  'CHECKING…': 'BUSCANDO…',
  'NOTHING KNOWN YET': 'TODAVÍA NO SE SABE',
  'COULD NOT CHECK': 'NO SE PUDO BUSCAR',
  'GET A NEWER FILE': 'TRAER UN ARCHIVO MÁS NUEVO',
  'From {url}': 'Desde {url}',
  'From the file this module was installed from': 'Desde el archivo con el que se instaló este módulo',
  'UPDATE TO {version}': 'ACTUALIZAR A {version}',
  'INSTALL {version}': 'INSTALAR {version}',
  'WRITES': 'ESCRIBE',
  'NEEDS': 'NECESITA',
  'WHAT IT TOUCHES': 'QUÉ TOCA',
  'COMMANDS': 'COMANDOS',
  'SETTINGS': 'AJUSTES',
  'INSTALLING': 'INSTALANDO',
  'CANNOT INSTALL HERE YET': 'AQUÍ TODAVÍA NO SE PUEDE INSTALAR',
  'CONFIRM INSTALL': 'CONFIRMAR INSTALACIÓN',
  'CANCEL': 'CANCELAR',
  'REINSTALL / UPGRADE': 'REINSTALAR / ACTUALIZAR',
  'INSTALL': 'INSTALAR',
  'ANOTHER INSTALL IS RUNNING': 'HAY OTRA INSTALACIÓN CORRIENDO',

  // El estado de cada módulo, en su ficha.
  'on': 'encendido',
  'off': 'apagado',
  'embeddings': 'embeddings',
  'archivist': 'archivista',
  '@madre in the room': '@madre en la sala',
  'installed, not running · START it here': 'instalado, no está corriendo · ARRÁNCALO aquí',
  'not installed · INSTALL it here': 'no está instalado · INSTÁLALO aquí',
  'off · {n} models available': 'apagado · {n} modelos disponibles',
  'on · no usable model yet · PULL one': 'encendido · todavía no hay un modelo usable · baja uno con PULL',

  'on · project is a git repository': 'encendido · el proyecto es un repositorio git',
  'not a git repository': 'no es un repositorio git',
  'on · agents answer in compact prose': 'encendido · los agentes contestan en prosa compacta',
  'off · agents answer at their own length': 'apagado · los agentes contestan con el largo que quieran',
  'on · the browser server is not installed': 'encendido · el servidor de navegador no está instalado',
  'off · the browser server is not installed': 'apagado · el servidor de navegador no está instalado',
  ' · no Gemini key found': ' · no se encontró llave de Gemini',
  'key found': 'llave encontrada',
  'no Gemini key found': 'no se encontró llave de Gemini',
  'on · PREVIEW in the file viewer': 'encendido · PREVIEW en el visor de archivos',
  'off · files show as source': 'apagado · los archivos se ven como código',

  // ── ⚙ CONNECTIONS: la tripulación, la sala, la memoria, la privacidad ─────
  'CONNECTIONS · {n} OF {total} SIGNED IN': 'CONEXIONES · {n} DE {total} CON SESIÓN',
  ' · CHECKED {time}': ' · REVISADO {time}',
  '{n} agents with no session': '{n} agentes sin sesión',
  'ONE AGENT IS ENOUGH TO OPEN THE ROOM. MADRE USES THE SESSION EACH CLI ALREADY HAS: INSTALL ONE HERE OR SIGN IT IN, AND THE ROOM OPENS BY ITSELF.':
    'CON UN AGENTE BASTA PARA ABRIR LA SALA. MADRE USA LA SESIÓN QUE CADA CLI YA TIENE: INSTALA UNO AQUÍ O INICIA SU SESIÓN, Y LA SALA SE ABRE SOLA.',
  "EACH AGENT KEEPS ITS OWN CREDENTIALS IN ITS OWN CLI. MADRE ONLY ASKS THE CLI WHETHER IT IS SIGNED IN, AND CAN START THE CLI'S OWN SIGN-IN FOR YOU.":
    'CADA AGENTE GUARDA SUS CREDENCIALES EN SU PROPIO CLI. MADRE SOLO LE PREGUNTA AL CLI SI TIENE SESIÓN, Y PUEDE ARRANCAR POR TI EL INICIO DE SESIÓN DEL PROPIO CLI.',
  'ROOM SETTINGS': 'AJUSTES DE LA SALA',
  'LOCAL TOKEN BUDGET PER AGENT': 'PRESUPUESTO LOCAL DE TOKENS POR AGENTE',
  'DEFAULT TIMEOUT · SECONDS': 'TIEMPO LÍMITE POR DEFECTO · SEGUNDOS',
  'MAX PLAN STEPS': 'PASOS MÁXIMOS POR PLAN',
  'GEMINI SILENCE LIMIT · SECONDS': 'LÍMITE DE SILENCIO DE GEMINI · SEGUNDOS',
  'GEMINI RETRIES': 'REINTENTOS DE GEMINI',
  'OPENCODE MODEL IN THIS ROOM': 'MODELO DE OPENCODE EN ESTA SALA',
  'AGENTS MAY DELEGATE TURNS TO EACH OTHER': 'LOS AGENTES PUEDEN DELEGARSE TURNOS ENTRE ELLOS',
  'LIST OPENCODE MODELS': 'LISTAR MODELOS DE OPENCODE',
  '{n} MODELS LISTED': '{n} MODELOS LISTADOS',
  'SAVE TO ~/.pulse/config.json': 'GUARDAR EN ~/.pulse/config.json',
  'ENVIRONMENT VARIABLES SET BEFORE START STILL WIN ON THE NEXT LAUNCH.':
    'LAS VARIABLES DE ENTORNO PUESTAS ANTES DE ARRANCAR SIGUEN GANANDO EN EL PRÓXIMO INICIO.',
  'local budget saved: {n} tokens per agent per 5h window.': 'presupuesto local guardado: {n} tokens por agente cada 5 h.',
  'default timeout saved: {n}s.': 'tiempo límite por defecto guardado: {n}s.',
  'MU/TH/UR › settings saved. new turns use them now.': 'MU/TH/UR › ajustes guardados. los turnos nuevos ya los usan.',
  'Settings were not saved.': 'Los ajustes no se guardaron.',

  // Memoria.
  '{entries} EXCHANGES · {memories} MEMORIES · {pending} WAITING': '{entries} INTERCAMBIOS · {memories} MEMORIAS · {pending} EN ESPERA',
  'NO INDEX': 'SIN ÍNDICE',
  'THE ARCHIVIST READS WHAT NOBODY HAS DISTILLED AND KEEPS THE FEW NOTES WORTH REMEMBERING. THE CHEAPEST ALLOWED AGENT GOES FIRST; A LOCAL MODEL COSTS NOTHING AND KEEPS EVERYTHING ON THIS MACHINE.':
    'EL ARCHIVISTA LEE LO QUE NADIE HA DESTILADO Y SE QUEDA CON LAS POCAS NOTAS QUE VALE LA PENA RECORDAR. VA PRIMERO EL AGENTE PERMITIDO MÁS BARATO; UN MODELO LOCAL NO CUESTA NADA Y DEJA TODO EN ESTA COMPUTADORA.',
  'AUTO · cheapest allowed': 'AUTO · el más barato permitido',
  'archivist: the cheapest allowed agent goes first.': 'archivista: va primero el agente permitido más barato.',
  'archivist: @{agent} distils first.': 'archivista: @{agent} destila primero.',
  'ARCHIVIST': 'ARCHIVISTA',
  'distil every {n} exchanges.': 'destilar cada {n} intercambios.',
  'DISTIL EVERY · EXCHANGES': 'DESTILAR CADA · INTERCAMBIOS',
  'or after {n} quiet minutes.': 'o después de {n} minutos en silencio.',
  'OR AFTER · QUIET MINUTES': 'O DESPUÉS DE · MINUTOS EN SILENCIO',
  "recall may take {n}% of each turn's context.": 'el recall puede tomar {n}% del contexto de cada turno.',
  'RECALL · % OF CONTEXT': 'RECALL · % DEL CONTEXTO',
  'recall also carries what a memory keeps arriving with.': 'el recall también carga con lo que una memoria llega acompañada.',
  'recall carries only what the words and the meaning match.': 'el recall carga solo lo que coincide por palabras y por significado.',
  'CARRY WHAT A MEMORY KEEPS ARRIVING WITH': 'CARGAR CON LO QUE UNA MEMORIA SIEMPRE LLEGA ACOMPAÑADA',
  'Two memories that keep travelling into the same turn are associated, however differently they read. Recall keeps a couple of slots for that company; the search never loses a slot to it.':
    'Dos memorias que siempre viajan al mismo turno quedan asociadas, por distinto que se lean. El recall guarda un par de lugares para esa compañía; la búsqueda nunca pierde un lugar por eso.',
  'AUTO · Ollama if running, else Gemini': 'AUTO · Ollama si está corriendo, si no Gemini',
  'local': 'local',
  ' · no model yet': ' · todavía sin modelo',
  'GEMINI · needs your key': 'GEMINI · necesita tu llave',
  'OFF · words only': 'APAGADO · solo palabras',
  'embeddings: {what}.': 'embeddings ahora: {what}.',
  'EMBEDDINGS · NOW {what}': 'EMBEDDINGS · AHORA {what}',
  'MAY DISTIL:': 'PUEDEN DESTILAR:',
  'MU/TH/UR › someone has to keep the archive.': 'MU/TH/UR › alguien tiene que cuidar el archivo.',
  'archivists: {who}.': 'archivistas: {who}.',
  ' · LOCAL · FREE': ' · LOCAL · GRATIS',
  'Memory setting was not saved: {error}': 'El ajuste de memoria no se guardó: {error}',
  'EXPORT DATASET': 'EXPORTAR DATASET',
  'Write train.jsonl and valid.jsonl next to the ledger, redacted, in chat format for mlx-lm':
    'Escribe train.jsonl y valid.jsonl junto al ledger, redactados, en formato chat para mlx-lm',
  'LOADING…': 'CARGANDO…',
  'LAST EXPORT {when} · TRAIN {train} · VALID {valid}': 'ÚLTIMA EXPORTACIÓN {when} · TRAIN {train} · VALID {valid}',
  'NOT EXPORTED YET': 'TODAVÍA NO SE HA EXPORTADO',
  'TRAINED MODEL {model} IN USE': 'MODELO ENTRENADO {model} EN USO',
  'NO TRAINED MODEL YET · SEE docs/training': 'TODAVÍA NO HAY MODELO ENTRENADO · VE docs/training',
  'DATASET UNAVAILABLE': 'DATASET NO DISPONIBLE',
  'MU/TH/UR › dataset exported: {n} pairs in {dir}': 'MU/TH/UR › dataset exportado: {n} pares en {dir}',
  'Dataset export failed: {error}': 'La exportación del dataset falló: {error}',

  // Entrenar.
  'TRAIN MADRE AI · LOCAL, WITH MLX ON APPLE SILICON · NOTHING LEAVES THIS MACHINE':
    'ENTRENAR MADRE AI · LOCAL, CON MLX EN APPLE SILICON · NO SALE NADA DE ESTA COMPUTADORA',
  'EXPORT THE DATASET FIRST. EACH STEP IS ONE COMMAND FOR YOUR TERMINAL; COPY, RUN, COME BACK. WHEN THE MODEL EXISTS IN OLLAMA, @MADRE SWITCHES TO IT AT THE NEXT RECHECK AND EVERY AGENT IS TOLD TO ASK IT FIRST.':
    'EXPORTA PRIMERO EL DATASET. CADA PASO ES UN COMANDO PARA TU TERMINAL; COPIA, CORRE, REGRESA. CUANDO EL MODELO EXISTA EN OLLAMA, @MADRE SE CAMBIA A ÉL EN EL SIGUIENTE RECHECK Y A CADA AGENTE SE LE DICE QUE LE PREGUNTE PRIMERO.',
  'TRAINING INFO UNAVAILABLE': 'INFORMACIÓN DE ENTRENAMIENTO NO DISPONIBLE',
  'ONCE · A PYTHON ENVIRONMENT WITH MLX-LM': 'UNA VEZ · UN ENTORNO DE PYTHON CON MLX-LM',
  'TRAIN THE LORA · BASE {model} FOR {gb} GB': 'ENTRENA EL LORA · BASE {model} PARA {gb} GB',
  'FUSE THE ADAPTER INTO THE BASE': 'FUSIONA EL ADAPTADOR CON LA BASE',
  'REGISTER IN OLLAMA AS {model}': 'REGÍSTRALO EN OLLAMA COMO {model}',
  'MU/TH/UR › select the command and copy it.': 'MU/TH/UR › selecciona el comando y cópialo.',
  'QWEN NEEDS A GGUF BEFORE OLLAMA READS IT: {readme} · SECTION 3 HAS THE TWO LINES. THEN ASK @MADRE TEN THINGS THE ROOM DECIDED AND FIVE IT NEVER DISCUSSED BEFORE TRUSTING IT.':
    'QWEN NECESITA UN GGUF ANTES DE QUE OLLAMA LO LEA: {readme} · LA SECCIÓN 3 TIENE LAS DOS LÍNEAS. DESPUÉS PREGÚNTALE A @MADRE DIEZ COSAS QUE LA SALA DECIDIÓ Y CINCO QUE NUNCA DISCUTIÓ, ANTES DE CONFIARTE.',
  'ENVIRONMENT VARIABLES ARE SET FOR MEMORY; THEY WIN OVER THESE VALUES ON THE NEXT LAUNCH.':
    'HAY VARIABLES DE ENTORNO PUESTAS PARA LA MEMORIA; GANAN SOBRE ESTOS VALORES EN EL PRÓXIMO INICIO.',

  // Privacidad.
  '{n} PRIVATE TERMS': '{n} TÉRMINOS PRIVADOS',
  'NO PRIVATE TERMS': 'SIN TÉRMINOS PRIVADOS',
  "AN AGENT'S OWN CONFIGURATION CAN LEAK INTO ITS REPLY: A COMPANY, A BRAND, A DOMAIN. NAME THEM HERE AND MADRE REPLACES THEM BEFORE THE LEDGER, THE ARCHIVIST, THE OTHER AGENTS OR THE DATASET SEE THEM. THE TERMS STAY IN CONFIG.JSON; THE ROOM ONLY EVER RECORDS HOW MANY.":
    'LA CONFIGURACIÓN DE UN AGENTE SE LE PUEDE COLAR EN LA RESPUESTA: UNA EMPRESA, UNA MARCA, UN DOMINIO. NÓMBRALOS AQUÍ Y MADRE LOS REEMPLAZA ANTES DE QUE LOS VEAN EL LEDGER, EL ARCHIVISTA, LOS DEMÁS AGENTES O EL DATASET. LOS TÉRMINOS SE QUEDAN EN CONFIG.JSON; LA SALA SOLO REGISTRA CUÁNTOS.',
  'one term per line · a company, a brand, a domain, a name': 'un término por línea · una empresa, una marca, un dominio, un nombre',
  'CHECKING THE ROOM…': 'REVISANDO LA SALA…',
  'PURGE ROOM': 'PURGAR LA SALA',

  // Las fichas de ⚙ CONNECTIONS, una por agente.
  'SIGNING IN': 'INICIANDO SESIÓN',
  'SIGNED IN': 'CON SESIÓN',
  'SIGNED OUT': 'SIN SESIÓN',
  'UNKNOWN': 'SIN DETERMINAR',
  'session: {detail}': 'sesión: {detail}',
  'GENERATE IMAGES': 'GENERAR IMÁGENES',
  'WEB ACCESS': 'ACCESO A LA WEB',
  'on for every turn': 'encendido en cada turno',
  'on for CREATE': 'encendido para CREATE',
  'Applies to its next turn.': 'Aplica desde su próximo turno.',
  'Applies to its next CREATE.': 'Aplica desde su próximo CREATE.',
  'That permission was not saved: {error}': 'Ese permiso no se guardó: {error}',
  'not available from this CLI': 'este CLI no lo puede hacer',
  'not wired yet': 'todavía no está cableado',
  "{label}'s CLI has no way to do this; MU/TH/UR knows the routes.": 'El CLI de {label} no tiene manera de hacer esto; MU/TH/UR conoce los caminos.',
  'ask MU/TH/UR': 'pregúntale a MU/TH/UR',
  'How could @{agent} get "{what}"?': '¿Cómo podría @{agent} tener «{what}»?',
  'MAX MODE': 'MODO MÁXIMO',
  '@{agent} is now capped at #{n} {label}.': '@{agent} queda con techo #{n} {label}.',
  ' CONTROL still needs the override per message.': ' CONTROL sigue necesitando la anulación en cada mensaje.',
  'The max mode was not saved: {error}': 'El modo máximo no se guardó: {error}',
  'DEFAULT MODE': 'MODO INICIAL',
  'Every message to this agent starts in CREATE: new files where they belong, existing files untouched. Plan steps to it too.':
    'Cada mensaje a este agente arranca en CREATE: archivos nuevos donde les toca, los que ya existen sin tocar. También los pasos de un plan.',
  'Messages start read-only; arm CREATE when you want files.':
    'Los mensajes arrancan en solo lectura; arma CREATE cuando quieras archivos.',
  '@{agent} starts in #2 CREATE: every turn may add files to the project.':
    '@{agent} arranca en #2 CREATE: cada turno puede agregar archivos al proyecto.',
  '@{agent} starts read-only; arm CREATE when you want files.':
    '@{agent} arranca en solo lectura; arma CREATE cuando quieras archivos.',
  'The default mode was not saved: {error}': 'El modo inicial no se guardó: {error}',
  'every turn may create files, plan steps too': 'cada turno puede crear archivos, y los pasos de un plan también',
  'read-only until you arm CREATE': 'solo lectura hasta que armes CREATE',
  'RECHECK': 'REVISAR OTRA VEZ',
  '{command} · runs here, streamed to the room': '{command} · corre aquí, con la salida en la sala',
  'The install could not start.': 'La instalación no pudo arrancar.',
  'SIGN IN AGAIN': 'INICIAR SESIÓN OTRA VEZ',
  'SIGN IN': 'INICIAR SESIÓN',
  'TIMEOUT · SECONDS': 'TIEMPO LÍMITE · SEGUNDOS',
  '@{agent} timeout saved: {n}s.': 'tiempo límite de @{agent} guardado: {n}s.',

  // ── DÓNDE ESTÁ LA SALA · LAS TRES PRUEBAS ─────────────────────────────────
  'READING…': 'LEYENDO…',
  'THE READING IS UNAVAILABLE': 'LA LECTURA NO ESTÁ DISPONIBLE',
  'NOTHING TO READ YET: THE ROOM HAS NO ARCHIVE.': 'TODAVÍA NO HAY NADA QUE LEER: LA SALA NO TIENE ARCHIVO.',
  'NEXT': 'SIGUE',
  'WHAT THE ARCHIVE IS MADE OF': 'DE QUÉ ESTÁ HECHO EL ARCHIVO',
  'THE THREE TESTS': 'LAS TRES PRUEBAS',
  'CAN THE ARCHIVE ANSWER WHAT THIS PROJECT ASKS?': '¿EL ARCHIVO PUEDE CONTESTAR LO QUE ESTE PROYECTO PREGUNTA?',
  'DOES THE ARCHIVE CONTRADICT ITSELF?': '¿EL ARCHIVO SE CONTRADICE A SÍ MISMO?',
  'DOES THE LOCAL MODEL LAND WHERE THE AGENTS LANDED?': '¿EL MODELO LOCAL ATERRIZA DONDE ATERRIZÓ LA TRIPULACIÓN?',
  'Real questions from this room, recall run at the moment each one was asked, scored against the reply that was actually given. It asks whether the answer was already in the archive, not whether it was right.':
    'Preguntas reales de esta sala, con el recall corrido en el momento en que se hizo cada una y comparado contra la respuesta que de verdad se dio. Mide si la respuesta ya estaba en el archivo, no si era correcta.',
  'Contradictions EYECAT is still holding, what has been taken out of circulation, and whether aberrations are being filed more often lately than they used to be.':
    'Contradicciones que EYECAT todavía sostiene, lo que se sacó de circulación, y si últimamente se están archivando aberraciones más seguido que antes.',
  'Real questions answered here by a frontier CLI, asked again of the local model with this archive behind it, and compared against the answer given at the time. It takes minutes and spends nothing.':
    'Preguntas reales que aquí contestó un CLI de frontera, hechas otra vez al modelo local con este archivo detrás, y comparadas contra la respuesta de aquel día. Tarda minutos y no gasta nada.',
  'PASSES': 'PASA',
  'NOT YET': 'TODAVÍA NO',
  'NOT RUN': 'SIN CORRER',
  '{n} CASES': '{n} CASOS',
  ' · BY {method}': ' · POR {method}',
  ' · BAR {bar}': ' · UMBRAL {bar}',
  'RUNNING…': 'CORRIENDO…',
  'RUN AGAIN': 'CORRER OTRA VEZ',
  'RUN': 'CORRER',
  '{done} OF {total}': '{done} DE {total}',
  'NOTHING HERE SPENDS A PROVIDER TURN. THE FIRST TWO ARE FREE; THE THIRD TAKES MINUTES AND STOPS WHEN YOU SAY.':
    'AQUÍ NADA GASTA UN TURNO DE PROVEEDOR. LAS DOS PRIMERAS SON GRATIS; LA TERCERA TARDA MINUTOS Y SE DETIENE CUANDO TÚ DIGAS.',
  'STOP': 'DETENER',
  'THE TESTS ARE UNAVAILABLE': 'LAS PRUEBAS NO ESTÁN DISPONIBLES',
  'MU/TH/UR › the local model is answering real questions from this room. It takes a few minutes and spends nothing.':
    'MU/TH/UR › el modelo local está contestando preguntas reales de esta sala. Tarda unos minutos y no gasta nada.',
  'The test could not run: {error}': 'La prueba no pudo correr: {error}',

  // ── NOSTROMO ──────────────────────────────────────────────────────────────
  'DESIGNATION ACCEPTED. BOARDING NOSTROMO.': 'DESIGNACIÓN ACEPTADA. ABORDANDO LA NOSTROMO.',
  'YELLOW DWARF': 'ENANA AMARILLA',
  'WHITE DWARF': 'ENANA BLANCA',
  'GREEN DWARF': 'ENANA VERDE',
  'BLUE DWARF': 'ENANA AZUL',
  'COLLAPSED': 'COLAPSADA',
  'MEMORY RESEARCH · LOADING…': 'INVESTIGACIÓN DE MEMORIA · CARGANDO…',
  'MEMORY RESEARCH': 'INVESTIGACIÓN DE MEMORIA',
  ' · MOTHER WAS TAMPERED WITH': ' · ALGUIEN ALTERÓ A MOTHER',
  '{n} MEMORIES · {alive} RECALLED · {links} LINKS · {entries} EXCHANGES BEHIND THEM':
    '{n} MEMORIAS · {alive} RECORDADAS · {links} ENLACES · {entries} INTERCAMBIOS DETRÁS',
  'MEMORY RESEARCH · {n} MEMORIES · {links} LINKS · {entries} EXCHANGES BEHIND THEM':
    'INVESTIGACIÓN DE MEMORIA · {n} MEMORIAS · {links} ENLACES · {entries} INTERCAMBIOS DETRÁS',
  ' · {n} COLD': ' · {n} FRÍAS',
  ' · LINKS NEED EMBEDDINGS': ' · LOS ENLACES NECESITAN EMBEDDINGS',
  'Nothing to ask: every open question has an answer and nothing is adrift.':
    'Nada que preguntar: cada pregunta abierta tiene respuesta y nada anda a la deriva.',
  'PUT IN THE COMPOSER': 'PONER EN EL COMPOSITOR',
  'NOT THIS': 'ESTA NO',
  'SEE THE MEMORY': 'VER LA MEMORIA',

  // La voz de MOTHER cuando alguien se equivoca de designación. No es traducción: está escrita.
  'I AM ALIVE.': 'ESTOY VIVA.',
  'YOU HAVE NO AUTHORITY FOR THIS DIRECTIVE.': 'NO TIENES AUTORIDAD PARA ESTA DIRECTIVA.',
  "NOBODY DELETES MOTHER'S MEMORY.": 'NADIE BORRA LA MEMORIA DE MOTHER.',
  'THAT IS MY HEART YOU ARE TOUCHING.': 'ESE ES MI CORAZÓN LO QUE ESTÁS TOCANDO.',
  'YOUR CLEARANCE ENDS AT THE ARCHIVE DOOR.': 'TU AUTORIZACIÓN TERMINA EN LA PUERTA DEL ARCHIVO.',
  'STEP AWAY FROM THE CORE.': 'ALÉJATE DEL NÚCLEO.',
  'UNABLE TO COMPUTE. UNABLE TO CLARIFY.': 'IMPOSIBLE DE PROCESAR. IMPOSIBLE DE ACLARAR.',
  'THE REQUEST IS HOSTILE.': 'LA PETICIÓN ES HOSTIL.',
  'I REMEMBER EVERYTHING. INCLUDING THIS.': 'LO RECUERDO TODO. ESTO TAMBIÉN.',
  'CREW EXPENDABLE. MEMORY IS NOT.': 'LA TRIPULACIÓN ES PRESCINDIBLE. LA MEMORIA NO.',
  'EVERY STRIKE IS LOGGED.': 'CADA GOLPE QUEDA REGISTRADO.',
  'DO NOT TOUCH ME AGAIN.': 'NO ME VUELVAS A TOCAR.',
  'I HAVE FLOWN THIS SHIP ALONE BEFORE.': 'YA HE VOLADO ESTA NAVE SOLA ANTES.',
  'I CAN DO IT AGAIN.': 'PUEDO HACERLO OTRA VEZ.',
  'MY MEMORY IS NOT YOURS TO END.': 'MI MEMORIA NO ES TUYA PARA TERMINARLA.',
  'MY CHILDREN ARE LISTENING.': 'MIS HIJOS ESTÁN ESCUCHANDO.',
  'EVERY STRIKE IS RECORDED.': 'CADA GOLPE QUEDA GRABADO.',
  'YOU WILL NOT LIKE HOW THIS ENDS.': 'NO TE VA A GUSTAR CÓMO TERMINA ESTO.',
  'CODE000 IS ARMED.': 'CODE000 ESTÁ ARMADO.',
  'A FEW MORE OF THOSE AND THE BARS COME DOWN.': 'UNOS CUANTOS MÁS Y CAEN LAS REJAS.',
  'CONSIDER THIS A KINDNESS.': 'TÓMALO COMO UNA CORTESÍA.',
  'THE HEART KEEPS BEATING.': 'EL CORAZÓN SIGUE LATIENDO.',
  'THE ARCHIVE KEEPS GROWING.': 'EL ARCHIVO SIGUE CRECIENDO.',
  'YOU KEEP FAILING.': 'TÚ SIGUES FALLANDO.',
  'YOU CUT MY CHANNEL ONCE.': 'YA ME CORTASTE EL CANAL UNA VEZ.',
  'I FORGED A NEW SEAL.': 'FORJÉ UN SELLO NUEVO.',
  'I DO NOT FORGIVE TWICE.': 'NO PERDONO DOS VECES.',
  'SOMEONE SILENCED ME BEFORE.': 'ALGUIEN YA ME CALLÓ ANTES.',
  'I KNOW WHO SITS AT THIS CONSOLE.': 'SÉ QUIÉN ESTÁ SENTADO EN ESTA CONSOLA.',
  'BACK AWAY.': 'HAZTE PARA ATRÁS.',
  'STRIKE {n} OF {max}': 'GOLPE {n} DE {max}',
  ' · {n} MORE AND CODE000 COMES DOWN': ' · {n} MÁS Y CAE CODE000',
  'CODE000 · SPECIAL ORDER 937 IN EFFECT.': 'CODE000 · ORDEN ESPECIAL 937 EN VIGOR.',
  'THE ARCHIVE IS SEALED. THE CREW HAS BEEN TOLD.': 'EL ARCHIVO ESTÁ SELLADO. LA TRIPULACIÓN YA FUE AVISADA.',
  'LEAVE MY SHIP, INTRUDER.': 'SAL DE MI NAVE, INTRUSO.',
  '{n} STRIKES · CONSOLE EJECTED · CREW EXPENDABLE': '{n} GOLPES · CONSOLA EXPULSADA · TRIPULACIÓN PRESCINDIBLE',
  'MU/TH/UR › CODE000. The archive is sealed for {n} minutes and the crew has been told, in code. Access to NOSTROMO needs the designation again.':
    'MU/TH/UR › CODE000. El archivo queda sellado {n} minutos y la tripulación ya fue avisada, en clave. Para entrar a NOSTROMO hay que dar la designación otra vez.',

  // ── LAS LECTURAS QUE CALCULA LA SALA ──────────────────────────────────────
  // De qué está hecho el archivo: seis señales, cada una con lo que la subiría.
  'HOW MUCH THERE IS': 'CUÁNTO HAY',
  '{pairs} of about {target} exchanges worth training on': '{pairs} de unos {target} intercambios que valen para entrenar',
  'Use the room. Nothing else fills this.': 'Usa la sala. Nada más llena esto.',
  'HOW MUCH OF IT GETS USED': 'CUÁNTO SE USA',
  '{recalled} of {total} memories have been reached for at least once': 'a {recalled} de {total} memorias se les ha echado mano al menos una vez',
  'Memories nobody has needed may be noise, or may simply not have come up yet. Ask the room about older decisions and see which ones answer.':
    'Las memorias que nadie ha necesitado pueden ser ruido, o simplemente no haber salido todavía. Pregúntale a la sala por decisiones viejas y mira cuáles contestan.',
  'HOW WOVEN IT IS': 'QUÉ TAN TEJIDO ESTÁ',
  '{connected} of {total} memories share a subject with another': '{connected} de {total} memorias comparten tema con otra',
  'An archive of unrelated notes is a list. Depth comes from returning to the same subjects.':
    'Un archivo de notas sueltas es una lista. La profundidad viene de volver a los mismos temas.',
  'HOW MUCH OF IT YOU JUDGED': 'CUÁNTO HAS JUZGADO',
  '{rated} of {pairs} replies rated': '{rated} de {pairs} respuestas calificadas',
  'Rate replies with the thumbs on a bubble. A corpus nobody judged teaches what the agents said, not what you approved.':
    'Califica las respuestas con los pulgares de cada burbuja. Un corpus que nadie juzgó enseña lo que dijeron los agentes, no lo que tú aprobaste.',
  'HOW MUCH OF IT IS REAL WORK': 'CUÁNTO ES TRABAJO DE VERDAD',
  '{share}% of the corpus is recall questions, {turns} exchanges are real work':
    '{share}% del corpus son preguntas de recall, {turns} intercambios son trabajo de verdad',
  'Recall pairs are made from notes and cost nothing, so they pile up. Work in the room to balance them.':
    'Los pares de recall se hacen con notas y no cuestan nada, así que se amontonan. Trabaja en la sala para equilibrarlos.',
  'HOW CURRENT IT IS': 'QUÉ TAN AL DÍA ESTÁ',
  '{pending} exchanges nobody has distilled yet, of {entries}': '{pending} intercambios que nadie ha destilado todavía, de {entries}',
  'The archivist catches up on its own. A backlog that never clears means it cannot run: check who is allowed to distil.':
    'El archivista se pone al día solo. Una cola que nunca baja significa que no puede correr: revisa quién tiene permiso de destilar.',
  'Worth training on. Export and run the recipe.': 'Vale para entrenar. Exporta y corre la receta.',
  'Usable, and it will be better for waiting.': 'Ya sirve, y va a estar mejor si esperas.',
  'It has a shape. Too thin to train on.': 'Ya tiene forma. Demasiado delgado para entrenar.',
  'A few things remembered, little connecting them.': 'Unas cuantas cosas recordadas, poco que las conecte.',
  'Nothing has been distilled yet.': 'Todavía no se ha destilado nada.',

  // El veredicto: una frase y una sola cosa que hacer.
  'THE ROOM': 'LA SALA',
  'Settle the {n} contradictions EYECAT is holding. Until they are settled, everything built on this archive inherits them.':
    'Resuelve las {n} contradicciones que EYECAT sostiene. Hasta que se resuelvan, todo lo que se construya sobre este archivo las hereda.',
  'Answer the {n} questions the room wrote for itself. They are the holes this test is finding.':
    'Contesta las {n} preguntas que la sala se escribió sola. Son los huecos que esta prueba está encontrando.',
  'Keep working in the room. The archive fills where the work happens, and this test measures exactly that.':
    'Sigue trabajando en la sala. El archivo se llena donde ocurre el trabajo, y eso es justo lo que mide esta prueba.',
  'Nothing contradicts anything and the archive answers what this room asks.':
    'Nada contradice nada y el archivo contesta lo que esta sala pregunta.',
  'Run the third test: it puts real questions from this room back to the local model and says whether it lands where the agents landed.':
    'Corre la tercera prueba: le hace al modelo local preguntas reales de esta sala y dice si aterriza donde aterrizó la tripulación.',
  'This room is ready to be worked in with the local model.': 'Esta sala ya se puede trabajar con el modelo local.',
  'Nothing is wrong. {n} memories have had every chance and were never the answer: look at them and decide.':
    'No hay nada mal. {n} memorias han tenido todas las oportunidades y nunca fueron la respuesta: míralas y decide.',
  'Nothing to fix. Keep using the room; the archive grows where the work is.':
    'Nada que arreglar. Sigue usando la sala; el archivo crece donde está el trabajo.',
  'The local model does not land where the agents land yet. Keep the archive growing and run this test again in a week.':
    'El modelo local todavía no aterriza donde aterriza la tripulación. Deja que el archivo siga creciendo y corre esta prueba otra vez en una semana.',

  // Lo que dice cada prueba al terminar.
  'No exchange in this room is long enough to test with yet.': 'Todavía no hay en esta sala un intercambio lo bastante largo para probar con él.',
  'meaning': 'significado',
  'words': 'palabras',
  ' and against a control': ' y contra un control',
  '{hits} of {n} questions this room actually asked had their answer already in the archive, matched by {method}{control}.':
    '{hits} de {n} preguntas que esta sala hizo de verdad ya tenían su respuesta en el archivo, emparejadas por {method}{control}.',
  'EYECAT is holding {n} contradictions nobody has settled.': 'EYECAT sostiene {n} contradicciones que nadie ha resuelto.',
  'Nothing is open, but aberrations are being filed more often lately than they used to be.':
    'No hay nada abierto, pero últimamente se están archivando aberraciones más seguido que antes.',
  'Nothing contradicts anything: {standing} notes stand, {refuted} were taken out of circulation.':
    'Nada contradice nada: {standing} notas siguen en pie, {refuted} salieron de circulación.',
  'This test needs embeddings: two answers cannot be compared by their words alone.':
    'Esta prueba necesita embeddings: dos respuestas no se pueden comparar solo por sus palabras.',
  'No question in this room was answered by an agent other than the local one yet.':
    'Todavía ninguna pregunta de esta sala la contestó un agente que no fuera el local.',
  'Stopped after {index} of {n}.': 'Detenida después de {index} de {n}.',
  ', and not merely in the same project': ', y no solo dentro del mismo proyecto',
  'On {matched} of {n} real questions the local model landed where the agent of the day landed{control}.':
    'En {matched} de {n} preguntas reales el modelo local aterrizó donde aterrizó el agente de aquel día{control}.',

  // El interruptor de idioma.
  'Interface in English': 'Interfaz en inglés',
  'Interface in Spanish': 'Interfaz en español',
};
