// Compact, standalone QR Code generator for bKash & Nagad payments
// Supports Byte mode, Error Correction Level L/M

// GF(256) math
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  GF_EXP[i] = x;
  GF_EXP[i + 255] = x;
  GF_LOG[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}
function gfMul(x: number, y: number): number {
  return x === 0 || y === 0 ? 0 : GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function polyMul(p: Uint8Array, q: Uint8Array): Uint8Array {
  const r = new Uint8Array(p.length + q.length - 1);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      r[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return r;
}

function rsGenPoly(n: number): Uint8Array {
  let g: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < n; i++) {
    g = polyMul(g, new Uint8Array([1, GF_EXP[i]]));
  }
  return g;
}

function rsCompute(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGenPoly(ecCount);
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.copyWithin(0, 1);
    res[ecCount - 1] = 0;
    for (let j = 0; j < ecCount; j++) {
      res[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return res;
}

// QR Versions capacity table (Byte mode, Level M)
// Version 2: 25x25, 44 total bytes (28 data, 16 EC)
// Version 3: 29x29, 70 total bytes (44 data, 26 EC)
// Version 4: 33x33, 100 total bytes (64 data, 36 EC)
type QRVersion = { version: number; size: number; totalBytes: number; dataBytes: number; ecBytes: number; alignPos: number[] };
const VERSIONS: QRVersion[] = [
  { version: 2, size: 25, totalBytes: 44, dataBytes: 28, ecBytes: 16, alignPos: [6, 18] },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 44, ecBytes: 26, alignPos: [6, 22] },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 64, ecBytes: 36, alignPos: [6, 26] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const enc = new TextEncoder().encode(text);
  const ver = VERSIONS.find((v) => v.dataBytes - 3 >= enc.length) || VERSIONS[VERSIONS.length - 1];
  const size = ver.size;

  // Encode Byte mode data
  const stream: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      stream.push((val >> i) & 1);
    }
  }
  // Mode: 0100 (Byte)
  pushBits(0b0100, 4);
  // Count: 8 bits for versions 1-9
  pushBits(Math.min(enc.length, ver.dataBytes - 3), 8);
  for (let i = 0; i < Math.min(enc.length, ver.dataBytes - 3); i++) {
    pushBits(enc[i], 8);
  }
  // Terminator
  pushBits(0, 4);
  while (stream.length % 8 !== 0) stream.push(0);

  // Convert to bytes and pad
  const data = new Uint8Array(ver.dataBytes);
  for (let i = 0; i < stream.length / 8; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | stream[i * 8 + j];
    data[i] = b;
  }
  const padPatterns = [0xec, 0x11];
  for (let i = stream.length / 8; i < ver.dataBytes; i++) {
    data[i] = padPatterns[(i - stream.length / 8) % 2];
  }

  // Compute Error Correction
  const ec = rsCompute(data, ver.ecBytes);
  const allBytes = new Uint8Array(ver.totalBytes);
  allBytes.set(data, 0);
  allBytes.set(ec, ver.dataBytes);

  // Initialize Matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isFunction[r][c] = true;
    }
  }

  // Finder patterns at (0,0), (size-7,0), (0,size-7)
  const finders = [[0, 0], [size - 7, 0], [0, size - 7]];
  for (const [r0, c0] of finders) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = r0 + r, nc = c0 + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const isBorder = r === -1 || r === 7 || c === -1 || c === 7;
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setModule(nr, nc, !isBorder && (isOuter || isInner));
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // Alignment pattern (for version >= 2)
  for (const r of ver.alignPos) {
    for (const c of ver.alignPos) {
      if (isFunction[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isOuter = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isCenter = dr === 0 && dc === 0;
          setModule(r + dr, c + dc, isOuter || isCenter);
        }
      }
    }
  }

  // Dark module
  setModule(size - 8, 8, true);

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      if (!isFunction[8][i]) isFunction[8][i] = true;
      if (!isFunction[i][8]) isFunction[i][8] = true;
      if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
      if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = true;
    }
  }

  // Place data bits in zigzag order
  let byteIdx = 0, bitIdx = 7;
  let right = size - 1;
  let upward = true;

  while (right > 0) {
    if (right === 6) right--; // Skip vertical timing pattern column
    const rStart = upward ? size - 1 : 0;
    const rEnd = upward ? -1 : size;
    const rStep = upward ? -1 : 1;

    for (let r = rStart; r !== rEnd; r += rStep) {
      for (let cOffset = 0; cOffset < 2; cOffset++) {
        const c = right - cOffset;
        if (!isFunction[r][c]) {
          let bit = false;
          if (byteIdx < allBytes.length) {
            bit = ((allBytes[byteIdx] >> bitIdx) & 1) === 1;
            bitIdx--;
            if (bitIdx < 0) {
              bitIdx = 7;
              byteIdx++;
            }
          }
          // Mask 0: (r + c) % 2 == 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = bit !== mask;
        }
      }
    }
    right -= 2;
    upward = !upward;
  }

  // Format info (Level M, Mask 0 -> 0x5412)
  const formatBits = 0x5412;
  const fBits = Array.from({ length: 15 }, (_, i) => ((formatBits >> (14 - i)) & 1) === 1);
  // Place format info along top-left finder and split edges
  const coords1 = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
  const coords2 = [[size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],[size-8,8],[8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]];
  for (let i = 0; i < 15; i++) {
    matrix[coords1[i][0]][coords1[i][1]] = fBits[i];
    matrix[coords2[i][0]][coords2[i][1]] = fBits[i];
  }

  return matrix.map((row) => row.map((cell) => cell === true));
}
