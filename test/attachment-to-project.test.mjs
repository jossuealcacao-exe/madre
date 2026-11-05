import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { keepAttachment, storeAttachment } from '../src/files.mjs';

// L-2 (Carlos's server, 2026-11-04): a PDF or a patient's photo attached in the conversation stayed
// in MADRE's store; putting it in the project took a `cp`, which is #4. The person chooses the place.
test('an attachment of the conversation is saved into the project where the person says, and nowhere else (L-2)', async () => {
  const home = await realpath(await mkdtemp(join(tmpdir(), 'madre-l2-')));
  try {
    const attachmentsRoot = join(home, 'attachments');
    const projectRoot = join(home, 'skinhealth');
    await mkdir(join(projectRoot, 'pacientes'), { recursive: true });
    const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0, 4]);
    const stored = await storeAttachment(attachmentsRoot, { name: 'herida día 3.jpg', bytes: photo });
    const keep = (to, fileName = stored.fileName) => keepAttachment({ attachmentsRoot, projectRoot, fileName, to });

    const saved = await keep('pacientes/PRUEBA-01/fotos/dia-3.jpg');
    assert.equal(saved.status, 201, saved.error);
    assert.equal(saved.path, 'pacientes/PRUEBA-01/fotos/dia-3.jpg');
    assert.deepEqual(await readFile(join(projectRoot, saved.path)), photo, 'the bytes changed on the way');
    assert.equal(saved.bytes, photo.length);
    // A file already there is never replaced.
    assert.equal((await keep('pacientes/PRUEBA-01/fotos/dia-3.jpg')).status, 409);
    assert.deepEqual(await readFile(join(projectRoot, saved.path)), photo);
    // Never outside the project, into MADRE's folders, a repository's, or a secret.
    for (const to of ['../fuera.jpg', '.pulse/foto.jpg', 'a/.git/foto.jpg', '.env', 'api/.env.local', '.madre/x.jpg']) {
      const refused = await keep(to);
      assert.ok([400, 403].includes(refused.status), `${to} was accepted (${refused.status})`);
    }
    // A leading slash is the project's root, as in Archivos: «/etc/foto.jpg» stays inside the project.
    assert.equal((await keep('/etc/foto.jpg')).path, 'etc/foto.jpg');
    assert.deepEqual(await readFile(join(projectRoot, 'etc', 'foto.jpg')), photo);
    // Only an attachment of this project's store, and only one that is there.
    assert.equal((await keep('conocimiento/x.pdf', '../skinhealth/pacientes/PRUEBA-01/fotos/dia-3.jpg')).status, 404);
    assert.equal((await keep('conocimiento/x.pdf', 'nada.pdf')).status, 404);
    await writeFile(join(home, 'secreto.txt'), 'no');
    assert.equal((await keep('conocimiento/x.txt', '../secreto.txt')).status, 404);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
  // The viewer offers it only for an attachment.
  const page = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(page, /keepAttachmentUI\?\.show\(root === 'attachments' && path && !url \? \{ fileName: path, name: label \?\? path \} : null\);/);
  assert.match(page, /fetch\('\/api\/attachments\/keep', \{ method: 'POST'/);
  // Into the real parent of «Open raw»: the head does not hold it directly, and inserting into the
  // head threw at load and stopped the whole page (seen in a test house, 2026-11-05).
  assert.match(page, /viewer\.open\.parentNode\.insertBefore\(button, viewer\.open\);/);
  assert.doesNotMatch(page, /head\.insertBefore\(button, viewer\.open\)/);
});

test('the route saves the attachment the way attachments travel: from this conversation, recorded in it (L-2)', async () => {
  const { createPulseServer } = await import('../src/server.mjs');
  const root = await realpath(await mkdtemp(join(tmpdir(), 'madre-l2-route-')));
  const project = join(root, 'skinhealth');
  await mkdir(project, { recursive: true });
  const { server, store } = await createPulseServer({ projectRoot: project, stateRoot: join(root, 'state'), agents: [], broadcastIntervalMs: 50 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const pdf = Buffer.from('%PDF-1.4 guía de curación\n%%EOF\n');
    const uploaded = await fetch(`${base}/api/attachments`, { method: 'POST', headers: { 'x-pulse-filename': encodeURIComponent('guía.pdf'), 'content-type': 'application/pdf' }, body: pdf }).then((answer) => answer.json());
    const keep = (to) => fetch(`${base}/api/attachments/keep`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fileName: uploaded.attachment.fileName, to }) });
    const saved = await keep('conocimiento/guia-curacion.pdf');
    assert.equal(saved.status, 201);
    assert.deepEqual(await saved.json(), { ok: true, path: 'conocimiento/guia-curacion.pdf', bytes: pdf.length });
    assert.deepEqual(await readFile(join(project, 'conocimiento', 'guia-curacion.pdf')), pdf);
    const events = await store.readAll();
    assert.ok(events.some((event) => event.type === 'project.file.created' && event.payload.path === 'conocimiento/guia-curacion.pdf' && event.payload.from === 'attachment'), 'not recorded in the conversation');
    // Again to the same place: refused, and the file stays as it was.
    const again = await keep('conocimiento/guia-curacion.pdf');
    assert.equal(again.status, 409);
    assert.match((await again.json()).error, /already there|ya existe/i);
    assert.equal((await keep('.pulse/guia.pdf')).status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
