// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// One voice per place (2026-11-10, asked by the author): in the Mac app, macOS's notifications say what
// MADRE's own cards would, and the author's notices come as notifications too, once each, from Home.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const pub = (file) => readFile(join(import.meta.dirname, '..', 'public', file), 'utf8');

test('a finished conversation is said once: by macOS in the app, by MADRE\'s card in a browser', async () => {
  const app = await pub('app.js');
  assert.match(app, /return inMacApp\(\) && wants\('conversations'\);/);
  assert.match(app, /if \(elsewhere\) \{ chats\.unread\.add\(chatId\); if \(!system\) showNotice\(/);
  assert.match(app, /if \(system \|\| away\) notifyFinished\(/);
});

test('the author\'s notices reach macOS in the app, once each, and only from Home', async () => {
  const [notices, home, app] = await Promise.all([pub('notices.js'), pub('salas-mac.js'), pub('app.js')]);
  assert.match(notices, /if \(system && inMacApp\(\)\) for \(const notice of shown\) notifySystem\(notice\);/);
  assert.match(notices, /notify\(notice\.level === 'security' \? 'security' : 'notices', /);
  assert.match(notices, /once: `notice-\$\{notice\.id\}`/);
  assert.match(home, /mountNotices\(noticesHost, \{ system: true \}\)/);
  assert.doesNotMatch(app, /mountNotices\([^)]*system: true/);
});

test('notifications: each kind the person\'s, security always, a module only through its own `notifies`', async () => {
  const { mkdtemp, rm, readFile: read } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { createPulseServer } = await import('../src/server.mjs');
  const state = await mkdtemp(join(tmpdir(), 'madre-notify-'));
  const project = await mkdtemp(join(tmpdir(), 'madre-notify-p-'));
  const roster = [{ id: 'codex', label: 'Codex', detected: true, ready: true, adapter: 'codex-readonly', path: '/fake', version: 'test' }];
  const { server } = await createPulseServer({ projectRoot: project, stateRoot: state, agents: roster, invokers: { 'codex-readonly': async () => ({ text: 'ok' }) } });
  try {
    const port = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    const base = `http://127.0.0.1:${port}`;
    const first = await fetch(`${base}/api/notifications`).then((response) => response.json());
    // MADRE's own switch for all of them (2026-11-14) starts on, beside each kind.
    assert.deepEqual(first.prefs, { enabled: true, conversations: true });
    assert.ok(first.modules.some((one) => one.id === 'reminders' && one.on), 'Reminders does not ask to notify');
    const saved = await fetch(`${base}/api/notifications`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ conversations: false, security: false, updates: false, notices: false, modules: { reminders: false, ash: true } }) }).then((response) => response.json());
    assert.equal(saved.prefs.conversations, false);
    assert.equal(saved.modules.find((one) => one.id === 'reminders').on, false);
    const config = JSON.parse(await read(join(state, 'config.json'), 'utf8'));
    for (const always of ['security', 'updates', 'notices']) assert.equal(config.notifications[always], undefined, `${always} became the person's to turn off`);
    assert.equal(config.notifications.modules.ash, undefined, 'a module that never asked to notify was let in');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(state, { recursive: true, force: true, maxRetries: 6, retryDelay: 60 });
    await rm(project, { recursive: true, force: true });
  }
  const page = await pub('notifications.js');
  assert.match(page, /const ALWAYS = new Set\(\['security', 'notices', 'updates'\]\);/);
  assert.match(page, /if \(ALWAYS\.has\(kind\)\) return true;/);
  // Turned off in Settings, MADRE's switch silences every kind but new versions and the author's notices,
  // which are asked first; the updates row says «Always» and has no switch.
  assert.ok(page.indexOf("if (ALWAYS.has(kind)) return true;") < page.indexOf("if (prefs?.prefs?.enabled === false) return false;"));
  assert.match(page, /ui\.sxRow\(block, t\('New versions'\)/);
  const home = await pub('salas-mac.js');
  assert.match(home, /notify\('module:reminders', t\('Reminder'\), one\.text/);
  assert.match(home, /notify\('updates', /);
});
