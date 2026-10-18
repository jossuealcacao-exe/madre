import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { associateProject, createProject, knownRooms, listFolders, projectNameProblem, projectRoomId, salasRoomId, suggestProjects } from '../src/salas.mjs';
import { loadConfig } from '../src/config.mjs';
import { signContract } from '../src/enlaces.mjs';
import { createPulseServer } from '../src/server.mjs';

// THE LOBBY (2026-10-10): the first screen of MADRE. It adds projects by browsing the folders of
// the home folder itself (a browser cannot hand it a path), reads names and marker files and never
// what a file says, associates a folder without opening it, and gives a folder used before the id
// it already had, so its memory is there. Only its own page on this Mac may do any of it.
const scratch = (prefix) => mkdtemp(join(tmpdir(), prefix));
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); });
const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];

test('lobby · a project kept in ~/Proyectos is suggested too', async () => {
  const home = await realpath(await scratch('madre-lobby-es-'));
  const state = await realpath(await scratch('madre-lobby-es-state-'));
  try {
    await mkdir(join(home, 'Proyectos', 'tienda', '.git'), { recursive: true });
    await mkdir(join(home, 'Documentos', 'tesis'), { recursive: true });
    await writeFile(join(home, 'Documentos', 'tesis', 'package.json'), '{}');
    assert.deepEqual((await suggestProjects({ home, stateRoot: state })).map((one) => one.name).sort(), ['tesis', 'tienda']);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(state, { recursive: true, force: true });
  }
});

test('lobby · folders inside the home, projects first; suggestions; associating writes where it is and nothing else', async () => {
  const home = await realpath(await scratch('madre-lobby-home-'));
  const state = await realpath(await scratch('madre-lobby-state-'));
  try {
    await mkdir(join(home, 'Projects', 'webshop', '.git'), { recursive: true });
    await mkdir(join(home, 'Projects', 'notes'), { recursive: true });
    await writeFile(join(home, 'Projects', 'notes', 'secret.txt'), 'never read');
    await mkdir(join(home, 'api'), { recursive: true });
    await writeFile(join(home, 'api', 'package.json'), '{}');
    await mkdir(join(home, '.hidden'), { recursive: true });
    await mkdir(join(home, 'node_modules'), { recursive: true });

    const top = await listFolders({ home, stateRoot: state });
    assert.equal(top.path, home);
    assert.equal(top.parent, null);
    assert.deepEqual(top.entries.map((one) => [one.name, one.project]), [['api', true], ['Projects', false]], 'hidden folders, node_modules or the order of projects first went wrong');
    const inner = await listFolders({ path: join(home, 'Projects'), home, stateRoot: state });
    assert.equal(inner.parent, home);
    assert.deepEqual(inner.entries.map((one) => [one.name, one.project]), [['webshop', true], ['notes', false]]);
    // Outside the home: refused, whichever way it is spelled.
    assert.equal((await listFolders({ path: tmpdir(), home, stateRoot: state })).error, 'outside');
    assert.equal((await listFolders({ path: join(home, '..'), home, stateRoot: state })).error, 'outside');

    const found = await suggestProjects({ home, stateRoot: state });
    assert.deepEqual(found.map((one) => one.name).sort(), ['api', 'webshop']);

    // Associating: a record of where it is, beside the room's record; nothing opened, no file read.
    const added = await associateProject({ root: join(home, 'Projects', 'webshop'), home, stateRoot: state });
    assert.equal(added.id, projectRoomId(join(home, 'Projects', 'webshop')), 'not the id madre start gives that folder');
    const record = JSON.parse(await readFile(join(state, 'rooms', added.id, 'project.json'), 'utf8'));
    assert.equal(record.root, join(home, 'Projects', 'webshop'));
    assert.equal(record.lastOpened, null);
    const rooms = await knownRooms(state);
    assert.equal(rooms.length, 1);
    assert.equal(rooms[0].open, null, 'associating opened it');
    // Known now: said so in the folders, and no longer suggested.
    assert.equal((await listFolders({ path: join(home, 'Projects'), home, stateRoot: state })).entries.find((one) => one.name === 'webshop').known, true);
    assert.deepEqual((await suggestProjects({ home, stateRoot: state })).map((one) => one.name), ['api']);
    // A second time: the same record, when it was added kept.
    const again = await associateProject({ root: join(home, 'Projects', 'webshop'), home, stateRoot: state });
    assert.equal(again.already, true);
    // Never the home itself, never outside it, never MADRE's own folder, never a folder not there.
    assert.equal((await associateProject({ root: home, home, stateRoot: state })).error, 'outside');
    assert.equal((await associateProject({ root: tmpdir(), home, stateRoot: state })).error, 'outside');
    assert.equal((await associateProject({ root: join(home, 'gone'), home, stateRoot: state })).error, 'missing');
    const inState = await realpath(await scratch('madre-lobby-nested-'));
    assert.equal((await associateProject({ root: join(state, 'salas'), home: state, stateRoot: state })).error, 'madre');
    await rm(inState, { recursive: true, force: true });
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(state, { recursive: true, force: true });
  }
});

