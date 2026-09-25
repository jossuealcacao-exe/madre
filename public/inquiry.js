// The console inside the core.
//
// MU/TH/UR 6000 answered by being asked. The core already holds everything an answer would need —
// the document the next turn carries, the command that would run it, what has left this machine —
// and a person reading three floors of a screen still has to find the floor that holds their
// question. So the frame takes inquiries, in the interface's own voice, and answers from what is
// already in the room. Nothing here asks the agents anything, and nothing here is sent anywhere.
//
// It answers or it says it cannot. Three inquiries it cannot parse and the interface closes —
// that is the machine this is, and it is fair about it: every refusal names what it would have
// taken, and the count is on screen from the first one. Reopening starts over. Nothing else
// happens; reading what the room says in your name is not an attempt on the archive.
//
// Pure module, no DOM: the answers are the product, so they are testable on their own.

import { t } from './i18n.js';

export const STRIKES = 3;

const clean = (text) => String(text ?? '').trim().replace(/[?.!]+$/, '').replace(/\s+/g, ' ');
const upper = (text) => clean(text).toUpperCase();
// The plural follows the case of the word it is given: this interface shouts, and "2 ATTEMPTs"
// is the kind of seam that makes a screen look unfinished.
const plural = (count, one, many = one + (one === one.toUpperCase() ? 'S' : 's')) => `${count} ${count === 1 ? one : many}`;

