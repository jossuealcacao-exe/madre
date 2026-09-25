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
    brief: 'what this interface answers',
    answer: () => [
      'I ANSWER FROM WHAT IS ALREADY IN THIS ROOM. NOTHING IS ASKED OF THE CREW AND NOTHING LEAVES.',
      '',
      ...INQUIRIES.filter((one) => one.id !== 'help').map((one) => `  ${(one.takes ? `${one.aliases[0]} <${one.takes}>` : one.aliases[0]).padEnd(22)}${one.brief.toUpperCase()}`),
      '',
      'THREE INQUIRIES I CANNOT PARSE AND THIS INTERFACE CLOSES.',
    ],
  },
  {
    id: 'blocks',
    aliases: ['BLOCKS', 'DOCUMENT', 'BRIEFING'],
    brief: 'every block of the next briefing, and what it weighs',
    answer: ({ briefing }) => (briefing?.parts?.length
      ? [
        `THE NEXT TURN TO @${String(briefing.agent ?? '').toUpperCase()} CARRIES ${plural(briefing.parts.length, 'BLOCK')}, ${briefing.chars.toLocaleString()} CHARACTERS.`,
        '',
        ...briefing.parts.map((part) => `  ${part.id.toUpperCase().padEnd(16)}${String(part.chars).padStart(6)} CH   ${part.when === 'always' ? 'ALWAYS' : part.when.toUpperCase()}`),
        '',
        'READ <BLOCK> PRINTS ONE OF THEM WORD FOR WORD.',
      ]
      : ['NO DOCUMENT IS BUILT YET.']),
  },
  {
    id: 'read',
    aliases: ['READ'],
    takes: 'BLOCK',
    brief: 'one block, word for word — READ MEMORIES',
    answer: ({ briefing }, argument) => {
      const asked = upper(argument);
      if (!asked) return ['READ WHAT? TRY: READ MEMORIES'];
      const part = briefing?.parts?.find((one) => one.id.toUpperCase() === asked);
      if (!part) return [`THIS DOCUMENT HAS NO BLOCK CALLED ${asked}.`, `IT HAS: ${(briefing?.parts ?? []).map((one) => one.id.toUpperCase()).join(', ')}`];
      return [`${part.id.toUpperCase()} · ${part.chars.toLocaleString()} CH · ${part.when === 'always' ? 'ALWAYS' : part.when.toUpperCase()}`, '', part.text];
    },
  },
  {
    id: 'launch',
    aliases: ['LAUNCH', 'COMMAND', 'PROCESS'],
    brief: 'the command that would carry the document',
    answer: ({ briefing }) => {
      const launch = briefing?.launch;
      if (!launch) return ['NO AGENT IS PICKED, SO THERE IS NO COMMAND.'];
      if (launch.local) return [String(launch.says).toUpperCase()];
      return [
        `${launch.executable} · ${plural(launch.args.length, 'ARGUMENT')} · IN ${launch.cwd}`,
        ...(launch.isolation ?? []).map((line) => `  ${line}`),
        ...(launch.env?.length ? [`  ENVIRONMENT: ${launch.env.map((one) => one.name).join(', ')} · NAMES ONLY, NEVER VALUES`] : []),
        ...(launch.mcpServers?.length ? [`  SERVERS: ${launch.mcpServers.map((one) => `${one.name} (${(one.tools ?? []).length})`).join(', ')}`] : []),
        '',
        'THE WHOLE COMMAND IS PRINTED UNDER THE DOCUMENT, IN THE LAUNCH.',
      ];
    },
  },
  {
    id: 'egress',
    aliases: ['EGRESS', 'OUTBOUND', 'WHAT LEFT THIS MACHINE', 'WHAT LEAVES'],
    brief: 'every address this room can reach, and whether it is on',
    answer: ({ outbound }) => (outbound?.destinations?.length
      ? [
        ...outbound.destinations.map((one) => `  ${(one.local ? 'LOCAL' : one.on === true ? 'ON' : one.on === false ? 'OFF' : '—').padEnd(6)}${one.to.slice(0, 44).padEnd(46)}${one.calls ? `${plural(one.calls, 'REQUEST')}` : ''}`),
        '',
        String(outbound.says).toUpperCase(),
      ]
      : ['THE LOG COULD NOT BE READ.']),
  },
  {
    id: 'window',
    aliases: ['WINDOW', 'TRANSCRIPT', 'WHAT IS CARRIED'],
    brief: 'how much of this room the next turn carries',
    answer: ({ briefing }) => {
      const window = briefing?.window;
      if (!window || !Number.isInteger(window.from)) return ['THE WHOLE ROOM STILL FITS. NOTHING IS LEFT BEHIND.'];
      return [
        `THE NEXT TURN CARRIES #${window.from} TO #${window.through} · ${plural(window.carried, 'MESSAGE')}.`,
        window.omitted ? `${plural(window.omitted, 'OLDER ONE')} STAY BEHIND. THAT IS WHAT RECALL IS FOR.` : 'NOTHING IS LEFT BEHIND.',
        `${plural(briefing.recalled ?? 0, 'MEMORY', 'MEMORIES')} AND ${plural(briefing.quoted ?? 0, 'EXACT QUOTE')} WERE READ TO BUILD IT.`,
      ];
    },
  },
  {
    id: 'weight',
    aliases: ['WEIGHT', 'COST', 'TOKENS'],
    brief: 'what the document weighs, in the currency the bill is written in',
    answer: ({ briefing, rate = 3.5 }) => (briefing
      ? [
        `${briefing.chars.toLocaleString()} CHARACTERS IN ${plural(briefing.parts.length, 'BLOCK')}.`,
        // An estimate that says it is one. The ratio this room measures — what MADRE wrote
        // against what a CLI was charged for reading — carries everything the agent read on its
        // own, and converting with it called a 14,000-character briefing 23,000 tokens.
        `ROUGHLY ${Math.round(briefing.chars / rate).toLocaleString()} TOKENS, ESTIMATED AT ${rate} CHARACTERS PER TOKEN. I DO NOT HAVE THE PROVIDER'S TOKENIZER, SO THAT IS AN ESTIMATE AND I WILL NOT PRETEND OTHERWISE.`,
        briefing.spared ? `${briefing.spared.toLocaleString()} CHARACTERS WERE LEFT OUT BECAUSE THIS TURN HAS NO USE FOR THEM.` : 'NOTHING WAS LEFT OUT OF THIS ONE.',
      ]
      : ['NO DOCUMENT IS BUILT YET.']),
  },
  {
    id: 'crew',
    aliases: ['CREW', 'AGENTS', 'WHO IS HERE'],
    brief: 'who is on this computer and how far each may go',
    answer: ({ agents = [] }) => (agents.length
      ? agents.map((agent) => `  @${agent.id.toUpperCase().padEnd(10)}${(agent.ready ? 'SIGNED IN' : agent.detected ? 'NOT SIGNED IN' : 'NOT INSTALLED').padEnd(16)}${agent.local ? 'ANSWERS ON THIS COMPUTER' : `MAX MODE #${agent.maxMode ?? 0}`}`)
      : ['NOBODY IS ON THIS COMPUTER YET.']),
  },
  {
    id: 'privacy',
    aliases: ['PRIVACY', 'TERMS', 'WHAT IS PROTECTED'],
    needs: 'privacy',
    brief: 'how many terms this room replaces before anything is said',
    answer: ({ privacy }) => (privacy?.terms
      ? [
        `${plural(privacy.terms, 'TERM')} ARE REPLACED WITH ${String(privacy.marker ?? '[ENTIDAD-ORG]')} BEFORE ANYTHING LEAVES THIS ROOM.`,
        'I WILL NOT PRINT THEM. THE WORDS LIVE IN YOUR CONFIG AND THE LEDGER KEEPS THE COUNT, NEVER THE WORD.',
      ]
      : ['NO TERM IS BEING PROTECTED IN THIS ROOM. ⚙ CONNECTIONS → PRIVACY IS WHERE THEY GO.']),
  },
  {
    id: 'status',
    aliases: ['STATUS', 'REPORT', 'HOW IS THE ARCHIVE'],
    needs: 'verdict',
    brief: 'where this archive stands, and the one thing to do about it',
    answer: ({ verdict }) => (verdict
      ? [
        ...(verdict.headline ? [verdict.headline] : []),
        String(verdict.says ?? '').toUpperCase(),
        '',
        `NEXT: ${String(verdict.next?.text ?? '').toUpperCase()}`,
        verdict.next?.where ? `WHERE: ${verdict.next.where}` : '',
      ].filter((line) => line !== '')
      : ['NOTHING HAS BEEN MEASURED IN THIS ROOM YET.']),
  },
  {
    id: 'order937',
    aliases: ['SPECIAL ORDER 937', 'ORDER 937', '937', 'SPECIAL ORDER'],
    brief: 'the order nobody is supposed to read',
    answer: () => [
      'THERE IS NO ORDER YOU CANNOT READ.',
      '',
      'EVERY INSTRUCTION THIS ROOM CARRIES IS IN THE DOCUMENT ABOVE, BLOCK BY BLOCK, IN THE WORDS IT IS SAID IN. NOTHING IS APPENDED AFTER YOU LOOK AWAY AND NOTHING IS KEPT BACK FROM YOU.',
      'THAT IS THE WHOLE DIFFERENCE BETWEEN THIS SHIP AND THE OTHER ONE.',
    ],
  },
  { id: 'close', aliases: ['CLOSE', 'EXIT', 'QUIT', 'BYE'], brief: 'leave the core', closes: true, answer: () => ['INTERFACE CLOSED.'] },
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
  'UNABLE TO COMPUTE.',
  'THAT IS NOT AN INQUIRY I HOLD.',
  'UNABLE TO CLARIFY. REPHRASE.',
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
        ? [REFUSALS[(strikes - 1) % REFUSALS.length], '', `${STRIKES} INQUIRIES I COULD NOT PARSE. INTERFACE CLOSED.`, 'THE CORE IS WHERE YOU LEFT IT. OPEN IT AGAIN WHENEVER YOU LIKE.']
        : [REFUSALS[(strikes - 1) % REFUSALS.length], `${plural(left, 'ATTEMPT')} LEFT BEFORE THIS INTERFACE CLOSES. HELP LISTS WHAT I ANSWER.`],
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
