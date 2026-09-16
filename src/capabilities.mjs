// What each CLI can do from PULSE, verified against the installed versions on
// 2026-09-16 (Codex 0.153, Claude Code 2.1, Gemini CLI 0.60, OpenCode 1.18).
// The room shows this so a human knows whom to ask for what, and an
// orchestrator can route steps to the agent that actually has the ability.
//
//   read       inspect the project (always on: consultation mode)
//   imageIn    accept an image the human attaches
//   write      create files, only inside a scoped output directory, only when
//              the human grants a creation lease for the turn (phase 2)
//   imageGen   generate images (Codex: image_generation feature via ChatGPT)
//   web        fetch or search the web (denied by default in consultation mode)

export const CAPABILITIES = {
  codex: {
    read: true,
    imageIn: { how: '-i <file>', note: 'Images attach to the prompt directly.' },
    write: { how: '-C <outdir> --sandbox workspace-write', note: 'Reads the whole project, writes only inside the lease directory.' },
    imageGen: { how: 'features.image_generation (stable, enabled)', note: 'Generated with the ChatGPT account; saved into the lease directory.' },
    web: { how: 'web_search feature', note: 'Off in consultation mode.' },
  },
  claude: {
    read: true,
    imageIn: { how: 'Read tool on the attachment path', note: 'The attachments folder is added with --add-dir.' },
    write: { how: '--tools Write,Edit + permission rules', note: 'Write/Edit allowed only under the lease directory.' },
    imageGen: false,
    web: { how: 'WebFetch / WebSearch tools', note: 'Off in consultation mode.' },
  },
  gemini: {
    read: true,
    imageIn: { how: 'read_file on the attachment path', note: 'The attachments folder is added with --include-directories.' },
    write: { how: 'policy: allow write_file/edit with argsPattern', note: 'Paths outside the lease directory stay denied.' },
    imageGen: false,
    web: { how: 'google_web_search / web_fetch', note: 'Off in consultation mode.' },
  },
  opencode: {
    read: true,
    imageIn: { how: '-f <file>', note: 'Files attach to the message.' },
    write: { how: 'permission.edit patterns', note: 'Edit allowed only under the lease directory.' },
    imageGen: false,
    web: { how: 'webfetch / websearch permissions', note: 'Off in consultation mode.' },
  },
};

export const capabilityOf = (agentId) => CAPABILITIES[agentId] ?? { read: true, imageIn: false, write: false, imageGen: false, web: false };

export function capabilitySummary(agentId) {
  const caps = capabilityOf(agentId);
  return {
    read: Boolean(caps.read),
    imageIn: Boolean(caps.imageIn),
    write: Boolean(caps.write),
    imageGen: Boolean(caps.imageGen),
    web: Boolean(caps.web),
    detail: Object.fromEntries(Object.entries(caps).filter(([, value]) => value && typeof value === 'object').map(([key, value]) => [key, value])),
  };
}

// Agents that have a capability, for routing hints in the delegation help.
export function agentsWith(capability, agentIds) {
  return agentIds.filter((id) => Boolean(capabilityOf(id)[capability]));
}
