// Ash changes only the requested shape of an answer. This policy is pure and local: it neither
// rewrites the human's request nor changes model, context, tools or permissions.

const EXPLICIT_LENGTH = /\b(?:en|in|m[aá]ximo|max(?:imum)?|exact(?:ly|amente)?|at most|no more than)\s+(?:\w+\s+){0,3}\d+\s*(?:palabras?|words?|l[ií]neas?|lines?|p[aá]rrafos?|paragraphs?)\b/i;
const CODE_TASK = /```|`[^`\n]+`|\b(?:c[oó]digo|code|implementa|implement|parche|patch|funci[oó]n|function|clase|class|script|comando|command|regex|sql|json|html|css|swift|javascript|typescript)\b/i;
const STRUCTURED_TASK = /\b(?:tabla|table|lista|list|pasos?|steps?|compar(?:a|e|aci[oó]n)|audit(?:a|ar|oria)?|review|revisa|diagn[oó]stic|plan)\b/i;

export function ashInstruction(text = '') {
  const request = String(text ?? '');
  const base = 'Ash: answer in compact prose. Say it once, drop the preamble and the summary of what you are about to say, and keep names, negation, numbers, paths, safety details and any ```pulse block exactly as they are. Brevity is in how you write, never in what you leave out.';
  const safeguards = [];
  if (EXPLICIT_LENGTH.test(request)) safeguards.push('The human set a length or format: follow it exactly; Ash does not shorten it further.');
  if (CODE_TASK.test(request)) safeguards.push('Keep code and commands complete; shorten only the prose around them.');
  if (STRUCTURED_TASK.test(request)) safeguards.push('Keep the requested structure and every finding; compress repeated explanation, not evidence.');
  if (!safeguards.length) safeguards.push('For a simple request, lead with the answer and stop when the necessary qualification is complete.');
  return `${base} ${safeguards.join(' ')}`;
}

const unique = (values) => [...new Set(values.filter(Boolean))];

function exactAnchors(text) {
  const source = String(text ?? '');
  return unique([
    ...[...source.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]),
    ...source.match(/(?:[A-Za-z]:\\[^\s"'`]+|(?:\.{0,2}\/|\/)?(?:[\w.-]+\/)+[\w.-]+)/g) ?? [],
    ...source.match(/@[a-z0-9_-]+\b/gi) ?? [],
    ...source.match(/\b[A-Z][A-Z0-9_+.-]{2,}\b/g) ?? [],
    ...source.match(/\b\d+(?:[.,]\d+)?%?\b/g) ?? [],
  ]);
}

function requestedLimit(text) {
  const match = String(text ?? '').match(/\b(?:m[aá]ximo|max(?:imum)?|at most|no more than)\s+(\d+)\s*(palabras?|words?|l[ií]neas?|lines?)\b/i);
  if (!match) return null;
  return { amount: Number(match[1]), unit: /line|l[ií]nea/i.test(match[2]) ? 'lines' : 'words' };
}

// Phase 4 is deliberately a checker, not a second agent turn. A retry could repeat writes or
// external actions; review evidence is visible instead. Exact anchors are required only when the
// human explicitly asked to preserve them, so ordinary answers are not forced to echo a request.
export function validateAshReply({ request = '', response = '' } = {}) {
  const input = String(request ?? '');
  const output = String(response ?? '');
  const issues = [];
  const checked = ['non-empty', 'code-fences', 'pulse-position'];
  if (!output.trim()) issues.push('empty response');
  if ((output.match(/```/g) ?? []).length % 2 !== 0) issues.push('unclosed code fence');
  const pulse = [...output.matchAll(/```pulse\s*\n[\s\S]*?```/gi)].at(-1);
  if (pulse && output.slice(pulse.index + pulse[0].length).trim()) issues.push('text after ```pulse block');

  const limit = requestedLimit(input);
  if (limit) {
    checked.push(`max-${limit.unit}`);
    const count = limit.unit === 'lines' ? output.trim().split(/\r?\n/).length : (output.trim().match(/\S+/g) ?? []).length;
    if (count > limit.amount) issues.push(`${count} ${limit.unit}, maximum ${limit.amount}`);
  }

  const exact = /\b(?:keep|preserve|include|repeat|mant[eé]n|conserva|incluye|repite)\b[^\n.]{0,100}\b(?:exact(?:ly|amente)?|literal(?:ly|mente)?|tal cual|sin cambiar)\b/i.test(input);
  if (exact) {
    checked.push('exact-anchors');
    for (const anchor of exactAnchors(input)) if (!output.includes(anchor)) issues.push(`missing ${anchor}`);
    const negated = /\b(?:no|nunca|jam[aá]s|sin|not|never|without|do not|don't)\b/i.test(input);
    if (negated && !/\b(?:no|nunca|jam[aá]s|sin|not|never|without|do not|don't|did not|didn't)\b/i.test(output)) issues.push('missing negation');
  }

  return { ok: issues.length === 0, checked, issues: unique(issues).slice(0, 12) };
}
