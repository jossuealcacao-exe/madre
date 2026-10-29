// SPDX-License-Identifier: BUSL-1.1
// MADRE · © 2026 Jossue Alcalá · Business Source License 1.1: LICENSE
// The QR a phone scans to pair with this Mac: text in, a grid of dark and light modules out, and
// an SVG of that grid the room sizes and colours with CSS.
//
// Zero dependencies because MADRE ships none. Byte mode only (UTF-8), versions 1–40, levels
// L/M/Q/H, the smallest version that fits and the mask with the lowest penalty. The symbol is the
// one the `qrcode` package draws, module for module, mask choice included: the tests pin it.

// The two bits each level writes into the format information.
const LEVELS = { L: 1, M: 0, Q: 3, H: 2 };

// By level, for versions 1–40: error-correction codewords per block, and how many blocks.
const EC_PER_BLOCK = {
  L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};
const BLOCKS = {
  L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

// GF(256) over x^8 + x^4 + x^3 + x^2 + 1, for Reed–Solomon.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++, x = (x << 1) ^ (x & 0x80 ? 0x11d : 0)) {
  EXP[i] = EXP[i + 255] = x;
  LOG[x] = i;
}
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

const sideOf = (version) => version * 4 + 17;

// Every codeword the symbol holds, data and error correction: what is left once the function
// patterns, format and version information have taken their modules.
function rawCodewords(version) {
  let bits = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const n = Math.floor(version / 7) + 2;
    bits -= (25 * n - 10) * n - 55;
    if (version >= 7) bits -= 36;
  }
  return bits >> 3;
}

const dataCodewords = (version, level) => rawCodewords(version) - EC_PER_BLOCK[level][version - 1] * BLOCKS[level][version - 1];

function alignmentCentres(version) {
  if (version === 1) return [];
  const n = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
  const centres = [6];
  for (let at = sideOf(version) - 7; centres.length < n; at -= step) centres.splice(1, 0, at);
  return centres;
}

// The generator polynomial of the given degree, leading 1 left out.
function generator(degree) {
  const poly = new Uint8Array(degree);
  poly[degree - 1] = 1;
  for (let i = 0, root = 1; i < degree; i++, root = mul(root, 2)) {
    for (let j = 0; j < degree; j++) poly[j] = mul(poly[j], root) ^ (j + 1 < degree ? poly[j + 1] : 0);
  }
  return poly;
}

function remainder(data, poly) {
  const out = new Uint8Array(poly.length);
  for (const byte of data) {
    const factor = byte ^ out[0];
    out.copyWithin(0, 1);
    out[out.length - 1] = 0;
    for (let i = 0; i < poly.length; i++) out[i] ^= mul(poly[i], factor);
  }
  return out;
}

// Mode, count, the bytes, terminator and padding; then split into blocks, each with its error
// correction, and interleaved.
function codewords(bytes, version, level) {
  const capacity = dataCodewords(version, level);
  const bits = [];
  const put = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) put(byte, 8);
  put(0, Math.min(4, capacity * 8 - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  const data = new Uint8Array(capacity);
  for (let i = 0; i < bits.length; i++) data[i >> 3] |= bits[i] << (7 - (i & 7));
  for (let i = bits.length >> 3, pad = 0xec; i < capacity; i++, pad ^= 0xec ^ 0x11) data[i] = pad;

  const blocks = BLOCKS[level][version - 1];
  const ecLength = EC_PER_BLOCK[level][version - 1];
  const raw = rawCodewords(version);
  const shortBlocks = blocks - (raw % blocks);
  const shortLength = Math.floor(raw / blocks) - ecLength;
  const poly = generator(ecLength);
  const dataBlocks = [];
  const ecBlocks = [];
  for (let b = 0, at = 0; b < blocks; b++) {
    const block = data.subarray(at, (at += shortLength + (b < shortBlocks ? 0 : 1)));
    dataBlocks.push(block);
    ecBlocks.push(remainder(block, poly));
  }
  const out = [];
  for (let i = 0; i <= shortLength; i++) for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  for (let i = 0; i < ecLength; i++) for (const block of ecBlocks) out.push(block[i]);
  return out;
}

// The penalty the `qrcode` package scores a mask with: runs of five or more (N1), 2×2 blocks
// (N2), finder-like runs inside the symbol (N3) and the share of dark modules in 5% steps (N4).
function penalty(dark, size) {
  let score = 0;
  for (let a = 0; a < size; a++) {
    for (const [start, step] of [[a * size, 1], [a, size]]) {
      let run = 0;
      let last = -1;
      let window = 0;
      for (let b = 0; b < size; b++) {
        const on = dark[start + b * step];
        if (on === last) run++;
        else {
          if (run >= 5) score += run - 2;
          last = on;
          run = 1;
        }
        window = ((window << 1) & 0x7ff) | on;
        if (b >= 10 && (window === 0x5d0 || window === 0x05d)) score += 40;
      }
      if (run >= 5) score += run - 2;
    }
  }
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const at = r * size + c;
      const sum = dark[at] + dark[at + 1] + dark[at + size] + dark[at + size + 1];
      if (sum === 0 || sum === 4) score += 3;
    }
  }
  let total = 0;
  for (const on of dark) total += on;
  return score + Math.abs(Math.ceil(total * 100 / dark.length / 5) - 10) * 10;
}

