# MADRE · ZONAS Y SENTIMIENTO · memoria que sabe cómo aterrizó

Documento único de este trabajo. Todo lo que se decida, se construya o se descarte
sobre reacciones, zonas, sentimiento y donación de corpus se anota aquí y en ningún
otro lado.

| | |
|---|---|
| Estado | **Fase 1 · paso 1 de 4 hecho** |
| Versión objetivo | `0.7.x` para las fases 1–3; la fase 4 no tiene versión y puede no tenerla nunca |
| Origen | Lectura de código del 2026-10-02 sobre `main` @ `e2c1e0a` (0.6.0) |
| Regla en vigor | Hasta que este documento diga otra cosa, **nada de lo que aquí se describe sale de la máquina** |

---

## 1 · Qué es esto y qué no

MADRE ya recuerda. Lo que no sabe es **si lo que recuerda sirvió**.

Hoy la destilación trata todos los intercambios igual: el archivista toma el lote
más reciente sin destilar, lo resume en hasta cinco memorias y las guarda. Una
respuesta que resolvió el problema y una que te hizo perder la tarde pesan lo
mismo. El ROADMAP 2c ya nombró esto como riesgo honesto: «**calidad difícil de
medir**».

Este trabajo cierra ese hueco con la señal más barata que existe: **la que el
humano ya está dando y nadie está leyendo**.

**Dentro del alcance:** que una reacción llegue al archivista; que una memoria
tenga ciclo de vida en vez de existir o no existir; que el set de evaluación del
entrenamiento se arme solo; que el humano pueda marcar lo que le costó, no solo
lo que falló.

**Fuera del alcance (fases 1–3):** cualquier cosa que viaje. Las reacciones son
una lectura local, igual que las decisiones vigentes y las preguntas abiertas.
**Ninguna reacción entra jamás en un prompt de agente.** Pondera y selecciona el
corpus que recibe el destilador; no se le pega al modelo como «el humano le puso
pulgar arriba».

---

## 2 · Lo que ya está listo

No está en cero. Existe y se verificó por lectura:

- **La reacción.** `Room.rateMessage(messageId, 'good'|'bad'|'none')` emite
  `message.rated` (`src/room.mjs:620`), expuesto en `POST /api/messages/rate`
  (`src/server.mjs:1256`) y con pulgares por burbuja (`public/app.js:1920`).
- **Un lector, y solo uno.** `src/dataset.mjs:31` pliega el ledger a
  `messageId → good|bad`. `bad` excluye el par del corpus (`:54`); `good` se
  guarda como metadato y **no sube, ni duplica, ni prioriza nada** (`:63`).
- **El empalme completo**, sin trabajo de esquema:
  `message.rated.messageId` → `entries.message_id` → `entries.sequence` →
  `memories.sources` / `from_sequence..through_sequence`.
- **Las cinco clases de memoria**, cerradas y validadas:
  `decision · fact · preference · question · aberration` (`src/memory.mjs:37`).
  Una clase desconocida se descarta, nunca se fuerza (`:435`).
- **Medio ciclo de vida, sin nombre.** `refuted_by` saca una memoria del recall;
  las aberraciones están vedadas en ambas rutas de búsqueda (`src/memory.mjs:631`,
  `:663`, `:677`). Es una esclusa y una cuarentena que nadie llamó así.
- **El entrenamiento local**, entero: `madre dataset` → LoRA con `mlx-lm` →
  GGUF → `ollama create madre-<proyecto>` (`docs/training/`).
- **Patrón de migración aditiva** ya establecido en `src/memory.mjs:213-236`.

---

## 3 · Trazabilidad

### ZN · Los dos ejes

Una reacción responde dos preguntas **independientes**. Confundirlas arruina la
señal: una respuesta puede ser correcta y haberte costado media hora.

| | eje | pregunta | gobierna |
|---|---|---|---|
| **ZN-001** | VEREDICTO | ¿funcionó? | qué entra al corpus y a qué zona va la memoria |
| **ZN-002** | COSTE | ¿qué me costó? | nada automático; es lectura para el humano y para la evaluación |

**ZN-001 · Veredicto.** Hoy son dos valores. El vocabulario propuesto son cuatro,
porque «4 de 5 estrellas» no es accionable para un destilador y esto sí:

