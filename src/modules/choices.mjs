// Choices: letting an agent put a decision to the human instead of taking it.
//
// An agent that has to pick between three or more real options has two honest ways out: name the
// one it recommends, or hand the choice over. The second had no shape in this room — it came out
// as a paragraph listing possibilities, which the human then had to answer in prose. This gives
// it a shape: a fenced block the room turns into buttons.
//
// It has a switch because it is not free. The instruction that teaches an agent the block is
// written into every prompt while this is on, and MADRE measures it like every other block: it
// shows up as `choices` in the economy's breakdown, at about 135 tokens a turn. A capability
// whose cost cannot be seen is a capability nobody can decide against.
//
// Nothing it produces runs. Pressing an option writes it into the composer; sending it is still
// the human's, as is ignoring the question entirely.

import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';

export default defineModule({
  id: 'choices',
  configKey: 'choices',
  name: 'Choices',
  vendor: 'MADRE',
  version: '1.0.0',
  summary: 'Lets an agent hand a decision back to you as buttons instead of a paragraph, when the answer turns on three or more real options. Costs about 135 tokens of instruction per turn while it is on, counted in the economy like every other block.',
  creates: ['nothing in the project', 'a switch in ~/.pulse/config.json'],
  async status(ctx) {
    return {
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? t('on · agents may ask you to choose') : t('off · agents answer in prose') },
      install: { display: ctx.settings.enabled ? 'stop offering choices' : 'let agents offer choices', platforms: [] },
    };
  },
  async onToggle(ctx, enabled) { ctx.room.setChoices(enabled); return null; },
});
