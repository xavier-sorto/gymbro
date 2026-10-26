// Writes placeholder PNG icons (dark square, yellow "G") into public/. No dependencies.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BACKGROUND = [0x11, 0x11, 0x11];
const FOREGROUND = [0xf5, 0xc5, 0x18];
const ICONS = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 };

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function isForeground(x, y, size) {
  const dx = x / size - 0.5;
  const dy = y / size - 0.5;
  const radius = Math.hypot(dx, dy);
  const ring = radius > 0.28 && radius < 0.4;
  const opening = dx > 0.05 && dy < -0.02 && dy > -0.2;
  const bar = dx > 0 && dx < 0.4 && dy > -0.02 && dy < 0.07;
  return (ring && !opening) || bar;
}

function renderPng(size) {
  const rowLength = size * 3 + 1;
  const raw = Buffer.alloc(rowLength * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = isForeground(x, y, size) ? FOREGROUND : BACKGROUND;
      raw.set(color, y * rowLength + 1 + x * 3);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
for (const [name, size] of Object.entries(ICONS)) {
  writeFileSync(`public/${name}`, renderPng(size));
  console.log(`wrote public/${name} (${size}x${size})`);
}
