// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONDITIONS, diagnose, fixesFor } from '../public/troubleshooting.js';

test('MU-055 authorizes only the agent named in the blocked turn', () => {
  const condition = CONDITIONS.find((one) => one.code === 'MU-055');
  for (const platform of ['darwin', 'linux', 'wsl', 'win32']) {
    for (const agent of ['codex', 'claude']) {
      const match = diagnose(`MADRE blocked @${agent} before sending the briefing`, agent);
      assert.equal(match[0]?.id, condition.id);
      const lines = fixesFor(condition, platform, agent).join('\n');
      assert.match(lines, new RegExp(`PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS=${agent} madre start`));
      assert.doesNotMatch(lines, new RegExp(`PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS=${agent === 'codex' ? 'claude' : 'codex'} madre start`));
    }
    assert.doesNotMatch(fixesFor(condition, platform).join('\n'), /PULSE_ALLOW_CUSTOM_AGENT_ENDPOINTS=/);
  }
});
