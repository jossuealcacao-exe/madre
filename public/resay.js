// What MADRE said in another language, said again.
//
// A failure is recorded in the ledger with the sentence MADRE wrote at the time, and a room that
// changed language afterwards still shows those records. The ledger is history and is not
// rewritten — but the words are only how the record READS, so they can be said again, now, on
// the way to the screen.
//
// It works on the sentences MADRE writes about itself, which are the ones the catalogue already
// knows: the slots in a key become capture groups, the captures come back in the Spanish. What a
// CLI printed on its own is left exactly as it printed it — "API Error: 500", an ENOTEMPTY from
// Node, a stack trace — because that text is not MADRE's to translate, and the person reading it
// may need to search for it word for word.
//
// Only the sentences listed here are re-said. A catalogue-wide sweep would eventually rewrite a
// fragment of somebody else's error that happened to read like one of ours.

import { ES } from './es.js';
import { language } from './i18n.js';

// MADRE's own sentences about a turn that failed or an agent that ran out, newest wording first.
const SAID = [
  'has used {pct}% of its {label} and another turn like the last one would reach {projected}%.',
  'has used {pct}% of its {label}.',
  ' Continue with {who}.',
  ' Prepare a handoff before the current agent becomes unavailable.',
  "local room token budget (MADRE's own soft limit, not the provider's quota; cache reads count a tenth)",
  'simulated provider usage window',
  'provider usage window',
  '{label} was interrupted before it started: {why}.',
  '{label} was interrupted: {why}.',
  '{label} did not respond before the timeout ({seconds}s).',
  ' Last output: {output}',
  'MADRE is shutting down',
  'STOPALL by the human',
  'Google reported the model as unavailable (HTTP 503) and the CLI kept retrying.',
  'Try again shortly or choose another model.',
  'Google says the AI Studio project behind this Gemini key has no prepaid credits left; every request is refused (HTTP 429) until it is topped up.',
  'Add credits at https://ai.studio/projects, or switch the Gemini CLI to another key.',
  'Google rejected the Gemini credentials.',
  'Run `gemini` and use /auth, or check GEMINI_API_KEY.',
  'exhausted',
  'critical',
  'warning',
];

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// `{name}` becomes a capture; everything else has to match exactly. A key with no slot is a
// plain replacement. Longest first, so a sentence is re-said before one of its own fragments is.
const RULES = SAID
  .map((key) => {
    const said = ES[key];
    if (!said || said === key) return null;
    const slots = [...key.matchAll(/\{(\w+)\}/g)].map((one) => one[1]);
    const pattern = new RegExp(escape(key).replace(/\\\{(\w+)\\\}/g, '(.+?)'), 'g');
    return { key, said, slots, pattern };
  })
  .filter(Boolean)
  .sort((a, b) => b.key.length - a.key.length);

export function resay(text, { when = language() } = {}) {
  if (when !== 'es' || typeof text !== 'string' || !text) return text;
  let out = text;
  for (const rule of RULES) {
    out = out.replace(rule.pattern, (...args) => {
      const captures = args.slice(1, 1 + rule.slots.length);
      return rule.said.replace(/\{(\w+)\}/g, (whole, name) => {
        const at = rule.slots.indexOf(name);
        return at < 0 ? whole : captures[at];
      });
    });
  }
  // Two last touches on our own sentences: the joiner between agents, which an older MADRE
  // wrote in English, and the name this product used to have.
  out = out.replace(/(@[\w-]+) or (?=@)/g, '$1 o ');
  return out.replace(/^PULSE /, 'MADRE ');
}
