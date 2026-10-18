# MADRE SDK · write your own modules

A MADRE module is **one file**. No build, no dependencies, no signing up anywhere. You copy it into a folder, reload the modules from «Create your module» in MODULES, and it shows up on the board with its switch. You can write it by hand or ask an AI for it, with this document as context.

## Where it lives

| Folder | Scope |
|---|---|
| `~/.pulse/modules/*.mjs` | All your rooms |
| `<proyecto>/.madre/modules/*.mjs` | That project only |

No agent can write there: `.madre/` is a forbidden zone in CONTROL and AIRLOCK, and `~/.pulse` is outside every project. A module gets into MADRE only because you put it there.

## The file

The `export default` is a plain object. MADRE wraps it with `defineModule`. There are two complete
examples, and both work as is:

| | what it teaches |
|---|---|
| [`hello-module.mjs`](../sdk/hello-module.mjs) | the minimum: a switch, one setting, a `/hello` command |
| [`connector-module.mjs`](../sdk/connector-module.mjs) | a real connector: key in the vault, declared destination, and **a single file that is the module page when imported and the MCP server when executed** |

Start with the first one. If your module talks to something outside this computer, copy the
second: that shape can't be guessed, and the obvious way to write it fails **silently** (see
"A file that is also a server", below).

```js
export default {
  id: 'hello',            // kebab-case
  name: 'HELLO',
  summary: 'Qué hace, en una frase.',
  settings: { enabled: false, greeting: 'hola' },
  async status(ctx) { return { status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? 'on' : 'off' } }; },
  slash: [{ name: 'hello', usage: '/hello [name]', summary: 'Saluda.', async execute(ctx, args) { return { ok: true, title: 'HELLO', text: `${ctx.settings.greeting}, ${args[0] ?? 'crew'}` }; } }],
};
```

**Your module does not import packages.** Not MADRE, not the SDK, nothing from npm. Before installing it, MADRE copies your file to a separate temporary folder and loads it there —that way it checks what it is without running it where it lives— and that folder has no `node_modules`: an `import` by package name doesn't resolve and the installation fails.

**Node builtins do work**, always: `node:fs`, `node:url`, `node:tls`, `node:child_process`. That's enough to speak any protocol. What there isn't is anything to install.

If you need `defineModule` —to compute something before defining the module, for example— **MADRE hands it to you**: export a function and you receive it as an argument.

```js
export default ({ defineModule }) => defineModule({
  id: 'mi-modulo',
  name: 'MI MÓDULO',
  // …lo que hayas calculado arriba
});
```

> The modules that ship with MADRE do write `import { defineModule } from './sdk.mjs'`, because they live inside the package. **If you ask an agent to write one for you, it will read those files and copy that line** — and it won't work. Tell it to export a plain object, or the function above.

## What a module can declare

This table is **the complete contract**: 38 fields, not one more. Any other field you write, MADRE
tells you about at install time ("I didn't understand these fields") instead of silently ignoring it. A test in
the suite compares this table against the code, so if they ever drift apart, it's a failure.