// What an inquiry is made of: what it answers to, what it says it does, and how it answers.
export const INQUIRIES = [
  {
    id: 'help',
    aliases: ['HELP', '?', 'WHAT CAN YOU TELL ME', 'COMMANDS', 'OPTIONS'],
    brief: t('what this interface answers'),
    answer: () => [
      t('I ANSWER FROM WHAT IS ALREADY IN THIS ROOM. NOTHING IS ASKED OF THE CREW AND NOTHING LEAVES.'),
      '',
      ...INQUIRIES.filter((one) => one.id !== 'help').map((one) => `  ${(one.takes ? `${one.aliases[0]} <${one.takes}>` : one.aliases[0]).padEnd(22)}${one.brief.toUpperCase()}`),
      '',
      t('THREE INQUIRIES I CANNOT PARSE AND THIS INTERFACE CLOSES.'),
    ],
  },
  {
    id: 'blocks',
    aliases: ['BLOCKS', 'DOCUMENT', 'BRIEFING'],
    brief: t('every block of the next briefing, and what it weighs'),
    answer: ({ briefing }) => (briefing?.parts?.length
      ? [
        t('THE NEXT TURN TO @{agent} CARRIES {n} BLOCKS, {ch} CHARACTERS.', { agent: String(briefing.agent ?? '').toUpperCase(), n: briefing.parts.length, ch: briefing.chars.toLocaleString() }),
        '',
        ...briefing.parts.map((part) => `  ${part.id.toUpperCase().padEnd(16)}${String(part.chars).padStart(6)} CH   ${part.when === 'always' ? t('ALWAYS') : part.when.toUpperCase()}`),
        '',
        t('READ <BLOCK> PRINTS ONE OF THEM WORD FOR WORD.'),
      ]
      : [t('NO DOCUMENT IS BUILT YET.')]),
  },
  {
    id: 'read',
    aliases: ['READ'],
    takes: 'BLOCK',
    brief: t('one block, word for word — READ MEMORIES'),
    answer: ({ briefing }, argument) => {
      const asked = upper(argument);
      if (!asked) return [t('READ WHAT? TRY: READ MEMORIES')];
      const part = briefing?.parts?.find((one) => one.id.toUpperCase() === asked);
      if (!part) return [t('THIS DOCUMENT HAS NO BLOCK CALLED {block}.', { block: asked }), t('IT HAS: {blocks}', { blocks: (briefing?.parts ?? []).map((one) => one.id.toUpperCase()).join(', ') })];
      return [`${part.id.toUpperCase()} · ${part.chars.toLocaleString()} CH · ${part.when === 'always' ? t('ALWAYS') : part.when.toUpperCase()}`, '', part.text];
    },
  },
  {
    id: 'launch',
    aliases: ['LAUNCH', 'COMMAND', 'PROCESS'],
    brief: t('the command that would carry the document'),
    answer: ({ briefing }) => {
      const launch = briefing?.launch;
      if (!launch) return [t('NO AGENT IS PICKED, SO THERE IS NO COMMAND.')];
      if (launch.local) return [String(launch.says).toUpperCase()];
      return [
        t('{executable} · {n} ARGUMENTS · IN {dir}', { executable: launch.executable, n: launch.args.length, dir: launch.cwd }),
        ...(launch.isolation ?? []).map((line) => `  ${line}`),
        ...(launch.env?.length ? [t('  ENVIRONMENT: {names} · NAMES ONLY, NEVER VALUES', { names: launch.env.map((one) => one.name).join(', ') })] : []),
        ...(launch.mcpServers?.length ? [t('  SERVERS: {servers}', { servers: launch.mcpServers.map((one) => `${one.name} (${(one.tools ?? []).length})`).join(', ') })] : []),
        '',
        t('THE WHOLE COMMAND IS PRINTED UNDER THE DOCUMENT, IN THE LAUNCH.'),
      ];
    },
  },
  {
    id: 'egress',
    aliases: ['EGRESS', 'OUTBOUND', 'WHAT LEFT THIS MACHINE', 'WHAT LEAVES'],
    brief: t('every address this room can reach, and whether it is on'),
    answer: ({ outbound }) => (outbound?.destinations?.length
      ? [
        ...outbound.destinations.map((one) => `  ${(one.local ? 'LOCAL' : one.on === true ? 'ON' : one.on === false ? 'OFF' : '—').padEnd(6)}${one.to.slice(0, 44).padEnd(46)}${one.calls ? `${plural(one.calls, 'REQUEST')}` : ''}`),
        '',
        String(outbound.says).toUpperCase(),
      ]
      : [t('THE LOG COULD NOT BE READ.')]),
  },
  {
    id: 'window',
    aliases: ['WINDOW', 'TRANSCRIPT', 'WHAT IS CARRIED'],
    brief: t('how much of this room the next turn carries'),
    answer: ({ briefing }) => {
      const window = briefing?.window;
      if (!window || !Number.isInteger(window.from)) return [t('THE WHOLE ROOM STILL FITS. NOTHING IS LEFT BEHIND.')];
      return [
        t('THE NEXT TURN CARRIES #{from} TO #{through} · {n} MESSAGES.', { from: window.from, through: window.through, n: window.carried }),
        window.omitted ? t('{n} OLDER ONES STAY BEHIND. THAT IS WHAT RECALL IS FOR.', { n: window.omitted }) : t('NOTHING IS LEFT BEHIND.'),
        t('{m} MEMORIES AND {q} EXACT QUOTES WERE READ TO BUILD IT.', { m: briefing.recalled ?? 0, q: briefing.quoted ?? 0 }),
      ];
    },
  },
  {
    id: 'weight',
    aliases: ['WEIGHT', 'COST', 'TOKENS'],
    brief: t('what the document weighs, in the currency the bill is written in'),
    answer: ({ briefing, rate = 3.5 }) => (briefing
      ? [
        t('{ch} CHARACTERS IN {n} BLOCKS.', { ch: briefing.chars.toLocaleString(), n: briefing.parts.length }),
        // An estimate that says it is one. The ratio this room measures — what MADRE wrote
        // against what a CLI was charged for reading — carries everything the agent read on its
        // own, and converting with it called a 14,000-character briefing 23,000 tokens.
        t("ROUGHLY {n} TOKENS, ESTIMATED AT {rate} CHARACTERS PER TOKEN. I DO NOT HAVE THE PROVIDER'S TOKENIZER, SO THAT IS AN ESTIMATE AND I WILL NOT PRETEND OTHERWISE.", { n: Math.round(briefing.chars / rate).toLocaleString(), rate }),
        briefing.spared ? t('{n} CHARACTERS WERE LEFT OUT BECAUSE THIS TURN HAS NO USE FOR THEM.', { n: briefing.spared.toLocaleString() }) : t('NOTHING WAS LEFT OUT OF THIS ONE.'),
      ]
      : [t('NO DOCUMENT IS BUILT YET.')]),
  },
  {
    id: 'crew',
    aliases: ['CREW', 'AGENTS', 'WHO IS HERE'],
    brief: t('who is on this computer and how far each may go'),
    answer: ({ agents = [] }) => (agents.length
      ? agents.map((agent) => `  @${agent.id.toUpperCase().padEnd(10)}${(agent.ready ? t('SIGNED IN') : agent.detected ? t('NOT SIGNED IN') : t('NOT INSTALLED')).padEnd(16)}${agent.local ? t('ANSWERS ON THIS COMPUTER') : t('MAX MODE #{n}', { n: agent.maxMode ?? 0 })}`)
      : [t('NOBODY IS ON THIS COMPUTER YET.')]),
  },
  {
    id: 'privacy',
    aliases: ['PRIVACY', 'TERMS', 'WHAT IS PROTECTED'],
    needs: 'privacy',
    brief: t('how many terms this room replaces before anything is said'),
    answer: ({ privacy }) => (privacy?.terms
      ? [
        t('{n} TERMS ARE REPLACED WITH {marker} BEFORE ANYTHING LEAVES THIS ROOM.', { n: privacy.terms, marker: String(privacy.marker ?? '[ENTIDAD-ORG]') }),
        t('I WILL NOT PRINT THEM. THE WORDS LIVE IN YOUR CONFIG AND THE LEDGER KEEPS THE COUNT, NEVER THE WORD.'),
      ]
      : [t('NO TERM IS BEING PROTECTED IN THIS ROOM. ⚙ CONNECTIONS → PRIVACY IS WHERE THEY GO.')]),
  },
  {
    id: 'status',
    aliases: ['STATUS', 'REPORT', 'HOW IS THE ARCHIVE'],
    needs: 'verdict',
    brief: t('where this archive stands, and the one thing to do about it'),
    answer: ({ verdict }) => (verdict
      ? [
        ...(verdict.headline ? [verdict.headline] : []),
        String(verdict.says ?? '').toUpperCase(),
        '',
        t('NEXT: {what}', { what: String(verdict.next?.text ?? '').toUpperCase() }),
        verdict.next?.where ? t('WHERE: {where}', { where: verdict.next.where }) : '',
      ].filter((line) => line !== '')
      : [t('NOTHING HAS BEEN MEASURED IN THIS ROOM YET.')]),
  },
  {
    id: 'order937',
    aliases: ['SPECIAL ORDER 937', 'ORDER 937', '937', 'SPECIAL ORDER'],
    brief: t('the order nobody is supposed to read'),
    answer: () => [
      t('THERE IS NO ORDER YOU CANNOT READ.'),
      '',
      t('EVERY INSTRUCTION THIS ROOM CARRIES IS IN THE DOCUMENT ABOVE, BLOCK BY BLOCK, IN THE WORDS IT IS SAID IN. NOTHING IS APPENDED AFTER YOU LOOK AWAY AND NOTHING IS KEPT BACK FROM YOU.'),
      t('THAT IS THE WHOLE DIFFERENCE BETWEEN THIS SHIP AND THE OTHER ONE.'),
    ],
  },
  { id: 'close', aliases: ['CLOSE', 'EXIT', 'QUIT', 'BYE'], brief: t('leave the core'), closes: true, answer: () => [t('INTERFACE CLOSED.')] },
];

