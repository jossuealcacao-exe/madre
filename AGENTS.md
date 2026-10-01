# MADRE · contexto para agentes

MADRE es una sala local donde Codex, Claude Code, Gemini CLI y OpenCode trabajan sobre
el mismo proyecto con una memoria compartida. Cero dependencias, Node ≥ 22.5, todo local.

`npm test` · `npm run check` · `npm run pack:check`

## Trabajo en curso · puerto a Windows (1.0)

**Se está preparando el puerto a Windows. Antes de tocar cualquier cosa que ejecute
procesos, resuelva rutas o aplique permisos, lee `docs/WINDOWS.md`.**

Lo que hay que saber sin abrir el documento:

- **Hasta nuevo aviso, MADRE no declara soporte ni no-soporte de Windows.** No lo
  afirmes ni lo niegues en la copia del producto, el README, el sitio ni los mensajes
  de la interfaz.
- El puerto va en la rama `windows/1.0`. `main` sigue recibiendo los arreglos de 0.5.x.
- Un arreglo que sirve en las tres plataformas va en `main`; solo lo específico de
  Windows va en la rama.
- Cada hallazgo tiene id permanente (`WIN-001`…). Si encuentras uno nuevo, **añádelo a
  la tabla de `docs/WINDOWS.md` con id nuevo**; no renumeres ni borres filas.
- Los commits del puerto nombran su id: `WIN-004 · los servidores MCP arrancan en Windows`.
- Hay decisiones abiertas (`D-001` nativo vs WSL2, `D-002` Codex sin sandbox). **No las
  cierres por tu cuenta**: son del humano.

Zonas donde ya se sabe que el código asume POSIX y por eso merecen doble cuidado:
`src/adapters/process.mjs`, `src/room/guard.mjs`, `src/checkpoint.mjs`, `src/files.mjs`,
`src/credentials.mjs`, `src/mcp/*.mjs` y los cuatro adaptadores.

## Reglas de la casa

- El núcleo no crece: capacidad nueva vive en `src/modules/` (ver `docs/SDK.md`).
- Una versión se cierra cuando está en npm. La sección abierta del `CHANGELOG.md` es
  la única que se edita.
- Nunca propongas publicar. `npm publish` lo corre el humano.
- Credenciales: se escriben solo donde ese CLI las busca, con `0o600`, y jamás en el
  config, el ledger o un log de MADRE.
- La traducción al español se hace literal por literal, a mano. Nunca con un codemod.
- La copia del producto no menciona el proceso de desarrollo ni sus fricciones.

## Dónde está qué

`docs/WINDOWS.md` puerto a Windows · `docs/ROADMAP.md` hacia dónde va ·
`docs/INTERNALS.md` cómo funciona por dentro · `docs/REFERENCE.md` API y variables ·
`docs/SDK.md` módulos.
