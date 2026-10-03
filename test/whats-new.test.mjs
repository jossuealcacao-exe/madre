import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NOTES, bootWhatsNew, markSeen, notesFor, readSeen, shouldShow, whatsNew } from '../src/whats-new.mjs';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('whats new: shown once to whoever came from an older version, never on a first install', () => {
  assert.equal(shouldShow({ version: '0.7.0', seen: '0.6.0' }), true);
  assert.equal(shouldShow({ version: '0.7.0', seen: '0.7.0' }), false, 'shown again after it was seen');
  assert.equal(shouldShow({ version: '0.7.0', seen: '0.8.0' }), false, 'shown to someone who went back a version');
  assert.equal(shouldShow({ version: '0.7.0', seen: null, returning: true }), true, 'someone from before the sheet existed missed it');
  assert.equal(shouldShow({ version: '0.7.0', seen: null, returning: false }), false, 'a first install got it');
  assert.equal(shouldShow({ version: '9.9.9', seen: '0.6.0' }), false, 'a version with nothing written opened an empty sheet');
});

test('whats new: the server remembers it per person, not per port, and a first install is marked seen at start', async () => {
  const fresh = await mkdtemp(join(tmpdir(), 'madre-news-'));
  const used = await mkdtemp(join(tmpdir(), 'madre-news-'));
  try {
    // A first install: nothing under rooms yet. Marked as seen, never shown.
    const first = await bootWhatsNew({ root: fresh, version: '0.7.0' });
    assert.equal(first.returning, false);
    assert.equal(await readSeen(fresh), '0.7.0');
    assert.equal((await whatsNew({ root: fresh, version: '0.7.0', returning: first.returning })).show, false);

    // Someone who used MADRE before the sheet existed: a room on disk, no record. Shown once.
    await mkdir(join(used, 'rooms', 'pulse-123'), { recursive: true });
    const back = await bootWhatsNew({ root: used, version: '0.7.0' });
    assert.equal(back.returning, true);
    assert.equal(await readSeen(used), null, 'it was marked seen before anyone saw it');
    const news = await whatsNew({ root: used, version: '0.7.0', returning: back.returning });
    assert.equal(news.show, true);
    assert.equal(news.notes, NOTES['0.7.0']);
    await markSeen(used, '0.7.0');
    assert.equal((await whatsNew({ root: used, version: '0.7.0', returning: true })).show, false, 'shown twice');
    // A damaged record is no record.
    await writeFile(join(used, 'whats-new.json'), '{not json');
    assert.equal(await readSeen(used), null);
  } finally {
    await rm(fresh, { recursive: true, force: true });
    await rm(used, { recursive: true, force: true });
  }
});

test('whats new: every sheet is whole in both languages, says where each thing is, and uses icons the room has', () => {
  const icons = new Set([...app.slice(app.indexOf('const PIXEL_ICONS = {'), app.indexOf('};', app.indexOf('const PIXEL_ICONS = {'))).matchAll(/^\s+([a-z]+):\s+\[/gm)].map((m) => m[1]));
  for (const [version, notes] of Object.entries(NOTES)) {
    assert.match(version, /^\d+\.\d+\.\d+$/);
    for (const language of ['es', 'en']) assert.ok(notes.intro?.[language]?.trim(), `${version} has no intro in ${language}`);
    assert.ok(notes.items.length >= 3 && notes.items.length <= 7, `${version} says ${notes.items.length} things: a sheet is a few, not a changelog`);
    for (const item of [...notes.items, notes.more].filter(Boolean)) {
      assert.ok(icons.has(item.icon), `${version} asks for an icon the room does not have: ${item.icon}`);
      for (const language of ['es', 'en']) {
        assert.ok(item.title?.[language]?.trim(), `${version} · a title is missing in ${language}`);
        assert.ok(item.body?.[language]?.trim(), `${version} · a description is missing in ${language}`);
      }
    }
    for (const item of notes.items) for (const language of ['es', 'en']) assert.ok(item.where?.[language]?.trim(), `${version} · "${item.title.en}" does not say where it is in ${language}`);
    // The product never names an organisation, a platform it has not declared, or how it was built.
    const said = JSON.stringify(notes);
    for (const word of ['Windows', 'WSL', 'Claude Code built', 'handoff']) assert.ok(!said.includes(word), `${version} says "${word}"`);
  }
});

test('whats new: the version being worked on has its sheet, and a minor cannot be closed without one', async () => {
  const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  const open = changelog.match(/^## (\d+\.\d+\.\d+) · Sin publicar/m)?.[1];
  for (const version of [pkg.version, open].filter((v) => v && /\.0$/.test(v))) {
    // A version already on npm before the sheet existed has nothing to show, and that is fine.
    if (version === '0.6.0') continue;
    assert.ok(notesFor(version), `${version} is a minor and has no "what's new"`);
  }
  const release = await readFile(new URL('../scripts/release.mjs', import.meta.url), 'utf8');
  assert.match(release, /notesFor\(version\)/, 'the release script no longer asks for the sheet');
});
