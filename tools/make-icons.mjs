// Generates the PWA app icons (public/icons/*.png) from a code-drawn pixel map.
// Run with: npm run icons   (no extra dependencies; writes PNGs by hand)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const P = {
  o: '#2B1E1E', n: '#4A3B3B', m: '#6E5A55', g: '#9C8780', l: '#C9B8AE', w: '#F3EAE0',
  f: '#FFF8EC', F: '#E6DCCB', y: '#D9A43A', t: '#2F8C8C', b: '#8BBBD9', x: '#D9767A',
};

// 32x32 sheep face with a ball of teal yarn, on mustard.
const ICON = [
  '................................',
  '................................',
  '................................',
  '.........gg.ggg.ggg.gg..........',
  '.......ggffgfffgfffgffgg........',
  '......gfffffffffffffffffg.......',
  '.....gfffFffffffffffFffffg......',
  '..mmgfffffffffffffffffffffgmm...',
  '.mlllgfffmmmmmmmmmmmmffffglllm..',
  '.mllllgfmlllllllllllllmffglllm..',
  '..mmmmgmllllllllllllllllmgmmm...',
  '.......mllllllllllllllllm.......',
  '.......mlloolllllllloollm.......',
  '.......mlloolllllllloollm.......',
  '.......mllllllllllllllllm.......',
  '........mlllllllllllllm.........',
  '........mlllllllllllllm.........',
  '.........mllllxxlllllm..........',
  '.........mlllllmllllm...........',
  '..........mllmmmmllm............',
  '...........mmllllmm.............',
  '.............mmmm.......oooo....',
  '......................oottttoo..',
  '.....................otbttbttto.',
  '.....................ottbttbbto.',
  '.....................otttbttbto.',
  '.....................otbttbttto.',
  '......................ottbttto..',
  '.......................oooooo.tt',
  '..............................tt',
  '................................',
  '................................',
];

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Renders the icon map at a whole-number scale on a solid background, with padding. */
function render(size, padRatio) {
  const bg = hexToRgb(P.y);
  const inner = Math.floor((size * (1 - padRatio * 2)) / 32) * 32;
  const scale = inner / 32;
  const off = Math.floor((size - inner) / 2);
  return png(size, (x, y) => {
    const ix = Math.floor((x - off) / scale);
    const iy = Math.floor((y - off) / scale);
    const ch = ICON[iy]?.[ix];
    if (ch && ch !== '.') return [...hexToRgb(P[ch]), 255];
    return [...bg, 255];
  });
}

const out = path.resolve('public/icons');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon-192.png'), render(192, 0.08));
fs.writeFileSync(path.join(out, 'icon-512.png'), render(512, 0.08));
// maskable icons need a larger safe zone (content within the middle ~80%)
fs.writeFileSync(path.join(out, 'icon-maskable-512.png'), render(512, 0.18));
console.log('Icons written to public/icons/');
