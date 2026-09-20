// HELLO · a complete MADRE module in one file, no imports, no build.
//
// Copy this file to ~/.pulse/modules/hello.mjs (every project) or to
// <project>/.madre/modules/hello.mjs (this project), then MODULES → RELOAD.
// Switch it on in MODULES and type /hello in the room.
//
// The default export is a plain object: MADRE wraps it with defineModule.
// Everything is optional except id and name.

export default {
  id: 'hello',                       // kebab-case; also the key under modules in ~/.pulse/config.json (camelCased)
  name: 'HELLO',                     // how MODULES shows it
  vendor: 'you',                     // a person, a team, a company
  version: '0.1.0',
  summary: 'Greets the room from the composer. The smallest possible module: a switch, one setting, one slash command.',
  creates: ['nothing in the project'],
  requires: [],
  settings: { enabled: false, greeting: 'hola' },   // defaults; the human changes them in config.json

  // What MODULES shows for this module. ctx.settings already has the defaults applied.
  async status(ctx) {
    return { status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? `on · says "${ctx.settings.greeting}"` : 'off' } };
  },

  // Slash commands: they run on the server, inside MADRE, and their answer lands in the room as a
  // fact card that the human and every agent read. Only while the module is on.
  slash: [
    {
      name: 'hello',
      usage: '/hello [name]',
      summary: 'Greets someone in the room.',
      async execute(ctx, args) {
        const who = args[0] ?? 'crew';
        return { ok: true, title: 'HELLO', text: `${ctx.settings.greeting}, ${who}. Project: ${ctx.projectRoot.split('/').pop()}. Agents online: ${ctx.agents.filter((agent) => agent.ready).map((agent) => `@${agent.id}`).join(', ') || 'none'}.` };
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
