// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The Windows installer (installer/windows, WIN-033) cannot run here; what it decides is read from
// its source. The CI runs windows-ready.ps1 on a real Windows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const here = join(import.meta.dirname, '..', 'installer', 'windows');
const nsi = await readFile(join(here, 'madre.nsi'), 'utf8');

test('windows installer · elevation never goes through Sysnative, which the elevating service lacks', () => {
  assert.doesNotMatch(nsi, /ExecShellWait\s+"runas"\s+"\$Wsl"/, 'a runas on $Wsl hands Windows a Sysnative path');
  const calls = nsi.match(/ExecShellWait "runas"[^\n]*/g) ?? [];
  assert.equal(calls.length, 1, 'every elevation goes through RunAsAdmin');
  assert.match(calls[0], /"\$SYSDIR\\cmd\.exe"/);
  assert.match(calls[0], /if exist "%WINDIR%\\Sysnative\\\$\{exe\}"/);
  for (const what of ['"wsl.exe" "--install --no-distribution', '"wsl.exe" "--update', '"dism.exe" "/online /enable-feature /featurename:VirtualMachinePlatform']) {
    assert.ok(nsi.includes(`!insertmacro RunAsAdmin ${what}`), what);
  }
});

test('windows installer · the BIOS is blamed only when Windows says virtualization is off', () => {
  const failure = nsi.slice(nsi.indexOf('!insertmacro WindowsReady $5'), nsi.indexOf('restart:'));
  assert.ok(failure.length > 0);
  const bios = failure.indexOf('$(NoVirtualization)');
  assert.ok(bios > failure.indexOf('${If} $5 == "1"') && failure.indexOf('${If} $5 == "1"') >= 0, 'NoVirtualization outside the «off» answer');
  assert.equal(nsi.split('$(NoVirtualization)').length, 2, 'NoVirtualization shown from one place only');
  // With virtualization on and the platform off, it turns the platform on and asks for a restart once.
  assert.match(failure, /\$\{If\} \$5 == "2"[\s\S]*PlatformStillOff[\s\S]*VirtualMachinePlatform[\s\S]*Goto restart/);
  // Anything else is said as what it is, not as the BIOS.
  assert.match(failure, /\$\(LinuxFailed\)/);
  // A restart still owed is asked again before anything else.
  assert.ok(nsi.indexOf('${If} $6 == "pending"') < nsi.indexOf('!insertmacro WindowsReady $5'));
});

test('windows installer · windows-ready.ps1 travels in the build and answers 0, 1 or 2', async () => {
  const script = await readFile(join(here, 'windows-ready.ps1'), 'utf8');
  const build = await readFile(join(import.meta.dirname, '..', 'scripts', 'windows-installer.mjs'), 'utf8');
  assert.match(build, /'windows-ready\.ps1'/);
  assert.match(nsi, /File "windows-ready\.ps1"/);
  assert.match(script, /SPDX-License-Identifier: BUSL-1\.1/);
  assert.match(script, /HypervisorPresent -or \$processor\.VirtualizationFirmwareEnabled\)\) \{ exit 1 \}/);
  assert.match(script, /VirtualMachinePlatform[\s\S]*InstallState -ne 1\) \{ exit 2 \}/);
  for (const [lang, words] of [['ENGLISH', 'Virtual Machine Platform'], ['SPANISH', 'Plataforma de máquina virtual']]) {
    assert.match(nsi, new RegExp(`LangString StepPlatform \\$\\{LANG_${lang}\\} "[^"]*${words}`));
  }
});
