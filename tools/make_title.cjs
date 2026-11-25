/* The README title picture (assets/fmy262-title.png): FMY262 in the FM-1's own 5x7 font (web/font.js), drawn the way
 * the start screen draws it (DOS blue, a double frame, the title yellow at 4x), then scaled up for the page.
 * Usage: node tools/make_title.cjs */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const GLYPH_SRC = eval(fs.readFileSync(path.join(ROOT, 'web/font.js'), 'utf8') + ';GLYPH_SRC');
const W = 240, H = 80, S = 3;                                   /* screen pixels, and the scale of the picture */
const BG = 0x0000AA, LINE = 0xAAAAAA, TITLE = 0xFFFF55, TEXT = 0xFFFFFF;   /* DOS_RGB: the start screen's colours */
const px = new Uint32Array(W * H).fill(BG);
const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < W && j < H) px[j * W + i] = c; };
const frame = (x, y, w, h, c) => { rect(x, y, w, 1, c); rect(x, y + h - 1, w, 1, c); rect(x, y, 1, h, c); rect(x + w - 1, y, 1, h, c); };
const tw = (s, k) => s.length * 6 * k - k;
const txt = (s, x, y, c, k) => [...s].forEach((ch, n) => { const g = GLYPH_SRC[ch]; if (!g) return;
  g.split(' ').forEach((row, r) => [...row].forEach((b, i) => { if (b === '#') rect(x + n * 6 * k + i * k, y + r * k, k, k, c); })); });
const ctxt = (s, y, c, k) => txt(s, Math.round(W / 2 - tw(s, k) / 2), y, c, k);
frame(5, 5, W - 10, H - 10, LINE); frame(8, 8, W - 16, H - 16, LINE);
ctxt('FMY262', 17, TITLE, 4);
ctxt('AN OPL3 TRACKER FOR M-VAVE FM-1', 54, TEXT, 1);
/* PNG, RGB, no filter */
const raw = Buffer.alloc((W * S * 3 + 1) * H * S);
for (let y = 0; y < H * S; y++) { const o = y * (W * S * 3 + 1); raw[o] = 0;
  for (let x = 0; x < W * S; x++) { const v = px[Math.floor(y / S) * W + Math.floor(x / S)]; raw[o + 1 + x * 3] = v >> 16; raw[o + 2 + x * 3] = v >> 8 & 255; raw[o + 3 + x * 3] = v & 255; } }
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xFFFFFFFF; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W * S, 0); ihdr.writeUInt32BE(H * S, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'assets/fmy262-title.png'), png);
console.log('assets/fmy262-title.png', W * S + '×' + H * S, png.length, 'B');
