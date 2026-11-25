/* firmware/engine (C) against web/engine.js: the same songs and messages, the register writes compared.
 *   ENG_EXACT build (double, libm): every write the same, at the same sample, in the same order.
 *   device build (float, fm1-base fastmath.h, 32.32 tick clock): the writes that differ counted.
 * Songs: the demo song, random songs using every effect (FUZZ of them, default 150), and any .a2m files in
 * AT2_MODULES. node tests/t42.cjs [--keep]  (C compiler: cc) */
process.chdir(require('path').join(__dirname, '../web'));
const fs = require('fs'), cp = require('child_process'), path = require('path');
eval(fs.readFileSync('engine.js', 'utf8') + fs.readFileSync('demo.js', 'utf8') + fs.readFileSync('export.js', 'utf8') + fs.readFileSync('songfile.js', 'utf8') + ';global.E=Engine;global.X={importA2M};global.demoSong=demoSong;global.fmyWrite=fmyWrite;global.fmyRead=fmyRead;');

const OUT = path.join(__dirname, 'out/eng'), ROOT = path.join(__dirname, '..');
fs.mkdirSync(OUT, { recursive: true });
const SEC = 44100;

/* ---- the C side */
const BIN = { exact: path.join(OUT, 'eng_exact'), dev: path.join(OUT, 'eng_dev'), fmy: path.join(OUT, 'eng_fmy') };
const src = `${ROOT}/firmware/engine/eng.c ${ROOT}/firmware/engine/songmem.c ${ROOT}/firmware/engine/test/eng_host.c -I${ROOT}/firmware/engine`;
cp.execSync(`cc -O2 -std=c99 -Wall -Wextra -Werror -DENG_EXACT ${src} -lm -o ${BIN.exact}`, { stdio: 'inherit' });
cp.execSync(`cc -O2 -std=c99 -Wall -Wextra -Werror -I${ROOT}/vendor/fm1-base/include ${src} -o ${BIN.dev}`, { stdio: 'inherit' });
cp.execSync(`cc -O2 -std=c99 -Wall -Wextra -Werror -DENG_EXACT -DENG_FMY ${src} ${ROOT}/firmware/ui/songfile.c ${ROOT}/firmware/ui/uisong.c -I${ROOT}/firmware/ui -I${ROOT}/firmware/player -lm -o ${BIN.fmy}`, { stdio: 'inherit' });

/* ---- the song in ENG1 (firmware/engine/test/eng_host.c reads it) */
function songBin(s) {
  const b = [], u8 = v => b.push(v & 255), u16 = v => { u8(v); u8(v >> 8); };
  'ENG1'.split('').forEach(c => u8(c.charCodeAt(0)));
  u16(s.rows); [s.bpm, s.speed, s.lfo || 0, s.opl, s.perc ? 1 : 0, s.four || 0, s.gvol, s.vtab || 0, s.mspd || 1, s.vdir ? 1 : 0].forEach(u8);
  u16(s.order.length); s.order.forEach(u8);
  u16(s.patterns.length);
  s.patterns.forEach(P => { if (!P) return u8(0); u8(1); for (let r = 0; r < s.rows; r++) for (let c = 0; c < 20; c++) P[r][c].forEach(u8); });
  u16(s.inst.length);
  s.inst.forEach(i => {
    i.op.forEach(o => ['am', 'vib', 'egt', 'ksr', 'mult', 'ksl', 'tl', 'ar', 'dr', 'sl', 'rr', 'ws'].forEach(k => u8(o[k] | 0)));
    [i.fb, i.con, i.pan, i.ft || 0, i.arpT || 0, i.vibT || 0, i.four ? 1 : 0].forEach(u8);
    const M = i.fmm; if (!M) return u8(0); u8(1);
    [M.len, M.lb, M.ll, M.ko].forEach(u8); for (let j = 0; j < 28; j++) u8(M.dis[j] ? 1 : 0);
    for (let j = 0; j < M.len; j++) { const st = M.steps[j]; st.d.forEach(u8); u16(st.fs); u8(st.pan); u8(st.dur); }
  });
  [...s.arp, ...s.vib].forEach(t => { [t.len, t.spd, t.loop, t.delay].forEach(u8); for (let j = 0; j < 16; j++) u8(t.data[j] | 0); });
  return Buffer.from(b);
}

