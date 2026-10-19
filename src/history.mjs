// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// A project's history over a period, for modules (docs/SDK.md, `ctx.services.history`): what the
// human asked and to whom, how each agent answered, what it cost, which files a turn changed and
// whether that was undone, and the decisions the memory kept. Read from the ledgers as they are
// on disk, never written. GHOST turns are not here: what was said off the record stays off it.
// Built for the Market's first paid module (Informe de trabajo, 2026-10-19), and for any module
// that reports on the work: one documented shape instead of each one parsing the ledgers.

const TEXT_MAX = 600;
const at = (event) => String(event?.timestamp ?? '');
const inside = (when, since, until) => (!since || when >= since) && (!until || when < until);
const money = (value) => (Number.isFinite(value) && value > 0 ? value : 0);

// `chats`: [{ id, title, events }], each conversation's ledger already parsed, oldest first.
// `memories`: the archive's notes ({ created, kind, text, agent }). `since`/`until`: ISO strings.
export function summarizeHistory({ chats = [], memories = [], since = null, until = null } = {}) {
  const requests = [];
  const answers = [];
  const changes = [];
  const agents = {};
  const conversations = [];
  const agent = (id) => (agents[id] ??= { turns: 0, failed: 0, tokens: 0, costUsd: 0, local: false });
  for (const chat of chats) {
    let asked = 0;
    const reverted = new Set();
    for (const event of chat.events ?? []) if (event?.type === 'control.reverted' && event.payload?.checkpointId) reverted.add(event.payload.checkpointId);
    for (const event of chat.events ?? []) {
      if (!event || event.ghost || !inside(at(event), since, until)) continue;
      const p = event.payload ?? {};
      if (event.type === 'message.created' && p.role === 'user' && p.sender === 'you') {
        asked += 1;
        requests.push({ at: at(event), chat: chat.id, to: p.target ?? null, mode: Number.isFinite(p.mode) ? p.mode : null, text: String(p.text ?? '').slice(0, TEXT_MAX) });
      } else if (event.type === 'message.created' && p.role === 'assistant' && p.sender && p.sender !== 'you') {
        agent(p.sender).turns += 1;
        answers.push({ at: at(event), chat: chat.id, agent: p.sender, text: String(p.text ?? '').slice(0, TEXT_MAX) });
      } else if (event.type === 'message.failed') {
        if (p.target) agent(p.target).failed += 1;
      } else if (event.type === 'usage.recorded' && p.agent) {
        const one = agent(p.agent);
        one.tokens += Number.isFinite(p.usage?.totalTokens) ? p.usage.totalTokens : 0;
        one.costUsd += money(p.usage?.costUsd);
        if (p.usage?.local) one.local = true;
      } else if (event.type === 'control.changed') {
        changes.push({
          at: at(event), chat: chat.id, agent: p.agent ?? null, mode: p.mode ?? null,
          files: (p.files ?? []).filter((file) => file?.path).map((file) => ({ status: String(file.status ?? 'M'), path: String(file.path) })),
          undone: reverted.has(p.checkpointId),
        });
      }
    }
    if (asked) conversations.push({ id: chat.id, title: chat.title ?? null, requests: asked });
  }
  const decisions = memories
    .filter((note) => note?.kind === 'decision' && inside(String(note.created ?? ''), since, until))
    .map((note) => ({ at: String(note.created), text: String(note.text ?? '').slice(0, TEXT_MAX), agent: note.agent ?? null }));
  const byTime = (a, b) => a.at.localeCompare(b.at);
  const files = new Map();
  for (const change of changes) if (!change.undone) for (const file of change.files) files.set(file.path, file.status);
  return {
    since, until,
    requests: requests.sort(byTime),
    answers: answers.sort(byTime),
    changes: changes.sort(byTime),
    files: [...files].map(([path, status]) => ({ path, status })).sort((a, b) => a.path.localeCompare(b.path)),
    decisions: decisions.sort(byTime),
    agents,
    conversations,
    totals: {
      requests: requests.length,
      answers: answers.length,
      tokens: Object.values(agents).reduce((sum, one) => sum + one.tokens, 0),
      costUsd: Math.round(Object.values(agents).reduce((sum, one) => sum + one.costUsd, 0) * 10000) / 10000,
    },
  };
}
