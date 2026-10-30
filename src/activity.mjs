// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// «En marcha» (2026-10-30): what MADRE is doing, in one place, so a person never has to open a
// terminal to know it. A room says what runs in it now (Room#activity); this file reads what ended a
// moment ago from the end of each conversation's record, and puts a project's answer together.
import { chatLedger, listChats, tailOf } from './chats.mjs';

// What ended in the last half hour counts as «a moment ago».
export const RECENT_MS = 30 * 60 * 1000;
// Enough of a record's end for half an hour of an ordinary conversation, and cheap to read often.
const RECENT_READ = 384 * 1024;
const RECENT_MAX = 10;
// The reminders due in the next day are what comes («Por venir»).
export const ACTIVITY_SOON_MS = 24 * 60 * 60 * 1000;

// The turns that ended since `since`, from the lines of one conversation's record, newest first:
// answered, failed or stopped, with what they were asked and how long they took.
export function recentFromLines(text, { since, chat = null, chatTitle = null } = {}) {
  const asked = new Map();    // messageId → what the person (or the plan) asked
  const started = new Map();  // messageId → when its turn started
  const ended = [];
  for (const line of String(text ?? '').split('\n')) {
    if (!line) continue;
    const kind = line.match(/"type":"([a-z.]+)"/)?.[1];
    if (!['message.created', 'agent.started', 'agent.completed', 'message.failed'].includes(kind)) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    const payload = event?.payload ?? {};
    const at = Date.parse(event.timestamp ?? '');
    if (kind === 'message.created') { if (payload.messageId && payload.role !== 'assistant') asked.set(payload.messageId, String(payload.text ?? '').slice(0, 200)); continue; }
    if (kind === 'agent.started') { started.set(payload.messageId, at); continue; }
    if (!Number.isFinite(at) || at < since) continue;
    const agent = kind === 'agent.completed' ? payload.agent : payload.target;
    // A failure MADRE caused by closing is no failure of the turn, and one with no agent is no turn.
    if (!agent || payload.closing) continue;
    if (kind === 'message.failed' && !started.has(payload.messageId)) continue;
    const from = started.get(payload.messageId);
    ended.push({
      state: kind === 'agent.completed' ? 'ok' : payload.stopped ? 'stopped' : 'failed',
      messageId: payload.messageId ?? null,
      agent,
      planId: payload.planId ?? null,
      at: event.timestamp,
      tookMs: Number.isFinite(from) ? Math.max(0, at - from) : null,
      error: kind === 'message.failed' && !payload.stopped ? String(payload.error ?? '').slice(0, 240) : null,
      timeout: Boolean(payload.timeout),
      chat,
      chatTitle,
    });
  }
  for (const one of ended) one.text = asked.get(one.messageId) ?? '';
  return ended.reverse();
}

// What ended a moment ago across every conversation of a project, newest first.
export async function recentInProject(roomDir, { now = Date.now(), also = [] } = {}) {
  const since = now - RECENT_MS;
  const { chats } = await listChats(roomDir);
  const out = [];
  for (const chat of chats) {
    const touched = Date.parse(chat.updatedAt ?? '');
    if (!(touched >= since) && !also.includes(chat.id)) continue;
    out.push(...recentFromLines(await tailOf(chatLedger(roomDir, chat.id), RECENT_READ), { since, chat: chat.id, chatTitle: chat.title ?? null }));
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, RECENT_MAX);
}

// How many things a project's answer has running: the key's number.
export const runningCount = (answer) => (answer?.now ?? []).filter((one) => one.kind !== 'turn' || !one.planId).length;
