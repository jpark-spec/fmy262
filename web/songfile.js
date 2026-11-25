/* FMY262's song file "FMY1" (firmware/ui/songfile.h has the format): the same bytes as the C sf_write, read as sf_read
 * does. For the workbench page (A2M <-> the FM-1's slots) and tests/t42 (JS-written files played by the C engine).
 *   fmyWrite(song) -> { bytes: Uint8Array, warn: [...] }   (what the FM-1 cannot keep is cut, and said in warn)
 *   fmyRead(bytes) -> song (normSong's shape); throws on a file that is not a song */
const FMY_ROWS_MIN = 16, FMY_ROWS_MAX = 256, FMY_PATS = 128, FMY_INST = 255, FMY_ORDERS = 128, FMY_ROOM = 16 * 3840 - 64;
const FMY_OPK = ['am', 'vib', 'egt', 'ksr', 'mult', 'ksl', 'tl', 'ar', 'dr', 'sl', 'rr', 'ws'];
/* a name as the FM-1 shows it: its font's characters, upper case */
function fmyName(s, n) { return String(s || '').toUpperCase().replace(/[^\x20-\x5f]/g, '?').slice(0, n); }

function fmyWrite(s) {
  const b = [], warn = [];
  const u8 = v => b.push(v & 255), u16 = v => { u8(v); u8(v >> 8); };
  const str = (x, n) => { const t = fmyName(x, n); for (let i = 0; i < n; i++) u8(i < t.length ? t.charCodeAt(i) : 0); };
  const rows = Math.max(FMY_ROWS_MIN, Math.min(FMY_ROWS_MAX, s.rows | 0));
  if (rows !== s.rows) warn.push(`rows ${s.rows} -> ${rows}`);
  'FMY1'.split('').forEach(c => u8(c.charCodeAt(0)));
  u8(s.vdir ? 2 : 1);   /* version 2 = one more head byte (vdir); a song without it stays version 1 */
  str(s.name, 20);
  u16(rows);
  [s.bpm, s.speed, s.lfo || 0, s.opl === 2 ? 2 : 3, s.perc ? 1 : 0, s.four || 0, s.gvol === undefined ? 63 : s.gvol, s.vtab || 0, s.mspd || 1].forEach(u8);
  if (s.vdir) u8(1);
  let order = s.order.slice(0, FMY_ORDERS);
  if (!order.length) order = [0];
  if (order.length < s.order.length) warn.push(`order ${s.order.length} positions -> ${FMY_ORDERS}`);
  u16(order.length); order.forEach(u8);
  for (const T of [s.arp, s.vib]) for (let i = 0; i < 16; i++) {
    const t = T[i] || { len: 0, spd: 1, delay: 0, loop: -1, data: [] };
    [Math.min(16, t.len | 0), t.spd, t.delay | 0, t.loop].forEach(u8);
    for (let j = 0; j < 16; j++) u8(t.data[j] | 0);
  }
  for (const T of [s.arp, s.vib]) for (let i = 0; i < 16; i++) str(T[i] && T[i].name, 11);
  const inst = s.inst.slice(0, FMY_INST);
  if (inst.length < s.inst.length) warn.push(`instruments ${s.inst.length} -> ${FMY_INST}`);
  u8(inst.length);
  inst.forEach(I => {
    I.op.forEach(o => FMY_OPK.forEach(k => u8(o[k] | 0)));
    [I.fb, I.con, I.pan, I.ft || 0, I.arpT || 0, I.vibT || 0, I.four ? 1 : 0].forEach(u8);
    str(I.name, 11);
    const M = I.fmm;
    u8(M ? 1 : 0);
    if (M) {
      [M.len, M.lb, M.ll, M.ko].forEach(u8);
      for (let j = 0; j < 28; j++) u8(M.dis[j] ? 1 : 0);
      for (let j = 0; j < M.len; j++) { const st = M.steps[j]; for (let k = 0; k < 11; k++) u8(st.d[k]); u16(st.fs); u8(st.pan); u8(st.dur); }
    }
  });
  const pats = [];
  s.patterns.forEach((P, p) => { if (P && p < FMY_PATS) pats.push(p); });
  if (s.patterns.length > FMY_PATS && s.patterns.slice(FMY_PATS).some(Boolean)) warn.push(`patterns past ${FMY_PATS} left out`);
  u8(pats.length);
  for (const p of pats) {
    const P = s.patterns[p], cells = [];
    for (let r = 0; r < rows; r++) for (let t = 0; t < 20; t++) {
      const L = P[r] && P[r][t]; if (!L) continue;
      const f = (L[0] !== -1 || L[1] ? 32 : 0) | (L[2] >= 0 ? 64 : 0) | (L[4] >= 0 ? 128 : 0);
      if (f) cells.push([r, t, f, L]);
    }
    if (P.length > rows && P.slice(rows).some(l => l.some(L => L[0] !== -1 || L[1] || L[2] >= 0 || L[4] >= 0))) warn.push(`pattern ${p}: rows past ${rows} left out`);
    u8(p); u16(cells.length);
    for (const [r, t, f, L] of cells) {
      u8(r); u8(t | f);
      if (f & 32) { u8(L[0]); u8(L[1]); }
      if (f & 64) { u8(L[2]); u8(L[3]); }
      if (f & 128) { u8(L[4]); u8(L[5]); }
    }
  }
  if (b.length > FMY_ROOM) warn.push(`${b.length} bytes: a slot holds ${FMY_ROOM}`);
  return { bytes: Uint8Array.from(b), warn };
}

