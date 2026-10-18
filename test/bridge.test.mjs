import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPulseServer } from '../src/server.mjs';
import { hardwareOnce } from '../src/modules/local-models.mjs';
import { AGENT_SETUP, deviceCodeIn, geminiSignIn, installPlanFor, loginPlanFor, looksLikeConsentPrompt } from '../src/auth-probe.mjs';

test('the bridge: one runnable install command per agent, and the room knows which sign-ins it can drive', () => {
  assert.deepEqual(installPlanFor({ id: 'codex' }), { package: '@openai/codex', command: 'npm', args: ['install', '-g', '@openai/codex', '--no-fund', '--no-audit'], display: 'npm install -g @openai/codex', fallback: null, alternatives: ['or install the ChatGPT desktop app, which bundles codex'] });
  assert.equal(installPlanFor({ id: 'claude' }).display, 'npm install -g @anthropic-ai/claude-code');
  assert.equal(installPlanFor({ id: 'gemini' }).display, 'npm install -g @google/gemini-cli');
  assert.equal(installPlanFor({ id: 'opencode' }).display, 'npm install -g opencode-ai');
  assert.equal(installPlanFor({ id: 'madre' }), null, 'the local agent is not an npm package');
  assert.deepEqual(['codex', 'claude', 'gemini', 'opencode'].map((id) => loginPlanFor({ id }).headless), [true, true, true, true], 'browser flows the room can run');
});

test('the bridge: OpenCode signs in to GitHub Copilot from the room, and never to a Claude subscription', () => {
  const plan = loginPlanFor({ id: 'opencode', path: '/x/opencode' });
  assert.deepEqual(plan.methods.map((method) => method.id), ['github-copilot'], 'only providers that let a third party sign in this way');
  assert.deepEqual([plan.method, plan.args, plan.display], ['github-copilot', ['auth', 'login', '-p', 'github-copilot'], 'opencode auth login -p github-copilot'], 'its provider list is skipped: the button chose');
  assert.deepEqual([plan.deviceCode, plan.asksForCode], [true, false], 'a code to show, none to paste');
  assert.deepEqual(plan.answers, [{ prompt: 'Select GitHub deployment type', send: '\r' }], 'github.com, the first in its menu; Enterprise stays in the terminal');
  assert.ok(!('room' in plan.methods[0]), 'how the room runs it stays on the server');
  // Anthropic does not allow claude.ai sign-ins in other tools; ChatGPT and GitLab wait for their owners.
  const doors = AGENT_SETUP.opencode.methods.flatMap((method) => [method.id, ...method.args]).join(' ');
  assert.doesNotMatch(doors, /anthropic|claude|openai|chatgpt|gitlab/i);
  assert.equal(plan.terminal.command, 'opencode auth login', 'the whole list, in a terminal');

  assert.equal(deviceCodeIn('●  Enter code: 3475-C193'), '3475-C193');
  assert.equal(deviceCodeIn('●  Enter code: 0YDY-QJULP'), '0YDY-QJULP');
  assert.equal(deviceCodeIn('Paste code here if prompted >'), null, 'a code to paste is not a code to show');
  assert.equal(deviceCodeIn('│  Enter code:'), null);
});

test('the bridge: every sign-in also says how to do it from a terminal, for whoever prefers it', () => {
  const ways = Object.fromEntries(['codex', 'claude', 'gemini', 'opencode'].map((id) => [id, loginPlanFor({ id, path: `/x/${id}` }).terminal]));
  assert.deepEqual(Object.fromEntries(Object.entries(ways).map(([id, way]) => [id, way.command])), { codex: 'codex login', claude: 'claude auth login', gemini: 'gemini', opencode: 'opencode auth login' }, 'the command a person would type, never the path MADRE found');
  assert.match(ways.claude.note, /--console/, 'the second door is said too');
  assert.match(ways.gemini.note, /\/auth/, 'Gemini signs in from its own prompt in a terminal');
});

