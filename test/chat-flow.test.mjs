import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// How the answers of the AIs arrive in a project's chat (2026-11-15, the author: «lag and jumps
// between each answer… no natural sequence in a plan»), and the cards without a border.
const app = await readFile(join(import.meta.dirname, '..', 'public', 'app.js'), 'utf8');
const styles = await readFile(join(import.meta.dirname, '..', 'public', 'styles.css'), 'utf8');
const fn = (name) => {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is gone from public/app.js`);
  let depth = 0;
  for (let i = app.indexOf(') {', start) + 2; i < app.length; i += 1) {
    if (app[i] === '{') depth += 1;
    else if (app[i] === '}' && (depth -= 1) === 0) return app.slice(start, i + 1);
  }
  throw new Error(`${name} does not close`);
};
const block = styles.slice(styles.indexOf('LAS RESPUESTAS DE LAS IAS LLEGAN SIN BRINCOS'));

// A card as planCard draws it: one line per «@agent: what» of the plan.
function fakeCard(agents) {
  const lines = agents.map((agent) => {
    const attrs = new Map();
    return { dataset: { agent }, title: '', setAttribute: (k, v) => attrs.set(k, v), removeAttribute: (k) => attrs.delete(k), attrs };
  });
  const card = { dataset: {}, querySelectorAll: () => lines };
  return { card, lines };
}
function planWorld(agents) {
  const { card, lines } = fakeCard(agents);
  const message = { querySelector: (selector) => (selector === '.plan-card' ? card : null) };
  const document = { getElementById: (id) => (id === 'msg-parent' ? message : null) };
  const t = (key, values = {}) => key.replace(/\{(\w+)\}/g, (_, name) => values[name]);
  const make = new Function('document', 't', 'label', `
    const planCards = new Map();
    const planStepOf = new Map();
    const PLAN_STEP_WORDS = { wait: () => t('Waits its turn'), now: () => t('Working on it…'), done: () => t('Done'), skipped: () => t('Stopped') };
    ${fn('bindPlanCard')}
    ${fn('markPlanStep')}
    ${fn('planStepStarted')}
    ${fn('planStepEnded')}
    ${fn('planEnded')}
    return { bindPlanCard, planStepStarted, planStepEnded, planEnded };`);
  return { card, lines, ...make(document, t, (id) => id) };
}
const states = (lines) => lines.map((line) => line.dataset.state).join(' ');

test('chat flow · the plan card follows its steps: at work, done, failed, waiting, closing', () => {
  const world = planWorld(['claude', 'gemini', 'opencode', 'cursor']);
  const steps = ['claude', 'gemini', 'opencode', 'cursor'].map((agent) => ({ agent, mode: 1 }));
  world.bindPlanCard({ payload: { planId: 'p', parentMessageId: 'parent', steps } });
  assert.equal(world.card.dataset.plan, 'p');
  assert.equal(states(world.lines), 'wait wait wait wait');
  world.planStepStarted({ messageId: 'd1', planId: 'p', step: 1, totalSteps: 5, sender: 'codex', target: 'claude' });
  assert.equal(states(world.lines), 'now wait wait wait');
  assert.equal(world.lines[0].attrs.get('aria-current'), 'step');
  world.planStepEnded('d1', 'done');
  world.planStepStarted({ messageId: 'd2', planId: 'p', step: 2, totalSteps: 5, sender: 'codex', target: 'gemini' });
  assert.equal(states(world.lines), 'done now wait wait');
  // An AI that could not answer stays marked, whatever comes after it.
  world.planStepStarted({ messageId: 'd3', planId: 'p', step: 3, totalSteps: 5, sender: 'codex', target: 'opencode' });
  world.planStepEnded('d3', 'failed', 'opencode');
  world.planStepStarted({ messageId: 'd4', planId: 'p', step: 4, totalSteps: 5, sender: 'codex', target: 'cursor' });
  assert.equal(states(world.lines), 'done done failed now');
  assert.match(world.lines[2].title, /opencode/);
  // The plan's author closing it is not a fifth line: every step is behind and the card closes.
  world.planStepStarted({ messageId: 'd5', planId: 'p', step: 5, totalSteps: 5, sender: 'codex', target: 'codex' });
  assert.equal(states(world.lines), 'done done failed done');
  assert.equal(world.card.dataset.state, 'closing');
  world.planEnded({ planId: 'p' }, 'completed');
  assert.equal(world.card.dataset.state, 'done');
  assert.equal(states(world.lines), 'done done failed done');
});

test('chat flow · a stopped plan leaves the rest aside; a line the plan left out is never lit', () => {
  const world = planWorld(['claude', 'gemini', 'grok']);
  // The plan kept two of the three lines (an AI not ready, more steps than allowed).
  world.bindPlanCard({ payload: { planId: 'p', parentMessageId: 'parent', steps: [{ agent: 'claude' }, { agent: 'grok' }] } });
  assert.equal(states(world.lines), 'wait skipped wait');
  world.planStepStarted({ messageId: 'd1', planId: 'p', step: 1, totalSteps: 2, sender: 'codex', target: 'claude' });
  world.planEnded({ planId: 'p' }, 'stopped');
  assert.equal(states(world.lines), 'skipped skipped skipped');
  assert.equal(world.card.dataset.state, 'stopped');
});

test('chat flow · an answer takes its AI\'s working line\'s place, laid out whole, and the thread keeps its place', () => {
  const node = fn('renderEventNode');
  // The line stays until the answer replaces it: taken away first, the thread was a line shorter.
  assert.match(node, /if \(event\.payload\.role !== 'user'\) slot = turnSlot\(event\.payload\.parentMessageId\)/);
  assert.match(node, /if \(event\.payload\.role !== 'user' && !slot\) removeThinking/);
  assert.match(node, /slot = turnSlot\(event\.payload\.messageId\);[^\n]*renderFailure\(event, \{ inPlace: Boolean\(slot\) \}\)/);
  assert.match(node, /if \(slot\?\.isConnected\) slot\.replaceWith\(tidySystemLine\(node\)\)/);
  // Live, the row is laid out at its real height from its first frame (`fresh`), before it is placed.
  assert.ok(node.indexOf("node.classList.add('fresh')") < node.indexOf('slot.replaceWith'), 'fresh comes after the row is placed');
  assert.match(block, /#messages \.thread-inner > \.fresh \{ content-visibility: visible; \}/);
  // What is on screen under the line slides down with the answer opening, or stays put without motion.
  assert.match(node, /reducedMotion\(\)[^\n]*\n[^\n]*under\.getBoundingClientRect\(\)\.top - underTop/);
  assert.match(fn('openInPlace'), /height: `\$\{from\}px` \}, \{ height: `\$\{full\}px`/);
});

test('chat flow · the thread glides to its end and holds the newest answer; a resize lands at once', () => {
  const keep = fn('keepPinned');
  assert.match(keep, /if \(!instant && !replaying && !drawingRecord && !reducedMotion\(\)\) \{ glideToEnd\(\); return; \}/);
  assert.match(app, /const instant = entries\.some\(\(entry\) => entry\.target === els\.thread \|\| entry\.target === els\.composer\)/);
  const glide = fn('glideToEnd');
  assert.match(glide, /if \(reducedMotion\(\) \|\| typeof requestAnimationFrame !== 'function'\) \{ keepPinned\(\{ instant: true \}\); return; \}/);
  // The person scrolling takes the thread back from the glide.
  assert.match(glide, /if \(!pinnedToEnd \|\| touchedAt > endGlide\.since\) return;/);
  const follow = fn('followTurn');
  // A step handed to the next AI is not an answer to hold; a short answer is.
  assert.match(follow, /event\.payload\.status !== 'delegated'/);
  assert.match(follow, /readingHold = node;\n  \}\n  glideToEnd\(\);/);
  assert.match(follow, /if \(mine\) \{ readingHold = null; setPinned\(true\); glideToEnd\(\); return; \}/);
  // Following never goes past the held answer's first line.
  const followTop = new Function('scroller', 'els', 'pageScrolls', 'HOLD_GAP', 'hold', `let readingHold = hold; ${fn('followTop')}; return followTop();`);
  const scroller = { top: 400, height: 2000, view: 600 };
  const thread = { getBoundingClientRect: () => ({ top: 50 }) };
  const answer = { isConnected: true, getBoundingClientRect: () => ({ top: 350 }) };
  assert.equal(followTop(scroller, { thread }, () => false, 14, null), 1400);
  assert.equal(followTop(scroller, { thread }, () => false, 14, answer), 400 + 300 - 14);
});

test('chat flow · a plan\'s handoff goes straight to its dot; the cards have no border', () => {
  assert.match(fn('renderHandoff'), /if \(kind === 'delegated'\) \{ node\.append\(t\(' · delegated'\)\); node\.classList\.add\('step-handoff'\); \}/);
  assert.match(fn('scheduleFold'), /if \(replaying \|\| node\.classList\.contains\('step-handoff'\)\)/);
  assert.match(block, /\.row \.turn-changes \{[^}]*border: 0;[^}]*box-shadow: none;/);
  assert.match(block, /\.turn-changes-acts button \{[^}]*border: 0;/);
  assert.match(block, /\.thread-inner > \.system\.plan \{ box-shadow: none !important; border: 0 !important; \}/);
  assert.match(block, /\.mode-ask:not\(\.settled\) \{ border: 0 !important; box-shadow: none !important;/);
  // Concentric: the capsule's corner is the chip's plus the air between them, and nothing draws a line.
  assert.match(block, /--chip-h: 22px; --cap-pad: 3px;/);
  assert.match(block, /border-radius: calc\(var\(--chip-h\) \/ 2 \+ var\(--cap-pad\)\); box-shadow: none !important;/);
  assert.match(block, /height: var\(--chip-h\); line-height: var\(--chip-h\); border: 0; border-radius: calc\(var\(--chip-h\) \/ 2\); box-shadow: none;/);
  // Still with reduced motion: nothing rises and the plan's step does not breathe.
  assert.match(block, /prefers-reduced-motion: reduce\) \{ #messages \.thread-inner > \.fresh[^}]*\{ animation: none; \} \}/);
  assert.match(block, /prefers-reduced-motion: reduce\) \{[^}]*li\[data-state="now"\]::before \{ animation: none; \} \}/);
});

test('a step of a plan is one quiet line: who hands what to whom, the instruction cut to one line until pressed', () => {
  // The plan's card already lists the steps; the step's row no longer repeats it in a full bubble.
  assert.match(fn('renderAssistantMessage'), /if \(delegated\) return renderPlanStepLine\(event, \{ closingAsk, shown \}\);/);
  const line = fn('renderPlanStepLine');
  assert.match(line, /row plan-step/);
  assert.match(line, /t\('step \{n\}\/\{total\}'/);
  assert.match(line, /aria-expanded/);
  // The line shows no header, so what its author says next shows its own.
  assert.match(line, /state\.lastSender = null;/);
  assert.match(styles, /\.row\.plan-step \.plan-step-plain \{ display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; \}/);
  assert.match(styles, /\.row\.plan-step\.open \.plan-step-full \{ display: block;/);
});
