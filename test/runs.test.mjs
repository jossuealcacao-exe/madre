import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { parseRunRequest, withoutRunRequest, splitCommand, whyText, MAX_COMMANDS } from '../src/runs.mjs';
import { RunDesk, keepEnds } from '../src/room/runs.mjs';
import { EventStore } from '../src/event-store.mjs';
import { Room } from '../src/room.mjs';

const block = (body) => `Lo cambié; falta ver que pase.\n\n\`\`\`pulse-run\n${body}\n\`\`\``;
// The room hands results back on its own time: wait for the ledger to say it did.
async function waitFor(store, find, { ms = 8000 } = {}) {
  const until = Date.now() + ms;
  for (;;) {
    const found = find(await store.readAll());
    if (found) return found;
    if (Date.now() > until) throw new Error('waited in vain');
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
}
const gitInit = (cwd) => new Promise((resolve, reject) => execFile('git', ['init', '-q'], { cwd }, (error) => (error ? reject(error) : resolve())));

test('runs: a line splits into the argv sh would give it, and nothing sh would expand', () => {
  assert.deepEqual(splitCommand('npm test').argv, ['npm', 'test']);
  assert.deepEqual(splitCommand(`git log --format='%h %s' -n 3`).argv, ['git', 'log', '--format=%h %s', '-n', '3']);
  assert.deepEqual(splitCommand('node -e "console.log(\\"hi\\")"').argv, ['node', '-e', 'console.log("hi")']);
  assert.deepEqual(splitCommand('grep -rn "a | b" src').argv, ['grep', '-rn', 'a | b', 'src'], 'a pipe inside quotes is text');
  assert.deepEqual(splitCommand('echo a\\ b').argv, ['echo', 'a b']);
  assert.deepEqual(splitCommand('git show HEAD~1').argv, ['git', 'show', 'HEAD~1'], 'a ~ inside a word is not a home directory');
  assert.deepEqual(splitCommand("echo ''").argv, ['echo', ''], 'an empty quoted argument is still an argument');
});

test('runs: "~/" opening a word is the home folder, put in only when the line runs', async () => {
  const { expandHome } = await import('../src/runs.mjs');
  // The privacy guard writes every home path in a reply as ~/…, so that is how an agent names one.
  const asked = parseRunRequest(block('Leer la guía\n$ cat ~/pulse/docs/SDK.md "~/literal" ~'));
  const [command] = asked.commands;
  assert.deepEqual(command.argv, ['cat', '~/pulse/docs/SDK.md', '~/literal', '~'], 'the record keeps what the human read');
  assert.deepEqual(expandHome(command, '/home/ana'), ['cat', join('/home/ana', 'pulse/docs/SDK.md'), '~/literal', '/home/ana'], 'quoted, it stays a literal');
  assert.deepEqual(expandHome({ argv: ['npm', 'test'] }, '/home/ana'), ['npm', 'test']);
  assert.match(whyText(splitCommand('cat ~root/.profile')), /another user's home/);
});

test('runs: a line that needs a shell to mean what it says is refused, with the reason', () => {
  for (const line of ['npm test && npm run build', 'ls | head', 'echo hi > out.txt', 'npm test; rm -rf x', 'echo $HOME', 'echo `id`', 'echo "$HOME"', 'ls *.js', 'cat ~root/.profile', 'cd src', 'FOO=1 node x.js', 'npm test # quick', 'echo "open']) {
    const split = splitCommand(line);
    assert.equal(split.argv, undefined, `${line} was accepted`);
    assert.ok(split.why, `${line} was refused without a reason`);
  }
  assert.equal(whyText({ ...splitCommand('ls | head') }), 'uses "|", which needs a shell; put each command on its own line');
  assert.equal(whyText(splitCommand('cd src')), '"cd" is a shell builtin; every line already runs from the project root');
});

test('runs: a request needs a reason and closes the reply; refused lines travel with their reason', () => {
  const asked = parseRunRequest(block('Ver que el parser no se rompió\n$ npm test\n$ ls | head\n$ npm test\n- no soy un comando'));
  assert.equal(asked.reason, 'Ver que el parser no se rompió');
  assert.equal(asked.commands.length, 2, 'the same line twice, or a line without "$", became a command');
  assert.deepEqual(asked.commands[0], { line: 'npm test', argv: ['npm', 'test'] });
  assert.equal(asked.commands[1].argv, undefined);
  assert.match(asked.commands[1].why, /needs a shell/);

  assert.equal(parseRunRequest(block('$ npm test')), null, 'a request without a reason asks the human to run something on faith');
  assert.equal(parseRunRequest(block('Solo un motivo')), null);
  assert.equal(parseRunRequest(`${block('Motivo\n$ npm test')}\n\nY una cosa más.`), null, 'a block mid-reply is an example');
  assert.equal(parseRunRequest('nada que ver'), null);
  const many = parseRunRequest(block(`Muchos\n${Array.from({ length: MAX_COMMANDS + 3 }, (_, i) => `$ node -e ${i}`).join('\n')}`));
  assert.equal(many.commands.length, MAX_COMMANDS);
});

test('runs: a long one-liner still runs; only a runaway line is refused', () => {
  const body = `const sessions = ${'x'.repeat(700)}; console.log(sessions.length)`;
  const line = `npx tsx -e "(async () => { ${body} })()"`;
  const asked = parseRunRequest(`x\n\n\`\`\`pulse-run\nList the active sessions\n$ ${line}\n$ node -e "${'y'.repeat(5000)}"\n\`\`\``);
  assert.ok(line.length > 500);
  assert.equal(asked.commands[0].line, line);
  assert.deepEqual(asked.commands[0].argv, ['npx', 'tsx', '-e', `(async () => { ${body} })()`]);
  assert.equal(asked.commands[1].argv, undefined);
  assert.equal(asked.commands[1].why, 'is too long to read before pressing it');
});

test('runs: the room shows the commands as buttons, so the fence leaves the text', () => {
  assert.equal(withoutRunRequest(block('Motivo\n$ npm test')), 'Lo cambié; falta ver que pase.');
  assert.equal(withoutRunRequest('Una respuesta normal.'), 'Una respuesta normal.');
});

test('runs: the desk runs an argv with no shell, keeps both ends of a long output, and can be stopped', async () => {
  const desk = new RunDesk();
  const ok = await desk.run({ argv: [process.execPath, '-e', 'console.log("out"); console.error("err")'], cwd: tmpdir() });
  assert.equal(ok.ok, true);
  assert.equal(ok.exitCode, 0);
  assert.match(ok.text, /out/);
  assert.match(ok.text, /err/);

  // Shell metacharacters in an argument arrive as text: nothing interprets them.
  const literal = await desk.run({ argv: [process.execPath, '-e', 'console.log(process.argv[1])', '$HOME && echo pwned'], cwd: tmpdir() });
  assert.equal(literal.text, '$HOME && echo pwned');

  const failed = await desk.run({ argv: [process.execPath, '-e', 'process.exit(3)'], cwd: tmpdir() });
  assert.equal(failed.ok, false);
  assert.equal(failed.exitCode, 3);
  assert.match(failed.text, /exit code 3/);

  const missing = await desk.run({ argv: ['madre-no-such-program-xyz'], cwd: tmpdir() });
  assert.equal(missing.ok, false);
  assert.match(missing.text, /not installed, or not on the PATH/);

  const slow = await desk.run({ argv: [process.execPath, '-e', 'setTimeout(() => {}, 60000)'], cwd: tmpdir(), timeoutMs: 200 });
  assert.equal(slow.ok, false);
  assert.match(slow.stoppedBy, /timeout/);

  const pending = desk.run({ argv: [process.execPath, '-e', 'setTimeout(() => {}, 60000)'], cwd: tmpdir() });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(desk.busy, true);
  assert.equal(desk.stop('STOPALL'), true);
  const stopped = await pending;
  assert.equal(stopped.stoppedBy, 'STOPALL');
  assert.equal(desk.busy, false);

  const long = keepEnds(`start${'x'.repeat(50000)}end`);
  assert.ok(long.startsWith('start') && long.endsWith('end') && long.length < 20000);
});

test('runs: an agent asks, the human presses, the output comes back to the room with a checkpoint to UNDO', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-runs-'));
  const logDir = await mkdtemp(join(tmpdir(), 'pulse-runs-log-'));
  try {
    await gitInit(root);
    await writeFile(join(root, 'README.md'), 'v1\n');
    const store = await new EventStore(join(logDir, 'events.jsonl')).initialize();
    const agents = [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x', version: '1' }];
    const prompts = [];
    const script = 'require("fs").writeFileSync("made.txt", "by the command\\n"); console.log("wrote it")';
    const room = new Room({ store, agents, projectRoot: root, invokers: {
      'claude-readonly': async ({ prompt }) => {
        prompts.push(prompt);
        return { text: `Hecho.\n\n\`\`\`pulse-run\nComprobar que escribe\n$ ${process.execPath} -e '${script}'\n$ ls | head\n\`\`\``, usage: null };
      },
    } });

    // Off: the block is not taught and not read.
    await room.send({ text: 'arregla esto', target: 'claude' });
    let events = await store.readAll();
    assert.equal(events.some((event) => event.type === 'run.requested'), false);
    assert.doesNotMatch(prompts.at(-1), /pulse-run/);

    room.setRuns(true);
    await room.send({ text: 'arregla esto', target: 'claude' });
    assert.match(prompts.at(-1), /```pulse-run/, 'the turn was not taught the block');
    events = await store.readAll();
    const request = events.find((event) => event.type === 'run.requested');
    assert.ok(request, 'the request never reached the room');
    assert.equal(request.payload.reason, 'Comprobar que escribe');
    const reply = events.filter((event) => event.type === 'message.created' && event.payload.role === 'assistant').at(-1);
    assert.equal(reply.payload.text, 'Hecho.', 'the fence stayed in the reply');
    const { responseMessageId } = request.payload;

    // Nothing ran by being asked for.
    assert.equal(await access(join(root, 'made.txt')).then(() => true, () => false), false);

    // A refused line, an unknown request and an index out of range never run.
    assert.equal((await room.runRequested({ responseMessageId, index: 1 })).status, 422);
    assert.equal((await room.runRequested({ responseMessageId: 'nope', index: 0 })).status, 404);
    assert.equal((await room.runRequested({ responseMessageId, index: 7 })).status, 404);

    const ran = await room.runRequested({ responseMessageId, index: 0 });
    assert.equal(ran.ok, true);
    assert.equal(await readFile(join(root, 'made.txt'), 'utf8'), 'by the command\n');
    events = await store.readAll();
    assert.ok(events.some((event) => event.type === 'run.started' && event.payload.index === 0));
    const card = events.filter((event) => event.type === 'command.output').at(-1);
    assert.equal(card.payload.name, 'run');
    assert.equal(card.payload.ok, true);
    assert.match(card.payload.text, /wrote it/);
    assert.match(card.payload.title, /exit 0 · .* · asked by @claude/);
    assert.deepEqual(card.payload.run.files.map((file) => file.path), ['made.txt']);

    // The only line that can run has run: the agent that asked hears it, without the human
    // writing «ya lo corrí», at the mode its turn had and with what it was answering.
    const handed = await waitFor(store, (all) => all.find((event) => event.type === 'message.created' && event.payload.returns === responseMessageId));
    assert.equal(handed.payload.auto, 'runs');
    assert.equal(handed.payload.sender, 'you');
    assert.equal(handed.payload.target, 'claude');
    await waitFor(store, (all) => all.filter((event) => event.type === 'agent.completed').length >= 3);
    assert.match(prompts.at(-1), /The human ran the commands you asked for/);
    assert.match(prompts.at(-1), /Your turn was answering: arregla esto/);
    assert.match(prompts.at(-1), /wrote it/, 'the output never reached the agent that asked');
    assert.match(prompts.at(-1), /could not run at all \(no shell\): \$ ls \| head/);

    // And the next turn of anyone reads the output, like any command card.
    await room.send({ text: '¿pasó?', target: 'claude' });
    assert.match(prompts.at(-1), /wrote it/, 'the output never reached the next turn');

    // UNDO puts the files back, and says it was a command.
    const undone = await room.undoControl(card.payload.run.checkpointId);
    assert.equal(undone.ok, true);
    assert.equal(await access(join(root, 'made.txt')).then(() => true, () => false), false);
    events = await store.readAll();
    assert.equal(events.filter((event) => event.type === 'control.reverted').at(-1).payload.command, request.payload.commands[0].line);

    // Switched off, a request already in the room does not run any more.
    room.setRuns(false);
    assert.equal((await room.runRequested({ responseMessageId, index: 0 })).status, 412);
    await room.shutdown();
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(logDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('runs: AIRLOCK runs its own commands and GHOST asks for nothing, so the block is only taught from #1 to #3', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-runs-modes-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x', version: '1' }];
    const room = new Room({ store, agents, projectRoot: root, invokers: {} });
    const taught = async (mode) => (await room.briefing({ agent: 'claude', mode })).parts.some((part) => part.id === 'runs');
    assert.equal(await taught(1), false, 'taught while the module is off');
    room.setRuns(true);
    assert.deepEqual([await taught(0), await taught(1), await taught(3), await taught(4)], [false, true, true, false]);
    await room.shutdown();
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('models: a model chosen for one agent never reaches another, and a CLI that does not know its model is said plainly', async () => {
  const { belongsElsewhere, MODEL_NOT_FOUND } = await import('../src/models.mjs');
  assert.equal(belongsElsewhere('gemini', 'gpt-5.6-sol'), true);
  assert.equal(belongsElsewhere('codex', 'gpt-5.6-sol'), false);
  assert.equal(belongsElsewhere('opencode', 'gpt-5.6-sol'), false, 'OpenCode speaks to many providers');
  assert.equal(belongsElsewhere('gemini', 'my-tuned-model'), false, 'a name nobody owns is the human\'s to try');
  assert.match('[API Error: models/gpt-5.6-sol is not found for API version v1beta, or is not supported for generateContent.]', MODEL_NOT_FOUND);

  const root = await mkdtemp(join(tmpdir(), 'pulse-model-'));
  try {
    const store = await new EventStore(join(root, 'events.jsonl')).initialize();
    const agents = ['codex', 'gemini'].map((id) => ({ id, label: id === 'codex' ? 'Codex' : 'Gemini', detected: true, ready: true, adapter: `${id}-readonly`, path: '/x', version: '1' }));
    const asked = [];
    const room = new Room({ store, agents, projectRoot: root, invokers: {
      'gemini-readonly': async ({ model }) => { asked.push(model); if (model === 'gemini-typo') throw new Error('[API Error: models/gemini-typo is not found for API version v1beta]'); return { text: 'ok', usage: null }; },
      'codex-readonly': async ({ model }) => { asked.push(model); return { text: 'ok', usage: null }; },
    } });
    // The case in the field: Gemini's message carried Codex's model.
    await room.send({ text: 'hola', target: 'gemini', model: 'gpt-5.6-sol' });
    // And the other road: the chip on @codex, the message opening with @gemini.
    await room.send({ text: '@gemini hola', target: 'codex', model: 'gpt-5.6-luna', effort: 'high' });
    assert.deepEqual(asked, [null, null], 'another agent\'s model reached Gemini');
    let events = await store.readAll();
    const sent = events.filter((event) => event.type === 'message.created' && event.payload.role === 'user');
    assert.deepEqual(sent.map((event) => event.payload.modelIgnored), ['gpt-5.6-sol', 'gpt-5.6-luna']);
    assert.equal(sent[1].payload.effort, undefined, 'the effort chosen for Codex went with the message');

    // A name Gemini could own but does not know: it runs, fails, and the room says what happened.
    await room.send({ text: 'hola', target: 'gemini', model: 'gemini-typo' });
    events = await store.readAll();
    const failed = events.filter((event) => event.type === 'message.failed').at(-1);
    assert.match(failed.payload.error, /^Gemini does not know the model `gemini-typo`\. Choose another on the model chip beside TO @gemini.*permissions and modes have nothing to do with it\. CLI: \[API Error/);
    const { resay } = await import('../public/resay.js');
    assert.match(resay(failed.payload.error, { when: 'es' }), /^Gemini no conoce el modelo `gemini-typo`\. Elige otro en el chip de modelo junto a PARA @gemini.*los permisos y los modos no tienen nada que ver\. CLI: \[API Error/);
    await room.shutdown();
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 }); }
});

test('ports: the server this project started is told apart from the rest of the machine', async () => {
  const { parseCwds, inProject } = await import('../src/ports.mjs');
  const cwds = parseCwds('p4399\nfcwd\nn/Users/x/gumball/packages/web\np9294\nfcwd\nn/Users/x/other\n');
  assert.equal(cwds.get(4399), '/Users/x/gumball/packages/web');
  assert.equal(inProject(cwds.get(4399), '/Users/x/gumball'), true);
  assert.equal(inProject(cwds.get(9294), '/Users/x/gumball'), false);
  assert.equal(inProject('/Users/x/gumball-old', '/Users/x/gumball'), false, 'a sibling with a longer name is not the project');
});

test('choices: an option may say the mode it needs, in either order with the recommendation', async () => {
  const { parseChoice } = await import('../src/choices.mjs');
  const asked = parseChoice('x\n\n```pulse-ask\n¿Qué hago?\n- Commitea P1 y P2 (#4) (recommended)\n- Revierte y corre pruebas (recomendada) [#3 CONTROL]\n- Lo pienso antes\n```');
  assert.deepEqual(asked.options, ['Commitea P1 y P2', 'Revierte y corre pruebas', 'Lo pienso antes']);
  assert.deepEqual(asked.modes, [4, 3, null]);
  assert.equal(asked.recommended, 0);
  assert.equal(parseChoice('x\n\n```pulse-ask\n¿Qué?\n- a\n- b\n- c\n```').modes, undefined, 'a choice that is all talk carries no modes');
});

test('runs: a command that opens a port is a server: it answers at once, is not held to the limit, lets another run, and stops from its card', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-runs-serve-'));
  const logDir = await mkdtemp(join(tmpdir(), 'pulse-runs-serve-log-'));
  try {
    const store = await new EventStore(join(logDir, 'events.jsonl')).initialize();
    const agents = [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x', version: '1' }];
    // The port watcher sees the server it is asked about: the run's own process.
    let serverPid = null;
    const desk = new RunDesk({ listening: async ({ pid }) => (pid === serverPid ? [{ port: 8000, host: '127.0.0.1', pid, group: pid }] : []) });
    // Marked as this run's own: `ps` lists the whole machine, and a second suite running at the
    // same time has the same server under the same words (2026-10-21).
    const mark = `serve-${process.pid}-${Date.now()}`;
    const keepAlive = `setInterval(() => {}, 1000); console.log("Serving HTTP on 127.0.0.1 port 8000", "${mark}")`;
    const room = new Room({ store, agents, projectRoot: root, runDesk: desk, invokers: {
      'claude-readonly': async () => ({ text: `Listo.\n\n\`\`\`pulse-run\nAbrir la app\n$ ${process.execPath} -e '${keepAlive}'\n$ ${process.execPath} -e 'console.log(1)'\n\`\`\``, usage: null }),
    } });
    room.setRuns(true);
    await room.send({ text: 'sirve la app', target: 'claude' });
    const { responseMessageId } = (await store.readAll()).find((event) => event.type === 'run.requested').payload;

    // Find the server's pid as soon as it exists, the way lsof would.
    const pressed = room.runRequested({ responseMessageId, index: 0, timeoutMs: 200 });
    for (let attempt = 0; attempt < 100 && !serverPid; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const { execFileSync } = await import('node:child_process');
      const listed = execFileSync('ps', ['-o', 'pid=,command=', '-A'], { encoding: 'utf8' }).split('\n').find((line) => line.includes('setInterval') && line.includes(mark));
      if (listed) serverPid = Number(listed.trim().split(/\s+/)[0]);
    }
    assert.ok(serverPid, 'the server never started');
    const answer = await pressed;
    assert.deepEqual(answer.result.serving, { port: 8000, host: '127.0.0.1', network: false }, 'the press answers once it serves');
    let events = await store.readAll();
    assert.equal(events.find((event) => event.type === 'run.serving').payload.port, 8000);
    assert.equal(events.some((event) => event.type === 'command.output'), false, 'a serving server has not ended');
    assert.equal(room.hasLiveRuns(), true, 'the room keeps it alive');

    // While it serves, another line runs.
    const other = await room.runRequested({ responseMessageId, index: 1 });
    assert.equal(other.status, 200);
    assert.equal(other.result.ok, true);

    // STOP on its card ends it, and its output comes back as a card that says so.
    assert.equal(room.stopRun({ responseMessageId, index: 0 }), true);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      events = await store.readAll();
      if (events.filter((event) => event.type === 'command.output').length >= 2) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const served = events.filter((event) => event.type === 'command.output').find((event) => event.payload.run.index === 0);
    assert.ok(served, 'the stopped server never reported');
    assert.match(served.payload.title, /stopped \(STOP\)/);
    assert.equal(served.payload.ok, true, 'a server stopped by the human ended the way it was meant to');
    assert.equal(served.payload.run.served.port, 8000);
    assert.equal(room.hasLiveRuns(), false);
    assert.equal(room.stopRun({ responseMessageId, index: 0 }), false, 'nothing left to stop');
    await room.shutdown();
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(logDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
