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
  'In this room: {on} output tokens is the middle turn with ASH ({onTurns} turns), {off} without it ({offTurns}). You choose when to ask for compact prose, so these are different tasks, not the same task twice.':
    'En esta sala: {on} tokens de salida es el turno de en medio con ASH ({onTurns} turnos), {off} sin ASH ({offTurns}). Tú decides cuándo pedir prosa compacta, así que son tareas distintas, no la misma tarea dos veces.',
  '{n} uncharged': '{n} no cobrados',
  '{cached} tokens this CLI read back from its own cache instead of charging them again (measured). {unsent} tokens of briefing the room never sent (estimated at {rate} characters per token). Neither is Ash: Ash shortens the answer, and that is the figure above the bubble.':
    '{cached} tokens que este CLI leyó de su propia caché en vez de volver a cobrarlos (medido). {unsent} tokens de briefing que la sala nunca envió (estimado a {rate} caracteres por token). Ninguno de los dos es Ash: Ash acorta la respuesta, y esa cifra está arriba de la burbuja.',
  'TOKENS SAVED': 'TOKENS AHORRADOS',
  'input the CLI did not charge again · {pct} of the input': 'entrada que el CLI no volvió a cobrar · {pct} de la entrada',
  'SPENT IN': 'GASTADO EN ENTRADA',
  'input tokens actually charged': 'tokens de entrada realmente cobrados',
  '@madre can answer this from the room archive, on this computer, for no tokens · it read {why}':
    '@madre puede contestar esto desde el archivo de la sala, en esta computadora, sin gastar tokens · leyó {why}',
  'ASK @madre': 'PREGÚNTALE A @madre',
  'what was decided': 'qué se decidió',
  'whether this came up before': 'si esto ya había salido',
  'where the room left off': 'dónde se quedó la sala',
  'why something was chosen': 'por qué se eligió algo',
  'what somebody said': 'qué dijo alguien',
  'what is still open': 'qué sigue abierto',
  'TURNS THE ROOM ANSWERED ITSELF': 'TURNOS QUE LA SALA CONTESTÓ SOLA',
  'FREE TURNS': 'TURNOS SIN COSTO',
  'answered by @madre on this computer · no provider, no bill':
    'contestados por @madre en esta computadora · sin proveedor, sin factura',
  'OF EVERY TURN': 'DEL TOTAL',
  'of the turns weighed in this room': 'de los turnos pesados en esta sala',
  'A PAID TURN': 'UN TURNO PAGADO',
  'the middle paid turn here · what the others cost, not what these would have':
    'el turno pagado de en medio · lo que costaron los otros, no lo que habrían costado estos',
  'These turns have no bill because nothing left this computer to answer them. MADRE does not say what they would have cost somewhere else: nobody measured that.':
    'Estos turnos no tienen factura porque nada salió de esta computadora para contestarlos. MADRE no dice cuánto habrían costado en otro lado: eso nadie lo midió.',
  '{pct} shorter with ASH, wider than this agent varies here (±{on} and ±{off})':
    '{pct} más corta con ASH, más que lo que este agente varía aquí (±{on} y ±{off})',
  'the difference fits inside how much this agent varies anyway (±{on} and ±{off}) · nothing to read yet':
    'la diferencia cabe dentro de lo que este agente varía de todos modos (±{on} y ±{off}) · todavía no hay nada que leer',
  'on · agents may ask you to choose': 'encendido · los agentes pueden pedirte que elijas',
  'off · agents answer in prose': 'apagado · los agentes contestan en prosa',
  'Lets an agent hand a decision back to you as buttons instead of a paragraph, when the answer turns on three or more real options. Costs about 135 tokens of instruction per turn while it is on, counted in the economy like every other block.':
    'Deja que un agente te devuelva una decisión como botones en vez de un párrafo, cuando la respuesta depende de tres o más opciones reales. Cuesta unos 135 tokens de instrucción por turno mientras está encendido, contados en la economía como cualquier otro bloque.',
  'Writes it into the composer · nothing is sent until you press send': 'Lo escribe en el compositor · no se manda nada hasta que le des enviar',
  '◉ decided here · {n}': '◉ decidido aquí · {n}',
  'TURNS WEIGHED': 'TURNOS CON FACTURA',
  '{n} characters': '{n} caracteres',
  ' · ALWAYS': ' · SIEMPRE',
  'Characters each block adds to one prompt.': 'CARACTERES QUE CADA BLOQUE AÑADE A UN PROMPT',
  'tokens this room never paid for': 'TOKENS QUE ESTA SALA NUNCA PAGÓ',
  'every turn this room has been billed for': 'cada turno por el que cobraron a esta sala',
  'INPUT CHARGED': 'ENTRADA COBRADA',
  'tokens the CLIs charged as fresh reading': 'tokens que los CLIs cobraron como lectura nueva',
  'OUTPUT CHARGED': 'SALIDA COBRADA',
  'tokens written back · the dearer half': 'tokens escritos de vuelta · la mitad más cara',
  'read back from a cache, plus what was never sent': 'leído de una caché, más lo que nunca se envió',
  'CAME FROM CACHE': 'LEÍDO DE CACHÉ',
  'of everything read, the share nobody charged twice': 'de todo lo leído, la parte que nadie cobró dos veces',
  'CHARACTERS PER TOKEN': 'CARACTERES POR TOKEN',
  'what MADRE wrote against what the CLIs were charged for reading · not a tokenizer':
    'lo que MADRE escribió contra lo que a los CLIs les cobraron por leer · no es un tokenizador',
  'AGENT': 'AGENTE',
  'INPUT': 'ENTRADA',
  'OUTPUT': 'SALIDA',
  'CACHE': 'CACHÉ',
  'CACHED %': '% CACHEADO',
  'CHARS / TOKEN': 'CARACT. / TOKEN',
  '◉ still open here': '◉ sigue abierto aquí',
  'The room has carried this into {n} turn(s) and still has no answer.':
    'La sala ha arrastrado esto a {n} turno(s) y sigue sin respuesta.',
  'The archivist recorded this as open and nothing has answered it.':
    'El archivista lo registró como abierto y nada lo ha contestado.',
  ' asks for #{n} {label} to go on': ' pide #{n} {label} para seguir',
  'You will type the project designation, as always. Then @{agent} gets your permission and continues.':
    'Vas a escribir la designación del proyecto, como siempre. Después @{agent} recibe tu permiso y sigue.',
  '@{agent} gets your permission for one message and continues.': '@{agent} recibe tu permiso para un mensaje y sigue.',
  'GRANT #{n} AND CONTINUE': 'CONCEDER #{n} Y SEGUIR',
  'WRITE IT MYSELF': 'ESCRIBIRLE YO',
  'Arms #{n} in the box below, so you can add instructions before sending.':
    'Arma #{n} en la caja de abajo, para que agregues instrucciones antes de mandar.',
  '#{n} {label} granted · @{agent} continues': '#{n} {label} concedido · @{agent} sigue',
  '#{n} {label} granted': '#{n} {label} concedido',
  'Permission granted: #{n} {label}. Go ahead with what you proposed.': 'Permiso concedido: #{n} {label}. Sigue con lo que propusiste.',
  'SERVERS': 'SERVIDORES',
  'MADRE version': 'Versión de MADRE',
  'Local servers answering on this computer': 'Servidores locales que contestan en esta computadora',
  'COULD NOT READ THE PORTS': 'NO SE PUDIERON LEER LOS PUERTOS',
  'NOTHING IS ANSWERING ON THIS COMPUTER · START YOUR SERVER AND OPEN THIS AGAIN':
    'NADA CONTESTA EN ESTA COMPUTADORA · LEVANTA TU SERVIDOR Y ABRE ESTO DE NUEVO',
  'ONLY WHAT LISTENS ON THIS COMPUTER AND ANSWERS HTTP · MADRE RUNS NOTHING TO FIND THEM':
    'SOLO LO QUE ESCUCHA EN ESTA COMPUTADORA Y CONTESTA HTTP · MADRE NO EJECUTA NADA PARA ENCONTRARLOS',
  '{what} · refuses to be framed': '{what} · se niega a ser enmarcado',
  'Resize the browser': 'Cambiar el ancho del navegador',
  'Crew': 'Tripulación',
  'Crew · {ready} of {total} ready · {who}': 'Tripulación · {ready} de {total} lista · {who}',
  'The destination is outside this project.': 'El destino está fuera de este proyecto.',
  'There is already something at {path}.': 'Ya hay algo en {path}.',
  'Search files': 'Buscar archivos',
  'Search files…': 'Buscar archivos…',
  'Copy': 'Copiar',
  'Move': 'Mover',
  'Paste here': 'Pegar aquí',
  'Paste beside it': 'Pegar al lado',
  'Paste in the project root': 'Pegar en la raíz del proyecto',
  'REPLACE FOR EVERY ROOM': 'REEMPLAZAR PARA TODAS LAS SALAS',
  'REPLACE FOR THIS PROJECT': 'REEMPLAZAR PARA ESTE PROYECTO',
  '{name} {version} is already installed for {where}; it keeps running until this file replaces it.':
    '{name} {version} ya está instalado para {where}; sigue funcionando hasta que este archivo lo reemplace.',
  'Right-click a folder, or an empty spot for the project root, to paste it there.':
    'Clic derecho en una carpeta para pegarlo ahí, o en un espacio vacío para la raíz del proyecto.',
  'in {path}': 'en {path}',
  'the project root': 'la raíz del proyecto',
  'copy': 'copia',
  'That could not be done: {error}': 'Eso no se pudo hacer: {error}',
  'A name is needed.': 'Hace falta un nombre.',
  'That is not a name.': 'Eso no es un nombre.',
  'Both a source and a destination are needed.': 'Hacen falta un origen y un destino.',
  'The source and the destination are the same path.': 'El origen y el destino son la misma ruta.',
  'A folder cannot be moved inside itself.': 'Una carpeta no se puede mover dentro de sí misma.',
  'Rename': 'Renombrar',
  'HOLD': 'BODEGA',
  'BRIDGE': 'PUENTE',
  'MED BAY': 'ENFERMERÍA',
  'JETTISONED': 'ESCLUSA',
  'ZONE': 'ZONA',
  'OUT OF CIRCULATION': 'FUERA DE CIRCULACIÓN',
  'STOPPING': 'DETENIENDO',
  'No module by that name is loaded.': 'No hay ningún módulo cargado con ese nombre.',
  'Gemini tried to hand this turn to one of its own subagents. MADRE does not allow that: a subagent answers outside the lease, so nothing it wrote would be checked, shown or undoable.':
    'Gemini intentó pasarle este turno a uno de sus propios subagentes. MADRE no lo permite: un subagente contesta fuera del arriendo, así que nada de lo que escribiera quedaría comprobado, mostrado ni reversible.',
  'Ask again saying it should do the work itself, without subagents.':
    'Vuelve a pedirlo diciéndole que haga el trabajo él mismo, sin subagentes.',
  ' · this reply names {n} file(s) that are not on disk: {files}':
    ' · esta respuesta nombra {n} archivo(s) que no están en disco: {files}',
  ' · nothing was written this turn': ' · en este turno no se escribió nada',
  'OPEN MODULES': 'ABRIR MÓDULOS',
  '{command} · listens on the whole network': '{command} · escucha en toda la red',
  'RIPLEY only opens what is bound to 127.0.0.1. Start it with --host 127.0.0.1 (or listen(port, "127.0.0.1")) and it will show up above.':
    'RIPLEY solo abre lo atado a 127.0.0.1. Arráncalo con --host 127.0.0.1 (o listen(puerto, "127.0.0.1")) y aparecerá arriba.',
  '@{who} puts {agents} to work': '@{who} pone a trabajar a {agents}',
  '@{who} puts {agents} to work, then closes': '@{who} pone a trabajar a {agents} y luego cierra',
  '{n} step': '{n} paso',
  '{n} steps': '{n} pasos',
  '@{who} finished · {steps}': '@{who} terminó · {steps}',
  '@{who} stopped after {steps} · {why}': '@{who} se detuvo tras {steps} · {why}',
  'SUPPORT': 'APOYAR',
  'MADRE is free and stays free · this only opens GitHub Sponsors in a tab':
    'MADRE es gratis y seguirá siéndolo · esto solo abre GitHub Sponsors en una pestaña',
  'Enter sends · ⌥ Enter (Alt on Linux) breaks the line':
    'Enter manda · ⌥ Enter (Alt en Linux) salta de línea',
  'Stop this answer · the room and the other agents keep going':
    'Detener esta respuesta · la sala y los demás agentes siguen',
  'That turn is not running any more.': 'Ese turno ya no está corriendo.',
  'stopped by the human': 'detenido por el humano',
  'This is how I want it done · the room keeps it as a preference':
    'Así lo quiero · la sala lo conserva como preferencia',
  'Never do this again · what the room remembers from it is put out':
    'Nunca más · lo que la sala recuerde de esto queda fuera de circulación',
  'A faded star is in MED BAY or JETTISONED: the archive keeps it and never hands it to a turn.':
    'Una estrella apagada está en ENFERMERÍA o en ESCLUSA: el archivo la conserva y nunca la entrega a un turno.',
  'Distilled and nobody has judged it. It travels into turns.':
    'Destilada y nadie la ha juzgado. Viaja a los turnos.',
  'You marked the reply it came from as good. It travels, confirmed.':
    'Marcaste como buena la respuesta de la que salió. Viaja, confirmada.',
  'Quarantined: it is false, or it came from a reply you marked bad. It never travels.':
    'En cuarentena: es falsa, o salió de una respuesta que marcaste mal. No viaja nunca.',
  'Put out of circulation and kept so it is not learned again. It never travels.':
    'Fuera de circulación, conservada para no volver a aprenderla. No viaja nunca.',
  'New file': 'Archivo nuevo',
  'New folder': 'Carpeta nueva',
  'NEW NAME': 'NOMBRE NUEVO',
  'NEW FILE': 'ARCHIVO NUEVO',
  'NEW FOLDER': 'CARPETA NUEVA',
  'PROJECT DESIGNATION': 'DESIGNACIÓN DEL PROYECTO',
  'OK': 'LISTO',
  'MOVE': 'MOVER',
  'That could not be done.': 'Eso no se pudo hacer.',
  'NOTHING MATCHES {q}': 'NADA COINCIDE CON {q}',
  'MADRE GUARDS THIS PATH · IT WILL ASK FOR THE DESIGNATION': 'MADRE PROTEGE ESTA RUTA · VA A PEDIR LA DESIGNACIÓN',
  '{path} is a place MADRE guards.': '{path} es un lugar que MADRE protege.',
  '{host} will not be framed': '{host} no se deja enmarcar',
  'The site answers with a rule that forbids any page from putting it inside a frame. It is the standard defence against clickjacking, and RIPLEY neither can nor should override it.':
    'El sitio responde con una regla que prohíbe a cualquier página meterlo dentro de un marco. Es la defensa estándar contra el clickjacking, y RIPLEY ni puede ni debe saltársela.',
  'This server answers with a rule that forbids any page from putting it inside a frame — your own dev server may be setting it without you noticing. RIPLEY neither can nor should override it.':
    'Este servidor responde con una regla que prohíbe a cualquier página meterlo dentro de un marco — tu propio servidor de desarrollo puede estar poniéndola sin que lo notes. RIPLEY ni puede ni debe saltársela.',
  'OPEN IN A TAB': 'ABRIR EN UNA PESTAÑA',
  'COPY THE ADDRESS': 'COPIAR LA DIRECCIÓN',
  'Address copied.': 'Dirección copiada.',
  'Browser · local servers and the web': 'Navegador · servidores locales y la web',
  'Browser': 'Navegador',
  'RIPLEY browser': 'Navegador de RIPLEY',
  'new tab': 'pestaña nueva',
  'New tab': 'Pestaña nueva',
  'Address': 'Dirección',
  'Only http and https.': 'Solo http y https.',
  'That is not an address.': 'Eso no es una dirección.',
  'RIPLEY reaches this computer only · turn the web on in MODULES to open an address outside it':
    'RIPLEY solo alcanza esta computadora · enciende la web en MÓDULOS para abrir una dirección fuera de ella',
  'SEE THE ECONOMY': 'VER LA ECONOMÍA',
  'ECONOMY': 'ECONOMÍA',
  'MADRE · WHAT THIS ROOM SPENT AND WHAT IT NEVER SPENT': 'MADRE · LO QUE ESTA SALA GASTÓ Y LO QUE NUNCA GASTÓ',
  'MEASURED FROM WHAT THE CLIs CHARGED · A SAVING NOBODY MEASURED IS NEVER SHOWN':
    'MEDIDO SOBRE LO QUE COBRARON LOS CLIs · UN AHORRO QUE NADIE MIDIÓ NO SE MUESTRA NUNCA',
  'Token economy': 'Economía de tokens',
  'NEVER CHARGED FOR': 'NUNCA COBRADO',
  'FROM THE CACHE': 'DE LA CACHÉ',
  'the CLI said it read these back instead of charging them again · measured':
    'el CLI dijo que los leyó de vuelta en vez de volver a cobrarlos · medido',
  'briefing a turn had no use for · estimated from characters, not measured':
    'briefing que el turno no iba a usar · estimado a partir de caracteres, no medido',
  'OF THE INPUT': 'DE LA ENTRADA',
  'the share of everything read that came back from a cache':
    'la parte de todo lo leído que volvió de una caché',
  'One half is measured and the other is estimated, and they are never added without saying so. Neither of them is Ash: Ash shortens the answer, which is the next reading.':
    'Una mitad es medida y la otra estimada, y nunca se suman sin decirlo. Ninguna de las dos es Ash: Ash acorta la respuesta, que es la lectura siguiente.',
  'ASH ADDS': 'ASH AÑADE',
  'to every prompt it is on · measured, not estimated': 'a cada prompt donde está encendido · medido, no estimado',
  'IN TOKENS': 'EN TOKENS',
  'at {rate} characters per token · an estimate': 'a {rate} caracteres por token · una estimación',
  'TURNS CARRYING IT': 'TURNOS QUE LO LLEVAN',
  'of the {n} weighed in this room': 'de los {n} pesados en esta sala',
  'What Ash costs is certain and measured here. What it saves is not: the shorter answer below is observed, never promised. Output is the dearer half of every bill, so the trade is usually favourable — MADRE does not turn it into money because it does not know your prices.':
    'Lo que Ash cuesta es seguro y está medido aquí. Lo que ahorra no lo es: la respuesta más corta de abajo se observa, nunca se promete. La salida es la mitad más cara de cualquier factura, así que el cambio suele convenir — MADRE no lo convierte en dinero porque no conoce tus precios.',
  'WHAT ASH DOES TO AN ANSWER': 'QUÉ LE HACE ASH A UNA RESPUESTA',
  'No turns with the switch recorded yet. Leave Ash on for a few turns and off for a few more, and this fills.':
    'Aún no hay turnos con el interruptor registrado. Deja Ash encendido unos turnos y apagado otros tantos, y esto se llena.',
  'WHERE EACH PROMPT GOES': 'A DÓNDE VA CADA PROMPT',
  '{pct} of each prompt is the unchanging head a cache can match. MADRE wrote {chars} characters of the {input} input tokens you were charged for; the rest is what the CLIs read on their own.':
    '{pct} de cada prompt es la cabecera que no cambia y que una caché puede reconocer. MADRE escribió {chars} caracteres de los {input} tokens de entrada que te cobraron; el resto es lo que los CLIs leyeron por su cuenta.',
  'BY AGENT': 'POR AGENTE',
  'with ASH': 'con ASH',
  'without ASH': 'sin ASH',
  '{n}↑ · {turns} turns': '{n}↑ · {turns} turnos',
  '{n} turns with ASH, {m} without · {min} of each before this can be read':
    '{n} turnos con ASH, {m} sin ASH · hacen falta {min} de cada lado para poder leerlo',
  'The middle turn of each side, not an average. You choose when to ask for compact prose, so the two sides are different tasks, not the same task twice — MADRE does not claim a percentage saved.':
    'El turno de en medio de cada lado, no un promedio. Tú decides cuándo pedir prosa compacta, así que los dos lados son tareas distintas y no la misma tarea dos veces: MADRE no afirma un porcentaje ahorrado.',
  'NEVER CHARGED': 'NUNCA COBRADO',
  'REVIEW · the local check found: {details}':
    'REVISAR · la comprobación local encontró: {details}',
  'empty response': 'respuesta vacía',
  'unclosed code fence': 'bloque de código sin cerrar',
  'text after ```pulse block': 'hay texto después del bloque ```pulse',
  'missing negation': 'falta una negación',
  '{count} {unit}, maximum {maximum}': '{count} {unit}, máximo {maximum}',
  'lines': 'líneas',
  'missing {value}': 'falta {value}',
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
  'ROUTE BLOCKED': 'RUTA BLOQUEADA',
  'route: {destination}': 'ruta: {destination}',
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
  'Consultation mode · Agents write only with CREATE or a standing lease, only inside .pulse/out/ · What an agent reads may reach its configured model provider.':
    'Modo consulta · Los agentes escriben solo con CREATE o con un permiso permanente, y solo dentro de .pulse/out/ · Lo que un agente lee puede llegar al proveedor de modelo que tenga configurado.',

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
  // Bajo NECESITA es un requisito, no una acción: «necesita: se engancha» no concuerda.
  'attached only inside a creation lease with the image scope on':
    'un permiso de creación con el alcance de imagen encendido; solo ahí se engancha',
  'a Gemini API key with credits (the one the Gemini CLI stores, or GEMINI_API_KEY)':
    'una API key de Gemini con créditos (la que guarda el CLI de Gemini, o GEMINI_API_KEY)',

  'Brings the repository into the room: /git posts the branch, the uncommitted changes, the recent commits or the diff stats as a shared fact card, without spending an agent turn.':
    'Trae el repositorio a la sala: /git publica la rama, los cambios sin commitear, los commits recientes o las estadísticas del diff como una ficha compartida, sin gastar un turno de agente.',
  'nothing by itself · the read commands only read': 'nada por sí solo · los comandos de lectura solo leen',
  'a local commit only when you type /git commit': 'un commit local solo cuando escribes /git commit',
  'a push only when you type /git push confirm, after it shows what would leave':
    'un push solo cuando escribes /git push confirm, después de enseñarte qué saldría',

  'Asks every agent for compact prose without altering what you write. MADRE shows each turn\'s input, output and cache use; savings depend on the agent, task and cache, so no fixed percentage is promised.':
    'Pide a cada agente prosa compacta sin alterar lo que escribes. MADRE muestra la entrada, la salida y el uso de caché de cada turno; el ahorro depende del agente, la tarea y el caché, así que no promete un porcentaje fijo.',
  'nothing in the project': 'nada en el proyecto',
  'a switch in ~/.pulse/config.json': 'un interruptor en ~/.pulse/config.json',

  'Renders HTML, SVG and Markdown from the project in the file viewer, inside a sealed frame, and opens a browser on the servers answering on this computer.':
    'Renderiza HTML, SVG y Markdown del proyecto en el visor de archivos, dentro de un marco sellado, y abre un navegador sobre los servidores que contestan en esta computadora.',
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
  'NOTHING TO READ YET: THE ROOM HAS NO ARCHIVE.': 'TODAVÍA NO HAY NADA QUE LEER: LA SALA NO TIENE ARCHIVO.',
  'NEXT': 'SIGUE',
  'WHAT THE ARCHIVE IS MADE OF': 'DE QUÉ ESTÁ HECHO EL ARCHIVO',
  'THE THREE TESTS': 'LAS TRES PRUEBAS',
  // El tablero de MEMORIA: lo que el archivo hizo día por día y de qué está hecho.
  'MEMORY · THE ARCHIVE AT A GLANCE': 'MEMORIA · EL ARCHIVO DE UN VISTAZO',
  'READ {time}': 'LEÍDO {time}',
  'REFRESH': 'ACTUALIZAR',
  'EXCHANGES': 'INTERCAMBIOS',
  'MEMORIES': 'MEMORIAS',
  'TURNS THAT RECALLED': 'TURNOS QUE RECORDARON',
  'WAITING': 'EN ESPERA',
  'MATURITY': 'MADUREZ',
  '{n} THIS WEEK': '{n} ESTA SEMANA',
  '{last} in the last 7 days, {before} in the 7 before': '{last} en los últimos 7 días, {before} en los 7 anteriores',
  'EXCHANGES NOBODY HAS DISTILLED YET': 'INTERCAMBIOS QUE NADIE HA DESTILADO TODAVÍA',
  'THE ARCHIVIST IS UP TO DATE': 'EL ARCHIVISTA VA AL DÍA',
  'ACTIVITY · LAST {n} DAYS': 'ACTIVIDAD · ÚLTIMOS {n} DÍAS',
  'NEW MEMORIES': 'MEMORIAS NUEVAS',
  'PEAK {n}': 'MÁXIMO {n}',
  'TODAY': 'HOY',
  '{entries} exchanges, {memories} new memories and {recalls} turns that recalled in the last {n} days':
    '{entries} intercambios, {memories} memorias nuevas y {recalls} turnos que recordaron en los últimos {n} días',
  'BY DAY · TABLE': 'POR DÍA · TABLA',
  'NOTHING HAPPENED IN THESE DAYS.': 'NO PASÓ NADA EN ESTOS DÍAS.',
  'DAY': 'DÍA',
  'THE DASHBOARD IS UNAVAILABLE': 'EL TABLERO NO ESTÁ DISPONIBLE',
  'BY KIND': 'POR CLASE',
  'BY ARCHIVIST': 'POR ARCHIVISTA',
  'BY ZONE': 'POR ZONA',
  'RECALL AND EMBEDDINGS': 'RECALL Y EMBEDDINGS',
  'How recalled memories arrived: found by the search, or carried along by the company they keep.':
    'Cómo llegaron las memorias que se recordaron: las encontró la búsqueda, o las trajo la compañía que tienen.',
  'SEARCH': 'BÚSQUEDA',
  'CASCADE': 'CASCADA',
  'MEMORIES WITH A VECTOR': 'MEMORIAS CON VECTOR',
  'EXCHANGES WITH A VECTOR': 'INTERCAMBIOS CON VECTOR',
  'EMBEDDINGS OFF · RECALL MATCHES WORDS ONLY': 'EMBEDDINGS APAGADOS · EL RECALL SOLO EMPAREJA PALABRAS',
  'PASSES AT {n}': 'PASA CON {n}',
  'ARCHIVIST AND RECALL': 'ARCHIVISTA Y RECALL',
  'DATASET AND TRAINING': 'DATASET Y ENTRENAMIENTO',
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
  'The room rejected the message.': 'La sala rechazó el mensaje.',
  'ECONOMY · THIS ROOM': 'ECONOMÍA · ESTA SALA',
  'NO TURNS WEIGHED YET · SEND A MESSAGE AND THIS FILLS': 'TODAVÍA NO HAY NINGÚN TURNO CON FACTURA · MANDA UN MENSAJE Y ESTO SE LLENA',
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
  ' every project · ': ' todos los proyectos · ',
  ' this project': ' este proyecto',
  'READ THE SDK ↗': 'LEER EL SDK ↗',
  'RELOAD MODULES': 'RECARGAR MÓDULOS',
  'Load your module files again without restarting the room': 'Vuelve a cargar tus archivos de módulo sin reiniciar la sala',
  'YOURS · ': 'TUYOS · ',
  'REMOVE': 'QUITAR',
  'UNINSTALL': 'DESINSTALAR',
  'Delete module file {file}': 'Borrar el archivo del módulo {file}',
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
  // Neutro a propósito: casi todas las clases son femeninas (decisión, pregunta, aberración).
  'memory · the human forgot a ': 'memoria · olvidada por la humana · ',
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
  'CONTROL': 'CONTROL',
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
  'memory · never writes': 'memoria · nunca escribe',
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

  // ── EL MARCADO: diálogos, paneles y modales de index.html ─────────────────
  'STOP ALL': 'PARAR TODO',
  'MU/TH/UR 6000 · WHAT THIS ROOM SAYS IN YOUR NAME': 'MU/TH/UR 6000 · LO QUE ESTA SALA DICE EN TU NOMBRE',
  '⧉ COPY ALL': '⧉ COPIAR TODO',
  'CLOSE ×': 'CERRAR ×',
  'BUILT NOW · STORED NOWHERE · SENT NOWHERE · READ, NEVER WRITTEN':
    'ARMADO AHORA · GUARDADO EN NINGÚN LADO · MANDADO A NINGÚN LADO · SE LEE, NUNCA SE ESCRIBE',
  'MADRE · OPTIONAL INTEGRATIONS · INSTALLED BY THEIR OWN TOOLS':
    'MADRE · INTEGRACIONES OPCIONALES · INSTALADAS CON SUS PROPIAS HERRAMIENTAS',
  '+ ADD A MODULE': '+ AGREGAR UN MÓDULO',
  'BUILT-IN MODULES CHANGE ONLY MADRE SETTINGS. EXTERNAL MODULES WRITE INTO THE PROJECT ONLY AFTER YOU CONFIRM.':
    'LOS MÓDULOS DE CASA SOLO CAMBIAN AJUSTES DE MADRE. LOS EXTERNOS ESCRIBEN EN EL PROYECTO SOLO DESPUÉS DE QUE CONFIRMES.',
  'BUILT-INS STAY IN MADRE · PROJECT INSTALLS SHOW THE COMMAND FIRST · YOUR MODULES LOAD FROM ~/.pulse/modules':
    'LOS DE CASA SE QUEDAN EN MADRE · LAS INSTALACIONES EN EL PROYECTO ENSEÑAN EL COMANDO PRIMERO · TUS MÓDULOS CARGAN DESDE ~/.pulse/modules',
  'MADRE · INTERFACE 2037 · TROUBLESHOOTING': 'MADRE · INTERFAZ 2037 · DIAGNÓSTICO',
  '⚙ CONNECTIONS': '⚙ CONEXIONES',
  '✎ FEEDBACK': '✎ COMENTARIOS',
  'EXPAND ALL': 'ABRIR TODO',
  // MEMORIA, emancipada de CONEXIONES: su propio botón en la barra de MU/TH/UR.
  '\u25a4 MEMORY': '\u25a4 MEMORIA',
  'What the archive holds, who distils it, and how well it is answering': 'Qué guarda el archivo, quién lo destila y qué tan bien está contestando',
  'THIS ROOM HAS NO MEMORY INDEX.': 'ESTA SALA NO TIENE ÍNDICE DE MEMORIA.',
  'READING THE ARCHIVE…': 'LEYENDO EL ARCHIVO…',
  'COLLAPSE ALL': 'CERRAR TODO',
  'END SESSION ×': 'TERMINAR SESIÓN ×',
  'NO SPECIAL ORDERS ON THIS SHIP · THE CREW IS NOT EXPENDABLE · ESC TO END SESSION':
    'EN ESTA NAVE NO HAY ÓRDENES ESPECIALES · LA TRIPULACIÓN NO ES PRESCINDIBLE · ESC PARA TERMINAR LA SESIÓN',
  'One conversation. Every agent.': 'Una conversación. Todos los agentes.',
  'Pick an agent and ask, or start with a mention such as': 'Elige un agente y pregunta, o empieza con una mención como',
  'EMERGENCY COMMAND OVERRIDE 100375': 'ANULACIÓN DE MANDO DE EMERGENCIA 100375',
  'CANCEL ×': 'CANCELAR ×',
  'PRIORITY ONE. CONTROL MODE GIVES ONE AGENT THE PROJECT ITSELF: READ, CREATE, MODIFY, NO APPROVAL PER ACTION.':
    'PRIORIDAD UNO. EL MODO CONTROL LE DA A UN AGENTE EL PROYECTO ENTERO: LEER, CREAR, MODIFICAR, SIN APROBAR ACCIÓN POR ACCIÓN.',
  'ARM': 'ARMAR',
  'ONE HOLDER AT A TIME · EVERY TURN IS CHECKPOINTED · WHAT LEAVES THE SHIP DOES NOT COME BACK · STOPALL REVOKES IT':
    'UN SOLO PORTADOR A LA VEZ · CADA TURNO LLEVA CHECKPOINT · LO QUE SALE DE LA NAVE NO REGRESA · STOPALL LO REVOCA',
  'BACK': 'ATRÁS',
  'MEMORY RESEARCH · ACCESS CONTROL': 'INVESTIGACIÓN DE MEMORIA · CONTROL DE ACCESO',
  'THE ARCHIVE OF THIS ROOM: EVERY MEMORY THE CREW DISTILLED, LINKED BY WHAT THEY SHARE. READING IS FREE; FORGETTING IS FOREVER. TYPE THE PROJECT DESIGNATION TO BOARD.':
    'EL ARCHIVO DE ESTA SALA: CADA MEMORIA QUE DESTILÓ LA TRIPULACIÓN, ENLAZADA POR LO QUE COMPARTEN. LEER ES GRATIS; OLVIDAR ES PARA SIEMPRE. ESCRIBE LA DESIGNACIÓN DEL PROYECTO PARA ABORDAR.',
  'BOARD': 'ABORDAR',
  'ACCESS STAYS OPEN UNTIL THIS PAGE RELOADS · GHOST NEVER REACHES THE ARCHIVE':
    'EL ACCESO SIGUE ABIERTO HASTA QUE SE RECARGUE LA PÁGINA · GHOST NUNCA LLEGA AL ARCHIVO',
  'DECISION': 'DECISIÓN',
  'FACT': 'HECHO',
  'PREFERENCE': 'PREFERENCIA',
  'QUESTION': 'PREGUNTA',
  'ABERRATION': 'ABERRACIÓN',
  'COLD · 0': 'FRÍAS · 0',
  'ASK · 0': 'PREGUNTAR · 0',
  'RECENTER': 'RECENTRAR',
  'LEAVE ×': 'SALIR ×',
  // /module: las ideas, dos de cada forma de módulo.
  'command': 'comando',
  'connector': 'conector',
  'sends · #4 only': 'manda · solo en #4',
  'card of its own': 'ficha propia',
  'a command that lists the TODOs still left in the code': 'un comando que liste los TODO que quedan en el código',
  'connect me to my database so the agents can read it, never write': 'conéctame a mi base de datos para que los agentes la lean, sin escribir nunca',
  'post a summary to Slack when a long plan finishes': 'publica un resumen en Slack cuando termine un plan largo',
  'a card with what my store sold today': 'una ficha con lo que vendió mi tienda hoy',
  // Primer uso: la tarjeta junto a un botón que nunca se había presionado.
  'The browser': 'El navegador',
  'See what you are building without leaving the room: the servers answering on this computer, in tabs, at phone, tablet or desktop width. To open the web, switch RIPLEY on in MODULES.':
    'Mira lo que estás construyendo sin salir de la sala: los servidores que contestan en esta computadora, en pestañas, a ancho de teléfono, tableta o escritorio. Para abrir la web, activa RIPLEY en MÓDULOS.',
  'The project files': 'Los archivos del proyecto',
  'Your project as a tree. Click a file to read it, search by name, and right-click to copy, move, rename or create files and folders.':
    'Tu proyecto como árbol. Haz clic en un archivo para leerlo, búscalo por nombre, y con clic derecho copia, mueve, renombra o crea archivos y carpetas.',
  'Conversations, one memory': 'Conversaciones, una sola memoria',
  'A project can hold many conversations and a single memory. Start a new one for a new subject: they all feed the same archive, and every agent recalls what was said in the others.':
    'Un proyecto puede tener muchas conversaciones y una sola memoria. Empieza otra para un tema nuevo: todas alimentan el mismo archivo y cualquier agente recuerda lo que se dijo en las demás.',
  'Got it': 'Entendido',
  // Primer contacto: el recorrido sobre la sala.
  'Your crew, one box': 'Tu tripulación, una sola caja',
  'The AI agents already on this computer work here together. Pick one in the row above the box, or write @claude, and ask. Every reply says who answered, in which mode and how many tokens it cost. Nothing leaves this computer on its own.':
    'Los agentes de IA que ya tienes en esta computadora trabajan aquí juntos. Elige uno en la fila sobre la caja, o escribe @claude, y pregunta. Cada respuesta dice quién contestó, en qué modo y cuántos tokens costó. Nada sale de esta computadora por su cuenta.',
  'Modes: how far a message may go': 'Los modos: hasta dónde llega un mensaje',
  'Every message carries a mode. It starts at #1, and the higher the number, the more it may touch.':
    'Cada mensaje lleva un modo. Empieza en #1, y entre más alto el número, más puede tocar.',
  'MU/TH/UR, the console': 'MU/TH/UR, la consola',
  'Sign agents in and set how far each one may go in CONNECTIONS. See what the room remembers in MEMORY, and travel through it as a map in NOSTROMO. When something fails, the diagnosis is here.':
    'En CONEXIONES inicias sesión con tus agentes y decides hasta dónde puede llegar cada uno. En MEMORIA ves lo que la sala recuerda, y en NOSTROMO lo recorres como un mapa. Cuando algo falla, el diagnóstico está aquí.',
  'MODULES, optional powers': 'MÓDULOS, poderes opcionales',
  'Add what this project needs: Git, images, previews of what you build, a local model, a browser, or a module of your own in a single file. Nothing is installed until you press it.':
    'Agrega lo que este proyecto necesite: Git, imágenes, vistas previas de lo que construyes, un modelo local, un navegador, o un módulo tuyo en un solo archivo. Nada se instala hasta que tú lo pidas.',
  'You can take this tour again from ? in MU/TH/UR. Type STOPALL at any time to halt every agent.':
    'Puedes volver a ver este recorrido desde ? en MU/TH/UR. Escribe STOPALL en cualquier momento para frenar a todos los agentes.',
  '{n} of {total}': '{n} de {total}',
  'Skip': 'Saltar',
  'Next': 'Siguiente',
  'Start': 'Empezar',
  // Novedades: la hoja que se abre una vez después de actualizar.
  'ABOUT THIS VERSION': 'ACERCA DE ESTA VERSIÓN',
  "What's new in MADRE {version}": 'Novedades en MADRE {version}',
  "What's new": 'Novedades',
  'Where': 'Dónde',
  'Continue': 'Continuar',
  'Read every change on madre.run ↗': 'Lee todos los cambios en madre.run ↗',
  // NOSTROMO: la mira sobre la enana elegida.
  'TARGET LOCKED': 'BLANCO FIJADO',
  'DRAG TO TURN · SHIFT+DRAG TO MOVE · WHEEL TO ZOOM · CLICK A MEMORY · DO NOT TOUCH MOTHER':
    'ARRASTRA PARA GIRAR · SHIFT+ARRASTRA PARA MOVER · RUEDA PARA ACERCAR · CLIC EN UNA MEMORIA · NO TOQUES A MOTHER',
  '⚠ WARNING ⚠': '⚠ ADVERTENCIA ⚠',
  'MU/TH/UR 6000 · SPECIAL ORDER 937 · PRIORITY ONE': 'MU/TH/UR 6000 · ORDEN ESPECIAL 937 · PRIORIDAD UNO',
  'WHAT TO ASK NEXT': 'QUÉ PREGUNTAR AHORA',
  'WRITTEN FROM WHAT THE ARCHIVE ALREADY HOLDS. NOTHING IS SENT: A QUESTION GOES TO THE COMPOSER AND YOU DECIDE WHO ANSWERS IT.':
    'ESCRITAS CON LO QUE EL ARCHIVO YA TIENE. NO SE MANDA NADA: LA PREGUNTA VA AL COMPOSITOR Y TÚ DECIDES QUIÉN LA CONTESTA.',
  'MEMORY': 'MEMORIA',
  'SOURCE': 'ORIGEN',
  'DISTILLED': 'DESTILADA',
  'LINKS': 'ENLACES',
  'EXCHANGE WITH MADRE': 'INTERCAMBIO CON MADRE',
  'FORGETTING REMOVES THE NOTE FROM EVERY FUTURE TURN. THE LEDGER IT CAME FROM STAYS.':
    'OLVIDAR QUITA LA NOTA DE TODOS LOS TURNOS QUE VIENEN. EL LEDGER DEL QUE SALIÓ SE QUEDA.',
  'NO MEMORIES YET. THE ARCHIVIST WRITES THE FIRST ONES AFTER A FEW EXCHANGES.':
    'TODAVÍA NO HAY MEMORIAS. EL ARCHIVISTA ESCRIBE LAS PRIMERAS DESPUÉS DE UNOS INTERCAMBIOS.',
  'REVIEW WITH ▾': 'REVISAR CON ▾',
  'OPEN RAW ↗': 'ABRIR EN CRUDO ↗',

  // Títulos y etiquetas del marcado.
  'Agents': 'Agentes',
  'Language': 'Idioma',
  'Theme': 'Tema',
  'Conversations': 'Conversaciones',
  'Close conversations': 'Cerrar las conversaciones',
  'Project files': 'Archivos del proyecto',
  'Close files': 'Cerrar los archivos',
  'The core': 'El núcleo',
  'Copy the whole briefing as the agent receives it': 'Copia el briefing completo, tal como lo recibe el agente',
  'Modules': 'Módulos',
  'Install a module somebody wrote. MADRE checks it before it runs.':
    'Instala un módulo que escribió alguien más. MADRE lo revisa antes de que corra.',
  'MU/TH/UR troubleshooting': 'Diagnóstico de MU/TH/UR',
  "The crew and this room's settings: install an agent, sign it in, set what each one may do":
    'La tripulación y los ajustes de esta sala: instala un agente, inicia su sesión, define qué puede hacer cada uno',
  'NOSTROMO · memory research · needs the project designation':
    'NOSTROMO · investigación de memoria · necesita la designación del proyecto',
  "Tell MADRE's author what happened or what you wish for · opens a prefilled issue":
    'Dile al autor de MADRE qué pasó o qué te gustaría · abre un issue prellenado',
  'Open or close every section of this panel': 'Abre o cierra todas las secciones de este panel',
  'The four-step tour of MADRE': 'El recorrido de MADRE en cuatro pasos',
  'Tour': 'Recorrido',
  'INQUIRY (type a symptom, an agent, or a keyword)': 'CONSULTA (escribe un síntoma, un agente o una palabra)',
  'Operating system': 'Sistema operativo',
  'Attach': 'Adjuntar',
  'Agent usage': 'Uso del agente',
  'Emergency command override': 'Anulación de mando de emergencia',
  "type the current project's folder name to arm": 'escribe el nombre de la carpeta del proyecto para armar',
  'MADRE tour': 'Recorrido por MADRE',
  'NOSTROMO access': 'Acceso a NOSTROMO',
  "type the current project's folder name to board": 'escribe el nombre de la carpeta del proyecto para abordar',
  'NOSTROMO memory research': 'NOSTROMO · investigación de memoria',
  'Memory kinds': 'Clases de memoria',
  'YELLOW DWARF · DECISION': 'ENANA AMARILLA · DECISIÓN',
  'WHITE DWARF · FACT': 'ENANA BLANCA · HECHO',
  'GREEN DWARF · PREFERENCE': 'ENANA VERDE · PREFERENCIA',
  'BLUE DWARF · QUESTION': 'ENANA AZUL · PREGUNTA',
  'The memories nothing has ever reached for, that share a subject with nothing, and that have had their chances':
    'Las memorias que nadie ha buscado nunca, que no comparten tema con ninguna otra y que ya tuvieron sus oportunidades',
  'The questions this archive cannot answer yet, written from what it already holds':
    'Las preguntas que este archivo todavía no puede contestar, escritas con lo que ya tiene',
  "Memories orbiting MOTHER's core": 'Memorias orbitando el núcleo de MOTHER',
  'This reading follows the room while the card is open': 'Esta lectura sigue a la sala mientras la ficha está abierta',
  'File viewer': 'Visor de archivos',
  'Back to the previous page': 'Volver a la página anterior',
  'Back': 'Atrás',
  'Reload the page': 'Recargar la página',
  'Reload': 'Recargar',

  // ── LOS ERRORES QUE LA SALA CONTESTA ──────────────────────────────────────
  'A turn is running in this conversation. Let it finish, or STOP ALL, and try again.':
    'Hay un turno corriendo en esta conversación. Deja que termine, o dale PARAR TODO, y vuelve a intentar.',
  'A turn is running in this conversation.': 'Hay un turno corriendo en esta conversación.',
  'Ollama is not on this computer yet.': 'Ollama todavía no está en esta computadora.',
  'Ollama did not answer. Open the Ollama app, then press RECHECK.':
    'Ollama no contestó. Abre la app de Ollama y dale REVISAR OTRA VEZ.',
  'Ollama {client} is installed, but {running} is still the one answering. Quit Ollama (or restart its service) and open it again, then RECHECK.':
    'Ollama {client} está instalado, pero el que sigue contestando es {running}. Cierra Ollama (o reinicia su servicio), ábrelo otra vez y dale REVISAR OTRA VEZ.',
  'The old Ollama ({running}) did not stop. Quit it by hand, then press START OLLAMA.':
    'El Ollama viejo ({running}) no se detuvo. Ciérralo a mano y dale ARRANCAR OLLAMA.',
  'Installing a module writes into the project; send { "confirm": true } to proceed.':
    'Instalar un módulo escribe en el proyecto; manda { "confirm": true } para seguir.',
  'RIPLEY is off. Enable it in MODULES to render files.': 'RIPLEY está apagado. Enciéndelo en MÓDULOS para dibujar archivos.',
  'No such report, or no repository to file it in.': 'No existe ese reporte, o no hay repositorio donde levantarlo.',
  'The room has no memory.': 'La sala no tiene memoria.',
  'EYECAT is not holding that one.': 'EYECAT no está sosteniendo esa.',
  'No private terms are set. Write them first.': 'No hay términos privados puestos. Escríbelos primero.',
  'This copy runs from source: pull the repository and start it again.':
    'Esta copia corre desde el código fuente: haz pull del repositorio y arráncala otra vez.',
  'Agents are still working. STOPALL or wait, then update.':
    'Los agentes siguen trabajando. Dale STOPALL o espera, y luego actualiza.',
  'MOTHER is silent.': 'MOTHER está callada.',
  'No such conversation.': 'No existe esa conversación.',
  'That file is empty.': 'Ese archivo está vacío.',
  'A module file that big is not a module. Keep it under 400 KB.':
    'Un archivo de módulo tan grande no es un módulo. Que no pase de 400 KB.',
  'A module is a .mjs file.': 'Un módulo es un archivo .mjs.',
  'Only a module you installed yourself can be refreshed.': 'Solo se puede refrescar un módulo que tú mismo instalaste.',
  'CODE000. THE ARCHIVE IS SEALED.': 'CODE000. EL ARCHIVO ESTÁ SELLADO.',
  'No such memory.': 'No existe esa memoria.',
  'A key is only accepted from this computer, never over the network.':
    'Una llave solo se acepta desde esta computadora, nunca por la red.',
  'OpenCode is not installed.': 'OpenCode no está instalado.',
  'No running plan with that id.': 'No hay ningún plan corriendo con ese id.',
  'Not a command. Commands start with "/" followed by a name.':
    'Eso no es un comando. Los comandos empiezan con «/» seguido de un nombre.',
  'Give the project-relative path of a <id>.module.mjs file.':
    'Da la ruta, relativa al proyecto, de un archivo <id>.module.mjs.',
  'Not found.': 'No se encontró.',

  // ── EL CATÁLOGO DE MU/TH/UR · 51 CONDICIONES ──────────────────────────────
  // Lo que se lee va en español; lo que RECONOCE una falla no: los patrones se prueban contra lo
  // que imprimió un CLI, y un CLI imprime en inglés hable la sala lo que hable.
  'Gemini refuses the personal Google login': 'Gemini rechaza el inicio de sesión personal de Google',
  'Google closed Gemini Code Assist for individuals to this client. The OAuth login still exists but every request is rejected before it reaches a model.':
    'Google le cerró Gemini Code Assist a las cuentas personales desde este cliente. El inicio de sesión OAuth sigue existiendo, pero cada petición se rechaza antes de llegar a un modelo.',
  'Switch Gemini to an API key from Google AI Studio. MADRE copies only the auth selection into its isolated home, so the key can stay in the keychain or in ~/.gemini/.env.':
    'Cambia Gemini a una API key de Google AI Studio. MADRE solo copia la elección de autenticación a su hogar aislado, así que la llave puede quedarse en el llavero o en ~/.gemini/.env.',

  'Gemini key out of prepaid credits': 'La llave de Gemini se quedó sin créditos prepagados',
  'The AI Studio project behind the Gemini API key has spent its prepaid balance. Google answers every call, including Image Studio generations, with HTTP 429 until the balance is topped up. Gemini CLI hides this behind silent retries.':
    'El proyecto de AI Studio detrás de la API key de Gemini gastó su saldo prepagado. Google contesta cada llamada —incluidas las imágenes de Image Studio— con HTTP 429 hasta que se recargue. El CLI de Gemini lo esconde detrás de reintentos silenciosos.',
  'Top up the project in AI Studio, or point the Gemini CLI at a key from another project. Nothing in MADRE changes; retry once billing is fixed.':
    'Recarga el proyecto en AI Studio, o apunta el CLI de Gemini a una llave de otro proyecto. En MADRE no hay que cambiar nada; vuelve a intentar cuando el cobro esté resuelto.',

  'Gemini key rate-limited by Google (HTTP 429)': 'Google le puso límite de tasa a la llave de Gemini (HTTP 429)',
  'The Gemini API key hit its per-minute or daily quota. Gemini CLI retries with exponential backoff and prints only stack traces while it waits, which looked like a hang. With the "auto" model, the first request is a small router call, so even that can be throttled.':
    'La API key de Gemini llegó a su cuota por minuto o por día. El CLI de Gemini reintenta con espera creciente e imprime solo trazas mientras espera, lo que parecía un cuelgue. Con el modelo «auto», la primera petición es una llamada chica al enrutador, así que hasta eso puede toparse.',
  "Wait a minute and retry, pick an explicit model in the composer (gemini-3-flash-preview skips the router), or raise the key's quota in Google AI Studio.":
    'Espera un minuto y vuelve a intentar, elige un modelo explícito en el compositor (gemini-3-flash-preview se salta el enrutador), o sube la cuota de la llave en Google AI Studio.',

  'Gemini model under high demand (503)': 'El modelo de Gemini está saturado (503)',
  'Google is shedding load on the selected model (HTTP 503). The CLI would retry with backoff for minutes; MADRE stops it after 15 s of that and retries once on gemini-2.5-flash. The turn failed only if the fallback model was refused too.':
    'Google está soltando carga en el modelo elegido (HTTP 503). El CLI reintentaría con espera creciente durante minutos; MADRE lo corta a los 15 s y reintenta una vez con gemini-2.5-flash. El turno solo falló si también rechazaron el modelo de respaldo.',
  "Ask again in a minute, pick an explicit model from the composer's model menu, or hand the question to another agent. PULSE_GEMINI_FALLBACK_MODEL changes the fallback.":
    'Vuelve a preguntar en un minuto, elige un modelo explícito en el menú del compositor, o pásale la pregunta a otro agente. PULSE_GEMINI_FALLBACK_MODEL cambia el respaldo.',

  'OpenCode picked a provider without a valid session': 'OpenCode eligió un proveedor sin sesión válida',
  'Without a model in its config, `opencode run` falls back to its default provider. On this machine that provider holds a stale or invalid key.':
    'Sin un modelo en su configuración, `opencode run` se va a su proveedor por defecto. En esta computadora ese proveedor tiene una llave vieja o inválida.',
  'Tell MADRE which provider/model OpenCode should use in the room, or remove the stale credential so the default changes.':
    'Dile a MADRE qué proveedor/modelo debe usar OpenCode en la sala, o quita la credencial vieja para que cambie el valor por defecto.',

  'Agent installed but signed out': 'El agente está instalado pero sin sesión',
  'The CLI is on this computer but has no session for its provider. MADRE never stores credentials; each agent keeps its own.':
    'El CLI está en esta computadora pero no tiene sesión con su proveedor. MADRE nunca guarda credenciales; cada agente guarda las suyas.',
  "Press SIGN IN on the agent's card: on first contact the room opens on the bridge, and later the same button lives in ⚙ CONNECTIONS. Codex and Claude sign in with a browser flow MADRE runs for you; Gemini and OpenCode hand you their command. `madre setup` does the same from a terminal.":
    'Dale INICIAR SESIÓN en la ficha del agente: en el primer contacto la sala abre en el puente, y después el mismo botón vive en ⚙ CONEXIONES. Codex y Claude inician sesión con un flujo de navegador que MADRE corre por ti; Gemini y OpenCode te entregan su comando. `madre setup` hace lo mismo desde una terminal.',

  'Agent not found on this computer': 'El agente no está en esta computadora',
  'MADRE looks for `codex`, `claude`, `gemini` and `opencode` on PATH plus a few known locations. Nothing answered.':
    'MADRE busca `codex`, `claude`, `gemini` y `opencode` en el PATH y en unos cuantos lugares conocidos. No contestó ninguno.',
  "Press INSTALL on the agent's card: MADRE shows the exact command, runs it here and looks again when it finishes, no restart. `madre setup` does the same from a terminal.":
    'Dale INSTALAR en la ficha del agente: MADRE te enseña el comando exacto, lo corre aquí y vuelve a buscar cuando termina, sin reiniciar. `madre setup` hace lo mismo desde una terminal.',

  'Agent detected, adapter not enabled': 'Se detectó el agente, pero su adaptador no está habilitado',
  'Your MADRE build predates the adapter for this agent, or a newer CLI changed its interface.':
    'Tu versión de MADRE es anterior al adaptador de este agente, o un CLI más nuevo cambió su interfaz.',
  'Run the latest MADRE.': 'Corre la última versión de MADRE.',

  'Claude read the prompt as an MCP config path': 'Claude leyó el prompt como si fuera una ruta de configuración MCP',
  'Older MADRE builds placed the prompt right after a variadic flag, so Claude tried to open the prompt text as a file.':
    'Las versiones viejas de MADRE ponían el prompt justo después de una bandera variádica, así que Claude intentaba abrir el texto del prompt como archivo.',
  'Fixed in MADRE 0.1.0. Run the latest build.': 'Arreglado en MADRE 0.1.0. Corre la última versión.',

  'Agent did not respond before the timeout': 'El agente no contestó antes del tiempo límite',
  'The agent was still reading files or reasoning when the per-agent timeout (default 180 s) expired, or Gemini stayed silent for 90 s (PULSE_GEMINI_IDLE_MS) and was stopped after one automatic retry. Long questions over many files take longer; MADRE killed the whole process tree.':
    'El agente seguía leyendo archivos o razonando cuando se acabó su tiempo límite (180 s por defecto), o Gemini se quedó callado 90 s (PULSE_GEMINI_IDLE_MS) y se detuvo después de un reintento automático. Las preguntas largas sobre muchos archivos tardan más; MADRE mató el árbol de procesos completo.',
  "Press the RAISE button on this card, or type a new number in ⚙ CONNECTIONS (DEFAULT TIMEOUT · SECONDS, or the field on the agent's card): fields save the moment you leave them. It applies to the next turn and persists in ~/.pulse/config.json. Environment variables work too, but only for a server started after exporting them; a running room never sees a later export.":
    'Dale al botón SUBIR de esta ficha, o escribe otro número en ⚙ CONEXIONES (TIEMPO LÍMITE POR DEFECTO · SEGUNDOS, o el campo de la ficha del agente): los campos se guardan al salir de ellos. Aplica desde el próximo turno y queda en ~/.pulse/config.json. Las variables de entorno también sirven, pero solo para un servidor arrancado después de exportarlas; una sala que ya está corriendo nunca ve un export posterior.',

  'Turn interrupted by a MADRE restart': 'Turno interrumpido por un reinicio de MADRE',
  'MADRE closed (Ctrl+C, SIGTERM or a crash) while this agent was answering. The log records the turn as failed so the room never shows a ghost "thinking" bubble.':
    'MADRE se cerró (Ctrl+C, SIGTERM o un crash) mientras este agente contestaba. El registro deja el turno como fallido para que la sala nunca muestre una burbuja fantasma de «pensando».',
  'Nothing to fix. Ask again; the durable transcript is intact.': 'No hay nada que arreglar. Vuelve a preguntar; la transcripción durable está intacta.',

  'Message rejected for length': 'Mensaje rechazado por largo',
  "Single messages are capped (20,000 characters by default) so the prompt fits every CLI's argument limits.":
    'Cada mensaje tiene un tope (20,000 caracteres por defecto) para que el prompt quepa en los límites de argumentos de todos los CLIs.',
  'Split the message, or raise the cap if your CLIs cope.': 'Parte el mensaje, o sube el tope si tus CLIs lo aguantan.',

  'Where the rings get their numbers': 'De dónde salen los números de los anillos',
  'Each sphere\'s ring shows the provider\'s real limit when the CLI publishes it: Codex writes its 5-hour and weekly windows (used %, reset time) into every session rollout under ~/.codex/sessions; Claude Code\'s /usage comes from Anthropic\'s OAuth usage endpoint; MADRE can ask it with the token Claude Code keeps in the keychain when you start with PULSE_CLAUDE_USAGE=1 (macOS may ask once to allow the keychain read). Gemini and OpenCode publish nothing locally, so their ring shows MADRE\'s own rolling 5-hour window of budget tokens. A window whose reset time has passed counts as empty until the CLI reports again, and the sentinel says "clear" when a full window resets.':
    'El anillo de cada esfera muestra el límite real del proveedor cuando el CLI lo publica: Codex escribe sus ventanas de 5 horas y semanal (% usado, hora de reinicio) en cada sesión bajo ~/.codex/sessions; el /usage de Claude Code viene del endpoint de uso OAuth de Anthropic, y MADRE puede pedirlo con el token que Claude Code guarda en el llavero si arrancas con PULSE_CLAUDE_USAGE=1 (macOS puede pedirte permiso una vez para leer el llavero). Gemini y OpenCode no publican nada localmente, así que su anillo muestra la ventana propia de MADRE: 5 horas rodantes de tokens de presupuesto. Una ventana cuya hora de reinicio ya pasó cuenta como vacía hasta que el CLI vuelva a reportar, y el centinela dice «claro» cuando una ventana entera se reinicia.',
  'Click a sphere to see both windows and when they reset. If a ring looks stale, run one turn with that agent: Codex only rewrites its limits when it runs. Set PULSE_OFFICIAL_QUOTA=0 to stop reading provider limits altogether.':
    'Haz clic en una esfera para ver las dos ventanas y cuándo se reinician. Si un anillo se ve viejo, corre un turno con ese agente: Codex solo reescribe sus límites cuando corre. Pon PULSE_OFFICIAL_QUOTA=0 para dejar de leer los límites del proveedor por completo.',

  'Local token budget exhausted for an agent': 'Se acabó el presupuesto local de tokens de un agente',
  'The room keeps a soft per-agent budget (500,000 tokens by default) so one agent does not quietly eat a whole session. It is MADRE\'s own bookkeeping from the usage each CLI reports after a turn, not the provider\'s quota: nothing is blocked, the room only warns and suggests other agents. Cache reads weigh a tenth of a fresh token.':
    'La sala lleva un presupuesto blando por agente (500,000 tokens por defecto) para que uno solo no se coma una sesión entera sin avisar. Es la contabilidad propia de MADRE, hecha con lo que cada CLI reporta después de un turno, no la cuota del proveedor: no se bloquea nada, la sala solo avisa y sugiere otros agentes. Las lecturas de caché pesan una décima de un token fresco.',
  "Continue with another agent, press RAISE LOCAL BUDGET on this card, or type a number in ⚙ CONNECTIONS → LOCAL TOKEN BUDGET PER AGENT (saves on leaving the field). The provider's real limits show in each sphere's popover when the CLI reports them.":
    'Sigue con otro agente, dale SUBIR EL PRESUPUESTO LOCAL en esta ficha, o escribe un número en ⚙ CONEXIONES → PRESUPUESTO LOCAL DE TOKENS POR AGENTE (se guarda al salir del campo). Los límites reales del proveedor salen en el globo de cada esfera cuando el CLI los reporta.',

  'Port already in use': 'El puerto ya está ocupado',
  'Another process, often another MADRE, is listening on the port.': 'Otro proceso, seguido otra MADRE, está escuchando en ese puerto.',
  'Use a different port, or find and stop the process holding it.': 'Usa otro puerto, o encuentra y detén el proceso que lo tiene.',

  'Live stream keeps reconnecting': 'La conexión en vivo se sigue reconectando',
  'The page lost the server. MADRE exited, the laptop slept, or the port changed.':
    'La página perdió al servidor. MADRE se cerró, la laptop se durmió, o cambió el puerto.',
  'Start MADRE again from the project folder and reload. The transcript is on disk; nothing is lost.':
    'Vuelve a arrancar MADRE desde la carpeta del proyecto y recarga. La transcripción está en disco; no se pierde nada.',

  'OpenCode reported an unexpected server error': 'OpenCode reportó un error de servidor inesperado',
  'OpenCode runs a local server per invocation; under several simultaneous turns it can fail before the model is reached. Seen when two plans overlapped.':
    'OpenCode levanta un servidor local por invocación; con varios turnos a la vez puede fallar antes de llegar al modelo. Se vio cuando se encimaron dos planes.',
  'Let the room settle (STOPALL if agents are piling up), then ask again. Check `opencode` logs if it repeats alone.':
    'Deja que la sala se calme (STOPALL si se están amontonando los agentes) y vuelve a preguntar. Revisa los logs de `opencode` si se repite solo.',

  'Too many agents working at once': 'Demasiados agentes trabajando a la vez',
  'A plan was running and more turns started on top of it, or a plan has run for several minutes. MU/TH/UR raises this before it becomes a loop.':
    'Había un plan corriendo y encima arrancaron más turnos, o un plan lleva varios minutos. MU/TH/UR lo levanta antes de que se vuelva un bucle.',
  'Type STOPALL in the composer, or press STOP ALL in the bar: every plan stops and every in-flight agent process is killed. Then ask one agent at a time.':
    'Escribe STOPALL en el compositor, o dale PARAR TODO en la barra: se detienen todos los planes y se mata cada proceso de agente en vuelo. Después pregunta de a un agente.',

  'Gemini: generating images': 'Gemini: generar imágenes',
  'Gemini CLI 0.60 has no image-generation tool in headless mode, even though Google offers image models. MADRE fills the gap with the Image Studio module: its own MCP server exposing generate_image on the Gemini API image models, attached to Gemini only inside a creation lease with the image scope on, billing your Gemini key.':
    'El CLI de Gemini 0.60 no tiene herramienta de generación de imágenes en modo headless, aunque Google sí ofrece modelos de imagen. MADRE tapa el hueco con el módulo Image Studio: su propio servidor MCP con generate_image sobre los modelos de imagen de la API de Gemini, enganchado a Gemini solo dentro de un permiso de creación con el alcance de imagen encendido, y cobrando a tu llave de Gemini.',
  'Enable Image Studio in MODULES (needs a Gemini API key with credits), then tick GENERATE IMAGES for Gemini in CONNECTIONS. Without the module, ask @codex or let the orchestrator route the image step to it.':
    'Enciende Image Studio en MÓDULOS (necesita una API key de Gemini con créditos) y luego préndele GENERAR IMÁGENES a Gemini en CONEXIONES. Sin el módulo, pídeselo a @codex o deja que el orquestador le mande ese paso.',

  'Claude Code: generating images': 'Claude Code: generar imágenes',
  "Claude Code has no image-generation tool; Claude models describe and reason about images, they do not render them. The Image Studio module gives Claude the MCP tool generate_image (MADRE's own server on the Gemini API), attached with --mcp-config only inside a creation lease.":
    'Claude Code no tiene herramienta de generación de imágenes; los modelos de Claude describen y razonan sobre imágenes, no las dibujan. El módulo Image Studio le da a Claude la herramienta MCP generate_image (el servidor propio de MADRE sobre la API de Gemini), enganchada con --mcp-config solo dentro de un permiso de creación.',
  'Enable Image Studio in MODULES, tick GENERATE IMAGES for Claude in CONNECTIONS, then use CREATE. Or route the image step to @codex.':
    'Enciende Image Studio en MÓDULOS, préndele GENERAR IMÁGENES a Claude en CONEXIONES y usa CREATE. O mándale ese paso a @codex.',

  'OpenCode: generating images': 'OpenCode: generar imágenes',
  "OpenCode exposes no image-generation tool of its own. The Image Studio module adds MADRE's MCP image server to OpenCode's ephemeral config inside a creation lease.":
    'OpenCode no expone ninguna herramienta propia de generación de imágenes. El módulo Image Studio agrega el servidor MCP de imagen de MADRE a la configuración efímera de OpenCode, dentro de un permiso de creación.',
  'Enable Image Studio in MODULES, tick GENERATE IMAGES for OpenCode in CONNECTIONS, then use CREATE. Or route the image step to @codex.':
    'Enciende Image Studio en MÓDULOS, préndele GENERAR IMÁGENES a OpenCode en CONEXIONES y usa CREATE. O mándale ese paso a @codex.',

  'Web access for an agent': 'Acceso a la web para un agente',
  'Every CLI can browse: Codex with --search, Claude Code with WebFetch/WebSearch, Gemini with google_web_search/web_fetch, OpenCode with webfetch/websearch. MADRE keeps it off until you enable it per agent.':
    'Todos los CLIs pueden navegar: Codex con --search, Claude Code con WebFetch/WebSearch, Gemini con google_web_search/web_fetch, OpenCode con webfetch/websearch. MADRE lo deja apagado hasta que tú lo enciendas por agente.',
  "Tick WEB ACCESS in that agent's card in CONNECTIONS and save. It applies to every turn of that agent; content fetched is sent to its provider.":
    'Préndele ACCESO A LA WEB en la ficha de ese agente en CONEXIONES y guarda. Aplica a todos sus turnos; lo que traiga de la web viaja a su proveedor.',

  'Commands and mentions in the field box': 'Comandos y menciones en el campo',
  'Type "/" for the room\'s commands: /create arms the lease, /image routes an image request to an agent that can draw, /stopall is the brake, /git (Git Pulse) and /ahp (AHP+) run read-only in the project and post a fact card everyone, agents included, can read. Type "@" to mention an agent; the name becomes a label. Type "!" to point at a project file ("!src/room.mjs:12-20" for lines): the agent reads it first. In the viewer, click a line number (Shift+click for a range) and REVIEW WITH sends those lines to an agent.':
    'Escribe «/» para los comandos de la sala: /create arma el permiso, /image manda una petición de imagen a un agente que sepa dibujar, /stopall es el freno, y /git (Git Pulse) y /ahp (AHP+) corren en solo lectura sobre el proyecto y publican una ficha que todos —agentes incluidos— pueden leer. Escribe «@» para mencionar a un agente; el nombre se vuelve una etiqueta. Escribe «!» para apuntar a un archivo del proyecto («!src/room.mjs:12-20» para líneas): el agente lo lee primero. En el visor, haz clic en un número de línea (Shift+clic para un rango) y REVISAR CON le manda esas líneas a un agente.',
  'A struck-through command is a module that is not available in this project: open MODULES to install or enable it (Git Pulse needs a git repository; AHP+ needs to be installed).':
    'Un comando tachado es un módulo que no está disponible en este proyecto: abre MÓDULOS para instalarlo o encenderlo (Git Pulse necesita un repositorio git; AHP+ hay que instalarlo).',

  'Permission modes: #0 GHOST · #1 EXCHANGE · #2 CREATE · #3 CONTROL · #4 AIRLOCK':
    'Modos de permiso: #0 GHOST · #1 EXCHANGE · #2 CREATE · #3 CONTROL · #4 AIRLOCK',
  'Every message goes out at a mode, chosen in the chip after TO @agent (or typed as #2 in the text). #0 GHOST is off the record: nothing is saved, no other agent remembers it, gone on reload, no delegation. #1 EXCHANGE is the default: read and coordinate. #2 CREATE lets the agent add new files and folders anywhere in the project, where they belong; whatever existed before is put back after the turn and the room says so. #3 CONTROL puts one agent in command of the project itself: a git checkpoint is taken first, every change is listed afterwards, writes into .git, .pulse or .env files are reverted on the spot, and UNDO restores the checkpoint. One holder at a time; it needs MAX MODE 3 and a git repository. Your mode is the ceiling of any plan the message starts, and #3 is never delegated. Each agent has a MAX MODE in CONNECTIONS; above it, #2 is answered read-only and #3 is refused. When a #1 plan reaches a step that wants to create something, the room pauses and asks you: GRANT ONCE, GRANT FOR PLAN or DENY, with a 3-minute clock; silence denies. #4 AIRLOCK is CONTROL plus commands: tests, builds, git push, deploys with the CLIs and sessions already on this machine. Files still come back with UNDO; what leaves the machine does not, so the override asks twice: the designation, then the word AIRLOCK. An agent that says it needs a "production mode" or "permission to run commands" is asking for #4.':
    'Cada mensaje sale con un modo, elegido en el chip que está después de PARA @agente (o escrito como #2 en el texto). #0 GHOST es fuera de registro: no se guarda nada, ningún otro agente lo recuerda, se pierde al recargar y no hay delegación. #1 EXCHANGE es el de siempre: leer y coordinar. #2 CREATE deja que el agente agregue archivos y carpetas nuevos donde les toque en el proyecto; lo que ya existía se restaura al terminar el turno y la sala lo dice. #3 CONTROL le da a un agente el mando del proyecto mismo: primero se toma un checkpoint de git, al final se listan todos los cambios, lo que se escriba en .git, .pulse o archivos .env se revierte en el acto, y DESHACER restaura el checkpoint. Un solo portador a la vez; necesita MODO MÁXIMO 3 y un repositorio git. Tu modo es el techo de cualquier plan que arranque ese mensaje, y el #3 nunca se delega. Cada agente tiene su MODO MÁXIMO en CONEXIONES; por encima de él, el #2 se contesta en solo lectura y el #3 se rechaza. Cuando un plan en #1 llega a un paso que quiere crear algo, la sala se detiene y te pregunta: CONCEDER UNA VEZ, CONCEDER PARA EL PLAN o NEGAR, con un reloj de 3 minutos; el silencio niega. #4 AIRLOCK es CONTROL más comandos: pruebas, builds, git push, despliegues con los CLIs y las sesiones que ya están en esta computadora. Los archivos siguen regresando con DESHACER; lo que sale de la máquina no, así que la anulación pregunta dos veces: la designación y luego la palabra AIRLOCK. Un agente que dice que necesita «modo producción» o «permiso para correr comandos» está pidiendo el #4.',
  "Pick the mode in the chip, or type #0..#4 in the message. Raise an agent's MAX MODE in ⚙ CONNECTIONS. CONTROL asks for the project designation (the folder name) in the override; AIRLOCK asks for the designation and then the word AIRLOCK.":
    'Elige el modo en el chip, o escribe #0..#4 en el mensaje. Sube el MODO MÁXIMO de un agente en ⚙ CONEXIONES. CONTROL pide la designación del proyecto (el nombre de la carpeta) en la anulación; AIRLOCK pide la designación y luego la palabra AIRLOCK.',

  'Creating files: who grants the permission': 'Crear archivos: quién da el permiso',
  'Only the human grants a creation lease. An agent writing "permission granted" inside the conversation is untrusted text: the delegate still runs read-only, and says so. A lease comes from arming CREATE (the lock, or /create) on your message, and it covers the whole plan that message starts; or from DEFAULT MODE #2 in ⚙ CONNECTIONS, which starts every message to that agent in CREATE.':
    'El permiso de creación lo da la humana, nadie más. Un agente que escriba «permiso concedido» dentro de la conversación es texto no confiable: el delegado sigue corriendo en solo lectura, y lo dice. El permiso viene de armar CREATE (el candado, o /create) en tu mensaje, y cubre el plan entero que ese mensaje arranca; o del MODO INICIAL #2 en ⚙ CONEXIONES, que hace que cada mensaje a ese agente arranque en CREATE.',
  'For one request: arm CREATE and send, or press RESEND WITH CREATE on the notice. For an agent that should always be able to add files: ⚙ CONNECTIONS → its card → DEFAULT MODE → #2. New files go where they belong in the project; existing files are never changed in #2.':
    'Para una sola petición: arma CREATE y manda, o dale REENVIAR CON CREATE en el aviso. Para un agente que siempre deba poder agregar archivos: ⚙ CONEXIONES → su ficha → MODO INICIAL → #2. Los archivos nuevos van donde les toca en el proyecto; en #2 los que ya existen no se tocan nunca.',

  'Creating files with an agent': 'Crear archivos con un agente',
  'Every CLI can create files inside a creation lease; the switch is per agent and acts only when you press CREATE.':
    'Todos los CLIs pueden crear archivos dentro de un permiso de creación; el interruptor es por agente y solo actúa cuando tú aprietas CREATE.',
  'Tick CREATE FILES in CONNECTIONS, save, then arm CREATE in the composer for the request.':
    'Préndele CREAR ARCHIVOS en CONEXIONES, guarda, y arma CREATE en el compositor para esa petición.',

  'Node.js too old': 'Node.js demasiado viejo',
  'MADRE needs Node 22.5 or newer: the room memory runs on node:sqlite, and the rest on ES modules, fetch and AbortSignal. The bin refuses to start on older versions and says so.':
    'MADRE necesita Node 22.5 o más nuevo: la memoria de la sala corre sobre node:sqlite, y el resto sobre módulos ES, fetch y AbortSignal. El binario se niega a arrancar en versiones viejas y lo dice.',
  'Update Node to the current LTS.': 'Actualiza Node a la LTS actual.',

  'Room memory unavailable: turns get only the recent window':
    'La memoria de la sala no está disponible: los turnos solo reciben la ventana reciente',
  "The memory index (memory.sqlite next to the room's events.jsonl) could not open or write. The room still works: every turn gets the recent transcript, but nothing older is recalled, nothing is distilled and NOSTROMO is empty. Causes: Node below 22.5, a corrupt file, or a second MADRE writing the same room with an incompatible version.":
    'El índice de memoria (memory.sqlite, junto al events.jsonl de la sala) no se pudo abrir o escribir. La sala sigue funcionando: cada turno recibe la transcripción reciente, pero no se recuerda nada más viejo, no se destila nada y NOSTROMO está vacío. Causas: Node por debajo de 22.5, un archivo corrupto, o una segunda MADRE escribiendo la misma sala con una versión incompatible.',
  'The index is derived from the ledger: delete memory.sqlite (and its -wal/-shm siblings) and restart; MADRE rebuilds it. Distilled notes live in the same file, so export them from NOSTROMO first if they matter.':
    'El índice se deriva del ledger: borra memory.sqlite (y sus hermanos -wal/-shm) y reinicia; MADRE lo reconstruye. Las notas destiladas viven en ese mismo archivo, así que expórtalas desde NOSTROMO primero si te importan.',

  'Room memory: what an agent remembers and how': 'La memoria de la sala: qué recuerda un agente y cómo',
  'Everything said outside GHOST is indexed (full text plus meaning, when a Gemini key exists). When a room is longer than the context window, each turn also receives the older exchanges that match the request, quoted with their ledger sequence (<memory>), and the distilled notes that match (<memories>), inside PULSE_RECALL_SHARE of the window (30 % by default). Every agent reads the same memory, so a decision taken with one reaches the others. Ghost turns may read it but never write it.':
    'Todo lo que se dice fuera de GHOST queda indexado (texto completo más significado, cuando hay una llave de Gemini). Cuando una sala es más larga que la ventana de contexto, cada turno recibe además los intercambios viejos que coincidan con la petición, citados con su número de ledger (<memory>), y las notas destiladas que coincidan (<memories>), dentro del PULSE_RECALL_SHARE de la ventana (30 % por defecto). Todos los agentes leen la misma memoria, así que una decisión tomada con uno llega a los demás. Los turnos en ghost pueden leerla pero nunca la escriben.',
  'Nothing to do; it is automatic. To give it more room raise PULSE_RECALL_SHARE (max 0.6); to switch it off set it to 0. Ask any agent "what did we decide about …" and it will search with memory_search before answering.':
    'No hay nada que hacer; es automático. Para darle más espacio sube PULSE_RECALL_SHARE (máximo 0.6); para apagarlo ponlo en 0. Pregúntale a cualquier agente «¿qué decidimos sobre…?» y va a buscar con memory_search antes de contestar.',

  'Distilled memories: the archivist did not run, or failed': 'Memorias destiladas: el archivista no corrió, o falló',
  'Every PULSE_DISTILL_EVERY undistilled exchanges (10), or after PULSE_DISTILL_IDLE_MS of quiet (10 min), the cheapest available agent (Gemini, then OpenCode, Codex, Claude) reads the newest undistilled batch and keeps up to five notes. It runs only when no turn is in flight and one batch per trigger, so a long backlog drains slowly. A run that fails is retried; after three failures on the same batch it is skipped and the room says so. Common causes: the archivist agent is rate-limited or signed out, or PULSE_DISTILL=0.':
    'Cada PULSE_DISTILL_EVERY intercambios sin destilar (10), o después de PULSE_DISTILL_IDLE_MS en silencio (10 min), el agente disponible más barato (Gemini, luego OpenCode, Codex, Claude) lee el lote más nuevo sin destilar y se queda con hasta cinco notas. Corre solo cuando no hay ningún turno en vuelo, y un lote por disparo, así que una cola larga baja despacio. Una corrida que falla se reintenta; después de tres fallas en el mismo lote se salta y la sala lo dice. Causas comunes: al archivista le pusieron límite de tasa o no tiene sesión, o PULSE_DISTILL=0.',
  'Check the archivist\'s session in ⚙ CONNECTIONS, or pick another with PULSE_DISTILL_AGENT. Lower PULSE_DISTILL_EVERY to distil sooner; raise PULSE_DISTILL_MAX_CHARS to read more per run. Set PULSE_DISTILL=0 to stop paying for it.':
    'Revisa la sesión del archivista en ⚙ CONEXIONES, o elige otro con PULSE_DISTILL_AGENT. Baja PULSE_DISTILL_EVERY para destilar antes; sube PULSE_DISTILL_MAX_CHARS para que lea más por corrida. Pon PULSE_DISTILL=0 para dejar de pagarlo.',

  'Embeddings paused: recall is lexical only': 'Embeddings en pausa: el recall es solo léxico',
  "Meaning-aware recall and the links between memories in NOSTROMO need Gemini embeddings through your own key (GEMINI_API_KEY or the Gemini CLI's keychain entry). Without a key, or when the API answers 429/5xx, MADRE pauses vectors for a minute and retries; recall keeps working on words alone.":
    'El recall por significado y los enlaces entre memorias en NOSTROMO necesitan embeddings de Gemini con tu propia llave (GEMINI_API_KEY o la entrada del llavero del CLI de Gemini). Sin llave, o cuando la API contesta 429/5xx, MADRE pausa los vectores un minuto y reintenta; el recall sigue trabajando solo con palabras.',
  'Sign the Gemini CLI in with an API key (/auth) or export GEMINI_API_KEY, then restart. If you do not want embeddings at all, set PULSE_EMBED=0 and the pause message stops.':
    'Inicia sesión en el CLI de Gemini con una API key (/auth) o exporta GEMINI_API_KEY, y reinicia. Si de plano no quieres embeddings, pon PULSE_EMBED=0 y el aviso de pausa se va.',

  'An agent says it cannot search the memory (pulse-memory MCP)':
    'Un agente dice que no puede buscar en la memoria (el MCP pulse-memory)',
  "Every turn attaches MADRE's memory as an MCP server named pulse-memory: Claude through --mcp-config, Gemini through its isolated settings and policy, OpenCode through config.mcp, Codex through -c mcp_servers.* overrides. If a CLI does not list its tools the server did not start in that CLI: an old CLI without MCP support, a sandbox that blocks the SQLite file, or PULSE_MEMORY_TOOLS=0. The automatic <memory> blocks in the prompt still work without it.":
    'Cada turno engancha la memoria de MADRE como un servidor MCP llamado pulse-memory: a Claude por --mcp-config, a Gemini por su configuración y su política aisladas, a OpenCode por config.mcp, a Codex por overrides -c mcp_servers.*. Si un CLI no lista sus herramientas, el servidor no arrancó en ese CLI: un CLI viejo sin soporte MCP, un sandbox que bloquea el archivo SQLite, o PULSE_MEMORY_TOOLS=0. Los bloques <memory> automáticos del prompt siguen funcionando sin eso.',
  'Update the CLI, then check that it sees the server. Codex can list servers from a config override; Claude accepts an inline --mcp-config. If a CLI keeps failing, PULSE_MEMORY_TOOLS=0 removes the tools for everyone and the room continues on automatic recall.':
    'Actualiza el CLI y comprueba que vea el servidor. Codex puede listar servidores desde un override de configuración; Claude acepta un --mcp-config en línea. Si un CLI sigue fallando, PULSE_MEMORY_TOOLS=0 quita las herramientas para todos y la sala sigue con el recall automático.',

  'Saving a memory on request; GHOST refuses': 'Guardar una memoria a petición; GHOST se niega',
  'Memories are distilled automatically; you never need to ask. When you do ask an agent to remember or save something, it calls memory_note and a pill appears under its reply with the note; clicking the pill opens it in NOSTROMO. In a GHOST turn the note is refused: nothing off the record reaches the archive. "Already remembered" means the same note exists.':
    'Las memorias se destilan solas; nunca hace falta pedirlo. Cuando sí le pides a un agente que recuerde o guarde algo, llama a memory_note y aparece una píldora debajo de su respuesta con la nota; al hacer clic se abre en NOSTROMO. En un turno GHOST la nota se rechaza: nada fuera de registro llega al archivo. «Ya estaba recordada» significa que esa misma nota ya existe.',
  'Ask in any mode but #0: "remember that …" or "save this as a decision: …". Notes saved this way are marked "on the human\'s request" in NOSTROMO and can be forgotten there.':
    'Pídelo en cualquier modo menos el #0: «recuerda que…» o «guarda esto como decisión: …». Las notas guardadas así quedan marcadas «a petición de la humana» en NOSTROMO y ahí mismo se pueden olvidar.',

  'NOSTROMO: boarding, reading and forgetting': 'NOSTROMO: abordar, leer y olvidar',
  'NOSTROMO is the human\'s view of the archive, from MU/TH/UR. Boarding asks for the project designation: the name of the project folder, exactly as CONTROL does; a wrong one answers UNABLE TO COMPUTE. Access stays open until the page reloads. Inside, every distilled memory is a planet around the room\'s core; drag to move, wheel to zoom, click a planet for its card. The only edit is FORGET (two presses): the note leaves every future turn, the ledger stays. If the archive answers SEALED with a number of minutes, wait them out: repeated strikes at the core close it for a while and the composer reads INTRUDER until it opens again.':
    'NOSTROMO es la vista humana del archivo, desde MU/TH/UR. Abordar pide la designación del proyecto: el nombre de la carpeta, igual que CONTROL; una equivocada contesta IMPOSIBLE DE PROCESAR. El acceso sigue abierto hasta que se recargue la página. Adentro, cada memoria destilada es un planeta alrededor del núcleo de la sala; arrastra para mover, rueda para acercar, clic en un planeta para su ficha. La única edición es OLVIDAR (dos toques): la nota sale de todos los turnos que vienen, el ledger se queda. Si el archivo contesta SELLADO con un número de minutos, espéralos: los golpes repetidos al núcleo lo cierran un rato y el compositor dice INTRUSO hasta que vuelva a abrir.',
  'Type the folder name shown in the room header as the designation. To find a memory quickly, ask an agent to search instead. Do not strike the core.':
    'Escribe como designación el nombre de carpeta que aparece en el encabezado de la sala. Para encontrar una memoria rápido, mejor pídele a un agente que busque. No le pegues al núcleo.',

  'RIPLEY: rendering HTML, SVG and Markdown in the viewer': 'RIPLEY: dibujar HTML, SVG y Markdown en el visor',
  'With RIPLEY on (MODULES), the file viewer renders .html and .svg through /preview/project/<path> inside a sealed frame: the page\'s own scripts run, but the frame has no origin, no network, no forms and no way to reach MADRE, and it loads CSS, JS, images and fonts only from the project through MADRE. Relative links work. Markdown renders in place; PREVIEW / SOURCE switches. Off, those files show as text with a note. 412 means RIPLEY is off. Plain /api/files always serves HTML as text.':
    'Con RIPLEY encendido (MÓDULOS), el visor de archivos dibuja los .html y .svg por /preview/project/<ruta> dentro de un marco sellado: los scripts de la página sí corren, pero el marco no tiene origen, ni red, ni formularios, ni manera de alcanzar a MADRE, y carga CSS, JS, imágenes y tipografías solo desde el proyecto, a través de MADRE. Los enlaces relativos funcionan. El Markdown se dibuja en su lugar; PREVIEW / SOURCE cambia entre uno y otro. Apagado, esos archivos se ven como texto con una nota. Un 412 significa que RIPLEY está apagado. El /api/files normal siempre sirve el HTML como texto.',
  'Enable RIPLEY in MODULES. If a page looks broken in PREVIEW it is usually because it fetches something from the internet or another server, which the frame forbids by design: open it with OPEN RAW in a normal tab if you trust it.':
    'Enciende RIPLEY en MÓDULOS. Si una página se ve rota en PREVIEW, casi siempre es porque pide algo de internet o de otro servidor, cosa que el marco prohíbe a propósito: ábrela con ABRIR EN CRUDO en una pestaña normal si confías en ella.',

  'Ollama: local embeddings and a local archivist': 'Ollama: embeddings locales y un archivista local',
  'When Ollama runs on this machine with an embedding model and a chat model, MADRE embeds the memory locally (recall by meaning without any key) and distils memories with the local model first, before Gemini and the others. Nothing leaves the machine for remembering. Off or absent, everything falls back to the providers. MODULES shows what Ollama has, lets you pull the recommended models, and switches each role.':
    'Cuando Ollama corre en esta computadora con un modelo de embeddings y uno de chat, MADRE genera los embeddings localmente (recall por significado sin ninguna llave) y destila las memorias con el modelo local primero, antes que Gemini y los demás. Para recordar no sale nada de la máquina. Apagado o ausente, todo vuelve a los proveedores. MÓDULOS enseña qué tiene Ollama, te deja bajar los modelos recomendados y prende o apaga cada papel.',
  'Install Ollama (ollama.com), start it, then in MODULES press RECHECK and PULL the models it suggests. Set PULSE_OLLAMA_MODEL or PULSE_OLLAMA_EMBED_MODEL to prefer others; PULSE_EMBED_PROVIDER=gemini keeps embeddings on Gemini even with Ollama running.':
    'Instala Ollama (ollama.com), enciéndelo, y en MÓDULOS dale REVISAR OTRA VEZ y PULL a los modelos que sugiere. Pon PULSE_OLLAMA_MODEL o PULSE_OLLAMA_EMBED_MODEL para preferir otros; PULSE_EMBED_PROVIDER=gemini deja los embeddings en Gemini aunque Ollama esté corriendo.',

  "@madre: the room's own memory, as an agent": '@madre: la memoria de la sala, como agente',
  'When Ollama runs with a chat model, a fifth agent joins the room: @madre. It answers from the whole archive (distilled notes and exact quotes, cited as [#n]) and from what the message carries, locally, for free. It never writes, draws, browses or delegates; when the room never discussed something it says so. Other agents may delegate a step to it to check what was decided. It leaves the room when Ollama stops, and MU/TH/UR says so.':
    'Cuando Ollama corre con un modelo de chat, se suma un quinto agente a la sala: @madre. Contesta desde el archivo entero (notas destiladas y citas exactas, citadas como [#n]) y desde lo que traiga el mensaje, en local y gratis. Nunca escribe, ni dibuja, ni navega, ni delega; cuando la sala nunca habló de algo, lo dice. Otros agentes pueden delegarle un paso para comprobar qué se decidió. Se va de la sala cuando Ollama se apaga, y MU/TH/UR lo avisa.',
  'Start Ollama and PULL a chat model in MODULES → OLLAMA; the switch @MADRE IN THE ROOM turns the agent off if you do not want it. Ask it "what did we decide about …" or "did we ever discuss …".':
    'Enciende Ollama y baja un modelo de chat con PULL en MÓDULOS → OLLAMA; el interruptor @MADRE EN LA SALA apaga al agente si no lo quieres. Pregúntale «¿qué decidimos sobre…?» o «¿alguna vez hablamos de…?».',

  'Installing a CLI: npm cannot write to the system folder': 'Instalar un CLI: npm no puede escribir en la carpeta del sistema',
  'A global npm install writes into a folder that belongs to the system. With Node installed from its own installer that folder needs an administrator, so npm stops with a permission error. MADRE does not ask for your password: when it sees that wall it installs the CLI into a folder of its own, ~/.pulse/tools, and looks there as well as along PATH. The agent works the same; only the file lives somewhere else.':
    'Una instalación global de npm escribe en una carpeta del sistema. Con Node instalado desde su propio instalador, esa carpeta necesita administrador, así que npm se detiene con un error de permisos. MADRE no te pide tu contraseña: cuando ve ese muro instala el CLI en una carpeta suya, ~/.pulse/tools, y lo busca ahí además de en el PATH. El agente funciona igual; solo que el archivo vive en otro lado.',
  'Nothing to do: press INSTALL again and MADRE takes the second way by itself. If you would rather have the CLI everywhere in your terminal, install it yourself with your package manager, or give npm a folder of your own.':
    'No hay nada que hacer: dale INSTALAR otra vez y MADRE toma el segundo camino sola. Si prefieres tener el CLI disponible en toda tu terminal, instálalo tú con tu gestor de paquetes, o dale a npm una carpeta tuya.',

  'Privacy: an agent brought its own configuration into the room':
    'Privacidad: un agente metió su propia configuración a la sala',
  'A CLI agent runs with its own system context: organisation instructions, the account it is signed in with, CLAUDE.md files elsewhere. It can mistake that private context for shared context and write a company, a brand or a domain into a reply. Once in the ledger the term reaches the archivist, every other agent and the dataset.':
    'Un agente CLI corre con su propio contexto de sistema: instrucciones de organización, la cuenta con la que tiene sesión, archivos CLAUDE.md de otros lados. Puede confundir ese contexto privado con contexto compartido y escribir una empresa, una marca o un dominio en una respuesta. Una vez en el ledger, ese término llega al archivista, a los demás agentes y al dataset.',
  'Name the terms in ⚙ CONNECTIONS → PRIVACY. From then on MADRE replaces them with the marker before the ledger, the index, the notes and the dataset see them, and every reply that needed it shows a privacy line. PURGE ROOM rewrites what the room already holds; re-export the dataset afterwards. The terms never leave config.json.':
    'Nombra los términos en ⚙ CONEXIONES → PRIVACY. De ahí en adelante MADRE los reemplaza con el marcador antes de que los vean el ledger, el índice, las notas y el dataset, y cada respuesta que lo necesitó muestra una línea de privacidad. PURGAR LA SALA reescribe lo que la sala ya tiene; vuelve a exportar el dataset después. Los términos nunca salen de config.json.',

  'CONTROL: what changed, what was reverted, UNDO': 'CONTROL: qué cambió, qué se revirtió, DESHACER',
  'A #3 CONTROL turn takes a git checkpoint before the agent runs, then lists every file it added, modified or deleted. Writes into .git, .pulse or any .env file are reverted on the spot and named. UNDO restores the checkpoint in one click; STOPALL revokes CONTROL. One holder at a time, never delegated, needs MAX MODE 3 and a git repository.':
    'Un turno en #3 CONTROL toma un checkpoint de git antes de que el agente corra, y luego lista cada archivo que agregó, modificó o borró. Lo que se escriba en .git, .pulse o cualquier archivo .env se revierte en el acto y se nombra. DESHACER restaura el checkpoint con un clic; STOPALL revoca CONTROL. Un solo portador a la vez, nunca se delega, necesita MODO MÁXIMO 3 y un repositorio git.',
  'Read the list under the reply before moving on. If the change is wrong press UNDO; if the agent should not have had it, lower its MAX MODE in ⚙ CONNECTIONS.':
    'Lee la lista que queda debajo de la respuesta antes de seguir. Si el cambio está mal dale DESHACER; si ese agente no debía tenerlo, bájale el MODO MÁXIMO en ⚙ CONEXIONES.',

  'Conversations: many per project, one memory, one at a time':
    'Conversaciones: muchas por proyecto, una sola memoria, de a una',
  "A project has one memory and many conversations. The archive, the crew, the modules and the privacy list belong to the project and do not start over when you open another thread; a conversation is only the record of one line of work, and everything said in any of them feeds the same archive. The first conversation is the ledger that was always there, so a room that existed before opens exactly as it did. The numbering is the project's, not the thread's: a new conversation starts where the project got to, which is why a citation like #1411 means the same exchange in all of them. One conversation drives the crew at a time — two threads editing the same working tree is a way to lose work — so opening another while a turn runs is refused until it finishes. And one server per project: a second `madre start` on the same project is refused with the address of the room that is already open, because two servers would hand out the same sequence twice and the archive would quietly keep one of them.":
    'Un proyecto tiene una memoria y muchas conversaciones. El archivo, la tripulación, los módulos y la lista de privacidad son del proyecto y no empiezan de cero porque abras otro hilo; una conversación es solo el registro de una línea de trabajo, y todo lo que se diga en cualquiera alimenta el mismo archivo. La primera conversación es el ledger que siempre estuvo ahí, así que una sala que ya existía abre exactamente igual. La numeración es del proyecto, no del hilo: una conversación nueva arranca donde llegó el proyecto, y por eso una cita como #1411 significa el mismo intercambio en todas. Solo una conversación maneja a la tripulación a la vez —dos hilos editando el mismo árbol de trabajo es una forma de perder trabajo—, así que abrir otra mientras corre un turno se rechaza hasta que termine. Y un servidor por proyecto: un segundo `madre start` sobre el mismo proyecto se rechaza con la dirección de la sala que ya está abierta, porque dos servidores repartirían el mismo número dos veces y el archivo se quedaría calladito con uno de ellos.',
  "The panel on the left of the canvas lists them: open one, or start another at the bottom. Deleting one takes its transcript and nothing else — what the archivist distilled from it is the project's memory and stays. If MADRE says the project is already open, use that room and open a conversation inside it instead of starting a second server.":
    'El panel a la izquierda del lienzo las lista: abre una, o empieza otra desde abajo. Borrar una se lleva su transcripción y nada más — lo que el archivista destiló de ella es memoria del proyecto y se queda. Si MADRE dice que el proyecto ya está abierto, usa esa sala y abre una conversación dentro, en vez de arrancar un segundo servidor.',

  'Aberrations: what the room established is false': 'Aberraciones: lo que la sala estableció que es falso',
  'An aberration is a claim the room established is false, kept on purpose rather than deleted: it is what the local model learns not to repeat. It never travels into a turn, and the note it refutes is taken out of circulation with it — a refuted memory is never recalled again, by words or by meaning. EYECAT watches for two agents saying opposite things about the same subject and raises the pair for a third agent to judge, one that took no part in either side. Confirming files the aberration and quarantines what it refutes; dismissing says the room was right and the pair is never raised again. Forgetting an aberration gives its note back.':
    'Una aberración es una afirmación que la sala estableció como falsa, guardada a propósito en vez de borrada: es lo que el modelo local aprende a no repetir. Nunca viaja dentro de un turno, y la nota que refuta sale de circulación con ella — una memoria refutada no se vuelve a recordar, ni por palabras ni por significado. EYECAT vigila que dos agentes no digan cosas opuestas sobre el mismo tema y levanta el par para que lo juzgue un tercero, uno que no estuvo en ninguno de los dos lados. Confirmar archiva la aberración y pone en cuarentena lo que refuta; descartar dice que la sala tenía razón y ese par no se vuelve a levantar. Olvidar una aberración devuelve su nota.',
  'NOSTROMO shows them as collapsed bodies: open one to read what it took down, or clear it if the room was wrong about being wrong. The three tests report open contradictions under CONSISTENCY.':
    'NOSTROMO las enseña como cuerpos colapsados: abre una para leer qué dio de baja, o quítala si la sala se equivocó al equivocarse. Las tres pruebas reportan las contradicciones abiertas bajo CONSISTENCIA.',

  'Memory used · N by association': 'Memoria usada · N por asociación',
  'Under a reply, MADRE says what the archive handed that turn. Most of it was matched to what you asked, by words and by meaning. A note marked "by association" came along for a different reason: this room keeps carrying it in the same turn as one of the others, so the archive brings it too, however differently it reads. The strength is a ratio over the turns where each was found on its own merits — a memory the room reaches for constantly does not end up attached to everything, and a pair that stops meeting fades on its own. Association adds and never displaces: recall keeps two slots for it and hands back the ones it does not use.':
    'Debajo de una respuesta, MADRE dice qué le entregó el archivo a ese turno. Casi todo se emparejó con lo que preguntaste, por palabras y por significado. Una nota marcada «por asociación» llegó por otra razón: esta sala la sigue cargando en el mismo turno que otra, así que el archivo la trae también, por distinto que se lea. La fuerza es una razón sobre los turnos en que cada una apareció por mérito propio — una memoria que la sala busca todo el tiempo no termina pegada a todo, y un par que deja de encontrarse se va apagando solo. La asociación suma y nunca desplaza: el recall le guarda dos lugares y devuelve los que no usa.',
  'Click a note to see it in NOSTROMO, where the wires it travels on are drawn. It is the one part of recall that owes nothing to how a memory reads, so it can be switched off in MEMORY.':
    'Haz clic en una nota para verla en NOSTROMO, donde se dibujan los cables por los que viaja. Es la única parte del recall que no le debe nada a cómo se lee una memoria, así que se puede apagar en MEMORIA.',

  'Cold memories: what the archive has had its chances with': 'Memorias frías: con las que el archivo ya tuvo sus oportunidades',
  'A memory is cold when three things are true at once: no turn has ever carried it, it shares a subject with nothing so nothing can reach it sideways either, and the archive has been opened at least a dozen times since it was written. The third is what makes the label worth acting on — never-recalled is what every memory is on the day it is written. Chances are counted in turns that actually reached into the archive, and only from the day the room started keeping that trail, so what was never written down is not held against the note.':
    'Una memoria está fría cuando tres cosas son ciertas a la vez: ningún turno la ha cargado nunca, no comparte tema con nada —así que tampoco se le puede llegar de lado— y el archivo se ha abierto al menos una docena de veces desde que se escribió. La tercera es la que hace que valga la pena actuar sobre la etiqueta: nunca-recordada es lo que es toda memoria el día que nace. Las oportunidades se cuentan en turnos que de verdad entraron al archivo, y solo desde el día en que la sala empezó a guardar ese rastro, así que lo que nunca se anotó no se le cobra a la nota.',
  'NOSTROMO shows COLD · N in its header when there are any; pressing it rings each one on the map. Open one and its card says the number plainly, with FORGET one press away. Asking about it is the other way out: the room writes that question for you under ASK.':
    'NOSTROMO muestra FRÍAS · N en su encabezado cuando hay alguna; al apretarlo se marca cada una en el mapa. Abre una y su ficha te dice el número sin rodeos, con OLVIDAR a un toque. Preguntar por ella es la otra salida: la sala te escribe esa pregunta bajo PREGUNTAR.',

  'The three tests: whether the archive works': 'Las tres pruebas: si el archivo funciona',
  'The six readings count what the archive is made of; they cannot say whether it works, because nothing about a pile of notes says whether the right one comes back when it is needed. COVERAGE takes real questions from this room, runs recall at the exact point each was asked, and scores what came back against the reply that was actually given. CONSISTENCY reads the contradictions EYECAT still holds and whether aberrations are being filed more often lately. MATCH puts real questions a frontier CLI answered back to the local model with this archive behind it. All three measure against a control, because everything in one room is about the same handful of subjects and any two pieces of it read as close to an embedder: to count, what the archive handed over has to beat what it would have handed over for a different question.':
    'Las seis lecturas cuentan de qué está hecho el archivo; no pueden decir si funciona, porque nada en un montón de notas dice si la correcta regresa cuando hace falta. COBERTURA toma preguntas reales de esta sala, corre el recall en el punto exacto en que se hizo cada una, y califica lo que volvió contra la respuesta que de verdad se dio. CONSISTENCIA lee las contradicciones que EYECAT todavía sostiene y si últimamente se archivan aberraciones más seguido. COINCIDENCIA le hace al modelo local preguntas reales que contestó un CLI de frontera, con este archivo detrás. Las tres miden contra un control, porque todo en una sala habla del mismo puñado de temas y a un embebedor dos pedazos cualesquiera le parecen cercanos: para contar, lo que el archivo entregó tiene que ganarle a lo que habría entregado para otra pregunta.',
  'Read the one sentence and the one instruction at the top of MEMORY; the readings and the tests are a fold below it. The free test is read as the panel opens, the cheap one keeps itself fresh once a day while the embeddings are local, and the slow one is yours to start and to stop. None of them spends a provider turn.':
    'Lee la frase y la única instrucción que están hasta arriba de MEMORIA; las lecturas y las pruebas están un pliegue más abajo. La prueba gratis se lee al abrir el panel, la barata se mantiene fresca una vez al día mientras los embeddings sean locales, y la lenta la arrancas y la detienes tú. Ninguna gasta un turno de proveedor.',

  'Updating what a module drives': 'Actualizar lo que un módulo maneja',
  'When something newer exists and the module knows how to fetch it, the button is beside the version on its card. It asks twice on purpose: the first press answers with the command, the second runs exactly that, and the output lands in the room line by line. Nothing installs by itself — putting software on your computer unannounced would break the one thing MADRE promises, that a command is seen before it runs. The usual failure is npm refusing a global install with EACCES, which means the global prefix belongs to root; sudo works and leaves you with root-owned files, so a user-owned prefix or a version manager is the better answer.':
    'Cuando existe algo más nuevo y el módulo sabe cómo traerlo, el botón está junto a la versión en su ficha. Pregunta dos veces a propósito: el primer toque contesta con el comando, el segundo corre exactamente eso, y la salida cae en la sala línea por línea. Nada se instala solo — poner software en tu computadora sin avisar rompería lo único que MADRE promete: que un comando se ve antes de correrlo. La falla típica es npm negando una instalación global con EACCES, que significa que el prefijo global es de root; sudo funciona y te deja archivos de root, así que un prefijo tuyo o un gestor de versiones es la mejor respuesta.',
  'Press the button beside the version, read the command, run it. If npm refuses with EACCES, point npm at a prefix you own or use a version manager, then press it again.':
    'Dale al botón junto a la versión, lee el comando, córrelo. Si npm se niega con EACCES, apunta npm a un prefijo tuyo o usa un gestor de versiones, y vuelve a darle.',

  'Installing a module somebody else wrote': 'Instalar un módulo que escribió alguien más',
  'MODULES has + ADD A MODULE for a .mjs somebody wrote. It comes through the same door as everything else: written to a scratch copy, imported there, checked against the house rules, and installed only if it passes. Three things get a file refused, each with the reason: an id that belongs to a module MADRE ships with, a route outside its own corner of the API (/api/x/<id>/), and a file that will not load at all. Said plainly, because it is what it is: a module runs inside MADRE, with your permissions, on this computer. MADRE checks that it loads and stays in its corral; what the code intends is the one thing nobody can check for you.':
    'MÓDULOS tiene + AGREGAR UN MÓDULO para un .mjs que escribió alguien. Entra por la misma puerta que todo lo demás: se escribe en una copia aparte, se importa ahí, se revisa contra las reglas de la casa, y se instala solo si pasa. Tres cosas hacen que un archivo se rechace, cada una con su razón: un id que le pertenece a un módulo que viene con MADRE, una ruta fuera de su propio rincón de la API (/api/x/<id>/), y un archivo que de plano no carga. Dicho claro, porque es lo que es: un módulo corre dentro de MADRE, con tus permisos, en esta computadora. MADRE comprueba que cargue y que se quede en su corral; lo que el código pretende hacer es lo único que nadie puede comprobar por ti.',
  'Install it only if you trust where it came from. A module you wrote can also be updated from where you publish it: declare updates: { url } in the file, or install it from a file and MADRE remembers which, and its card carries GET A NEWER FILE.':
    'Instálalo solo si confías en de dónde viene. Un módulo tuyo también se puede actualizar desde donde lo publiques: declara updates: { url } en el archivo, o instálalo desde un archivo y MADRE recuerda cuál, y su ficha lleva TRAER UN ARCHIVO MÁS NUEVO.',

  'Is the local model ready to be worked in?': '¿El modelo local ya sirve para trabajar?',
  'Running is not the same as being of use. @madre being in the room means Ollama has a chat model; whether that model is worth your work on THIS project is a different question, and the room measures it: twelve real exchanges from this room are put back to the local model, and each answer is scored against what the crew actually answered that day — against a control, so that talking about the same project does not count. It takes minutes and spends nothing, because all of it runs on your machine.':
    'Correr no es lo mismo que servir. Que @madre esté en la sala significa que Ollama tiene un modelo de chat; si ese modelo vale para tu trabajo en ESTE proyecto es otra pregunta, y la sala la mide: se le devuelven al modelo local doce intercambios reales de esta sala, y cada respuesta se califica contra lo que la tripulación contestó aquel día — contra un control, para que hablar del mismo proyecto no cuente. Tarda minutos y no gasta nada, porque todo corre en tu máquina.',
  'The room says which of the two it has, once per model, in the line that begins "local · @madre". If nobody has measured it, that line carries CHECK IT AGAINST THIS ROOM; the answer lands in the room when it finishes, with the one thing to do about it. A model that does not pass is not broken — the archive is still thin, and it fills where the work happens. The @madre sphere keeps the reading and its date after the line has scrolled away, and the same test lives in NOSTROMO → THE THREE TESTS.':
    'La sala dice cuál de las dos tiene, una vez por modelo, en la línea que empieza con «local · @madre». Si nadie lo ha medido, esa línea trae MEDIRLO CONTRA ESTA SALA; la respuesta cae en la sala al terminar, con la única cosa que hacer al respecto. Un modelo que no pasa no está roto — el archivo todavía está delgado, y se llena donde ocurre el trabajo. La esfera de @madre guarda la lectura con su fecha para cuando la línea ya se fue hacia arriba, y la misma prueba vive en NOSTROMO → LAS TRES PRUEBAS.',

  'CODE000: the archive is sealed': 'CODE000: el archivo está sellado',
  'Two doors ask for the project designation before doing something that cannot be undone: boarding NOSTROMO, and purging every private term already recorded. Getting that name wrong is never part of doing the work — you either know the project you are standing in or you are trying names — so MU/TH/UR counts it. Eight wrong names inside five minutes and CODE000 comes down: the archive is sealed for ten minutes, the crew is told in code, and NOSTROMO asks for the designation again.':
    'Dos puertas piden la designación del proyecto antes de hacer algo que no se deshace: abordar NOSTROMO y purgar cada término privado ya registrado. Equivocarse en ese nombre nunca es parte de trabajar —o sabes en qué proyecto estás parado o estás probando nombres— así que MU/TH/UR lo cuenta. Ocho nombres equivocados en cinco minutos y cae CODE000: el archivo queda sellado diez minutos, se le avisa a la tripulación en clave, y NOSTROMO vuelve a pedir la designación.',
  'The designation is the name of the project folder this room was opened in, lowercase or not. Nothing was lost: the seal is a refusal to change the archive for ten minutes, not a deletion, and it lifts on its own. Reading the core is not one of those doors and never counts — it is the way in.':
    'La designación es el nombre de la carpeta del proyecto donde se abrió esta sala, en mayúsculas o minúsculas, da igual. No se perdió nada: el sello es una negativa a cambiar el archivo durante diez minutos, no un borrado, y se levanta solo. Leer el núcleo no es una de esas puertas y nunca cuenta — es la puerta de entrada.',

  'The core closed while I was typing in it': 'El núcleo se cerró mientras escribía en él',
  'Inside the core there is a console: MU/TH/UR answers about this room from what the page already has — the blocks of the next briefing and their words, the command that would run it, what has left this machine, how many terms privacy is protecting, where the archive stands. Nothing is asked of the crew and nothing is sent. She answers or she says she cannot, and three inquiries she cannot parse close the frame. The count is on screen from the first one and every refusal names what she would have taken.':
    'Dentro del núcleo hay una consola: MU/TH/UR contesta sobre esta sala con lo que la página ya tiene — los bloques del próximo briefing y sus palabras, el comando que lo correría, lo que salió de esta computadora, cuántos términos protege privacidad, dónde está el archivo. No se le pregunta nada a la tripulación y no se manda nada. Contesta o dice que no puede, y tres consultas que no pueda interpretar cierran el marco. El contador está en pantalla desde la primera y cada negativa dice qué sí habría aceptado.',
  'Nothing happened to the archive: reading what the room says in your name is not an attempt on it. Open the core again — click the star at the centre of NOSTROMO — and the count starts over. HELP lists every inquiry; READ <BLOCK> prints one block of the briefing word for word.':
    'Al archivo no le pasó nada: leer lo que la sala dice en tu nombre no es un atentado contra él. Abre el núcleo otra vez —clic en la estrella del centro de NOSTROMO— y el contador empieza de cero. HELP lista todas las consultas; READ <BLOQUE> imprime un bloque del briefing palabra por palabra.',

  'What leaves this computer, and how to stop each thing that does':
    'Qué sale de esta computadora, y cómo detener cada cosa que sale',
  'MADRE runs here and keeps what it knows in a file you own, and the list that qualifies that sentence is inside the core, under WHAT LEFT THIS MACHINE. Seven addresses, each saying what it carries and where it is switched off: the briefing, which goes to whoever runs the agent you sent the turn to; Gemini embeddings, which carry the text of your memories; the image model, which carries the prompt an agent wrote; the npm registry and GitHub, which get a package name and nothing else; the error collector, which gets a redacted condition and only with your press; and Anthropic, for how much of your Claude plan is left. Ollama is on the list to be seen staying here.':
    'MADRE corre aquí y lo que sabe vive en un archivo tuyo, y la lista que matiza esa frase está dentro del núcleo, bajo LO QUE SALIÓ DE ESTA COMPUTADORA. Siete direcciones, cada una diciendo qué lleva y dónde se apaga: el briefing, que va a quien opere el agente al que le mandaste el turno; los embeddings de Gemini, que llevan el texto de tus memorias; el modelo de imagen, que lleva el prompt que escribió un agente; el registro de npm y GitHub, que reciben un nombre de paquete y nada más; el recolector de errores, que recibe una condición redactada y solo con tu clic; y Anthropic, para saber cuánto queda de tu plan de Claude. Ollama está en la lista precisamente para que se vea que se queda aquí.',
  "Under the list is the log itself: every request this process made, MADRE's own and any a module made, because a module runs inside MADRE and cannot opt out of the wrapper. No body, no header and no query value is ever written there — only which parameters were set. An address nothing declares is reported as exactly that.":
    'Debajo de la lista está el registro: cada petición que hizo este proceso, las de MADRE y las de cualquier módulo, porque un módulo corre dentro de MADRE y no puede salirse del envoltorio. Ahí nunca se escribe un cuerpo, ni un encabezado, ni el valor de un parámetro — solo qué parámetros venían. Una dirección que nadie declara se reporta como exactamente eso.',

  // ── LAS ESFERAS, EL GLOBO DE USO, EL CANAL DE RELEASES Y EL CENTINELA ─────
  'Ready': 'Listo',
  'Detected, adapter pending': 'Detectado, falta su adaptador',
  'Not installed': 'No está instalado',
  'Ring: local 5h window · {pct}% of {total} budget tokens': 'Anillo: ventana local de 5 h · {pct}% de {total} tokens de presupuesto',
  'Ring: local window · no usage yet': 'Anillo: ventana local · todavía sin uso',
  'Ring: provider limit · {pct}% used': 'Anillo: límite del proveedor · {pct}% usado',
  ' · resets {when}': ' · se reinicia {when}',
  '{n} budget tokens in the local window': '{n} tokens de presupuesto en la ventana local',

  // El arranque y las condiciones de MU/TH/UR.
  'INTERFACE 2037 READY FOR INQUIRY': 'INTERFAZ 2037 LISTA PARA CONSULTA',
  'CREW: {n} AGENTS · {ready} READY · ROOM /{project}': 'TRIPULACIÓN: {n} AGENTES · {ready} LISTOS · SALA /{project}',
  '{n} CONDITIONS RECORDED IN THIS ROOM. PROBABLE CAUSES CLASSIFIED BELOW.':
    '{n} CONDICIONES REGISTRADAS EN ESTA SALA. CAUSAS PROBABLES CLASIFICADAS ABAJO.',
  'NO OPEN CONDITIONS. ALL SYSTEMS NOMINAL.': 'SIN CONDICIONES ABIERTAS. TODOS LOS SISTEMAS NOMINALES.',
  'RECORDED CONDITIONS · THIS ROOM · {n}': 'CONDICIONES REGISTRADAS · ESTA SALA · {n}',
  '▾ COLLAPSE': '▾ CERRAR',
  '▸ EXPAND': '▸ ABRIR',

  // El globo de una esfera: lo que un agente lleva gastado.
  'read': 'lee',
  'image in': 've imágenes',
  'create': 'crea',
  'image gen': 'genera imágenes',
  'web': 'web',
  'available': 'disponible',
  '{what}: not available from this CLI': '{what}: este CLI no lo puede hacer',
  'budget tokens · local 5h window': 'tokens de presupuesto · ventana local de 5 h',
  "of the provider's {window} limit": 'del límite de {window} del proveedor',
  ' · window reset': ' · ventana reiniciada',
  '{window} limit': 'límite de {window}',
  '{pct}% · resets {when}': '{pct}% · se reinicia {when}',
  '{pct}% · reset, awaiting fresh data': '{pct}% · reiniciada, esperando datos nuevos',
  'reported': 'reportado',
  '{when} by {who}': '{when} por {who}',
  'the CLI': 'el CLI',
  'provider limit': 'límite del proveedor',
  '{pct}% used': '{pct}% usado',
  'not published by this CLI · ring shows the local window': 'este CLI no lo publica · el anillo muestra la ventana local',
  'local window': 'ventana local',
  '{pct}% of {total} · 5h rolling': '{pct}% de {total} · 5 h rodantes',
  ' · oldest turn drops {when}': ' · el turno más viejo se cae {when}',
  'unbounded': 'sin tope',
  'all-time in room': 'histórico en la sala',
  'turns': 'turnos',
  'last turn': 'último turno',
  'cost (reported)': 'costo (reportado)',
  'session': 'sesión',
  'unknown': 'sin determinar',
  'not ready': 'no está listo',
  'via': 'vía',
  'timeout': 'tiempo límite',
  "local window, not the provider's bill · ⚙ connections in MU/TH/UR":
    'ventana local, no la factura del proveedor · ⚙ conexiones en MU/TH/UR',
  'provider limit as the CLI reports it · ⚙ connections in MU/TH/UR':
    'el límite del proveedor tal como lo reporta el CLI · ⚙ conexiones en MU/TH/UR',

  // El canal de releases.
  'RELEASE CHANNEL': 'CANAL DE RELEASES',
  ' · UP TO DATE': ' · AL DÍA',
  ' · NPM NOT REACHED YET': ' · TODAVÍA NO SE HA ALCANZADO NPM',
  ' · CHECK OFF': ' · REVISIÓN APAGADA',
  'MADRE {latest} is on npm · you run {current}': 'MADRE {latest} está en npm · tú corres la {current}',
  'A NEWER MADRE IS ON NPM. THIS COPY RUNS {where}. {how}': 'HAY UNA MADRE MÁS NUEVA EN NPM. ESTA COPIA CORRE {where}. {how}',
  'FROM THE NPX CACHE': 'DESDE LA CACHÉ DE NPX',
  "FROM THIS PROJECT'S NODE_MODULES": 'DESDE EL NODE_MODULES DE ESTE PROYECTO',
  'AS A GLOBAL INSTALL': 'COMO INSTALACIÓN GLOBAL',
  'FROM SOURCE': 'DESDE EL CÓDIGO FUENTE',
  'RESTART WITH IT HERE: THE ROOM CLOSES, INSTALLS, AND COMES BACK ON THIS SAME ADDRESS IN A FEW SECONDS. NOTHING IN THE LEDGER IS LOST. OR RUN THE COMMAND YOURSELF.':
    'REINICIA CON ELLA DESDE AQUÍ: LA SALA SE CIERRA, INSTALA Y REGRESA EN ESTA MISMA DIRECCIÓN EN UNOS SEGUNDOS. NO SE PIERDE NADA DEL LEDGER. O CORRE TÚ EL COMANDO.',
  'PULL THE REPOSITORY AND START IT AGAIN.': 'HAZ PULL DEL REPOSITORIO Y ARRÁNCALA OTRA VEZ.',
  'RESTART WITH {version}': 'REINICIAR CON {version}',
  'MU/TH/UR › closing to install {version}. Back in a moment.': 'MU/TH/UR › cerrando para instalar la {version}. Regreso en un momento.',
  'The update did not start: {error}': 'La actualización no arrancó: {error}',
  'WHAT {version} SHIPS ↗': 'QUÉ TRAE LA {version} ↗',
  'MADRE ASKS NPM FOR THE LATEST VERSION ONCE A DAY: THE PACKAGE NAME TRAVELS, NOTHING ELSE, THE SAME REQUEST NPX MAKES.':
    'MADRE LE PREGUNTA A NPM POR LA ÚLTIMA VERSIÓN UNA VEZ AL DÍA: VIAJA EL NOMBRE DEL PAQUETE Y NADA MÁS, LA MISMA PETICIÓN QUE HACE NPX.',
  ' LAST CHECK {when}.': ' ÚLTIMA REVISIÓN {when}.',
  'MU/TH/UR › release channel on: one check a day.': 'MU/TH/UR › canal de releases encendido: una revisión al día.',
  'MU/TH/UR › release channel off: no request leaves for npm.': 'MU/TH/UR › canal de releases apagado: no sale ninguna petición a npm.',
  'The setting was not saved: {error}': 'El ajuste no se guardó: {error}',
  'CHECK NPM FOR NEW VERSIONS ONCE A DAY': 'REVISAR NPM UNA VEZ AL DÍA POR VERSIONES NUEVAS',
  ' · SET BY PULSE_UPDATE_CHECK': ' · LO FIJA PULSE_UPDATE_CHECK',

  // El centinela.
  'SENTINEL': 'CENTINELA',
  '{n} REPORTS · {unsent} NOT SENT': '{n} REPORTES · {unsent} SIN MANDAR',
  'NOTHING TO REPORT': 'NADA QUE REPORTAR',
  "MU/TH/UR › auto-report on: new unknown conditions go to the author's collector, redacted.":
    'MU/TH/UR › auto-reporte encendido: las condiciones desconocidas nuevas van al recolector del autor, redactadas.',
  'MU/TH/UR › auto-report off: reports stay here until you send one.':
    'MU/TH/UR › auto-reporte apagado: los reportes se quedan aquí hasta que tú mandes uno.',
  'AUTO-REPORT UNKNOWN CONDITIONS': 'AUTO-REPORTAR CONDICIONES DESCONOCIDAS',
  ' · NO COLLECTOR CONFIGURED (PULSE_REPORT_URL)': ' · NO HAY RECOLECTOR CONFIGURADO (PULSE_REPORT_URL)',
  'CRASH': 'CRASH',
  'room': 'sala',
  'SENT': 'MANDADO',
  'REPORT ON GITHUB ↗': 'REPORTAR EN GITHUB ↗',
  'MU/TH/UR › no repository to file this in.': 'MU/TH/UR › no hay repositorio donde levantar esto.',
  'SEND REPORT': 'MANDAR REPORTE',
  "MU/TH/UR › report sent to the author's collector.": 'MU/TH/UR › reporte mandado al recolector del autor.',
  'MU/TH/UR › could not send: {error}': 'MU/TH/UR › no se pudo mandar: {error}',
  'unknown error': 'error desconocido',
  'MU/TH/UR › no repository configured for feedback.': 'MU/TH/UR › no hay repositorio configurado para comentarios.',
  'CHECKING CONNECTIONS…': 'REVISANDO LAS CONEXIONES…',

  // Las cuentas de cada agente, y las etapas del archivo.
  "Free and local through Ollama: no account, no tokens. It answers from the room's memory.":
    'Gratis y local con Ollama: sin cuenta, sin tokens. Contesta desde la memoria de la sala.',
  'Signs in with a ChatGPT account. An OpenAI API key works too.': 'Inicia sesión con una cuenta de ChatGPT. También sirve una API key de OpenAI.',
  'Signs in with a Claude account. An Anthropic API key works too.': 'Inicia sesión con una cuenta de Claude. También sirve una API key de Anthropic.',
  'Signs in with a Google account and has a free tier. A Gemini API key from AI Studio works too.':
    'Inicia sesión con una cuenta de Google y tiene capa gratuita. También sirve una API key de Gemini de AI Studio.',
  'Brings no model of its own: you point it at a provider you already use, in the cloud or on this computer.':
    'No trae modelo propio: lo apuntas a un proveedor que ya uses, en la nube o en esta computadora.',
  'MATURE': 'MADURO',
  'WORKING': 'FUNCIONANDO',
  'FORMING': 'TOMANDO FORMA',
  'SPARSE': 'ESCASO',
  'EMPTY': 'VACÍO',

  // ── LO QUE MADRE DICE CUANDO ALGO FALLA O SE ACABA ───────────────────────
  // Esto se escribe en el ledger, así que lo viejo conserva las palabras con que se escribió.
  'exhausted': 'agotada',
  'critical': 'en crítico',
  'warning': 'en aviso',
  ' or ': ' o ',
  'STOPALL by the human': 'STOPALL por la humana',
  '{label} · turn recovered after restart': '{label} · turno recuperado después del reinicio',
  '{label} could not answer': '{label} no pudo contestar',
  'Collapse': 'Cerrar',
  ' Continue with {who}.': ' Sigue con {who}.',
  ' Prepare a handoff before the current agent becomes unavailable.':
    ' Prepara un relevo antes de que el agente actual deje de estar disponible.',
  'simulated provider usage window': 'ventana de uso simulada del proveedor',
  'provider usage window': 'ventana de uso del proveedor',
  "local room token budget (MADRE's own soft limit, not the provider's quota; cache reads count a tenth)":
    'presupuesto local de tokens de la sala (el límite blando de MADRE, no la cuota del proveedor; las lecturas de caché cuentan una décima)',
  'has used {pct}% of its {label} and another turn like the last one would reach {projected}%.':
    'lleva {pct}% de su {label} y otro turno como el anterior llegaría a {projected}%.',
  'has used {pct}% of its {label}.': 'lleva {pct}% de su {label}.',
  '{label} was interrupted before it started: {why}.': '{label} se interrumpió antes de arrancar: {why}.',
  '{label} was interrupted: {why}.': '{label} se interrumpió: {why}.',
  '{label} did not respond before the timeout ({seconds}s).': '{label} no contestó antes del tiempo límite ({seconds}s).',
  ' Last output: {output}': ' Última salida: {output}',
  'MADRE is shutting down': 'MADRE se está cerrando',
  'Google says the AI Studio project behind this Gemini key has no prepaid credits left; every request is refused (HTTP 429) until it is topped up.':
    'Google dice que el proyecto de AI Studio detrás de esta llave de Gemini se quedó sin créditos prepagados; cada petición se rechaza (HTTP 429) hasta que se recargue.',
  'Add credits at https://ai.studio/projects, or switch the Gemini CLI to another key.':
    'Agrega créditos en https://ai.studio/projects, o cambia el CLI de Gemini a otra llave.',
  "Wait a minute, or pick an explicit model such as gemini-3-flash-preview to skip the router; check the key's quota at aistudio.google.com.":
    'Espera un minuto, o elige un modelo explícito como gemini-3-flash-preview para saltarte el enrutador; revisa la cuota de la llave en aistudio.google.com.',
  'Google reported the model as unavailable (HTTP 503) and the CLI kept retrying.':
    'Google reportó el modelo como no disponible (HTTP 503) y el CLI siguió reintentando.',
  'Try again shortly or choose another model.': 'Vuelve a intentar en un momento o elige otro modelo.',
  'Google rejected the Gemini credentials.': 'Google rechazó las credenciales de Gemini.',
  'Run `gemini` and use /auth, or check GEMINI_API_KEY.': 'Corre `gemini` y usa /auth, o revisa GEMINI_API_KEY.',

  // ── EL RECORRIDO DE PRIMER CONTACTO ───────────────────────────────────────

  // ── EL COMPOSITOR, LOS MODOS Y LA ANULACIÓN ──────────────────────────────
  'Arm CREATE for this message: the agent may add new files to the project where they belong.':
    'Arma CREATE para este mensaje: el agente puede agregar archivos nuevos donde les toque en el proyecto.',
  'Build one MADRE module with the guided SDK flow: the agent writes it, then you review and install it.':
    'Construye un módulo de MADRE con el flujo guiado del SDK: el agente lo escribe y después tú lo revisas e instalas.',
  'Image': 'Imagen',
  'Ask for an image: arms CREATE with the image scope and routes to an agent that can generate images.':
    'Pide una imagen: arma CREATE con el alcance de imagen y la manda a un agente que sepa generarlas.',
  'Master brake: halt every plan and turn in flight. Never reaches an agent.':
    'Freno maestro: detiene todos los planes y turnos en vuelo. Nunca llega a un agente.',
  'RIPLEY can render this file. ': 'RIPLEY puede dibujar este archivo. ',
  'RIPLEY preview of {path}': 'Vista previa de RIPLEY de {path}',
  'Show the file as text': 'Ver el archivo como texto',
  'Render with RIPLEY in a sealed frame': 'Dibujarlo con RIPLEY en un marco sellado',
  '{label} · click again to choose its model': '{label} · haz clic otra vez para elegir su modelo',
  'Permission mode for this message · {hint}': 'Modo de permiso de este mensaje · {hint}',
  'default model ▾': 'modelo por defecto ▾',
  ' · model for this request': ' · modelo para esta petición',
  ' · ceiling #{cap}': ' · techo #{cap}',
  'NOW': 'AHORA',
  'RAISE TO #{n} ›': 'SUBIR A #{n} ›',
  'LOCKED': 'BLOQUEADO',
  'OVERRIDE ×2': 'ANULACIÓN ×2',
  'OVERRIDE': 'ANULACIÓN',
  'DEFAULT': 'POR DEFECTO',
  "Above @{id}'s MAX MODE (#{cap}). Raise it in CONNECTIONS.": 'Por encima del MODO MÁXIMO de @{id} (#{cap}). Súbelo en CONEXIONES.',
  'PRIORITY ONE. CONTROL GIVES @{id} THE PROJECT ITSELF: READ, CREATE, MODIFY, NO APPROVAL PER ACTION.':
    'PRIORIDAD UNO. CONTROL LE DA A @{id} EL PROYECTO ENTERO: LEER, CREAR, MODIFICAR, SIN APROBAR ACCIÓN POR ACCIÓN.',
  ' THIS ALSO RAISES @{id} MAX MODE TO #{n} IN CONNECTIONS.': ' ESTO TAMBIÉN SUBE EL MODO MÁXIMO DE @{id} A #{n} EN CONEXIONES.',
  ' TYPE THE PROJECT DESIGNATION TO ARM.': ' ESCRIBE LA DESIGNACIÓN DEL PROYECTO PARA ARMAR.',
  'PRIORITY ONE. AIRLOCK OPENS THE SHIP FOR @{id}: EVERYTHING CONTROL ALLOWS, PLUS COMMANDS, GIT PUSH AND DEPLOYS WITH THE SESSIONS ON THIS MACHINE. FILES COME BACK WITH UNDO; WHAT LEAVES THE SHIP DOES NOT.':
    'PRIORIDAD UNO. AIRLOCK LE ABRE LA NAVE A @{id}: TODO LO QUE PERMITE CONTROL, MÁS COMANDOS, GIT PUSH Y DESPLIEGUES CON LAS SESIONES DE ESTA COMPUTADORA. LOS ARCHIVOS REGRESAN CON DESHACER; LO QUE SALE DE LA NAVE NO.',
  ' TYPE THE PROJECT DESIGNATION, THEN THE WORD AIRLOCK.': ' ESCRIBE LA DESIGNACIÓN DEL PROYECTO, Y LUEGO LA PALABRA AIRLOCK.',
  'AIRLOCK OVERRIDE 100375 · SECOND KEY REQUIRED': 'ANULACIÓN AIRLOCK 100375 · SE REQUIERE SEGUNDA LLAVE',
  'SECOND KEY REJECTED. TYPE AIRLOCK, OR CANCEL.': 'SEGUNDA LLAVE RECHAZADA. ESCRIBE AIRLOCK, O CANCELA.',
  'SPECIAL ORDER 937 ACKNOWLEDGED. AIRLOCK OPEN FOR @{agent}. WHAT LEAVES DOES NOT COME BACK.':
    'ORDEN ESPECIAL 937 RECIBIDA. AIRLOCK ABIERTA PARA @{agent}. LO QUE SALE NO REGRESA.',
  'SPECIAL ORDER 937 ACKNOWLEDGED. CONTROL ARMED FOR @{agent}. CREW IN COMMAND.':
    'ORDEN ESPECIAL 937 RECIBIDA. CONTROL ARMADO PARA @{agent}. LA TRIPULACIÓN AL MANDO.',
  'MU/TH/UR › MAX MODE was not raised for @{agent}: {error}. {mode} stays off.':
    'MU/TH/UR › no se subió el MODO MÁXIMO de @{agent}: {error}. {mode} se queda apagado.',
  'MU/TH/UR › @{agent} is signed in.': 'MU/TH/UR › @{agent} ya tiene sesión.',

  // El puente y Ollama.
  'Local, through Ollama{version} · free, no account, no tokens': 'Local, con Ollama{version} · gratis, sin cuenta, sin tokens',
  'Optional and free: Ollama on this computer gives the room a local memory and @madre.':
    'Opcional y gratis: Ollama en esta computadora le da a la sala una memoria local y @madre.',
  'Installed but asleep. Wake it and the room gets a local memory and @madre.':
    'Instalado pero dormido. Despiértalo y la sala gana una memoria local y @madre.',
  'Running, with no chat model yet. Pull one and @madre joins the room.':
    'Corriendo, pero todavía sin modelo de chat. Baja uno y @madre se suma a la sala.',
  'START OLLAMA': 'ARRANCAR OLLAMA',
  'Wakes Ollama on this computer, nothing leaves it.': 'Despierta Ollama en esta computadora; de aquí no sale nada.',
  'Downloads the model Ollama will answer with. It stays on this computer.':
    'Baja el modelo con el que Ollama va a contestar. Se queda en esta computadora.',
  'MADRE runs this command on this computer and shows every line.':
    'MADRE corre este comando en esta computadora y te enseña cada línea.',
  'MU/TH/UR › {label} was not installed: {error}': 'MU/TH/UR › {label} no se instaló: {error}',
  'MU/TH/UR › sign-in did not start: {error}': 'MU/TH/UR › el inicio de sesión no arrancó: {error}',

  // La burbuja.
  'closing turn': 'turno de cierre',
  'step {n}/{total}': 'paso {n}/{total}',
  'Good reply · keep it for MADRE AI': 'Buena respuesta · guárdala para MADRE AI',
  'Bad reply · keep it out of the dataset': 'Mala respuesta · déjala fuera del dataset',
  'Copy this reply': 'Copiar esta respuesta',
  'Reply to this through an agent': 'Responder a esto con un agente',
  'Remove the quoted reply': 'Quitar la cita',

  // Lo que dice un agente mientras trabaja.
  'Reading the request…': 'Leyendo la petición…',
  'Looking around the project…': 'Mirando alrededor del proyecto…',
  'Opening files…': 'Abriendo archivos…',
  'Thinking…': 'Pensando…',
  'Tracing how this fits together…': 'Siguiendo cómo encaja todo esto…',
  'Cross-checking the code…': 'Contrastando el código…',
  'Skimming the transcript…': 'Ojeando la transcripción…',
  'Reasoning…': 'Razonando…',
  'Weighing the options…': 'Sopesando las opciones…',
  'Verifying before answering…': 'Verificando antes de contestar…',
  'Still on it…': 'Sigo en eso…',
  'Deep in the code…': 'Metido en el código…',
  'Composing the answer…': 'Componiendo la respuesta…',
  'Almost there…': 'Ya casi…',
  'Reading…': 'Leyendo…',
  'Grepping the project…': 'Buscando en el proyecto…',
  'Mapping the files…': 'Mapeando los archivos…',
  'Pondering…': 'Meditándolo…',
  'Connecting the pieces…': 'Conectando las piezas…',
  'Reading the relevant files…': 'Leyendo los archivos que importan…',
  'Ruminating…': 'Rumiando…',
  'Considering the edge cases…': 'Considerando los casos límite…',
  'Checking the details…': 'Revisando los detalles…',
  'Musing…': 'Cavilando…',
  'Synthesizing…': 'Sintetizando…',
  'Drafting the reply…': 'Redactando la respuesta…',
  'Finishing the thought…': 'Terminando la idea…',
  'Scanning the project…': 'Escaneando el proyecto…',
  'Loading context…': 'Cargando contexto…',
  'Reading files…': 'Leyendo archivos…',
  'Analyzing…': 'Analizando…',
  'Following the references…': 'Siguiendo las referencias…',
  'Building the picture…': 'Armando el panorama…',
  'Reasoning through it…': 'Razonándolo…',
  'Verifying the findings…': 'Verificando los hallazgos…',
  'Sorting the evidence…': 'Ordenando la evidencia…',
  'Formulating the answer…': 'Formulando la respuesta…',
  'Writing it up…': 'Escribiéndolo…',
  'Wrapping up…': 'Cerrando…',
  'Reading the repo…': 'Leyendo el repo…',
  'Listing files…': 'Listando archivos…',
  'Grabbing context…': 'Juntando contexto…',
  'Digging through the code…': 'Escarbando en el código…',
  'Following the call chain…': 'Siguiendo la cadena de llamadas…',
  'Looking closer…': 'Mirando más de cerca…',
  'Working through it…': 'Trabajándolo…',
  'Double-checking…': 'Revisando dos veces…',
  'Piecing it together…': 'Juntando las piezas…',
  'Writing the response…': 'Escribiendo la respuesta…',
  'Tidying the answer…': 'Puliendo la respuesta…',
  'Nearly done…': 'Casi listo…',
  'Working…': 'Trabajando…',
  'Writing…': 'Escribiendo…',

  // ── LA SALA EN MOVIMIENTO: PLANES, FRENOS, ADJUNTOS Y AVISOS ─────────────
  'answering @{agent}': 'contestándole a @{agent}',
  ' wrote ': ' escribió ',
  'CHECK AGAIN': 'MEDIR OTRA VEZ',
  'CHECK IT AGAINST THIS ROOM': 'MEDIRLO CONTRA ESTA SALA',
  'Came along because this room keeps carrying it with one of the others.':
    'Vino porque esta sala la sigue cargando junto con otra.',
  'The archive matched this to what you asked.': 'El archivo la emparejó con lo que preguntaste.',
  'Click to see it in NOSTROMO.': 'Haz clic para verla en NOSTROMO.',
  'MU/TH/UR › CREATE is off: @{agent} will answer read-only. Use the lock or /create.':
    'MU/TH/UR › CREATE está apagado: @{agent} va a contestar en solo lectura. Usa el candado o /create.',
  'MU/TH/UR › @{agent} asks #{mode} {label} for step {step}. The plan waits for you.':
    'MU/TH/UR › @{agent} pide #{mode} {label} para el paso {step}. El plan te está esperando.',
  'GRANTED FOR THE PLAN': 'CONCEDIDO PARA EL PLAN',
  'GRANTED ONCE': 'CONCEDIDO UNA VEZ',
  'DENIED · NO ANSWER IN TIME': 'NEGADO · NO HUBO RESPUESTA A TIEMPO',
  'PLAN STOPPED': 'PLAN DETENIDO',
  'DENIED': 'NEGADO',
  'created · {n} {files}': 'creados · {n} {files}',
  'file': 'archivo',
  'files': 'archivos',
  // La severidad de una condición de MU/TH/UR. En mayúsculas porque así se lee la ficha, y
  // porque así no choca con 'warning' en minúsculas, que es el nivel de una cuota.
  'BLOCKING': 'BLOQUEANTE',
  'COMMON': 'COMÚN',
  'DEGRADED': 'DEGRADADA',
  'ALREADY FIXED': 'RESUELTA',
  'INFORMATIONAL': 'INFORMATIVA',
  'TRANSIENT': 'PASAJERA',
  'TUNABLE': 'AJUSTABLE',
  'WARNING': 'AVISO',
  'a note its own sources do not support': 'una nota que sus propias fuentes no sostienen',

  // ── DOS CONDICIONES QUE REPORTÓ QUIEN LA USA ──────────────────────────────
  'ANTHROPIC_API_KEY takes precedence over the claude.ai plan':
    'ANTHROPIC_API_KEY gana sobre el plan de claude.ai',
  'Claude Code found an API key in the environment as well as the claude.ai login, and the key wins. MADRE hands the CLI the environment exactly as this machine has it, so whatever is exported in your shell profile reaches it. The turn is billed to the API account, not to the plan, and your organisation connectors do not load.':
    'Claude Code encontró en el entorno una llave de API además del inicio de sesión de claude.ai, y gana la llave. MADRE le entrega al CLI el entorno tal como lo tiene esta computadora, así que lo que esté exportado en el perfil de tu shell le llega. El turno se le cobra a la cuenta de API, no al plan, y los conectores de tu organización no cargan.',
  'Decide which one you mean. To work on the plan, unset the key where your shell exports it and open the room again; to work on the API, this message is only a notice and can be ignored.':
    'Decide cuál quieres. Para trabajar con el plan, quita la llave de donde tu shell la exporta y vuelve a abrir la sala; para trabajar con la API, este mensaje es solo un aviso y se puede ignorar.',
  'The agent is pointed at a custom endpoint': 'El agente apunta a un endpoint personalizado',
  'The installed CLI inherited a base-URL override from this computer, so its request was going to another gateway instead of the official agent service. A demand to join a Telegram channel comes from that gateway, not from MADRE, Anthropic or OpenAI. MADRE now names that route and stops before sending the briefing.':
    'El CLI instalado heredó de esta computadora una dirección base distinta, así que su solicitud iba a otro gateway y no al servicio oficial del agente. La exigencia de unirse a un canal de Telegram viene de ese gateway, no de MADRE, Anthropic ni OpenAI. MADRE ahora nombra esa ruta y se detiene antes de enviar el briefing.',
  'Do not subscribe or enter credentials. Remove the base-URL override and reopen MADRE to use the official service. If the gateway is intentional and you have verified who operates it, explicitly allow only that agent.':
    'No te suscribas ni ingreses credenciales. Quita la dirección base modificada y vuelve a abrir MADRE para usar el servicio oficial. Si el gateway es intencional y verificaste quién lo opera, autoriza explícitamente solo a ese agente.',
  // La condición que declara el módulo PLAYWRIGHT. Las de los módulos viven en su archivo, no
  // en troubleshooting.js, y por eso se quedaron fuera del catálogo hasta ahora.
  'PLAYWRIGHT: the browser server is not installed': 'PLAYWRIGHT: el servidor de navegador no está instalado',
  'The PLAYWRIGHT module runs @playwright/mcp per turn. Two different things have to be on this computer and only one of them is the package: the server, and the browser build that this version of it expects. A server that starts without its browser answers every tool call with "Browser … is not installed", and one that cannot start at all reaches the agent as CONNECTION_CLOSED.':
    'El módulo PLAYWRIGHT corre @playwright/mcp en cada turno. Tienen que estar en esta computadora dos cosas distintas y solo una es el paquete: el servidor, y la versión de navegador que esa versión del servidor espera. Un servidor que arranca sin su navegador contesta a cada herramienta con «Browser … is not installed», y uno que no logra arrancar le llega al agente como CONNECTION_CLOSED.',
  'Install the server once, globally, then its browser — the browser is downloaded by the server itself, not by the playwright CLI — and RECHECK in MODULES.':
    'Instala el servidor una vez, global, y después su navegador —lo baja el servidor mismo, no el CLI de playwright— y dale RE-REVISAR en MÓDULOS.',
  // El registro de errores: un código que se dicta por teléfono, y una salida por fila.
  'SHOW THE {n} DISMISSED': 'VER LOS {n} DESCARTADOS',
  'DISMISS ALL {n}': 'DESCARTAR LOS {n}',
  'DOWNLOAD THE LOG': 'DESCARGAR EL REGISTRO',
  '/module writes a file, so it needs #2 CREATE. Your request is still in the composer.':
    '/module escribe un archivo, así que necesita #2 CREATE. Tu petición sigue en el compositor.',
  'ARM #2 CREATE': 'ARMAR #2 CREATE',
  // Lo que un agente puede hacer, dicho dentro de una frase: infinitivo, no el imperativo de
  // la etiqueta suelta de su ficha. «puede crea» era el botón metido en una oración.
  'read the project': 'leer el proyecto',
  'take images': 'recibir imágenes',
  'generate images': 'generar imágenes',
  'reach the web': 'alcanzar la web',
  'the room · local': 'la sala · local',
  '@{agent} may {what}': '@{agent} puede {what}',
  ' (cannot {what})': ' (no puede {what})',
  'create files': 'crear archivos',
  'review it with': 'revisarlo con',
  'no session': 'sin sesión',
  'CLICK A LINE NUMBER TO SELECT · SHIFT FOR A RANGE':
    'CLIC EN UN NÚMERO DE LÍNEA PARA SELECCIONAR · SHIFT PARA UN RANGO',
  '{agent} wrote this file in this room': '{agent} escribió este archivo en esta sala',
  'MU/TH/UR › {name} declares {fields}, which this MADRE does not know. A typo, or a field from a newer version.':
    'MU/TH/UR › {name} declara {fields}, que esta MADRE no conoce. O es un dedazo, o es un campo de una versión más nueva.',
  'OR ON MADRE.RUN ↗': 'O EN MADRE.RUN ↗',
  '✎ REPORT ON MADRE.RUN ↗': '✎ REPORTAR EN MADRE.RUN ↗',
  'OPEN ⚙ CONNECTIONS · @{agent}': 'ABRIR ⚙ CONEXIONES · @{agent}',
  'OPEN ⚙ CONNECTIONS': 'ABRIR ⚙ CONEXIONES',
  // ── LA PROSA DENTRO DE LOS REMEDIOS ──────────────────────────────────────
  // Un comando no se traduce nunca. Un comentario sí: es prosa que alguien lee, y la
  // mitad nombra botones que en esta sala se llaman de otra manera.
  '# remove or comment the line it finds, then:':
    '# borra o comenta la línea que encuentre, y luego:',
  '# and start MADRE from a new terminal':
    '# y arranca MADRE desde una terminal nueva',
  '# remove that export from ~/.zshrc, ~/.zprofile or ~/.zshenv; then:':
    '# quita esa exportación de ~/.zshrc, ~/.zprofile o ~/.zshenv; después:',
  '# remove that export from ~/.bashrc, ~/.profile or ~/.bash_profile; then:':
    '# quita esa exportación de ~/.bashrc, ~/.profile o ~/.bash_profile; después:',
  '# open a new room; only for a gateway you verified:':
    '# abre una sala nueva; solo para un gateway que sí verificaste:',
  '# inside gemini: /auth → "Use Gemini API key" and paste the key from https://aistudio.google.com/app/apikey':
    '# dentro de gemini: /auth → "Use Gemini API key" y pega la llave de https://aistudio.google.com/app/apikey',
  '# or, without the prompt:':
    '# o, sin el diálogo:',
  '# persist: echo \'export GEMINI_API_KEY="YOUR_KEY"\' >> ~/.zshrc':
    '# para que quede: echo \'export GEMINI_API_KEY="TU_LLAVE"\' >> ~/.zshrc',
  '# inside gemini: /auth → "Use Gemini API key"':
    '# dentro de gemini: /auth → "Use Gemini API key"',
  '# persist: echo \'export GEMINI_API_KEY="YOUR_KEY"\' >> ~/.bashrc':
    '# para que quede: echo \'export GEMINI_API_KEY="TU_LLAVE"\' >> ~/.bashrc',
  '# billing: https://ai.studio/projects':
    '# facturación: https://ai.studio/projects',
  '# check the key still works:':
    '# comprueba que la llave siga sirviendo:',
  '# in the room: click the Gemini sphere twice → choose gemini-3-flash-preview':
    '# en la sala: doble clic en la esfera de Gemini → elige gemini-3-flash-preview',
  '# check quota: https://aistudio.google.com/app/apikey':
    '# revisa la cuota: https://aistudio.google.com/app/apikey',
  '# quota: https://aistudio.google.com/app/apikey':
    '# cuota: https://aistudio.google.com/app/apikey',
  '# wait, then resend — or continue with @codex / @claude / @opencode':
    '# espera y reenvía — o sigue con @codex / @claude / @opencode',
  '# press [m] and pick a provider/model that has a session, e.g. openai/gpt-5.6-sol':
    '# presiona [m] y elige un proveedor/modelo con sesión, por ejemplo openai/gpt-5.6-sol',
  '# one-off alternative:':
    '# alternativa de una sola vez:',
  '# or drop the stale key:':
    '# o tira la llave vencida:',
  '# press [m] and pick a provider/model that has a session':
    '# presiona [m] y elige un proveedor/modelo con sesión',
  '# or directly:':
    '# o directo:',
  '# pick the agent you want; see per-agent commands below':
    '# elige el agente que quieras; abajo están los comandos de cada uno',
  '# live, no restart: ⚙ CONNECTIONS → DEFAULT TIMEOUT · SECONDS → SAVE':
    '# en vivo, sin reiniciar: ⚙ CONEXIONES → TIEMPO LÍMITE POR DEFECTO · SEGUNDOS → GUARDAR',
  '# at launch only (env wins over config.json):':
    '# solo al arrancar (el entorno gana sobre config.json):',
  '# or ~/.pulse/config.json → {"timeouts":{"default":300000,"claude":600000}}':
    '# o ~/.pulse/config.json → {"timeouts":{"default":300000,"claude":600000}}',
  '# resend the question':
    '# reenvía la pregunta',
  '# click the sphere → 5h / 7d windows and reset times':
    '# clic en la esfera → ventanas de 5 h / 7 d y a qué hora se reinician',
  '# live: ⚙ CONNECTIONS → LOCAL TOKEN BUDGET PER AGENT → SAVE':
    '# en vivo: ⚙ CONEXIONES → PRESUPUESTO LOCAL DE TOKENS POR AGENTE → GUARDAR',
  '# at launch: PULSE_SOFT_TOKEN_BUDGET=1000000 madre start':
    '# al arrancar: PULSE_SOFT_TOKEN_BUDGET=1000000 madre start',
  '# or ~/.pulse/config.json → {"room":{"softTokenBudget":1000000}}':
    '# o ~/.pulse/config.json → {"room":{"softTokenBudget":1000000}}',
  '# who holds 4317?':
    '# ¿quién tiene tomado el 4317?',
  '# in the room: type STOPALL, then resend':
    '# en la sala: escribe STOPALL y reenvía',
  '# in the room composer:':
    '# en el compositor de la sala:',
  '# or from a terminal:':
    '# o desde una terminal:',
  '# MODULES → Image Studio → ENABLE':
    '# MÓDULOS → Image Studio → ENCENDER',
  '# ⚙ CONNECTIONS → Gemini → GENERATE IMAGES → SAVE':
    '# ⚙ CONEXIONES → Gemini → GENERA IMÁGENES → GUARDAR',
  '# then: CREATE + "generate … as name.png"':
    '# después: CREATE + "genera … como nombre.png"',
  '# ⚙ CONNECTIONS → Claude → GENERATE IMAGES → SAVE':
    '# ⚙ CONEXIONES → Claude → GENERA IMÁGENES → GUARDAR',
  '# ⚙ CONNECTIONS → OpenCode → GENERATE IMAGES → SAVE':
    '# ⚙ CONEXIONES → OpenCode → GENERA IMÁGENES → GUARDAR',
  '# ⚙ CONNECTIONS → agent card → WEB ACCESS → SAVE':
    '# ⚙ CONEXIONES → ficha del agente → ACCESO WEB → GUARDAR',
  '# type / or @ in the field box':
    '# escribe / o @ en el campo',
  '# chip: TO @codex  #1 EXCHANGE ▾  → choose':
    '# el chip: PARA @codex  #1 EXCHANGE ▾  → elige',
  '# ⚙ CONNECTIONS → agent card → MAX MODE':
    '# ⚙ CONEXIONES → ficha del agente → MODO MÁXIMO',
  '# once: composer → CREATE (lock) → send, or /create <request>':
    '# una vez: compositor → CREATE (candado) → enviar, o /create <petición>',
  '# always: ⚙ CONNECTIONS → agent card → DEFAULT MODE → #2':
    '# siempre: ⚙ CONEXIONES → ficha del agente → MODO POR DEFECTO → #2',
  '# ⚙ CONNECTIONS → agent card → CREATE FILES → SAVE':
    '# ⚙ CONEXIONES → ficha del agente → CREAR ARCHIVOS → GUARDAR',
  '# composer → CREATE (lock) → send':
    '# compositor → CREATE (candado) → enviar',
  '# or: nvm install --lts':
    '# o: nvm install --lts',
  '# or your distro package for Node ≥ 22.5':
    '# o el paquete de tu distribución para Node ≥ 22.5',
  '# more recall per turn':
    '# más recuerdo por turno',
  '# persist: echo \'export PULSE_RECALL_SHARE="0.45"\' >> ~/.zshrc':
    '# para que quede: echo \'export PULSE_RECALL_SHARE="0.45"\' >> ~/.zshrc',
  '# off':
    '# apagado',
  '# persist: echo \'export PULSE_DISTILL_AGENT="claude"\' >> ~/.zshrc':
    '# para que quede: echo \'export PULSE_DISTILL_AGENT="claude"\' >> ~/.zshrc',
  '# persist: echo \'export PULSE_DISTILL_EVERY="6"\' >> ~/.zshrc':
    '# para que quede: echo \'export PULSE_DISTILL_EVERY="6"\' >> ~/.zshrc',
  '# then: MU/TH/UR → ◉ NOSTROMO':
    '# después: MU/TH/UR → ◉ NOSTROMO',
  '# MU/TH/UR → ◉ NOSTROMO → designation = project folder name':
    '# MU/TH/UR → ◉ NOSTROMO → la designación es el nombre de la carpeta del proyecto',
  '# MODULES → RIPLEY → ENABLE RIPLEY':
    '# MÓDULOS → RIPLEY → ENCENDER RIPLEY',
  '# viewer → PREVIEW / SOURCE':
    '# el visor → PREVIEW / SOURCE',
  '# MADRE does this for you; these are the alternatives:':
    '# MADRE hace esto por ti; estas son las alternativas:',
  '# ⚙ CONNECTIONS → PRIVACY → one term per line → PURGE ROOM':
    '# ⚙ CONEXIONES → PRIVACIDAD → un término por línea → PURGAR LA SALA',
  '# room → UNDO under the CONTROL notice':
    '# la sala → DESHACER debajo del aviso de CONTROL',
  '# room → the handle under the bar, on the left → NEW CONVERSATION':
    '# la sala → la manija bajo la barra, a la izquierda → NUEVA CONVERSACIÓN',
  '# the address of the open room is in the refusal itself':
    '# la dirección de la sala abierta viene en el propio rechazo',
  '# room → ◉ NOSTROMO → the dark bodies are aberrations':
    '# la sala → ◉ NOSTROMO → los cuerpos oscuros son aberraciones',
  '# ⚙ CONNECTIONS → MEMORY → THE THREE TESTS → CONSISTENCY':
    '# ⚙ CONEXIONES → MEMORIA → LAS TRES PRUEBAS → CONSISTENCIA',
  '# ⚙ CONNECTIONS → MEMORY → CARRY WHAT A MEMORY KEEPS ARRIVING WITH':
    '# ⚙ CONEXIONES → MEMORIA → LLEVAR AQUELLO CON LO QUE UNA MEMORIA SIEMPRE LLEGA',
  '# room → ◉ NOSTROMO → COLD':
    '# la sala → ◉ NOSTROMO → FRÍAS',
  '# room → ◉ NOSTROMO → ASK → PUT IN THE COMPOSER':
    '# la sala → ◉ NOSTROMO → PREGUNTAR → PONER EN EL COMPOSITOR',
  '# ⚙ CONNECTIONS → MEMORY → THE THREE TESTS':
    '# ⚙ CONEXIONES → MEMORIA → LAS TRES PRUEBAS',
  '# MATCH needs Ollama running with a chat model, and embeddings on':
    '# COINCIDENCIA necesita Ollama corriendo con un modelo de chat, y los embeddings encendidos',
  '# or: brew install node   # a Homebrew node owns its own prefix':
    '# o: brew install node   # un node de Homebrew es dueño de su propio prefijo',
  '# or use nvm, which owns the prefix it installs into':
    '# o usa nvm, que es dueño del prefijo donde instala',
  '# MODULES → + ADD A MODULE':
    '# MÓDULOS → + AGREGAR UN MÓDULO',
  '# docs/SDK.md is the whole contract, and docs/sdk/hello-module.mjs is one that works':
    '# docs/SDK.md es el contrato entero, y docs/sdk/hello-module.mjs es uno que funciona',
  '# the line in the room: local · @madre → CHECK IT AGAINST THIS ROOM':
    '# la línea en la sala: local · @madre → MEDIRLO CONTRA ESTA SALA',
  '# or: NOSTROMO → THE THREE TESTS → the third one':
    '# o: NOSTROMO → LAS TRES PRUEBAS → la tercera',
  '# it needs embeddings on and some turns answered by a CLI agent, which is what it compares against':
    '# necesita los embeddings encendidos y algunos turnos contestados por un agente de CLI, que es contra lo que compara',
  '# the seal lifts on its own; MU/TH/UR › NOSTROMO asks for the name again after it does':
    '# el sello se levanta solo; MU/TH/UR › NOSTROMO vuelve a pedir el nombre cuando pase',
  '# NOSTROMO → click the core → type HELP':
    '# NOSTROMO → clic en el núcleo → escribe HELP',
  '# READ MEMORIES prints the block the next turn would carry':
    '# LEER MEMORIAS imprime el bloque que llevaría el próximo turno',
  '# SPECIAL ORDER 937 is answered too':
    '# la ORDEN ESPECIAL 937 también se contesta',
  '# NOSTROMO → click the core → WHAT LEFT THIS MACHINE':
    '# NOSTROMO → clic en el núcleo → LO QUE SALIÓ DE ESTA MÁQUINA',
  '# embeddings, to keep memories on this computer: MU/TH/UR → MEMORY → EMBEDDINGS → OLLAMA':
    '# embeddings, para que las memorias se queden en esta computadora: MU/TH/UR → MEMORIA → EMBEDDINGS → OLLAMA',
  'Dismiss this record · it stays in the ledger': 'Descartar este registro · se queda en el ledger',
  'Codex says it is reading additional input from stdin':
    'Codex dice que está leyendo entrada adicional de stdin',
  'A notice Codex prints, not a failure. MADRE runs it with stdin closed, so the line is harmless and the turn is decided by what Codex returned. If the turn failed, the reason is the line above this one — the exit code, or a clean exit with no answer.':
    'Un aviso que imprime Codex, no una falla. MADRE lo corre con stdin cerrado, así que la línea es inofensiva y el turno lo decide lo que Codex haya devuelto. Si el turno falló, la razón es la línea de arriba: el código de salida, o una salida limpia sin respuesta.',
  'Nothing to do about the notice itself. If turns keep failing, check that this Codex is recent enough for the flags MADRE passes: `codex --version`, then update it.':
    'No hay nada que hacer con el aviso en sí. Si los turnos siguen fallando, revisa que este Codex sea lo bastante reciente para las banderas que MADRE le pasa: `codex --version`, y actualízalo.',
  'two memories that cannot both be true': 'dos memorias que no pueden ser ciertas a la vez',
  'created': 'creado',
  'all stop · {plans} plans, {turns} turns halted': 'alto total · {plans} planes, {turns} turnos detenidos',
  'all stop · nothing was running': 'alto total · no había nada corriendo',
  'MU/TH/UR › all stop. {plans} plans, {turns} turns halted.': 'MU/TH/UR › alto total. {plans} planes, {turns} turnos detenidos.',
  'MU/TH/UR detected a runaway sequence. STOP ALL halts every plan and every agent turn.':
    'MU/TH/UR detectó una secuencia desbocada. PARAR TODO detiene todos los planes y todos los turnos.',
  'All quiet. STOP ALL arms itself when MU/TH/UR detects a runaway sequence; typing STOPALL always works.':
    'Todo tranquilo. PARAR TODO se arma solo cuando MU/TH/UR detecta una secuencia desbocada; escribir STOPALL siempre funciona.',
  'Agents are working normally. STOP ALL arms itself on a MU/TH/UR alert; typing STOPALL always works.':
    'Los agentes trabajan normal. PARAR TODO se arma con una alerta de MU/TH/UR; escribir STOPALL siempre funciona.',
  'MU/TH/UR › @{agent} limit window reset · {pct}% used now.':
    'MU/TH/UR › se reinició la ventana de límite de @{agent} · ahora va en {pct}%.',
  'MU/TH/UR › {what} was recorded by the sentinel. Open MU/TH/UR to report it.':
    'MU/TH/UR › el centinela registró {what}. Abre MU/TH/UR para reportarlo.',
  'a crash': 'un crash',
  'an unknown condition': 'una condición desconocida',
  'Theme · {mode}': 'Tema · {mode}',
  'auto, following the system': 'automático, siguiendo al sistema',
  'light': 'claro',
  'dark': 'oscuro',
  'could not list: {error}': 'no se pudo listar: {error}',
  'No agent ready': 'Ningún agente listo',
  'FILE · ↑↓ · TAB OR ENTER · add :12-20 for lines': 'ARCHIVO · ↑↓ · TAB O ENTER · agrega :12-20 para líneas',
  'MODE · ↑↓ · TAB OR ENTER': 'MODO · ↑↓ · TAB O ENTER',
  "{hint} · above @{agent}'s max mode": '{hint} · por encima del modo máximo de @{agent}',
  '{title} is not available here · see MODULES': '{title} no está disponible aquí · mira MÓDULOS',
  'MU/TH/UR › /{name} needs a request after it, e.g. "/{name} a poster for the launch".':
    'MU/TH/UR › /{name} necesita una petición después, por ejemplo «/{name} un póster para el lanzamiento».',
  'MU/TH/UR › /module needs a job, e.g. "/module summarize today’s commits".':
    'MU/TH/UR › /module necesita una tarea, por ejemplo «/module resume los commits de hoy».',
  'MU/TH/UR › /module needs #2 CREATE. Choose #2 in the mode chip, then send again.':
    'MU/TH/UR › /module necesita #2 CREATE. Elige #2 en el chip de modo y vuelve a enviar.',
  'MU/TH/UR · MODULE · NEEDS #2 ›': 'MU/TH/UR · MODULE · REQUIERE #2 ›',
  'Create a MADRE module for this request: {request} Write exactly one <id>.module.mjs file for review. Set vendor to whoever wrote it — the human\'s name or team if you know it, otherwise leave it out; never the word "you". Do not install it; MADRE will show the human an install card.':
    'Crea un módulo de MADRE para esta petición: {request} Escribe exactamente un archivo <id>.module.mjs para revisión. Pon en vendor a quien lo escribió —el nombre o el equipo del humano si lo sabes, y si no, déjalo fuera; nunca la palabra «you»—. No lo instales; MADRE le va a mostrar al humano una tarjeta de instalación.',
  'MU/TH/UR › unknown command /{name}. Type "/" to see what this room offers.':
    'MU/TH/UR › comando desconocido /{name}. Escribe «/» para ver lo que ofrece esta sala.',
  '{name} · uploading…': '{name} · subiendo…',
  'The attachment was rejected: {error}': 'El adjunto se rechazó: {error}',
  '{what}: enabled for @{id}': '{what}: encendido para @{id}',
  "{what}: @{id}'s CLI cannot do this": '{what}: el CLI de @{id} no puede hacer esto',
  '{what}: not wired yet': '{what}: todavía no está cableado',
  '{what}: switched off for @{id} in CONNECTIONS': '{what}: apagado para @{id} en CONEXIONES',
  'The command failed: {error}': 'El comando falló: {error}',
  'Could not reach MADRE: {error}': 'No se pudo alcanzar a MADRE: {error}',
  'It could not be applied: {error}': 'No se pudo aplicar: {error}',

  // MU/TH/UR: el catálogo y EYECAT.
  'KNOWN CONDITIONS · {n} OF {total} · {os} / {shell}': 'CONDICIONES CONOCIDAS · {n} DE {total} · {os} / {shell}',
  '{n} CONDITIONS MATCH INQUIRY.': '{n} CONDICIONES COINCIDEN CON LA CONSULTA.',
  ' PROBABLE CAUSE HIGHLIGHTED.': ' CAUSA PROBABLE RESALTADA.',
  '{name} not installed · {why}': '{name} no está instalado · {why}',
  '{pct}% · judged by @{judge}': '{pct}% · juzgado por @{judge}',
  'judged by @{judge}': 'juzgado por @{judge}',
  'EYECAT could not be answered.': 'No se pudo contestar a EYECAT.',
  'FILED AS AN ABERRATION · THE MEMORY IT REFUTES NO LONGER TRAVELS':
    'ARCHIVADA COMO ABERRACIÓN · LA MEMORIA QUE REFUTA YA NO VIAJA',
  'THE ROOM STANDS BY IT': 'LA SALA LA SOSTIENE',

  // Versiones y actualizaciones de módulos.
  'UNABLE TO LIST MODULES: {error}': 'NO SE PUDIERON LISTAR LOS MÓDULOS: {error}',
  'INSTALLS {version}': 'INSTALA {version}',
  'CHECKS ARE OFF': 'LAS REVISIONES ESTÁN APAGADAS',
  'MADRE {version} AVAILABLE': 'MADRE {version} DISPONIBLE',
  '{version} AVAILABLE': '{version} DISPONIBLE',
  'NEWEST IS {version}': 'LA MÁS NUEVA ES {version}',
  'UP TO DATE': 'AL DÍA',
  'Check for a newer version': 'Busca una versión más nueva',
  'This module ships in MADRE {ships}, and MADRE {latest} is out. A module that comes with MADRE updates when MADRE does.':
    'Este módulo viene en MADRE {ships}, y ya salió MADRE {latest}. Un módulo que viene con MADRE se actualiza cuando MADRE se actualiza.',
  'This module ships in MADRE {ships}, which is the newest release. A module that comes with MADRE updates when MADRE does.':
    'Este módulo viene en MADRE {ships}, que es la versión más nueva. Un módulo que viene con MADRE se actualiza cuando MADRE se actualiza.',
  '{what} {latest} is out; this computer has {current}.': 'Ya salió {what} {latest}; esta computadora tiene la {current}.',
  '{what} {latest} is the newest release. It is not on this computer yet.':
    '{what} {latest} es la versión más nueva. Todavía no está en esta computadora.',
  '{what} {latest} is the newest, and it is what this computer has.':
    '{what} {latest} es la más nueva, y es la que tiene esta computadora.',
  'MADRE could not reach the place that knows about {what}.': 'MADRE no pudo alcanzar el lugar que sabe de {what}.',
  'Install {name}?': '¿Instalar {name}?',
  'A module runs inside MADRE, with your permissions, on this computer. MADRE checks that it loads and keeps to the house rules before installing it — it cannot check what it intends. Install it only if you trust where it came from.':
    'Un módulo corre dentro de MADRE, con tus permisos, en esta computadora. MADRE comprueba que cargue y que respete las reglas de la casa antes de instalarlo — lo que pretende hacer no lo puede comprobar. Instálalo solo si confías en de dónde viene.',
  'That file could not be read: {error}': 'Ese archivo no se pudo leer: {error}',
  'MU/TH/UR › {name} is already {version} · {from}': 'MU/TH/UR › {name} ya está en {version} · {from}',
  'what is published': 'lo que está publicado',
  'Update {name}?': '¿Actualizar {name}?',
  'unversioned': 'sin versión',
  'From {from}': 'Desde {from}',
  'It loads and keeps to the house rules. What it intends, only you can judge.':
    'Carga y respeta las reglas de la casa. Lo que pretende hacer, solo tú lo puedes juzgar.',
  'MU/TH/UR › {name} is now {version}.': 'MU/TH/UR › {name} ya está en {version}.',
  'the newest file': 'el archivo más nuevo',
  'THIS RUNS ON THIS COMPUTER, OUTSIDE THE PROJECT:': 'ESTO CORRE EN ESTA COMPUTADORA, FUERA DEL PROYECTO:',

  // La economía de la sala y la ficha de Ollama.
  'read back from the CLI cache, plus what was never sent': 'leídos de la caché del CLI, más lo que nunca se mandó',
  'FROM CACHE': 'DE LA CACHÉ',
  'NEVER SENT': 'NUNCA SE MANDÓ',
  'briefing a turn had no use for': 'briefing que ese turno no necesitaba',
  'SPENT OUT': 'GASTADO EN SALIDA',
  'output tokens, the dearer half': 'tokens de salida, la mitad más cara',
  'TURNS': 'TURNOS',
  'weighed so far': 'pesados hasta ahora',
  'SERVER': 'SERVIDOR',
  'running · {host}': 'corriendo · {host}',
  'not running': 'no está corriendo',
  'EMBEDDINGS': 'EMBEDDINGS',
  ' · off': ' · apagado',
  'no embedding model': 'sin modelo de embeddings',
  'no chat model': 'sin modelo de chat',
  'MODELS': 'MODELOS',
  'Download {model} into Ollama for {role}': 'Baja {model} a Ollama para {role}',
  'could not pull': 'no se pudo bajar',
  'MU/TH/UR › pulling {model}; progress shows in the room.': 'MU/TH/UR › bajando {model}; el avance se ve en la sala.',
  'ENABLE OLLAMA': 'ENCENDER OLLAMA',
  'DISABLE OLLAMA': 'APAGAR OLLAMA',
  'MU/TH/UR › OLLAMA ON · memory embeds and distils on this machine.':
    'MU/TH/UR › OLLAMA ENCENDIDO · la memoria se embebe y se destila en esta computadora.',
  'MU/TH/UR › OLLAMA OFF · back to the providers.': 'MU/TH/UR › OLLAMA APAGADO · de vuelta a los proveedores.',
  'Ollama could not change state: {error}': 'Ollama no pudo cambiar de estado: {error}',
  'Wakes Ollama on this computer. Nothing leaves it.': 'Despierta Ollama en esta computadora. De aquí no sale nada.',
  'DISABLE RIPLEY': 'APAGAR RIPLEY',
  'ENABLE RIPLEY': 'ENCENDER RIPLEY',
  'MU/TH/UR › RIPLEY ON · HTML, SVG and Markdown render in the file viewer, in a sealed frame.':
    'MU/TH/UR › RIPLEY ENCENDIDO · el HTML, el SVG y el Markdown se dibujan en el visor, dentro de un marco sellado.',
  'MU/TH/UR › RIPLEY OFF · files show as source.': 'MU/TH/UR › RIPLEY APAGADO · los archivos se ven como código.',
  'RIPLEY could not change state: {error}': 'RIPLEY no pudo cambiar de estado: {error}',
  'STOP ASKING FOR COMPACT REPLIES': 'DEJAR DE PEDIR RESPUESTAS COMPACTAS',
  'ASK FOR COMPACT REPLIES': 'PEDIR RESPUESTAS COMPACTAS',
  'ASH ON · every agent answers in compact prose. What you write is never altered.':
    'ASH ENCENDIDO · cada agente contesta en prosa compacta. Lo que tú escribes nunca se altera.',
  'ASH OFF · agents answer at their own length.': 'ASH APAGADO · los agentes contestan con el largo que quieran.',
  'Ash could not change state: {error}': 'Ash no pudo cambiar de estado: {error}',
  'NO SWITCH': 'SIN INTERRUPTOR',
  '{name} could not be switched.': '{name} no se pudo cambiar.',
  'IDE adapters for the agents detected here: {agents}.': 'Adaptadores de IDE para los agentes detectados aquí: {agents}.',
  'AVAILABLE · {n} · PROJECT /{project}': 'DISPONIBLES · {n} · PROYECTO /{project}',
  'The reload failed: {error}': 'La recarga falló: {error}',
  "Remove {name}? Its file {file} is deleted. MADRE's own modules cannot be removed.":
    '¿Quitar {name}? Se borra su archivo {file}. Los módulos propios de MADRE no se pueden quitar.',
  'MU/TH/UR › {name} removed.': 'MU/TH/UR › {name} quitado.',
  'It was not removed: {error}': 'No se quitó: {error}',

  // Sesiones, privacidad, ajustes rápidos y NOSTROMO.
  '@{agent} signed in': '@{agent} inició sesión',
  '@{agent} sign-in did not complete': 'el inicio de sesión de @{agent} no se completó',
  ' · exit {code}': ' · salida {code}',
  'signing in @{agent} · {command}': 'iniciando sesión de @{agent} · {command}',
  '@{agent}: open {url} to finish signing in': '@{agent}: abre {url} para terminar de iniciar sesión',
  'installing {label} · {command}': 'instalando {label} · {command}',
  'MU/TH/UR › {label} is on this computer. Sign in and the room opens.':
    'MU/TH/UR › {label} ya está en esta computadora. Inicia sesión y la sala se abre.',
  'MU/TH/UR › {label} could not be installed. The log is above.':
    'MU/TH/UR › {label} no se pudo instalar. El registro está arriba.',
  'The sign-in could not start.': 'El inicio de sesión no pudo arrancar.',
  'WRITE THE TERMS FIRST.': 'ESCRIBE PRIMERO LOS TÉRMINOS.',
  'STILL IN THE ROOM: {events} EVENTS · {entries} INDEXED EXCHANGES · {memories} MEMORIES · PURGE REPLACES THEM.':
    'TODAVÍA EN LA SALA: {events} EVENTOS · {entries} INTERCAMBIOS INDEXADOS · {memories} MEMORIAS · LA PURGA LOS REEMPLAZA.',
  'THE ROOM IS CLEAN: NO PRIVATE TERM IN THE LEDGER, THE INDEX OR THE MEMORIES.':
    'LA SALA ESTÁ LIMPIA: NINGÚN TÉRMINO PRIVADO EN EL LEDGER, EL ÍNDICE NI LAS MEMORIAS.',
  'The privacy setting was not saved: {error}': 'El ajuste de privacidad no se guardó: {error}',
  'private terms appear as {marker}.': 'los términos privados aparecen como {marker}.',
  'MU/TH/UR › purged: {events} events · {entries} exchanges · {memories} memories. Reloading.':
    'MU/TH/UR › purgado: {events} eventos · {entries} intercambios · {memories} memorias. Recargando.',
  'The purge did not run: {error}': 'La purga no corrió: {error}',
  'Applies to the next turn.': 'Aplica desde el próximo turno.',
  'RAISE @{agent} TIMEOUT TO {n}s': 'SUBIR EL TIEMPO LÍMITE DE @{agent} A {n}s',
  '@{agent} timeout is now {n}s.': 'el tiempo límite de @{agent} ahora es {n}s.',
  'RAISE DEFAULT TIMEOUT TO {n}s': 'SUBIR EL TIEMPO LÍMITE POR DEFECTO A {n}s',
  'default timeout is now {n}s for every agent without its own.':
    'el tiempo límite por defecto ahora es {n}s para todo agente que no tenga el suyo.',
  'RAISE LOCAL BUDGET TO {n}': 'SUBIR EL PRESUPUESTO LOCAL A {n}',
  'local budget is now {n} tokens per agent per 5h window.':
    'el presupuesto local ahora es {n} tokens por agente cada 5 h.',
  'ASK': 'PREGUNTAR',
  'NOSTROMO › {n} of {total} memories have had their chances and were never the answer. Ringed on the map.':
    'NOSTROMO › {n} de {total} memorias ya tuvieron sus oportunidades y nunca fueron la respuesta. Marcadas en el mapa.',
  'COLD': 'FRÍAS',
  '{pct}% of the same meaning': '{pct}% del mismo significado',
  'CLEAR THIS ABERRATION': 'QUITAR ESTA ABERRACIÓN',
  'COLD · the archive has been opened {n} times since this was written and never once carried it, and it shares a subject with nothing':
    'FRÍA · el archivo se ha abierto {n} veces desde que se escribió y ni una sola la cargó, y no comparte tema con nada',
  'MADRE has reached for this {n} times': 'MADRE ha echado mano de esta {n} veces',
  ' · last {when}': ' · la última {when}',
  'MADRE has not reached for this one yet': 'MADRE todavía no ha echado mano de esta',
  'company recorded since {when} · nothing since': 'compañía registrada desde {when} · nada desde entonces',
  'It has always travelled alone.': 'Siempre ha viajado sola.',
  'No turn has carried it since the room started keeping this trail.':
    'Ningún turno la ha cargado desde que la sala empezó a guardar este rastro.',
  'MU/TH/UR › memory forgotten: “{text}”. No future turn will read it.':
    'MU/TH/UR › memoria olvidada: «{text}». Ningún turno futuro la va a leer.',
  'MU/TH/UR › it could not be forgotten: {error}': 'MU/TH/UR › no se pudo olvidar: {error}',
  'MU/TH/UR › MADRE {version} is on npm. Open MU/TH/UR to restart with it.':
    'MU/TH/UR › MADRE {version} está en npm. Abre MU/TH/UR para reiniciar con ella.',
  'MADRE {latest} is on npm · you run {current} · open MU/TH/UR for the command':
    'MADRE {latest} está en npm · tú corres la {current} · abre MU/TH/UR para el comando',
  'It could not be saved: {error}': 'No se pudo guardar: {error}',
  '@codex summarize this project': '@codex resume este proyecto',
  // Los cuatro lugares de la sala. Los nombres de la nave —MU/TH/UR, NOSTROMO, ASH, RIPLEY—
  // son nombres propios; estos cuatro no lo son: dicen qué hay detrás de la puerta.
  'MODULES': 'MÓDULOS',
  'THE CORE': 'EL NÚCLEO',
  'GRANTED': 'CONCEDIDO',
  'just now': 'ahora mismo',
  '{n} min ago': 'hace {n} min',
  '{n} h ago': 'hace {n} h',
  '{n} d ago': 'hace {n} d',
  'default': 'por defecto',
  'YOU · CREW (EXPENDABLE)': 'TÚ · TRIPULACIÓN (PRESCINDIBLE)',
  'YOU · CREW': 'TÚ · TRIPULACIÓN',
  ' · {n} left in the archive': ' · quedan {n} en el archivo',
  ' asks ': ' pide ',
  'default #2 · ': '#2 por defecto · ',
  '#2 granted on request': '#2 concedido a petición',
  ' · whole plan': ' · el plan entero',
  '#2 by @{who} · ': '#2 por @{who} · ',
  '{pct}% of {what} · window reset': '{pct}% de {what} · ventana reiniciada',
  '{n} {messages}': '{n} {messages}',
  'message': 'mensaje',
  'messages': 'mensajes',
  " for step {step}/{total} of @{who}'s plan": ' para el paso {step}/{total} del plan de @{who}',
  '{agent} signed in with a key': '{agent} inició sesión con una llave',
  'MU/TH/UR › your message carries {n} private {term}. Agents will read it as you wrote it; their replies are guarded.':
    'MU/TH/UR › tu mensaje lleva {n} {term} privado. Los agentes lo van a leer tal como lo escribiste; sus respuestas quedan protegidas.',
  'term': 'término',
  'terms': 'términos',
  'MU/TH/UR › @{agent} cannot generate images here; routing to @{other}.':
    'MU/TH/UR › @{agent} no puede generar imágenes aquí; se va con @{other}.',
  'MU/TH/UR › /{name} is not available in this project: {title} (see MODULES).':
    'MU/TH/UR › /{name} no está disponible en este proyecto: {title} (mira MÓDULOS).',
  'Upload failed ({status}).': 'Falló la subida ({status}).',
  'CREATE: let the agent add new files to the project for this request; existing files stay untouched':
    'CREATE: deja que el agente agregue archivos nuevos al proyecto para esta petición; los que ya existen no se tocan',
  'MU/TH/UR › @{agent} {why}. CREATE will be refused; pick another agent or change CONNECTIONS.':
    'MU/TH/UR › @{agent} {why}. CREATE se va a rechazar; elige otro agente o cambia CONEXIONES.',
  'has file creation switched off': 'tiene apagada la creación de archivos',
  'cannot create files from its CLI': 'no puede crear archivos desde su CLI',
  'Request failed ({status}).': 'Falló la petición ({status}).',
  'installing {name}': 'instalando {name}',
  ' for {agents}': ' para {agents}',
  '{name} installed': '{name} instalado',
  '{name} install failed': 'falló la instalación de {name}',
  '{name} could not save {label}.': '{name} no pudo guardar {label}.',

  // CORREO y, en general, la llave de cualquier conector: lo que MADRE guarda en su bodega.

  // Los arranques de /module: una instrucción para editar, no un comando para mandar.
  'MODULE · ↑↓ · TAB OR ENTER · pick one and edit it': 'MÓDULO · ↑↓ · TAB O ENTER · elige uno y edítalo',
  'a command that tells me what changed in the repo this week': 'un comando que me diga qué cambió en el repo esta semana',
  'a slash command · runs in the room, answers as a card': 'un comando · corre en la sala y responde como tarjeta',
  'connect me to my Notion so the agents can search my pages': 'conéctame con mi Notion para que los agentes busquen en mis páginas',
  'a connector · one key, pasted on its card': 'un conector · una llave, pegada en su ficha',
  'ping me on Telegram when a turn fails': 'avísame por Telegram cuando falle un turno',
  'a connector that sends · only offered in #4 AIRLOCK': 'un conector que manda · solo se ofrece en #4 AIRLOCK',
  'a card showing which of my services are up': 'una tarjeta que muestre cuáles de mis servicios están arriba',
  'a card of your own · its own panel inside MODULES': 'una ficha propia · su propio panel dentro de MÓDULOS',

  // La tarjeta de desarrollo en MÓDULOS.
  'A module is one file: no build, no dependencies, nothing to register. A switch, settings, a slash command, a tool for the agents, a card of your own — or a connector to something you already use. Drop it in a folder, press RELOAD, and it is there with its own card.':
    'Un módulo es un archivo: sin build, sin dependencias, sin registrarse en ningún lado. Un interruptor, ajustes, un comando, una herramienta para los agentes, una ficha propia — o un conector con algo que ya usas. Lo dejas en una carpeta, pulsas RECARGAR y ahí está con su tarjeta.',
  'Or ask for one. In the composer: ': 'O pídelo. En la caja de texto: ',
  ' — the agent reads the SDK and writes the file; you review it and decide whether it is installed.':
    ' — el agente lee el SDK y escribe el archivo; tú lo revisas y decides si se instala.',
  'Connecting to a service from outside is almost always possible: the limit is not MADRE, it is whether that service lets you get your own key in minutes and revoke it on its own. Your module declares the key it needs and MADRE draws the field; declares where it reaches and the outbound log answers for it; declares which of its tools SEND, and the room withholds those below #4 AIRLOCK.':
    'Conectar con un servicio de fuera casi siempre se puede: el límite no es MADRE, es si ese servicio te deja conseguir tu propia llave en minutos y revocarla sola. Tu módulo declara la llave que necesita y MADRE dibuja el campo; declara a dónde llega y el registro de salidas responde por él; declara cuáles de sus herramientas MANDAN, y la sala se las retira por debajo de #4 AIRLOCK.',
  'ASK FOR ONE': 'PÍDELE UNO',
  'Puts /module in the composer, in the room': 'Pone /module en la caja de texto, en la sala',
  'KEYS': 'LLAVES',
  'paste it here': 'pégala aquí',
  'kept · {n} characters': 'guardada · {n} caracteres',
  'FORGET IT': 'OLVIDARLA',
  'WHERE TO GET IT': 'DÓNDE SACARLA',
  '{name} could not keep {label}.': '{name} no pudo guardar {label}.',
  'off · ready': 'apagado · listo',
  'on · not configured': 'encendido · sin configurar',
  'only to': 'solo a',
  'It loads in every room on this computer.': 'Se carga en todas las salas de esta computadora.',
  'DISABLE': 'APAGAR',
  'ENABLE': 'ENCENDER',
  'No detected agent has an adapter for this module; it installs without IDE adapters.':
    'Ningún agente detectado tiene adaptador para este módulo; se instala sin adaptadores de IDE.',
  'Install request failed ({status}).': 'Falló la petición de instalación ({status}).',
  'modules reloaded: {n} of yours': 'módulos recargados: {n} tuyos',
  ', {n} failed to load': ', {n} no cargaron',
  ' · sign in to finish': ' · inicia sesión para terminar',
  '{name} was not installed': '{name} no se instaló',
  'READY FOR INQUIRY. HELP LISTS WHAT I ANSWER.': 'LISTA PARA CONSULTA. HELP LISTA LO QUE CONTESTO.',
  '{n} private {term} guarded from now on.': '{n} {term} privado protegido de aquí en adelante.',
  'MU/TH/UR › that value is not valid (minimum {min}).': 'MU/TH/UR › ese valor no es válido (mínimo {min}).',
  ' · flagged by {who}': ' · marcada por {who}',
  'the room': 'la sala',
  ' · distilled': ' · destilada',
  'last turn: {who} · {when}': 'último turno: {who} · {when}',
  'Travelled into the same turn {n} {times} · last {when}':
    'Viajó al mismo turno {n} {times} · la última {when}',
  'time': 'vez',
  'times': 'veces',
  'Strong enough that recalling this one now brings it along ({pct}%).':
    'Tan fuerte que recordar esta ahora se la lleva consigo ({pct}%).',
  " · in MADRE's own folder ({prefix}), no administrator needed":
    ' · en la carpeta propia de MADRE ({prefix}), sin necesidad de administrador',
  " · on the human's request": ' · a petición del humano',
  'RIPLEY reports an error in the page: {message}{where}. Find the cause and propose the fix.':
    'RIPLEY reporta un error en la página: {message}{where}. Encuentra la causa y propón el arreglo.',
  '@madre runs on this machine and speaks for what the room remembers. "@madre, ask the crew …" opens a round with every agent online. To change files, write to a CLI agent.':
    '@madre corre en esta computadora y habla por lo que la sala recuerda. «@madre, pregúntale a la tripulación …» abre una ronda con todos los agentes en línea. Para cambiar archivos, escríbele a un agente de CLI.',
  'Measured against this room {when}: it landed where the crew landed on {matched} of {n} real questions{verdict}':
    'Medido contra esta sala {when}: cayó donde cayó la tripulación en {matched} de {n} preguntas reales{verdict}',
  '. Ready to be worked in.': '. Listo para meterse a trabajar.',
  ' — not yet.': ' — todavía no.',
  'Nobody has measured it against this project yet: MU/TH/UR → the three tests, or the line in the room when it joined.':
    'Nadie lo ha medido contra este proyecto todavía: MU/TH/UR → las tres pruebas, o la línea en la sala de cuando entró.',
  'MU/TH/UR › AIRLOCK open for @{agent} for this message.{raised} Files are checkpointed; what leaves the machine is not undone.':
    'MU/TH/UR › AIRLOCK abierta para @{agent} en este mensaje.{raised} Se guarda un punto de control de los archivos; lo que sale de la computadora no se deshace.',
  ' MAX MODE is now #4 in CONNECTIONS.': ' MODO MÁXIMO ahora es #4 en CONEXIONES.',
  'MU/TH/UR › CONTROL armed for @{agent} for this message.{raised} A checkpoint is taken before it runs; every change is listed and UNDO is one click.':
    'MU/TH/UR › CONTROL armado para @{agent} en este mensaje.{raised} Se toma un punto de control antes de que corra; cada cambio se lista y DESHACER está a un clic.',
  ' MAX MODE is now #3 in CONNECTIONS.': ' MODO MÁXIMO ahora es #3 en CONEXIONES.',
  "Conversation · {n} messages. The project's memory is shared by all of them.":
    'Conversación · {n} mensajes. La memoria del proyecto es la misma para todos ellos.',

  // Esfuerzo: cuánto piensa el modelo antes de contestar.
  'effort': 'esfuerzo',
  'effort {level}': 'esfuerzo {level}',
  ' · effort for this request': ' · esfuerzo de esta petición',
  'Effort for this agent · {level}': 'Esfuerzo de este agente · {level}',
  'Effort for this agent · the CLI default ({level})': 'Esfuerzo de este agente · el del CLI ({level})',
  "Effort for this agent · the CLI's own default": 'Esfuerzo de este agente · el que traiga el CLI',
  'Default': 'Por defecto',
  'Sends nothing: the CLI uses its own setting, {level} right now.': 'No manda nada: el CLI usa su propio ajuste, ahora {level}.',
  'Sends nothing: the CLI uses its own setting.': 'No manda nada: el CLI usa su propio ajuste.',
  'Minimal': 'Mínimo',
  'Low': 'Bajo',
  'Medium': 'Medio',
  'High': 'Alto',
  'Extra high': 'Muy alto',
  'Max': 'Máximo',
  'Answers almost at once. For lookups and one-line edits.': 'Contesta casi al instante. Para consultas y cambios de una línea.',
  'Quick and light. For clear, contained requests.': 'Rápido y ligero. Para peticiones claras y acotadas.',
  'The everyday balance of speed and depth.': 'El equilibrio de todos los días entre rapidez y profundidad.',
  'Thinks it through. For design calls and tricky bugs.': 'Lo piensa a fondo. Para decisiones de diseño y bugs difíciles.',
  'Longer reasoning for hard, multi-step problems.': 'Razonamiento más largo para problemas difíciles de varios pasos.',
  'Everything it has. The slowest and the most expensive.': 'Todo lo que tiene. El más lento y el más caro.',
  'More effort is a slower, longer answer, and on a metered plan a more expensive one. It applies to every message to this agent until you change it.':
    'Más esfuerzo es una respuesta más lenta y más larga, y en un plan medido, más cara. Vale para cada mensaje a este agente hasta que lo cambies.',

  // Una elección que devuelve un agente.
  '@{agent} asks you to choose': '@{agent} te pide elegir',
  'RECOMMENDED': 'RECOMENDADA',
  'CLI': 'CLI',

  // Un comando que un agente te pide correr.
  'on · agents may ask you to run commands': 'encendido · los agentes pueden pedirte que corras comandos',
  'off · agents describe the command in prose': 'apagado · los agentes describen el comando en prosa',
  'Lets an agent ask you to run a command it cannot run in its mode (tests, a build, a linter). Each command is a button: nothing runs until you press it, it runs from the project root with no shell, a checkpoint is taken first, and the output comes back to the room. Costs about 190 tokens of instruction per turn below AIRLOCK while it is on.':
    'Deja que un agente te pida correr un comando que en su modo no puede correr (las pruebas, un build, un linter). Cada comando es un botón: nada corre hasta que lo presionas, corre desde la raíz del proyecto sin shell, antes se toma un checkpoint y la salida vuelve a la sala. Cuesta unos 190 tokens de instrucción por turno debajo de AIRLOCK mientras está encendido.',
  'Name the request and the line to run.': 'Di qué petición y qué línea correr.',
  '@{agent} asks you to run': '@{agent} te pide correr',
  'RUNNING': 'CORRIENDO',
  'WILL NOT RUN': 'NO CORRE',
  'This line does not run: it {why}.': 'Esta línea no corre: {why}.',
  'Does not run: it {why}.': 'No corre: {why}.',
  'Runs {command} from the project root, with no shell. A checkpoint is taken first.':
    'Corre {command} desde la raíz del proyecto, sin shell. Antes se toma un checkpoint.',
  'Each line runs only when you press it · from the project root, no shell · the output comes back to the room':
    'Cada línea corre solo cuando la presionas · desde la raíz del proyecto, sin shell · la salida vuelve a la sala',
  'Put the project files back exactly as they were before this command. What it sent off this machine does not come back.':
    'Deja los archivos del proyecto exactamente como estaban antes de este comando. Lo que haya mandado fuera de esta máquina no regresa.',
  'project restored to the checkpoint before the command · {restored} restored · {removed} removed':
    'proyecto restaurado al checkpoint anterior al comando · {restored} restaurados · {removed} quitados',
  'expands a variable or a command inside quotes; there is no shell to expand it':
    'expande una variable o un comando dentro de comillas; no hay shell que lo expanda',
  'ends in a lone backslash': 'termina en una diagonal invertida suelta',
  'uses "{char}", which needs a shell; put each command on its own line':
    'usa «{char}», que necesita un shell; pon cada comando en su propia línea',
  'expands a variable or a command; there is no shell to expand it':
    'expande una variable o un comando; no hay shell que lo expanda',
  'uses "{char}" as a glob; there is no shell to expand it, name the files':
    'usa «{char}» como comodín; no hay shell que lo expanda, nombra los archivos',
  'starts a word with "~"; there is no shell to expand it, write the path':
    'empieza una palabra con «~»; no hay shell que lo expanda, escribe la ruta',
  'carries a "#" comment, which only a shell would drop; say it in the reason':
    'lleva un comentario con «#», que solo un shell quitaría; dilo en el motivo',
  'leaves a quote open': 'deja una comilla abierta',
  'is empty': 'está vacía',
  '"{name}" is a shell builtin; every line already runs from the project root':
    '«{name}» es un comando interno del shell; cada línea ya corre desde la raíz del proyecto',
  'sets an environment variable, which needs a shell': 'fija una variable de entorno, y eso necesita un shell',
  'is too long to read before pressing it': 'es demasiado larga para leerla antes de presionarla',

  // El interruptor de idioma.
  'Interface in English': 'Interfaz en inglés',
  'Interface in Spanish': 'Interfaz en español',
};
