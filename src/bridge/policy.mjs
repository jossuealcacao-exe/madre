// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// What a phone may do in a room (docs/MOBILE.md, section 4).
//
// A list of what passes, not of what does not: a route the room grows tomorrow stays on the Mac
// until somebody decides it belongs on the phone too. Reading is wide; acting is everything a
// conversation needs. From the phone a person asks up to #2 CREATE, answers what an agent asks
// (a mode up to #2), runs a line an agent proposed, undoes, stops anything, opens or starts a
// conversation, changes settings and switches MADRE's own modules on or off. What stays on the
// Mac: #3 CONTROL (its key is checked with crypto.subtle, which a page on plain http does not
// have) and #4 AIRLOCK, permissions and the key that opens them, the keys of a provider,
// installing code somebody wrote, forgetting memories and editing files. The room checks the
// parts a path cannot say — which module, which mode was asked — on its own side as well.

import { normalizeMode } from '../capabilities.mjs';
import { t } from '../i18n.mjs';

// Every file the room's page loads: one missing here and app.js cannot import it, so the whole page
// stops on the phone (test/phone-bridge.test.mjs reads app.js's imports to keep this whole).
const STATIC = new Set(['/', '/app.js', '/nostromo-engine.js', '/brands.js', '/troubleshooting.js', '/inquiry.js', '/i18n.js', '/es.js', '/resay.js', '/syntax.js', '/editor.js', '/routing.js', '/abduction.js', '/styles.css', '/review-ask.js', '/loader.js', '/tour.js', '/tour-chapters.js', '/touch.js', '/attribution.js', '/power.js', '/wallpaper.js', '/neural.js', '/hardware.js', '/code-tools.js', '/market.js', '/market-view.js', '/market-art.js', '/mcp-catalog.js']);

const READ = new Set([
  '/api/state', '/api/events', '/api/chats', '/api/version', '/api/whats-new', '/api/glance', '/api/handoff',
  '/api/memory', '/api/memory/about', '/api/memory/dashboard',
  '/api/tree', '/api/tree/search', '/api/files',
  '/api/questions', '/api/decisions', '/api/turns', '/api/models', '/api/commands', '/api/mother', '/api/briefing',
  '/api/settings', '/api/privacy', '/api/extensions', '/api/sentinel', '/api/maturity', '/api/maturity/exams',
  // The servers on the Mac, to be seen; they open on the Mac.
  '/api/ports',
  // Modules that only read on GET.
  '/api/ollama', '/api/intents',
]);
const READ_PATTERNS = [
  /^\/assets\/[a-z0-9/_.-]+$/i,
  /^\/preview\/(project|attachments)\/.+$/,
  /^\/api\/memory\/\d+\/traffic$/,
];

const ACT = new Set([
  'POST /api/messages', 'POST /api/messages/rate', 'POST /api/attachments',
  'POST /api/stop-all', 'POST /api/stop-turn', 'POST /api/runs', 'POST /api/runs/stop',
  'POST /api/chats', 'POST /api/whats-new/seen', 'POST /api/memory/ask/dismiss', 'POST /api/handoff',
  'POST /api/intents/suggest',
  // Settings, minus what the body asks about permissions (see below).
  'POST /api/settings', 'POST /api/turns', 'POST /api/language', 'POST /api/privacy', 'POST /api/updates/settings', 'POST /api/sentinel/settings',
  'POST /api/ollama/settings', 'POST /api/ollama/probe', 'POST /api/ollama/start',
]);
const ACT_PATTERNS = [
  ['POST', /^\/api\/plans\/[0-9a-f-]+\/stop$/],
  ['POST', /^\/api\/chats\/[a-z0-9]+$/],
  ['PATCH', /^\/api\/chats\/[a-z0-9]+$/],
  ['POST', /^\/api\/eyecat\/(confirm|dismiss)$/],
  ['POST', /^\/api\/control\/[\w-]+\/undo$/],
  // A mode an agent asked for: the room refuses a grant above #2 from a phone.
  ['POST', /^\/api\/modes\/[\w-]+\/decide$/],
  // MADRE's own modules, on or off: the room refuses anything that would install code.
  ['POST', /^\/api\/extensions\/[a-z0-9-]+\/(install|settings)$/],
  ['POST', /^\/api\/intents(\/[a-z0-9/-]+)?$/],
];

// The highest mode a phone may arm, and the rule's own words.
export const PHONE_MAX_MODE = 2;
const ON_THE_MAC = 'This is done on the Mac.';
const MODE_ON_THE_MAC = '#3 EDIT and #4 FULL ACCESS are opened from the Mac.';
const PERMISSIONS_ON_THE_MAC = 'Permissions are changed on the Mac.';

// The only bodies the bridge reads before passing them on.
export const inspects = (method, pathname) => method === 'POST' && (pathname === '/api/messages' || pathname === '/api/settings');

// A mode written in the message is the mode, as on the Mac: «#3» at a word's edge — in what the
// person wrote, not in the answer they quote above it (the page's «↩ @agent: “…”» line).
const MODE_TOKEN = /(^|\s)#([0-4])(?=\s|$)/;
export const writtenMode = (text) => (typeof text === 'string' ? Number(text.replace(/^↩ [^\n]*\n/, '').match(MODE_TOKEN)?.[2] ?? -1) : -1);

export function phonePolicy({ method = 'GET', pathname = '/', body = null } = {}) {
  const verb = String(method).toUpperCase();
  if (verb === 'GET' || verb === 'HEAD') {
    if (STATIC.has(pathname) || READ.has(pathname) || READ_PATTERNS.some((pattern) => pattern.test(pathname))) return { allow: true };
    return { allow: false, status: 403, error: t(ON_THE_MAC) };
  }
  const acts = ACT.has(`${verb} ${pathname}`) || ACT_PATTERNS.some(([want, pattern]) => want === verb && pattern.test(pathname));
  if (!acts) return { allow: false, status: 403, error: t(ON_THE_MAC) };
  if (pathname === '/api/settings' && body && (body.scopes !== undefined || body.override !== undefined)) return { allow: false, status: 403, error: t(PERMISSIONS_ON_THE_MAC) };
  if (verb === 'POST' && pathname === '/api/messages') {
    // Read as the room reads it (src/capabilities.mjs): «"4"» is #4 there, so it is #4 here (TEL-01).
    const asked = normalizeMode(body?.mode, body?.create === true ? 2 : 1);
    const written = writtenMode(body?.text);
    if (Math.max(asked, written) > PHONE_MAX_MODE) return { allow: false, status: 403, error: t(MODE_ON_THE_MAC) };
  }
  return { allow: true };
}
