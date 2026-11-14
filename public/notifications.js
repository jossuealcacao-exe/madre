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
  // MADRE's own switch for all the rest (2026-11-14): off, only those above still go out.
  if (prefs?.prefs?.enabled === false) return false;
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

// Settings › Notifications (2026-11-14, the author: «no se entienden bien; el usuario puede desactivarlas
// desde Ajustes y elegir cuáles recibir; las de actualización siempre llegan, nativas de MADRE y de la app»).
// In order: what the system allows (and a way to try it), the updates that always come, MADRE's own switch
// for the rest, and one switch per kind. The switches are the person's even while the system says no:
// they are what MADRE will send once it may. `ui` is the page's own pieces: { sxRow, sxSwitch, sxButton }
// (app.js and salas-mac.js build them the same).
export async function drawNotifications(block, ui, { onChange = null } = {}) {
  const state = systemState();
  const app = inMacApp();
  const settingsAt = app ? Notification.openSettings : null;
  const ask = async () => { try { await Notification.requestPermission(); } catch { /* answered below */ } onChange?.(); };
  const tryOne = () => { try { new Notification('MADRE', { body: t('This is how MADRE lets you know. All set.'), icon: '/assets/brand/madre-favicon.svg' }); } catch { /* the row says why */ } };
  const key = state === 'default' ? ui.sxButton(t('Allow'), ask, { tone: 'primary' })
    : state === 'denied' && settingsAt ? ui.sxButton(t('Open System Settings'), () => settingsAt())
      : state === 'granted' ? ui.sxButton(t('Send a test'), tryOne)
        : ui.sxButton(state === 'denied' ? t('Blocked') : t('Not available'), () => {});
  if (!(state === 'default' || state === 'granted' || (state === 'denied' && settingsAt))) key.disabled = true;
  ui.sxRow(block, app ? t('Permission from macOS') : t('Permission from this browser'), state === 'granted'
    ? (app ? t('On: macOS lets MADRE show you notifications.') : t('On: this browser lets MADRE show you notifications.'))
    : state === 'denied'
      ? (settingsAt ? t('Off in macOS, so nothing reaches you. Turn them on in System Settings › Notifications › MADRE; this row updates by itself when you come back.') : t('This browser blocked them for this page; allow them in its site settings.'))
      : state === 'unsupported' ? t('This browser does not offer notifications.')
        : t('MADRE asks once. Then you choose below which ones you want.'), key);
  const answer = await loadNotificationPrefs({ again: true });
  const save = async (patch) => {
    const response = await fetch('/api/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }).catch(() => null);
    if (response?.ok) prefs = await response.json().catch(() => prefs);
  };
  // The updates: never a switch. Inside MADRE (its bar and its notice) and, where the system allows, as a
  // notification of the system — MADRE's own version and, in the app, the app's.
  const always = document.createElement('span');
  always.className = 'sx-always';
  always.textContent = t('Always');
  ui.sxRow(block, t('New versions'), app ? t('When there is a new version of MADRE or of the app: inside MADRE and as a macOS notification.') : t('When there is a new version of MADRE: inside MADRE and as a notification of this browser.'), always);
  // MADRE's own switch, then one per kind under it: turned off, the kinds go grey and keep what they were,
  // so turning it on again brings back the same choice.
  let all = answer?.prefs?.enabled !== false;
  const kinds = [];
  const hint = (on) => (on ? t('On. Below, choose which ones. Turned off, MADRE only tells you about new versions.') : t('Off: MADRE only tells you about new versions.'));
  const master = ui.sxRow(block, t('Notifications from MADRE'), hint(all), ui.sxSwitch(all, async (next, input) => {
    input.disabled = true;
    await save({ enabled: next });
    input.disabled = false;
    all = next;
    const said = master.querySelector?.('.sx-hint');
    if (said) said.textContent = hint(all);
    for (const kind of kinds) {
      kind.row.classList.toggle('off', !all);
      if (kind.input) { kind.input.disabled = !all; kind.input.checked = all && kind.on; }
    }
  }, { label: t('Notifications from MADRE') }));
  const row = (title, about, on, change) => {
    const kind = { on, row: null, input: null };
    const box = ui.sxSwitch(all && on, async (next, input) => { input.disabled = true; await change(next); kind.on = next; input.disabled = !all; }, { disabled: !all, label: title });
    kind.input = box.querySelector?.('input') ?? null;
    kind.row = ui.sxRow(block, title, about, box, { off: !all });
    kinds.push(kind);
  };
  row(t('A conversation finished'), t('When an AI finishes in a conversation you are not looking at.'), answer?.prefs?.conversations !== false, (on) => save({ conversations: on }));
  for (const module of answer?.modules ?? []) row(module.name, [module.about, module.note].filter(Boolean).join(' · '), module.on, (on) => save({ modules: { [module.id]: on } }));
  return kinds;
}