export function qrMatrix(text, { ecc = 'M' } = {}) {
  const level = String(ecc).toUpperCase();
  if (!Object.hasOwn(LEVELS, level)) throw new Error(`QR: unknown error correction level ${ecc}`);
  const bytes = new TextEncoder().encode(String(text ?? ''));
  let version = 1;
  while (version <= 40 && 4 + (version < 10 ? 8 : 16) + bytes.length * 8 > dataCodewords(version, level) * 8) version++;
  if (version > 40) throw new Error(`QR: ${bytes.length} bytes do not fit at level ${level}`);

  const size = sideOf(version);
  const dark = new Uint8Array(size * size);
  const fixed = new Uint8Array(size * size);
  const set = (r, c, on) => {
    dark[r * size + c] = on ? 1 : 0;
    fixed[r * size + c] = 1;
  };

  // Finders with their light separators: rings at distance 2 and 4 from the centre are light.
  for (const [top, left] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        if (top + r < 0 || top + r >= size || left + c < 0 || left + c >= size) continue;
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        set(top + r, left + c, ring !== 2 && ring !== 4);
      }
    }
  }
  for (let i = 8; i < size - 8; i++) {
    set(i, 6, i % 2 === 0);
    set(6, i, i % 2 === 0);
  }
  const centres = alignmentCentres(version);
  const last = centres.length - 1;
  for (let i = 0; i <= last; i++) {
    for (let j = 0; j <= last; j++) {
      if ((i === 0 && (j === 0 || j === last)) || (i === last && j === 0)) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) set(centres[i] + r, centres[j] + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
      }
    }
  }

  // Format information: level and mask with a BCH(15,5) check, twice, plus the one dark module.
  const format = (mask) => {
    const data = (LEVELS[level] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i < 15; i++) {
      const on = (bits >>> i) & 1;
      set(i < 6 ? i : i < 8 ? i + 1 : size - 15 + i, 8, on);
      set(8, i < 8 ? size - 1 - i : i === 8 ? 7 : 14 - i, on);
    }
    set(size - 8, 8, 1);
  };
  format(0);

  // Version information from 7 up: the version with a Golay(18,6) check, in both corners.
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const on = (bits >>> i) & 1;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      set(a, b, on);
      set(b, a, on);
    }
  }

  // Codewords zigzag up and down two columns at a time from the right, around the timing column.
  const words = codewords(bytes, version, level);
  for (let right = size - 1, i = 0; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let c = right; c > right - 2; c--) {
        if (fixed[r * size + c]) continue;
        if (i < words.length * 8) dark[r * size + c] = (words[i >> 3] >>> (7 - (i & 7))) & 1;
        i++;
      }
    }
  }

  const applyMask = (mask) => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) if (!fixed[r * size + c] && MASKS[mask](r, c)) dark[r * size + c] ^= 1;
    }
  };
  let best = 0;
  let lowest = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    format(mask);
    applyMask(mask);
    const score = penalty(dark, size);
    applyMask(mask);
    if (score < lowest) [best, lowest] = [mask, score];
  }
  format(best);
  applyMask(best);

  const modules = [];
  for (let r = 0; r < size; r++) modules.push(Array.from(dark.subarray(r * size, (r + 1) * size), Boolean));
  return { size, modules };
}

const escapeAttribute = (value) => String(value).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

// One path for every dark module, a row's runs merged into one rectangle each. No size and no
// background: the page decides how big it is and what it sits on.
export function qrSvg(text, { ecc = 'M', margin = 2, label = 'QR' } = {}) {
  const { size, modules } = qrMatrix(text, { ecc });
  const pad = Math.max(0, Math.trunc(margin) || 0);
  let d = '';
  modules.forEach((row, y) => {
    for (let x = 0; x < size; x++) {
      if (!row[x]) continue;
      const start = x;
      while (x < size && row[x]) x++;
      d += `M${start + pad} ${y + pad}h${x - start}v1h-${x - start}z`;
    }
  });
  const side = size + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" role="img" aria-label="${escapeAttribute(label)}"><path fill="currentColor" shape-rendering="crispEdges" d="${d}"/></svg>`;
}
