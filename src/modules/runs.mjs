// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Runs: letting an agent ask the human to run a command instead of asking them to copy it.
//
// Below #4 AIRLOCK an agent cannot run anything, and some answers turn on a command anyway: the
// tests after a fix, a build, a linter. This gives that request a shape — a fenced block the room
// turns into one button per command — and brings the output back to the room as a card, and to
// the agent that asked in a turn of its own once every line has run (src/room/returns.mjs).
//
// Nothing an agent writes runs by itself. Each line is pressed by the human, runs alone from the
// project root with no shell, and is photographed first so UNDO can put the files back. What a
// command sends off this machine does not come back with UNDO, and the button says what it runs
// before it is pressed.
//
// Always on, as image generation is (2026-11-06, the author): asking for a command is part of how
// an agent works in MADRE. The instruction still rides in every prompt below AIRLOCK, measured in
// the economy as `runs`.

import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';

export default defineModule({
  id: 'runs',
  configKey: 'runs',
  name: 'Commands',
  vendor: 'MADRE',
  version: '1.0.0',
  summary: 'Lets an agent ask you to run a command it cannot run in its mode (tests, a build, a linter). Each command is a button: nothing runs until you press it, it runs from the project root with no shell, a restore point is taken first, and when it has run the output goes back to the agent that asked, which goes on. Always on: about 300 tokens of instruction per turn below FULL ACCESS.',
  creates: ['nothing in the project'],
  card: 'fixed',
  async status() {
    return {
      status: { installed: true, detail: t('on · agents may ask you to run commands') },
      install: { display: 'always on', platforms: [] },
      fixed: true,
    };
  },
  async toggle() { return { status: 405, body: { error: 'Commands has no switch: it is always on.' } }; },
});
