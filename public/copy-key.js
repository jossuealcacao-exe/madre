// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
//
// «Copiar» beside a field that asks to type a name (2026-11-19, the author: «agregar botón copiar a
// un lado para que el usuario pueda copiar el nombre y pegarlo fácilmente; replicar donde aplique»).
// Typing the project's name stays the confirmation: the key only puts the name on the clipboard, it
// never fills the field, so saying yes is still something the person does on purpose.

import { t } from './i18n.js';
import { trazo } from './icons.js';

// Puts the key right after `input` (wrapping the two once, so they sit on one line) and keeps it in
// step with `value`: a string, or a function read at each click. No value: the key hides.
export function copyKey(input, value) {
  if (!input?.parentNode) return null;
  let wrap = input.parentElement?.classList?.contains('copy-wrap') ? input.parentElement : null;
  if (!wrap) {
    wrap = document.createElement('span');
    wrap.className = 'copy-wrap';
    input.replaceWith(wrap);
    wrap.append(input);
  }
  let key = wrap.querySelector(':scope > .copy-key');
  if (!key) {
    key = document.createElement('button');
    key.type = 'button';
    key.className = 'copy-key';
    key.innerHTML = `${trazo('copy')}<span></span>`; // trusted: our own SVG
    key.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const text = String((typeof key.copyValue === 'function' ? key.copyValue() : key.copyValue) ?? '');
      if (!text) return;
      try { await navigator.clipboard.writeText(text); } catch { return; }
      key.classList.add('copied');
      key.querySelector('span').textContent = t('Copied');
      clearTimeout(key.copiedTimer);
      key.copiedTimer = setTimeout(() => { key.classList.remove('copied'); key.querySelector('span').textContent = t('Copy'); }, 1600);
      input.focus();
    });
    wrap.append(key);
  }
  key.copyValue = value;
  const shown = String((typeof value === 'function' ? value() : value) ?? '');
  key.hidden = !shown;
  key.classList.remove('copied');
  key.querySelector('span').textContent = t('Copy');
  key.title = shown ? t('Copy «{name}»', { name: shown }) : '';
  key.setAttribute('aria-label', key.title || t('Copy'));
  return key;
}

// Hides the key of a field that is reused for something with no name to copy.
export function hideCopyKey(input) {
  const key = input?.parentElement?.classList?.contains('copy-wrap') ? input.parentElement.querySelector(':scope > .copy-key') : null;
  if (key) key.hidden = true;
}
