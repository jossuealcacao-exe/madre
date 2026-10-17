# MADRE · SALAS EN ESCRITORIO Y MACROVERSO

Documento único de este trabajo, como `docs/MOBILE.md` y `docs/WINDOWS.md`: lo que se
decida, se construya o se descarte sobre Salas, los enlaces entre salas y el Macroverso
se anota aquí. Lo que toca procesos o rutas sigue además las reglas de `docs/WINDOWS.md`.

| | |
|---|---|
| Estado | **Todas las fases hechas**: 1, 2, 3a–3e y 4a–4c, con D-S13, S-021 y S-032 aplicadas. Lo que queda son decisiones menores (`docs/MACROVERSO-TRASPASO.md` §4). D-S01..06 y D-S11..18 cerradas por el humano; el prompt de ejecución es `docs/MACROVERSO-ENCARGO.md` |
| Origen | Pedido del 2026-10-08, después de probar Salas en el teléfono; ampliado el mismo día (§1, puntos 6-8) |
| Regla en vigor | Nada aquí cambia el núcleo de una sala (registro, memoria, modos). Un enlace lee; nunca escribe en otra sala. Una orden entra a una sala solo por la puerta que esa sala ya tiene para el humano |
| Encargo | `docs/MACROVERSO-ENCARGO.md`: hechos verificados con `ruta:línea`, diseño, compuertas, pruebas y presupuestos de las fases 3 y 4. Este documento sigue siendo el único lugar de hallazgos (`S-0xx`), decisiones (`D-Sxx`) y bitácora |

---

## 1 · Qué se pidió

1. **Salas en escritorio**, como puerta de entrada: abrir varios proyectos, administrarlos,
   cerrarlos y enlazarlos, sin que una sala pise a otra. Salas en el teléfono ya funciona y
   se queda como está.
2. **Enlazar salas** para trabajar en varios proyectos a la vez y compartir lo que saben,
   con una capa de **contratos, validaciones, lógica, seguridad y monitor**.
3. **El Macroverso**: todas las salas como universos, con la UX de NOSTROMO adaptada para
   que se sienta imponente sin cargar la GPU ni fallar al dibujar. Un **super agente**
   elegido por el humano sugiere enlaces, revisa riesgos y arma lo necesario, en modo
   **manual, automático o híbrido**.
4. El Macroverso **solo se entra desde Salas y solo en escritorio**. En el teléfono, una
   versión simple que no sature.
5. Mantener el estilo de MADRE: coherencia visual, navegación y usabilidad primero.

Ampliado el 2026-10-08, después de ver las fases 1 y 2:

6. **El Macroverso se ve raro.** Cada proyecto es **un NOSTROMO** dentro del Macroverso, igual
   que en su sala, y el lienzo es el espacio sideral, infinito.
7. **El super agente es otro chat que se abre en Salas**, elegido por el humano, por defecto en
   `#1`/`#2`: un meta-guardián al que se le pregunta todo sobre los proyectos, las decisiones y
   los movimientos; crea planes, crea elementos y puede dirigir a otros agentes en `#3`/`#4`,
   siempre cuidando la lógica, la protección de cada proyecto, las acciones y su seguimiento,
   sin volver ruidosos los intercambios. Con canales, candados y puentes.
8. Si `@madre` es el super agente: revisar qué permisos puede tener y cómo destila sus
   propias memorias. El super agente **gobierna a todos desde Salas**: planes y órdenes.

---

## 2 · Cómo funcionan hoy las salas (verificado en el código)

| Hecho | Dónde |
|---|---|
| Una sala es un proceso `madre start` por proyecto. Sin `--port` empieza en 4317 y avanza al siguiente puerto libre | `bin/madre.mjs` (`openRoom`, `roomAlreadyOpen`) |
| Si el proyecto ya tiene una sala abierta cerca, `madre start` muestra esa y no abre otra | `bin/madre.mjs:20-36` |
| La sala misma se niega a abrir dos veces el mismo proyecto: `open.json` guarda `pid` y puerto, y si ese `pid` vive responde `ROOM_IN_USE` | `src/server.mjs:204-211` |
| Los datos de cada sala viven en `~/.pulse/rooms/<carpeta>-<hash>/`: conversaciones, `memory.sqlite`, adjuntos, `outbound.jsonl` | `src/server.mjs:186` |
| El id de la sala es el nombre de la carpeta más un hash de la ruta: **no se puede volver a la ruta**, y la ruta completa no se guarda (solo el nombre, en `open.json`) | `src/server.mjs:130`, `:214` |
| `open.json` se borra al cerrar; si el proceso murió, el `pid` muerto lo delata | `src/server.mjs:229`, `src/bridge/server.mjs:34` |
| No hay una forma de cerrar una sala desde otra: se cierra con una señal del sistema o al reiniciarse por una actualización | `src/server.mjs:2518`, `:1908-1919` |
| Cada sala solo acepta peticiones con `Host` local, y las que cambian algo solo si vienen de su propia página (`Origin` = su puerto) o sin `Origin` (otro proceso local) | `src/request-guard.mjs` |
| El puente del teléfono ya lista las salas abiertas (leyendo `open.json`) y les habla de servidor a servidor | `src/bridge/server.mjs:37-47`, `:230-248` |
| Compartido por todas las salas en `~/.pulse`: `config.json`, `credentials/`, `modules/`, `devices.json`, `handoff.json`, `updates.json`, `whats-new.json` | `src/config.mjs`, `src/bridge/*.mjs` |
| La memoria es de cada sala: su propio `memory.sqlite` y su propio servidor MCP de memoria | `src/memory.mjs`, `src/mcp/memory-server.mjs` |

En esta Mac, `~/.pulse/rooms` tiene 17 carpetas; varias son de pruebas o temporales
(`tmp…`, `agent-…`, `pulse-npx-…`), sin proyecto real detrás.

---

## 3 · Que no se pisen: hallazgos

Cada hallazgo tiene id permanente (`S-0xx`); un id no se reusa.

