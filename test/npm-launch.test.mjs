import test from 'node:test';
import assert from 'node:assert/strict';
import { forgetNpxLaunch } from '../src/npm-launch.mjs';

// MADRE started by `npx` (2026-10-18): what npm left about that call never reaches what MADRE runs.
test('npx launch · its own call is forgotten, the person\'s npm configuration stays', () => {
  const env = {
    npm_config_package: './madre.tgz', npm_config_yes: 'true', npm_config_local_prefix: '/Users/a/elsewhere', INIT_CWD: '/Users/a/elsewhere',
    npm_command: 'exec', npm_execpath: '/x/npm-cli.js', npm_lifecycle_event: 'npx', npm_package_json: '/x/package.json',
    npm_config_cache: '/Users/a/.npm', npm_config_registry: 'https://registry.example', npm_config_userconfig: '/Users/a/.npmrc', npm_config_prefix: '/opt/homebrew',
    PATH: '/usr/bin', HOME: '/Users/a',
  };
  const gone = forgetNpxLaunch(env);
  assert.deepEqual(gone.sort(), ['INIT_CWD', 'npm_command', 'npm_config_local_prefix', 'npm_config_package', 'npm_config_yes', 'npm_execpath', 'npm_lifecycle_event', 'npm_package_json'].sort());
  assert.deepEqual(Object.keys(env).sort(), ['HOME', 'PATH', 'npm_config_cache', 'npm_config_prefix', 'npm_config_registry', 'npm_config_userconfig'].sort());
});
