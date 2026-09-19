// Git Pulse: /git in the composer brings the repository's facts into the room.
// Nothing to switch: it is on wherever the project is a git repository.

import { defineModule } from './sdk.mjs';
import { gitToplevel } from './helpers.mjs';

export default defineModule({
  id: 'git-pulse',
  name: 'Git Pulse',
  vendor: 'MADRE',
  summary: 'Type /git in the composer to bring the repository\'s branch, uncommitted changes, recent commits or diff stats into the room as a shared fact card, without spending an agent turn. /git commit and /git push are your own hand on the repository: a commit is local, a push shows what would leave and only goes with /git push confirm.',
  creates: ['nothing by itself: the read commands are read-only', 'a commit or a push only when you type /git commit or /git push confirm'],
  requires: ['the project is a git repository'],
  commands: ['/git status', '/git log [n]', '/git diff', '/git branches', '/git commit "message"', '/git push [confirm]'],
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
