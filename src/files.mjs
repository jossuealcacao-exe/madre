// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';

// Read-only file access for the room UI, and human attachments.
//
// Two roots are servable: the project (read-only, so agents' references to
// files and images render inline) and the room's own attachments folder under
// PULSE_HOME (where the human's uploads live, never inside the project).

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

const TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.md': 'text/markdown', '.txt': 'text/plain', '.json': 'application/json', '.jsonl': 'application/x-ndjson', '.yaml': 'text/yaml', '.yml': 'text/yaml', '.toml': 'text/plain',
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.cjs': 'text/javascript', '.ts': 'text/plain', '.tsx': 'text/plain', '.jsx': 'text/plain',
  '.py': 'text/plain', '.rb': 'text/plain', '.go': 'text/plain', '.rs': 'text/plain', '.java': 'text/plain', '.kt': 'text/plain', '.swift': 'text/plain', '.c': 'text/plain', '.h': 'text/plain', '.cpp': 'text/plain',
  '.sh': 'text/plain', '.zsh': 'text/plain', '.css': 'text/css', '.html': 'text/plain', '.xml': 'text/plain', '.csv': 'text/csv', '.sql': 'text/plain', '.env': 'text/plain',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};
export const contentTypeFor = (name) => TYPES[extname(name).toLowerCase()] ?? 'application/octet-stream';
// What a file IS, for the record of what a turn made. contentTypeFor is how MADRE SERVES a project
// file, and a page is served as text on purpose: an HTML file from the project served as HTML would
// run its scripts in the room's own origin (RIPLEY renders it, sealed, elsewhere). The record said
// tests.html was text/plain, which is the serving rule leaking into the description.
const DECLARED = { '.html': 'text/html', '.htm': 'text/html', '.xml': 'application/xml', '.ts': 'text/typescript', '.tsx': 'text/typescript', '.jsx': 'text/javascript' };
export const declaredTypeFor = (name) => DECLARED[extname(name).toLowerCase()] ?? contentTypeFor(name);
export const isImage = (name) => contentTypeFor(name).startsWith('image/');
export const isText = (name) => /^(text\/|application\/(json|x-ndjson))/.test(contentTypeFor(name));

// Resolves `relative` inside `root`, refusing anything that escapes it (../,
// absolute paths, symlinks pointing outside). Returns null when refused.
export async function resolveInside(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\0')) return null;
  const canonicalRoot = await realpath(root).catch(() => null);
  if (!canonicalRoot) return null;
  const candidate = resolve(canonicalRoot, relative);
  if (candidate !== canonicalRoot && !candidate.startsWith(canonicalRoot + sep)) return null;
  const canonical = await realpath(candidate).catch(() => null);
  if (!canonical || (canonical !== canonicalRoot && !canonical.startsWith(canonicalRoot + sep))) return null;
  return canonical;
}

// One level of the project tree, for the room's file panel. Directories
// first, then files, both alphabetical; .git is never listed and node_modules
// is shown but not walked. Read-only and fenced to the project root.
const SKIP = new Set(['.git', '.DS_Store']);
// Folders the search walk skips (the tree still opens them one level at a time).
const SHALLOW = new Set(['node_modules', '.venv', 'venv', 'dist', 'build', '.next', '.git']);
export async function listDirectory(root, relative = '.') {
  const path = await resolveInside(root, relative || '.');
  if (!path) return { status: 404, error: 'Not found.' };
  let entries;
  try { entries = await readdir(path, { withFileTypes: true }); } catch { return { status: 404, error: 'Not a directory.' }; }
  const items = [];
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const isDir = entry.isDirectory() || (entry.isSymbolicLink() && (await stat(join(path, entry.name)).catch(() => null))?.isDirectory());
    const item = { name: entry.name, kind: isDir ? 'dir' : 'file' };
    if (isDir && SHALLOW.has(entry.name)) item.shallow = true;
    if (!isDir) {
      const info = await stat(join(path, entry.name)).catch(() => null);
      if (info) item.size = info.size;
      item.contentType = contentTypeFor(entry.name);
    }
    items.push(item);
  }
  items.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) : a.kind === 'dir' ? -1 : 1));
  return { status: 200, entries: items.slice(0, 500), truncated: items.length > 500 };
}