| valor | significa | efecto |
|---|---|---|
| `good` | sirvió | la memoria nace en PUENTE |
| `bad` | falló | el par no entra al corpus (ya ocurre); la memoria nace en ENFERMERÍA |
| `preference` | así lo quiero | se destila con clase `preference` forzada |
| `never` | nunca más | par negativo explícito; la memoria nace en ESCLUSA |

`good` y `bad` se conservan con el mismo nombre y el mismo significado: lo que
existe no se renombra.

**ZN-002 · Coste.** Un solo bit opcional, separado del veredicto. No alimenta
nada automáticamente en la fase 3; se registra y se muestra. Convertirlo en peso
es una decisión posterior y deliberada (D-005).

### ZN-010 · Las zonas de la NOSTROMO

Las cinco clases dicen **qué es** una memoria. Las zonas dicen **qué estatus
tiene a bordo**, y eso es lo que gobierna el recall. Son ortogonales: una
`decision` puede estar en cualquier zona.

| zona | qué contiene | recall | de dónde llega |
|---|---|---|---|
| **BODEGA** | recién destilada, sin confirmar | sí, con peso bajo | toda memoria nace aquí |
| **PUENTE** | confirmada por el humano | sí, con peso alto | veredicto `good` sobre su rango |
| **ENFERMERÍA** | en cuarentena: contradice algo, o falló | **no** | veredicto `bad`, o aberración detectada |
| **ESCLUSA** | expulsada, se conserva para no volver a aprenderla | **nunca** | veredicto `never`, o refutada |

Esto no inventa un mecanismo: **formaliza y unifica el que ya existe a medias.**
`refuted_by` es la esclusa; la veda de aberraciones es la enfermería. Hoy son dos
reglas sueltas en tres `WHERE`; con zonas son una columna.

Y le da al destilador algo que hoy no tiene: su lista de «no repitas» (hasta 12
memorias conocidas, `src/distiller.mjs:31-57`) puede servirse **de PUENTE
primero**, y la ESCLUSA puede entregarse como negativos explícitos.

### ZN-020 · La ventana de gracia

**Este es el problema serio, y manda sobre todo lo demás.**

La destilación dispara a las 10 entradas o a los 10 minutos de reposo
(`src/room/archivist.mjs:53-67`). El humano reacciona **después** de leer. Para
entonces el lote suele estar destilado con `distilled=1`, y **no existe operación
de des-destilar**.

Sin resolver esto, una reacción llega tarde el 90 % de las veces y la función
entera no sirve. Opciones en D-001.

### ZN-030 · Trampas conocidas

- **ZN-031.** `ratingsFrom` (`src/dataset.mjs:31`) trata cualquier valor que no
  sea `good`/`bad` como *borrar*. Ampliar el vocabulario tocando solo el validador
  de `src/room.mjs:622` **borra los veredictos nuevos en silencio al exportar**.
  Los dos cambian en el mismo commit, con una prueba de ida y vuelta.
- **ZN-032.** `undistilled()` (`src/memory.mjs:408`) selecciona por recencia y
  presupuesto de caracteres; `markDistilled` es todo-o-nada sobre un rango
  contiguo, y el bench de tres fallos se indexa por `fromSequence`
  (`src/room/archivist.mjs:114`). Filtrar o reordenar el lote rompe esa suposición.
- **ZN-033.** `message.*` y `agent.*` están reservados al Room
  (`src/room.mjs:213`). Un módulo externo no puede grabar `message.reacted`:
  o método de Room, o namespace propio.
- **ZN-034.** Añadir columna a `memories` es `ALTER TABLE` aditivo.
  **No subir `MEMORY_SCHEMA_VERSION`**: eso reconstruye `entries` y las memorias
  destiladas están deliberadamente a salvo de esa reconstrucción
  (`src/memory.mjs:124-125`).
- **ZN-035.** Las reacciones son mutables y `ratingsFrom` es un pliegue del ledger
  con última-escritura-gana. Cualquier peso derivado que se escriba en SQLite
  deriva del ledger y se vuelve a plegar; no se acumula.

---

## 4 · Decisiones abiertas

