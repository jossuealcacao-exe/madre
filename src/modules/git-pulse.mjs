// Git Pulse: /git in the composer brings the repository's facts into the room.
// Nothing to switch: it is on wherever the project is a git repository.

import { defineModule } from './sdk.mjs';
import { gitToplevel } from './helpers.mjs';

export default defineModule({
  id: 'git-pulse',
  name: 'Git Pulse',
  vendor: 'MADRE',
  summary: 'Type /git in the composer to bring the repository\'s branch, uncommitted changes, recent commits or diff stats into the room as a shared fact card, read-only, without spending an agent turn.',
  creates: ['nothing: read-only git commands run inside the project'],
  requires: ['the project is a git repository'],
  commands: ['/git status', '/git log [n]', '/git diff', '/git branches'],
  card: 'fixed',
  async status(ctx) {
    const isRepo = await gitToplevel(ctx.projectRoot);
    return {
      status: { installed: Boolean(isRepo), detail: isRepo ? 'on · project is a git repository' : 'not a git repository' },
      preflight: isRepo ? { ok: true, problems: [] } : { ok: false, problems: ['Run `git init` in the project to use /git.'] },
      install: { display: '/git in the composer', platforms: [] },
      fixed: true,
    };
  },
  async toggle() { return { status: 405, body: { error: 'Git Pulse has no switch: it is on wherever the project is a git repository.' } }; },
});
