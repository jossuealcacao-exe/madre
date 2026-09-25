import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { answerFor, parseInquiry, INQUIRIES, STRIKES } from '../public/inquiry.js';

const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');
const room = {
  briefing: {
    agent: 'codex', chars: 14200, recalled: 3, quoted: 2, spared: 900,
    parts: [
      { id: 'room', chars: 900, when: 'always', text: 'You are in a room called MADRE.' },
      { id: 'memories', chars: 1200, when: 'the archive has something for this turn', text: '- [decision] The webhook verifies the signature.' },
    ],
    window: { from: 12, through: 48, carried: 20, omitted: 11 },
    launch: { executable: '/usr/local/bin/codex', cwd: '/x', args: ['--sandbox', 'read-only'], isolation: ['--ephemeral: the run keeps no session of its own.'], env: [{ name: 'GEMINI_CLI_HOME', note: 'the temporary home' }], mcpServers: [{ name: 'pulse-playwright', tools: ['a', 'b'] }] },
  },
  outbound: { destinations: [{ id: 'npm', to: 'the npm registry', on: true, local: false, calls: 2 }], says: 'Every request this process made went to an address declared above.' },
  rate: 4,
  agents: [{ id: 'claude', detected: true, ready: true, maxMode: 3 }],
  privacy: { terms: 4, marker: '[ENTIDAD-ORG]' },
  verdict: { headline: 'WORKING', says: '12 of 30 questions had their answer in the archive.', next: { text: 'Answer the 6 questions the room wrote.', where: 'NOSTROMO · ASK' } },
};

