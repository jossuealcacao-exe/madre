function messageEntry(event) {
  if (event.type === 'message.failed') {
    // Failures are part of the conversation: an orchestrator closing a plan
    // must know that a step never answered, and why.
    const { messageId, target, error } = event.payload;
    if (typeof error !== 'string' || !error.trim()) return null;
    return { sequence: event.sequence, messageId: `${messageId}:failed`, role: 'failed', sender: target ?? 'room', target: 'you', text: error.trim() };
  }
  if (event.type === 'command.output') {
    const { name, title, text } = event.payload;
    if (typeof text !== 'string' || !text.trim()) return null;
    return { sequence: event.sequence, messageId: `${event.id}:command`, role: 'command', sender: `/${name}`, target: 'room', text: `${title}\n${text.trim()}`.slice(0, 6000) };
  }
  if (event.type !== 'message.created') return null;
  const { messageId, role, sender, target, text } = event.payload;
  if (typeof text !== 'string' || !text.trim()) return null;
  return { sequence: event.sequence, messageId, role, sender, target, text: text.trim() };
}

export function buildConversationContext(events, { excludeMessageId, maxChars = 16000 } = {}) {
  const messages = events
    .map(messageEntry)
    .filter((message) => message && message.messageId !== excludeMessageId);
  const selected = [];
  let remaining = Math.max(0, Number(maxChars) || 0);

  for (let index = messages.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const message = messages[index];
    const label = `${message.sender} (${message.role})`;
    const allowance = Math.max(0, remaining - label.length - 2);
    if (!allowance) break;
    const text = message.text.length > allowance
      ? allowance <= 3
        ? '.'.repeat(allowance)
        : `...${message.text.slice(message.text.length - allowance + 3)}`
      : message.text;
    selected.unshift({ ...message, text });
    remaining -= label.length + text.length + 2;
  }

  return {
    messages: selected,
    omittedMessages: messages.length - selected.length,
    firstSequence: selected[0]?.sequence ?? null,
    throughSequence: selected.at(-1)?.sequence ?? null,
    previousAgent: [...messages].reverse().find((message) => message.role === 'assistant')?.sender ?? null,
  };
}

export function formatConversationContext(context) {
  if (!context.messages.length) return '';
  const omitted = context.omittedMessages
    ? `[${context.omittedMessages} earlier message(s) omitted]\n`
    : '';
  const transcript = context.messages
    .map((message) => `${message.sender} (${message.role}): ${message.text}`)
    .join('\n\n');
  return `${omitted}${transcript}`;
}
