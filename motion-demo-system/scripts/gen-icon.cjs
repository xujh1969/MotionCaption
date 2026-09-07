#!/usr/bin/env node
/**
 * Generates the Tauri icon set without any native image dependency.
 *
 * tauri-build on Windows refuses to run without `src-tauri/icons/icon.ico`,
 * and PowerShell's System.Drawing is blocked by policy on this machine, so the
 * icons are written byte by byte here (PNG via zlib, ICO wrapping a PNG entry).
 */
const { deflateSync } = require('node:zlib');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const ICONS_DIR = join(process.cwd(), 'src-tauri', 'icons');

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buffer) => {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
};

/** Renders the MotionCaption mark: champagne-gold play triangle on a dark rounded plate. */
const pixelAt = (x, y, size) => {
  const u = x / size;
  const v = y / size;
  // vertical gradient from #1a1a1f to #05050a
  const bg = [
    Math.round(26 + (5 - 26) * v),
    Math.round(26 + (5 - 26) * v),
    Math.round(31 + (10 - 31) * v),
  ];
  // rounded-corner mask (radius ~22% of the plate)
  const r = 0.22;
  const dx = Math.min(u, 1 - u);
  const dy = Math.min(v, 1 - v);
  if (dx < r && dy < r) {
    const dist = Math.hypot(r - dx, r - dy);
    if (dist > r) return [0, 0, 0, 0];
  }
  // gold ring
  const ring = Math.hypot(u - 0.5, v - 0.5);
  if (ring > 0.40 && ring < 0.435) return [230, 199, 122, 255];
  // play triangle, champagne gold gradient
  const inTriangle = u > 0.36 && u < 0.70 && Math.abs(v - 0.5) < (0.70 - u) * 0.85;
  if (inTriangle) {
    const t = (u - 0.36) / 0.34;
    return [
      Math.round(245 - 25 * t),
      Math.round(214 - 22 * t),
      Math.round(138 - 20 * t),
      255,
    ];
  }
  return [...bg, 255];
};

const encodePng = (size) => {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixelAt(x, y, size);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
      offset += 4;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolor + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const encodeIco = (pngBuffers) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngBuffers.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngBuffers.length;
  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...pngBuffers.map((entry) => entry.data)]);
};

const targets = [
  { file: '32x32.png', size: 32 },
  { file: '128x128.png', size: 128 },
  { file: '128x128@2x.png', size: 256 },
  { file: 'icon.png', size: 512 },
];

mkdirSync(ICONS_DIR, { recursive: true });
const sizes = [16, 32, 48, 64, 256];
writeFileSync(join(ICONS_DIR, 'icon.ico'), encodeIco(sizes.map((size) => ({ size, data: encodePng(size) }))));
for (const target of targets) {
  writeFileSync(join(ICONS_DIR, target.file), encodePng(target.size));
}
console.log(`icons written to ${ICONS_DIR}`);
