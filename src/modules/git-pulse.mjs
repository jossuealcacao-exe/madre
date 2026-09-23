// Git Pulse: /git in the composer brings the repository's facts into the room.
// Nothing to switch: it is on wherever the project is a git repository.

import { defineModule } from './sdk.mjs';
import { gitToplevel } from './helpers.mjs';

export default defineModule({
  id: 'git-pulse',
  name: 'Git Pulse',
  vendor: 'MADRE',
  summary: 'Brings the repository into the room: /git posts the branch, the uncommitted changes, the recent commits or the diff stats as a shared fact card, without spending an agent turn.',
  creates: ['nothing by itself \u00b7 the read commands only read', 'a local commit only when you type /git commit', 'a push only when you type /git push confirm, after it shows what would leave'],
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
