// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// Which network this Mac is on, and how a phone on it reaches the Mac.
//
// A network is known by its router: the hardware address of the default gateway, hashed. Two
// cafés both handing out 192.168.1.1 are still two routers. Nothing here asks for a permission:
// macOS answers `route`, `arp` and `ipconfig` for anyone, and Linux keeps both tables in /proc.
// Where MADRE cannot read the router's address the network is unknown, and an unknown network is
// never a trusted one, so the phone simply is not offered there.

import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createSocket } from 'node:dgram';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';

const run = (file, args) => new Promise((resolve) => {
  execFile(file, args, { timeout: 2000, windowsHide: true }, (error, stdout) => resolve(error ? '' : String(stdout)));
});

// `0:1a:2b:…` and `00:1A:2B:…` are the same router.
export function normaliseMac(mac) {
  if (typeof mac !== 'string') return null;
  const parts = mac.trim().toLowerCase().split(/[:-]/);
  if (parts.length !== 6 || parts.some((part) => !/^[0-9a-f]{1,2}$/.test(part))) return null;
  const out = parts.map((part) => part.padStart(2, '0')).join(':');
  return out === '00:00:00:00:00:00' || out === 'ff:ff:ff:ff:ff:ff' ? null : out;
}

export function parseDarwinRoute(raw) {
  const text = String(raw ?? '');
  const gateway = text.match(/^\s*gateway:\s*(\S+)/m)?.[1] ?? null;
  const device = text.match(/^\s*interface:\s*(\S+)/m)?.[1] ?? null;
  return gateway && /^\d+\.\d+\.\d+\.\d+$/.test(gateway) ? { gateway, device } : null;
}

export const parseDarwinArp = (text) => normaliseMac(String(text ?? '').match(/ at ([0-9a-f:]+) /i)?.[1] ?? null);

// `ipconfig getsummary` names the router by its hardware address twice when the network speaks
// IPv6: in the router advertisement's source link-address and in the DHCPv6 server's DUID. A
// process macOS will not show the neighbour table to (the case for anything Node starts) can
// still read this.
export function parseDarwinSummary(raw) {
  const text = String(raw ?? '');
  const advertised = text.match(/source link-address option[^\n]*?:\s*([0-9a-f]{1,2}(?::[0-9a-f]{1,2}){5})/i)?.[1];
  const server = text.match(/SERVERID[^\n]*?Addr\s+([0-9a-f]{1,2}(?::[0-9a-f]{1,2}){5})/i)?.[1];
  return normaliseMac(advertised ?? null) ?? normaliseMac(server ?? null);
}

// /proc/net/route keeps the gateway as little-endian hex.
export function parseLinuxRoute(text) {
  for (const line of text.split('\n').slice(1)) {
    const [device, destination, gateway] = line.trim().split(/\s+/);
    if (destination !== '00000000' || !gateway || gateway === '00000000') continue;
    const bytes = gateway.match(/../g).map((pair) => parseInt(pair, 16)).reverse();
    return { gateway: bytes.join('.'), device };
  }
  return null;
}

export function parseLinuxArp(text, ip) {
  for (const line of text.split('\n').slice(1)) {
    const [address, , , mac] = line.trim().split(/\s+/);
    if (address === ip) return normaliseMac(mac);
  }
  return null;
}

// The system forgets a router it has not talked to in a while; one packet to it makes the system
// look it up again. On macOS one ping (it needs no privilege there); elsewhere one empty datagram
// to the discard port, where nothing listens and nothing answers.
const datagram = (gateway) => new Promise((resolve) => {
  try {
    const socket = createSocket('udp4');
    socket.once('error', () => { socket.close(); resolve(); });
    socket.send(Buffer.alloc(1), 9, gateway, () => { socket.close(); setTimeout(resolve, 300); });
  } catch {
    resolve();
  }
});

const nudge = (gateway, platform = process.platform) => (platform === 'darwin' ? run('/sbin/ping', ['-c', '1', '-t', '1', gateway]) : datagram(gateway));

const networkId = (mac) => createHash('sha256').update(`network:${mac}`).digest('hex').slice(0, 16);

// The network this Mac is on now: { id, gateway, device } or null when it cannot be told.
export async function currentNetwork({ platform = process.platform, exec = run, read = (file) => readFile(file, 'utf8'), poke = nudge } = {}) {
  let route = null;
  let lookup = null;
  if (platform === 'darwin') {
    route = parseDarwinRoute(await exec('/sbin/route', ['-n', 'get', 'default']));
    lookup = async () => parseDarwinArp(await exec('/usr/sbin/arp', ['-n', route.gateway]))
      ?? (/^[a-z0-9]+$/.test(route.device ?? '') ? parseDarwinSummary(await exec('/usr/sbin/ipconfig', ['getsummary', route.device])) : null);
  } else if (platform === 'linux') {
    route = parseLinuxRoute(await read('/proc/net/route').catch(() => ''));
    lookup = async () => parseLinuxArp(await read('/proc/net/arp').catch(() => ''), route.gateway);
  }
  if (!route) return null;
  let mac = await lookup();
  if (!mac) {
    await poke(route.gateway, platform);
    mac = await lookup();
  }
  if (!mac) return null;
  return { id: networkId(mac), gateway: route.gateway, device: route.device };
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

// Loopback, the private ranges and link-local: the only addresses a phone on the same Wi-Fi has.
// Anything else reached the bridge from outside the network, through a forwarded port or worse.
export function isPrivateAddress(raw) {
  if (typeof raw !== 'string') return false;
  const address = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
  const v4 = address.match(IPV4);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  const v6 = address.toLowerCase();
  return v6 === '::1' || /^f[cd][0-9a-f]{2}:/.test(v6) || /^fe[89ab][0-9a-f]:/.test(v6);
}

// This Mac's addresses on the local network, the one on the default route's interface first.
export function lanAddresses({ device = null, interfaces = networkInterfaces() } = {}) {
  const out = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.internal || entry.family !== 'IPv4' || !isPrivateAddress(entry.address) || entry.address.startsWith('169.254.')) continue;
      out.push({ name, address: entry.address });
    }
  }
  out.sort((a, b) => Number(b.name === device) - Number(a.name === device));
  return out.map((one) => one.address);
}