/* ---- the JavaScript side: the same script, the same log */
function runJS(song, script) {
  let sample = 0; const log = [];
  const fake = () => ({ opl_reset() {}, opl_write_now(r, v) { log.push(`W ${sample} ${r.toString(16)} ${v.toString(16)}`); },
    opl_render(k) { sample += k; return 0; }, memory: { buffer: new ArrayBuffer(4096) } });
  const e = new E(44100, fake, m => { if (m.t === 'pos') log.push(`P ${m.ord} ${m.row} ${m.trig.reduce((a, c) => a | 1 << c, 0).toString(16)}`); });
  const L = new Float32Array(256), R = new Float32Array(256);
  for (const ln of script) { const a = ln.split(' '), n = a.slice(1).map(Number);
    if (a[0] === 'song') e.handle({ t: 'song', song });
    else if (a[0] === 'play') e.handle({ t: 'play', ord: n[0], row: n[1], loop: !!n[2] });
    else if (a[0] === 'stop') e.handle({ t: 'stop' });
    else if (a[0] === 'render') for (let k = n[0]; k > 0; k -= 256) e.render(L, R, Math.min(256, k));
    else if (a[0] === 'on') e.handle({ t: 'on', c: n[0], inst: n[1], note: n[2] });
    else if (a[0] === 'off') e.handle({ t: 'off', c: n[0] });
    else if (a[0] === 'mute') { const m = parseInt(a[1], 16); e.handle({ t: 'mute', mute: [...Array(20)].map((_, i) => !!(m >> i & 1)) }); }
    else if (a[0] === 'tune') e.handle({ t: 'tune', cents: n[0] });
  }
  return log.join('\n') + '\n';
}

/* ---- random songs */
let seed = 12345;
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) / 16777216; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), pick = p => rnd() < p;
function fuzzSong() {
  const rows = ri(16, 48), npat = ri(1, 4), ninst = ri(1, 12);
  const op = () => ({ am: ri(0, 1), vib: ri(0, 1), egt: ri(0, 1), ksr: ri(0, 1), mult: ri(0, 15), ksl: ri(0, 3), tl: ri(0, 63), ar: ri(0, 15), dr: ri(0, 15), sl: ri(0, 15), rr: ri(0, 15), ws: ri(0, 7) });
  const inst = [...Array(ninst)].map(() => {
    const i = { fb: ri(0, 7), con: ri(0, 1), pan: ri(0, 2), ft: pick(0.3) ? ri(-99, 99) : 0, arpT: pick(0.3) ? ri(0, 16) : 0, vibT: pick(0.3) ? ri(0, 16) : 0, op: [op(), op()] };
    if (pick(0.25)) i.four = true;
    if (pick(0.3)) { const len = ri(1, 8); i.fmm = { len, lb: pick(0.5) ? ri(1, len) : 0, ll: ri(0, len), ko: pick(0.4) ? ri(1, len) : 0, dis: [...Array(28)].map(() => pick(0.2)),
      steps: [...Array(len)].map(() => ({ d: [...Array(11)].map(() => ri(0, 255)), fs: pick(0.4) ? ri(-300, 300) : 0, pan: ri(0, 3), dur: ri(0, 4) })) }; }
    return i; });
  const tab = kind => { const len = ri(1, 16); return { len, spd: ri(1, 4), loop: ri(-1, len), delay: kind === 'vib' ? ri(0, 10) : 0, data: [...Array(16)].map(() => kind === 'arp' ? ri(-12, 24) : ri(-64, 64)) }; };
  /* effects: everything, the ones that move the song (B, D, Z C/D loops, speed) rarer */
  const fx = () => { let f = ri(0, 47); if ((f === 11 || f === 13 || f === 15) && !pick(0.3)) f = ri(16, 24); let v = ri(0, 255);
    if (f === 35 && pick(0.5)) v = 0xF0 | ri(0, 15); if (f === 36 && pick(0.5)) v = ri(0, 15) << 4 | ri(0, 15); if (f === 15 && v < 32 && v > 12) v = ri(2, 8);
    return [f, v]; };
  const patterns = [...Array(npat)].map(() => { const P = emptyPattern(rows);
    for (let r = 0; r < rows; r++) for (let c = 0; c < 20; c++) { if (!pick(0.35)) continue; const L = P[r][c];
      if (pick(0.6)) L[0] = pick(0.1) ? -2 : ri(24, 96); if (pick(0.5)) L[1] = ri(0, ninst + 1);
      if (pick(0.5)) [L[2], L[3]] = fx(); if (pick(0.25)) [L[4], L[5]] = fx(); }
    return P; });
  if (pick(0.15)) patterns.push(undefined);
  const order = [...Array(ri(1, 6))].map(() => ri(0, patterns.length - 1 + (pick(0.1) ? 1 : 0)));
  if (pick(0.2)) order.push(0x80 + ri(0, order.length - 1));
  return normSong({ rows, bpm: ri(32, 255), speed: ri(1, 12), lfo: ri(0, 3), opl: pick(0.2) ? 2 : 3, perc: pick(0.3), four: pick(0.5) ? ri(0, 63) : 0,
    gvol: pick(0.7) ? 63 : ri(0, 63), vtab: pick(0.6) ? 0 : pick(0.5) ? ri(1, 239) : ri(240, 255), mspd: ri(1, 3), vdir: pick(0.5) ? 1 : 0, order, patterns, inst,
    arp: [...Array(16)].map(() => tab('arp')), vib: [...Array(16)].map(() => tab('vib')) });
}
function script(s, sec) {
  const n = Math.max(1, s.inst.length), q = Math.round(sec * SEC / 4 / 256) * 256;
  return ['song', 'play 0 0 0', `render ${q}`, `mute ${ri(0, 0xFFFFF).toString(16)}`, `render ${q}`, 'mute 0', `tune ${ri(-50, 50)}`,
    `on ${ri(0, 19)} ${ri(1, n)} ${ri(30, 90)}`, `render ${q}`, `off ${ri(0, 19)}`, 'stop', `render 2048`,
    `play ${ri(0, s.order.length - 1)} ${ri(0, s.rows - 1)} 1`, `render ${q}`, 'stop', `on 13 ${ri(1, n)} 60`, 'render 4096', 'off 13', 'render 1024'];
}