**D-001 · ¿Cómo se resuelve la ventana de gracia?** (ZN-020) — **CERRADA 2026-10-02: (c).**
La reacción mueve la memoria de zona sin reescribir su texto. Es lo que el propio
código ya creía: «*what a refutation changes is its standing, not what it said*»
(`src/memory.mjs:231`). No retrasa la destilación, no reabre un lote, y una
reacción sirve aunque llegue días después.
Los tres caminos que había:
**(a)** Retrasar la destilación de un lote hasta que su entrada más nueva tenga
cierta edad. Simple, pero retrasa toda la destilación por una reacción que quizá
no llegue.
**(b)** Destilar como hoy y abrir un camino de re-destilación para el rango que
recibió una reacción tardía. Más trabajo, no retrasa nada, y obliga a definir qué
pasa con la memoria ya escrita.
**(c)** No re-destilar: la reacción tardía **mueve la memoria de zona** sin
reescribir su texto. Lo más barato y probablemente suficiente — la zona es el 90 %
del valor; el texto ya está bien.

**D-002 · ¿El veredicto se amplía o se añade un campo aparte?**
Ampliar `rating` mantiene una sola señal, y arrastra ZN-031. Un campo nuevo deja
`rating` intacto a costa de dos conceptos donde el humano ve uno.

**D-003 · ¿La zona es columna derivada o estado propio?**
Derivada del ledger en cada lectura es siempre correcta y más lenta. Columna
materializada es rápida y puede desincronizarse (ZN-035).

**D-004 · ¿Qué hace el recall con BODEGA vs PUENTE?**
Hoy la fusión es `lexicalWeight: 0.55` (`src/memory.mjs:367`). Un multiplicador
por zona es trivial de escribir y difícil de calibrar sin datos. Puede quedar en
1.0 para ambas en la fase 1 y medirse después.

**D-005 · ¿El coste (ZN-002) llega a pesar alguna vez?**
Mi recomendación es que no automáticamente. Una respuesta cara pero correcta no
es basura; es una señal para el humano, no para el modelo.

**D-006 · ¿La donación existe?** Ver §6. Requiere revertir explícitamente una
decisión escrita en `docs/ROADMAP.md`.

---

## 5 · Fases

Cada fase vale sola y se puede soltar sin la siguiente.

**Fase 1 · El segundo lector** (`0.7.0`) — paso 1 de 4 hecho
| paso | qué | estado |
|---|---|---|
| 1 | la zona existe y no cambia nada | **hecho** · `MEMORY_ZONES`, columna, migración, equivalencia probada |
| 2 | el recall habla de zonas en vez de dos vedas sueltas | pendiente |
| 3 | la reacción mueve la zona | pendiente |
| 4 | la zona se ve en NOSTROMO | pendiente |

La señal que ya existe llega al archivista. Resolver D-001. Columna de zona en
`memories` (ZN-034). Un `bad` excluye su rango del lote, igual que ya excluye el
par del corpus — misma regla, dos lugares. Un `good` nace en PUENTE. Sin
vocabulario nuevo, sin UI nueva.
*Verificable:* una respuesta marcada mal no produce memoria en recall.

**Fase 2 · El vocabulario** (`0.7.x`)
`preference` y `never`. Toca `src/room.mjs:622` y `src/dataset.mjs:31` en el mismo
commit (ZN-031). Los cuatro botones en la burbuja.
*Verificable:* un veredicto nuevo sobrevive una exportación de ida y vuelta.

**Fase 3 · Zonas y coste** (`0.7.x`)
Las cuatro zonas visibles en NOSTROMO, que ya tiene colores por clase
(`public/app.js:228`). `refuted_by` y la veda de aberraciones se expresan como
zona. El eje de coste. **El set de evaluación del paso 4 de
`docs/training/README.md` se arma solo**: lo que está en PUENTE es la verdad
conocida contra la que se mide un modelo nuevo antes de promoverlo.
*Verificable:* el paso 4 deja de ser un checklist a mano.

**Fase 4 · Donación** — sin versión. Ver §6.

---

## 6 · La donación de corpus

El interés está declarado: nutrir la IA local con lo que la comunidad aprende.
Lo que sigue no es un no; es lo que hay que resolver antes de que sea un sí.