const byAlias = INQUIRIES.flatMap((one) => one.aliases.map((alias) => [alias, one])).sort((a, b) => b[0].length - a[0].length);

// What an inquiry asked for, and with what. The longest alias wins, so SPECIAL ORDER 937 is not
// read as SPECIAL ORDER.
export function parseInquiry(text) {
  const asked = upper(text);
  if (!asked) return null;
  for (const [alias, inquiry] of byAlias) {
    if (asked === alias) return { inquiry, argument: '' };
    if (asked.startsWith(`${alias} `)) return { inquiry, argument: clean(text).slice(alias.length + 1) };
  }
  return null;
}

// What MU/TH/UR says to something she cannot parse. Never the same twice in a row, and every one
// of them names what she would have taken, so the third is not a surprise.
export const REFUSALS = [
  t('UNABLE TO COMPUTE.'),
  t('THAT IS NOT AN INQUIRY I HOLD.'),
  t('UNABLE TO CLARIFY. REPHRASE.'),
];

export function answerFor(text, context = {}) {
  const found = parseInquiry(text);
  if (!found) {
    const strikes = Number(context.strikes ?? 0) + 1;
    const left = STRIKES - strikes;
    return {
      id: null,
      strike: true,
      strikes,
      closes: strikes >= STRIKES,
      lines: strikes >= STRIKES
        ? [REFUSALS[(strikes - 1) % REFUSALS.length], '', t('{n} INQUIRIES I COULD NOT PARSE. INTERFACE CLOSED.', { n: STRIKES }), t('THE CORE IS WHERE YOU LEFT IT. OPEN IT AGAIN WHENEVER YOU LIKE.')]
        : [REFUSALS[(strikes - 1) % REFUSALS.length], t('{n} ATTEMPTS LEFT BEFORE THIS INTERFACE CLOSES. HELP LISTS WHAT I ANSWER.', { n: left })],
    };
  }
  return {
    id: found.inquiry.id,
    strike: false,
    strikes: Number(context.strikes ?? 0),
    closes: Boolean(found.inquiry.closes),
    needs: found.inquiry.needs ?? null,
    lines: found.inquiry.answer(context, found.argument).filter((line) => typeof line === 'string'),
  };
}
