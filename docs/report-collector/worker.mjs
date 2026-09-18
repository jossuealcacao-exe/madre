// MADRE report collector: a Cloudflare Worker that turns a sentinel report into
// a GitHub issue (or a comment on the open issue with the same fingerprint).
// Deploy with wrangler; secrets: GITHUB_TOKEN (repo scope), GITHUB_REPO ("owner/name").
// Then point MADRE at it: PULSE_REPORT_URL=https://<worker>.workers.dev/v1/reports

const MAX_BYTES = 32 * 1024;

export default {
  async fetch(request, env) {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/v1/reports') return new Response('MADRE report collector', { status: 404 });
    const text = await request.text();
    if (text.length > MAX_BYTES) return json({ error: 'too large' }, 413);
    let report;
    try { report = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400); }
    if (!/^[a-f0-9]{12}$/.test(report?.fingerprint ?? '') || typeof report.error !== 'string') return json({ error: 'not a sentinel report' }, 422);
    const headers = { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'madre-report-collector', 'content-type': 'application/json' };
    const base = `https://api.github.com/repos/${env.GITHUB_REPO}`;
    const search = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${env.GITHUB_REPO} is:issue is:open in:title ${report.fingerprint}`)}`, { headers }).then((r) => r.json()).catch(() => ({ items: [] }));
    const existing = search.items?.[0];
    const environment = `MADRE ${report.madre} · Node ${report.node} · ${report.platform}\nAgents: ${(report.agents ?? []).join(', ') || 'none'}`;
    if (existing) {
      await fetch(`${base}/issues/${existing.number}/comments`, { method: 'POST', headers, body: JSON.stringify({ body: `Seen again (${report.count ?? 1}×) at ${report.at}.\n\n${environment}\n\n\`\`\`\n${report.error.slice(0, 2000)}\n\`\`\`` }) });
      return json({ ok: true, issue: existing.number, action: 'commented' });
    }
    const created = await fetch(`${base}/issues`, { method: 'POST', headers, body: JSON.stringify({
      title: `[sentinel] ${report.kind === 'crash' ? 'crash' : `unknown condition${report.agent ? ` · @${report.agent}` : ''}`} · ${report.fingerprint}`,
      labels: ['sentinel', report.kind],
      body: `${environment}\n\n**Kind** ${report.kind} · **Fingerprint** \`${report.fingerprint}\` · **First seen** ${report.at}\n\n\`\`\`\n${report.error.slice(0, 3000)}\n\`\`\`\n\n_Sent automatically by MADRE's sentinel with the user's consent; redacted before leaving their machine._`,
    }) }).then((r) => r.json());
    return json({ ok: true, issue: created.number, action: 'created' });
  },
};
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
