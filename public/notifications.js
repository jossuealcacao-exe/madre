// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// NOTIFICATIONS OF THE SYSTEM (2026-11-10, asked by the author). The one place a page hands something to
// macOS (in the Mac app) or to the browser: a conversation that finished, a notice from MADRE's author,
// a new version, and what a module has to say. A new version and every notice from MADRE's author
// always go out (2026-11-10, the author: they are how a copy hears it must update); what is the
// person's to turn off (Settings › Notifications, /api/notifications) is the rest. A
// module never reaches the system: it declares `notifies` and this decides. Whether the system lets
// MADRE at all is macOS's (or the browser's) to say; the row above the switches says which, and where.

import { t } from './i18n.js';

let prefs = null;
const ALWAYS = new Set(['security', 'notices', 'updates']);
let asked = null;
const NOTIFIED = 'pulse.notified';

// What the person chose, read once and again after a change.
export function loadNotificationPrefs({ again = false } = {}) {
  if (asked && !again) return asked;
  asked = fetch('/api/notifications', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).then((answer) => { if (answer) prefs = answer; return prefs; }).catch(() => prefs);
  return asked;
}
void loadNotificationPrefs();

export const systemState = () => (typeof Notification === 'function' ? Notification.permission : 'unsupported');
// The Mac app's own (it hands `Notification.openSettings`): there they speak instead of MADRE's cards.
export const inMacApp = () => typeof Notification === 'function' && typeof Notification.openSettings === 'function';

// Whether this kind goes out: 'security', 'conversations', 'notices', 'updates' or 'module:<id>'.
export function wants(kind) {
  if (systemState() !== 'granted') return false;
  // Always: a new version and what MADRE's author says (security and every other notice).
  if (ALWAYS.has(kind)) return true;
  if (kind.startsWith('module:')) return (prefs?.modules ?? []).find((one) => one.id === kind.slice(7))?.on ?? true;
  return prefs?.prefs?.[kind] ?? true;
}

// One notification of the system. `once`: a key it is never sent twice for, on this page's address.
export function notify(kind, title, body, { tag = null, once = null, onclick = null } = {}) {
  if (!wants(kind)) return false;
  let told = [];
  if (once) {
    try { told = JSON.parse(localStorage.getItem(NOTIFIED) ?? '[]'); } catch { told = []; }
    if (!Array.isArray(told)) told = [];
    if (told.includes(once)) return false;
  }
  try {
    const note = new Notification(title, { body, ...(tag ? { tag } : {}), icon: '/assets/brand/madre-favicon.svg' });
    if (onclick) note.onclick = () => { window.focus(); onclick(); note.close?.(); };
    if (once) { try { localStorage.setItem(NOTIFIED, JSON.stringify([...told, once].slice(-200))); } catch { /* sent again next time; no harm */ } }
    return true;
  } catch { return false; }
}

// Settings › Notifications: the system's answer and its key, then one switch per kind. `ui` is the page's
// own pieces: { sxRow, sxSwitch, sxButton } (app.js and salas-mac.js build them the same).
export async function drawNotifications(block, ui, { onChange = null } = {}) {
  const state = systemState();
  const settingsAt = inMacApp() ? Notification.openSettings : null;
  const ask = async () => { try { await Notification.requestPermission(); } catch { /* answered below */ } onChange?.(); };
  const key = state === 'default' ? ui.sxButton(t('Turn on'), ask, { tone: 'primary' })
    : state === 'denied' && settingsAt ? ui.sxButton(t('Open System Settings'), () => settingsAt())
      : ui.sxButton(state === 'granted' ? t('On') : state === 'denied' ? t('Blocked') : t('Not available'), () => {});
  if (!(state === 'default' || (state === 'denied' && settingsAt))) key.disabled = true;
  ui.sxRow(block, inMacApp() ? t('Notifications of macOS') : t('Notifications of this browser'), state === 'denied'
    ? (settingsAt ? t('macOS has them turned off for MADRE. Turn them on in System Settings › Notifications › MADRE; this row follows as soon as you come back.') : t('This browser blocked them for this page; allow them in its site settings.'))
    : state === 'unsupported' ? t('This browser does not offer notifications.')
      : state === 'default' ? t('MADRE asks once. Then you choose below what it may tell you.')
        : t('On. A new version and MADRE\'s notices always come; below, the rest.'), key);
  const answer = await loadNotificationPrefs({ again: true });
  const off = state !== 'granted';
  const save = async (patch) => {
    const response = await fetch('/api/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }).catch(() => null);
    if (response?.ok) prefs = await response.json().catch(() => prefs);
  };
  const row = (title, about, on, change, { fixed = false } = {}) => {
    const box = ui.sxSwitch(fixed || on, async (next, input) => { input.disabled = true; await change(next); input.disabled = false; }, { disabled: fixed || off, label: title });
    ui.sxRow(block, title, about, box, { off });
  };
  // A new version and the author's notices are not here: they always go out.
  row(t('A conversation finished'), t('When an AI finishes in a conversation you are not looking at.'), answer?.prefs?.conversations !== false, (on) => save({ conversations: on }));
  for (const module of answer?.modules ?? []) row(module.name, [module.about, module.note].filter(Boolean).join(' · '), module.on, (on) => save({ modules: { [module.id]: on } }));
}
