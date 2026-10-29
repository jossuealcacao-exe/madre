// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// A failure of the page itself — a script that threw, a promise nobody caught — told to the MADRE
// that serves it (src/telemetry.mjs, /api/telemetry/page-error, 2026-10-28), which keeps it with the
// rest of its anonymous diagnostics. Once per message per page, a few at most, and nothing of what
// the person wrote: the error's own words and the lines of MADRE's code it went through.
export function tellFailures(page) {
  // A page without a window to listen on (the tests read the page in Node) has nothing to tell.
  if (typeof globalThis.window?.addEventListener !== 'function') return;
  const told = new Set();
  const tell = (message, stack) => {
    const said = String(message ?? '').slice(0, 300);
    // «Script error.» is a script of another site, a browser extension's: not MADRE's.
    if (!said || said === 'Script error.' || told.has(said) || told.size >= 20) return;
    if (/chrome-extension:|moz-extension:|safari-web-extension:/.test(String(stack ?? ''))) return;
    told.add(said);
    void fetch('/api/telemetry/page-error', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ page, message: said, stack: String(stack ?? '').slice(0, 4000) }) }).catch(() => null);
  };
  window.addEventListener('error', (event) => {
    if (!event.message && !event.error) return;
    tell(event.error?.message ?? event.message, event.error?.stack ?? `${event.filename ?? ''}:${event.lineno ?? 0}`);
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    // A fetch the network refused is the network's, not a fault of the page.
    if (reason?.name === 'AbortError' || /Failed to fetch|NetworkError|Load failed/.test(String(reason?.message ?? reason))) return;
    tell(reason?.message ?? String(reason), reason?.stack ?? '');
  });
}
