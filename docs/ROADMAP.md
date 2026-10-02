# MADRE · ROADMAP

Dónde va MADRE después de la beta 0.2. Tres líneas, en orden de dependencia, y una regla para que el núcleo no crezca hacia un monstruo: **el modelo es reemplazable; la sala, el ledger, la autoridad y la memoria del proyecto no.**

## 0 · Disciplina de versiones (ya)

- Una versión se cierra cuando está en npm. `Sin publicar` es la única sección abierta del changelog.
- `vX.Y.Z` = tag = release = sección. Parche hasta dos dígitos; menor para modos, módulos, agentes o cualquier cambio en lo que sale de la máquina; mayor solo si el ledger o la memoria dejan de ser legibles por la versión anterior.
- `scripts/release.mjs` hace el cierre de una vez y `madre --version` reporta versión y commit.

## 1 · Endurecer el núcleo (0.2.x)

Antes de más superficie:

- **`room.mjs` en piezas** · hecho: `src/room/{prompt,context,control,escalation,archivist,vectors,budget,ghost,attachments}`; el motor de turnos y planes queda en `room.mjs`.
- **CONTROL con Codex** · hecho en parte: `.env`, `.pulse/`, `.madre/` y `settings.local.json` en solo lectura durante el turno (`src/room/guard.mjs`); `.git/` sigue por restauración.
- **Catálogo y sentinel** siguen absorbiendo cada condición que aparezca en manos ajenas.

## 2 · MADRE AI · la destilación que aprende (0.3)

Hoy la destilación produce notas. La idea: que produzca **una inteligencia propia del proyecto**, local, con Ollama, que crezca con cada intercambio. Tres capas, cada una útil por sí sola y base de la siguiente:

### 2a · Ollama como columna local
- Embeddings locales (`nomic-embed-text` o similar) en lugar de Gemini: recall por significado sin cuota ni clave, y nada sale de la máquina.
- Ollama como archivista: destila con un modelo local; Gemini y los demás quedan como respaldo. La destilación deja de costar tokens ajenos.
- Detectar Ollama como se detecta cada CLI; sin Ollama, todo sigue como hoy.

### 2b · `@madre`, el quinto agente · hecho en `src/adapters/madre.mjs`
- Un adaptador Ollama que responde **desde la memoria de la sala y los archivos del proyecto** (RAG sobre `memory.sqlite` + lectura del proyecto). No delega, no escribe, solo sabe.
- Crece solo: cada nota destilada y cada intercambio indexado amplían lo que `@madre` puede contestar. Es la "IA de MADRE" visible desde el primer día, sin entrenar nada.
- Sirve como juez barato: ¿esta petición ya se resolvió? ¿contradice una decisión?

### 2c · Destilación real: un modelo por proyecto · dataset y receta hechos (`madre dataset`, `docs/training/`); el entrenamiento corre fuera, `@madre` toma `madre-<proyecto>`
- **Dataset primero.** Exportar pares (contexto, respuesta) del ledger, sin GHOST, redactados, con etiquetas de agente y modo, a `~/.pulse/rooms/<sala>/dataset.jsonl`. Acumula desde ahora aunque el entrenamiento llegue después.
- **Entrenamiento local periódico:** LoRA sobre un modelo pequeño (Qwen2.5-Coder 7B o similar) con `mlx-lm` en Apple Silicon, cuando la sala está en reposo y el dataset creció lo suficiente. El resultado se registra en Ollama como `madre-<proyecto>:<fecha>` y `@madre` pasa a usarlo.
- **Evaluación antes de promover:** un conjunto fijo de preguntas del proyecto con respuestas conocidas; el modelo nuevo sustituye al anterior solo si contesta mejor. Todo queda en el ledger.
- Riesgos honestos: datos escasos al inicio, tiempo de entrenamiento en la máquina del usuario, calidad difícil de medir. Por eso 2a y 2b van primero y ya valen solas.
- **La calidad sí se puede medir**, y la señal ya existe sin leerse: los pulgares de cada respuesta solo llegan al dataset. Conectarlos al archivista, darle ciclo de vida a cada memoria y armar solo el set de evaluación está diseñado en [`docs/ZONAS.md`](ZONAS.md).

## 3 · SDK interno de módulos (0.3) · hecho en `src/modules/`

Los cinco módulos actuales tocan cuatro archivos cada uno. Un módulo debería ser **un archivo**:

```
defineModule({
  id, name, vendor, summary,
  settings: { key: default },          // en config.json, con interruptor en MODULES
  detect(),                            // ¿está disponible en este proyecto?
  routes: { 'GET /api/x': handler },   // rutas propias, ya autenticadas por MADRE
  card(state),                         // su tarjeta en MODULES
  conditions: [ ... ],                 // lo que MU/TH/UR debe saber de él
  hooks: { onEvent(event), onTurn(ctx) }
})
```

Con eso RIPLEY, Git Pulse, Image Studio, Ash, el sentinel y el futuro Ollama se vuelven archivos en `src/modules/`, y la sala no cambia cuando llega uno nuevo.

## 4 · Windows (1.0)

MADRE nació en POSIX y su promesa central —«leen por defecto, escriben cuando tú lo dices»— descansa hoy en tres mecanismos que Windows no tiene iguales: el bit de escritura del sistema de archivos, los grupos de proceso y el sandbox que cada CLI monta sobre seatbelt o Landlock. El puerto no es una compatibilidad de rutas: es averiguar si ese techo de permisos se sostiene en Windows, y declarar con razones lo que se sostiene y lo que no.

Cuatro fases —medir, que arranque, que confine, que se explique— con trazabilidad por id, en la rama `windows/1.0`. **Hasta que la fase 4 cierre, MADRE no declara soporte ni no-soporte de Windows.**

El documento único es **`docs/WINDOWS.md`**: hallazgos con id permanente, decisiones abiertas, fases, versiones y bitácora. Nada sobre Windows se decide fuera de ahí.

## Fuera del alcance, a conciencia

- Navegador general, pestañas, historial fuera del proyecto.
- Ejecutar builds o comandos del proyecto desde la sala.
- Cualquier nube de MADRE. Si algún día hay sincronización entre máquinas, será por el ledger y con la llave del usuario.
