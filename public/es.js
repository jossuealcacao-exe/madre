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

  // ── MODULES · EYECAT · ECONOMÍA · EL SDK ──────────────────────────────────
  'MODULES › ': 'MÓDULOS › ',
  '◉ EYECAT': '◉ EYECAT',
  'IN DOUBT': 'EN DUDA',
  'AGAINST': 'EN CONTRA',
  'WHAT SEEMS TRUE': 'LO QUE PARECE CIERTO',
  'IT IS FALSE': 'ES FALSA',
  'Files it as an aberration and takes the memory out of every turn. Reversible from NOSTROMO.':
    'La archiva como aberración y saca esa memoria de todos los turnos. Se puede deshacer desde NOSTROMO.',
  'IT STANDS': 'SE QUEDA',
  'The room was right. This pair is never raised again.': 'La sala tenía razón. Este par no se vuelve a levantar.',
  'DEV': 'DEV',
  'MU/TH/UR › a module is a .mjs file.': 'MU/TH/UR › un módulo es un archivo .mjs.',
  'RUN IT': 'CORRERLO',
  'MU/TH/UR › updating. The output is in the room, and the card refreshes when it finishes.':
    'MU/TH/UR › actualizando. La salida está en la sala, y la ficha se refresca al terminar.',
  'NOT NOW': 'AHORA NO',
  'ECONOMY · THIS ROOM': 'ECONOMÍA · ESTA SALA',
  'NO TURNS WEIGHED YET · SEND A MESSAGE AND THIS FILLS': 'TODAVÍA NO SE HA PESADO NINGÚN TURNO · MANDA UN MENSAJE Y ESTO SE LLENA',
  'ECONOMY UNAVAILABLE': 'ECONOMÍA NO DISPONIBLE',
  'LOCAL BRAIN': 'CEREBRO LOCAL',
  'ROLES': 'PAPELES',
  'GET OLLAMA ↗': 'CONSEGUIR OLLAMA ↗',
  'Without Ollama running, the room keeps using its providers. Start it, then RECHECK.':
    'Sin Ollama corriendo, la sala sigue usando sus proveedores. Enciéndelo y dale REVISAR OTRA VEZ.',
  'CANNOT ENABLE YET': 'TODAVÍA NO SE PUEDE ENCENDER',
  'THIS WRITES INTO THE PROJECT. MADRE WILL RUN, IN THE PROJECT FOLDER:':
    'ESTO ESCRIBE DENTRO DEL PROYECTO. MADRE VA A CORRER, EN LA CARPETA DEL PROYECTO:',
  'DEVELOP FOR MADRE': 'DESARROLLA PARA MADRE',
  'Would you like to develop for MADRE?': '¿Te gustaría desarrollar para MADRE?',
  'Use our SDK to build your own modules: one file, no build, no dependencies. A switch, settings, slash commands, tools for the agents, routes. Write it by hand or with an AI, drop it in a folder, reload.':
    'Usa nuestro SDK para construir tus propios módulos: un archivo, sin build, sin dependencias. Un interruptor, ajustes, comandos, herramientas para los agentes, rutas. Escríbelo a mano o con una IA, déjalo caer en una carpeta y recarga.',
  ' every project · ': ' todos los proyectos · ',
  ' this project': ' este proyecto',
  'READ THE SDK ↗': 'LEER EL SDK ↗',
  'RELOAD MODULES': 'RECARGAR MÓDULOS',
  'Load your module files again without restarting the room': 'Vuelve a cargar tus archivos de módulo sin reiniciar la sala',
  'YOURS · ': 'TUYOS · ',
  'REMOVE': 'QUITAR',
  'DID NOT LOAD · ': 'NO CARGÓ · ',
  'connections › ': 'conexiones › ',
  'HELP': 'AYUDA',
  'MU/TH/UR › the whole briefing is on your clipboard, exactly as the agent receives it.':
    'MU/TH/UR › el briefing completo está en tu portapapeles, exactamente como lo recibe el agente.',
  'provider/model': 'proveedor/modelo',

  // Privacidad, lo que faltaba.
  'Replace every private term already in the ledger, the index and the memories with the marker. Asks for the project designation.':
    'Reemplaza con el marcador cada término privado que ya esté en el ledger, el índice y las memorias. Pide la designación del proyecto.',
  'PRIVATE TERMS · ONE PER LINE': 'TÉRMINOS PRIVADOS · UNO POR LÍNEA',
  'REPLACED WITH': 'SE REEMPLAZAN CON',
  'REDACT KEYS, TOKENS AND E-MAIL ADDRESSES ANYWHERE THEY APPEAR':
    'TACHAR LLAVES, TOKENS Y CORREOS DONDEQUIERA QUE APAREZCAN',
  'redaction of keys and addresses': 'el tachado de llaves y correos',
  'API keys, GitHub and npm tokens, JWTs and e-mail addresses are recognisable by shape in any project. Caught before the ledger, the archivist, the other agents and the dataset.':
    'Las API keys, los tokens de GitHub y npm, los JWT y los correos se reconocen por su forma en cualquier proyecto. Se atrapan antes del ledger, del archivista, de los demás agentes y del dataset.',
  "REPLACE THIS MACHINE'S HOME PATH WITH ~": 'CAMBIAR LA RUTA HOME DE ESTA COMPUTADORA POR ~',
  'hiding of home paths': 'el ocultamiento de las rutas home',
  'A path like /Users/yourname carries who you are into every reply that quotes it. The path still reads, it just stops naming you.':
    'Una ruta como /Users/tunombre mete quién eres en cada respuesta que la cite. La ruta se sigue leyendo, nada más deja de nombrarte.',
  'PURGE ROOM · Every private term already recorded becomes the marker, in the ledger, the index and the memories. This cannot be undone. Type the project designation to confirm:':
    'PURGAR LA SALA · Cada término privado ya registrado se convierte en el marcador, en el ledger, el índice y las memorias. Esto no se deshace. Escribe la designación del proyecto para confirmar:',
  'PULSE_PRIVATE_TERMS IS SET; THOSE TERMS ARE ADDED TO THIS LIST ON EVERY LAUNCH.':
    'PULSE_PRIVATE_TERMS ESTÁ PUESTA; ESOS TÉRMINOS SE AGREGAN A ESTA LISTA EN CADA INICIO.',
  'EXPOSURE CHECK UNAVAILABLE': 'LA REVISIÓN DE EXPOSICIÓN NO ESTÁ DISPONIBLE',

  // ── EL HILO: lo que pasa en la sala, mensaje por mensaje ──────────────────
  'ASH': 'ASH',
  'acknowledged, human': 'recibido, humano',
  'handoff note': 'nota de relevo',
  'handoff ': 'relevo ',
  'The rating was not saved: {error}': 'La calificación no se guardó: {error}',
  'MU/TH/UR › the clipboard is not available here; select the text and copy.':
    'MU/TH/UR › aquí no hay portapapeles; selecciona el texto y cópialo.',
  'REPLY TO @{agent}{seq} WITH': 'RESPONDER A @{agent}{seq} CON',
  'the same agent': 'el mismo agente',
  '{label} · not ready': '{label} · no está listo',
  'Answer without quoting this': 'Contestar sin citar esto',
  'Thinking about "{topic}"…': 'Pensando en «{topic}»…',
  '{n} in': '{n} de entrada',
  '{n} ch in': '{n} car de entrada',
  '{n} out': '{n} de salida',
  '{n} ch': '{n} car',
  ', and {n} characters written back so far': ', y {n} caracteres escritos de vuelta hasta ahora',
  '{chars} characters. This room has not been billed yet, so there is no rate to convert them at.':
    '{chars} caracteres. A esta sala todavía no le han facturado, así que no hay tasa con qué convertirlos.',
  "{chars} characters of briefing and transcript, about {tokens} tokens at this room's measured rate{written}. The exact figure arrives when the agent answers.":
    '{chars} caracteres de briefing y transcripción, unos {tokens} tokens a la tasa medida de esta sala{written}. La cifra exacta llega cuando el agente contesta.',
  '. Another {n} were read back from its own cache instead of being charged again':
    '. Otros {n} se leyeron de su propia caché en vez de cobrarse otra vez',
  "Charged by this agent's own CLI: {input} input tokens, {output} output{cached}.":
    'Cobrado por el propio CLI de este agente: {input} tokens de entrada, {output} de salida{cached}.',
  '{label} is reading the project… {seconds}s so far; MADRE gives up at {limit}s.':
    '{label} está leyendo el proyecto… {seconds}s hasta ahora; MADRE se rinde a los {limit}s.',
  ' · read it, then ': ' · léelo, y luego ',
  'MU/TH/UR › {name} installed for {where}. Switch it on in MODULES.':
    'MU/TH/UR › {name} instalado para {where}. Enciéndelo en MÓDULOS.',
  'The module was not installed: {error}': 'El módulo no se instaló: {error}',
  'INSTALL FOR EVERY ROOM': 'INSTALAR PARA TODAS LAS SALAS',
  'INSTALL FOR THIS PROJECT': 'INSTALAR PARA ESTE PROYECTO',
  ' · a module runs inside MADRE with your permissions': ' · un módulo corre dentro de MADRE con tus permisos',
  'module · ': 'módulo · ',
  ' installed for {where} by {who} · switch it on in MODULES': ' instalado para {where} por {who} · enciéndelo en MÓDULOS',
  'you': 'ti',
  ' removed by {who}': ' quitado por {who}',
  '@madre': '@madre',
  'MU/TH/UR › the local model is answering real questions from this room. It takes a few minutes, it spends nothing, and the answer lands here.':
    'MU/TH/UR › el modelo local está contestando preguntas reales de esta sala. Tarda unos minutos, no gasta nada, y la respuesta cae aquí.',
  'It answered {matched} of {n} real questions from this room where the crew answered them. It is ready to be worked in.':
    'Contestó {matched} de {n} preguntas reales de esta sala donde las contestó la tripulación. Ya se puede trabajar con él.',
  'It answered {matched} of {n} real questions the way the crew did. Not yet — keep working, the archive fills where the work happens.':
    'Contestó {matched} de {n} preguntas reales como lo hizo la tripulación. Todavía no — sigue trabajando, el archivo se llena donde ocurre el trabajo.',
  'SEND THE NEXT TURN TO @MADRE': 'MANDARLE EL PRÓXIMO TURNO A @MADRE',
  'MEASURED {when}': 'MEDIDO {when}',
  'It is in the room. Nobody has measured it against this project yet: running here is not the same as being of use here.':
    'Está en la sala. Nadie lo ha medido contra este proyecto todavía: correr aquí no es lo mismo que servir aquí.',
  'privacy · ': 'privacidad · ',
  'PURGE': 'PURGA',
  '{events} events · {entries} indexed exchanges · {memories} memories rewritten with the marker':
    '{events} eventos · {entries} intercambios indexados · {memories} memorias reescritas con el marcador',
  '{n} private terms replaced with {marker}': '{n} términos privados reemplazados con {marker}',
  'memory · ': 'memoria · ',
  'memory · the human forgot a ': 'memoria · a la humana se le olvidó un ',
  ' could not distil #{from}–#{through}: ': ' no pudo destilar #{from}–#{through}: ',
  ' · batch skipped': ' · lote saltado',
  ' · @{agent} takes the next run': ' · @{agent} toma la siguiente corrida',
  ' · will retry': ' · va a reintentar',
  ' read {considered} exchanges (#{from}–#{through}) · kept {added} memories':
    ' leyó {considered} intercambios (#{from}–#{through}) · se quedó con {added} memorias',
  ' · {n} in the archive': ' · {n} en el archivo',
  ' · {n} waiting': ' · {n} en espera',
  '◉ memory used · {n}': '◉ memoria usada · {n}',
  ' · {n} by association': ' · {n} por asociación',
  '◉ memory saved': '◉ memoria guardada',
  'Saved by @{agent} for every future turn · #{from}–#{through}. Click to see it in NOSTROMO.':
    'Guardada por @{agent} para todos los turnos que vienen · #{from}–#{through}. Haz clic para verla en NOSTROMO.',
  'MU/TH/UR › TO ALL CREW': 'MU/TH/UR › A TODA LA TRIPULACIÓN',
  ' · CHANNEL TAMPERED': ' · CANAL ALTERADO',
  ' · CODE000 · {n} STRIKES · ARCHIVE SEALED {min} MIN': ' · CODE000 · {n} GOLPES · ARCHIVO SELLADO {min} MIN',
  "Message #{n}, sealed under MOTHER's key in .pulse/mother.env. Only the crew reads it in clear.":
    'Mensaje #{n}, sellado con la llave de MOTHER en .pulse/mother.env. Solo la tripulación lo lee en claro.',
  ' · {n} messages carried': ' · {n} mensajes cargados',
  ' · {n} older stay in the record': ' · {n} más viejos se quedan en el registro',
  ' · no prior context': ' · sin contexto previo',
  'The receiving agent gets the most recent transcript that fits its context allowance ({fit}). Adjust with PULSE_CONTEXT_MAX_CHARS.':
    'El agente que recibe se lleva la transcripción más reciente que quepa en su contexto ({fit}). Se ajusta con PULSE_CONTEXT_MAX_CHARS.',
  '{n} older messages did not fit; they remain in the room log': 'no cupieron {n} mensajes más viejos; se quedan en el registro de la sala',
  'everything fit': 'cupo todo',
  'local budget': 'presupuesto local',
  'provider quota': 'cuota del proveedor',
  'simulated window': 'ventana simulada',
  'usage window': 'ventana de uso',
  'projection · ': 'proyección · ',
  'at {pct}% of {scope} · next turn like the last → {projected}%': 'en {pct}% de {scope} · otro turno como el anterior → {projected}%',
  '{pct}% of {scope} used': '{pct}% de {scope} usado',
  ' · continue with {who}': ' · sigue con {who}',
  'plan · ': 'plan · ',
  "@{agent}'s plan block was not run · {why} · ask again and it will fix the block":
    'el bloque de plan de @{agent} no se corrió · {why} · vuelve a pedirlo y lo arregla',
  'MU/TH/UR › ': 'MU/TH/UR › ',
  'create · ': 'crear · ',
  ' · {n} existing files put back, CREATE only adds: {files}': ' · {n} archivos que ya existían se restauraron, CREATE solo agrega: {files}',
  ' · {n} writes into forbidden zones reverted': ' · {n} escrituras en zonas prohibidas revertidas',
  ' · need to change existing files? ask again in #3 CONTROL': ' · ¿necesitas cambiar archivos que ya existen? pídelo otra vez en #3 CONTROL',
  'CONTROL · ': 'CONTROL · ',
  ' holds the project · checkpoint ': ' tiene el proyecto · checkpoint ',
  'MU/TH/UR › @{agent} holds CONTROL. Checkpoint taken; UNDO will be one click.':
    'MU/TH/UR › @{agent} tiene CONTROL. Checkpoint tomado; DESHACER va a ser un clic.',
  ' changed {n} files': ' cambió {n} archivos',
  ' changed nothing': ' no cambió nada',
  'added': 'agregado',
  'modified': 'modificado',
  'deleted': 'borrado',
  'renamed': 'renombrado',
  '… and {n} more': '… y {n} más',
  '{n} writes into forbidden zones reverted: {where}': '{n} escrituras en zonas prohibidas revertidas: {where}',
  'UNDO · RESTORE CHECKPOINT': 'DESHACER · RESTAURAR CHECKPOINT',
  'Put the project back exactly as it was before this CONTROL turn.':
    'Deja el proyecto exactamente como estaba antes de este turno de CONTROL.',
  'RESTORED': 'RESTAURADO',
  "project restored to the checkpoint before @{agent}'s turn · {restored} restored · {removed} removed":
    'proyecto restaurado al checkpoint anterior al turno de @{agent} · {restored} restaurados · {removed} quitados',
  'RESEND TO @{agent} WITH CREATE': 'REENVIAR A @{agent} CON CREATE',
  'Send this same request from you, with a creation lease.': 'Manda esta misma petición de tu parte, con permiso de creación.',
  'RESENT WITH CREATE': 'REENVIADO CON CREATE',
  'It could not be resent: {error}': 'No se pudo reenviar: {error}',
  'ALWAYS FOR THIS AGENT': 'SIEMPRE PARA ESTE AGENTE',
  'Give @{agent} a standing lease in CONNECTIONS: every turn may create files.':
    'Dale a @{agent} un permiso permanente en CONEXIONES: cada turno puede crear archivos.',
  'GRANT ONCE': 'CONCEDER UNA VEZ',
  'GRANT FOR PLAN': 'CONCEDER PARA EL PLAN',
  'Every remaining writable step of this plan shares one lease directory.':
    'Todos los pasos con escritura que le quedan a este plan comparten una sola carpeta de permiso.',
  'DENY': 'NEGAR',
  'anywhere in the project · existing files stay untouched': 'donde sea en el proyecto · los archivos que ya existen no se tocan',
  ' · scratch ': ' · borrador ',
  'in ': 'en ',
  'STOPALL': 'STOPALL',
  'STOPALL failed to reach the room.': 'STOPALL no llegó a la sala.',
  'MU/TH/UR › all quiet. nothing was running.': 'MU/TH/UR › todo tranquilo. no había nada corriendo.',
  'Stop the remaining steps of this plan': 'Detener los pasos que le quedan a este plan',
  'That plan is no longer running.': 'Ese plan ya no está corriendo.',
  'clear · ': 'claro · ',

  // ── EL RESTO DE LA SALA ───────────────────────────────────────────────────
  'Enable it in MODULES.': 'Enciéndelo en MÓDULOS.',
  'ASK THE ROOM': 'PREGUNTARLE A LA SALA',
  'Put this error and the file into the composer': 'Pone este error y el archivo en el compositor',
  'MU/TH/UR › RIPLEY reloaded the page: an agent changed it.': 'MU/TH/UR › RIPLEY recargó la página: un agente la cambió.',
  'loading…': 'cargando…',
  'select & copy': 'selecciona y copia',
  'to ': 'para ',
  'memory · answers & asks the crew · never writes': 'memoria · contesta y le pregunta a la tripulación · nunca escribe',
  'Choose the model for this agent': 'Elige el modelo de este agente',
  'loading models…': 'cargando modelos…',
  'other model name…': 'otro nombre de modelo…',
  'DESIGNATION ›': 'DESIGNACIÓN ›',
  'DESIGNATION ACCEPTED. SECOND KEY: TYPE AIRLOCK TO OPEN THE SHIP.':
    'DESIGNACIÓN ACEPTADA. SEGUNDA LLAVE: ESCRIBE AIRLOCK PARA ABRIR LA NAVE.',
  'SECOND KEY ›': 'SEGUNDA LLAVE ›',
  'AIRLOCK': 'AIRLOCK',
  'PROVIDER': 'PROVEEDOR',
  'SAVE KEY': 'GUARDAR LLAVE',
  'WHERE DO I GET ONE ↗': '¿DÓNDE CONSIGO UNA? ↗',
  'WORKING…': 'TRABAJANDO…',
  'INSTALLING…': 'INSTALANDO…',
  'more entries not shown': 'hay más entradas que no se muestran',
  'Delete this conversation. Its transcript goes; what the archive learned from it stays.':
    'Borra esta conversación. Su transcripción se va; lo que el archivo aprendió de ella se queda.',
  'Press again to delete this conversation.': 'Vuelve a apretar para borrar esta conversación.',
  'end of record. nothing else is down here, human. crew status under review.':
    'fin del registro. aquí abajo no hay nada más, humano. estado de la tripulación en revisión.',
  'MU/TH/UR › nobody in the room can generate images right now: enable Image Studio in MODULES or switch on GENERATE IMAGES for an agent in CONNECTIONS.':
    'MU/TH/UR › ahora mismo nadie en la sala puede generar imágenes: enciende Image Studio en MÓDULOS o préndele GENERAR IMÁGENES a un agente en CONEXIONES.',
  'Remove': 'Quitar',
  'MU/TH/UR › the archive is open again. Behave.': 'MU/TH/UR › el archivo está abierto otra vez. Compórtate.',
  'MU/TH/UR › ASH: every agent will answer in compact prose. What you write is never altered.':
    'MU/TH/UR › ASH: cada agente va a contestar en prosa compacta. Lo que tú escribes nunca se altera.',
  'An attachment is still uploading.': 'Todavía se está subiendo un adjunto.',
  'SELECT': 'SELECCIONA',
  'DIAGNOSIS': 'DIAGNÓSTICO',
  'REMEDY': 'REMEDIO',
  'APPLIED ✓': 'APLICADO ✓',
  'APPLIES NOW · TERMINAL COMMANDS BELOW ARE THE LAUNCH-TIME ALTERNATIVE':
    'SE APLICA AHORA · LOS COMANDOS DE ABAJO SON LA ALTERNATIVA PARA EL PRÓXIMO ARRANQUE',
  'NO CONDITIONS RECORDED. ALL SYSTEMS NOMINAL.': 'SIN CONDICIONES REGISTRADAS. TODOS LOS SISTEMAS NOMINALES.',
  'Expand': 'Expandir',
  'UNCLASSIFIED': 'SIN CLASIFICAR',
  'NO SPECIAL ORDERS ON THIS SHIP. THE CREW IS NOT EXPENDABLE. RESTATE INQUIRY.':
    'EN ESTA NAVE NO HAY ÓRDENES ESPECIALES. LA TRIPULACIÓN NO ES PRESCINDIBLE. REFORMULA LA CONSULTA.',
  'INQUIRY ACCEPTS: AN AGENT NAME · A SYMPTOM · A KEYWORD SUCH AS TIMEOUT, LOGIN, PORT, BUDGET.':
    'LA CONSULTA ACEPTA: UN NOMBRE DE AGENTE · UN SÍNTOMA · UNA PALABRA COMO TIMEOUT, LOGIN, PUERTO, PRESUPUESTO.',
  'UNABLE TO COMPUTE. REQUEST CLARIFICATION.': 'IMPOSIBLE DE PROCESAR. SE SOLICITA ACLARACIÓN.',
  'NOSTROMO › the question is in the composer. Send it to whoever should answer it, or to @madre, which costs nothing.':
    'NOSTROMO › la pregunta está en el compositor. Mándasela a quien deba contestarla, o a @madre, que no cuesta nada.',
  'Stop offering this one. Nothing is forgotten and nothing is written.':
    'Deja de ofrecer esta. No se olvida nada y no se escribe nada.',
  'No theme shared with another memory yet.': 'Todavía no comparte tema con ninguna otra memoria.',
  'TAKEN DOWN': 'DADA DE BAJA',
  'This aberration took that memory out of every future turn.': 'Esta aberración sacó esa memoria de todos los turnos que vienen.',
  'REFUTES IT': 'LA REFUTA',
  'An aberration took this memory out of every future turn.': 'Una aberración sacó esta memoria de todos los turnos que vienen.',
  'PRESS AGAIN TO FORGET · FOREVER': 'VUELVE A APRETAR PARA OLVIDAR · PARA SIEMPRE',
  'FORGET THIS MEMORY': 'OLVIDAR ESTA MEMORIA',
  'FORGETTING…': 'OLVIDANDO…',
  'RELEASE CHANNEL · UNAVAILABLE': 'CANAL DE RELEASES · NO DISPONIBLE',
  'RESTARTING…': 'REINICIANDO…',
  'MU/TH/UR › the room did not come back on its own. Start it from your terminal.':
    'MU/TH/UR › la sala no regresó sola. Arráncala desde tu terminal.',
  'CHECK NOW': 'REVISAR AHORA',
  "THE SENTINEL KEEPS FAILURES MU/TH/UR CANNOT EXPLAIN, AND CRASHES, WITH PATHS, NAMES AND KEYS REMOVED. NOTHING LEAVES THIS MACHINE UNLESS YOU SEND IT: BY HAND AS A GITHUB ISSUE YOU READ FIRST, OR AUTOMATICALLY TO THE AUTHOR'S COLLECTOR IF YOU SWITCH THAT ON.":
    'EL CENTINELA GUARDA LAS FALLAS QUE MU/TH/UR NO SABE EXPLICAR, Y LOS CRASHES, SIN RUTAS, NOMBRES NI LLAVES. NADA SALE DE ESTA COMPUTADORA A MENOS QUE TÚ LO MANDES: A MANO COMO UN ISSUE DE GITHUB QUE LEES PRIMERO, O SOLO AL RECOLECTOR DEL AUTOR SI ENCIENDES ESA OPCIÓN.',
  '✎ FEEDBACK TO THE AUTHOR': '✎ COMENTARIOS AL AUTOR',

  // El interruptor de idioma.
  'Interface in English': 'Interfaz en inglés',
  'Interface in Spanish': 'Interfaz en español',
};