| ID | Qué pasa | Dónde | Fase | Estado |
|---|---|---|---|---|
| **S-001** | `config.json` se escribe sin candado y sin escritura atómica. Dos salas que cambian ajustes a la vez: gana la última y una puede borrar el cambio de la otra | `src/config.mjs` | 1 | ARREGLADO |
| **S-002** | La ruta del proyecto no se guarda: una sala cerrada no se puede volver a abrir desde Salas | `src/server.mjs:214` | 1 | ARREGLADO |
| **S-003** | No hay cierre por HTTP: Salas no puede cerrar una sala | — | 1 | ARREGLADO |
| **S-004** | Salas de pruebas sin proyecto se mezclarían con las reales | `~/.pulse/rooms` | 1 | ARREGLADO |
| **S-005** | Una sala con una MADRE anterior no tiene las rutas nuevas: Salas debe decirlo en vez de fallar | — | 1 | ARREGLADO |
| **S-006** | Dos `madre start` a la vez pueden tomar el mismo puerto libre; hoy el segundo recibe `EADDRINUSE` y avanza. Se conserva | `bin/madre.mjs` | — | SIN CAMBIO |
| **S-007** | Los módulos escribían en `config.json` todo su bloque `modules` tal como lo tenían en memoria: un cambio de otra sala a otro módulo se perdía. Ahora cada uno escribe solo su clave | `src/modules/*.mjs` | 1 | ARREGLADO |
| **S-008** | `memory_note` guardaba notas sin pasar por el guardia de privacidad (`openMemory` no llamaba a `attachPrivacy`); una nota así podría cruzar un enlace. Ahora `openMemory` arma el mismo `Privacy` que la sala, desde el `config.json` de la Mac (`PULSE_HOME`), y lo adjunta antes de abrir la base; la respuesta de la herramienta repite la nota como quedó guardada | `src/mcp/memory-server.mjs` | 3b | ARREGLADO |
| **S-009** | La llave de `#3`/`#4` se valida solo en el navegador; `POST /api/messages` acepta `#3` de un proceso local si el techo del agente lo permite. El canal de órdenes nunca manda ≥ `#3` | `src/override.mjs:3`, `src/server.mjs:2492-2524` | — | SIN CAMBIO |
| **S-010** | El techo de modo (`scopes.<agente>.maxMode`) es por agente y por Mac, no por sala. El techo por sala vive en el contrato del enlace | `src/server.mjs:515-527` | — | SIN CAMBIO |
| **S-011** | El regex de pasos de delegación ignora `@x #4:` en silencio | `src/directives.mjs:50` | — | ANOTADO |
| **S-012** | El bloque `mode` del prompt dice «Read-only…» también en `#3` y `#4` | `src/room/prompt.mjs:98` | — | ANOTADO |
| **S-013** | Purgar la privacidad reescribe solo el ledger de la conversación abierta. Verificado en 3b: la purga **sí** redacta la tabla `memories` (`RoomMemory.purge()` reinserta cada nota con el término reemplazado; la prueba de `test/enlaces.test.mjs` lo fija). La pérdida de estado que se descubrió al verificarlo quedó corregida en S-019 | `src/room.mjs:660`, `src/memory.mjs` (`purge`) | 3b | VERIFICADO |
| **S-014** | En tema claro el Macroverso, siempre oscuro, recibía el acento claro. Ahora lee el acento de la regla de la hoja de estilos, antes de que el esquema claro lo recoloree | `public/salas-mac.js` (`darkAccent`) | 3a | ARREGLADO |
| **S-015** | `FOCUS_ZOOM` se usaba antes de declararse. Ahora es una constante del módulo, declarada arriba; una prueba lo fija | `public/macroverso.js` | 3a | ARREGLADO |
| **S-016** | `resize` repintaba todos los sprites sin debounce. Ahora espera 150 ms y repinta solo el cielo y las estrellas; los sprites dependen de la densidad, no del tamaño de la ventana | `public/macroverso.js` | 3a | ARREGLADO |
| **S-017** | El NOSTROMO de la sala no tiene tope de densidad ni pausa al ocultar la pestaña (el navegador ya no entrega cuadros a una pestaña oculta). Medido a 1440×900 y densidad 2 con 171 memorias y 338 venas: 5.4 ms de mediana por cuadro antes de la extracción, 5.8-6.0 después (A/B síncrono en el mismo minuto, 300 ticks por corrida; la versión anterior dio 6.9-7.2). Ni tope ni pausa hacen falta | `public/nostromo-engine.js` | 3a | MEDIDO · SIN CAMBIO |
| **S-018** | `docs/INTERNALS.md:83` dice que varios turnos `#2` corren a la vez; el código deja un solo escritor por proyecto | `src/room/control.mjs:12-16` | — | ANOTADO |
| **S-019** | La purga reinsertaba notas sin zona, refutación, contradicción ni historial de recall: un hecho refutado volvía a circular, incluso tras reabrir. Con la excepción autorizada por el humano, la reinserción conserva todas las columnas de la nota y solo redacta el contenido privado. Prueba de hecho expulsado, aberración en enfermería e historial de recall antes y después de reabrir | `src/memory.mjs` (`purge`), `test/memory.test.mjs` | — | ARREGLADO |
| **S-020** | La llave del canal (`~/.pulse/credentials/enlaces.json`) prueba «un proceso de MADRE en esta Mac», no qué sala pide: el `asking` de la petición es la palabra de quien llama. Es el límite [I] que el encargo pedía anotar (§4B); una sala que mienta sobre su id solo obtiene lo que un contrato ya deja leer a esa otra sala | `src/enlaces.mjs`, `src/server.mjs` (sección ENLACES) | 3b | ANOTADO |
| **S-021** | `enlace.received` no decía qué agente ni qué turno pidió la lectura. Con la autorización del humano («completo, priorizando lógica, permisos y coherencia»): la sala registra sus turnos vivos (`Room.runningTurn(id)`: agente y modo, por el id de la respuesta que escribirán); `toolsForTurn` y `bishopForTurn` reciben ese id; `pulse-enlaces` lleva `PULSE_ENLACES_AGENT` y `PULSE_ENLACES_TURN` y los manda en cada lectura; `POST /api/enlace/ask` **no lee** si ese turno no está corriendo en la sala, para ese agente y arriba de GHOST (409, antes de decir si el enlace existe), y anota la lectura en la conversación de ese turno. `enlace.received` y la línea de `enlaces.jsonl` llevan `agent` y `turn`; la sala que entrega guarda el agente como palabra de la otra (S-020) en `enlace.read`; Salas dice quién leyó al último; bajo cada respuesta, «leyó N notas de gumball». Una mutación que quita la comprobación hace fallar la prueba | `src/room.mjs`, `src/server.mjs`, `src/enlaces.mjs`, `src/modules/enlaces.mjs`, `src/modules/bishop.mjs`, `public/app.js`, `public/salas-mac.js` | 3e | ARREGLADO |
| **S-022** | `--help` después de un comando se ignoraba: `madre start --help` abría la sala, y `madre salas --help` la habría abierto también. Ahora `parseArgs` toma `--help` o `-h` en cualquier posición como la ayuda; un valor nunca empieza por `-`, así que ninguna opción pierde el suyo | `src/cli-args.mjs` | 3d | ARREGLADO |
| **S-023** | Abrir la sala de Salas deja `.pulse/mother.env` dentro del cuaderno, como en cualquier proyecto: es el sello del canal de MU/TH/UR, que el núcleo escribe en `<proyecto>/.pulse/`. El CLI crea el cuaderno vacío y no escribe nada; lo que sí escribe es la sala, igual que en toda sala, y el checkpoint ya excluye `.pulse/` (`FORBIDDEN`). Las pruebas fijan que eso es lo único que aparece dentro | `src/server.mjs` (`MotherChannel`), `src/checkpoint.mjs:21` | 3d | ANOTADO · SIN CAMBIO |
| **S-024** | Faltaba un conducto del módulo al bloque `bishop`, también para `@madre`, porque `toolsForTurn` no viaja al agente local. Con la excepción autorizada, el callback en `src/server.mjs`/`src/room.mjs` prepara el bloque solo en Salas y para el agente elegido; `promptParts` lo identifica y mide (≤ 1500 caracteres). El fixture dorado añade solo la forma BISHOP | `src/modules/bishop.mjs`, `src/server.mjs`, `src/room.mjs`, `src/room/prompt.mjs`, `test/prompt.test.mjs` | 4a | ARREGLADO |
| **S-025** | La exposición de privacidad no contaba `correction` y la purga solo reescribía una nota si `text` tenía el término privado. Además, calculaba `norm` sin la clave propia de las aberraciones, con riesgo de colisión tras redactar. La exposición y la purga ahora incluyen la corrección y recalculan `norm` mediante `memoryKey` | `src/memory.mjs` (`exposure`, `purge`), `test/memory.test.mjs` | — | ARREGLADO |
| **S-026** | `@madre` descartaba el bloque `bishop` al reconstruir su briefing y su sistema solo admitía el archivo de esta sala. Con la excepción autorizada, `Room` pasa el bloque como argumento separado y el adaptador usa reglas BISHOP solo cuando ese argumento existe: notas enlazadas con contrato, cita por sala, sin darles secuencias de Salas. Un texto del usuario no puede fingir ese argumento | `src/adapters/madre.mjs`, `src/room.mjs`, `test/madre-agent.test.mjs`, `test/bishop.test.mjs` | 4a | ARREGLADO |
| **S-027** | El SDK documentaba `onEvent(ctx, event)` para cada evento, pero el servidor no invocaba ningún `module.onEvent`. Con la excepción autorizada por el humano, `wireModules()` en `src/server.mjs` suscribe cada conversación viva de la sala (la abierta en `wireRoom()` y las de al lado en `hold()`) y entrega cada evento a los módulos encendidos con `onEvent`, con `ctx.room`, `ctx.chat` y `ctx.record` de esa conversación; corre aparte y un fallo se registra sin detener a la sala. `docs/SDK.md` lo dice ahora como es. Para que el resultado vuelva a la conversación del plan, el contexto de módulos gana `services.recordIn(chat, type, payload)`, el mismo `record()` en una conversación nombrada; y las rutas de módulo reciben `viaPhone` (excepción 4) | `src/server.mjs` (`wireModules`, `moduleContext`), `docs/SDK.md`, `test/bishop-orders.test.mjs` | 4b | ARREGLADO |
| **S-028** | `Room.send()` arrancaba siempre con `depth: 0` y delegación permitida. Con la excepción autorizada, `send()` sigue idéntico por fuera y pasa a `#accept()`; una puerta nueva, `Room.order({ text, target, mode })`, usa el mismo camino (`modeCheck`, arriendo, guardia, límites) con tres cosas fijas en el proceso y nunca leídas de una petición: `via: 'bishop'`, `depth: 1` y sin delegación; rechaza `#3`/`#4` y devuelve la respuesta o el fallo. `'bishop'` **no** entra a `VIA_KINDS`: ningún cuerpo de petición puede reclamarlo. Una mutación a `depth: 0` hace fallar la prueba (la alerta de delegación anidada solo existe a profundidad 1) | `src/room.mjs` (`send`, `order`, `#accept`), `test/bishop-orders.test.mjs` | 4b | ARREGLADO |
| **S-029** | En `#runTurn`, la alerta de delegación anidada se disparaba con `/```pulse/i` a profundidad > 0, que también casa con ```` ```pulse-run ````, ```` ```pulse-ask ```` y ```` ```pulse-salas ````: un paso delegado o una orden que pedía correr un comando recibía una alerta falsa. Con la autorización del humano, el patrón es el de `src/directives.mjs`: ```` ```pulse ```` seguido de salto de línea. Una prueba de 4c lo fija (una orden que responde con ```` ```pulse-run ```` no alerta) | `src/room.mjs` (`#runTurn`), `test/bishop-4c.test.mjs` | 4c | ARREGLADO |
| **S-030** | `@madre` (qwen2.5:7b) como BISHOP, cinco intentos limpios, cada uno en una conversación nueva, con la misma petición: 2 planes con una orden enviable, 1 bloque legible con un agente que no existe («salas»), 2 sin cerca. Copia los marcadores del ejemplo («Motivo del plan en una línea»), inventa hechos («en la sala Salas se han tomado varias decisiones») y repite sus respuestas anteriores desde el transcrito y el archivo. Las reglas aguantaron: nada inválido quedó con botón. Claude como BISHOP cerró con un bloque válido a la primera. La condición del encargo §4C.7 («no cierra con un bloque válido en 5 intentos») no se cumple al pie de la letra; el humano decidió «sí a S-030»: con `@madre`, BISHOP solo responde. No se le enseña el bloque, su regla 5 lo dice, y si lo escribe no se lee (`onlyAnswers`). Elegir quién es BISHOP sigue siendo del humano | `src/modules/bishop.mjs`, `src/adapters/madre.mjs`, `test/bishop-4c.test.mjs` | 4c | CERRADO |
| **S-031** | La regla fija de `@madre` (`ACTION_EN`) leía el primer encabezado de una orden («order», «delegate») como una petición de actuar y contestaba toda orden con su negativa. El encabezado se reescribió sin palabras de esa lista (`BISHOP › 1/1 · plan … · from Salas, sent by the human…`); una prueba fija que una pregunta que llega como orden se contesta y una orden de actuar se sigue negando | `src/modules/bishop.mjs` (`orderHeader`), `test/bishop-orders.test.mjs` | 4b | ARREGLADO |
| **S-032** | El prompt de BISHOP en la sala de Salas llevaba el bloque `delegation` (929 caracteres en `turn.cost`), y el encargo §4C pedía que BISHOP no delegue dentro de su sala. Con la autorización del humano, la sala de Salas abre con `delegation: false` y un ajuste de la sala no la enciende ahí (`live.delegation`); el resto de las salas no cambia. Medido en vivo: el turno de BISHOP ya no lleva el bloque | `src/server.mjs` (`roomOptions`, ajustes de sala), `test/bishop-4c.test.mjs` | 4c | ARREGLADO |
| **S-033** | Lo que una sala «te espera» se borraba con cualquier mensaje `role: 'user'`, también con una orden de BISHOP: una propuesta `#3` que llegaba antes que una orden `#1` a la misma sala desaparecía de Salas. Ahora solo un mensaje del humano (sin `via: 'bishop'`) la borra | `src/server.mjs` (`trackAsks`) | 4c | ARREGLADO |

---

## 4 · Fase 1 · Salas en escritorio

**Dónde vive.** Cada sala sirve `/salas` en su propio puerto, con la lista de **todas** las
salas de la Mac. La página habla solo con su sala, y su sala habla con las demás de
servidor a servidor, como ya hace el puente. Así no se abre un proceso nuevo y el guardia
de cada sala no cambia.

**Qué muestra.**

- Arriba, *Seguir donde ibas*, igual que en el teléfono.
- Las salas abiertas primero, ordenadas por quién te espera, quién trabaja y la más reciente.
- Después las **dormidas**: salas cerradas cuyo proyecto sigue en disco.
- Cada tarjeta: nombre del proyecto, carpeta, estado (abierta, trabajando, te espera,
  cerrada), la última conversación, cuántas conversaciones y memorias tiene.

**Qué hace.**