test('the bridge: Gemini signs in with Google from the room, through its own CLI', () => {
  const plan = loginPlanFor({ id: 'gemini', path: '/x/gemini' });
  assert.deepEqual([plan.method, plan.args, plan.display], ['google', ['--prompt', 'ok'], 'gemini · Login with Google']);
  assert.deepEqual([plan.flow, plan.consent, plan.ci, plan.asksForCode], ['gemini-google', true, false, false], 'settings first, its yes/no answered, no CI to stop the browser, no code to paste');
  assert.deepEqual(plan.dropEnv, ['GEMINI_API_KEY', 'GOOGLE_API_KEY'], 'a key in the environment would win over the account');
  assert.equal(plan.env.GEMINI_CLI_NO_RELAUNCH, 'true', 'one process, so a cancel stops all of it');
  assert.ok(looksLikeConsentPrompt('Opening authentication page in your browser. Do you want to continue? [Y/n]: '));
  assert.ok(!looksLikeConsentPrompt('Paste code here if prompted >'));
});

test('Gemini\'s Google sign-in sets its settings, signs in anew, and puts everything back if it does not finish', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pulse-gemini-home-'));
  try {
    const dir = join(home, '.gemini');
    await mkdir(dir, { recursive: true });
    const before = `${JSON.stringify({ security: { auth: { selectedType: 'gemini-api-key' } }, ui: { theme: 'x' } }, null, 2)}\n`;
    await writeFile(join(dir, 'settings.json'), before);
    await writeFile(join(dir, 'oauth_creds.json'), '{"old":true}');
    const flow = geminiSignIn({ env: { GEMINI_CLI_HOME: home } });
    await flow.prepare();
    const during = JSON.parse(await readFile(join(dir, 'settings.json'), 'utf8'));
    assert.deepEqual([during.security.auth.selectedType, during.ui.theme], ['oauth-personal', 'x'], 'Login with Google selected, nothing else touched');
    assert.equal(await flow.signedIn(), false, 'the old account is put aside, so the run signs in anew');
    await flow.undo();
    assert.equal(await readFile(join(dir, 'settings.json'), 'utf8'), before);
    assert.equal(await readFile(join(dir, 'oauth_creds.json'), 'utf8'), '{"old":true}', 'the old account is back');
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('the room runs Gemini\'s sign-in end to end: answers its yes, stops it once signed in, outside the project', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-gemini-signin-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-gemini-signin-project-'));
  const home = await mkdtemp(join(tmpdir(), 'pulse-gemini-signin-home-'));
  const savedKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'a-key-that-must-not-reach-the-sign-in';
  // What Gemini does without a terminal: asks yes/no on a line that never ends, then (the browser
  // and Google, here skipped) writes its credentials and goes on to its question, which never ends.
  const script = [
    "const fs = require('fs'); const path = require('path'); const dir = path.join(process.env.GEMINI_CLI_HOME, '.gemini');",
    "process.stdout.write('\\nOpening authentication page in your browser. Do you want to continue? [Y/n]: ');",
    "process.stdin.once('data', (answer) => {",
    "  fs.writeFileSync(path.join(dir, 'seen.json'), JSON.stringify({ answer: String(answer).trim(), ci: process.env.CI ?? null, key: process.env.GEMINI_API_KEY ?? null, cwd: process.cwd() }));",
    "  fs.writeFileSync(path.join(dir, 'oauth_creds.json'), '{}');",
    "  setInterval(() => {}, 1000);",
    "});",
  ].join('\n');
  try {
    const flow = geminiSignIn({ env: { GEMINI_CLI_HOME: home }, verifyMs: 300 });
    const { server, store } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: [{ id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/x/gemini', version: '1' }],
      probe: async () => ({ gemini: (await flow.signedIn()) ? { state: 'signed-in', detail: 'via Google account' } : { state: 'signed-out', detail: 'never signed in' } }),
      loginRunners: { gemini: (agent) => ({ ...loginPlanFor(agent), command: process.execPath, args: ['-e', script], flow, env: { ...loginPlanFor(agent).env, GEMINI_CLI_HOME: home } }) },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const started = await fetch(`${base}/api/agents/gemini/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      assert.equal(started.status, 202);
      let finished = null;
      for (let attempt = 0; attempt < 240 && !finished; attempt += 1) {
        finished = (await store.readAll()).find((event) => event.type === 'connection.login.finished');
        if (!finished) await new Promise((resolve) => setTimeout(resolve, 25));
      }
      assert.ok(finished, 'the run was not stopped once signed in');
      assert.deepEqual([finished.payload.code, finished.payload.session.state], [0, 'signed-in'], 'stopped by the room because it finished, not because it failed');
      const seen = JSON.parse(await readFile(join(home, '.gemini', 'seen.json'), 'utf8'));
      assert.deepEqual([seen.answer, seen.ci, seen.key], ['y', null, null], 'its yes answered, no CI, no key from the environment');
      assert.ok(!seen.cwd.startsWith(project) && !seen.cwd.startsWith(await realpath(project)), 'its question never runs in the project');
      const settings = JSON.parse(await readFile(join(home, '.gemini', 'settings.json'), 'utf8'));
      assert.equal(settings.security.auth.selectedType, 'oauth-personal', 'it stays signed in with Google');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    if (savedKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = savedKey;
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(project, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(home, { recursive: true, force: true });
  }
});

test('a Google sign-in refused at its first question is undone, and says why (2026-10-17)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-gemini-refused-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-gemini-refused-project-'));
  const home = await mkdtemp(join(tmpdir(), 'pulse-gemini-refused-home-'));
  await mkdir(join(home, '.gemini'), { recursive: true });
  await writeFile(join(home, '.gemini', 'settings.json'), `${JSON.stringify({ security: { auth: { selectedType: 'gemini-api-key' } } })}\n`);
  // Google signs the free personal account in, then refuses it when it is first asked something.
  const script = [
    "const fs = require('fs'); const path = require('path'); const dir = path.join(process.env.GEMINI_CLI_HOME, '.gemini');",
    "process.stdout.write('\\nOpening authentication page in your browser. Do you want to continue? [Y/n]: ');",
    "process.stdin.once('data', () => {",
    "  fs.writeFileSync(path.join(dir, 'oauth_creds.json'), '{}');",
    "  setTimeout(() => { console.error('Error authenticating: IneligibleTierError: This client is no longer supported for Gemini Code Assist for individuals.'); setInterval(() => {}, 1000); }, 100);",
    "});",
  ].join('\n');
  try {
    const flow = geminiSignIn({ env: { GEMINI_CLI_HOME: home }, verifyMs: 5000 });
    const { server, store } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: [{ id: 'gemini', label: 'Gemini', detected: true, ready: true, adapter: 'gemini-readonly', path: '/x/gemini', version: '1' }],
      probe: async () => ({ gemini: { state: 'signed-in', detail: 'via API key' } }),
      loginRunners: { gemini: (agent) => ({ ...loginPlanFor(agent), command: process.execPath, args: ['-e', script], flow, env: { ...loginPlanFor(agent).env, GEMINI_CLI_HOME: home } }) },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      assert.equal((await fetch(`${base}/api/agents/gemini/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 202);
      let finished = null;
      for (let attempt = 0; attempt < 200 && !finished; attempt += 1) {
        finished = (await store.readAll()).find((event) => event.type === 'connection.login.finished');
        if (!finished) await new Promise((resolve) => setTimeout(resolve, 25));
      }
      assert.ok(finished, 'the refused run was not stopped');
      assert.notEqual(finished.payload.code, 0);
      assert.match(finished.payload.error, /refuses this account/);
      const settings = JSON.parse(await readFile(join(home, '.gemini', 'settings.json'), 'utf8'));
      assert.equal(settings.security.auth.selectedType, 'gemini-api-key', 'the key it had is what it keeps');
      assert.equal(await stat(join(home, '.gemini', 'oauth_creds.json')).then(() => true, () => false), false, 'the refused credentials are taken away');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(project, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(home, { recursive: true, force: true });
  }
});

test('the bridge: every door a CLI has, not only the first — Claude sells two accounts', () => {
  const claude = loginPlanFor({ id: 'claude', path: '/x/claude' });
  assert.deepEqual(claude.methods.map((method) => method.id), ['claudeai', 'console'], 'the subscription and the Console are both offered');
  assert.deepEqual([claude.method, claude.args], ['claudeai', ['auth', 'login']], 'the subscription is still what a plain sign-in does');
  assert.ok(claude.asksForCode, 'its page hands back a code the room has to be able to type');

  const console_ = loginPlanFor({ id: 'claude', path: '/x/claude' }, { method: 'console' });
  assert.deepEqual(console_.args, ['auth', 'login', '--console'], 'whoever pays for the API gets the Console flow');
  assert.equal(console_.display, 'claude auth login --console');
  assert.match(console_.note, /API credit/);

  // A door that does not exist falls back to the first rather than inventing arguments.
  assert.deepEqual(loginPlanFor({ id: 'claude', path: '/x/claude' }, { method: 'nope' }).args, ['auth', 'login']);
  // Codex has one way in, and nothing to paste afterwards: its own CLI listens on localhost.
  assert.deepEqual([loginPlanFor({ id: 'codex' }).methods, loginPlanFor({ id: 'codex' }).asksForCode], [null, false]);
});

test('a sign-in with a code: the address is kept, the code is typed in, and it never reaches the ledger', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-signin-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-signin-project-'));
  // A CLI that opens a page and then waits to be told the code that page gives back — which is
  // what Claude's does, and what the room could not answer until there was somewhere to type it.
  const script = [
    "console.log('Opening browser to sign in');",
    "console.log('If the browser did not open, visit: https://claude.example/authorize?code=true');",
    // The question a terminal asks never ends in a newline: that is the half-line the room
    // has to flush, or a sign-in waiting on a human looks like a sign-in saying nothing.
    "process.stdout.write('Paste code here if prompted > ');",
    "let seen = '';",
    "process.stdin.on('data', (chunk) => { seen += chunk; if (seen.includes(String.fromCharCode(10))) { const ok = seen.trim() === 'the-code'; console.log(ok ? 'Login successful' : 'Invalid code.'); process.exit(ok ? 0 : 1); } });",
  ].join('\n');
  let signedIn = false;
  const asked = [];
  try {
    const { server, store } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x/claude', version: '1' }],
      probe: async () => ({ claude: signedIn ? { state: 'signed-in', detail: 'via api_key' } : { state: 'signed-out', detail: 'not logged in' } }),
      loginRunners: {
        claude: (agent, { method } = {}) => {
          asked.push(method ?? null);
          return { headless: true, asksForCode: true, method: method ?? 'claudeai', command: process.execPath, args: ['-e', script], display: `claude auth login${method === 'console' ? ' --console' : ''}`, note: 'browser' };
        },
      },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const api = (path, payload) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload ?? {}) }).then(async (response) => ({ status: response.status, body: await response.json() }));
    const settings = () => fetch(`${base}/api/settings`).then((response) => response.json());
    const until = async (ready) => {
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const answer = await settings();
        if (ready(answer)) return answer;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      return null;
    };
    try {
      const started = await api('/api/agents/claude/login', { method: 'console' });
      assert.equal(started.status, 202);
      assert.deepEqual([started.body.command, started.body.asksForCode], ['claude auth login --console', true]);
      assert.deepEqual(asked, ['console'], 'the door the human chose is the one that runs');

      // The address stays in the room's own state instead of scrolling past in a log, and the
      // room knows the CLI is waiting — the half-line it prints never ends in a newline.
      const waiting = await until((answer) => answer.login?.awaitingCode);
      assert.ok(waiting, 'the room never noticed the sign-in was waiting for a code');
      assert.deepEqual([waiting.login.agent, waiting.login.method, waiting.login.url], ['claude', 'console', 'https://claude.example/authorize?code=true']);

      assert.equal((await api('/api/agents/claude/login/code', { code: 'two words' })).status, 400, 'that is not a code');
      assert.equal((await api('/api/agents/nope/login/code', { code: 'the-code' })).status, 409, 'nothing is waiting for that one');

      signedIn = true;
      assert.equal((await api('/api/agents/claude/login/code', { code: 'the-code' })).status, 202);
      const done = await until((answer) => !answer.loggingIn && answer.sessions.claude.state === 'signed-in');
      assert.ok(done, 'the sign-in never finished');
      assert.equal(done.login, null, 'nothing is left waiting once it is over');

      const events = await store.readAll();
      const finished = events.find((event) => event.type === 'connection.login.finished');
      assert.deepEqual([finished.payload.code, finished.payload.session.state], [0, 'signed-in']);
      assert.ok(events.some((event) => event.type === 'connection.login.answered'), 'the room records that it answered');
      assert.ok(!JSON.stringify(events).includes('the-code'), 'the code is nowhere in the ledger');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(project, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('the room runs OpenCode\'s Copilot sign-in: answers its menu, shows the device code, and never asks for one', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-opencode-signin-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-opencode-signin-project-'));
  const data = await mkdtemp(join(tmpdir(), 'pulse-opencode-signin-data-'));
  // What opencode 1.18.4 prints without a terminal (measured in an empty XDG_DATA_HOME): its menu
  // of GitHubs, then the page and the code, then a spinner that redraws one line until GitHub
  // says yes. Here the yes comes a moment later and the credentials land in a folder of the test.
  const script = [
    "const fs = require('fs'); const path = require('path'); const ESC = String.fromCharCode(27);",
    "process.stdout.write('┌  Add credential\\n│\\n◆  Select GitHub deployment type\\n│  ● GitHub.com (Public)\\n│  ○ GitHub Enterprise\\n└\\n');",
    "process.stdin.once('data', (answer) => {",
    "  fs.writeFileSync(path.join(process.env.OC_DATA, 'menu.json'), JSON.stringify({ answer: String(answer) }));",
    "  process.stdout.write('│\\n●  Go to: https://github.com/login/device\\n│\\n●  Enter code: 3475-C193\\n│\\n');",
    "  let frames = 0;",
    "  const spin = setInterval(() => { process.stdout.write(ESC + '[999D' + ESC + '[J◐  Waiting for authorization' + '.'.repeat(frames % 4)); frames += 1; }, 5);",
    "  setTimeout(() => { clearInterval(spin); fs.writeFileSync(path.join(process.env.OC_DATA, 'auth.json'), '{}'); process.stdout.write(ESC + '[999D' + ESC + '[J◇  Login successful\\n└  Done\\n'); process.exit(0); }, 600);",
    "});",
  ].join('\n');
  const signedIn = () => readFile(join(data, 'auth.json')).then(() => true, () => false);
  try {
    const { server, store } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: [{ id: 'opencode', label: 'OpenCode', detected: true, ready: true, adapter: 'opencode-readonly', path: '/x/opencode', version: '1.18.4' }],
      probe: async () => ({ opencode: (await signedIn()) ? { state: 'signed-in', detail: 'GitHub Copilot (oauth)' } : { state: 'signed-out', detail: 'no providers configured' } }),
      loginRunners: { opencode: (agent, { method } = {}) => ({ ...loginPlanFor(agent, { method }), command: process.execPath, args: ['-e', script], env: { OC_DATA: data } }) },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const settings = () => fetch(`${base}/api/settings`).then((response) => response.json());
    const until = async (ready) => {
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const answer = await settings();
        if (ready(answer)) return answer;
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      return null;
    };
    try {
      const first = await settings();
      const card = first.agents.find((agent) => agent.id === 'opencode');
      assert.deepEqual([card.login.headless, card.login.methods.map((method) => method.label)], [true, ['GitHub Copilot']], 'the card has a button for it');

      const started = await fetch(`${base}/api/agents/opencode/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'github-copilot' }) });
      assert.equal(started.status, 202);
      assert.deepEqual(await started.json(), { accepted: true, command: 'opencode auth login -p github-copilot', method: 'github-copilot', asksForCode: false });

      const shown = await until((answer) => answer.login?.deviceCode);
      assert.ok(shown, 'the room never showed the code');
      assert.deepEqual([shown.login.url, shown.login.deviceCode, shown.login.awaitingCode], ['https://github.com/login/device', '3475-C193', false], 'the page and its code, and no box to paste into');

      const done = await until((answer) => !answer.loggingIn && answer.sessions.opencode.state === 'signed-in');
      assert.ok(done, 'the sign-in never finished');
      assert.equal(done.login, null);
      assert.deepEqual(JSON.parse(await readFile(join(data, 'menu.json'), 'utf8')), { answer: '\r' }, 'github.com chosen for it, once');

      const events = await store.readAll();
      const finished = events.find((event) => event.type === 'connection.login.finished');
      assert.deepEqual([finished.payload.code, finished.payload.session.state], [0, 'signed-in']);
      const lines = events.filter((event) => event.type === 'connection.login.output');
      assert.ok(lines.some((event) => event.payload.deviceCode === '3475-C193'), 'the code travels with its line');
      assert.ok(lines.some((event) => /Login successful/.test(event.payload.line)), 'the last word is said, not buried under the spinner');
      assert.ok(lines.every((event) => !event.payload.line.includes('Waiting for authorization.')), 'the spinner frames are not piled up into one line');
      assert.ok(lines.every((event) => !event.payload.line.includes('\u001b')), 'what the room shows has no terminal escapes left in it');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(project, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(data, { recursive: true, force: true });
  }
});

test('a sign-in nobody finishes is called off, and the next one can start', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-signin-stop-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-signin-stop-project-'));
  const script = "process.stdout.write('Paste code here if prompted > '); setInterval(() => {}, 1000);";
  try {
    const { server, store } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: [{ id: 'claude', label: 'Claude', detected: true, ready: true, adapter: 'claude-readonly', path: '/x/claude', version: '1' }],
      probe: async () => ({ claude: { state: 'signed-out', detail: 'not logged in' } }),
      loginRunners: { claude: () => ({ headless: true, asksForCode: true, method: 'claudeai', command: process.execPath, args: ['-e', script], display: 'claude auth login', note: 'browser' }) },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const api = (path) => fetch(`${base}${path}`, { method: 'POST' }).then(async (response) => ({ status: response.status, body: await response.json() }));
    try {
      const over = async (count) => {
        for (let attempt = 0; attempt < 200; attempt += 1) {
          if ((await store.readAll()).filter((event) => event.type === 'connection.login.finished').length >= count) return true;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        return false;
      };
      assert.equal((await api('/api/agents/claude/login')).status, 202);
      assert.equal((await api('/api/agents/claude/login')).status, 409, 'one at a time');
      assert.equal((await api('/api/agents/claude/login/cancel')).status, 202);
      assert.ok(await over(1), 'the sign-in that was called off never ended');
      assert.ok((await store.readAll()).some((event) => event.type === 'connection.login.cancelled'));
      assert.equal((await api('/api/agents/claude/login')).status, 202, 'the next one can start');
      await api('/api/agents/claude/login/cancel');
      // Nothing is left running when the room is taken down, or the ledger is written into a
      // folder the test has already removed.
      assert.ok(await over(2));
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(project, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('the bridge installs a CLI from the room, streams it, and the agent appears without restarting', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-bridge-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-bridge-project-'));
  try {
    // The machine starts with Codex missing; the fake installer is what "npm install -g" would be.
    let installed = false;
    const roster = () => [
      { id: 'codex', label: 'Codex', detected: installed, ready: installed, adapter: 'codex-readonly', path: installed ? '/fake/codex' : null, version: installed ? '0.153.4' : null },
      { id: 'claude', label: 'Claude', detected: false, ready: false, adapter: 'claude-readonly', path: null, version: null },
    ];
    const ran = [];
    const { server } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: roster(),
      detect: async () => roster(),
      probe: async (agents) => Object.fromEntries(agents.map((agent) => [agent.id, agent.detected ? { state: 'signed-out', detail: 'not logged in' } : { state: 'not-installed', detail: 'not found' }])),
      installers: {
        codex: async ({ command, args, onLine }) => { ran.push([command, ...args].join(' ')); onLine('added 1 package'); installed = true; return { ok: true, code: 0 }; },
      },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const before = await fetch(`${base}/api/state`).then((response) => response.json());
      const codexBefore = before.agents.find((agent) => agent.id === 'codex');
      assert.deepEqual([codexBefore.detected, codexBefore.install.display, codexBefore.login.headless], [false, 'npm install -g @openai/codex', true], 'the first paint already knows how to install and sign in');

      const started = await fetch(`${base}/api/agents/codex/install`, { method: 'POST' });
      assert.equal(started.status, 202);
      assert.equal((await started.json()).command, 'npm install -g @openai/codex');

      // The install runs in the background; wait for the room to say it finished.
      let finished = null;
      for (let attempt = 0; attempt < 100 && !finished; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        const events = (await fetch(`${base}/api/state`).then((response) => response.json())).events;
        finished = events.find((event) => event.type === 'connection.install.finished');
      }
      assert.ok(finished, 'the install finished');
      assert.deepEqual([finished.payload.agent, finished.payload.detected, finished.payload.version], ['codex', true, '0.153.4']);
      assert.deepEqual(ran, ['npm install -g @openai/codex --no-fund --no-audit']);

      const after = await fetch(`${base}/api/state`).then((response) => response.json());
      assert.equal(after.agents.find((agent) => agent.id === 'codex').detected, true, 'the roster updated in place, no restart');
      const types = after.events.map((event) => event.type);
      assert.ok(types.includes('connection.install.started') && types.includes('connection.install.output'));
      assert.ok(after.events.some((event) => event.type === 'agents.updated' && event.payload.reason.includes('looked again')), 'the open pages are told');

      // Installing twice is refused, and so is an agent MADRE cannot install.
      assert.equal((await fetch(`${base}/api/agents/codex/install`, { method: 'POST' })).status, 409);
      assert.equal((await fetch(`${base}/api/agents/madre/install`, { method: 'POST' })).status, 404);

      // RECHECK also looks for binaries again, and answers with the whole roster.
      const probed = await fetch(`${base}/api/agents/probe`, { method: 'POST' }).then((response) => response.json());
      assert.equal(probed.agents.find((agent) => agent.id === 'codex').detected, true);
      assert.equal(probed.sessions.codex.state, 'signed-out');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(project, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('an install walled out of the system folders takes MADRE\'s own, and the agent is found there', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-bridge-admin-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-bridge-admin-project-'));
  try {
    let installed = false;
    const roster = () => [{ id: 'codex', label: 'Codex', detected: installed, ready: installed, adapter: 'codex-readonly', path: installed ? '/fake/codex' : null, version: installed ? '1' : null }];
    const tried = [];
    const { server, store } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: roster(),
      detect: async () => roster(),
      probe: async (agents) => Object.fromEntries(agents.map((agent) => [agent.id, { state: agent.detected ? 'signed-out' : 'not-installed', detail: '' }])),
      installers: {
        // The first attempt hits the system folder and is refused; the second, into MADRE's prefix, works.
        codex: async ({ args, onLine }) => {
          tried.push(args.join(' '));
          if (!args.includes('--prefix')) { onLine('npm ERR! code EACCES'); onLine('npm ERR! Missing write access to /usr/local/lib/node_modules'); return { ok: false, code: 243 }; }
          onLine('added 1 package'); installed = true; return { ok: true, code: 0 };
        },
      },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      await fetch(`http://127.0.0.1:${server.address().port}/api/agents/codex/install`, { method: 'POST' });
      let finished = null;
      for (let attempt = 0; attempt < 100 && !finished; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        finished = (await store.readAll()).find((event) => event.type === 'connection.install.finished');
      }
      assert.equal(finished.payload.detected, true, 'the agent is there in the end');
      assert.equal(finished.payload.where, 'madre');
      assert.match(finished.payload.prefix, /\.pulse\/tools$/);
      assert.equal(tried.length, 2, 'the system folder first, MADRE\'s own second');
      assert.ok(tried[1].includes('--prefix'));
      const said = (await store.readAll()).filter((event) => event.type === 'connection.install.output').map((event) => event.payload.line).join('\n');
      assert.match(said, /cannot write to this computer's system folder without an administrator[\s\S]*Installing into MADRE's own folder/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(project, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('detection looks in MADRE\'s own tools folder as well as along PATH', async () => {
  const { toolsBin, toolsPrefix, findExecutable } = await import('../src/runtime-detection.mjs');
  const home = await mkdtemp(join(tmpdir(), 'pulse-tools-'));
  try {
    assert.equal(toolsPrefix({ PULSE_HOME: home }), join(home, 'tools'));
    assert.equal(toolsBin({ PULSE_HOME: home }), join(home, 'tools', process.platform === 'win32' ? '' : 'bin').replace(/\/$/, ''));
    const bin = toolsBin({ PULSE_HOME: home });
    await mkdir(bin, { recursive: true });
    await writeFile(join(bin, 'codex'), '#!/bin/sh\necho 1\n', { mode: 0o755 });
    assert.equal(await findExecutable(['codex'], bin), join(bin, 'codex'), 'a CLI MADRE installed is found where MADRE put it');
  } finally {
    await rm(home, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});

test('the local brain: one step at a time, with the command for this system in plain sight', async () => {
  const { ollamaInstallPlan, ollamaStartPlan } = await import('../src/modules/ollama.mjs');
  const withBrew = ollamaInstallPlan({ platform: 'darwin', brew: '/opt/homebrew/bin/brew' });
  assert.deepEqual([withBrew.command, withBrew.args, withBrew.display], ['/opt/homebrew/bin/brew', ['install', 'ollama'], 'brew install ollama']);
  const withoutBrew = ollamaInstallPlan({ platform: 'darwin', brew: null });
  assert.equal(withoutBrew.command, null, 'nothing is run behind the human when MADRE has no way in');
  assert.equal(withoutBrew.download, 'https://ollama.com/download');
  const linux = ollamaInstallPlan({ platform: 'linux' });
  assert.deepEqual([linux.command, linux.display], ['sh', 'curl -fsSL https://ollama.com/install.sh | sh']);
  assert.match(linux.note, /own install script/);
  assert.equal(ollamaInstallPlan({ platform: 'win32' }).download, 'https://ollama.com/download');
  assert.deepEqual(ollamaStartPlan(), { command: 'ollama', args: ['serve'], display: 'ollama serve' });
});

test('the local brain refuses to start when it is not here, and says so instead of guessing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-ollama-'));
  const project = await mkdtemp(join(tmpdir(), 'pulse-ollama-project-'));
  try {
    const { server } = await createPulseServer({
      projectRoot: project,
      stateRoot: root,
      agents: [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake/codex', version: '1' }],
      probe: async () => ({ codex: { state: 'signed-in', detail: '' } }),
      // No Ollama anywhere: the room must offer the way in, never pretend.
      ollamaProbe: async () => ({ running: false, host: null, models: [], embedModel: null, chatModel: null }),
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const seen = await fetch(`${base}/api/ollama`).then((response) => response.json());
      assert.equal(seen.ollama.running, false);
      assert.ok('binary' in seen.ollama && 'install' in seen.ollama && 'start' in seen.ollama, 'the bridge is told what it can offer');
      // The chat model offered is the one this computer runs well (src/modules/local-models.mjs).
      assert.equal(seen.recommended.chat, (await hardwareOnce()).recommended.run?.ollama ?? 'qwen2.5:3b');
      assert.ok(seen.recommended.hardware?.models?.length, 'with the sizes it can run and train');
      const pulled = await fetch(`${base}/api/ollama/pull`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'qwen2.5:3b' }) });
      assert.equal(pulled.status, 412, 'nothing is pulled into an Ollama that is not running');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(project, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
  }
});
