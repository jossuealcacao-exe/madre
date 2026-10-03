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

test('runs: a line that needs a shell to mean what it says is refused, with the reason', () => {
  for (const line of ['npm test && npm run build', 'ls | head', 'echo hi > out.txt', 'npm test; rm -rf x', 'echo $HOME', 'echo `id`', 'echo "$HOME"', 'ls *.js', 'cat ~/.ssh/id_rsa', 'cd src', 'FOO=1 node x.js', 'npm test # quick', 'echo "open']) {
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

    // The next turn reads the output, like any command card.
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
