// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The public half of the Market's key (scripts/market-key.mjs). The catalog at madre.run/mercado/
// is signed with the private half, which lives only on the author's computer; a catalog this key
// does not verify is not read, and nothing in it is installed (src/market-remote.mjs).
export const MARKET_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA4/DXYprFh2wfiOPpkJheWR0uEtJA+Wl3+AnJXE1YGt0=
-----END PUBLIC KEY-----`;

// The public half of the FACTORY key (2026-10-25, scripts/market-key.mjs --fabrica): a second key,
// kept apart from the Market's, that signs the newer files of MADRE's own modules. Those reach every
// MADRE on their own, so the Market's key alone must not be enough to replace one
// (src/builtin-updates.mjs). Were it null, no such file would ever run.
export const FACTORY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA6EMrbXJptG+Qc1Zzeiw2FrTDKBz63BXN6S/BlkI7tUQ=
-----END PUBLIC KEY-----`;
