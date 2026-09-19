import { mkdir, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { contentTypeFor } from './files.mjs';

// A creation lease is the human saying, for one message (and the plan it may
// start): "these agents may create files, here". MADRE makes a fresh
// directory under <project>/.pulse/out/, points every adapter's write scope at
// it, and afterwards reports exactly what appeared there as artifacts.
//
// Nothing else in the project becomes writable. The lease directory is
// MADRE's own; add `.pulse/` to the project's ignore file if you do not want
// artifacts committed.

export const LEASE_ROOT = join('.pulse', 'out');

const stamp = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

export async function createLease({ projectRoot, leaseId }) {
  const name = `${stamp()}-${leaseId.slice(0, 8)}`;
  const relativeDir = join(LEASE_ROOT, name);
  const outDir = join(projectRoot, relativeDir);
  await mkdir(outDir, { recursive: true, mode: 0o755 });
  return { leaseId, outDir, relativeDir };
}

// name → { size, mtimeMs } for every file under `dir`, recursively.
export async function snapshot(dir) {
  const files = new Map();
  async function walk(current) {
    let entries = [];
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) { await walk(path); continue; }
      if (!entry.isFile()) continue;
      const info = await stat(path).catch(() => null);
      if (info) files.set(relative(dir, path).split(sep).join('/'), { size: info.size, mtimeMs: info.mtimeMs });
    }
  }
  await walk(dir);
  return files;
}

// Files that are new or changed between two snapshots, as artifacts the room
// can show: paths are relative to the project so /api/files can serve them.
export function diffSnapshots(before, after, { relativeDir }) {
  const artifacts = [];
  for (const [name, info] of after) {
    const previous = before.get(name);
    if (previous && previous.size === info.size && previous.mtimeMs === info.mtimeMs) continue;
    artifacts.push({
      name: name.split('/').pop(),
      path: `${relativeDir.split(sep).join('/')}/${name}`,
      size: info.size,
      contentType: contentTypeFor(name),
      status: previous ? 'changed' : 'created',
    });
  }
  return artifacts.sort((a, b) => a.path.localeCompare(b.path));
}

export function leaseInstructions({ outDir, agentId, scopes = { write: true, imageGen: agentId === 'codex' }, capable = null, imageStudio = null, control = false, create = false, scratchDir = null }) {
  const canImage = Boolean(scopes.imageGen);
  const couldImage = capable ? Boolean(capable.imageGen?.capable) : canImage;
  const scratch = scratchDir ? `${outDir}/${scratchDir}` : null;
  return [
    control
      ? `CONTROL (#3): the human put you in command of this project at ${outDir}. You may read, create and modify its files without asking, one change at a time, minimal and reversible. MADRE took a checkpoint before this turn; everything you change is listed to the human afterwards and can be undone in one click.`
      : create
        ? `CREATE (#2): the human allows you to create new files and folders anywhere in this project, at ${outDir}, where they belong by the project's own conventions (a page next to the other pages, a component with the components, a document with the documents). Create folders when the structure calls for it.${scratch ? ` If something has no natural place, put it in the scratch folder ${scratch}.` : ''}`
        : `CREATION LEASE: the human allows you to create files for this request, only inside ${outDir}.`,
    control
      ? 'Never touch .git, .pulse, .madre, .env files or credentials: writes there are denied and reverted. Do not run destructive commands. Do not delegate this power: other agents you involve work read-only unless a step of yours names a mode.'
      : create
        ? 'Do not modify, overwrite, rename or delete files that already exist: MADRE restores them after your turn and tells the human. If a change to an existing file is truly needed, say so and stop; the human can grant #3 CONTROL. Never touch .git, .pulse, .madre, .env files or credentials.'
        : 'Write every file you produce there (images, code, documents); paths elsewhere are denied.',
    control ? 'End with a short list of the files you changed and why.' : create ? 'End with a short list of the files you created, with their paths, and why there.' : 'Reading the project stays allowed. Do not modify project files.',
    imageStudio ? `You can generate images with the MCP tool ${imageStudio.tool} (server ${imageStudio.name}): pass a detailed prompt and a file_name; it saves the PNG${scratch ? ` into ${scratch}` : ' into the lease directory'} and returns the path.`
      : canImage ? `You can generate images; save them${create ? ' where images live in this project, or in the scratch folder,' : ' into the lease directory'} with a descriptive file name.`
      : couldImage ? 'Image generation is switched off for this request; if asked for an image, say so and do not attempt it.'
        : 'You cannot generate images from this CLI; if asked for one, say so plainly instead of attempting it.',
    'List the files you created (or "none") before any plan block; nothing may follow a plan block.',
  ].filter(Boolean).join('\n');
}