| Field | What it is |
|---|---|
| `id`, `name`, `vendor`, `summary`, `creates`, `requires` | Its page in MODULES. `summary` is one sentence: what it does. `creates` and `requires` are short lines, one idea each |
| `version` | Yours, and it starts at `1.0.0`. If you don't declare it, the page shows the file's date |
| `tracks` | If your module wraps something from outside, its version isn't yours: it's that thing's. Declare `{ name, npm }` or `{ name, github }` and return the version found in `status(ctx)` as `runs: [{ name, version }]`. MADRE shows that version and looks for a newer one on its own, once a day, with the page's ↻ button to check now |
| `updatePlan(ctx, { latest })` | How that new version is brought to this computer: `{ command, args, display, note, after }`. MADRE shows `display` and runs nothing until the human has read it; the output lands in the room line by line. With no command, return `{ command: null, note, download }` and the page sends you to download it |
| `updates` | An https `{ url }` where you publish **your own module**. With that, its page gets a button that fetches the file, verifies it the same way as an installation, and replaces it if it passes. If you installed it from a file, MADRE remembers which one and you don't need to declare anything: edit it and ask for a new copy |
| `settings` | Default values. They live in `~/.pulse/config.json` under `modules.<idEnCamelCase>`; `enabled` is the switch for every project, and `rooms` keeps what each project said, which wins. MADRE works it out for you: `ctx.settings.enabled` is already this project's |
| `status(ctx)` | What the card shows: `{ status: { installed, detail }, preflight: { ok, problems }, install: { display } }`. `install` is returned from here; it is not a top-level field of the module |
| `status(ctx)` → `runs` | What your module manages that isn't MADRE: `[{ name, version, target }]`. `version` is what you found on this computer (`null` if it isn't there), `target` is what you would install. If it matches `tracks.name`, that is the page's version |
| `toggle(ctx, payload)` | Replaces the default switch; `confirm: 'texto'` asks for confirmation before turning on |
| `onToggle(ctx, enabled)` | Reacts to the switch |
| `ready(ctx)` | What you ask before turning on, in one project or in all (from the Market too): `null` when ready, `{ status, body: { error } }` when not. Turning off never asks it |
| `footer` | Up to two keys beside MADRE's version, bottom right, while your module is on: `[{ icon: 'heart' \| 'star' \| 'link', label, text, action, url }]`. Words can be one sentence or `{ en, es }`; `url` must be https and opens in a new tab. MADRE draws it: on hover it shows `text` and a button with `action` |
| `slash` | `/name` commands that run on the server with your `ctx` and return `{ ok, title, text }`. The room shows them as a card and the agents read them |
| `toolsForTurn(ctx, turn)` | MCP servers for an agent's turn: `[{ name, command, args, env, tools, sends, brief }]`. MADRE attaches them to the CLI in its isolated run and describes `brief` to the agent. `turn` carries the agent, the mode, the lease, the folder, the port, and `turn.turn`: the id of the reply that turn will write. If your server calls back to the room on behalf of the turn, send that id; `ctx.room.runningTurn(id)` tells you whether it is still running and for which agent |
| `toolsForTurn` → `sends` | Which of your tools **send something outside**. The core withdraws them below `#4` AIRLOCK: the model isn't even told they exist. See below |
| `reaches` | Where your module reaches, in the same four answers MADRE gives about its own. See below |
| `secrets` | The keys you need, declared instead of drawn: `[{ name, label, note, where }]`. MADRE draws the field, keeps it in its vault under your id, and gives it back to you through `ctx.vault`. See below |
| `routes` | Your own HTTP routes: `{ method, path, handler(ctx, { payload, params, url, request, viaPhone }) }` → `{ status, body }`. `viaPhone` is `true` when the request comes from a paired phone: deny it yourself if your route belongs to the Mac |
| `onEvent(ctx, event)` | Every ledger event of every live conversation in the room, while your module is on. `ctx.room` and `ctx.chat` are that conversation's, and `ctx.record` writes into it. It runs separately: whatever it takes long on or fails at doesn't stop the room. As always, a module doesn't fabricate messages or turns |
| `controls` | Your module's settings, declared instead of drawn: `[{ key, label, type: 'select' \| 'switch' \| 'text', options, choices, note, invert }]`. MADRE draws them on the page and saves them in your block of `config.json`. In a `select`, `choices: [{ value, label }]` says which phrase the person reads for each value that gets saved (if you give it, `options` comes from there); without it, the person reads the value as is |
| `onSettings(ctx, settings)` | Tells you when the human changed one of your `controls`, in case something live needs to know |
| `conditions` | Entries for the MU/TH/UR catalog, with a remedy per platform |
| `kind` | `'builtin'` (the default) changes how MADRE behaves and lives in `config.json`; `'installer'` writes into the project with a command the human confirms before it runs |
| `configKey` | Your block in `config.json`. By default it is your `id` in camelCase; declare it only if you want a different one |
| `card` | Which card MADRE draws. A module of yours leaves the default value: the named cards are the ones MADRE ships drawn for its own |
| `models` | The models your module chooses between, if it wraps something that has them. They show up on the page |
| `package` | The npm package that installs what your module manages, if there is one |
| `confirm` | A text. If it is there, turning on the switch asks for confirmation and doesn't turn on until the human gives it |
| `toggledEvent`, `toggledBody` | What gets added to the `extension.toggled` event and to the notice the room sees when your module is turned on or off |
| `preflight(ctx)`, `detect(ctx)`, `installCommand(ctx)` | **Legacy**, from when a module could only be an installer. They still work; for something new, return `preflight` from `status(ctx)` as above |
| `describe(ctx)` | MADRE builds it from everything above. **Don't declare it**: it is on the list because the object carries it, not because you have to write it |

