// Loaded before every test file: the suite must not depend on what this
// machine happens to run. Ollama is probed only when a test hands in a probe.
process.env.PULSE_OLLAMA ??= '0';
