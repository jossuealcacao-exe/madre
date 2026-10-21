#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The user manual in PDF (1.0.5): the manual's own page (public/manual.html), printed light with its
// cover, in both languages, to public/assets/manual/madre-manual-{es,en}.pdf. A tool for whoever
// releases MADRE: it needs Playwright with its Chromium; MADRE itself never does. Run it whenever
// public/manual-content.js or the version changes.
//
//   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/manual-pdf.mjs [--version 1.0.5]

import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const at = process.argv.indexOf('--version');
const version = at > 0 ? process.argv[at + 1] : JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(join(process.env.PLAYWRIGHT, 'index.mjs')).href : 'playwright');

// Only the manual's own files, from public/: the PDF is made of what MADRE serves. Its pictures go
// to paper as JPEG (sips, on the Mac that releases): Chromium keeps a JPEG as it is inside a PDF, and
// writes a WebP out in full, six megabytes a language.
const paperDir = join(tmpdir(), `madre-manual-pdf-${process.pid}`);
mkdirSync(paperDir, { recursive: true });
function forPaper(file) {
  const out = join(paperDir, `${file.split('/').pop()}.jpg`);
  if (!existsSync(out)) execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '60', '-Z', '1200', file, '--out', out], { stdio: 'ignore' });
  return out;
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(PUBLIC, path === '/manual' ? 'manual.html' : path);
  if (!file.startsWith(PUBLIC) || !existsSync(file) || statSync(file).isDirectory()) { response.writeHead(404).end(); return; }
  if (extname(file) === '.webp') { response.writeHead(200, { 'content-type': 'image/jpeg' }).end(readFileSync(forPaper(file))); return; }
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const origin = `http://127.0.0.1:${server.address().port}`;

const out = join(PUBLIC, 'assets', 'manual');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const lang of ['es', 'en']) {
    const page = await browser.newPage({ locale: lang === 'es' ? 'es-MX' : 'en-US' });
    await page.goto(`${origin}/manual?lang=${lang}&print=1&version=${encodeURIComponent(version)}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.ready === '1');
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    const file = join(out, `madre-manual-${lang}.pdf`);
    await page.pdf({
      path: file,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;padding:0 16mm;box-sizing:border-box;font:9px Helvetica,Arial,sans-serif;color:#7a807a;display:flex;justify-content:space-between"><span>MADRE ${version} · ${lang === 'es' ? 'Manual' : 'Manual'}</span><span class="pageNumber"></span></div>`,
      margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' },
    });
    console.log(`${file} · ${Math.round(statSync(file).size / 1024)} KB`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
  rmSync(paperDir, { recursive: true, force: true });
}
