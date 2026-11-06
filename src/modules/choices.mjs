// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Choices: letting an agent put a decision to the human instead of taking it.
//
// An agent that has to pick between three or more real options has two honest ways out: name the
// one it recommends, or hand the choice over. The second had no shape in this room — it came out
// as a paragraph listing possibilities, which the human then had to answer in prose. This gives
// it a shape: a fenced block the room turns into buttons.
//
// Always on, as image generation is (2026-11-06, the author): a decision handed back as buttons is
// part of how MADRE talks, not an extra. Its instruction still rides in every prompt and MADRE
// still measures it like every other block: `choices` in the economy's breakdown, about 135
// tokens a turn.
//
// Nothing it produces runs. Pressing an option writes it into the composer; sending it is still
// the human's, as is ignoring the question entirely.

import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';

export default defineModule({
  id: 'choices',
  configKey: 'choices',
  name: 'Options',
  vendor: 'MADRE',
  version: '1.0.0',
  summary: 'Lets an agent hand a decision back to you as buttons instead of a paragraph, when the answer turns on three or more real options. Always on: about 135 tokens of instruction per turn, counted in Spending like every other block.',
  creates: ['nothing in the project'],
  card: 'fixed',
  async status() {
    return {
      status: { installed: true, detail: t('on · agents may ask you to choose') },
      install: { display: 'always on', platforms: [] },
      fixed: true,
    };
  },
  async toggle() { return { status: 405, body: { error: 'Options has no switch: it is always on.' } }; },
});
