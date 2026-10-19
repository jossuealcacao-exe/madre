import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { noteOpenCodeTurn, openCodeHealth, problemOf, providerOf, suggestOpenCodeModel } from '../src/opencode-health.mjs';

// What OpenCode can answer with on this computer (2026-10-19): a refused provider is offered a way
// out on the failure itself, a model that works.
const NO_CREDIT = 'APIError: Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.';

test('opencode: what answered is remembered, a provider that refused is marked until it answers again', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'madre-oc-health-'));
  try {
    assert.equal(providerOf('anthropic/claude-fable-5'), 'anthropic');
    assert.equal(problemOf(NO_CREDIT), 'no-credit');
    assert.equal(problemOf('APIError: invalid x-api-key (401)'), 'bad-key');
    assert.equal(problemOf('went silent for 90s'), null, 'a timeout is not the provider\'s');

    await noteOpenCodeTurn(stateRoot, { ok: true, model: 'openai/gpt-5.6-luna' });
    await noteOpenCodeTurn(stateRoot, { ok: false, model: 'anthropic/claude-fable-5', error: NO_CREDIT });
    await noteOpenCodeTurn(stateRoot, { ok: false, model: 'openai/gpt-5.6-luna', error: 'went silent for 90s' });
    let health = await openCodeHealth(stateRoot);
    assert.equal(health.worked.model, 'openai/gpt-5.6-luna');
    assert.deepEqual(Object.keys(health.problems), ['anthropic']);
    assert.equal(health.problems.anthropic.kind, 'no-credit');

    await noteOpenCodeTurn(stateRoot, { ok: true, model: 'anthropic/claude-fable-5' });
    health = await openCodeHealth(stateRoot);
    assert.deepEqual(health.problems, {}, 'a provider that answers again loses its mark');
  } finally { await rm(stateRoot, { recursive: true, force: true }); }
});

test('opencode: the model offered is the one that answered last, or a free one, never the provider in trouble', () => {
  const own = ['opencode/beam-free', 'opencode/big-pickle'];
  const worked = { worked: { model: 'openai/gpt-5.6-luna' }, problems: { anthropic: { kind: 'no-credit' } } };
  assert.deepEqual(suggestOpenCodeModel(worked, { failed: 'anthropic/claude-fable-5', own }), { model: 'openai/gpt-5.6-luna', why: 'worked' });
  // What answered last is the one that failed now: a free model instead.
  assert.deepEqual(suggestOpenCodeModel({ worked: { model: 'anthropic/claude-fable-5' }, problems: {} }, { failed: 'anthropic/claude-fable-5-1', own }), { model: 'opencode/big-pickle', why: 'free' });
  assert.deepEqual(suggestOpenCodeModel({ worked: null, problems: {} }, { failed: null, own }), { model: 'opencode/big-pickle', why: 'free' });
  assert.equal(suggestOpenCodeModel({ worked: null, problems: { opencode: { kind: 'bad-key' } } }, { failed: null, own }), null, 'nothing to offer is said as nothing');
});
