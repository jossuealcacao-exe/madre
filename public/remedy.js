// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// «See how to fix it» (2026-10-28, docs/private/BIENVENIDA-1.0.6.md, F7): one card of Diagnostics
// (public/troubleshooting.js), opened over the place where something went wrong — the welcome, or
// an agent's card in Home. Diagnostics lives inside each project, and a person who is setting MADRE
// up has none open yet; so the same card, from the same catalogue, is read here: what to do, the
// commands for the system MADRE runs on (macOS, Linux, WSL, Windows), and why it happens, folded.

import { t } from './i18n.js';
import { PLATFORMS, allConditions, fixesFor } from './troubleshooting.js';

const el = (tag, className = null, text = null) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  return node;
};
const button = (className, text, onClick) => {
  const node = el('button', className, text);
  node.type = 'button';
  if (onClick) node.addEventListener('click', onClick);
  return node;
};

// The column of commands for where MADRE runs, as src/environment.mjs says it.
export function platformOf(environment) {
  if (environment?.wsl) return 'wsl';
  if (environment?.os === 'windows' || environment?.platform === 'win32') return 'win32';
  return PLATFORMS[environment?.platform] ? environment.platform : 'darwin';
}
let asked = null;
const platformHere = () => (asked ??= fetch('/api/environment', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).then((answer) => platformOf(answer?.environment), () => 'darwin'));

// The key that opens it, beside what went wrong.
export function remedyKey(id, options = {}) {
  const key = button('wl-btn ghost small wl-remedy-key', t('See how to fix it'), () => void openRemedy(id, options));
  key.dataset.remedy = id;
  return key;
}

export async function openRemedy(id, { platform = null } = {}) {
  const condition = allConditions().find((one) => one.id === id);
  if (!condition) return null;
  let system = platform ?? await platformHere();
  const dialog = el('dialog', 'wl wl-remedy');
  dialog.setAttribute('aria-label', condition.title);
  const box = el('div', 'wl-remedy-box');
  const close = button('wl-btn ghost small wl-remedy-close', t('Close'), () => dialog.close());
  const head = el('div', 'wl-remedy-head');
  head.append(el('p', 'wl-eyebrow', `${condition.code} · ${t('Diagnostics')}`), close);
  box.append(head, el('h2', 'wl-title', condition.title), el('p', 'wl-lead', condition.remedy));
  const terminal = el('div', 'wl-card wl-remedy-terminal');
  const paint = () => {
    const seg = el('div', 'wl-seg');
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', t('Operating system'));
    for (const [value, meta] of Object.entries(PLATFORMS)) {
      const option = button(null, meta.label, () => { system = value; paint(); });
      option.setAttribute('role', 'radio');
      option.setAttribute('aria-checked', String(value === system));
      seg.append(option);
    }
    const lines = fixesFor(condition, system);
    const block = el('div', 'wl-remedy-lines');
    for (const line of lines) {
      // A command is never translated; a comment is prose a person reads.
      const comment = line.trim().startsWith('#');
      block.append(el(comment ? 'p' : 'code', comment ? 'wl-remedy-say' : null, comment ? t(line.trim()).replace(/^#\s*/, '') : line));
    }
    const runnable = lines.filter((line) => !line.trim().startsWith('#'));
    const copy = button('wl-btn small', t('Copy'), async () => {
      try { await navigator.clipboard.writeText(runnable.join('\n')); copy.textContent = t('Copied'); setTimeout(() => { copy.textContent = t('Copy'); }, 1500); } catch { copy.textContent = t('Select it'); }
    });
    copy.hidden = !runnable.length;
    const top = el('div', 'wl-row wl-remedy-top');
    top.append(el('b', null, t('In your terminal')), el('span', 'wl-tiny', PLATFORMS[system].shell), el('span', 'wl-grow'), seg);
    terminal.replaceChildren(top, block, copy);
  };
  paint();
  const why = el('details', 'wl-remedy-why');
  why.append(el('summary', null, t('Why it happens')), el('p', null, condition.diagnosis));
  box.append(terminal, why);
  dialog.append(box);
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.showModal();
  return dialog;
}
