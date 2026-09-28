// The names below are the names of formats — JavaScript, JSON, CSS, Markdown — and a format is
// called the same in every language, so they never pass through the catalogue.
//
// Reading a file in the room, not just seeing it. MADRE has no dependencies and is not about to
// take one for this: a highlighter good enough for a viewer is a few hundred lines, and a
// highlighter that has to be perfect is somebody else's product.
//
// The rule it follows is the one that keeps it honest: it never rewrites the file. It hands back
// spans over the same characters, in the same order, so what the screen shows and what is on disk
// are the same bytes. Anything it cannot classify stays plain text rather than being guessed at.

const FAMILIES = {
  js: { ext: /\.(m|c)?jsx?$|\.tsx?$/i, label: 'JavaScript',
    keywords: /\b(await|async|break|case|catch|class|const|continue|default|delete|do|else|export|extends|finally|for|from|function|get|if|import|in|instanceof|let|new|of|return|set|static|super|switch|this|throw|try|typeof|var|void|while|yield|as|interface|type|enum|implements|readonly|declare|namespace|satisfies)\b/,
    literals: /\b(true|false|null|undefined|NaN|Infinity)\b/,
    line: /\/\/.*/, block: [/\/\*/, /\*\//], strings: ['"', "'", '`'] },
  json: { ext: /\.json(c|5)?$|^\.?[a-z-]*rc$/i, label: 'JSON',
    keywords: /(?!)/, literals: /\b(true|false|null)\b/, line: /(?!)/, block: null, strings: ['"'] },
  css: { ext: /\.(css|scss|less|sass)$/i, label: 'CSS',
    keywords: /@[a-z-]+|\b(important)\b/, literals: /#[0-9a-f]{3,8}\b|\b\d+(\.\d+)?(px|rem|em|%|vh|vw|s|ms|fr|deg)\b/i,
    line: /\/\/.*/, block: [/\/\*/, /\*\//], strings: ['"', "'"] },
  html: { ext: /\.(html?|xhtml|xml|svg|vue|svelte)$/i, label: 'HTML',
    keywords: /<\/?[a-zA-Z][\w:-]*|\/?>/, literals: /(?!)/, line: /(?!)/, block: [/<!--/, /-->/], strings: ['"', "'"] },
  md: { ext: /\.(md|markdown|mdx)$/i, label: 'Markdown',
    keywords: /^#{1,6}\s.*$|^\s*[-*+]\s|^\s*\d+\.\s|^>\s?.*$/, literals: /\*\*[^*]+\*\*|__[^_]+__|\[[^\]]*\]\([^)]*\)/,
    line: /(?!)/, block: null, strings: ['`'] },
  py: { ext: /\.pyi?$/i, label: 'Python',
    keywords: /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|match|case)\b/,
    literals: /\b(True|False|None|self|cls)\b/, line: /#.*/, block: null, strings: ['"', "'"] },
  sh: { ext: /\.(sh|bash|zsh|fish)$|^(Makefile|Dockerfile|\.env.*)$/i, label: 'Shell',
    keywords: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|export|local|source|set|trap|in)\b/,
    literals: /\$\{?[A-Za-z_][\w]*\}?|\$\(.*?\)/, line: /#.*/, block: null, strings: ['"', "'"] },
  yaml: { ext: /\.(ya?ml|toml|ini|cfg|conf)$/i, label: 'Config',
    keywords: /^\s*[\w.-]+(?=\s*[:=])/, literals: /\b(true|false|null|yes|no|on|off)\b/, line: /#.*/, block: null, strings: ['"', "'"] },
  sql: { ext: /\.sql$/i, label: 'SQL',
    keywords: /\b(select|from|where|insert|into|values|update|set|delete|create|table|index|drop|alter|join|left|right|inner|outer|on|group|order|by|having|limit|offset|and|or|not|null|primary|key|foreign|references|as|distinct|union|with)\b/i,
    literals: /\b\d+\b/, line: /--.*/, block: [/\/\*/, /\*\//], strings: ["'", '"'] },
};

// What this file is, by its name alone. A family MADRE does not know is not an error: the file is
// shown as plain text, which is what it would have been anyway.
export function familyOf(name) {
  const base = String(name ?? '').split('/').pop() ?? '';
  for (const [id, family] of Object.entries(FAMILIES)) if (family.ext.test(base)) return { id, ...family };
  return null;
}

export function languageLabel(name) {
  return familyOf(name)?.label ?? null;
}

// One line, cut into pieces. Returns [{ text, kind }] covering exactly the input: joining every
// `text` back together must give the line unchanged, which is what the test holds it to.
export function tokenize(line, family, state = { inBlock: false }) {
  if (!family) return [{ text: line, kind: null }];
  const out = [];
  let index = 0;
  const push = (text, kind) => { if (text) out.push({ text, kind }); };

  while (index < line.length) {
    const rest = line.slice(index);

    if (state.inBlock) {
      const close = family.block ? rest.match(family.block[1]) : null;
      if (!close) { push(rest, 'comment'); index = line.length; break; }
      push(rest.slice(0, close.index + close[0].length), 'comment');
      index += close.index + close[0].length;
      state.inBlock = false;
      continue;
    }

    const blockOpen = family.block ? rest.match(family.block[0]) : null;
    const lineOpen = rest.match(family.line);
    const quote = family.strings.map((q) => rest.indexOf(q)).filter((at) => at >= 0).sort((a, b) => a - b)[0];

    // Whichever comes first on this line decides what happens next.
    const marks = [
      blockOpen && blockOpen.index === 0 ? { at: 0, what: 'block' } : blockOpen ? { at: blockOpen.index, what: 'block' } : null,
      lineOpen && lineOpen.index !== undefined ? { at: lineOpen.index, what: 'line' } : null,
      quote !== undefined ? { at: quote, what: 'string' } : null,
    ].filter(Boolean).sort((a, b) => a.at - b.at);
    const next = marks[0];

    if (!next) { pushCode(rest, family, push); index = line.length; break; }
    if (next.at > 0) { pushCode(rest.slice(0, next.at), family, push); index += next.at; continue; }

    if (next.what === 'line') { push(rest, 'comment'); index = line.length; break; }
    if (next.what === 'block') {
      const opened = rest.match(family.block[0])[0];
      const after = rest.slice(opened.length);
      const close = after.match(family.block[1]);
      if (close) { push(rest.slice(0, opened.length + close.index + close[0].length), 'comment'); index += opened.length + close.index + close[0].length; continue; }
      push(rest, 'comment'); index = line.length; state.inBlock = true; break;
    }

    // A string: to its closing quote, respecting a backslash escape.
    const q = rest[0];
    let at = 1;
    while (at < rest.length) {
      if (rest[at] === '\\') { at += 2; continue; }
      if (rest[at] === q) { at += 1; break; }
      at += 1;
    }
    push(rest.slice(0, at), 'string');
    index += at;
  }
  return out;
}

// Code between the comments and the strings: keywords, literals, numbers, and the rest plain.
function pushCode(chunk, family, push) {
  const pattern = new RegExp(`${family.keywords.source}|${family.literals.source}|\\b\\d+(?:\\.\\d+)?\\b`, family.keywords.flags.includes('i') ? 'gi' : 'g');
  let last = 0;
  for (const match of chunk.matchAll(pattern)) {
    if (match.index > last) push(chunk.slice(last, match.index), null);
    const text = match[0];
    push(text, family.keywords.test(text) ? 'keyword' : /^\d/.test(text) ? 'number' : 'literal');
    last = match.index + text.length;
  }
  if (last < chunk.length) push(chunk.slice(last), null);
}
