// HELLO · a complete MADRE module in one file, no imports, no build.
//
// Copy this file to ~/.pulse/modules/hello.mjs (every project) or to
// <project>/.madre/modules/hello.mjs (this project), then MODULES → RELOAD.
// Switch it on in MODULES and type /hello in the room.
//
// The default export is a plain object: MADRE wraps it with defineModule.
// Everything is optional except id and name.
//
// A module imports nothing. MADRE loads your file from a scratch folder to check it before
// installing, and there is no node_modules there: `import … from '@jossuealcala/madre/sdk'`
// cannot resolve and the install fails. If you need defineModule, export a function and MADRE
// hands it to you: ({ defineModule }) => defineModule({ … }).
//
// MADRE's own modules do write `import { defineModule } from './sdk.mjs'` — they live inside the
// package. Copying that line from them is the one mistake that looks right and never works.

export default {
  id: 'hello',                       // kebab-case; also the key under modules in ~/.pulse/config.json (camelCased)
  name: 'HELLO',                     // how MODULES shows it
  vendor: 'you',                     // a person, a team, a company
  version: '0.1.0',
  summary: 'Greets the room from the composer. A small module with everything in its place: a switch, one setting, one slash command with its link, and two routes.',
  creates: ['nothing in the project'],
  requires: [],
  settings: { enabled: false, greeting: 'hola' },   // defaults; the human changes them in config.json
  // Its icon: the drawing and its tile's color. MADRE centres it, draws it in white and uses the
  // nearest of its own tile colors, so draw it on any grid and do not worry about its size.
  icon: { svg: '<path d="M4 10.5c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>', color: '#0f766e' },

  // What MODULES shows for this module. ctx.settings already has the defaults applied. The whole
  // shape: { status: { installed, detail }, preflight: { ok, problems }, install: { display },
  // runs: [{ name, version, target }] }; only `status` is needed, `detail` is the line beside «On».
  async status(ctx) {
    return { status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? `on · says "${ctx.settings.greeting}"` : 'off' } };
  },

  // Slash commands: they run in a separate process, and their answer lands in the room as a
  // fact card that the human and every agent read. Only while the module is on.
  slash: [
    {
      name: 'hello',
      usage: '/hello [name]',
      summary: 'Greets someone in the room.',
      // The answer: { ok, title, text, link }. `link` is optional: { href, label }, where href is one
      // of this module's own routes (/api/x/<id>/…, no spaces or quotes, up to 400 characters) and
      // label is cut at 80. The card offers it as a key that opens another tab, already with MADRE's
      // ficha. A link anywhere else is dropped without a word.
      async execute(ctx, args) {
        const who = args[0] ?? 'crew';
        const page = /^[a-z0-9-]{1,40}$/i.test(who) ? who.toLowerCase() : 'crew';
        return {
          ok: true,
          title: 'HELLO',
          text: `${ctx.settings.greeting}, ${who}. Project: ${ctx.projectRoot.split('/').pop()}. Agents online: ${ctx.agents.filter((agent) => agent.ready).map((agent) => `@${agent.id}`).join(', ') || 'none'}.`,
          link: { href: `/api/x/hello/card/${page}`, label: 'Open the greeting' },
        };
      },
    },
  ],

  // Routes of its own: { method, path, handler(ctx, { payload, params, url, request, viaPhone }) }.
  // `path` is the whole address and always lives under /api/x/<id>/: a string, matched exactly, or a
  // pattern, whose captures arrive in `params` as a list, in order. `payload` is the JSON body of a
  // POST ({} otherwise), `url` a URL, `request` only { method, headers }, `viaPhone` true when it comes
  // from a paired phone. Answer { status, body } for JSON or { status, html } for a page.
  routes: [
    {
      method: 'GET',
      path: '/api/x/hello/greeting',
      async handler(ctx) {
        return { status: 200, body: { greeting: ctx.settings.greeting } };
      },
    },
    {
      method: 'GET',
      path: /^\/api\/x\/hello\/card\/([a-z0-9-]{1,40})$/,
      async handler(ctx, { params }) {
        const [who] = params;
        return { status: 200, html: `<!doctype html><meta charset="utf-8"><title>HELLO</title><p>${ctx.settings.greeting}, ${who}.</p>` };
      },
    },
  ],

  // Tools for every turn: return MCP server specs and MADRE attaches them to the agent's CLI for
  // that turn only, in its isolated run, and tells the agent what it got. Delete this block if the
  // module has no tools. `turn` = { agent, mode, lease, scratchDir, port, roomDir }.
  // async toolsForTurn(ctx, turn) {
  //   return [{ name: 'my-tools', command: 'node', args: ['/absolute/path/to/my-mcp-server.mjs'], env: {}, tools: ['do_thing'], brief: 'what the agent can do with it' }];
  // },

  // Events of the room, if the module wants to react (message.created, control.changed, …).
  // async onEvent(ctx, event) {},

  // A condition MU/TH/UR recognises, with its remedy per platform.
  // conditions: [{ id: 'hello-shy', severity: 'informational', title: 'HELLO is off', match: /hello is off/i, diagnosis: '…', remedy: '…', fixes: { darwin: [], linux: [], win32: [] } }],
};
