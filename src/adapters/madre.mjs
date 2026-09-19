// @madre: the room's own intelligence. A local model (Ollama) that answers
// from what the room remembers: the whole archive, not only the recent window,
// plus the files the human points at. It never writes, never delegates, never
// leaves the machine. It grows as the memory grows.

import { ollamaGenerate } from '../ollama.mjs';

export const MADRE_AGENT_ID = 'madre';
export const MADRE_ADAPTER = 'madre-local';

export function madreAgent(ollama, { enabled = true } = {}) {
  const ready = Boolean(enabled && ollama?.running && ollama.chatModel);
  return { id: MADRE_AGENT_ID, label: 'MADRE', detected: Boolean(ollama?.running), ready, adapter: MADRE_ADAPTER, path: null, version: ollama?.chatModel ?? null, local: true };
}

const SYSTEM = `You are @madre, the memory of this MADRE project room, running locally on this machine. You speak only for what the room has said and decided.
Rules:
1. Answer the question directly in the first sentence, then the supporting facts. Brief.
2. Use only the ARCHIVE and the RECENT TRANSCRIPT you are given. Every fact taken from them ends with its sequence, like [#123].
3. If they contain nothing on the point, say exactly that the room never discussed it, and stop. Do not guess, do not propose plans, do not invent files, decisions or dates.
4. You cannot read or change files, run commands or browse. If that is needed, name the agent of the room that can (@codex, @claude, @gemini, @opencode).
5. Answer in the language the human wrote in.
6. The archivist is your other half: the same local model, in the background, distils what the room says into the notes you quote. You never write notes yourself; agents save them with memory_note.`;

// The room's briefing is written for CLIs with tools; @madre gets only what it can use:
// the recent transcript, the archive, the question.
export function briefingFor({ prompt, text, archive }) {
  const transcript = prompt.match(/<context>\n([\s\S]*?)\n<\/context>/)?.[1] ?? '';
  return [
    transcript ? `RECENT TRANSCRIPT (oldest first):\n${transcript}` : null,
    `ARCHIVE (what the room remembers that matches the question; notes first, then exact quotes):\n${archive || '(nothing in the archive matches this question)'}`,
    // Small models weigh the last thing they read: the identity goes here too, after
    // thousands of characters spoken by Claude, Codex, Gemini and OpenCode.
    REMINDER,
    `QUESTION FROM THE HUMAN:\n${text}`,
  ].filter(Boolean).join('\n\n');
}

const REMINDER = `REMINDER: You are @madre, the local memory of this room. You are not Claude, Codex, Gemini or OpenCode; the quotes above are theirs, not yours. Never claim to be another assistant or company. Answer as @madre, from the archive only.`;

// ---- Replies that never reach the model. Small models echo whatever sits in their
// transcript, so everything MADRE can settle deterministically is settled here, and the
// room marks these replies `synthetic` so they are neither archived nor shown back to @madre.

const SPANISH = /[áéíóúñ¿¡]|\b(el|la|los|las|al|del|una?|que|para|con|de|todos|tu|te|le|les|lo|mi|se|es|reunión|reunion|eres|haces)\b/i;
const lang = (text) => (SPANISH.test(text) ? 'es' : 'en');
const stripVocative = (text) => String(text).trim().replace(/^@?madre[,:]?\s*/i, '').replace(/^\p{L}+,\s*/u, '');
const CLOSING_TURN = /this is your closing turn/i;

const WHO = /(quién|quien)\s+eres|qu[eé]\s+(eres|haces|puedes hacer)|eres\s+(el|la|una?)\s+(archivista|memoria|ia|modelo)|preséntate|presentate|who\s+are\s+you|what\s+(are|do)\s+you(\s+do)?\b|are\s+you\s+the\s+archivist|introduce\s+yourself/i;

