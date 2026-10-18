// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// What `npx` leaves in MADRE's environment about the call that started it, taken away before MADRE
// runs anything (2026-10-18).
//
// npm hands every process it starts the details of its own run: which package it was asked for
// (npm_config_package), that it may say yes for you (npm_config_yes), the folder it was typed in
// (npm_config_local_prefix, INIT_CWD), its own command and script. They are about that one call,
// and every npm or npx MADRE ran after inherited them: Continuity's installer, started in a
// project, went to install the package MADRE had been launched from, in the project's folder,
// and failed. The person's npm configuration (cache, registry, prefix, their npmrc) stays.
const LAUNCH = /^(npm_config_(package|yes|call|local_prefix|npm_version|user_agent)|npm_command|npm_execpath|npm_node_execpath|npm_lifecycle_event|npm_lifecycle_script|npm_package_json|INIT_CWD)$/i;

export function forgetNpxLaunch(env = process.env) {
  const gone = [];
  for (const name of Object.keys(env)) if (LAUNCH.test(name)) { delete env[name]; gone.push(name); }
  return gone;
}
