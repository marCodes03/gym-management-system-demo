/**
 * Zero-Dependency Standards-Compliant QR Code Encoder (ISO/IEC 18004)
 * Supports Byte mode with ECC Level M for Versions 1–4 (up to 64 bytes).
 * Produces a boolean 2D matrix suitable for crisp SVG rendering and real optical scanning.
 */

// GF(256) log/antilog tables with primitive polynomial 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i += 1) {
    const factor = data[i] ^ res[0];
    for (let j = 0; j < ecCount - 1; j += 1) {
      res[j] = res[j + 1];
    }
    res[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j += 1) {
        res[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return Array.from(res);
}

// Version specs for ECC Level M (single block for V1-V2, 2 blocks for V3-V4)
const VERSION_SPECS = [
  { version: 1, size: 21, totalData: 16, ecPerBlock: 10, blocks: 1, align: [] },
  { version: 2, size: 25, totalData: 28, ecPerBlock: 16, blocks: 1, align: [6, 18] },
  { version: 3, size: 29, totalData: 44, ecPerBlock: 26, blocks: 1, align: [6, 22] },
  { version: 4, size: 33, totalData: 64, ecPerBlock: 18, blocks: 2, align: [6, 26] },
];

// Format info bits for ECC Level M (00) + mask 0..7 (15-bit BCH with 0x5412 mask)
const FORMAT_INFO_M = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
];

function encodeBytes(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text || 'MAD-MAX-GYM')));
  const spec =
    VERSION_SPECS.find((s) => bytes.length <= s.totalData - 2) ||
    VERSION_SPECS[VERSION_SPECS.length - 1];
  const maxBytes = spec.totalData - 2;
  const clipped = bytes.slice(0, maxBytes);

  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i -= 1) {
      bits.push((val >>> i) & 1);
    }
  };

  // Mode indicator: Byte (0100)
  pushBits(0b0100, 4);
  // Character count (8 bits for versions 1-9)
  pushBits(clipped.length, 8);
  for (const b of clipped) {
    pushBits(b, 8);
  }
  // Terminator (up to 4 zero bits)
  const totalDataBits = spec.totalData * 8;
  const termLen = Math.min(4, totalDataBits - bits.length);
  pushBits(0, termLen);
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) {
      byte = (byte << 1) | bits[i + j];
    }
    dataCodewords.push(byte);
  }

  // Pad codewords 0xEC, 0x11
  let padToggle = 0;
  while (dataCodewords.length < spec.totalData) {
    dataCodewords.push(padToggle % 2 === 0 ? 0xec : 0x11);
    padToggle += 1;
  }

  // Split into blocks and compute Reed-Solomon EC codewords
  const blockSize = Math.floor(spec.totalData / spec.blocks);
  const dataBlocks = [];
  const ecBlocks = [];
  for (let b = 0; b < spec.blocks; b += 1) {
    const slice = dataCodewords.slice(b * blockSize, (b + 1) * blockSize);
    dataBlocks.push(slice);
    ecBlocks.push(rsComputeRemainder(slice, spec.ecPerBlock));
  }

  // Interleave data and EC codewords
  const finalCodewords = [];
  for (let i = 0; i < blockSize; i += 1) {
    for (let b = 0; b < spec.blocks; b += 1) {
      finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i += 1) {
    for (let b = 0; b < spec.blocks; b += 1) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  return { spec, codewords: finalCodewords };
}

function buildMatrix(spec, codewords) {
  const { size, align } = spec;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));

  const setFunc = (r, c, val) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = val;
      isFunction[r][c] = true;
    }
  };

  // Finder patterns + separators
  const drawFinder = (top, left) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        setFunc(r, c, inOuter && (inBorder || inCenter));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  if (align.length >= 2) {
    const center = align[1];
    for (let dr = -2; dr <= 2; dr += 1) {
      for (let dc = -2; dc <= 2; dc += 1) {
        const dist = Math.max(Math.abs(dr), Math.abs(dc));
        setFunc(center + dr, center + dc, dist !== 1);
      }
    }
  }

  // Reserve format info areas & dark module
  for (let i = 0; i <= 8; i += 1) {
    if (!isFunction[8][i]) setFunc(8, i, false);
    if (!isFunction[i][8]) setFunc(i, 8, false);
  }
  for (let i = size - 8; i < size; i += 1) {
    setFunc(8, i, false);
    setFunc(i, 8, false);
  }
  setFunc(size - 8, 8, true); // Dark module

  // Place data bits in zigzag order
  const dataBits = [];
  for (const cw of codewords) {
    for (let i = 7; i >= 0; i -= 1) {
      dataBits.push(((cw >>> i) & 1) === 1);
    }
  }

  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5;
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx += 1) {
        const c = col - dx;
        if (!isFunction[row][c]) {
          modules[row][c] = bitIdx < dataBits.length ? dataBits[bitIdx] : false;
          bitIdx += 1;
        }
      }
    }
    upward = !upward;
  }

  // Apply Mask 0: (row + col) % 2 === 0
  const maskId = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c];
      }
    }
  }

  // Write format info bits for ECC M + mask 0
  const fmt = FORMAT_INFO_M[maskId];
  const getFmtBit = (i) => ((fmt >>> i) & 1) === 1;

  for (let i = 0; i <= 5; i += 1) modules[8][i] = getFmtBit(14 - i);
  modules[8][7] = getFmtBit(8);
  modules[8][8] = getFmtBit(7);
  modules[7][8] = getFmtBit(6);
  for (let i = 9; i < 15; i += 1) modules[14 - i][8] = getFmtBit(14 - i);

  for (let i = 0; i < 8; i += 1) modules[8][size - 1 - i] = getFmtBit(i);
  for (let i = 0; i < 7; i += 1) modules[size - 7 + i][8] = getFmtBit(14 - i);
  modules[size - 8][8] = true;

  return modules;
}

/**
 * Generate a 2D boolean QR code matrix for the given string value.
 */
export function generateQrMatrix(value) {
  const { spec, codewords } = encodeBytes(value);
  return buildMatrix(spec, codewords);
}

export default generateQrMatrix;
