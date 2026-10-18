#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The door `madre` and `npx @jossuealcala/madre` come in by (2026-10-18). It only asks which Node is
// running, in words any Node can read, and then hands over to bin/madre.mjs.
//
// madre.mjs is written for today's Node, and an old one (a server on Node 12, the first report)
// stops while reading it, before its own version check can speak: the person saw npm's
// EBADENGINE warnings and «madre: Permission denied», and nothing about what to do. Kept to the
// plainest JavaScript on purpose: no `??`, no `?.`, no `import` the reader would choke on.
'use strict';

var parts = String(process.versions.node).split('.');
var major = Number(parts[0]);
var minor = Number(parts[1]);

if (major < 22 || (major === 22 && minor < 5)) {
  process.stderr.write([
    '',
    '  MADRE necesita Node 22.5 o más nuevo, y esta computadora tiene ' + process.version + '.',
    '  Instala Node 22 (o más nuevo) desde https://nodejs.org, o con nvm: nvm install 22',
    '  y vuelve a correr el mismo comando.',
    '',
    '  MADRE needs Node 22.5 or newer, and this computer has ' + process.version + '.',
    '  Install Node 22 (or newer) from https://nodejs.org, or with nvm: nvm install 22',
    '  and run the same command again.',
    '',
    '',
  ].join('\n'));
  process.exit(1);
}

// Read only by a Node that can: an old one never parses this line, because it is a string.
var path = require('path');
var url = require('url');
new Function('target', 'return import(target)')(url.pathToFileURL(path.join(__dirname, 'madre.mjs')).href)
  .catch(function (error) {
    process.stderr.write('\n  MADRE could not start: ' + (error && error.stack ? error.stack : error) + '\n\n');
    process.exit(1);
  });