### 6.1 · Choca con una decisión escrita

`docs/ROADMAP.md`, bajo «Fuera del alcance, a conciencia»:

> «**Cualquier nube de MADRE.** Si algún día hay sincronización entre máquinas,
> será por el ledger y con la llave del usuario.»

Un corpus comunitario es una nube de MADRE. Esa decisión se revierte a propósito
y por escrito, o no se hace (D-006).

### 6.2 · Lo que el código promete hoy

- **`src/outbound.mjs` no es un log, es un contrato.** Cada dirección alcanzable
  está declarada en el código con su qué/cuándo/dónde-se-apaga; parchea `fetch`
  global para que ningún módulo pueda evitar el registro; y una llamada no
  declarada se le muestra al usuario como «fue a una dirección que nada aquí
  declara». Subir un corpus es una entrada nueva ahí, visible, con su conteo de
  bytes.
- **Lo único con contenido de usuario que sale hoy es el reporte del centinela**:
  una traza redactada, cuya declaración dice literalmente *«tus palabras no están
  en él»*. Un corpus es, por definición, tus palabras. El precedente va en contra.

### 6.3 · La redacción no alcanza

`exportDataset` ya produce JSONL redactado, deduplicado y partido. **Esa es
exactamente la trampa: mecánicamente es trivial.** Lo que falta no es plomería.

`Privacy.redact` quita términos nombrados, claves, correos y rutas de home
(`src/privacy.mjs:123-137`). **No quita** nombres de proyecto, rutas relativas del
repo, identificadores internos, ni lo que un agente citó de `AGENTS.md`.

Y el detalle que decide: **`pairsFromEvents` mete el nombre del proyecto en el
system prompt de cada par** (`src/dataset.mjs:16`). Un corpus compartido de una
sala real sacaría el nombre del proyecto en cada línea.

### 6.4 · La forma que no rompe nada

Por orden de riesgo, de menor a mayor:

1. **Recetas, no datos.** `docs/community/` ya funciona así. Compartir el
   `Modelfile`, los prompts de destilación, la taxonomía de zonas, los sets de
   evaluación: el método, no el material. **Riesgo cero, y empieza hoy.**
2. **Donación por pieza, con revisión humana.** Alguien publica *una* memoria
   concreta que decidió donar, como un PR. Opt-in por item, nunca por sala, nunca
   automático. Procedencia explícita y licencia explícita.
3. **Corpus agregado.** Requiere, como mínimo: opt-in por sala, redacción
   ampliada (proyecto, rutas, identificadores), revisión de contenido antes de
   publicar, y una entrada declarada en `DESTINATIONS` con su interruptor.

### 6.5 · Nota práctica

Esta sala corre sobre trabajo de Come Verde. Un corpus de aquí llevaría nombres
de proyecto y lógica interna en cada línea. Cualquier prueba de donación se hace
sobre una sala de juguete, nunca sobre una sala real.

---

## 7 · Quién está enterado

`AGENTS.md`, `CLAUDE.md` y `GEMINI.md` apuntan a este documento cuando empiece la
fase 1. No lo copian.

---

## 8 · Bitácora

| fecha | qué |
|---|---|
| 2026-10-02 | **Paso 1/4 de la fase 1.** Cuatro zonas (`hold · bridge · medbay · jettisoned`), columna aditiva en `memories`, sembrada una sola vez desde las dos reglas que el recall ya aplicaba. `flagAberration` y `clearAberration` la mantienen al día. `zoneFor()` es la función de equivalencia que lo hace demostrable. Sin cambio de comportamiento. Verificado sobre una base real de 158 memorias: 142 · 14 · 2, cero filas discrepantes. |
| 2026-10-02 | **D-001 cerrada: (c)**, la reacción mueve de zona sin reescribir el texto. |
| 2026-10-02 | Documento abierto. Lectura de código sobre 0.6.0: la reacción ya existe (`message.rated`) y tiene un solo lector (`src/dataset.mjs`). Diseño de dos ejes, cuatro zonas y cuatro fases. D-001 a D-006 abiertas. Fase 4 sin versión, pendiente de revertir una decisión del ROADMAP. |
