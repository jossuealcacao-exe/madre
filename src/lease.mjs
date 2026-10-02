import { mkdir, readdir, realpath, stat } from 'node:fs/promises';
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
  // The same directory said the other way, when the path given to MADRE goes through a symlink.
  // On macOS `/tmp` is a link to `/private/tmp`, so an agent that resolves a path before writing
  // asks to write somewhere that does not begin with the string the permission rule was built
  // from. The rule misses, a headless CLI cannot stop to ask, the write fails without a word, and
  // the model reports the file as created. Both spellings travel so both can be allowed — and,
  // just as importantly, so the forbidden zones can be denied under either one.
  const realOutDir = await realpath(outDir).catch(() => outDir);
  return { leaseId, outDir, relativeDir, ...(realOutDir === outDir ? {} : { realOutDir }) };
}

// The files a reply names, as paths and not as intentions.
//
// A CLI whose write was refused in silence answers as if it had written: the room shows no
// artifacts, and the text says «Archivos creados: …». Rather than read the prose for a claim —
// which means guessing in two languages and warning wrongly when an agent merely SUGGESTS a
// path — this collects the paths it names under the project and lets the disk settle it. What
// is on disk is never mentioned; only what is named and absent.
export function namedPaths(text, { roots = [] } = {}) {
  const said = String(text ?? '');
  const bases = roots.filter(Boolean);
  const found = new Set();
  // A path, absolute or project-relative, ending in a short extension. Trailing punctuation and
  // the closing of a quote, a bracket or a sentence are not part of a filename.
  for (const match of said.matchAll(/(?:^|[\s(`"'«\[>])((?:\/|\.{0,2}\/)?[\w.@+-]+(?:\/[\w.@+-]+)+\.[A-Za-z][\w]{0,8})/g)) {
    let path = match[1].replace(/[.,;:)\]»"'`]+$/, '');
    if (!path.includes('/')) continue;
    if (path.startsWith('/')) {
      const under = bases.find((base) => path === base || path.startsWith(`${base}/`));
      if (!under) continue;                       // somewhere else entirely: not ours to check
      found.add(path);
      continue;
    }
    found.add(path.replace(/^\.\//, ''));
  }
  return [...found];
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

export function leaseInstructions({ outDir, agentId, scopes = { write: true, imageGen: agentId === 'codex' }, capable = null, imageStudio = null, control = false, create = false, airlock = false, scratchDir = null }) {
  const canImage = Boolean(scopes.imageGen);
  const couldImage = capable ? Boolean(capable.imageGen?.capable) : canImage;
  const scratch = scratchDir ? `${outDir}/${scratchDir}` : null;
  return [
    airlock
      ? `AIRLOCK (#4): the human opened the airlock for you on this project at ${outDir}. Everything CONTROL allows, and you may run commands inside it: tests, builds, git commit and push, deploys with the CLIs and sessions already on this machine. Files are checkpointed and UNDO restores them; what leaves the machine (a push, a deploy, an API call) does not come back. Before anything leaves, state in one line exactly what goes out and where, then do it. Never print, copy or move secrets. Use git commands, never .git internals.`
      : control
      ? `CONTROL (#3): the human put you in command of this project at ${outDir}. You may read, create and modify its files without asking, one change at a time, minimal and reversible. MADRE took a checkpoint before this turn; everything you change is listed to the human afterwards and can be undone in one click.`
      : create
        ? `CREATE (#2): the human allows you to create new files and folders anywhere in this project, at ${outDir}, where they belong by the project's own conventions (a page next to the other pages, a component with the components, a document with the documents). Create folders when the structure calls for it.${scratch ? ` If something has no natural place, put it in the scratch folder ${scratch}.` : ''}`
        : `CREATION LEASE: the human allows you to create files for this request, only inside ${outDir}.`,
    control
      ? 'Never touch .git, .pulse, .madre, .env files or credentials: writes there are denied and reverted. Do not run destructive commands. Do not delegate this power: other agents you involve work read-only unless a step of yours names a mode.'
      : create
        ? 'Do not modify, overwrite, rename or delete files that already exist: MADRE restores them after your turn and tells the human. If a change to an existing file is truly needed, say so and stop; the human can grant #3 CONTROL. Never touch .git, .pulse, .madre, .env files or credentials.'
        : 'Write every file you produce there (images, code, documents); paths elsewhere are denied.',
    airlock ? 'End with the commands you ran, what left the machine, and the files you changed.' : control ? 'End with a short list of the files you changed and why.' : create ? 'End with a short list of the files you created, with their paths, and why there.' : 'Reading the project stays allowed. Do not modify project files.',
    imageStudio ? `You can generate images with the MCP tool ${imageStudio.tool} (server ${imageStudio.name}): pass a detailed prompt and a file_name; it saves the PNG${scratch ? ` into ${scratch}` : ' into the lease directory'} and returns the path.`
      : canImage ? `You can generate images; save them${create ? ' where images live in this project, or in the scratch folder,' : ' into the lease directory'} with a descriptive file name.`
      : couldImage ? 'Image generation is switched off for this request; if asked for an image, say so and do not attempt it.'
        : 'You cannot generate images from this CLI; if asked for one, say so plainly instead of attempting it.',
    'Do this work yourself. Do not hand it to a subagent or spawn another agent: a subagent writes outside this lease, so nothing it did would be checked, shown to the human or undoable — and the tools for it are blocked, which can leave you waiting instead of answering.',
    'List the files you created (or "none") before any plan block; nothing may follow a plan block.',
  ].filter(Boolean).join('\n');
}
