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
  assert.match(app, /return notificationsState\(\) === 'granted' && typeof Notification\.openSettings === 'function';/);
  assert.match(app, /if \(elsewhere\) \{ chats\.unread\.add\(chatId\); if \(!system\) showNotice\(/);
  assert.match(app, /if \(system \|\| away\) notifyFinished\(/);
});

test('the author\'s notices reach macOS in the app, once each, and only from Home', async () => {
  const [notices, home, app] = await Promise.all([pub('notices.js'), pub('salas-mac.js'), pub('app.js')]);
  assert.match(notices, /if \(system && systemOn\(\)\) for \(const notice of shown\) notifySystem\(notice\);/);
  assert.match(notices, /if \(!Array\.isArray\(told\) \|\| told\.includes\(notice\.id\)\) return;/);
  assert.match(home, /mountNotices\(noticesHost, \{ system: true \}\)/);
  assert.doesNotMatch(app, /mountNotices\([^)]*system: true/);
});