| Acción | Cómo | Regla |
|---|---|---|
| Abrir | Lleva a la sala en su puerto | — |
| Iniciar una dormida | La sala que sirve Salas lanza `madre start --project <ruta> --no-open` | Sin shell (WIN-016), con `process.execPath` y la ruta de `bin/madre.mjs` por `fileURLToPath` (WIN-004/006), `windowsHide`, `detached` solo fuera de Windows; su salida a `start.log` en la carpeta de la sala |
| Cerrar | Le pide a esa sala `POST /api/room/close`: detiene sus turnos y se cierra como con una señal | Si alguien trabaja, pide confirmación. Desde el teléfono, no |
| Detener todo | Igual que en el teléfono | — |

**Puerta de entrada.** Una tecla *Salas* en la barra del escritorio (se acomoda como las
demás). Que `madre` abra Salas sin ninguna sala abierta es la decisión **D-S02**.

**Arreglos de la fase:**

- S-001: candado y renombre atómico en `config.json`.
- S-002: la sala guarda `project.json` (ruta, nombre, última apertura) junto a su registro.
- S-003: `/api/room/close`.
- S-004: sin `project.json`, una carpeta no se ofrece para iniciar.
- S-005: una sala que no conoce la ruta nueva se muestra con «Actualiza MADRE en esta sala».

---

## 5 · Fase 2 · El Macroverso (verlo)

Solo en escritorio y solo desde Salas. **Fase 2 solo muestra; no enlaza.**

- **Qué es.** Cada sala es un universo: un sol del color de MADRE con su halo de memorias
  (cuántas de cada tipo, cuántas viajan). Los proyectos dormidos, apagados. Más adelante,
  los enlaces serán corrientes de plasma entre soles.
- **Imponente sin cargar la GPU.**
  - Canvas 2D, sin WebGL ni sombreadores por píxel como el magma de NOSTROMO.
  - Cada universo se pinta una vez en un sprite y luego solo se mueve, gira y escala.
  - Nunca más de dos cuadros de alta resolución.
  - Se detiene si la pestaña no se ve.
  - Respeta *reducir movimiento*.
  - Cámara con vuelo al universo elegido y profundidad por capas (estrellas lejanas lentas,
    cercanas rápidas).
- **Lo que se lee.** Al elegir un universo: su ficha (memorias por tipo, conversaciones, quién
  trabaja, qué te espera) y *Entrar a la sala*.
- **En el teléfono.** Sin mapa: la misma información en la lista de Salas.

---

## 6 · Fases 3 y 4 · Enlazar y BISHOP (construidas: 3a–3d y 4a–4c)

El diseño completo, con cada hecho citado, está en `docs/MACROVERSO-ENCARGO.md`. Lo que no
cambia respecto a la primera versión de este plan:

**Un enlace es un contrato** entre dos salas, que firma el humano:

| Campo | Qué dice |
|---|---|
| Sentido | De A a B, de B a A, o ambos |
| Qué cruza | Solo memorias destiladas, de los tipos elegidos (decisión, hecho, preferencia, pregunta) y solo las que viajan (bodega y puente). **Nunca** el registro crudo, archivos, aberraciones, memorias en enfermería o esclusa, ni credenciales |
| Validaciones | El guardia de privacidad (`src/privacy.mjs`) limpia cada memoria **en la sala que la entrega**; los términos son de toda la Mac |
| Lógica | La sala que recibe las lee **primero con una herramienta** (`pulse-enlaces`), marcadas con el nombre de la otra sala; el recall automático es una fase aparte (3e) que se pregunta. **Nada se escribe en la otra sala** |
| Seguridad | Solo lectura; revocable al instante; con caducidad opcional; los candados viven en la sala que entrega, nunca en la que pide |
| Órdenes | El contrato fija además hasta dónde llegan las órdenes de BISHOP en esa sala: `maxMode ≤ 2` y un tope por hora. `#3`/`#4` nunca viajan por el canal: llegan como propuesta y las arma el humano en esa sala con las llaves de siempre |
| Monitor | Cada lectura cruzada queda registrada en las dos salas como contador, no como burbuja; Salas muestra el tráfico por enlace y el Macroverso lo dibuja como una vena con pulsos |
| Aprendizaje | (D-S15) Una casilla «El Coordinador aprende de él», solo en enlaces que lee el Coordinador, apagada por defecto, que solo el humano marca desde Inicio. Con ella, al exportar sus datos de entrenamiento, Salas toma **todas** las notas que viajan de los tipos firmados (hasta 5,000, limpias en la sala que las entrega, con su propio tope de 6 por hora) y las convierte en pares que nombran su proyecto. Guarda la última copia de cada proyecto para no perderlo si duerme; la borra al quitar la casilla o revocar. Un modelo ya entrenado conserva lo aprendido hasta que se vuelva a entrenar |
| Estado | (D-S16) Una casilla «Comparte su estado», apagada por defecto, que solo el humano marca desde Inicio (BISHOP nunca). Con ella, quien lee también lee el estado canónico de Continuidad (AHP+) del proyecto que entrega: objetivo, fase, siguiente paso, bloqueos, su último traspaso, las decisiones aceptadas y lo abierto, limpio por el guardia de esa sala; nunca git, archivos, evidencias ni sesiones. Herramienta `enlace_state`; cuenta contra `perHour` aparte de las lecturas. Con «aprende» también, entra al entrenamiento del Coordinador como foto con fecha («al 15 de octubre…, para hoy pregúntale») |
| Entregas | (D-S17) Una casilla «Recibe notas entregadas», igual de humana. Con ella, quien lee puede entregar hasta 5 notas a la vez (de los tipos que se sostienen, 600 caracteres) al proyecto del que lee: va contra la flecha. Llegan limpias por los dos guardias y **esperan** en su bandeja (`enlaces-inbox.json`, hasta 50 pendientes) como tarjeta con Aceptar y Rechazar. Solo al aceptarlas —tú desde la página, o un agente de ese proyecto en `#3`/`#4`— entran a su memoria como cualquier nota nueva (en espera primero), citando la línea del registro de su aceptación. Nunca se escribe directo en la memoria de otra sala |

**BISHOP** (D-S07) es el super agente: una sala más —la sala de Salas, `madre salas`— cuyo
agente elige el humano (`@madre` por defecto si Ollama está listo). Responde sobre todas las
salas citando cada una, propone planes y da órdenes con un bloque `pulse-salas` al cierre de su
respuesta, con el patrón de Runs: cada orden es un botón y nada sale hasta que se pulsa, salvo
dentro del techo que un contrato firmó.

| Modo | `#0`–`#1` | `#2` | `#3`–`#4` |
|---|---|---|---|
| Manual | Espera el botón | Espera el botón | Propuesta en la sala destino |
| Híbrido | Se envía sola dentro del contrato | Espera el botón | Propuesta en la sala destino |
| Automático | Se envía sola dentro del contrato | Se envía sola dentro del contrato | Propuesta en la sala destino |

Nunca edita un proyecto: lo que mueve un proyecto lo hace el agente de esa sala, en esa sala,
bajo el guardia de esa sala. Sus memorias se destilan como las de cualquier sala; la sala de
Salas no sirve de origen en ningún contrato.

---

## 7 · Decisiones

Ninguna se toma sin el usuario. Las cerradas llevan su respuesta literal; las abiertas dicen si
el encargo puede asumir la recomendación mientras tanto.

