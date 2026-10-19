// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The servers sentinel: what this project has listening, kept watch over while the room is open.
//
// RIPLEY opens a project's own dev server; this is what knows which servers those are. Only the
// project's: a process counts when the folder it was started in is the project or anything under
// it. Everything else listening on the machine — another project's server, an editor, a database —
// is counted and never shown, because a room that lists somebody else's server invites the human
// to work on the wrong thing, and a room that frames it shows them something that is not theirs.
//
// It watches the way the error sentinel does, from outside and without taking a turn. Every few
// seconds, only while someone is looking at the room and RIPLEY is on, it reads what listens and
// says what changed: a server that came up, one that went down. Nothing it says is written to the
// ledger; a port opening is not something the conversation said.
//
// Read-only like everything about ports: `lsof` reports and changes nothing, an HTTP GET to the
// root asks a server what it is, and MADRE starts and stops no server of its own here.

import { classifyListening, inProject, parseCwds } from './ports.mjs';

export const SERVER_WATCH_MS = 5000;
// More than this is a machine in trouble or a test suite, not a project's servers.
const MAX_PROBED = 24;

const byPort = (a, b) => a.port - b.port;

export class ServerSentinel {
  #projectRoot;
  #self;
  #listen;
  #cwdsOf;
  #probe;
  #isRoom;
  #emit;
  #active;
  #intervalMs;
  #servers = new Map();   // port -> what the project has answering there
  #notHttp = new Set();   // `${port}:${pid}` not to offer (no HTTP, or a MADRE room): not asked again
  #wider = [];
  #others = 0;
  #primed = false;
  #scanning = null;
  #timer = null;

  // `isRoom` asks whether a port is a MADRE room — this one on another port, or a second one
  // opened on the same project. Started in the project folder, it would pass for the project's own
  // server; it is the room, and the list is for what the human is building.
  constructor({ projectRoot, self = () => null, listen, cwdsOf, probe, isRoom = async () => false, emit = () => {}, active = async () => true, intervalMs = SERVER_WATCH_MS }) {
    this.#projectRoot = projectRoot;
    this.#self = self;
    this.#listen = listen;
    this.#cwdsOf = cwdsOf;
    this.#probe = probe;
    this.#isRoom = isRoom;
    this.#emit = emit;
    this.#active = active;
    this.#intervalMs = intervalMs;
  }

  // What the project has listening, as last read.
  view(probed = true) {
    return { ports: [...this.#servers.values()].sort(byPort), wider: this.#wider, others: this.#others, probed };
  }

  // One reading at a time: a page asking while the watch is reading gets that same reading.
  scan() {
    this.#scanning ??= this.#read().finally(() => { this.#scanning = null; });
    return this.#scanning;
  }

  async #read() {
    let listening;
    try { listening = classifyListening(await this.#listen(), { self: this.#self() }); }
    catch { return this.view(false); }
    const everyone = [...listening.ports, ...listening.wider];
    const pids = [...new Set(everyone.map((one) => one.pid))];
    const cwds = pids.length ? parseCwds(await this.#cwdsOf(pids).catch(() => '')) : new Map();
    const mine = (one) => inProject(cwds.get(one.pid), this.#projectRoot);
    // A server bound to every interface answers on 127.0.0.1 too (2026-10-18): Node, Express and
    // Vite with --host do it by default, and leaving them out left a project's own servers off its
    // list. Opening one here reaches it on this computer; that it can also be reached from the
    // network is the human's choice, and the list says so.
    const own = [...listening.ports.filter(mine), ...listening.wider.filter(mine).map((one) => ({ ...one, network: true }))].sort(byPort).slice(0, MAX_PROBED);
    const wider = [];

    const next = new Map();
    for (const found of own) {
      const known = this.#servers.get(found.port);
      // Same port, same process: already asked what it is.
      if (known && known.pid === found.pid) { next.set(found.port, known); continue; }
      const key = `${found.port}:${found.pid}`;
      if (this.#notHttp.has(key)) continue;
      const probe = await this.#probe(found.port).catch(() => ({ ok: false }));
      if (!probe.ok || await this.#isRoom(found.port).catch(() => false)) { this.#notHttp.add(key); continue; }
      next.set(found.port, { ...found, status: probe.status, html: probe.html, contentType: probe.contentType, framable: probe.framable, here: true, ...(found.network ? { network: true } : {}) });
    }

    const started = [...next.values()].filter((one) => this.#servers.get(one.port)?.pid !== one.pid);
    const stopped = [...this.#servers.values()].filter((one) => next.get(one.port)?.pid !== one.pid);
    const widerChanged = JSON.stringify(wider) !== JSON.stringify(this.#wider);
    const others = everyone.length - own.length - wider.length;
    const changed = started.length > 0 || stopped.length > 0 || widerChanged || others !== this.#others;
    this.#servers = next;
    this.#wider = wider;
    this.#others = others;
    // The first reading is the state of things, not news: nothing "started" because a page opened.
    if (this.#primed) {
      for (const one of stopped) this.#emit('server.stopped', { port: one.port, command: one.command });
      for (const one of started) this.#emit('server.started', { port: one.port, command: one.command, framable: one.framable });
    }
    if (changed || !this.#primed) this.#emit('servers.changed', this.view());
    this.#primed = true;
    return this.view();
  }

  // The watch runs on its own clock and reads only when asked to be active; a room nobody is
  // looking at, or with RIPLEY off, costs one cheap question every few seconds and nothing else.
  start() {
    if (this.#timer) return;
    this.#timer = setInterval(() => {
      void (async () => { if (await this.#active().catch(() => false)) await this.scan(); })().catch(() => null);
    }, this.#intervalMs);
    this.#timer.unref?.();
  }

  stop() {
    clearInterval(this.#timer);
    this.#timer = null;
  }
}