/* ---- the cases */
const cases = [{ name: 'demo', song: demoSong(), sec: 20 }];
const FUZZ = +(process.env.FUZZ || 150);
for (let i = 0; i < FUZZ; i++) cases.push({ name: 'fuzz' + i, song: fuzzSong(), sec: 8 });
if (process.env.AT2_MODULES) {
  const files = cp.execSync(`find ${process.env.AT2_MODULES} -name '*.a2m'`).toString().trim().split('\n').filter(Boolean);
  for (const f of files) { try { cases.push({ name: path.basename(f), song: X.importA2M(new Uint8Array(fs.readFileSync(f))).song, sec: 20 }); } catch (e) {} }
}

const fmyFail = []; let fmyOK = 0, fmyBig = 0;
const devKind = {}, devFirst = [], arenaFail = [], arenaBytes = [];
let arenaOK = 0;
let exactOK = 0, writes = 0, devDiff = 0, devLines = 0, devBadCases = 0;
const fails = [];
for (const k of cases) {
  const sc = script(k.song, k.sec), sb = path.join(OUT, 'song.bin'), ss = path.join(OUT, 'script.txt');
  fs.writeFileSync(sb, songBin(k.song)); fs.writeFileSync(ss, sc.join('\n') + '\n');
  const js = runJS(k.song, sc);
  const ex = cp.execFileSync(BIN.exact, [sb, ss], { maxBuffer: 1 << 30 }).toString();
  writes += js.split('\n').length;
  if (ex === js) exactOK++;
  else { const a = js.split('\n'), b = ex.split('\n'); let i = 0; while (a[i] === b[i]) i++;
    fails.push(`${k.name}: line ${i + 1}: js "${a[i]}" c "${b[i]}" (before: "${a[i - 1]}")`);
    if (process.argv.includes('--keep')) { fs.writeFileSync(path.join(OUT, k.name + '.js.log'), js); fs.writeFileSync(path.join(OUT, k.name + '.c.log'), ex); fs.copyFileSync(sb, path.join(OUT, k.name + '.bin')); fs.copyFileSync(ss, path.join(OUT, k.name + '.txt')); } }
  const ar = cp.spawnSync(BIN.exact, ['-a', sb, ss], { maxBuffer: 1 << 30 });
  if (ar.stdout.toString() === js) arenaOK++; else arenaFail.push(k.name + ' ' + ar.stderr.toString().trim());
  const ab = +(/arena (\d+)/.exec(ar.stderr.toString()) || [0, 0])[1]; arenaBytes.push([ab, k.name]);
  { /* the song as an FMY1 file (web/songfile.js), read by the C sf_read: the same writes; sf_write gives the same bytes back,
     * and fmyRead(bytes) written again too */
    const fw = fmyWrite(k.song), fb = path.join(OUT, 'song.fmy'), fo = path.join(OUT, 'song.out.fmy');
    if (fw.bytes.length > 16 * 3840 - 64) fmyBig++;
    fs.writeFileSync(fb, fw.bytes);
    const r = cp.spawnSync(BIN.fmy, ['-f', fb, ss], { maxBuffer: 1 << 30, env: { ...process.env, FMY_OUT: fo } });
    const again = fmyWrite(fmyRead(fw.bytes)).bytes;
    const same = fs.existsSync(fo) && Buffer.compare(fs.readFileSync(fo), Buffer.from(fw.bytes)) === 0;
    if (fw.warn.length) fmyFail.push(k.name + ' cut: ' + fw.warn.join(', '));
    else if (r.stdout.toString() !== js) fmyFail.push(k.name + ' log differs ' + r.stderr.toString().trim());
    else if (!same) fmyFail.push(k.name + ' C sf_write bytes differ');
    else if (Buffer.compare(Buffer.from(again), Buffer.from(fw.bytes))) fmyFail.push(k.name + ' fmyRead/fmyWrite bytes differ');
    else fmyOK++;
    try { fs.unlinkSync(fo); } catch (e) {}
  }
  const dv = cp.execFileSync(BIN.dev, [sb, ss], { maxBuffer: 1 << 30 }).toString();
  if (dv !== js) { devBadCases++; const a = js.split('\n'), b = dv.split('\n'); devLines += a.length;
    if (process.argv.includes('--keep')) { let i = 0; while (a[i] === b[i]) i++; devFirst.push(`${k.name}: line ${i + 1}: js "${a[i]}" dev "${b[i]}" (before: "${a[i - 1]}")`);
      fs.writeFileSync(path.join(OUT, k.name + '.js.log'), js); fs.writeFileSync(path.join(OUT, k.name + '.dev.log'), dv); fs.copyFileSync(sb, path.join(OUT, k.name + '.bin')); fs.copyFileSync(ss, path.join(OUT, k.name + '.txt')); }
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { devDiff++;
      const x = (a[i] || '').split(' '), y = (b[i] || '').split(' ');
      const kind = x[0] !== 'W' || y[0] !== 'W' || x[1] !== y[1] || x[2] !== y[2] ? 'shifted' : `${(parseInt(x[2], 16) & 0xF0).toString(16)}h ±${Math.abs(parseInt(x[3], 16) - parseInt(y[3], 16))}`;
      devKind[kind] = (devKind[kind] || 0) + 1; } }
}
console.log(`exact (double): ${exactOK}/${cases.length} songs identical, ${writes} log lines`);
fails.slice(0, 10).forEach(f => console.log('  ' + f));
arenaBytes.sort((x, y) => y[0] - x[0]);
console.log(`arena (songmem.c): ${arenaOK}/${cases.length} songs identical; bytes: largest ${arenaBytes.slice(0, 3).map(x => x[0] + ' ' + x[1]).join(', ')}`);
arenaFail.slice(0, 5).forEach(f => console.log('  ' + f));
console.log(`FMY1 (web/songfile.js -> C sf_read): ${fmyOK}/${cases.length} songs identical (C sf_write and fmyRead give the same bytes)${fmyBig ? `; ${fmyBig} bigger than a slot` : ''}`);
fmyFail.slice(0, 8).forEach(f => console.log('  ' + f));
console.log(`device (float): ${cases.length - devBadCases}/${cases.length} songs identical; in the others ${devDiff} of ${devLines} lines differ`, devKind);
devFirst.slice(0, 12).forEach(f => console.log('  ' + f));
if (exactOK !== cases.length || arenaOK !== cases.length || fmyOK !== cases.length) process.exit(1);
