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
// It has a switch because it is not free: the instruction that teaches the block rides in every
// prompt below AIRLOCK while this is on, measured in the economy as `runs`.

import { defineModule } from './sdk.mjs';
import { t } from '../i18n.mjs';

export default defineModule({
  id: 'runs',
  configKey: 'runs',
  name: 'Commands',
  vendor: 'MADRE',
  version: '1.0.0',
  summary: 'Lets an agent ask you to run a command it cannot run in its mode (tests, a build, a linter). Each command is a button: nothing runs until you press it, it runs from the project root with no shell, a restore point is taken first, and when it has run the output goes back to the agent that asked, which goes on. Costs about 300 tokens of instruction per turn below FULL ACCESS while it is on.',
  creates: ['nothing in the project', 'a switch in ~/.pulse/config.json'],
  async status(ctx) {
    return {
      status: { installed: Boolean(ctx.settings.enabled), detail: ctx.settings.enabled ? t('on · agents may ask you to run commands') : t('off · agents describe the command in prose') },
      install: { display: ctx.settings.enabled ? 'stop offering commands' : 'let agents ask for commands', platforms: [] },
    };
  },
  async onToggle(ctx, enabled) { ctx.room.setRuns(enabled); return null; },
});