function fmyRead(bytes) {
  let o = 0;
  const bad = m => { throw new Error('not an FMY262 song: ' + m); };
  const u8 = () => { if (o >= bytes.length) bad('cut short'); return bytes[o++]; };
  const s8 = () => (u8() << 24) >> 24, u16 = () => u8() | u8() << 8, s16 = () => (u16() << 16) >> 16;
  const str = n => { let t = ''; for (let i = 0; i < n; i++) { const c = u8(); if (c && t.length === i) t += String.fromCharCode(c); } return t; };
  const range = (v, lo, hi, what) => { if (v < lo || v > hi) bad(`${what} ${v}`); return v; };
  if (String.fromCharCode(u8(), u8(), u8(), u8()) !== 'FMY1') bad('no FMY1 at the start');
  const ver = u8(); if (ver !== 1 && ver !== 2) bad('a newer version');
  const s = { name: str(20) };
  s.rows = range(u16(), FMY_ROWS_MIN, FMY_ROWS_MAX, 'rows');
  s.bpm = u8(); s.speed = u8(); s.lfo = u8(); s.opl = range(u8(), 2, 3, 'opl'); s.perc = !!u8(); s.four = u8();
  s.gvol = u8(); s.vtab = u8(); s.mspd = u8(); s.vdir = ver >= 2 ? range(u8(), 0, 1, 'vdir') : 0;
  const no = range(u16(), 1, FMY_ORDERS, 'order');
  s.order = []; for (let i = 0; i < no; i++) s.order.push(u8());
  const tab = () => { const t = { len: range(u8(), 0, 16, 'table length'), spd: u8(), delay: u8(), loop: s8(), data: [] }; for (let j = 0; j < 16; j++) t.data.push(s8()); return t; };
  s.arp = [...Array(16)].map(tab); s.vib = [...Array(16)].map(tab);
  for (const T of [s.arp, s.vib]) T.forEach(t => { t.name = str(11); });
  const ni = u8();
  s.inst = [];
  for (let k = 0; k < ni; k++) {
    const op = () => Object.fromEntries(FMY_OPK.map(key => [key, u8()]));
    const I = { op: [op(), op()] };
    I.fb = u8(); I.con = u8(); I.pan = u8(); I.ft = s8(); I.arpT = range(u8(), 0, 16, 'arp table'); I.vibT = range(u8(), 0, 16, 'vib table');
    I.four = !!u8();
    I.name = str(11);
    if (range(u8(), 0, 1, 'macro flag')) {
      const M = { len: u8(), lb: u8(), ll: u8(), ko: u8(), dis: [], steps: [] };
      for (let j = 0; j < 28; j++) M.dis.push(!!u8());
      for (let j = 0; j < M.len; j++) { const d = []; for (let k2 = 0; k2 < 11; k2++) d.push(u8()); M.steps.push({ d, fs: s16(), pan: u8(), dur: u8() }); }
      I.fmm = M;
    }
    s.inst.push(I);
  }
  const np = range(u8(), 0, FMY_PATS, 'patterns');
  s.patterns = [];
  for (let k = 0; k < np; k++) {
    const p = range(u8(), 0, FMY_PATS - 1, 'pattern'), n = u16();
    const P = emptyPattern(s.rows);
    let last = -1;
    for (let i = 0; i < n; i++) {
      const r = range(u8(), 0, s.rows - 1, 'row'), tf = u8(), t = range(tf & 31, 0, 19, 'track');
      if (r * 20 + t <= last) bad('cells out of order'); last = r * 20 + t;
      const L = P[r][t];
      if (tf & 32) { L[0] = s8(); L[1] = u8(); }
      if (tf & 64) { L[2] = range(s8(), -1, 47, 'effect'); L[3] = u8(); }
      if (tf & 128) { L[4] = range(s8(), -1, 47, 'effect'); L[5] = u8(); }
    }
    s.patterns[p] = P;
  }
  if (o !== bytes.length) bad('bytes after the end');
  return normSong(s);
}
