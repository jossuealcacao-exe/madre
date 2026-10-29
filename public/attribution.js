// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE

// Who made MADRE (2026-10-15). This file is what NOTICE asks every copy and
// every work based on MADRE to keep showing: the corner of every project and of Home, «MADRE
// <version> · © 2026 Jossue Alcalá» linked to its author, and the same attribution in the
// Appropriate Legal Notices (Settings › Updates and errors › License and authorship). One source
// for both pages, so the words cannot drift from NOTICE and the terms (test/attribution.test.mjs).

import { language, t } from './i18n.js';
import { trazoDrawing } from './icons.js';

export const AUTHOR = 'Jossue Alcalá';
export const AUTHOR_URL = 'https://jossuealcala.com';
export const YEAR = 2026;
export const LICENSE_NAME = 'Business Source License 1.1';
const REPO = 'https://github.com/jossuealcacao-exe/madre';
export const LEGAL_LINKS = {
  license: `${REPO}/blob/main/LICENSE`,
  source: REPO,
};

export function drawAttribution(host, version) {
  if (!host || !version) return null;
  const link = document.createElement('a');
  link.className = 'colophon-link';
  link.href = AUTHOR_URL;
  link.target = '_blank';
  link.rel = 'noopener';
  const name = document.createElement('b');
  name.textContent = `MADRE ${version}`;
  link.append(name, document.createTextNode(` · © ${YEAR} ${AUTHOR}`));
  host.replaceChildren(link);
  host.hidden = false;
  return link;
}

// The keys modules put beside the version (src/modules/sdk.mjs, `footer`, 2026-10-18): drawn here,
// with MADRE's own icons, so a module never reaches into the page. Each one opens its address in a
// new tab; hovered or focused, it shows the module's words and the key that goes there. Asked again
// whenever the modules change.
const FOOTER_GLYPHS = {
  heart: trazoDrawing('heart'),
  star: trazoDrawing('star'),
  link: trazoDrawing('links'),
};
const footerWords = (value) => (value == null ? '' : typeof value === 'string' ? value : value[language()] ?? value.en ?? value.es ?? '');
export async function drawColophonKeys(host) {
  if (!host) return null;
  const answer = await fetch('/api/modules/footer', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)).catch(() => null);
  host.querySelector('.colophon-keys')?.remove();
  const keys = (answer?.keys ?? []).flatMap((module) => (module.footer ?? []).map((key) => ({ ...key, module: module.id })));
  if (!keys.length) return null;
  const make = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; };
  const box = make('span', 'colophon-keys');
  for (const key of keys) {
    const label = footerWords(key.label);
    const one = make('span', `colophon-key ${key.icon}`);
    const press = make('a', 'colophon-key-mark');
    press.href = key.url;
    press.target = '_blank';
    press.rel = 'noopener';
    press.setAttribute('aria-label', label);
    press.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true">${FOOTER_GLYPHS[key.icon] ?? FOOTER_GLYPHS.link}</svg>`; // trusted: our own SVG strings
    const card = make('span', 'colophon-card');
    card.setAttribute('role', 'tooltip');
    card.append(make('b', null, label));
    if (footerWords(key.text)) card.append(make('span', null, footerWords(key.text)));
    const go = make('a', 'colophon-card-go', footerWords(key.action) || label);
    go.href = key.url;
    go.target = '_blank';
    go.rel = 'noopener';
    card.append(go);
    one.append(press, card);
    box.append(one);
  }
  host.append(box);
  return box;
}

// The legal notices (1.1.0, Business Source License 1.1): the copyright, who may use MADRE for free,
// that there is no warranty, how to read the license and where the code is — and the author's
// attribution, which NOTICE asks every copy to keep. Built with the Settings blocks both pages share.
export function drawLegal(host) {
  if (!host) return null;
  const make = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; };
  const block = make('section', 'sx-block sx-legal');
  const head = make('header', 'sx-head');
  const words = make('div', 'sx-words');
  words.append(make('h3', null, t('License and authorship')), make('p', null, t('© {year} {author}. MADRE\'s code is public. Under the {license} it is free for individuals and for organizations of up to 10 people, also to provide services to others; larger organizations, or offering it to others as a service, need a commercial license. Each version becomes GNU AGPL v3 four years after it is published. It comes with no warranty of any kind.', { year: YEAR, author: AUTHOR, license: LICENSE_NAME })));
  head.append(words);
  const rows = make('div', 'sx-rows');
  const row = (label, hint, url, words) => {
    const line = make('div', 'sx-row');
    const text = make('div', 'sx-words');
    text.append(make('b', null, label));
    if (hint) text.append(make('span', 'sx-hint', hint));
    const box = make('div', 'sx-control');
    const link = make('a', 'sx-btn', words);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    box.append(link);
    line.append(text, box);
    rows.append(line);
  };
  row(t('Made by {author}', { author: AUTHOR }), t('MADRE shows its author in the corner. Please keep it in every copy.'), AUTHOR_URL, 'jossuealcala.com');
  row(t('The license'), t('{license} · free for individuals and teams of up to 10', { license: LICENSE_NAME }), LEGAL_LINKS.license, t('Read'));
  row(t('The source code'), t('On GitHub, to read and to change.'), LEGAL_LINKS.source, 'GitHub');
  block.append(head, rows);
  host.append(block);
  return block;
}
