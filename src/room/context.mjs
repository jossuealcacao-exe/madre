// The context an agent gets: the recent transcript verbatim and, when the
// room is longer than that window, the older exchanges that match this
// request, recalled from memory inside the same character budget.

import { buildConversationContext } from '../conversation-context.mjs';

export async function contextFor({ memory, priorEvents, messageId, text, contextMaxChars, recallShare, remember = () => {}, omitSynthetic = false, anchor = null }) {
  const full = buildConversationContext(priorEvents, { excludeMessageId: messageId, maxChars: contextMaxChars, omitSynthetic, anchor });
  const none = { context: full, recall: null, memories: null };
  if (!memory || !full.omittedMessages || recallShare <= 0) return none;
  // Another server may have written this room: index what we have not seen.
  const last = memory.lastSequence();
  remember(priorEvents.filter((event) => event.sequence > last));
  const recallBudget = Math.floor(contextMaxChars * recallShare);
  const recent = buildConversationContext(priorEvents, { excludeMessageId: messageId, maxChars: contextMaxChars - recallBudget, omitSynthetic, anchor });
  const before = recent.firstSequence ?? Number.MAX_SAFE_INTEGER;
  let memories = null;
  let recall = null;
  try {
    // One embedding of the request lets both lookups match meaning; without it they match words.
    const queryVector = await memory.embedQuery(text);
    // Distilled notes first (dense, cheap), exact quotes with what is left.
    memories = memory.recallMemories(text, { beforeSequence: before, maxChars: Math.floor(recallBudget * 0.4), queryVector });
    const spent = memories.reduce((sum, item) => sum + item.text.length + 24, 0);
    recall = memory.recall(text, { beforeSequence: before, excludeMessageId: messageId, maxChars: recallBudget - spent, queryVector });
  } catch (error) {
    console.error(`MADRE memory recall failed: ${error.message}`);
  }
  if (!recall?.entries?.length && !memories?.length) return none;
  return { context: recent, recall: recall?.entries?.length ? recall : null, memories: memories?.length ? memories : null };
}
