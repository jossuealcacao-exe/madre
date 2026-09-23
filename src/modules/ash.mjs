// Ash: MADRE's token economy.
//
// It used to be a text compressor that rewrote the human's message before sending it. That was
// retired: it altered the one thing nobody asked it to touch, it was lossy, and measured against
// a real turn it saved a fifth of one per cent. Everything it claimed to do is now done without
// touching a word anyone wrote.
//
// Most of the economy needs no switch and is always on, because none of it loses anything: the
// briefing carries only the blocks a turn can use, what never changes is read first so a CLI can
// take it from its own cache, the transcript window holds still instead of sliding, and every
// turn is weighed against what it was actually charged.
//
// What is left to decide is the one thing that changes how an agent answers rather than what it
// is asked: whether to ask for compact prose. Output is the dearer half of a bill, so this is
// the switch worth having, and it is the human's to make.

import { defineModule } from './sdk.mjs';

export default defineModule({
  id: 'ash',
  configKey: 'ash',
  name: 'Ash',
  vendor: 'MADRE',
  summary: 'Asks every agent for compact prose. The rest of the economy is always on: the briefing carries only what a turn can use, what never changes is read first so a cache can match it, and the transcript holds still instead of sliding.',
  creates: ['nothing in the project', 'a switch in ~/.pulse/config.json'],
  card: 'ash',
  async status(ctx) {
    return {
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? 'on · agents answer in compact prose' : 'off · agents answer at their own length' },
      install: { display: ctx.settings.enabled ? 'stop asking for compact replies' : 'ask every agent for compact replies', platforms: [] },
    };
  },
  async onToggle(ctx, enabled) { ctx.room.setAsh(enabled); return null; },
});
