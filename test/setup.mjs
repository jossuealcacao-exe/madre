// Loaded before every test file: the suite must not depend on what this
// machine happens to run. Ollama is probed only when a test hands in a probe.
process.env.PULSE_OLLAMA ??= '0';

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
