<p align="center">
  <a href="https://jossuealcala.com/en/"><img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/madre-banner.svg" alt="MADRE · MU/TH/UR 6000 · INTERFACE 2037" width="100%"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@jossuealcala/madre"><img alt="npm" src="https://img.shields.io/npm/v/@jossuealcala/madre?style=flat-square&label=npm&color=9bff66&labelColor=050605"></a>
  <a href="https://github.com/jossuealcacao-exe/madre/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/jossuealcacao-exe/madre/ci.yml?style=flat-square&label=CI&color=9bff66&labelColor=050605"></a>
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A5%2022.5-9bff66?style=flat-square&labelColor=050605">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencias-0-9bff66?style=flat-square&labelColor=050605">
  <img alt="license" src="https://img.shields.io/badge/licencia-Apache--2.0-9bff66?style=flat-square&labelColor=050605">
</p>

```
MU/TH/UR 6000 · INTERFACE 2037 · MADRE IS READY
```

<br>

# Los agentes que ya tienes.<br>Una sala. Una memoria.

Codex, Claude Code, Gemini CLI y OpenCode trabajando sobre el mismo proyecto,
en la misma conversación, recordando lo mismo.

```
npx @jossuealcala/madre start
```

Eso es todo. No hay cuenta que crear, ni nube que configurar, ni llave que pegar.
MADRE usa las sesiones que esas CLIs ya tienen en tu máquina.

<p align="center">
  <img src="https://raw.githubusercontent.com/jossuealcacao-exe/madre/main/docs/room.png" alt="La sala de MADRE: Codex y Claude respondiendo en el mismo hilo sobre el mismo proyecto" width="100%">
</p>

<p align="center"><sub>Una pregunta. Dos agentes. El segundo leyó al primero.</sub></p>

<br>

---

<br>

## Una conversación, no cuatro terminales

Escribes `@codex` y contesta Codex. Escribes `@claude` y contesta Claude, **leyendo lo que Codex acaba de decir**. Pides una mesa redonda y cada uno opina por turno sobre lo mismo.

Hoy eso son cuatro ventanas, cuatro contextos y tú copiando y pegando entre ellas. MADRE lo vuelve un hilo.

## Una memoria que sobrevive a la sesión

Todo lo que se dice queda indexado. Cuando la conversación pasa de la ventana de contexto, cada agente recibe de vuelta lo que hace falta, citado. Cada diez intercambios, la sala destila lo dicho en notas con tipo: una decisión, un hecho, una preferencia, una pregunta abierta.

Preguntas *«¿por qué elegimos Postgres?»* tres semanas después y la sala contesta, aunque esa decisión la tomara otro agente en otra sesión.

Con [Ollama](https://ollama.com) corriendo, esa memoria además **habla**: `@madre` es un quinto agente, local, gratis, que responde desde todo el archivo con citas y no escribe nada.

## Leen por defecto. Escriben cuando tú lo dices.

Cada mensaje sale con un modo de permiso, y tu modo es el techo de todo lo que ese mensaje arranque.

| | | |
|---|---|---|
| `#1` | **EXCHANGE** | Leer y coordinar. El predeterminado. |
| `#2` | **CREATE** | Añadir archivos nuevos. Lo que ya existía se restaura al terminar. |
| `#3` | **CONTROL** | Editar el proyecto. Checkpoint antes, lista de cambios y `UNDO` después. |
| `#4` | **AIRLOCK** | Comandos, `git push`, deploys. Pide dos llaves. |

También hay `#0 GHOST`, para lo que no debe quedar en ninguna parte.

Subir a `#3` o `#4` es una ceremonia deliberada: MADRE te pide el nombre de la carpeta del proyecto, escrito por ti. Ningún agente puede concederse un permiso escribiéndolo en su respuesta.

<br>

---

<br>

## Lo que MADRE no es

Esto importa más que cualquier función.

**No hay nube.** MADRE no tiene servidor, ni cuenta, ni backend. Corre en `127.0.0.1` y se muere cuando cierras la terminal.

**No guarda tus credenciales.** Cuando das una llave, MADRE la escribe en el archivo donde ese CLI la busca, cerrada a tu usuario, y no conserva copia. Nunca en su config, ni en su registro, ni en sus logs.

**Nada sale por su cuenta.** Lo que un agente lee viaja a *su* proveedor, con tu cuenta y tus límites — como si lo hubieras corrido en tu terminal, porque eso es exactamente lo que MADRE hace. Los dos únicos envíos propios están bajo tu interruptor: una consulta diaria a npm por si hay versión nueva, y los reportes de fallos, apagados por defecto.

**Y te deja leerlo.** Dentro de la sala puedes abrir el documento exacto que MADRE escribe en tu nombre cada turno, el comando exacto con el que lo entrega, y el registro de cada llamada que salió de esta máquina. No es una promesa: es una pantalla.

**Cero dependencias.** Node y nada más.

<br>

---

<br>

## Empezar

Necesitas **Node 22.5** o superior y al menos una de estas CLIs con sesión iniciada: Codex, Claude Code, Gemini CLI u OpenCode.

```
cd tu-proyecto
npx @jossuealcala/madre start
```

La sala abre en `http://127.0.0.1:4317`. **Si no tienes ninguna CLI, ábrela igual**: lo primero que ves es el puente, con un botón para instalar y firmar cada agente ahí mismo. MADRE enseña el comando antes de correrlo y transmite cada línea a la pantalla.

```
npx @jossuealcala/madre doctor    # qué hay instalado, quién tiene sesión
```

La sala habla **español**. El botón `EN` la pasa a inglés.

<br>

**Cómo funciona cada cosa, con los números exactos:** [docs/REFERENCE.md](docs/REFERENCE.md)
**Cómo funciona por dentro:** [docs/INTERNALS.md](docs/INTERNALS.md) · **Escribir un módulo:** [docs/SDK.md](docs/SDK.md)

<br>

---

<br>

## Estado

Beta pública. El núcleo está probado y bajo CI en macOS y Linux con Node 22 y 24; la superficie sigue cambiando. Las decisiones que todavía duelen están escritas, sin adornos, en [*Lo que sale de la máquina*](docs/REFERENCE.md#lo-que-sale-de-la-máquina).

Una versión se cierra cuando está en npm. El detalle de cada una en [CHANGELOG.md](CHANGELOG.md); lo que viene, en el [roadmap](https://github.com/jossuealcacao-exe/madre/blob/main/docs/ROADMAP.md).

Problemas: desde MU/TH/UR (`✎ FEEDBACK`) o en [issues](https://github.com/jossuealcacao-exe/madre/issues).
Seguridad: [SECURITY.md](SECURITY.md) · Contribuir: [CONTRIBUTING.md](CONTRIBUTING.md)

Apache-2.0 · [Jossué Alcalá](https://jossuealcala.com/en/)

<br>

```
NOBODY DELETES MOTHER'S MEMORY.
```