test('lobby · the routes answer only its own page on this Mac: not a phone, not another site, not another host name', async () => {
  const home = await realpath(await scratch('madre-lobby-routes-home-'));
  const state = await realpath(await scratch('madre-lobby-routes-state-'));
  const project = await realpath(await scratch('madre-lobby-routes-project-'));
  const before = process.env.PULSE_LOBBY_HOME;
  process.env.PULSE_LOBBY_HOME = home;
  let server;
  try {
    await mkdir(join(home, 'shop', '.git'), { recursive: true });
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: roster, invokers: {} }));
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;
    const page = { 'sec-fetch-site': 'same-origin' };
    const listed = await fetch(`${base}/api/salas/folders`, { headers: page });
    assert.equal(listed.status, 200);
    assert.deepEqual((await listed.json()).entries.map((one) => one.name), ['shop']);
    assert.equal((await fetch(`${base}/api/salas/folders`, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403, 'another site read the folders');
    assert.equal((await fetch(`${base}/api/salas/folders`, { headers: { ...page, 'x-madre-device': 'phone-1' } })).status, 403, 'a phone read the folders');
    assert.equal((await fetch(`${base}/api/salas/folders?path=${encodeURIComponent(tmpdir())}`, { headers: page })).status, 403, 'a folder outside the home was listed');
    const suggestions = await fetch(`${base}/api/salas/suggestions`, { headers: page }).then((response) => response.json());
    assert.deepEqual(suggestions.suggestions.map((one) => one.name), ['shop']);
    // Adding: only with this page's origin.
    const add = (headers) => fetch(`${base}/api/salas/projects`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ roots: [join(home, 'shop')] }) });
    assert.equal((await add({})).status, 403, 'a process without an origin added a project');
    assert.equal((await add({ origin: 'https://evil.example' })).status, 403, 'another site added a project');
    const ok = await add({ origin: base });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).added[0].name, 'shop');
    const lobby = await fetch(`${base}/api/salas`).then((response) => response.json());
    assert.ok(lobby.rooms.some((room) => room.name === 'shop' && !room.open), 'the added project is not in the lobby, asleep');
  } finally {
    if (before === undefined) delete process.env.PULSE_LOBBY_HOME; else process.env.PULSE_LOBBY_HOME = before;
    if (server) await close(server);
    for (const dir of [home, state, project]) await rm(dir, { recursive: true, force: true });
  }
});