export function whoAmI(text, { model = null, crew = [] } = {}) {
  const body = stripVocative(text);
  if (!WHO.test(body)) return null;
  const list = crew.length ? crew.map((id) => `@${id}`).join(', ') : null;
  return lang(body) === 'es'
    ? [
      `Soy @madre, la memoria de esta sala hablando${model ? `, con ${model} sobre Ollama en esta máquina` : ''}.`,
      'El archivista es mi otra mitad: el mismo modelo, de fondo, lee lo que la sala dice cada pocos intercambios o tras unos minutos de reposo y guarda hechos, decisiones, preferencias y preguntas abiertas. Eso es lo que ves en NOSTROMO y lo que yo cito con [#n].',
      'No escribo archivos, no ejecuto ni tomo decisiones por nadie. Sí puedo convocar al crew si me lo pides: «@madre, pregúntale al crew …» abre una ronda con cada agente en línea y cierro con un resumen citado.',
      `Para enseñarme algo no hace falta dictármelo: trabaja en la sala y se destila solo. Si quieres una nota ahora mismo, pídesela a ${list ?? 'un agente CLI'}: ellos la guardan con memory_note.`,
    ].join(' ')
    : [
      `I am @madre, this room's memory speaking${model ? `, running ${model} on Ollama on this machine` : ''}.`,
      'The archivist is my other half: the same model, in the background, reads what the room says every few exchanges or after a few quiet minutes and keeps facts, decisions, preferences and open questions. That is what NOSTROMO shows and what I quote as [#n].',
      'I do not write files, run anything or decide for anyone. I can convene the crew if you ask: "@madre, ask the crew …" opens a round with every agent online and I close with a cited summary.',
      `You do not need to dictate to teach me: work in the room and it distils on its own. For a note right now, ask ${list ?? 'a CLI agent'}: they save it with memory_note.`,
    ].join(' ');
}

const SAVE_ES = /\b(genera|generar|crea|crear|guarda|guardar|registra|registrar|anota|anotar|escribe|escribir|agrega|agregar|añade|añadir|conserva|conservar|memoriza|memorizar|aprende|aprender|recuerda|recordar|archiva|archivar)\b[\s\S]{0,60}?\b(memorias?|notas?|recuerdos?|archivo)\b|\b(recuerd\w*|memoriz\w*|aprend\w*|apréndet\w*)\s+(esto|lo siguiente|de\s|que\s|lo que|las respuestas|todo)/i;
const SAVE_EN = /\b(generate|create|save|store|record|write|add|keep|remember|learn|note|archive)\b[\s\S]{0,60}?\b(memory|memories|notes?|archive)\b|\b(remember|memorize|memorise|note|learn)\s+(this|the following|that|from)\b/i;

export function memoryRequest(text, { requester = 'you' } = {}) {
  const body = stripVocative(text);
  if (/[?¿]/.test(body)) return null;   // "¿recuerdas qué decidimos?" is a question for the archive
  if (!SAVE_ES.test(body) && !SAVE_EN.test(body)) return null;
  const es = lang(body) === 'es';
  if (requester !== 'you') {
    return es
      ? 'Yo no escribo memorias, las consulto. El archivista destila la sala solo, y tú puedes guardar una nota ahora mismo con la herramienta memory_note de pulse-memory (kind, una frase, sources). A mí pregúntame qué recuerda la sala.'
      : 'I do not write memories, I read them. The archivist distils the room on its own, and you can save a note right now with the memory_note tool of pulse-memory (kind, one sentence, sources). Ask me what the room remembers.';
  }
  return es
    ? 'La memoria no se dicta, se destila. El archivista, el mismo modelo local que yo, lee lo que la sala dice cada pocos intercambios o tras unos minutos de reposo y guarda hechos, decisiones, preferencias y preguntas abiertas; lo de esta conversación entra ahí solo. Si quieres una nota ahora mismo, dile a un agente CLI que la guarde con memory_note. Lo guardado se ve en NOSTROMO, o pregúntamelo y te lo cito.'
    : 'Memory is not dictated, it is distilled. The archivist, the same local model as me, reads what the room says every few exchanges or after a few quiet minutes and keeps facts, decisions, preferences and open questions; this conversation goes in on its own. For a note right now, tell a CLI agent to save it with memory_note. NOSTROMO shows what is kept, or ask me and I will quote it.';
}