// Fuzzy-ish file search for the "!" menu in the composer: every path under
// the project (same fences as the tree, shallow folders skipped) scored by
// substring and initials match. The walk is cached for a short while.
const walkCache = new Map(); // root -> { at, files }
export async function walkProject(root, { maxFiles = 20000, ttlMs = 15000 } = {}) {
  const cached = walkCache.get(root);
  if (cached && Date.now() - cached.at < ttlMs) return cached.files;
  const files = [];
  async function walk(dir, prefix, depth) {
    if (files.length >= maxFiles || depth > 14) return;
    let entries = [];
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { if (!SHALLOW.has(entry.name)) await walk(join(dir, entry.name), rel, depth + 1); continue; }
      if (entry.isFile()) files.push(rel);
      if (files.length >= maxFiles) return;
    }
  }
  await walk(root, '', 0);
  walkCache.set(root, { at: Date.now(), files });
  return files;
}

// What changed on disk since a moment, by modification time (2026-10-14). A restore point sees
// only what git sees, so a PDF a command wrote into an ignored `output/` was there and nobody said
// so: the Finder did not refresh and nothing told whose it was. This looks at the files
// themselves, skipping the same heavy folders the search skips and MADRE's own `.pulse`/`.madre`,
// bounded so a large project costs a fraction of a second. Newest first.
const UNWATCHED = new Set([...SHALLOW, '.pulse', '.madre']);
export async function filesChangedSince(root, since, { maxFiles = 8000, limit = 40 } = {}) {
  const from = Number(since) - 250;
  if (!Number.isFinite(from)) return [];
  const found = [];
  let seen = 0;
  async function walk(dir, prefix, depth) {
    if (seen >= maxFiles || depth > 14) return;
    let entries = [];
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    const files = [];
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { if (!UNWATCHED.has(entry.name)) await walk(join(dir, entry.name), rel, depth + 1); continue; }
      if (entry.isFile()) files.push(rel);
    }
    seen += files.length;
    const stats = await Promise.all(files.map((rel) => stat(join(root, rel)).then((info) => [rel, info.mtimeMs], () => null)));
    for (const one of stats) if (one && one[1] >= from) found.push({ path: one[0], at: one[1] });
  }
  await walk(root, '', 0);
  return found.sort((a, b) => b.at - a.at).slice(0, limit).map((one) => one.path);
}

export function scoreFile(path, query) {
  const q = query.toLowerCase();
  if (!q) return 1;
  const lower = path.toLowerCase();
  const name = lower.split('/').pop();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80 - Math.min(name.length - q.length, 30);
  if (name.includes(q)) return 60 - Math.min(name.indexOf(q), 30);
  if (lower.includes(q)) return 40 - Math.min(lower.length / 10, 20);
  // subsequence match ("rmjs" -> room.mjs)
  let index = 0;
  for (const char of q) { index = lower.indexOf(char, index); if (index < 0) return 0; index += 1; }
  return 10 - Math.min(lower.length / 20, 9);
}

