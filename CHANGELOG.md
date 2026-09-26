# Changelog

Todas las versiones publicadas de `@jossuealcala/madre`. Fechas en ISO.

Una versión se cierra cuando está en npm: hasta entonces su sección se llama **Sin publicar** y puede crecer. Cada versión publicada tiene exactamente una etiqueta `vX.Y.Z`, una release en GitHub y una sección aquí; el parche puede llegar a dos dígitos (`0.2.10`) antes de subir el menor. Ver `docs/ROADMAP.md` para el criterio de qué sube cada número.

## 0.4.0 · Sin publicar

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