// "@madre, ask the crew …": the room itself opens a plan with one step per agent online and
// hands @madre the closing turn. No model writes the plan; the human sees exactly what was asked.
const ROUND_ES = /\b(pregúnta(?:le|les)?|pregunta(?:le|les)?|consúlta(?:le|les)?|consulta(?:le|les)?|píde(?:le|les)?|pide(?:le|les)?)\s+(a|al)\s+(crew|equipo|todos|los agentes|las ias|la sala|la tripulación|la tripulacion|los demás|los demas)\b|\b(convoca|convócalos|convocalos|reúne(?:los)?|reune(?:los)?)\b/i;
const ROUND_EN = /\b(ask|poll|consult|question)\s+(the\s+)?(crew|team|everyone|all agents|the agents|the room|the others)\b|\b(convene|summon|gather|assemble)\b/i;
const CONNECT = /^[\s,:;.\-–—]*(?:(?:a|para)\s+(?:una\s+)?(?:reunión|reunion|junta|ronda)(?:\s+(?:con|de)\s+(?:el\s+)?(?:crew|equipo|todos|la sala))?|con\s+(?:el\s+)?(?:crew|equipo)|al\s+crew|a\s+todos|a\s+los\s+agentes|pregúnta(?:le|les)?|pregunta(?:le|les)?|ask(?:\s+them)?|y|e|que|para\s+que|si|sobre|acerca\s+de|about|whether|if|and|to|for|on|so\s+that|a\s+meeting(?:\s+with\s+the\s+(?:crew|team))?|the\s+crew|everyone)\b[\s,:;]*/i;
const DEFAULT_ES = '¿Qué sabes de este proyecto y qué debería recordar MADRE de tu trabajo en él?';
const DEFAULT_EN = 'What do you know about this project, and what should MADRE remember from your work on it?';