| ID | Decisión | Respuesta / recomendación | Bloquea | Estado |
|---|---|---|---|---|
| **D-S01** | ¿Qué es «RUN» en «aprovechando que ya tenemos RUN»? | «RUN es el módulo Runs que corre comandos.» Se aprovecha su patrón: proponer → botón → correr → tarjeta | — | **CERRADA 2026-10-08** |
| **D-S02** | ¿`madre` sin proyecto abre Salas? | «Sí, abre Salas directamente.» El disparador exacto es D-S09 | — | **CERRADA 2026-10-08** |
| **D-S03** | ¿Qué cruza un enlace? | «Sí» a la recomendación: solo memorias destiladas que viajan, limpias por el guardia de privacidad | — | **CERRADA 2026-10-08** |
| **D-S04** | ¿Dónde se ve lo que cruzó? | «Sí» a la recomendación: herramienta primero; el recall automático es la fase 3e y se pregunta antes | — | **CERRADA 2026-10-08** |
| **D-S05** | Super agente: ¿quién y con qué techo? | «Lo elige el usuario, siempre en modo default 1 y 2 por gobernanza… un meta guardián… otro chat que se abre en Salas… puede dirigir a otros agentes en modo 3 y 4 cuidando la lógica, la protección del proyecto, las acciones y su seguimiento… canales, candados y puentes.» Lectura operativa en el encargo, §1 y §4C | — | **CERRADA 2026-10-08** |
| **D-S06** | Modo automático: ¿se permite? | «De esto se desprenden las demás decisiones»: sí, dentro del techo de cada contrato, con aviso y revocable; `#3`/`#4` nunca solos | — | **CERRADA 2026-10-08** |
| **D-S07** | Nombre del super agente en la interfaz | **BISHOP**, en la familia de ASH, RIPLEY, NOSTROMO y MU/TH/UR. Se puede asumir; renombrar cuesta un commit | — | **ABIERTA** |
| **D-S08** | Dónde vive el proyecto de la sala de Salas (planes y contratos como archivos) | `~/.pulse/salas/`, creada al primer `madre salas`, mostrada en Ajustes para cambiarla. Se puede asumir | 3d | **ABIERTA** |
| **D-S09** | Disparador de D-S02 | Revisada por el humano 2026-10-10: el primer `npx` lleva al **lobby**. Abren el lobby `madre` sin palabra de comando (desde cualquier carpeta), `madre lobby`, `madre salas` y `madre start` desde `$HOME`; `madre start` en otra carpeta abre ese proyecto directo. Ninguna heurística de «¿esto es un proyecto?» | 3d | **CERRADA 2026-10-10** |
| **D-S10** | Cómo queda en el registro una orden de BISHOP | Asumida en 4b tal como se recomendó: el mensaje queda `role: 'user'`, `sender: 'you'`, con `via: 'bishop'` puesto por `Room.order()` (nunca por una petición), la página lo muestra como «de BISHOP · orden n de m», y `src/dataset.mjs` no hace pares con él ni con su respuesta | 4b | **ASUMIDA 2026-10-08** |
| **D-S11** | Gobernanza contra los bucles: el humano hace lo macro hacia todos sus proyectos y lo micro dentro de cada sala; nada se retroalimenta | «La gobernanza los rige para que no haya bucles.» Lectura operativa para 4b/4c: **solo BISHOP ordena**, y solo dentro de un plan que arrancó un mensaje del humano; una sala que recibe una orden no puede ordenar ni delegar hacia fuera (su turno corre con `depth: 1`); el resultado vuelve a la sala de Salas como tarjeta y **no arranca ningún turno**; un plan tiene a lo sumo 4 órdenes y un cierre, y el cierre no abre otro plan; una orden a una sala que ya corre una orden espera o falla, nunca se encola sin tope; el modo automático cuenta contra `perHour` y se detiene con STOP ALL. Lo que no esté aquí no se asume | 4b, 4c | **CERRADA 2026-10-08** |
| **D-S12** | BISHOP como centro del Macroverso | «Sí a S-030 pero me gustaría que el usuario elija quién quiere ser su super agente, pero la gobernanza, contexto y memorias de todas las salas enlazadas viven en el macroverso; levantando bishop en las salas puede consultar cualquiera que sea el proyecto que esté enlazado; y algo muy importante, bishop como wizard de enlaces automático y manual por el humano.» Lectura operativa (4c): el humano elige el agente de BISHOP; con `@madre` solo responde. Contratos, censo y notas enlazadas viven en la sala de Salas. Desde cualquier sala, `/bishop <pregunta>` la despierta si duerme, la pregunta corre allí y la respuesta vuelve solo para el humano (`bishop.answer`, que ningún agente lee sin contrato). BISHOP propone enlaces en su bloque, por su cuenta cuando una pregunta necesita una sala sin enlace (automático) o cuando se le pide (manual); **los firma el humano** con un toque (D-S13) | 4c | **CERRADA 2026-10-08** |
| **D-S13** | ¿BISHOP puede firmar un enlace sin el humano? | «S13 sí puede, modo lectura, pero edición previa autorización humana.» Lectura operativa: BISHOP firma él mismo los enlaces que propone y solo leen, sin órdenes, que caducan en 7 días como máximo (`BISHOP_SIGN_DAYS`); un enlace con órdenes, que deja editar, lo firma siempre el humano con la designación. El contrato lo impone (`signed.by: 'bishop'` solo así; uno guardado que lo rompa no existe), la ruta de firma solo acepta esa firma de un proceso, nunca de una página, la tarjeta y Salas dicen «lo firmó BISHOP» con **Revocar** a mano, y el ajuste «Enlaces de lectura» de la ficha deja al humano firmarlos todos | — | **CERRADA 2026-10-08** |
| **D-S14** | 3e · ¿recuerdo automático de notas enlazadas? | «3e con casillas, es muy buena idea.» Una casilla «Recordar en cada turno» por enlace, apagada por defecto, que solo el humano marca o quita desde Salas (nunca un proceso, nunca el teléfono; BISHOP nunca la marca). Con ella, cada turno de la sala que lee (arriba de GHOST, no `@madre`, no la sala de Salas) recibe hasta 3 notas de los tipos del contrato que viajan, limpias por el guardia de la sala que entrega, en un bloque `linked` del prompt; cada turno así es una lectura del tope por hora y queda con su agente y su turno | 3e | **CERRADA 2026-10-08** |
| **D-S15** | ¿El Coordinador aprende de lo que comparten los proyectos? | «Sí, con ese permiso por proyecto, blindando que no haya pérdida de contexto.» Un permiso nuevo del contrato (`train`), aparte de leer: solo con el Coordinador como lector, solo lo firma el humano desde la página (BISHOP nunca), y quitarlo o revocar el enlace borra la copia que Salas guardó. La exportación toma todo lo que el proyecto sabe de los tipos firmados, no una búsqueda; y en cualquier sala la exportación lee todas las conversaciones del proyecto, no solo la abierta. Que viaje también el estado canónico (AHP+) o que se escriba en otra sala queda fuera: son decisiones aparte (§7) | Aprendizaje | **CERRADA 2026-10-16** |
| **D-S16** | ¿Viaja el estado canónico (AHP+ / Continuidad) por un enlace? | «Las tres d sí a ello.» Un permiso más del contrato (`state`), aparte de leer notas, que solo el humano firma desde la página. El estado se lee en vivo de `.ahp/` en la sala que entrega y por su guardia; para entrenar entra como foto con fecha | Estado | **CERRADA 2026-10-16** |
| **D-S17** | ¿Se escribe en otra sala? | «Las tres d sí a ello.» No directo: notas entregadas (`deliver`) que esperan en la sala que las recibe hasta que esa sala las acepta (el humano, o un agente suyo en `#3`/`#4`). Van contra la flecha: entrega quien lee. Las órdenes siguen pasando solo por el Coordinador (D-S11) | Entregas | **CERRADA 2026-10-16** |
| **D-S18** | ¿Da órdenes el Coordinador con un modelo local? | «Las tres d sí a ello.» Solo después de aprobar un examen fijo (`src/modules/bishop-exam.mjs`): preguntas reales sobre los proyectos (primero las que quedaron fuera del entrenamiento), preguntas sobre lo que nunca se discutió y órdenes simuladas que deben resolverse en esta Mac. Varas: 70 %, 80 % y todas las órdenes. Aprobado, ordena hasta `#1` y no propone enlaces; el resultado vale solo para ese modelo y su digest: reentrenado, vuelve a solo responder | BISHOP | **CERRADA 2026-10-16** |

---

## 8 · Fases

| Fase | Qué | Estado |
|---|---|---|
| 1 | Salas en escritorio, S-001..005 y S-007 | HECHA |
| 2 | Macroverso para ver | HECHA |
| 3a | El Macroverso como flota de NOSTROMOs: pintores compartidos, escena viva, espacio infinito; S-014..S-017 | HECHA |
| 3b | S-008; contratos, candados en la sala que entrega, llave del canal, contadores | HECHA |
| 3c | Herramienta `pulse-enlaces`, monitor en Salas, firma desde Salas y el Macroverso, venas | HECHA |
| 3d | `madre salas`, la sala de Salas, tecla MACROVERSO (D-S08, D-S09) | HECHA |
| 4a | Módulo `bishop`, bloque `bishop`, censo, elección del agente | HECHA |
| 4b | Bloque `pulse-salas`, tarjeta, canal, `via`, resultado como tarjeta (D-S10) | HECHA |
| 4c | Modos híbrido y automático, topes, propuestas `#3`/`#4`, aprendizaje; y D-S12: `/bishop` desde cualquier sala y el asistente de enlaces | HECHA |
| 3e | Recall automático de notas enlazadas, con una casilla por enlace (D-S14) | HECHA |

---

## 9 · Bitácora

Una línea por cambio de estado. Se añade al final, nunca se reescribe.

- `2026-10-08` · Plan escrito. Revisión del ciclo de vida de una sala; se abren S-001..006 y
  D-S01..06. Empieza la Fase 1.
- `2026-10-08` · Fase 1 hecha: `/salas` en cada sala, tecla *Salas* en la barra del escritorio,
  abrir, cerrar (`/api/room/close`, el mismo cierre que una señal), despertar una dormida (lanza
  `bin/madre.mjs` sin shell) y detener todo. Probado de punta a punta con una sala de prueba:
  cerrar la deja dormida en unos segundos y despertarla la abre en unos 12. Arreglados S-001..005
  y S-007, encontrado al hacer S-001.
- `2026-10-08` · Fase 2 hecha: el Macroverso (`public/macroverso.js`), entrado desde Salas con
  pantalla de 900 px o más. Cada sala es un sol con la galaxia de sus memorias en sus proporciones
  reales, las abiertas en la órbita de adentro y las dormidas en la de afuera; quién trabaja
  respira, quién te espera lleva un anillo en tu acento; clic o ← → vuela a un universo y abre su
  ficha. Medido en Chrome a 1440×900 y densidad 2: dibujar un cuadro cuesta 0.4 ms de mediana y
  1 ms en el percentil 95. En el teléfono, cada sala de Salas lleva la misma franja de memorias.
- `2026-10-08` · D-S01..06 cerradas por el humano; el pedido se amplía (§1, 6-8): cada proyecto es
  un NOSTROMO en el Macroverso y el super agente es un chat en Salas que gobierna a todos. Segunda
  lectura del código (modos, Runs, delegación, mensajes, memoria, `@madre`, proceso; y el motor de
  dibujo de NOSTROMO): salen S-008..S-018 y D-S07..D-S10. Se escribe `docs/MACROVERSO-ENCARGO.md`,
  el prompt de ejecución de las fases 3 y 4 con cada hecho citado, compuertas, pruebas y
  presupuestos. Nada construido todavía.
- `2026-10-08` · Fase 3b hecha (rama `enlaces/3b`, sin push). Compuerta de entrada: las citas de
  §2.3–2.5 del encargo confirmadas con `grep` sobre `06ba8b3`, ninguna rota. S-008 arreglado.
  S-013 verificado (la purga sí redacta `memories`); al verificarlo salió S-019 (la purga pierde la
  zona y `refuted_by`), y S-020 anota el límite de la llave. Nuevo `src/enlaces.mjs`: contrato
  (`normalizeContract`, `contractId`, `activeContracts`, `mayServe`), firma y revocación sobre
  `updateConfig` (dos firmas a la vez conservan las dos; revocar sella, nunca borra), llave del
  canal en `~/.pulse/credentials/enlaces.json` (`0600` en `0700`, escrita entera y enlazada bajo su
  nombre: la primera sala gana; con la misma forma que la bodega de un módulo, así `summary()` la
  lista por nombre y tamaño), `askEnlace` (el lado que pide, sin `Origin` ni `x-madre-device`, con
  `{notes}` · `{outdated}` · `{refused}` · `{unreachable}`), `noteCrossing`/`countRecent` sobre
  `<sala>/enlaces.jsonl`. Ruta `GET /api/enlace/memories` en `src/server.mjs`, sección propia
  después de las de Salas: teléfono 403, `Origin` 403, sin llave 403, contrato que no sirve 404
  (`No such link.`, una sola respuesta), CODE000 423, `perHour` 429; entrega solo `travels()` y
  `kind ∈ kinds`, cada texto por `Privacy.redact` de la sala que entrega, nunca `sources` ni nada del
  ledger; `enlace.read` en el ledger con `query` como hash. Decisiones del ejecutor: el tope por
  hora de las lecturas es `orders.perHour` (el contrato tiene un solo `perHour`, §4B); la búsqueda
  con `q` es la de `memory_search` pero sin marcar las notas como recordadas (`track: false`: que otra
  sala lea no es que esta se apoye en la nota); la flecha `a→b` significa que las notas viajan de a a
  b (b pide, a entrega). Ocho pruebas en `test/enlaces.test.mjs` con dos salas reales; suite 623 en
  verde y `pack:check`. Sin herramienta, sin monitor, sin firma desde la interfaz (3c), sin órdenes
  (4b); la regla «la sala de Salas no es origen» espera a que exista esa sala (3d).