test('inquiry: it answers from what the room already has, and nothing it answers is a request', () => {
  const blocks = answerFor('blocks', room);
  assert.equal(blocks.strike, false);
  assert.match(blocks.lines.join('\n'), /2 BLOCKS, 14,200 CHARACTERS/);
  assert.match(blocks.lines.join('\n'), /MEMORIES\s+1200 CH/);

  // One block, word for word: the core is read, and this is the reading of it.
  const one = answerFor('read memories', room);
  assert.match(one.lines.join('\n'), /The webhook verifies the signature/);
  // A block this document does not have says which ones it does, instead of a refusal.
  const missing = answerFor('read nonsense', room);
  assert.equal(missing.strike, false, 'a real inquiry with a wrong argument is not a strike');
  assert.match(missing.lines.join('\n'), /ROOM, MEMORIES/);

  assert.match(answerFor('launch', room).lines[0], /\/usr\/local\/bin\/codex · 2 ARGUMENTS/);
  assert.match(answerFor('launch', room).lines.join('\n'), /NAMES ONLY, NEVER VALUES/);
  assert.match(answerFor('what left this machine', room).lines.join('\n'), /the npm registry/);
  assert.match(answerFor('window', room).lines.join('\n'), /#12 TO #48[\s\S]*11 OLDER ONES STAY BEHIND/);
  // An estimate that says it is one, rather than a measurement that is not.
  assert.match(answerFor('weight', room).lines.join('\n'), /ROUGHLY 3,550 TOKENS, ESTIMATED AT 4 CHARACTERS PER TOKEN/);
  assert.match(answerFor('weight', room).lines.join('\n'), /I DO NOT HAVE THE PROVIDER'S TOKENIZER/);
  assert.match(answerFor('crew', room).lines.join('\n'), /@CLAUDE\s+SIGNED IN\s+MAX MODE #3/);
  assert.match(answerFor('status', room).lines.join('\n'), /NEXT: ANSWER THE 6 QUESTIONS/);
});

test('inquiry: the terms a room protects are counted, never printed', () => {
  const answer = answerFor('privacy', room);
  assert.match(answer.lines.join('\n'), /4 TERMS ARE REPLACED WITH \[ENTIDAD-ORG\]/);
  assert.match(answer.lines.join('\n'), /I WILL NOT PRINT THEM/);
  // The console is handed a count and a marker and nothing else, so there is no word in here to
  // print by accident.
  assert.equal(INQUIRIES.find((one) => one.id === 'privacy').needs, 'privacy');
  const source = INQUIRIES.find((one) => one.id === 'privacy').answer.toString();
  assert.ok(!/terms\.(join|map|\[)/.test(source), 'the answer reaches for the words themselves');
});

test('inquiry: the order nobody is supposed to read is the whole point of this frame', () => {
  const answer = answerFor('special order 937', room);
  assert.equal(answer.strike, false);
  assert.match(answer.lines[0], /THERE IS NO ORDER YOU CANNOT READ/);
  // And the longest alias wins, so the number is not read as the order without it.
  assert.equal(parseInquiry('SPECIAL ORDER 937').inquiry.id, 'order937');
  assert.equal(parseInquiry('READ ROOM').argument, 'ROOM');
});

test('inquiry: three it cannot parse and the interface closes, saying so from the first one', () => {
  const first = answerFor('delete the archive', { strikes: 0 });
  assert.equal(first.strike, true);
  assert.equal(first.strikes, 1);
  assert.equal(first.closes, false);
  assert.match(first.lines.join(' '), /2 ATTEMPTS LEFT/, 'the third is a surprise');
  assert.match(first.lines.join(' '), /HELP LISTS WHAT I ANSWER/, 'a refusal that does not say what it would take');

  const second = answerFor('again', { strikes: first.strikes });
  assert.equal(second.strikes, 2);
  assert.equal(second.closes, false);
  assert.notEqual(second.lines[0], first.lines[0], 'she says the same thing twice in a row');

  const third = answerFor('and again', { strikes: second.strikes });
  assert.equal(third.strikes, STRIKES);
  assert.equal(third.closes, true);
  assert.match(third.lines.join(' '), /INTERFACE CLOSED/);
  // Nothing else happens. Reading what the room says in your name is not an attempt on the
  // archive, and the way back in is the way you came.
  assert.match(third.lines.join(' '), /OPEN IT AGAIN WHENEVER YOU LIKE/);
  assert.ok(!/CODE000|SEALED|INTRUSION/.test(third.lines.join(' ')));

  // An empty line is not an attempt at anything.
  assert.equal(parseInquiry('   '), null);
  assert.equal(answerFor('close', room).closes, true, 'leaving is not a strike');
  assert.equal(answerFor('close', room).strike, false);
});

test('inquiry: every inquiry says what it answers, and an empty room still answers', () => {
  for (const one of INQUIRIES) {
    assert.ok(one.aliases.length && one.brief.length > 10, `${one.id} does not say what it answers`);
    const lines = one.answer({}, '');
    assert.ok(lines.length && lines.every((line) => typeof line === 'string'), `${one.id} throws or says nothing in an empty room`);
  }
});

test('inquiry: every module the page imports is one the room will serve', async () => {
  // A module the page imports and the server does not serve is a white screen, and no test that
  // reads files off disk would ever notice.
  const [app, server] = await Promise.all([read('app.js'), readFile(join(import.meta.dirname, '..', 'src', 'server.mjs'), 'utf8')]);
  const served = server.match(/\[('\/[\w.-]+'(?:, )?)+\]\.includes\(url\.pathname\)/)?.[0] ?? '';
  const imported = [...app.matchAll(/^import .*from '\.\/([\w.-]+)';$/gm)].map((match) => match[1]);
  assert.ok(imported.length >= 3, 'the page imports nothing, so this is guarding nothing');
  for (const file of imported) assert.ok(served.includes(`'/${file}'`), `the page imports ${file} and the room does not serve it`);
});

test('inquiry: the console is in the frame, with its count on screen and its own way out', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  assert.match(app, /core\.body\.replaceChildren\(renderCoreStrip\(\), renderCoreTabs\(\), renderCorePanes\(\), renderCoreConsole\(\)\)/);
  // An inquiry that is already a pane opens that pane instead of printing it twice.
  assert.match(app, /showPane\(CORE_PANE_FOR\[answer\.id\] \?\? 'console'\)/);
  assert.match(app, /const CORE_PANE_FOR = \{ blocks: 'document', launch: 'launch', egress: 'egress' \}/);
  assert.match(app, /core\.strikes = 0;/, 'the count does not start over when the core opens');
  assert.match(app, /core\.console\?\.field\?\.focus\(\)/);
  // Only the count and the marker ever cross into the console.
  assert.match(app, /terms: \(read\?\.terms \?\? \[\]\)\.length/);
  assert.match(css, /\.console-strikes i\.on \{ color: var\(--warn\); \}/);
});

test("inquiry: MOTHER's alarm answers a refused designation, and nothing else", async () => {
  const app = await read('app.js');

  // The two doors that ask who you are before doing something that cannot be undone.
  assert.match(app, /designationRefused\(\{ into: nostromo\.gate\.reply \}\)/, 'the gate takes a wrong name without her noticing');
  assert.match(app, /if \(\/UNABLE TO COMPUTE\/i\.test\(error\.message\)\) designationRefused\(\);/, 'the purge takes a wrong name without her noticing');

  // Eight of them and CODE000 comes down, which is the machinery that was already built.
  assert.match(app, /if \(strikes\.count >= max\) \{ void code000\(strikes\.count\); return; \}/);
  assert.match(app, /const STRIKE_WINDOW_MS = 5 \* 60 \* 1000;/, 'a typed name is given the window of a clicked one');

  // And it is not the core. Reading what the room says in your name is not an attempt on it.
  const core = app.slice(app.indexOf('async function openCore()'), app.indexOf('function renderCoreDoc'));
  assert.ok(!/designationRefused|code000/.test(core), 'the core reaches for the alarm');
  assert.ok(!/motherAlarm/.test(app), 'the parked name outlived the parking');
});