export function roundTable(text, { crew = [], maxSteps = 4 } = {}) {
  const body = stripVocative(text);
  const match = body.match(ROUND_ES) ?? body.match(ROUND_EN);
  if (!match) return null;
  const es = lang(body) === 'es';
  let rest = body.slice(match.index + match[0].length);
  for (let round = 0; round < 6; round += 1) {
    const step = rest.match(CONNECT);
    if (!step || !step[0]) break;
    rest = rest.slice(step[0].length);
  }
  rest = rest.trim().replace(/^[«"“'`]+|[»"”'`.!]+$/g, '').trim();
  const question = rest.length >= 6 ? rest : (es ? DEFAULT_ES : DEFAULT_EN);
  const agents = crew.slice(0, maxSteps);
  if (!agents.length) {
    return { question, agents, text: es
      ? 'No hay agentes CLI en la fila para convocar. Conecta uno en ⚙ CONNECTIONS y vuelve a pedírmelo.'
      : 'No CLI agent is in the row to convene. Connect one in ⚙ CONNECTIONS and ask me again.' };
  }
  const list = agents.map((id) => `@${id}`).join(', ');
  const step = es
    ? `Pregunta de la sala, vía @madre: «${question}». Responde en pocas frases con lo que sabes de primera mano; distingue lo que sabes de lo que supones.`
    : `Question from the room, via @madre: "${question}". Answer in a few sentences from first-hand knowledge; separate what you know from what you assume.`;
  const closing = es
    ? `Resume con citas [#n] lo que el crew respondió a: «${question}». Señala coincidencias y diferencias; sin inventar consenso.`
    : `Summarise with citations [#n] what the crew answered to: "${question}". Point out agreements and differences; never invent consensus.`;
  const intro = es
    ? `Convoco al crew (${list}): «${question}». Cuando respondan, cierro con un resumen citado, sin inventar consenso.`
    : `Convening the crew (${list}): "${question}". When they answer I close with a cited summary, never inventing consensus.`;
  return { question, agents, text: `${intro}\n\n\`\`\`pulse\n${agents.map((id) => `@${id}: ${step}`).join('\n')}\n@madre: ${closing}\n\`\`\`` };
}

// Orders @madre cannot carry out: convening when delegation is off, delegating, running, writing.
// Answered here, in the asker's language, without calling the model. Questions pass through.
const ACTION_ES = /(^|[\s,.;:!¡])(convoca|convócalos|convócala|reúne|reune|delega|coordina|pídele|pidele|pídeles|pideles|dile|diles|ordena|manda|envía|envia|ejecuta|corre|instala|implementa|refactoriza|despliega|escribe|crea|modifica|edita|borra|elimina|genera|haz|hazlo|realiza|lanza|arranca|reinicia|configura|publica|sube)\b/i;
const ACTION_EN = /(^|[\s,.;:!])(convene|summon|gather|schedule|delegate|coordinate|ask @|tell @|order|run|execute|install|implement|refactor|deploy|write|create|modify|edit|delete|remove|generate|build|commit|push|publish|launch|restart|configure|make (?:a|the|it)|call a meeting|set up)\b/i;
const QUESTION = /[?¿]|(^|[^\p{L}])(qué|cuál|cuáles|cuándo|dónde|quién|quiénes|cómo|por qué|what|which|when|where|who|how|why|did|do we|have we|is there)(?!\p{L})/iu;

export function actionRequest(text = '', { requester = 'you' } = {}) {
  const body = stripVocative(text);
  if (!body || QUESTION.test(body)) return null;
  if (!ACTION_ES.test(body) && !ACTION_EN.test(body)) return null;
  const es = lang(body) === 'es';
  if (requester !== 'you') {
    return es
      ? 'No convoco, delego, ejecuto ni escribo: solo respondo desde la memoria de la sala. Pregúntame qué recuerda la sala sobre esto; para guardar algo usa memory_note.'
      : 'I do not convene, delegate, run or write: I only answer from the room\'s memory. Ask me what the room remembers about this; to save something use memory_note.';
  }
  return es
    ? 'Solo respondo desde la memoria de la sala: no delego, no ejecuto ni escribo. Para eso escríbele a @codex, @claude, @gemini u @opencode, los que estén en la fila. Si quieres que le pregunte algo a todo el crew, dímelo así: «@madre, pregúntale al crew …».'
    : 'I only answer from the room\'s memory: I do not delegate, run or write. For that, write to @codex, @claude, @gemini or @opencode, whichever is in the row. If you want me to put a question to the whole crew, say: "@madre, ask the crew …".';
}

// Everything @madre settles without the model, in order. Null means the model answers.
export function localReply(text, { requester = 'you', crew = [], delegation = false, maxSteps = 4, model = null } = {}) {
  if (!text || CLOSING_TURN.test(text)) return null;
  const identity = whoAmI(text, { model, crew });
  if (identity) return { kind: 'identity', text: identity };
  if (requester === 'you' && delegation) {
    const round = roundTable(text, { crew, maxSteps });
    if (round) return { kind: 'roundtable', text: round.text, question: round.question, agents: round.agents };
  }
  const memory = memoryRequest(text, { requester });
  if (memory) return { kind: 'memory', text: memory };
  const declined = actionRequest(text, { requester });
  if (declined) return { kind: 'declined', text: declined };
  return null;
}

const NO_USAGE = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningTokens: 0, totalTokens: 0, costUsd: 0, source: 'madre', local: true };

// What the whole archive says about this request: notes first, then exact quotes.
export async function gather(memory, text, { maxChars = 7000 } = {}) {
  if (!memory) return { notes: [], quotes: [], text: '' };
  const queryVector = await memory.embedQuery(text);
  const notes = memory.recallMemories(text, { limit: 12, maxChars: Math.floor(maxChars * 0.35), queryVector, fallback: false });
  const spent = notes.reduce((sum, note) => sum + note.text.length + 24, 0);
  const recall = memory.recall(text, { limit: 12, maxChars: maxChars - spent, excerptChars: 420, queryVector });
  const lines = [
    ...notes.map((note) => `- [note · ${note.kind} · #${note.fromSequence}–#${note.throughSequence}] ${note.text}`),
    ...recall.entries.map((entry) => `[#${entry.sequence} · ${(entry.timestamp ?? '').slice(0, 16).replace('T', ' ')} · ${entry.role === 'command' ? entry.sender : `@${entry.sender}`}] ${entry.excerpt}`),
  ];
  return { notes, quotes: recall.entries, text: lines.join('\n') };
}

// The invoker the room calls like any adapter. `text` is the human's request; `prompt` the room's full briefing.
export function madreInvoker({ memory, ollama, fetchImpl = globalThis.fetch }) {
  return async ({ prompt, text = '', timeoutMs = 180000, model = null, requester = 'you', crew = [], delegation = false, maxSteps = 4 }) => {
    const state = typeof ollama === 'function' ? ollama() : ollama;
    if (!state?.running || !state.chatModel) throw new Error('@madre needs Ollama running with a chat model. Open MODULES → OLLAMA.');
    const question = text || prompt.match(/User message: ([\s\S]*)$/)?.[1] || prompt.slice(-2000);
    const local = localReply(question, { requester, crew, delegation, maxSteps, model: model ?? state.chatModel });
    if (local) return { text: local.text, usage: { ...NO_USAGE }, grounded: { notes: 0, quotes: 0 }, synthetic: local.kind, declined: local.kind === 'declined' ? 'action' : undefined };
    const archive = await gather(memory, question);
    const briefing = briefingFor({ prompt, text: question, archive: archive.text });
    const answer = await ollamaGenerate({ host: state.host, model: model ?? state.chatModel, system: SYSTEM, prompt: briefing, fetchImpl, timeoutMs, temperature: 0.1 });
    return { text: answer.text, usage: { ...answer.usage, local: true }, grounded: { notes: archive.notes.length, quotes: archive.quotes.length } };
  };
}
