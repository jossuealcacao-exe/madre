#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// What a module is, asked in a process of its own (2026-11-01, external review #1).
//
//   node --permission --allow-fs-read=<its folder> --allow-fs-read=<MADRE> check-alone.mjs <file>
//
// A module says what it is only by loading, and loading runs its code. Checking used to load it
// inside MADRE, before the person had read what it does and accepted it: a file from the Market,
// a newer copy from a module's own address, ran with all of MADRE's rights just to be described.
// Here it loads in a node of its own that src/modules/index.mjs starts (verifyModuleText) with
// Node's permission model: it reads only its folder and MADRE's code, writes nothing, starts no
// process or thread, gets no environment, and is stopped if it does not finish. On Node 25 and
// later the network is closed as well. What comes back is words, never the module.
import { writeSync } from 'node:fs';
import { inspectModuleFile } from './index.mjs';

// Written whole before the process ends: on a pipe, process.stdout may still be writing.
const say = (answer) => writeSync(1, `\n${JSON.stringify(answer)}\n`);
try {
  say({ ok: true, module: JSON.parse(JSON.stringify(await inspectModuleFile(process.argv[2]))) });
} catch (error) {
  say({ ok: false, error: String(error?.message ?? error), code: error?.code ?? null });
}
process.exit(0);
