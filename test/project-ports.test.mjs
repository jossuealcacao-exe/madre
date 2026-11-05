import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { associateProject, choosePort, keptPorts, markProject, projectRoomId } from '../src/salas.mjs';

// L-6 (Carlos's server, 2026-11-04): CRM-Metfy, created from Home, took the first free port from
// 4317 and landed on 4319, outside the tunnel he entered by; the number changed with the order
// projects were opened in. Each project keeps the port it opened on and asks for it again.
test('each project keeps its port, asks for it again, and a new one skips the ports others keep (L-6)', async () => {
  const home = await realpath(await mkdtemp(join(tmpdir(), 'madre-ports-')));
  try {
    const state = join(home, '.pulse');
    const project = (name) => join(home, 'Proyectos', name);
    for (const name of ['skinhealth', 'crm', 'nuevo']) await mkdir(project(name), { recursive: true });
    const room = (name) => join(state, 'rooms', projectRoomId(project(name)));
    await markProject(room('skinhealth'), project('skinhealth'), { port: 4318 });
    await markProject(room('crm'), project('crm'), { port: 4319 });
    // Opened again without a port (the record is rewritten), the port stays.
    await markProject(room('skinhealth'), project('skinhealth'));
    assert.equal(JSON.parse(await readFile(join(room('skinhealth'), 'project.json'), 'utf8')).port, 4318);
    // Added again from Home, too.
    assert.equal((await associateProject({ stateRoot: state, home, root: project('crm') })).already, true);
    assert.equal(JSON.parse(await readFile(join(room('crm'), 'project.json'), 'utf8')).port, 4319);

    const free = async () => false;
    const kept = await keptPorts(state, project('crm'));
    assert.equal(kept.mine, 4319);
    assert.deepEqual([...kept.others], [4318]);
    // Opened after a restart, in any order: each gets its own number back.
    assert.equal(await choosePort({ base: 4317, ...kept, taken: free }), 4319);
    // A new project skips what Home (4317 here, taken) and the others keep.
    const fresh = await keptPorts(state, project('nuevo'));
    assert.equal(fresh.mine, null);
    assert.equal(await choosePort({ base: 4317, ...fresh, taken: async (port) => port === 4317 }), 4320);
    // Its own port taken by something else: the next free one no other project keeps.
    assert.equal(await choosePort({ base: 4317, mine: 4319, others: new Set([4318]), taken: async (port) => port === 4319 || port === 4317 }), 4320);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('the command line asks for the kept port, and the room keeps the one it opened on (L-6)', async () => {
  const bin = await readFile(new URL('../bin/madre.mjs', import.meta.url), 'utf8');
  assert.match(bin, /const kept = await keptPorts\(salasHome, await realpath\(projectRoot\)[^\n]*\);\n\s*others = kept\.others;\n\s*port = await choosePort\(\{ base: port, mine: kept\.mine, others, taken: portTaken \}\);/);
  assert.match(bin, /do port \+= 1; while \(others\.has\(port\)\);/);
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /await markProject\(roomDir, canonicalProjectRoot, \{ port, keepOpen: true \}\)/);
});
