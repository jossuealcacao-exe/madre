// SPDX-License-Identifier: AGPL-3.0-only
// MADRE · © 2026 Jossue Alcalá · GNU AGPL v3 with additional terms (Section 7): ADDITIONAL-TERMS.md
// The public half of the Market's key (scripts/market-key.mjs). The catalog at madre.run/mercado/
// is signed with the private half, which lives only on the author's computer; a catalog this key
// does not verify is not read, and nothing in it is installed (src/market-remote.mjs).
export const MARKET_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA4/DXYprFh2wfiOPpkJheWR0uEtJA+Wl3+AnJXE1YGt0=
-----END PUBLIC KEY-----`;
