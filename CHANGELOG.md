# Changelog

Todas las versiones publicadas de `@jossuealcala/madre`. Fechas en ISO.

Una versión se cierra cuando está en npm: hasta entonces su sección se llama **Sin publicar** y puede crecer. Cada versión publicada tiene exactamente una etiqueta `vX.Y.Z`, una release en GitHub y una sección aquí; el parche puede llegar a dos dígitos (`0.2.10`) antes de subir el menor. Ver `docs/ROADMAP.md` para el criterio de qué sube cada número.

## 0.4.0 · Sin publicar

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
