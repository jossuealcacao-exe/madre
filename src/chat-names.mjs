// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
//
// THE NAME OF A CHAT (2026-11-19, the author: «quiero que mejores la forma en que los chats toman el
// nombre de la conversación»; he chose «una IA tras la primera respuesta», as ChatGPT and Claude do).
//
// Until then a chat took the person's first message as it came, cut at 80 characters: «Quiero que
// convoques a todo el equipo para evaluar las capacidades que tiene cad». Now:
//   - at once, a clean version of that message (provisionalTitle): no greeting, no «@claude», no
//     «por favor», no link or code, the first idea, at most 48 characters cut at a whole word;
//   - after the first answer, an AI names it in two to five words (namePrompt, parseName): the local
//     one when it is on, which costs nothing, or else the AI that answered, with a short prompt.
// A name the person gave is never changed (src/chats.mjs keeps `autoTitle` for that), and the AI
// names a chat once.

export const TITLE_MAX = 48;

const GREETING = /^(hola|holi|buenas|buen d[ií]a|buenos d[ií]as|buenas tardes|buenas noches|hey|oye|qu[eé] tal|hi|hello|good (?:morning|afternoon|evening))\b[\s,!.:;-]*/i;
const MENTIONS = /^(?:@[\w-]+[\s,:]*)+/;
const PLEASE = /^(?:por ?favor|porfa|please|pls)\b[\s,:]*/i;
// A request said politely before what it asks: only when an infinitive follows, so «quiero que
// convoques» stays whole instead of turning into «Convoques».
const POLITE = /^(?:me (?:ayudas|puedes ayudar|podr[ií]as ayudar) a|ay[uú]dame a|puedes|podr[ií]as|quiero|quisiera|necesito|me gustar[ií]a)\s+(?=[a-záéíóúñ]+(?:ar|er|ir)(?:lo|la|los|las|me|te|se|nos)?\b)/i;
const POLITE_EN = /^(?:can you|could you|would you|will you|help me|i want to|i need to|i'd like to)\s+(?=[a-z])/i;

// The person's first message, made into a short line for the list while the AI answers.
export function provisionalTitle(text, max = TITLE_MAX) {
  let line = String(text ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let round = 0; round < 4; round += 1) {
    const before = line;
    for (const lead of [GREETING, MENTIONS, PLEASE, POLITE, POLITE_EN]) line = line.replace(lead, '');
    if (line === before) break;
  }
  // The first idea: up to the end of the first sentence, when that leaves enough to read.
  const stop = line.search(/[.?!;\n](?:\s|$)/);
  if (stop >= 12) line = line.slice(0, stop);
  line = line.replace(/^[¿¡\s"'«“]+/, '').replace(/[\s,;:.¿?¡!"'»”-]+$/, '');
  return clip(line, max);
}

// What the AI is asked. Its answer is one line; parseName is strict about what it keeps.
export function namePrompt({ ask, answer = '', language = 'es' } = {}) {
  const asked = String(ask ?? '').replace(/\s+/g, ' ').trim().slice(0, 600);
  const said = String(answer ?? '').replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);
  if (language === 'en') {
    return [
      'Give this conversation a title. Reply with the title only: 2 to 5 words, in English, no quotes, no final period, no emoji.',
      'Say what it is about, not what was asked (no «Help with…», no «Question about…»). Keep names of products, places and people as written.',
      '',
      `The person wrote: ${asked}`,
      ...(said ? [`The answer began: ${said}`] : []),
    ].join('\n');
  }
  return [
    'Ponle un título a esta conversación. Responde solo con el título: de 2 a 5 palabras, en español, sin comillas, sin punto final, sin emojis.',
    'Di de qué trata, no lo que se pidió (nada de «Ayuda con…» ni «Pregunta sobre…»). Deja los nombres de productos, lugares y personas como vienen.',
    '',
    `La persona escribió: ${asked}`,
    ...(said ? [`La respuesta empezó así: ${said}`] : []),
  ].join('\n');
}

// The AI's answer, kept only when it reads as a title.
export function parseName(text, max = TITLE_MAX) {
  const line = String(text ?? '')
    .split('\n')
    .map((one) => one.trim())
    .find((one) => one && !/^```/.test(one)) ?? '';
  const clean = line
    .replace(/[*_#`>]/g, '')
    .replace(/^\s*(?:t[ií]tulo|title|nombre|name)\s*[:：-]\s*/i, '')
    .replace(/^[\s"'«“‘¿¡-]+|[\s"'»”’.,;:!?¡¿-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length < 3 || clean.length > 70) return null;
  if (clean.split(' ').length > 8) return null;
  // An answer instead of a title («Claro, aquí tienes…», «Sure! …»).
  if (/^(?:claro|por supuesto|aqu[ií] tienes|sure|here(?:'s| is)|of course|okay|ok)\b/i.test(clean)) return null;
  return clip(clean, max);
}

function clip(line, max) {
  if (!line) return '';
  let out = line;
  if (out.length > max) {
    const cut = out.slice(0, max + 1);
    const at = cut.lastIndexOf(' ');
    out = `${(at > max * 0.6 ? cut.slice(0, at) : cut.slice(0, max)).replace(/[\s,;:.·-]+$/, '')}…`;
  }
  return out[0].toLocaleUpperCase() + out.slice(1);
}
