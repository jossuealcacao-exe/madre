// Which questions the room can answer without paying for them.
//
// @madre runs on Ollama, on this computer. A turn it answers costs nothing: no input tokens, no
// output tokens, no provider. Measured against the paid CLIs on the same five questions, the
// room's own bill for those turns is exactly zero, so the saving here is not an estimate or a
// comparison — it is the absence of a charge.
//
// What this file does NOT do: decide. It recognises a shape of question that the room's own
// archive is the right place to answer, and says so. Sending it anywhere is the human's, always.
// A wrong guess costs a click; a guess acted on without asking would cost trust.

// The shape: a question about what this room already said, decided or left open. Not "how does
// X work" — that needs the project read, which is what the paid agents are for.
const PATTERNS = [
  // Spanish
  { re: /\b(qu[eé]|cu[aá]l(es)?)\s+(hab[ií]amos\s+)?(decidimos|decidido|acordamos|acordado|quedamos|concluimos)\b/i, why: 'decision' },
  { re: /\b(ya|alguna vez)\s+(hab[ií]amos\s+)?(hablamos|hablado|discutimos|discutido|vimos|visto|tratamos)\b/i, why: 'discussed' },
  { re: /\b(d[oó]nde|en qu[eé] punto)\s+(nos\s+)?(quedamos|qued[oó]|dejamos)\b/i, why: 'where' },
  { re: /\bpor\s+qu[eé]\s+(elegimos|escogimos|decidimos|usamos|optamos)\b/i, why: 'why' },
  { re: /\b(qu[eé]\s+)?(dijo|dijimos|dije)\s+\S+\s+(sobre|de|acerca)\b/i, why: 'said' },
  { re: /\bqu[eé]\s+(qued[oó]|quedaba)\s+pendiente\b/i, why: 'open' },
  // English
  { re: /\bwhat\s+(did|have)\s+we\s+(decide|decided|agree|agreed|conclude|concluded)\b/i, why: 'decision' },
  { re: /\b(did|have)\s+we\s+(ever\s+)?(discuss|discussed|talk|talked|cover|covered)\b/i, why: 'discussed' },
  { re: /\bwhere\s+(did\s+we|do\s+we)\s+(leave|left|stand)\b/i, why: 'where' },
  { re: /\bwhy\s+(did\s+we|do\s+we)\s+(choose|chose|pick|picked|use|go with)\b/i, why: 'why' },
  { re: /\bwhat\s+(did|does)\s+\S+\s+say\s+about\b/i, why: 'said' },
  { re: /\bwhat('s| is| was)\s+(still\s+)?(open|pending|unresolved)\b/i, why: 'open' },
];

// A question aimed at the archive rather than at the project. Returns the reason it matched, or
// null: a caller that cannot say WHY it is suggesting something should not suggest it.
export function archiveQuestion(text = '') {
  const question = String(text ?? '').trim();
  if (question.length < 8 || question.length > 400) return null;
  // An explicit address wins over any guess: the human already chose who answers.
  if (/(^|\s)@[a-z0-9_-]+/i.test(question)) return null;
  // A request to do something is not a question about what was said, however it is worded.
  if (/\b(crea|escribe|implementa|arregla|corre|ejecuta|borra|create|write|implement|fix|run|delete|refactor)\b/i.test(question)) return null;
  for (const pattern of PATTERNS) if (pattern.re.test(question)) return pattern.why;
  return null;
}
