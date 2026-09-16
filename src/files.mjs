import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

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

export async function readServable(root, relative, { maxBytes = MAX_FILE_BYTES } = {}) {
  const path = await resolveInside(root, relative);
  if (!path) return { status: 404, error: 'Not found.' };
  const info = await stat(path).catch(() => null);
  if (!info || !info.isFile()) return { status: 404, error: 'Not found.' };
  if (info.size > maxBytes) return { status: 413, error: `File is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  const body = await readFile(path);
  return { status: 200, body, contentType: contentTypeFor(path), size: info.size, path };
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