- `2026-10-08` · Fase 3a hecha. La física y los pintores de NOSTROMO salen de `public/app.js`
  (2,400 líneas, verbatim por rangos con anclas) a `public/nostromo-engine.js`: lo compartido
  arriba, lo de cada escena cerrado sobre el objeto que recibe `createNostromo`, con tres ganchos
  (`words`, `covered`, `onClang`) para lo que solo la sala sabe. Las pruebas que extraían por
  texto leen el motor; la sala no cambia nada que se vea (captura antes/después) y no empeora
  (S-017). El Macroverso dibuja cada sala con ese motor: lejos, una escena colocada, relajada 60
  pasos y pintada una vez en un sprite transparente (≤ 300 memorias, ≤ 1024 px); cerca, una sola
  escena viva compuesta sobre el espacio, que se gira con el arrastre y en la que se toca una
  memoria para leerla en la ficha; el espacio se arrastra, se acerca con la rueda y vuelve con
  RECENTRAR. Datos por `GET /api/salas/universe?id=` (sin palabras salvo `&full=1`, nunca desde
  el teléfono; `universeOf` en `src/salas.mjs`). Medido en Chrome a 1440×900 y densidad 2 con
  tres salas: vista lejana 0.7 ms de mediana y 0.9 en p95; escena viva de 171 memorias 5.5 ms de
  mediana, lo que cuesta en su sala. S-014, S-015 y S-016 arreglados. Verificado en pantalla:
  flota, elección, memoria leída, Esc en dos pasos, rueda, arrastre, Recentrar, acento de noche
  en tema claro. No verificado: movimiento reducido y pestaña oculta (solo por prueba de código).
- `2026-10-08` · Fase 3c hecha (servidor en la rama `enlaces/3c`, fusionada; interfaz en `main`).
  Salas: sección Enlaces (quién lee de quién, qué cruza, hasta cuándo, lecturas en 24 h y la
  última; Revocar en dos toques) y la hoja de firma (las dos salas, el sentido o los dos, los
  tipos, la caducidad; órdenes solo cuando una es la sala de Salas, con la designación de la otra).
  Macroverso: una vena por contrato con la corriente del que entrega al que lee y un pulso por cada
  cruce; arrastrar un universo sobre otro abre la hoja; la ficha dice los enlaces. La sala: una
  línea de MU/TH/UR al firmar y al revocar; lo que cruza después se cuenta y no se pinta. Probado
  de punta a punta con dos salas reales (pulse y sala-prueba): firma desde la hoja → fila y líneas
  en las dos salas → lectura por `POST /api/enlace/ask` con la llave (3 hechos; sin llave 403) →
  `enlace.received` y la línea en `enlaces.jsonl` → tráfico 1 y luego 2 en Salas, vena y pulso
  en el Macroverso → revocación desde Salas → 404 en el canal y la línea de revocado en las dos
  salas; el contrato queda sellado en `config.json`, no borrado. Hallazgo S-021 del ejecutor
  (`enlace.received` no sabe qué agente pidió). D-S11 cerrada: la regla contra los bucles.
- `2026-10-08` · Fase 3c, parte de servidor, hecha (rama `enlaces/3c` desde `b93928b`, sin push; la
  interfaz de Salas, el Macroverso y la página de la sala se construyen aparte). Compuerta de entrada:
  las citas confirmadas con `grep` sobre `b93928b`, ninguna rota. `projectRoomId` pasa a
  `src/salas.mjs` (el servidor lo reexporta) con `salasProjectRoot` y `salasRoomId`: el id de la sala
  de Salas antes de que exista (3d), calculado sobre la ruta real del estado como lo haría
  `createPulseServer`, así vale igual bajo `/tmp`. Reglas nuevas del contrato con `{ salas }`: la sala
  de Salas nunca entrega; `orders.allowed` solo con ella en un extremo, y entonces la otra sala recibe
  las órdenes; al firmar con órdenes, la designación es el nombre de esa sala (`code: 'DESIGNATION'`
  → 403). Un contrato guardado que rompa esas reglas no existe para `activeContracts`. Módulo
  integrado `src/modules/enlaces.mjs` (ENLACES, encendido por defecto), ficha al importarse y
  servidor MCP `pulse-enlaces` al ejecutarse (rutas resueltas con `realpath`, WIN-004): viaja solo
  en `#1`+ y solo cuando un contrato vigente deja leer a esa sala; `enlace_rooms` y `enlace_search`,
  sin `sends`. Rutas en cada sala: `POST /api/enlace/ask` (la sala pide por sí misma: teléfono 403,
  `Origin` 403, llave obligatoria, 404 sin contrato, 409 origen dormida, 422 tipos fuera del
  contrato, `enlace.received` con la consulta como hash y línea `received`), `POST
  /api/enlace/notice` (`enlace.signed` y `enlace.revoked`, 202; otro tipo 422), `POST
  /api/salas/enlaces` y `/revoke` (firma y revocación desde la propia página; avisan a las dos
  salas si están abiertas, la propia directo al ledger y la otra por el canal; la segunda
  revocación no vuelve a avisar), `kinds` opcional en `GET /api/enlace/memories` (interseca, nunca
  amplía) y `GET /api/salas` con `salas` y `enlaces[].traffic` (`reads24h`, `reads1h`, `lastAt`
  desde `enlaces.jsonl` de la sala que entrega). Decisiones del ejecutor: el aviso de firma solo
  llega a salas abiertas (una dormida lee el contrato al despertar); una sala que no es parte del
  contrato y firma desde su página avisa a las dos por el canal y no anota nada en la suya; `turn`
  de `enlace.received` queda en `null` (S-021). Pruebas: `test/enlaces-module.test.mjs` (dos salas
  reales, punta a punta: firmar desde la página, leer una decisión de A desde B por la ruta y por
  `callTool`, contadores en los dos ledgers, dormida 409, revocar 404 y avisos; y el archivo como
  servidor MCP real por stdio) y reglas de contrato en `test/enlaces.test.mjs`; suite 628 en verde y
  `pack:check`. Sin interfaz (Salas, Macroverso, línea de MU/TH/UR), sin sala de Salas (3d), sin
  órdenes (4b).
- `2026-10-08` · Fase 3d, parte de servidor y línea de comandos, hecha (rama `salas/3d` desde
  `5ae1dca`, sin push; la tecla MACROVERSO en la barra y la tarjeta de Salas primero se construyen
  aparte, en `main`). Compuerta de entrada: `bin/madre.mjs:80` y `:21-35`, `src/cli-args.mjs:9-11`
  y `src/checkpoint.mjs:20-27,33-43,54` confirmadas con `grep` sobre `5ae1dca`; `markOpen`,
  `markProject`, `knownRooms` y `GET /api/salas` existen como dice el encargo, con las líneas
  movidas por 3b y 3c. D-S08 y D-S09 asumidas tal cual: el cuaderno es `~/.pulse/salas` (bajo
  `PULSE_HOME` cuando está), creado vacío por el CLI con `mkdir -p` la primera vez; `madre salas`
  abre su sala exactamente como `madre start --project <cuaderno>` (la misma búsqueda de una sala
  ya abierta, el mismo `openRoom` y su paseo por los puertos, el navegador salvo `--no-open`);
  `madre` sin `--project` abre esa sala solo cuando el directorio actual es `$HOME`, y en cualquier
  otra carpeta sigue abriendo la de esa carpeta. La regla es una función pura, `projectRootFor` en
  `src/salas.mjs`, que `bin/madre.mjs` usa: `--project` gana siempre (también con `salas` y desde
  `$HOME`), y vale para todo comando que trabaja sobre un proyecto (`madre doctor` desde `$HOME`
  reporta el cuaderno). `cwd` y `$HOME` se comparan como rutas reales, nunca como texto
  (`realFolder`: `process.cwd()` es la ruta física y `homedir()` la de `$HOME`, y en esta Mac
  difieren bajo `/var`); `salasRoomId` pasa a la misma regla. `isSalasRoom` en `src/salas.mjs` y
  `GET /api/state` con `salas: true` solo en esa sala, `false` en las demás. `--help` después de
  cualquier comando imprime la ayuda (S-022), que menciona `salas` en inglés como el resto de la
  terminal. Verificado en `test/salas-room.test.mjs`: parse, regla de `$HOME` con un enlace
  simbólico, cuaderno vacío e intacto, `/api/state` y `knownRooms`/`/api/salas` con dos salas
  reales (`here: true` y `salas` igual a su id), y el CLI de verdad sin shell: `madre salas` abre,
  un segundo `madre salas` encuentra la abierta y sale con 0, `SIGTERM` la cierra y borra
  `open.json`, `madre` desde `$HOME` abre la misma sala y desde una carpeta dentro de `$HOME` abre
  la suya. Sale S-023. Suite 633 en verde y `pack:check`. Sin BISHOP, sin órdenes, sin Ajustes para
  cambiar la carpeta (D-S08), sin tocar `public/*`.
