// Loaded before every test file: the suite must not depend on what this
// machine happens to run. Ollama is probed only when a test hands in a probe.
process.env.PULSE_OLLAMA ??= '0';
// Nor is a browser started to see whether PLAYWRIGHT works, unless a test asks for it.
process.env.PULSE_PLAYWRIGHT_CHECK ??= '0';
// Nor is gh asked who is signed in to GitHub: the GitHub module's own tests hand it a fake.
process.env.PULSE_GH ??= '0';
// Nor does any MADRE the suite starts tell madre.run it is in use (src/heartbeat.mjs): its daily
// «still in use» goes to a port nothing listens on, and fails as it would offline.
process.env.PULSE_HEARTBEAT_URL ??= 'http://127.0.0.1:9/ping';
// Nor does it ask madre.run for the Market's catalog (src/market-remote.mjs): the same dead port.
process.env.PULSE_MARKET_URL ??= 'http://127.0.0.1:9/mercado/catalogo.json';

// And the suite reads MADRE in the language it is WRITTEN in. The product speaks Spanish by
// default; its tests assert what a module is, what a room does and what a reading means — not
// how any of it is worded — so they read the source language and stay still while the Spanish is
// improved. The Spanish has tests of its own: the catalogue's coverage, and the page's own smoke
// test, which boots in Spanish on purpose.
//
// The environment wins over the config here as it does everywhere else in this product, so a
// server started inside a test speaks English too.
process.env.PULSE_LANGUAGE ??= 'en';
const { setLanguage } = await import('../src/i18n.mjs');
setLanguage(process.env.PULSE_LANGUAGE);
