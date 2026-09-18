// MADRE report collector: a Cloudflare Worker that turns a sentinel report into
// a GitHub issue (or a comment on the open issue with the same fingerprint).
// Deploy with wrangler; secrets: GITHUB_TOKEN (repo scope), GITHUB_REPO ("owner/name").
// Then point MADRE at it: PULSE_REPORT_URL=https://<worker>.workers.dev/v1/reports

const MAX_BYTES = 32 * 1024;

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    // Health: is the collector configured? (repo is public knowledge; the token is never echoed)
    if (request.method === 'GET' && path === '/v1/health') {
      // What GitHub says about the token: its scopes (classic) or none listed (fine-grained), and who it belongs to.
      let scopes = null, login = null, tokenOk = null;
      if (env.GITHUB_TOKEN) {
        const probe = await fetch('https://api.github.com/user', { headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, 'user-agent': 'madre-report-collector', accept: 'application/vnd.github+json' } }).catch(() => null);
        tokenOk = Boolean(probe?.ok);
        scopes = probe?.headers.get('x-oauth-scopes') ?? null;
        login = probe?.ok ? (await probe.json().catch(() => ({}))).login ?? null : null;
      }
      return json({ ok: Boolean(env.GITHUB_TOKEN && env.GITHUB_REPO), repo: env.GITHUB_REPO ?? null, token: env.GITHUB_TOKEN ? `${env.GITHUB_TOKEN.slice(0, 4)}…` : null, tokenOk, login, scopes, version: 4 });
    }
    if (request.method !== 'POST' || path !== '/v1/reports') return new Response('MADRE report collector', { status: 404 });
    const text = await request.text();
    if (text.length > MAX_BYTES) return json({ error: 'too large' }, 413);
    let report;
    try { report = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400); }
    if (!/^[a-f0-9]{12}$/.test(report?.fingerprint ?? '') || typeof report.error !== 'string') return json({ error: 'not a sentinel report' }, 422);
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return json({ ok: false, error: 'collector not configured (GITHUB_TOKEN, GITHUB_REPO)' }, 500);
    const headers = { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'madre-report-collector', 'content-type': 'application/json' };
    const base = `https://api.github.com/repos/${env.GITHUB_REPO}`;
    // GitHub answers are checked: a failure there is reported back, never hidden behind ok:true.
    const github = async (url, init) => {
      const response = await fetch(url, init);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`GitHub ${response.status} on ${url.replace('https://api.github.com', '')}: ${payload.message ?? 'unknown error'}`);
      return payload;
    };
    try {
      // Open issues with this fingerprint in the title: the search API needs a moment to index, so the list API is asked directly.
      const open = await github(`${base}/issues?state=open&labels=sentinel&per_page=100`, { headers });
      const existing = open.find((issue) => issue.title.endsWith(report.fingerprint));
      const environment = `MADRE ${report.madre} · Node ${report.node} · ${report.platform}\nAgents: ${(report.agents ?? []).join(', ') || 'none'}`;
      if (existing) {
        await github(`${base}/issues/${existing.number}/comments`, { method: 'POST', headers, body: JSON.stringify({ body: `Seen again (${report.count ?? 1}×) at ${report.at}.\n\n${environment}\n\n\`\`\`\n${report.error.slice(0, 2000)}\n\`\`\`` }) });
        return json({ ok: true, issue: existing.number, action: 'commented' });
      }
      const created = await github(`${base}/issues`, { method: 'POST', headers, body: JSON.stringify({
        title: `[sentinel] ${report.kind === 'crash' ? 'crash' : `unknown condition${report.agent ? ` · @${report.agent}` : ''}`} · ${report.fingerprint}`,
        labels: ['sentinel', report.kind],
        body: `${environment}\n\n**Kind** ${report.kind} · **Fingerprint** \`${report.fingerprint}\` · **First seen** ${report.at}\n\n\`\`\`\n${report.error.slice(0, 3000)}\n\`\`\`\n\n_Sent automatically by MADRE's sentinel with the user's consent; redacted before leaving their machine._`,
      }) });
      console.log('created issue', JSON.stringify({ number: created.number, url: created.html_url, keys: Object.keys(created).slice(0, 8) }));
      return json({ ok: true, issue: created.number, url: created.html_url, action: 'created' });
    } catch (error) {
      return json({ ok: false, error: error.message }, 502);
    }
  },
};
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