export async function searchFiles(root, query, { limit = 20 } = {}) {
  const files = await walkProject(root);
  return files
    .map((path) => ({ path, score: scoreFile(path, String(query ?? '').trim()) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.path.length - b.path.length || a.path.localeCompare(b.path))
    .slice(0, limit)
    .map((item) => ({ path: item.path, name: item.path.split('/').pop(), contentType: contentTypeFor(item.path) }));
}

// "!src/room.mjs:12-20" in a human message points an agent at a project file
// (optionally a line range). Only files that exist inside the project count.
export const REFERENCE = /(^|[\s(,;:])!((?:[\w.-]+\/)*[\w.-]+\.[A-Za-z0-9]{1,8})(?::(\d+)(?:-(\d+))?)?(?![\w/])/g;
export async function resolveReferences(root, text, { maxLines = 120 } = {}) {
  const found = [];
  const seen = new Set();
  for (const match of String(text ?? '').matchAll(REFERENCE)) {
    const rel = match[2];
    const key = `${rel}:${match[3] ?? ''}-${match[4] ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const path = await resolveInside(root, rel);
    if (!path) continue;
    const info = await stat(path).catch(() => null);
    if (!info || !info.isFile()) continue;
    const reference = { path: rel, size: info.size, contentType: contentTypeFor(rel) };
    if (match[3]) {
      const from = Number(match[3]);
      const to = match[4] ? Math.max(from, Number(match[4])) : from;
      reference.lines = { from, to };
      if (isText(rel) && info.size <= 2 * 1024 * 1024) {
        const all = (await readFile(path, 'utf8')).split('\n');
        reference.excerpt = all.slice(from - 1, Math.min(to, from - 1 + maxLines)).map((line, index) => `${String(from + index).padStart(4)} | ${line}`).join('\n');
      }
    }
    found.push(reference);
  }
  return found;
}

export async function readServable(root, relative, { maxBytes = MAX_FILE_BYTES } = {}) {
  const path = await resolveInside(root, relative);
  if (!path) return { status: 404, error: 'Not found.' };
  const info = await stat(path).catch(() => null);
  if (!info || !info.isFile()) return { status: 404, error: 'Not found.' };
  if (info.size > maxBytes) return { status: 413, error: `File is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  const body = await readFile(path);
  return { status: 200, body, contentType: contentTypeFor(path), size: info.size, path, mtimeMs: info.mtimeMs };
}

// Writing a file the human edited in the room. Only a file that already exists inside the root,
// only text, and only if it is still the file the editor opened: a file that changed on disk since
// (an agent wrote it, the human saved it elsewhere) is not overwritten without being asked.
export const MAX_EDIT_BYTES = 2 * 1024 * 1024;
export async function writeEdited(root, relative, content, { mtimeMs = null, force = false } = {}) {
  if (typeof content !== 'string') return { status: 400, error: 'Nothing to save.' };
  if (Buffer.byteLength(content, 'utf8') > MAX_EDIT_BYTES) return { status: 413, error: `The editor saves files up to ${MAX_EDIT_BYTES / 1024 / 1024} MB.` };
  const path = await resolveInside(root, relative);
  if (!path) return { status: 404, error: 'Not found.' };
  const info = await stat(path).catch(() => null);
  if (!info || !info.isFile()) return { status: 404, error: 'Not found.' };
  if (!force && Number.isFinite(Number(mtimeMs)) && Math.abs(info.mtimeMs - Number(mtimeMs)) > 1) {
    return { status: 409, error: 'The file changed on disk since it was opened.', changed: true, mtimeMs: info.mtimeMs };
  }
  await writeFile(path, content, 'utf8');
  const after = await stat(path);
  return { status: 200, path, bytes: after.size, mtimeMs: after.mtimeMs };
}

// A new, empty file in the project, from the Finder. Only a plain relative path: no `..`, no
// drive (`C:`) or UNC prefix, no folder of git's. Its nearest existing folder must already be
// inside the project (the same fence as every read and write); missing folders under it are
// made. An existing file is never touched.
export async function createEmptyFile(root, relative) {
  const clean = String(relative ?? '').trim().replace(/^[/\\]+/, '');
  const parts = clean.split(/[/\\]+/).filter(Boolean);
  if (!clean || clean.includes('\0') || /[/\\]$/.test(clean) || /^[a-zA-Z]:/.test(clean) || parts.some((part) => part === '..' || part === '.') || parts[0] === '.git') {
    return { status: 400, error: 'Not a file name this project can create.' };
  }
  const canonicalRoot = await realpath(root).catch(() => null);
  if (!canonicalRoot) return { status: 404, error: 'Not found.' };
  const target = resolve(canonicalRoot, ...parts);
  if (!target.startsWith(canonicalRoot + sep)) return { status: 400, error: 'Not a file name this project can create.' };
  // The nearest folder that exists is checked against the fence, symlinks resolved.
  let folder = dirname(target);
  while (folder !== canonicalRoot && !(await stat(folder).catch(() => null))) folder = dirname(folder);
  const inside = await resolveInside(canonicalRoot, folder === canonicalRoot ? '.' : folder.slice(canonicalRoot.length + 1));
  if (!inside) return { status: 400, error: 'Not a file name this project can create.' };
  await mkdir(dirname(target), { recursive: true });
  try { await writeFile(target, '', { encoding: 'utf8', flag: 'wx' }); }
  catch (error) { return error.code === 'EEXIST' ? { status: 409, error: 'A file with that name is already there.' } : { status: 400, error: error.message }; }
  return { status: 201, path: parts.join('/') };
}

const safeName = (name) => String(name ?? 'file').replace(/[^\w.\- ]+/g, '_').replace(/^\.+/, '').slice(0, 120) || 'file';

export async function storeAttachment(attachmentsRoot, { name, bytes }) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new Error('Attachment is empty.');
  if (bytes.length > MAX_ATTACHMENT_BYTES) throw new Error(`Attachment is larger than ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB.`);
  await mkdir(attachmentsRoot, { recursive: true });
  const id = randomUUID();
  const fileName = `${id.slice(0, 8)}-${safeName(name)}`;
  const path = join(attachmentsRoot, fileName);
  await writeFile(path, bytes, { mode: 0o600 });
  return {
    id,
    name: safeName(name),
    fileName,
    path,
    size: bytes.length,
    contentType: contentTypeFor(fileName),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}