// The lobby as a dashboard (2026-10-10): BISHOP opens in its room, here or in a new tab, by plain
// links; under it, MADRE's summary of the last work, read from the rooms' folders and checked
// against them; beside it, the recent decisions of the open rooms. Only this page reads either.
test('lobby · BISHOP opens by links, here or in a new tab, and nothing is written to it from the lobby', async () => {
  const read = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');
  const [app, page, html] = await Promise.all([read('app.js'), read('salas-mac.js'), read('salas-mac.html')]);
  assert.match(html, /<a id="sm-bishop-go" class="sm-btn primary" href="\/">/);
  assert.match(html, /<a id="sm-bishop-tab" class="sm-icon-key" href="\/" target="_blank" rel="noopener"/);
  // Asleep, it is woken first and the new tab is opened at the press, so it is not blocked.
  assert.match(page, /const tab = newTab \? window\.open\('about:blank', '_blank'\) : null;/);
  // No box to write to BISHOP, and no address that would carry words into its room.
  assert.doesNotMatch(html, /sm-bishop-input|sm-ask-box/);
  assert.doesNotMatch(page + app, /#para=/);
});

// Connecting an agent is one errand, and it used to be two screens: Home showed a name, a lamp
// and one button, and everything else — which account, a pasted key, the page a sign-in opens,
// the code it waits for — lived in a project's panel. Home does the whole errand now.
test('lobby · Home connects an agent the way a project does: the doors, the key, the code', async () => {
  const page = await readFile(join(import.meta.dirname, '..', 'public', 'salas-mac.js'), 'utf8');
  assert.match(page, /post\(`\/api\/agents\/\$\{agent\.id\}\/login`, \{ method: door\.id \}\)/, 'Home cannot say which account is signing in');
  assert.match(page, /post\(`\/api\/agents\/\$\{agent\.id\}\/login\/code`, \{ code: input\.value \}\)/, 'Home has nowhere to type the code the page gives back');
  assert.match(page, /post\(`\/api\/agents\/\$\{agent\.id\}\/login\/cancel`\)/, 'a sign-in nobody finishes cannot be called off from Home');
  assert.match(page, /post\(`\/api\/agents\/\$\{agent\.id\}\/key`, \{ key: input\.value, provider: select\?\.value \?\? null \}\)/, 'Home takes no pasted key');
  assert.match(page, /t\('Where do I get one\?'\)/, 'the key form does not say where a key comes from');
  // The panel redraws every couple of seconds. A field being typed into must survive that.
  assert.match(page, /if \(list\.contains\(document\.activeElement\) && \['INPUT', 'SELECT'\]\.includes\(document\.activeElement\.tagName\)\)/, 'the poll would yank a half-pasted key away');
});

test('lobby · the last work is read from the rooms\' folders, newest first, and each of MADRE\'s lines takes its project from the conversation it numbers', async () => {
  const { lastMessages, parseWork, recentWork, workPrompt } = await import('../src/lobby-work.mjs');
  const state = await scratch('madre-lobby-work-');
  try {
    const now = Date.parse('2026-10-10T12:00:00Z');
    const line = (type, payload, timestamp) => `${JSON.stringify({ id: 'x', sequence: 1, type, timestamp, payload })}\n`;
    // A room asleep (no open.json) with one conversation, and one with an older one and a newer one.
    const rooms = [{ id: 'shop-1', name: 'shop' }, { id: 'notes-2', name: 'notes' }];
    for (const room of rooms) await mkdir(join(state, 'rooms', room.id, 'chats', 'abcdef0123'), { recursive: true });
    await writeFile(join(state, 'rooms', 'shop-1', 'chats.json'), JSON.stringify({ active: 'main', chats: { main: { title: 'Precios', createdAt: '2026-10-09T10:00:00Z', updatedAt: '2026-10-09T10:05:00Z', messages: 2, preview: 'ok' } } }));
    await writeFile(join(state, 'rooms', 'shop-1', 'events.jsonl'), [
      line('quota.updated', { agent: 'codex' }, '2026-10-09T10:00:00Z'),
      line('message.created', { role: 'user', sender: 'human', text: 'Sube los precios un 5 %' }, '2026-10-09T10:01:00Z'),
      line('message.created', { role: 'assistant', sender: 'claude', status: 'delegated', text: 'paso interno' }, '2026-10-09T10:02:00Z'),
      line('message.created', { role: 'assistant', sender: 'claude', status: 'completed', text: 'Listo: precios +5 % en el catálogo.' }, '2026-10-09T10:05:00Z'),
    ].join(''));
    await writeFile(join(state, 'rooms', 'notes-2', 'chats.json'), JSON.stringify({ active: 'main', chats: {
      main: { title: 'Viejo', createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-01T10:00:00Z', messages: 4, preview: 'viejo' },
      abcdef0123: { title: 'Índice', createdAt: '2026-10-10T09:00:00Z', updatedAt: '2026-10-10T09:30:00Z', messages: 2, preview: 'hecho' },
    } }));
    await writeFile(join(state, 'rooms', 'notes-2', 'chats', 'abcdef0123', 'events.jsonl'), line('message.created', { role: 'assistant', sender: 'codex', text: 'Índice regenerado.' }, '2026-10-10T09:30:00Z'));

    const said = await lastMessages(join(state, 'rooms', 'shop-1', 'events.jsonl'));
    assert.deepEqual(said.map((one) => [one.who, one.text]), [['person', 'Sube los precios un 5 %'], ['claude', 'Listo: precios +5 % en el catálogo.']], 'a delegation or a quota reading was taken for something said');

    const work = await recentWork({ stateRoot: state, rooms, now });
    assert.deepEqual(work.map((item) => [item.name, item.title]), [['notes', 'Índice'], ['shop', 'Precios']], 'not newest first, or an old conversation crept in');
    assert.match(workPrompt(work), /#1 · «Índice»[\s\S]*@codex: Índice regenerado\.[\s\S]*#2 · «Precios»[\s\S]*Persona: Sube los precios/);
    assert.doesNotMatch(workPrompt(work), /shop|notes/, 'the model is told the projects, so it can mix them');

    // The project of each line is the conversation's, by its number; a number it was not given, a
    // second line for the same one, or a line without a number is not shown.
    const bullets = parseWork('Aquí va:\n#2: Se subieron los precios un 5 %.\n#7: Se cerró el trimestre.\n- **#1.** Se regeneró el índice.\n#2: otra vez lo mismo\n[shop] sin número', work);
    assert.deepEqual(parseWork('#1: Índice.\n#2: «Precios»', work), [], 'a line that only repeats the conversation\'s name was shown');
    assert.deepEqual(bullets, [{ room: 'shop-1', name: 'shop', text: 'Se subieron los precios un 5 %.' }, { room: 'notes-2', name: 'notes', text: 'Se regeneró el índice.' }]);
  } finally {
    await rm(state, { recursive: true, force: true });
  }
});

test('lobby · the last work and the decisions are read only by the lobby\'s own page, on this Mac', async () => {
  const state = await scratch('madre-lobby-reads-');
  const project = await scratch('madre-lobby-reads-project-');
  let server = null;
  try {
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: roster, invokers: {} }));
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;
    for (const path of ['/api/salas/work', '/api/salas/decisions']) {
      assert.equal((await fetch(`${base}${path}`, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403, `another site read ${path}`);
      assert.equal((await fetch(`${base}${path}`, { headers: { 'x-madre-device': 'phone-1' } })).status, 403, `a phone read ${path}`);
    }
    // Asking for the summary again is a POST: only with this page's origin.
    assert.equal((await fetch(`${base}/api/salas/work`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 403, 'a process without an origin asked for a summary');
    const work = await fetch(`${base}/api/salas/work`, { headers: { 'sec-fetch-site': 'same-origin' } }).then((response) => response.json());
    assert.equal(work.state, 'empty', 'a lobby with no conversations made something up');
    const decisions = await fetch(`${base}/api/salas/decisions`, { headers: { 'sec-fetch-site': 'same-origin' } }).then((response) => response.json());
    assert.ok(Array.isArray(decisions.decisions));
  } finally {
    if (server) await close(server);
    // A room can still be writing its last file when the server closes: retried, the folder goes.
    for (const dir of [state, project]) await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

// Taking a project out of MADRE (2026-10-10): it leaves Home, its connections end with it, and
// nothing of the Mac is touched — not its folder, and not its conversations or memory in MADRE,
// which are there again if it is added again. Never the Coordinator's; only from Home's own page.
test('lobby · a project taken out of MADRE leaves Home, ends its connections and keeps its folder and its memory', async () => {
  const home = await realpath(await scratch('madre-lobby-forget-home-'));
  const state = await realpath(await scratch('madre-lobby-forget-state-'));
  const project = await realpath(await scratch('madre-lobby-forget-project-'));
  const before = process.env.PULSE_LOBBY_HOME;
  process.env.PULSE_LOBBY_HOME = home;
  let server;
  try {
    for (const name of ['shop', 'notes']) await mkdir(join(home, name, '.git'), { recursive: true });
    ({ server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: roster, invokers: {} }));
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;
    const post = (path, payload, headers = { origin: base }) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) });
    const added = (await (await post('/api/salas/projects', { roots: [join(home, 'shop'), join(home, 'notes')] })).json()).added;
    const shop = added.find((one) => one.name === 'shop').id;
    const notes = added.find((one) => one.name === 'notes').id;
    await writeFile(join(state, 'rooms', shop, 'chats.json'), '{"active":"main","chats":{}}');
    const link = await signContract(state, { rooms: { a: shop, b: notes }, direction: 'a→b', kinds: ['fact'] }, { rooms: [shop, notes] });

    assert.equal((await post('/api/salas/forget', { room: shop }, {})).status, 403, 'a process without an origin took a project out');
    assert.equal((await post('/api/salas/forget', { room: shop }, { origin: 'https://evil.example' })).status, 403, 'another site took a project out');
    assert.equal((await post('/api/salas/forget', { room: shop }, { origin: base, 'x-madre-device': 'phone-1' })).status, 403, 'a phone took a project out');
    assert.equal((await post('/api/salas/forget', { room: salasRoomId(state) })).status, 422, 'the Coordinator\'s project was taken out');
    assert.equal((await post('/api/salas/forget', { room: 'nobody-0000000000000000' })).status, 404);
    assert.equal((await post('/api/salas/forget', { room: '../shop' })).status, 404);

    const gone = await post('/api/salas/forget', { room: shop });
    assert.equal(gone.status, 200);
    const said = await gone.json();
    assert.equal(said.name, 'shop');
    assert.deepEqual(said.ended, [link.id], 'its connection was left in force');
    assert.ok((await loadConfig(state)).enlaces[link.id].revoked, 'the connection is not revoked in the record');
    const lobby = await fetch(`${base}/api/salas`).then((response) => response.json());
    assert.ok(!lobby.rooms.some((room) => room.id === shop), 'it is still in Home');
    assert.ok(lobby.rooms.some((room) => room.id === notes), 'another project left with it');
    // Nothing of the Mac touched: its folder, and its conversations beside its record.
    assert.ok((await stat(join(home, 'shop', '.git'))).isDirectory(), 'its folder was touched');
    assert.deepEqual((await readdir(join(state, 'rooms', shop))).sort(), ['chats.json', 'project.forgotten.json']);
    // Added again: the same id, and what it had is there.
    const again = (await (await post('/api/salas/projects', { roots: [join(home, 'shop')] })).json()).added[0];
    assert.equal(again.id, shop);
    assert.ok((await knownRooms(state)).some((room) => room.id === shop), 'added again, it did not come back');
    assert.equal(await readFile(join(state, 'rooms', shop, 'chats.json'), 'utf8'), '{"active":"main","chats":{}}');
  } finally {
    if (before === undefined) delete process.env.PULSE_LOBBY_HOME; else process.env.PULSE_LOBBY_HOME = before;
    if (server) await close(server);
    for (const dir of [home, state, project]) await rm(dir, { recursive: true, force: true });
  }
});

test('home: widgets are added from a key of the bar, not only from a right-click', async () => {
  const [page, html] = await Promise.all(['salas-mac.js', 'salas-mac.html'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  assert.match(html, /<button id="sm-add-widgets" class="sm-icon-key bar" type="button" aria-label="Add widgets to Home"/);
  // Its id is its own: «sm-add» is the Add a project button.
  assert.equal(html.match(/id="sm-add"/g).length, 1);
  assert.match(page, /document\.getElementById\('sm-add-widgets'\)\?\.addEventListener\('click', \(\) => openHomeAdd\(\)\);/);
});

test('narrow screens: Home and a project keep their bars whole on a tablet and a phone', async () => {
  const [app, css, home, tour] = await Promise.all(['app.js', 'styles.css', 'salas-mac.css', 'tour.js'].map((name) => readFile(join(import.meta.dirname, '..', 'public', name), 'utf8')));
  // One side panel alone gives way too: on a tablet it no longer leaves the conversation a strip.
  assert.match(app, /if \(!members\.length \|\| members\.reduce\(\(sum, one\) => sum \+ one\.floor, COLUMN_MIN\) <= window\.innerWidth\) return false;/);
  // The tour pill says its short form on a narrow bar, and a phone's project bar keeps only what fits.
  assert.match(tour, /open\.dataset\.short = fill\(t\('Tour · \{n\}\/\{total\}'\)/);
  assert.match(css, /@media \(max-width: 1180px\) \{\n  \.tour-pill-go\[data-short\] \{ font-size: 0; \}/);
  assert.match(css, /\.shell > \.bar \.tour-pill-slot, \.shell > \.bar-home #reload-button \{ display: none !important; \}/);
  // Home: «+n» always fits whole, and on a phone the logo keeps its pulse and reload steps out.
  assert.match(home, /\.sm-tb-open:not\(\[hidden\]\) \{ min-width: 40px; \}/);
  assert.match(home, /@media \(max-width: 560px\) \{ #sm-reload \{ display: none; \} \}/);
});

test('a new project from nothing: one folder, named by the person, inside the home folder, then added', async () => {
  const home = await realpath(await scratch('madre-new-home-'));
  const state = join(home, '.pulse');
  await mkdir(join(home, 'Proyectos'), { recursive: true });
  const made = await createProject({ name: 'mi tienda', parent: join(home, 'Proyectos'), home, stateRoot: state });
  assert.equal(made.created, true);
  assert.equal(made.root, join(home, 'Proyectos', 'mi tienda'));
  assert.ok((await stat(made.root)).isDirectory());
  assert.equal(made.id, projectRoomId(made.root));
  // Without a place, the home folder itself.
  assert.equal((await createProject({ name: 'notas', home, stateRoot: state })).root, join(home, 'notas'));
  // Never twice, never a path, a device, a hidden folder or somewhere outside the home folder.
  assert.equal((await createProject({ name: 'mi tienda', parent: join(home, 'Proyectos'), home, stateRoot: state })).error, 'exists');
  for (const bad of ['a/b', '../fuera', '..', '.secreto', 'CON', 'lpt1.txt', 'termina.', 'espacio ', 'dos:puntos']) assert.equal(projectNameProblem(bad), 'name', bad);
  assert.equal(projectNameProblem('   '), 'empty');
  assert.equal((await createProject({ name: 'x', parent: tmpdir(), home, stateRoot: state })).error, 'outside');
  assert.equal((await createProject({ name: 'x', parent: state, home, stateRoot: state })).error, 'madre');
  assert.equal((await createProject({ name: 'x', parent: join(home, 'no-existe'), home, stateRoot: state })).error, 'missing');
});
