// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
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
  "local project token budget (MADRE's own soft limit, not the provider's quota; cache reads count a tenth)",
  "local room token budget (MADRE's own soft limit, not the provider's quota; cache reads count a tenth)",
  'simulated provider usage window',
  'provider usage window',
  '{label} was interrupted before it started: {why}.',
  '{label} was interrupted: {why}.',
  '{label} did not respond before the timeout ({seconds}s).',
  ' Last output: {output}',
  'MADRE is shutting down',
  'STOPALL by the human',
  '{label} does not know the model `{model}`.',
  '{label} does not know the model it was asked to use.',
  ' Choose another on the model chip beside TO @{agent}, or the default; permissions and modes have nothing to do with it.',
  'A plan by @{agent} is still running. Your message will be answered, but no second plan will start.',
  ' Type STOPALL to halt every agent.',
  '{n} agents are working at once. If this is not what you asked for, type STOPALL.',
  '@{agent} is already answering another turn; answers may cross.',
  ' STOPALL halts everything.',
  'The copilot ran commands by itself {n} times in a row; the next ones wait for you. Write to it to go on.',
  'The plan by @{agent} has been running for {n} min.',
  ' STOPALL halts it.',
  '@{holder} still holds EDIT; @{agent} answers read-only this turn.',
  '@{holder} still holds CONTROL; @{agent} answers read-only this turn.',
  'Stopped while waiting for the project: another turn was writing in it.',
  '@{agent} tried to open a plan from inside a plan. It was ignored; the sequence stays under @{who}.',
  ' STOPALL if the project drifts.',
  ' STOPALL if the room drifts.',
  '@{agent} is capped at #{n} {label}; raise its max mode to #{wanted} in Settings › Permissions to unlock {mode}.',
  '@{agent} is capped at #{n} {label}; raise its max mode to #{wanted} in Settings › Permissions to arm {mode}.',
  '@{agent} is capped at #{n} {label}; raise its MAX MODE to #{wanted} in CONNECTIONS to unlock {mode}.',
  '@{agent} is capped at #{n} {label}; raise its MAX MODE to #{wanted} in CONNECTIONS to arm {mode}.',
  '@{agent} already holds {mode} of this project; one holder at a time. STOPALL revokes it.',
  '@{agent} left the project: Ollama is not running. Start Ollama, or open Local AI in Modules.',
  '@madre is in the project · {version}',
  '{agent} is not installed on this computer.',
  '@madre left the project: Ollama has no chat model running',
  '@{agent} left the room: Ollama is not running. Start Ollama, or open Ollama in Modules.',
  'Google reported the model as unavailable (HTTP 503) and the CLI kept retrying.',
  'Try again shortly or choose another model.',
  'Google says the AI Studio project behind this Gemini key has no prepaid credits left; every request is refused (HTTP 429) until it is topped up.',
  'Add credits at https://ai.studio/projects, or switch the Gemini CLI to another key.',
  'Google no longer accepts this Gemini sign-in (IneligibleTierError): the free personal Google account is refused before it reaches a model.',
  'Paste a Gemini API key from Google AI Studio in Settings › Agents › Gemini, or run `gemini`, type /auth and pick "Use Gemini API key".',
  'Wait a minute, or pick an explicit model such as gemini-3-flash-preview to skip the router; check the key\'s quota at aistudio.google.com.',
  'Gemini tried to hand this task to one of its own subagents. MADRE does not allow that: a subagent answers outside the permission MADRE controls, so nothing it wrote would be checked, shown or undoable.',
  'Ask again saying it should do the work itself, without subagents.',
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