### Can it connect to *X*?

That doesn't depend on MADRE. A module can do whatever a Node process can do on your
computer: speak TLS, start a server, store a key. **It depends on how that service
lets a human hand over their own credential**, and that falls into three tiers:

| | what the service asks for | does it work on install? |
|---|---|---|
| **A** | a static key in minutes: personal token, API key, app password. No app to register, no review | **yes** |
| **B** | that each user register their own app (OAuth without restricted permissions) | yes, but signing up stops being "paste this" — and you would have to write OAuth |
| **C** | review, security assessment, or verified publisher | **no**: each user would have to be their own developer |

Almost everything useful is in **A**: GitHub, GitLab, Linear, Notion (internal integration), Jira,
Slack, Discord, Telegram, Stripe, Shopify, Cloudflare, Odoo, any database, and any
API that accepts an `Authorization: Bearer`. In **B**: Google Calendar and Drive, Microsoft Graph,
Mercado Libre. In **C**: Gmail for reading, all of Meta, banking.

**The rule**, if you don't want to read the table: it's worth it when the credential can be obtained in less
than five minutes without being a developer, can be revoked on its own, and what your module brings in or sends out fits in one
line of the page. The long catalog, and why, is in
[§6 of `CONECTORES.md`](https://github.com/jossuealcacao-exe/madre/blob/main/docs/en/CONNECTORS.md#6--qu%C3%A9-alcanza-un-m%C3%B3dulo-y-de-qui%C3%A9n-es-el-muro), in the repository.

### A file that is also a server

`toolsForTurn` returns `args` that point to a file, and you only have one. You don't need two:
**yours is the module page when MADRE imports it and the MCP server when MADRE executes it.** It knows
which of the two it is at the end of the file.

```js
import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const SELF = fileURLToPath(import.meta.url);

// …export default { …, toolsForTurn: () => [{ command: process.execPath, args: [SELF], … }] }

const real = async (p) => (p ? realpath(p).catch(() => p) : null);
if ((await real(process.argv[1])) === (await real(SELF))) serve();
```

**Resolve both paths before comparing them.** `process.argv[1] === SELF` looks the same and almost
always is: when MADRE launches it, it passes the same `SELF` that Node's loader already resolved.
But as soon as **you run the file yourself by hand to test it** —`node ~/.pulse/modules/tuyo.mjs`, or
any path that goes through `/tmp`, which on macOS is a link to `/private/tmp`— `argv[1]` keeps
what you typed and `SELF` doesn't. The comparison comes out false, `serve()` never runs, the process starts,
answers nothing and **exits successfully**. It doesn't print an error because, on paper, there wasn't one.
Two lines save you that afternoon.

### If your module talks to an outside service

Declare where it reaches. `src/outbound.mjs` is not a log of outgoing traffic: it is a contract, and
it patches global `fetch` so that no module can get around it. A connector that doesn't declare its
destination shows up in the log as "went to an address nothing here declares" — true, and
useless to someone trying to tell your module apart from a leak.

```js
reaches: [{
  id: 'gmail',
  host: 'gmail.googleapis.com',
  to: 'Google · Gmail, con tu cuenta',
  what: 'El asunto y el cuerpo del correo que el agente redactó.',
  when: 'cuando un agente usa la herramienta de envío',
  where: 'MODULES → CORREO',
}]
```

The four answers are the same ones MADRE gives about its own, and for the same reason: whoever
reads the log deserves to know what travels, when, where to, and where it's turned off. Your declaration is
stored **separately** from the core's and marked with your `id`, because who promised what is part
of the promise. It is rebuilt on every load: uninstalling your module takes its destination with it.

If you point your module at another server at runtime, declare again with the **same
`id`**: that way the entry is replaced instead of leaving the log answering for an address
you no longer use.

### If your module needs a key

Declare them and don't ask for them yourself. MADRE draws a password field on the `KEYS` floor of your
page, accepts the value **only from this computer** (`127.0.0.1`), stores it in
`~/.pulse/credentials/<tu-id>.json` with `0600` permissions inside a `0700` directory, and notes
in the ledger that one was saved and **with what name and what length, never the value**.

```js
secrets: [{
  name: 'app-password',
  label: 'APP PASSWORD',
  note: 'No es la contraseña de tu cuenta. Una de aplicación, que puedes revocar sola.',
  where: 'https://myaccount.google.com/apppasswords',   // enlace a dónde sacarla
}]
```

And you read it through `ctx.vault`, which comes scoped to your module:

```js
await ctx.vault.get('app-password')    // el valor, solo para ti
await ctx.vault.held()                 // [{ module, name, bytes }] — nombres y tamaños, nunca valores
await ctx.vault.keep(name, value)      // guardar
await ctx.vault.forget(name)           // olvidar; sin nombre, todas las tuyas
```

Your id is sealed inside the SDK, so asking for another module's secret is not something you can
*write*. The page only shows that one is stored and how many characters it has.

**The value goes to the environment of the process you start, and nowhere else.** Not to the prompt, not
to the `brief`, not to a tool result, not to the ledger.

### If your module sends something

Reading can be undone: in the worst case you brought in something that wasn't useful. **Sending can't.** An email, a
message, a record in someone else's system: that goes out under the name of whoever opened the room
and doesn't come back.

That's why sending lives in `#4` AIRLOCK, where the rule already requires the agent to say in one line
what goes out and where before it goes out. **The core enforces it, not your good will:**

```js
tools: ['buscar_correo', 'mandar_correo'],
sends: ['mandar_correo'],       // por debajo de #4 esta se retira de la lista
```

If *all* of a server's tools send, the whole server doesn't travel below
`#4`. If some don't send, the server travels with the list trimmed and a `brief` that says why
it comes short. And whatever you decide to check, check it **in your server and not in the `brief`**: a
prompt is a suggestion.

**Can it connect to *X*?** The answer doesn't depend on MADRE but on how that service lets
a human hand over their own key, and it is mapped in three tiers —with a catalog— in
[§6 of `CONECTORES.md`](https://github.com/jossuealcacao-exe/madre/blob/main/docs/en/CONNECTORS.md#6--qu%C3%A9-alcanza-un-m%C3%B3dulo-y-de-qui%C3%A9n-es-el-muro), in the repository.
Read it before writing anything: it saves you discovering halfway through that the service requires an annual
security review to let you in.

The whole design of the connectors is in
[`CONECTORES.md`](https://github.com/jossuealcacao-exe/madre/blob/main/docs/en/CONNECTORS.md), in the repository. A complete connector to read from beginning
to end —CORREO, which sends email over SMTP without a single dependency— is in
`src/modules/correo.mjs` and takes ten minutes to read. It doesn't appear in MODULES yet: we're
finishing it, and in the meantime it can only be turned on deliberately with `PULSE_LABS=correo`.

## Publishing it

The page of a module of yours has **GET A NEWER FILE**: MADRE fetches the file —from the `url` you declared or from the file you installed it from—, verifies it in a separate copy, and only replaces the installed one if it loads, follows the house rules, and states a different version. Verifying installs nothing.

And in the MODULES header there is **+ ADD A MODULE** to install someone else's `.mjs`. It goes through the same door as everything else. Said plainly, because it is what it is: a module runs **inside MADRE, with the permissions of whoever opens it**. MADRE checks that it loads and that it doesn't leave its pen —its own id, routes only under `/api/x/<id>/`, never on top of a MADRE module—; what the code *intends* is something nobody but you can check.

## The module page

You don't draw anything: you declare, and MADRE builds your module the same way as its own. In MODULES each module is a card on the board and, when you tap it, a page with the same blocks as SETTINGS. That's why yours reads the same as the ones MADRE ships.

**The board card** has an icon, your `name`, a line with your `summary`, and its switch if it is a module that gets turned on. A module of yours carries the «Yours» tag.

**The page**, in this order:

| Block | What it shows | Where it comes from |
|---|---|---|
| What it does | your sentence, the «Active» switch with what your module says about itself, and the version with «Look for a newer one» | `summary`, `status(ctx).status.detail`, `vendor`, `version` or `tracks` |
| Settings | one row per control: its name on the left, the selector, switch, or field on the right; it saves when you change it | `controls` |
| Keys | one field per secret, what is stored (name and length, never the value), and the option to forget it | `secrets` |
| What it touches | each thing it writes or needs, with its label | `creates`, `requires` |
| Commands | what it adds to the text box | `commands` or `slash` |
| Yours | get a newer file and remove it | the file you installed, `updates` |

A module that installs into the project instead of being turned on keeps its install card, with the command in view before anything runs, inside the «What it does» block. The figures at the top of the page and the dedicated window belong to MADRE's modules that keep a reading (Ash, Suggested effort, Ollama); you don't need to declare anything for them.

## The `ctx`

```
ctx = {
  projectRoot, stateRoot,          // el proyecto y ~/.pulse
  config, settings,                // config.json completo y tus ajustes con defaults
  env, agents, room,               // agentes detectados; la sala (room.capabilities(), room.record(...))
  readConfig(), updateConfig(patch),
  record(type, payload),           // escribe un evento en el ledger; tipo "algo.algo", nunca message.* ni agent.*
  services: { imageKey, ollama, … }, // lo que el servidor ofrece
  vault: { get, held, keep, forget } // tus secretos, y solo los tuyos
}
```

`turn`, in `toolsForTurn`: `{ agent, mode, lease, scratchDir, port, roomDir }`. `mode` goes from 0 to 4; in 0 (GHOST) nothing is saved, so decide whether you want to hand over tools there.

## House rules

- **Nothing leaves the machine on its own.** If your module talks to a service, say so in `summary` and in `requires`, and do it only when the human asks for it.
- **Don't store credentials.** Use the sessions that already live on the machine.
- **Don't write into the project** from a module; that's what the agents' modes are for. A module that installs something into the project is `kind: 'installer'` and shows the command before running it.
- **Fail softly.** An exception in `toolsForTurn` hands over nothing; in a command, the card states the error. Never break an agent's turn.
- **MADRE's voice.** Short uppercase labels, notes that say what doesn't leave the machine, `MU/TH/UR › ` when you speak in a notice.

## Let your AI build it, in the room

Type `/module <lo que debe hacer>` in the composer. It is the explicit entry point to the guided flow: if `#2 CREATE` isn't active, MADRE asks you to choose it and keeps your request intact. With `#2` active, it keeps the agent you chose and hands it the SDK contract and the example. The agent must write **a single file** named `<id>.module.mjs` in its scratch folder; it cannot install it on its own.

MADRE recognizes that name and puts a card in the room: `INSTALL FOR EVERY ROOM` or `INSTALL FOR THIS PROJECT`. Read it, decide, one click. MADRE validates it in a copy, saves it as `<id>.mjs` in the folder you chose, and it appears in MODULES with the «Yours» tag. You can also ask for the same thing in natural language while you're in `#2` or higher; `/module` makes the format explicit and doesn't grant permissions on its own.

Agents never write to `~/.pulse/modules` or `.madre/modules`: they propose, you install.

A module of yours carries the «Yours» tag and is removed from its page with «Remove» —also from «Create your module», in the list of yours—. MADRE confirms the exact file, deletes that file and its origin record for updates, and withdraws it from the room without restarting it. It doesn't delete files the module created or its saved settings. The modules that ship with MADRE don't show that button: they aren't removed, they're turned off.

## What a module cannot touch

A module runs inside MADRE's process with your permissions: install only what you've read. MADRE, for its part, protects its core like this:

- Its HTTP routes live under `/api/x/<id>/`; a module with routes outside that doesn't load, so none can impersonate `/api/state`, `/api/messages`, or any route of MADRE's own.
- It cannot use the `id` of a built-in module or of another one already loaded.
- `record()` rejects the reserved event types (`message.*`, `agent.*`); it cannot fabricate turns or messages.
- It receives nobody's credentials; like MADRE, it uses the sessions that already live on the machine.
- An error in `toolsForTurn` hands over nothing; in a command, the card states the error; at load time, the board warns how many didn't load and «Create your module» says which file and why. None of that stops the room.

## Testing it

1. Copy the file to `~/.pulse/modules/`.
2. In the room, MODULES → «Create your module» → «Reload modules». If the file has an error, it tells you right there with the exact line.
3. Turn it on with its switch. Type `/tu-comando` in the composer.
4. Change the file and reload again: no need to restart the room.

With an AI: give it this document and `hello-module.mjs`, describe what you want, and ask it for a single `.mjs` file with `export default { … }`. MADRE does the rest.
