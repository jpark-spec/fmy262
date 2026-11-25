/* The browser prototype's chip (web/opl3fn.js: opl3/build-dbopl-wasm.sh) against the FM-1's (firmware/opl3bench/emu
 * db_spec.c, DBOPL_SPEC + DBOPL_PRE, compiled here natively): random register writes in OPL2/OPL3, 4OP and percussion
 * modes, rendered at 44.1 kHz by both, every sample compared. And the FM-1's chip on two cores (db_host -2: bank 1 as the
 * second core's job) against it on one: the mix and the scope's captures byte for byte. (C compiler: cc) */
const fs = require('fs'), cp = require('child_process'), path = require('path');
const ROOT = path.join(__dirname, '..'), E = path.join(ROOT, 'firmware/opl3bench/emu'), OUT = path.join(__dirname, 'out/eng'), BIN = path.join(OUT, 'db_host');
fs.mkdirSync(OUT, { recursive: true });
cp.execSync(`cc -O2 -std=gnu99 -w -DPLAT_HOST -DDBOPL_PRE -DDBOPL_SCOPE -I${E} -I${E}/dbopl ${E}/db_spec.c ${E}/db_abort.c ${E}/test/db_host.c -lm -o ${BIN}`, { stdio: 'inherit' });
eval(fs.readFileSync(path.join(ROOT, 'web/opl3fn.js'), 'utf8') + ';global.makeOPL=makeOPL;');
let seed = 7;
const rnd = n => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % n; };
let bad = 0, frames = 0, loud = 0, scopeBad = 0, splitBad = 0;
for (let t = 0; t < 40; t++) {
  const lines = ['w 105 1', 'w 1 20'], scopeOn = t % 2;   /* (every other script with the scope on: the mix the same) */
  if (scopeOn) lines.push('s 1');
  if (rnd(3)) lines.push(`w 104 ${rnd(64).toString(16)}`);
  if (rnd(4) === 0) lines.push(`w bd ${(0x20 | rnd(64)).toString(16)}`);
  for (let k = 0; k < 60; k++) {
    const bank = rnd(2) ? 0x100 : 0, kind = rnd(6);
    const reg = kind === 0 ? 0x20 + rnd(22) : kind === 1 ? 0x40 + rnd(22) : kind === 2 ? 0x60 + rnd(22) : kind === 3 ? 0x80 + rnd(22) : kind === 4 ? 0xA0 + rnd(9) + 16 * rnd(2) : 0xC0 + rnd(9);
    lines.push(`w ${(bank | reg).toString(16)} ${rnd(256).toString(16)}`);
    if (rnd(5) === 0) lines.push(`w ${(bank | 0xB0 | rnd(9)).toString(16)} ${(0x20 | rnd(32)).toString(16)}`);
    if (rnd(4) === 0) lines.push(`r ${1 + rnd(900)}`);
  }
  lines.push('r 4410');
  const c = cp.execFileSync(BIN, { input: lines.filter(l => !l.startsWith('s ')).join('\n') + '\n', maxBuffer: 1 << 28 });   /* (C: scope off) */
  const o = makeOPL(); o.opl_reset(44100); if (scopeOn) o.opl_scope_on(1);
  const js = [];
  for (const l of lines) { const a = l.split(' ');
    if (a[0] === 's') continue;
    if (a[0] === 'w') o.opl_write_now(parseInt(a[1], 16), parseInt(a[2], 16));
    else for (let n = +a[1]; n > 0; n -= 4096) { const k = Math.min(4096, n), p = o.opl_render(k); js.push(Buffer.from(new Int16Array(o.memory ? o.memory.buffer : o.opl_memory.buffer, p, k * 2).slice().buffer)); } }
  const j = Buffer.concat(js); frames += j.length / 4;
  { const v = new Int16Array(j.buffer, j.byteOffset, j.length / 2); let pk = 0; for (const x of v) pk = Math.max(pk, Math.abs(x)); if (pk > 1000) loud++; }
  if (Buffer.compare(j, c)) bad++;
  { const q = lines.join('\n') + '\nq\n', c1 = cp.execFileSync(BIN, { input: q, maxBuffer: 1 << 28 }), c2 = cp.execFileSync(BIN, ['-2'], { input: q, maxBuffer: 1 << 28 });
    if (Buffer.compare(c1, c2) || Buffer.compare(c1.subarray(0, c.length), c)) { splitBad++; console.log(`  script ${t}: two cores differ from one`); } }
  if (scopeOn) { /* the scope holds what the chip played: some channel's capture has sound when the mix has */
    let pk = 0; for (let ch = 0; ch < 18; ch++) { const p = o.opl_scope(ch, 448), v = new Int16Array(o.memory.buffer, p, 448); for (const x of v) pk = Math.max(pk, Math.abs(x)); }
    const v = new Int16Array(j.buffer, j.byteOffset + j.length - 448 * 8, 448 * 2); let mp = 0; for (const x of v) mp = Math.max(mp, Math.abs(x));
    if ((mp > 500) !== (pk > 100)) { scopeBad++; console.log(`  script ${t}: mix peak ${mp}, scope peak ${pk}`); } }
}
console.log(`t47: the prototype's DBOPL against the FM-1's: ${40 - bad}/40 scripts identical (${frames} frames, ${loud} of them with sound)`);
if (scopeBad) console.log(`t47: ${scopeBad} scope captures wrong`);
console.log(`t47: two cores against one: ${40 - splitBad}/40 scripts identical (mix and scope)`);
if (bad || loud < 10 || scopeBad || splitBad) process.exit(1);