- `2026-10-08` · Fase 3d hecha y fusionada (rama `salas/3d`), con su interfaz: la tecla MACROVERSO
  en la barra solo en la sala de Salas (`state.salas`), que abre Salas ya dentro del Macroverso;
  la sala de Salas primera en Salas con su marca. Verificado abriendo la sala de verdad con
  `madre salas` en esta Mac (`~/.pulse/salas`, puerto 4318): `state.salas: true`, Salas la lista con
  el mismo id que usan los contratos, la barra lleva Salas y Macroverso, la tecla entra al
  Macroverso con los cuatro universos (ella incluida), la hoja de firma muestra el bloque de
  órdenes solo con ella en un extremo (hacia pulse), rechaza una designación ajena y acepta la
  correcta sin distinguir mayúsculas («órdenes hasta #1»), y la revocación deja la línea en las dos
  salas. Fases 3a–3d completas; quedan 4a–4c (BISHOP) y 3e (se pregunta).
- `2026-10-08` · Traspaso escrito en `docs/MACROVERSO-TRASPASO.md` para continuar en otra sesión
  (Codex): mapa de lo construido en 1–3d con sus commits, lo que falta (4a → 4b → 4c, 3e se
  pregunta) con sus compuertas, D-S11 como regla de 4b/4c, las once decisiones que esperan al
  humano (S-019, S-021, `perHour` único, D-S10, D-S08, `madre doctor` en `$HOME`, rotación de
  `enlaces.jsonl`, ícono de ENLACES, aviso a dormidas, 3e, número de versión), los problemas
  encontrados y cómo se resolvieron, y el entorno de la Mac (salas abiertas, contratos de prueba
  sellados). Suite 633 en verde y `pack:check` al escribirlo. Nada publicado.
- `2026-10-08` · Continuidad revisada sobre `main` @ `63ab64c` (63 commits locales delante de
  `origin/main`, árbol limpio al iniciar). Las fases 3a–3d siguen cerradas; S-023 permanece
  anotado sin cambio. Se abre S-024 y se detiene 4a antes de código: falta un conducto permitido
  para que el módulo entregue el bloque `bishop` al turno de `@madre`; §6 solo permite editar
  `prompt.mjs`. Preflight de 4b por lectura: `ctx.room` es la `Room` real, `send()` existe y espera
  al turno pero no devuelve id de mensaje (`src/server.mjs:1045-1048`, `src/room.mjs:960-1087`);
  `ctx.record('command.output', …)` acepta el tipo y `renderCommandCard` pinta un `name` distinto
  de `run` (`src/room.mjs:238-244`, `public/app.js:10693-10714`). La correlación de 4b tendría
  que usar el encabezado de orden previsto en §4C.4. Sin código nuevo ni prueba de BISHOP; la
  fase espera la decisión sobre S-024 y su compuerta de aceptación sigue pendiente. Suite
  633/633 en verde (la primera corrida quedó en 632/633 porque el sandbox negó `ps` a Runs;
  la repetición con acceso a `ps` pasó) y `pack:check` pasó.
- `2026-10-08` · El humano autorizó dos excepciones acotadas: S-019 en `src/memory.mjs`
  y S-024 en `src/server.mjs`/`src/room.mjs` para el bloque BISHOP. S-019 corregido:
  la purga conserva todas las columnas de una nota, incluida zona, refutación, contradicción,
  detector, confianza y contadores de recall. La prueba cubre el hecho refutado antes y después
  de reabrir. Al mismo tiempo se corrigió S-025: la exposición y purga incluyen `correction`,
  y la clave de deduplicación de aberraciones se reconstruye con `memoryKey`. Suite 634/634 y
  `pack:check` en verde. Sigue 4a; no se hizo handoff ni publicación.
- `2026-10-08` · Preflight de 4a tras autorizar S-024: se trazó el módulo, el censo, los
  contratos y el callback al prompt. La inspección del adaptador local encontró S-026:
  `briefingFor()` descarta el bloque `bishop` y `SYSTEM` limita las fuentes al archivo de la
  sala y al contexto. Una llamada directa confirmó la omisión. §6 mantiene
  `src/adapters/madre.mjs` en solo lectura; no se abre esa excepción por inferencia. El
  prototipo no se integró: sus cambios se retiraron del árbol y quedaron como borrador en
  `/private/tmp/madre-bishop-4a-s024-wip.patch`,
  `/private/tmp/madre-bishop-4a-bishop.mjs` y
  `/private/tmp/madre-bishop-4a-bishop.test.mjs`. 4a espera decisión sobre S-026;
  4b, 4c y 3e no empezaron. Suite 634/634 y `pack:check` en verde tras retirar el
  prototipo. Sin handoff ni publicación.
- `2026-10-08` · El humano autorizó la excepción S-026 para el adaptador local. Se cerró 4a:
  BISHOP aparece solo en la sala de Salas, permite elegir un agente listo y añade un bloque
  medido de hasta 1500 caracteres con censo y contratos. `@madre` recibe por un argumento
  separado hasta 12 notas leídas con los candados de ENLACES y cita su sala de origen;
  la vista previa no consume lecturas del contrato. El fixture dorado agregó únicamente
  la forma BISHOP porque es un bloque nuevo; los prompts previos conservaron su forma.
  Prueba aislada con tres servidores y Ollama `qwen2.5:7b`: respondió citando Aurora y
  Boreal; al revocar un contrato dejó de recibir las notas de esa sala. Suite 637/637
  y `pack:check` en verde. La primera suite marcó 636/637 por una muestra aleatoria de
  NOSTROMO; su archivo pasó 27/27 aislado y la repetición completa pasó 637/637.
  Sigue 4b; no se hizo handoff ni publicación.
- `2026-10-08` · Preflight de 4b sobre `main` @ `45a7af9`: se confirmó que `ctx.room`
  es la `Room` real y que `send()` espera la respuesta pero no devuelve id, por lo que la
  correlación prevista usa el encabezado de la orden; `ctx.record('command.output', …)`
  y su tarjeta ya admiten `name: 'bishop'`. Aparecieron S-027 y S-028. La función
  `onEvent` del SDK no está conectada a los eventos del servidor, y `Room.send()`
  siempre arranca con `depth: 0` y puede delegar, en contra de D-S11 para una orden.
  §6 no permite ampliar por inferencia esas dos superficies. 4b se detiene antes de
  implementar el canal o la tarjeta; se piden dos excepciones acotadas, con pruebas
  de evento y de no delegación. Suite 637/637 y `pack:check` en verde; el árbol de
  producto sigue en el último commit verde.
- `2026-10-08` · El humano autorizó S-027 y S-028 y pidió corregir el desfase de los documentos.
  Fase 4b hecha. Núcleo, solo dentro de las excepciones: `Room.order()` (S-028) y `wireModules()`,
  `services.recordIn` y `viaPhone` en las rutas de módulo (S-027, excepción 4); `src/dataset.mjs`
  excluye `via: 'bishop'` (excepción 5); la regla 5 de BISHOP en `src/adapters/madre.mjs` le deja
  cerrar con el bloque cuando el contexto lo permite (dentro de S-026). Módulo BISHOP: `parsePlan`
  (último bloque ```` ```pulse-salas ````, nada después, motivo primero, ≤ 4, modo 0-4),
  `resolveOrders` (sala por id o por un nombre único, nunca la de Salas, agente de la tripulación,
  contrato con órdenes, techo; `#3`/`#4` quedan como propuesta), `onEvent` solo sobre respuestas
  del agente de BISHOP a un mensaje del humano (`target: 'you'`, sin plan) → `bishop.plan.proposed`
  o `bishop.plan.ignored`; los planes en `bishop-plans.json` junto a la sala de Salas (los últimos
  40, escritos enteros y renombrados); rutas `send` y `skip` (página de Salas), `order` (la sala
  destino revisa llave, sin `Origin`, sin teléfono, no es Salas, contrato con `receivesOrders`,
  `from`, modo ≤ techo ≤ 2, texto ≤ 2000, agente listo, una orden a la vez, sala no ocupada, tope
  por hora) y `result` (tarjeta `command.output` `name: 'bishop'` ≤ 1200 en la conversación del
  plan; `bishop.plan.closed` cuando no queda nada pendiente). Decisión del ejecutor sobre el
  `perHour` único: el contrato no cambia de forma; las órdenes se cuentan en `enlaces.jsonl` como
  `order`, aparte de las lecturas, cada una contra el mismo número. Otra: una orden a una sala que
  está trabajando responde 409 y el botón sigue disponible; no se encola nada (D-S11). El bloque
  de BISHOP enseña la sintaxis solo cuando un enlace permite órdenes, con un ejemplo de una sala y
  un agente reales, y dice qué salas no se pudieron leer y por qué (dormida, sellada, tope por
  hora). Página: tarjeta del plan con Enviar y Saltar por orden (en el teléfono, «envíala desde la
  Mac»), estados, tarjeta de respuesta con su enlace a la sala, línea de cierre, insignia «de
  BISHOP · orden n de m» y el bloque crudo oculto en la sala de Salas. Pruebas:
  `test/bishop-orders.test.mjs` (bloque, resolución, encabezado frente a `@madre`, y punta a punta
  con la sala de Salas y una sala que recibe: 403 sin llave, desde página, desde teléfono, `#3` y
  sobre el techo sin tocar el registro; 404 de otro origen y tras revocar; 409 una a la vez; 429
  tope; profundidad 1; fuera del dataset; ningún turno nuevo en Salas). Suite 641 en verde y
  `pack:check`. Verificado de verdad en esta Mac con la sala de Salas (4318) y `pulse` (4401):
  Claude como BISHOP propuso un plan válido a la primera, la tarjeta se vio y se envió desde la
  página, `@madre` contestó en `pulse` y la respuesta volvió como tarjeta con el cierre del plan.
  Salen S-029, S-030 y S-031 (arreglado en la misma fase). Se corrigió además la concordancia de la
  línea de enlace de la sala («lee de ella: decisión, hecho»). Desfase corregido: el encabezado de
  §6, `docs/REFERENCE.md` (BISHOP y sus rutas), `docs/SDK.md` (`onEvent`, `viaPhone`), `CHANGELOG.md`
  y `docs/MACROVERSO-TRASPASO.md`, reescrito al estado de este commit. El contrato de prueba quedó
  revocado y BISHOP volvió a su agente por defecto.
- `2026-10-08` · El humano cerró S-030 («sí»: con `@madre`, BISHOP solo responde), autorizó S-029,
  dictó D-S12 y pidió seguir con 4c. Fase 4c hecha. `src/modules/bishop.mjs` se parte en dos: lo puro
  en `src/modules/bishop-plan.mjs` (bloque con órdenes y enlaces, `resolveOrder`, `resolveLinks`,
  planes, encabezados) y el módulo. **Modos** en la ficha de BISHOP (`manual` por defecto,
  `hybrid`, `auto`): una orden sale sola solo dentro del contrato, hasta `#1` en híbrido y `#2` en
  automático, una a la vez por sala; la que no puede salir queda retenida con su motivo y espera el
  botón; una orden que falla o un STOP ALL en Salas detienen el envío automático del plan
  (`bishop.plan.halted`). Cada envío automático deja una línea; una orden en curso se detiene desde
  su fila (`/api/x/bishop/stop` → la sala destino detiene ese turno con `stopTurn`). **Propuestas
  `#3`/`#4`**: llegan a su sala en cualquier modo (encargo §4C.5) como tarjeta «Armar y enviar», que
  escribe `@agente #n tarea` en la caja; enviarla pide la llave de siempre; Salas y el teléfono la
  muestran como «te espera» (S-033 arreglado al hacerlo). **Aprendizaje**: la tarjeta de respuesta
  empieza con `[sala · @agente]`, así lo que se destila en Salas dice de dónde vino. **D-S12**:
  `/bishop` en cualquier sala (despierta la de Salas si duerme), la pregunta corre allí por
  `Room.order()` con su encabezado y sin bloque de órdenes, y su respuesta nunca abre un plan
  aunque traiga uno; vuelve como `bishop.answer`, solo para el humano. El asistente de enlaces:
  líneas `enlace A → B: tipos; N días; órdenes #n` en el mismo bloque (hasta 2), comprobadas como en
  la hoja de Salas; «Firmar» en la tarjeta (con la designación si lleva órdenes) usa la misma ruta
  de firma y avisos; al firmar, las órdenes del plan que esperaban ese enlace se vuelven a resolver
  y, si el modo lo permite, salen. El bloque de BISHOP lista las salas sin enlace y le pide
  proponer el enlace cuando una pregunta lo necesite. Pruebas: `test/bishop-4c.test.mjs` (S-030,
  asistente, y punta a punta con tres salas: híbrido, retención de `#2`, propuesta `#3` en su sala y
  en «te espera», S-029, firma con designación equivocada y correcta, orden liberada por la firma,
  cierre único, STOP ALL, `/bishop` con respuesta fuera del contexto de los agentes y sin plan);
  una mutación que quita el filtro de mensajes traídos por el canal la hace fallar. Suite 644 en
  verde y `pack:check`. Verificado de verdad con la sala de Salas (4318) y `pulse` (4401): Claude
  como BISHOP en híbrido propuso enlace y orden en un plan; la firma desde la tarjeta con «pulse»
  liberó la orden, que salió sola, `@madre` contestó y el plan se cerró; `/bishop` desde `pulse`
  volvió con una respuesta que cita `pulse` por el enlace y dice qué no pudo leer. Salen S-032
  (anotado) y S-033 (arreglado); D-S13 abierta. Enlace de prueba revocado; BISHOP de vuelta a su
  agente por defecto y a `manual`.
- `2026-10-08` · El humano cerró D-S13 («sí puede, modo lectura, pero edición previa autorización
  humana») y autorizó S-032. D-S13: `normalizeContract` acepta `signed.by: 'bishop'` solo para un
  enlace sin órdenes que caduca en 7 días o menos (`BISHOP_SIGN_DAYS`); la ruta `POST
  /api/salas/enlaces` acepta `by: 'bishop'` solo sin `Origin`; el módulo firma con `signLink(…, {
  by: 'bishop' })` los enlaces de lectura de un plan en cuanto lo propone, recortando la caducidad a
  7 días, salvo que el ajuste nuevo «Enlaces de lectura» diga `you`; uno con órdenes sigue esperando
  la firma y la designación del humano. La fila dice «Firmado por BISHOP · hasta …» con Revocar; la
  línea de la sala y la sección Enlaces de Salas dicen «lo firmó BISHOP»; una revocación desde
  cualquier lado marca las filas. El bloque de BISHOP le dice qué firma él. S-032: la sala de Salas
  no delega. Arreglos de paso: el título de la línea de enlace mostraba el objeto del contrato en
  vez de su id; el pie de la tarjeta decía que todo enlace lo firma el humano; una prueba de 4a
  esperaba 1 s a Ollama y fallaba bajo carga (ahora 5 s). Pruebas: reglas de firma en
  `test/bishop-4c.test.mjs` y `test/enlaces.test.mjs`, firma automática en el punta a punta (pide
  30 días, quedan 7; el enlace con órdenes no se firma solo), una página no firma como BISHOP, y la
  delegación sigue apagada en Salas aunque se pida. Suite 645 en verde (con la máquina cargada por
  procesos ajenos fallaron pruebas de tiempos que pasan solas) y `pack:check`. Verificado en vivo:
  Claude como BISHOP propuso un enlace de lectura de `pulse`, lo firmó él mismo por 7 días, el
  turno no llevó el bloque `delegation`, y Revocar desde la tarjeta lo selló en `config.json`.
- `2026-10-08` · El humano pidió S-021 completo («priorizando lógica, permisos y coherencia») y 3e
  con casillas (D-S14). S-021: `Room.runningTurn()` y `#liveTurns` (agente y modo de cada turno
  vivo, por el id de su respuesta); el id viaja a `toolsForTurn`, `bishopForTurn` y el nuevo
  `linkedForTurn`; `pulse-enlaces` manda agente y turno en cada lectura y la sala que pide no lee
  si ese turno no corre ahí para ese agente arriba de GHOST, ni dice si el enlace existe; la lectura
  queda en la conversación de su turno. `enlace.received`, `enlace.read` y `enlaces.jsonl` llevan el
  agente (y el turno del lado que pide); `linkTraffic` da el último agente y su sala; la página pone
  bajo cada respuesta qué leyó de otra sala. 3e: el contrato gana `recall` (apagado por defecto);
  la hoja de firma y cada fila de Enlaces en Salas tienen la casilla (`POST
  /api/salas/enlaces/recall`, solo desde la página); `recallForTurn` en `src/modules/enlaces.mjs`
  trae hasta `RECALL_NOTES` (3) notas por turno en el bloque nuevo `linked` de
  `src/room/prompt.mjs` (después de `recall`; la referencia dorada suma la forma `linked` y las otras
  ocho quedan idénticas byte por byte), cada lectura con `auto: true`, contada contra `perHour`;
  la vista previa no lee y se marca dinámica. Pruebas: `test/enlaces-recall.test.mjs` (casilla
  apagada por defecto, 3 notas, lectura con su turno y agente, nada en GHOST, tope por hora, vista
  previa sin lectura, la casilla solo desde la página, BISHOP no la marca) y la prueba de 3c
  reescrita para leer desde un turno vivo de verdad (sin turno, con otro agente, con un turno que
  no corre, y después de que el turno termina: 409). Una mutación que quita la comprobación de
  turno hace fallar la prueba. Todas las fases del encargo quedan hechas.
- `2026-10-08` · Primera corrección de la ronda de UX que pidió el humano: el autor y el encabezado.
  En la sala que recibe una orden, el mensaje decía «TÚ · TRIPULACIÓN» con una marca «de BISHOP» y
  la burbuja verde del humano; ahora dice **BISHOP** con «orden n de m · la enviaste tú desde
  Salas» o «salió sola desde Salas, en el modo que elegiste», en una burbuja propia. Una pregunta
  de `/bishop` en Salas dice «TÚ · DESDE pulse». El encabezado que lee el agente decía «sent by the
  human» también cuando la orden salió sola; ahora lo dice solo si se pulsó (`orderHeader({ auto })`,
  y la sala que recibe lo arma con lo que Salas le dice). La cita sobre cada respuesta, el reintento
  y las frases de espera leen la tarea sin el encabezado (`relayedOf` en `public/app.js`, ambos
  formatos); la lista de conversaciones ya no lo muestra en nombres ni vistas previas, tampoco en
  las guardadas antes (`src/chats.mjs`, que muestra «BISHOP» cuando quedaron cortadas dentro del
  encabezado). Pruebas en `test/ui-smoke.test.mjs`, `test/bishop-orders.test.mjs` y
  `test/bishop-4c.test.mjs`. Verificado en la sala `pulse`: tres órdenes, incluida una del formato
  viejo, sin ningún «BISHOP ›» visible.
- `2026-10-08` · Segunda corrección de UX: los ajustes de BISHOP en crudo. Los selectores mostraban
  los valores que se guardan (`manual / hybrid / auto`, `bishop / you`) y el estado de la ficha decía
  «on · @claude · hybrid» en inglés. El SDK gana `choices: [{ value, label }]` en un `select` (la
  frase que se lee por cada valor; se traduce con el resto de la ficha; una frase para un valor que
  no existe se rechaza), y las dos pantallas que pintan ajustes de módulo (la ficha en MÓDULOS y
  Ajustes) la usan. BISHOP la declara para sus tres ajustes («@madre · solo responde», «Manual: cada
  orden espera tu botón», «Híbrido: #0 y #1 salen solas», «Automático: hasta #2 salen solas», «Los
  firma BISHOP, por 7 días como máximo», «Los firmas tú») y arma su estado en el idioma de la sala
  («encendido · @claude · órdenes manuales · BISHOP firma los de lectura»); las notas se acortan
  porque las opciones ya se explican. `docs/SDK.md` lo documenta. Verificado en la ficha.
- `2026-10-08` · Tercera corrección de UX: el ruido y los pies. Un plan con un enlace y una orden dejaba
  en Salas seis piezas seguidas; ahora deja tres (la respuesta de BISHOP, su tarjeta y la tarjeta
  de respuesta). Lo que le pasa a un plan se dice en su tarjeta: «salió sola · espera respuesta» en
  la fila, la propuesta llevada a su sala en la fila, el cierre en la cabecera («CERRADO ·
  respondidas: 1», solo los conteos que no son cero) y el alto del envío automático como un aviso
  dentro de la tarjeta más un aviso de MU/TH/UR; una línea suelta solo si la tarjeta no está en esa
  conversación. La línea de enlace firmado o revocado no se repite en Salas cuando una fila del
  plan ya lo dice (`quietLinkLine`, `markRevokedLinks`). Los pies: la tarjeta del plan ya no tiene
  pie (el modo explica en su título qué deja salir), la propuesta `#3`/`#4` dice «Solo corre si la
  envías tú, con tu llave.», y la respuesta de `/bishop`, «Solo para ti; los agentes de esta sala no
  la leen.». «Leyó / recordó N de …» pasa al pie de su respuesta, junto a la memoria usada, en su
  propio renglón (`.link-reads`; el primer nombre, `.mem-cross`, ya era de otra gráfica y la dejaba
  de un píxel de ancho). Verificado en pantalla con las conversaciones de 4c, de D-S13 y de 3e. No
  verificado en pantalla: el aviso de alto dentro de la tarjeta (solo en pruebas del servidor).
- `2026-10-09` · Cuarta ronda de UX, pedida por el humano con capturas: (1) una segunda barra en la
  sala, en la Mac (`#bar-home`, `homeBar()`): Salas con ícono de casa, Recargar y Ajustes con un
  engrane dibujado para MADRE; esas tres teclas salen de la barra que se acomoda y su catálogo, y la
  barra de la sala cede el ancho medido de la segunda (`--home-w`); con ella, el pulso compacto toma
  el lugar de la palabra MADRE a 1160 px en vez de 1040; el teléfono conserva una barra. (2) BISHOP en
  la sala de un proyecto habla con su burbuja: `BRANDS.bishop` (un robot celeste), `renderBishopOrder`
  y `renderBishopAnswer` como filas de agente; `/bishop` se pinta como el mensaje del humano a
  BISHOP (`renderBishopAsk`) y su acuse ya no se ve. (3) Los chips sobre esas burbujas son los de
  una respuesta: «BISHOP», «↳ pregunta», «por @agente · desde Salas», «→ @agente». (4) Las marcas de
  los agentes, sólidas y en relieve (conversación, tripulación de la barra, selector de la caja),
  revirtiendo a pedido la decisión anterior de pintarlas planas. Pruebas de la barra actualizadas.
- `2026-10-09` · Quinta ronda de UX, pedida por el humano con capturas: (1) las marcas de agente
  vuelven a ser planas, de su color vivo y sin brillo, con una sombra corta de capa 3; (2) la sala en
  capas sin transparencias (`--lay-0…4`, sombras `--rise-*`): caja de texto 4 en blanco puro,
  burbujas de agente y humano 3 (la del humano conserva su color), chips de quién/↳ 2, pasos
  delegados 1 con punteado más visible, líneas de la sala 0 planas; misma escalera en grises en el
  tema oscuro; (3) la casa se sacude y el engrane gira al pasar el puntero, y el engrane es un solo
  trazo con su hueco recortado (`evenodd`), así que al abrir Ajustes se ilumina y su centro queda
  hueco; (4) Memoria en Ajustes lleva un chip dibujado para MADRE en lugar del foco. Verificado en
  pantalla a 1280 px en la sala pulse, tema claro y oscuro (este, cambiando el atributo en la página,
  sin tocar el ajuste guardado). No verificado: la animación en pantalla (el panel del navegador
  estaba oculto) ni el teléfono.
- `2026-10-09` · Las líneas de la sala (capa 0), a pedido con captura: con el fondo liso salían como
  bloques rectos, porque su esquina y su aire solo existían bajo `:root[data-wallpaper]` y la página
  borra ese atributo sin fondo de paisaje. Ahora la capa 0 les da su forma siempre (esquina de 18 px,
  centradas, del ancho de su texto) y deja fuera los avisos con color propio (plan, control,
  escalada, alerta, falla), que la escalera aplanaba. El texto bajo «ENLACE» ya no empieza con «·».
- `2026-10-09` · Sexta ronda de UX, doce puntos pedidos con capturas: el cuadro de esfuerzo deja de
  repetir su animación en cada punto del riel; la caja de texto recupera su hundido al enfocarla
  (la capa 4 lo había quitado); el escritorio aparta las ventanas al presionar sobre el fondo vacío;
  barra del editor con el tipo junto al nombre y Leer · Editar · Abrir en crudo en un chip; teclas
  de tamaño con acento; ficha del agente en tres grupos; selector con los no elegidos atenuados;
  tableros de módulos alineados y con cifras que caben; tablas con encabezados y cifras a la
  derecha; MU/TH/UR con sus herramientas junto al riel y el engrane; indicadores de sesión en verde,
  ámbar y rojo de la marca. Y precio de lista estimado para Codex, Gemini y OpenCode
  (`src/prices.mjs`, `test/prices.test.mjs`), verificado en las páginas de OpenAI y Google. No
  verificado: un turno real con precio (gastaría tokens; el servidor de la sala pulse sigue con el
  código anterior hasta reiniciarse), el giro de las teclas al pasar el puntero, el teléfono.
- `2026-10-09` · Séptima ronda de UX, cinco puntos con capturas: «sigue abierto aquí» encaja por
  pregunta y desvanece el borde con más; las fichas de memoria de NOSTROMO son ventanas (hasta
  cuatro, se mueven por el encabezado, la del frente es la seleccionada; el teléfono conserva una);
  NOSTROMO con `CORE_R` 114 (era 104), `NOSTROMO_ORBIT` 360 (300), más empuje entre memorias y un
  encuadre más ceñido; El núcleo deja la terminal y toma el lenguaje de Ajustes y MU/TH/UR (sin
  arranque tecleado, palabras en oración vía `coreWords`); instalar, actualizar y desinstalar un
  módulo preguntan con la hoja de la sala. La prueba de quietud de NOSTROMO compara posiciones a la
  milésima de píxel (fallaba por ruido de punto flotante al cambiar los radios). Verificado en
  pantalla en claro y oscuro (El núcleo), a 1280 y 820 px. No verificado: el modal de desinstalar con
  un módulo propio instalado (no hay uno en esta sala; usa la misma hoja que las demás preguntas).
- `2026-10-09` · Gesto del escritorio: una esfera de agente en la barra es un `span`, no un botón, y
  el gesto la tomaba por fondo (aparecían o se iban las ventanas al tocarla). `NOT_DESK` deja fuera
  las barras, las esferas, el selector y las filas de preguntas y decisiones. Verificado en pantalla:
  la esfera no mueve las ventanas, ni apartadas ni en su lugar; el fondo sigue haciéndolo.
- `2026-10-09` · Profundidad de la conversación por planos, según la especificación del humano
  (referencia «Jerarquía de mensajes»): tokens lógicos `--depth-user` 60, `--depth-critical` 50,
  `--depth-system` 40, `--depth-agent` 30, `--depth-metadata` 20, `--depth-canvas` 0; material por
  plano (sólido el del humano y el crítico, blanco casi opaco el del agente, translúcido el de la
  sala y el de los metadatos) y una sola fórmula de borde y elevación que crece con el plano. Sin
  glow, halo, desenfoque ni cambios de tamaño, letra o color. Sustituye, para la conversación, la
  escalera de tonos de blanco de la quinta ronda (la caja de texto conserva su capa). Verificado en
  pantalla a 1280 px: claro y oscuro, con paisaje y fondo liso, error, relevo, respuesta, mensaje de
  varias líneas, chips y sellos.
- `2026-10-09` · «Sigue abierto aquí» en vidrio líquido, pedido con captura: las píldoras, su
  etiqueta y su × toman el vidrio de la barra (`--sheen`, `--bevel`, borde de medio píxel) con un
  relleno más claro (`--lq-*`) y desenfoque del fondo, permitido aquí porque están sobre la caja y
  no dentro de la conversación que se desplaza. Verificado en pantalla en claro; en oscuro no se
  alcanzó a ver la captura.
- `2026-10-09` · «Sigue abierto aquí», a pedido: sin bisel, brillo ni sombra; el mismo material
  que la fila de modo · modelo · esfuerzo (fondo de la sala al 62 % en claro y 45 % en oscuro,
  desenfoque 18 px y saturación 1.6, filo de medio píxel solo en claro). Verificado en pantalla en
  oscuro: las píldoras y esa fila calculan el mismo fondo, desenfoque y sombra.
- `2026-10-09` · Cuatro ajustes con capturas: el plan se detiene con un botón redondo (`ICON_STOP`,
  `.act.stop`) junto a su título; los botones del aviso de CREATE que falta son cápsulas en oración
  (`askWords`, el agente en minúsculas); se quita el subrayado punteado del esfuerzo «solo este
  mensaje»; la respuesta citada en la caja perdió su margen negativo (escrito para un padding de
  18 px que la caja ya no tiene) y su esquina es concéntrica. Verificado en pantalla en oscuro (el
  plan y el aviso con copias de tarjetas reales; la cita, mostrándola en la caja).
- `2026-10-09` · «Se perdió el efecto glass»: la máscara de desvanecido estaba en la fila
  (`.openq-rail.more-after`), y una máscara en el contenedor lo vuelve la raíz del fondo de sus hijos:
  el desenfoque de las píldoras dejaba de ver el paisaje y quedaba solo su relleno. Ahora el
  desvanecido va en la píldora que el borde corta, medido al dibujar la fila y con un
  ResizeObserver. Verificado: la fila sin máscara, la tercera píldora con su desvanecido.
- `2026-10-09` · Macroverso vivo, pedido con capturas: los universos despiertos y lejanos ya no son
  imágenes fijas; giran, laten y mandan pulsos del núcleo a sus memorias (escena `frozen`, sin
  física por cuadro, `animateFar` con tope de 7 ms por cuadro y 30 cuadros por segundo por
  universo), dibujados al tamaño en que se ven. El motor ajusta luz y tamaños por distancia
  (`nearness`): lejos, brillos suaves, memorias de 1.5 px como mínimo, núcleo 22 % mayor y
  aberraciones compactas; esto también aplica al NOSTROMO de cada sala. Elegir un universo apaga
  todo el espacio (`FOCUS_DARK` 0.62, y el velo del foco de una memoria encima); el cuadro negro
  era el velo del motor llenando el lienzo cuadrado de la escena en vivo, que ahora solo oscurece
  lo dibujado (`source-atop`). Las memorias se abren en ventanas movibles (hasta cuatro). Las venas
  llevan pulsos de ambiente. Medido en la sala de Salas con cuatro universos: un cuadro cuesta en
  promedio 2.9 ms (mediana 3.3, p90 5.3). Verificado en pantalla avanzando cuadros a mano: lejos,
  de cerca (pulse redibujado a 512 px), elegido y con dos ventanas de memoria. No verificado: las
  venas con pulsos (no hay un enlace vigente), y el movimiento en tiempo real en pantalla (el panel
  del navegador estaba oculto). Una vez, el NOSTROMO de la sala pulse se vio con la cámara dentro del
  núcleo tras ticks a mano; no se reprodujo en tres repeticiones (dos con el motor nuevo, una con el
  anterior).
- `2026-10-10` · **El lobby** (pedido del humano: «sala de Salas no se entiende; esto es el lobby principal
  con todos los proyectos»). Decisiones del humano: el primer `npx` lleva al lobby; se agregan
  proyectos con un botón; `madre start` se conserva; BISHOP es una sección del lobby; las reglas de
  Windows quedan para su versión (sin declarar soporte ni no-soporte). Hecho: `madre` sin palabra de
  comando abre el lobby (`cli.named`, `projectRootFor`), servido por el proceso de BISHOP en
  `/salas`; rutas `GET /api/salas/folders`, `GET /api/salas/suggestions`, `POST /api/salas/projects`
  (solo la página del lobby en esta Mac: ni teléfono, ni otro sitio por `Sec-Fetch-Site`/`Origin`,
  ni otro nombre de host; solo carpetas dentro del usuario; nombres y archivos marcadores, nunca
  contenido); asociar escribe `project.json` con el id que daría `madre start` (la memoria de una
  carpeta ya usada vuelve) sin abrir nada; `/api/salas/start` despierta a BISHOP aunque nunca se
  hubiera abierto. En la página: sección de BISHOP, «Agregar proyecto» con sugerencias y explorador,
  asistente de primera vez (agentes · proyectos · abrir; también en `/salas#welcome`). Los textos en
  español ya no dicen «Salas» como lugar ni «la sala de Salas». Pruebas: `test/lobby.test.mjs` y la
  regla nueva en `salas-room.test.mjs`. Verificado en pantalla: el lobby, la hoja de agregar y los
  dos primeros pasos del asistente. No verificado: asociar y abrir proyectos reales desde la página
  (cubierto por pruebas, no se tocó el lobby real), el teléfono.
- `2026-10-16` · El humano aprobó D-S16, D-S17 y D-S18 («las tres d sí a ello»). Estado canónico por enlace (`state`, `/api/enlace/state`, `enlace_state`, foto con fecha en el entrenamiento); notas entregadas con aceptación en el destino (`deliver`, `/api/enlace/deliver`, bandeja, `enlace_deliver`/`enlace_inbox`/`enlace_accept`, tarjeta con Aceptar y Rechazar); examen del modelo local del Coordinador (`/api/x/bishop/exam`, hasta `#1` al aprobar, atado al digest). Pruebas: `test/bishop-exam.test.mjs` y la de punta a punta D-S16/D-S17 en `enlaces-module.test.mjs`.
