/* Reality AdLib Tracker modules (.RAD, versions 1.0 and 2.1) into a song (the web side: the prototype's and the
 * workbench's import; the FM-1 never reads RAD). Written from the format as Reality documents it and as its
 * replayer behaves (AdPlug's rad2.cpp, based on Reality's own); no code of either is here.
 *
 * RAD has 9 channels. A channel is an OPL3 4-op pair in the registers (first channel 0/1/2/100h/101h/102h, second
 * one 3 higher; channels 7..9: 6/7/8 and 106h..108h), exactly as FMY262's pair tracks are, so each RAD channel gets
 * two tracks: A = the pair's second OPL channel (a 2-op sound plays there), B = the first.
 *  - 2-op instruments (algorithms 0, 1) play on A.
 *  - 4-op algorithms 2, 3 on channels 1..6: a 4OP pair (A holds the tail half, B the head, as FMY262's 4OP
 *    instruments N, N+1). A channel with them is a 4-op pair for the whole song, so its 2-op instruments become
 *    4-op ones with the unused operators silent (the same sound), and algorithms 4..6 the closest connection.
 *  - otherwise algorithms 2..6 are, as RAD plays them, two 2-op voices: A and B both get the note.
 * Riffs (R, T: tracks that play beside the song at their own speed; and an instrument's own riff) have no
 * counterpart, so the song is played through here, tick by tick as RAD does, and what everything plays lands on
 * the rows: one pattern per position played (the same ones shared), and a riff's line between two rows with a note
 * delay. What cannot be said in two effect columns, or in AT2's effects, is counted in the warnings. */

const RADK = { LINES: 64, CH: 9, PORT_UP: 1, PORT_DN: 2, TONE: 3, TONE_VOL: 5, VSLIDE: 10, SETVOL: 12, JUMP: 13, SPEED: 15,
  IGNORE: 18, MULT: 22, RIFF: 27, TRANS: 29, FEEDBACK: 30, VOLUME: 31 };

/* the file: header, instruments, order, tracks (100), riffs (10 x 9); a track = 64 lines, each null or its notes
 * [{ c, note (0 none, 1..12 C#..C, 15 off), oct, inst, retrig, fx, p }] */
function radParse(bytes) {
  const d = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), n = d.length;
  const bad = m => { throw new Error('RAD: ' + m); };
  if (n < 18 || String.fromCharCode(...d.subarray(0, 16)) !== 'RAD by REALiTY!!') bad('NOT A RAD FILE');
  const ver = d[16] === 0x10 ? 1 : d[16] === 0x21 ? 2 : bad('ONLY VERSIONS 1.0 AND 2.1 (THIS IS ' + (d[16] >> 4) + '.' + (d[16] & 15) + ')');
  let p = 17; const at = k => (p + k < n ? d[p + k] : bad('CUT SHORT'));
  const flags = at(0); p++;
  const R = { ver, speed: flags & 31, bpm: 125, slow: !!(flags & 0x40), desc: '', ins: [], order: [], tracks: [], riffs: [] };
  if (ver === 2 && flags & 0x20) { R.bpm = at(0) | at(1) << 8; p += 2; }
  if (ver === 2 || flags & 0x80) { let s = ''; for (let c; (c = at(0)); p++) s += c === 1 ? '\n' : c < 32 ? ' '.repeat(c) : String.fromCharCode(c); p++; R.desc = s; }
  for (;;) { const num = at(0); p++; if (!num) break; if (num > 127) bad('BAD INSTRUMENT');
    const I = { name: '', alg: 0, pan: [0, 0], fb: [0, 0], det: 0, rspd: 0, vol: 64, ops: [[0, 63, 0, 0xF0, 0], [0, 63, 0, 0xF0, 0], [0, 63, 0, 0xF0, 0], [0, 63, 0, 0xF0, 0]], riff: null };
    if (ver === 2) {
      const nl = at(0); p++; for (let k = 0; k < nl; k++) I.name += String.fromCharCode(at(k)); p += nl;
      const a = at(0); p++; I.alg = a & 7; I.pan = [a >> 3 & 3, a >> 5 & 3];
      if (I.alg < 7) { const f = at(0); I.fb = [f & 15, f >> 4]; I.det = at(1) >> 4; I.rspd = at(1) & 15; I.vol = at(2); p += 3;
        for (let o = 0; o < 4; o++) { I.ops[o] = [at(0), at(1), at(2), at(3), at(4)]; p += 5; } }
      else p += 6;                                   /* (a MIDI instrument: not for the chip) */
      if (a & 0x80) { const sz = at(0) | at(1) << 8; p += 2; if (p + sz > n) bad('CUT SHORT'); I.riff = radTrack(d, p, p + sz, 2, 'iriff'); p += sz; }
    } else {
      const s = [...Array(11)].map((_, k) => at(k)); p += 11;
      I.alg = s[8] & 1; I.fb = [s[8] >> 1 & 7, 0];
      I.ops[0] = [s[0], s[2], s[4], s[6], s[9]]; I.ops[1] = [s[1], s[3], s[5], s[7], s[10]];
    }
    I.fb = I.fb.map(v => v & 7); R.ins[num] = I; }
  const ol = at(0); p++; if (ol > 128) bad('ORDER LIST TOO LONG');
  for (let k = 0; k < ol; k++) R.order.push(at(k)); p += ol;
  if (ver === 2) {
    for (;;) { const t = at(0); p++; if (t >= 100) break; const sz = at(0) | at(1) << 8; p += 2; if (p + sz > n) bad('CUT SHORT'); R.tracks[t] = radTrack(d, p, p + sz, 2, 'pat'); p += sz; }
    for (;;) { if (p >= n) break; const id = d[p++], rn = id >> 4, ch = id & 15; if (rn >= 10 || ch > 9 || !ch) break;
      const sz = at(0) | at(1) << 8; p += 2; if (p + sz > n) bad('CUT SHORT'); (R.riffs[rn] = R.riffs[rn] || [])[ch - 1] = radTrack(d, p, p + sz, 2, 'criff'); p += sz; }
  } else for (let t = 0; t < 32; t++) { const o = at(0) | at(1) << 8; p += 2; if (o) { if (o >= n) bad('CUT SHORT'); R.tracks[t] = radTrack(d, o, n, 1, 'pat'); } }
  return R;
}
/* one track's lines (kind: 'pat' all channels a line, 'criff' one note a line, 'iriff' all its columns a line) */
function radTrack(d, p, end, ver, kind) {
  const L = [], at = k => (p + k < end ? d[p + k] : (() => { throw new Error('RAD: CUT SHORT TRACK'); })());
  while (p < end) {
    const lid = at(0); p++; const line = lid & 127; if (line >= 64) throw new Error('RAD: BAD LINE');
    const notes = [];
    for (;;) {
      const cid = at(0); p++; const e = { c: cid & 15, note: 0, oct: 0, inst: 0, retrig: false, fx: 0, p: 0 }; let nb = 0;
      if (ver === 2) {
        if (cid & 0x40) { nb = at(0); p++; e.retrig = !!(nb & 0x80); }
        if (cid & 0x20) { e.inst = at(0); p++; }
        if (cid & 0x10) { e.fx = at(0); e.p = at(1); p += 2; }
      } else {
        nb = at(0); const b = at(1); p += 2; e.inst = (nb & 0x80 ? 16 : 0) | b >> 4; e.fx = b & 15; if (e.fx) { e.p = at(0); p++; }
      }
      e.note = nb & 15; e.oct = nb >> 4 & 7; notes.push(e);
      if (kind === 'criff' || cid & 0x80) break;
    }
    L[line] = notes;
    if (lid & 0x80) break;
  }
  return L;
}

/* the song, played through: every channel's notes and effects at the tick they happen, with where that is (the
 * position played, its row, the ticks into the row) */
function radPlay(R, warn) {
  const K = RADK, ev = [], played = [], seen = new Map(), MAXT = 200000;
  const ch = [...Array(9)].map(() => ({ inst: 0, last: 0, keyed: false, bounce: false, riff: null, iriff: null }));
  let speed = Math.max(1, R.speed || 6), cnt = 1, ord = 0, line = 0, jump = -1, loopTo = 0, ent = 0, pi = -1, row = 0, rowT = 0, t = 0;
  let where = null;                                   /* (position, row, delay) of what plays now */
  const startOrder = () => {
    if (ord >= R.order.length) ord = 0;
    if (R.order[ord] >= 0x80) ord = R.order[ord] & 127;   /* (one jump: RAD does not follow a second) */
    if (seen.has(ord)) { loopTo = seen.get(ord); return false; }
    seen.set(ord, played.length); played.push({ ord, pat: R.order[ord] & 127, from: line, speed: [] }); pi = played.length - 1; return true;
  };
  const transpose = (e, tn, to) => { if (e.note < 1 || e.note > 12) return e; e = Object.assign({}, e);
    if (to !== 3) e.oct = Math.max(0, Math.min(7, e.oct + to - 3));
    if (tn !== 12) { e.note += tn - 12; if (e.note < 1) { e.note += 12; if (e.oct > 0) e.oct--; else e.note = 1; } } return e; };
  const unpack = (e, holder) => { const x = Object.assign({}, e); if (x.retrig) x.inst = holder.last; if (e.inst) holder.last = e.inst; return x; };
  const emit = (c, src, kind, a) => ev.push(Object.assign({ c, src, kind, pi: where[0], row: where[1], dly: where[2], t }, a));
  const startRiff = (c, R0, lines, spd, e, isT) => { const r = { lines, line: 0, speed: spd, cnt: 1, last: 0, tn: 12, to: 3, start: lines };
    let tr = false; if (isT && e.note >= 1 && e.note <= 12) { r.tn = e.note; r.to = e.oct; tr = true; } return [r, tr]; };
  function playNote(c, e, src, op) {
    const C = ch[c]; if (ent >= 8) return; ent++;
    try {
      if (e.fx === K.TONE) { emit(c, src, 'fx', { fx: 3, p: e.p, note: e.note >= 1 && e.note <= 12 ? 12 * (e.oct + 1) + e.note : -1 }); return; }
      let transposing = false, loaded = false;
      if (e.inst > 0) { const I = R.ins[e.inst];
        if (I && I.alg < 7) { const old = C.inst; C.inst = e.inst; loaded = true; C.bounce = true;
          emit(c, src, 'inst', { inst: e.inst });
          if (src !== 'iriff' || e.inst !== old) {
            if (I.riff && I.rspd > 0) { const [r, tr] = startRiff(c, R, I.riff, I.rspd, e, true); C.iriff = r; transposing = tr; tickRiff(c, r, false); }
            else C.iriff = null; }
        } else { C.inst = 0; if (I && I.alg === 7) warn.add('MIDI INSTRUMENTS LEFT OUT'); } }
      if (e.fx === K.RIFF || e.fx === K.TRANS) {
        const tk = Math.floor(e.p / 10), cc = e.p % 10, lines = cc > 0 && R.riffs[tk] && R.riffs[tk][cc - 1];
        if (lines) { const [r, tr] = startRiff(c, R, lines, speed, e, e.fx === K.TRANS); C.riff = r; if (tr) transposing = true; tickRiff(c, r, true); }
        else C.riff = null; }
      if (!transposing && e.note > 0) {
        if (e.note === 15) { C.keyed = false; C.bounce = false; emit(c, src, 'note', { note: -2 }); }
        else if (e.note <= 12) { const m = 12 * (e.oct + 1) + e.note;
          if (C.inst && C.bounce) { C.keyed = true; C.bounce = false; emit(c, src, 'note', { note: m, inst: C.inst, fresh: loaded }); }
          else if (C.keyed) emit(c, src, 'note', { note: m, legato: true });   /* (RAD: no instrument, no new key-on: the pitch only) */
        } }
      switch (e.fx) {
        case K.SETVOL: emit(c, src, 'fx', { fx: 12, p: Math.min(64, e.p) }); break;
        case K.SPEED: if (src === 'main') { if (e.p) { speed = e.p; cnt = e.p; emit(c, src, 'fx', { fx: 15, p: e.p }); } }
          else { const r = src === 'riff' ? C.riff : C.iriff; if (r && e.p) { r.speed = e.p; r.cnt = e.p; } } break;
        case K.PORT_UP: case K.PORT_DN: if (e.p) emit(c, src, 'fx', { fx: e.fx, p: e.p }); break;
        case K.VSLIDE: case K.TONE_VOL: emit(c, src, 'fx', { fx: e.fx === K.VSLIDE ? 10 : 5, p: e.p }); break;
        case K.JUMP: if (e.p < 64 && src === 'main') { jump = e.p; emit(c, src, 'fx', { fx: 13, p: e.p }); } break;
        case K.MULT: case K.VOLUME: case K.FEEDBACK: if (src === 'iriff') emit(c, src, 'op', { fx: e.fx, p: e.p, op }); break;
      }
    } finally { ent--; }
  }
  function tickRiff(c, r, chanRiff) {
    if (!r.cnt) return; if (--r.cnt > 0) return; r.cnt = r.speed;
    const ln = r.line++; if (r.line >= 64) r.cnt = 0;
    const L = r.lines[ln], C = ch[c];
    if (L) {
      if (chanRiff) { const e = transpose(unpack(L[0], r), r.tn, r.to); playNote(c, e, 'riff', 0); if (C.riff !== r) return; }
      else { for (const x of L) { let e = unpack(x, r); if (e.fx !== RADK.IGNORE) e = transpose(e, r.tn, r.to); playNote(c, e, 'iriff', x.c > 0 ? (x.c - 1) & 3 : 0); if (C.iriff !== r) return; } }
    }
    const nx = r.lines[r.line]; if (nx && nx[0].fx === RADK.JUMP && nx[0].p < 64) r.line = nx[0].p;
  }
  if (!startOrder()) return { ev, played, loopTo: 0 };
  for (; t < MAXT; t++) {
    const fires = cnt - 1 <= 0;
    where = fires ? [pi, line, 0] : [pi, row, t - rowT];
    for (let c = 0; c < 9; c++) { const C = ch[c]; if (C.iriff) tickRiff(c, C.iriff, false); if (C.riff) tickRiff(c, C.riff, true); }
    if (--cnt > 0) continue;
    cnt = speed; jump = -1; row = line; rowT = t; where = [pi, row, 0];
    played[pi].speed[row] = speed;
    const P = R.tracks[played[pi].pat], L = P && P[line];
    if (L) for (const e of L) { if (e.c < 9) playNote(e.c, unpack(e, ch[e.c]), 'main', 0); }
    played[pi].speed[row] = speed;                    /* (an F on the row counts from this row) */
    line++;
    if (line >= 64 || jump >= 0) { line = jump >= 0 ? jump : 0; ord++;
      if (!startOrder()) break; }
  }
  if (t >= MAXT) warn.add('SONG TOO LONG: CUT');
  return { ev, played, loopTo };
}

/* a RAD file? (its 16-byte signature) */
function isRAD(d) { return d.length >= 18 && String.fromCharCode(...d.subarray(0, 16)) === 'RAD by REALiTY!!'; }

/* RAD into a song: { song, warn } as importA2M gives */
function importRAD(bytes) {
  const R = radParse(bytes), W = new Set();
  const { ev, played, loopTo } = radPlay(R, W);
  if (!played.length) throw new Error('RAD: NOTHING TO PLAY');
  /* which channels are 4-op pairs: 1..6 with algorithm 2 or 3 played */
  const PAIR = [0, 2, 4, 9, 11, 13], TA = [0, 2, 4, 9, 11, 13, 6, 8, 16], TB = [1, 3, 5, 10, 12, 14, 7, 15, 17];
  const is4 = [...Array(9)].map((_, c) => R.ver === 2 && c < 6 && ev.some(e => e.c === c && e.kind === 'inst' && [2, 3].includes(R.ins[e.inst].alg)));
  /* instruments: each RAD one as it is needed, per kind ('2' one 2-op, 'S' two 2-op voices, '4' a 4-op pair) */
  const inst = [], made = new Map();
  const OPF = b => ({ am: b[0] >> 7 & 1, vib: b[0] >> 6 & 1, egt: b[0] >> 5 & 1, ksr: b[0] >> 4 & 1, mult: b[0] & 15, ksl: b[1] >> 6, tl: b[1] & 63, ar: b[2] >> 4, dr: b[2] & 15, sl: b[3] >> 4, rr: b[3] & 15, ws: b[4] & 7 });
  const SIL = [0, 63, 0, 0xF0, 0], PAN = [1, 2, 0, 1];
  /* detune (F-number steps, taken at F-number 512) as cents. RAD's note table sits 9.8 cents below equal
   temperament, as AT2's does; the engine's A4 (437.52 Hz) is already that, so nothing more is added */
  const cents = f => Math.max(-99, Math.min(99, Math.round(1200 * Math.log2((512 + f) / 512))));
  const nm = (I, k) => ((I.name || '').replace(/[^\x20-\x7e]/g, '?').trim().toUpperCase().slice(0, 11) || 'RAD ' + k.toString(16).toUpperCase().padStart(2, '0'));
  const mk = (I, k, mod, car, fb, con, pan, ft) => ({ name: nm(I, k), fb, con, pan: PAN[pan], ft, arpT: 0, vibT: 0, pv: 0, op: [OPF(mod), OPF(car)] });
  function variant(k, kind) {
    const key = k + kind; if (made.has(key)) return made.get(key);
    const I = R.ins[k], O = I.ops, a = I.alg, dA = (I.det + 1) >> 1, dB = I.det >> 1; let n;
    if (inst.length + (kind === '2' ? 1 : 2) > 255) { W.add('MORE THAN 255 INSTRUMENTS: SOME LEFT OUT'); return 0; }
    if (kind === '2') { n = inst.length + 1; inst.push(mk(I, k, O[1], O[0], I.fb[0], a === 1 ? 1 : 0, I.pan[0], cents(dA))); }
    else if (kind === 'S') { n = inst.length + 1;
      inst.push(mk(I, k, O[1], O[0], I.fb[0], a === 1 || a === 6 ? 1 : 0, I.pan[0], cents(dA)));
      inst.push(mk(I, k, O[3], O[2], I.fb[1], a === 3 || a === 5 || a === 6 ? 1 : 0, I.pan[1], cents(-dB))); }
    else { /* a 4-op pair: N = the tail (A: OPL ops 3, 4), N+1 = the head (B: ops 1, 2); connection = (N.con << 1) | (N+1).con */
      /* slots: head = [op1 (modulator slot of the first channel), op2], tail = [op3, op4]; hf = the head's feedback
       * (the chip uses only that one in 4-op mode) */
      let tail, head, tc, hc, hf = I.fb[1], ft = cents(0);
      if (a === 2) { tail = [O[1], O[0]]; head = [O[3], O[2]]; tc = 0; hc = 0; ft = cents(-dB); }
      else if (a === 3) { tail = [O[1], O[0]]; head = [O[3], O[2]]; tc = 0; hc = 1; ft = cents(-dB); }
      else if (a === 0) { head = [O[1], O[0]]; tail = [SIL, SIL]; tc = 1; hc = 0; hf = I.fb[0]; ft = cents(dA); }   /* FM-AM, the tail silent */
      else if (a === 1) { head = [O[1], SIL]; tail = [SIL, O[0]]; tc = 1; hc = 1; hf = I.fb[0]; ft = cents(dA); }   /* AM-AM: op1 + op4 */
      else if (a === 4) { head = [O[3], O[2]]; tail = [O[1], O[0]]; tc = 1; hc = 0; W.add('ALGORITHM 4 ON A 4-OP CHANNEL: ONE FEEDBACK LOST'); }
      else if (a === 5) { head = [O[3], O[1]]; tail = [O[0], O[2]]; tc = 1; hc = 1; W.add('ALGORITHM 5 ON A 4-OP CHANNEL: ONE FEEDBACK LOST'); }
      else { /* 6: four carriers; AM-AM has three (op1, op3, op4): the quietest left out */
        const q = [0, 1, 2, 3].sort((x, y) => (O[y][1] & 63) - (O[x][1] & 63))[0], r = [3, 2, 1, 0].filter(i => i !== q);
        head = [O[r[0]], SIL]; tail = [O[r[1]], O[r[2]]]; tc = 1; hc = 1; hf = r[0] === 3 ? I.fb[1] : r[0] === 1 ? I.fb[0] : 0;
        W.add('ALGORITHM 6 ON A 4-OP CHANNEL: 3 OF 4 OPERATORS'); }
      n = inst.length + 1;
      inst.push(Object.assign(mk(I, k, tail[0], tail[1], a < 2 ? 0 : I.fb[0], tc, I.pan[0], ft), { four: true }));
      inst.push(mk(I, k, head[0], head[1], hf, hc, a < 2 ? I.pan[0] : I.pan[1], ft)); }
    made.set(key, n); return n;
  }
  const kindOf = (c, k) => { const a = R.ins[k].alg; return is4[c] ? '4' : a >= 2 ? 'S' : '2'; };
  /* the patterns: one a position played */
  const pats = played.map(() => emptyPattern(64)), extra = played.map(() => []);
  let lost = 0, late = 0, clash = 0;
  const cur = [...Array(9)].map(() => ({ kind: '2', k: 0 }));
  const groups = new Map();                           /* position/row/channel -> its events, in order */
  for (const e of ev) { const g = e.pi + ':' + e.row + ':' + e.c; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(e); }
  const keys = [...groups.keys()].sort((x, y) => { const a = x.split(':').map(Number), b = y.split(':').map(Number); return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]; });
  const vol63 = v => Math.min(63, Math.round(v * 63 / 64));
  for (const g of keys) {
    const E = groups.get(g), { pi, row, c } = E[0], P = pats[pi], A = P[row][TA[c]], B = P[row][TB[c]];
    let note = null, ins = 0, dly = 0, legato = false, cut = 0;
    const fx = [];                                    /* [priority, f, v, pitch/volume (both voices)] */
    for (const e of E) {
      if (e.kind === 'inst') { const kd = kindOf(c, e.inst); cur[c] = { kind: kd, k: e.inst }; }
      else if (e.kind === 'note') {
        if (note !== null && e.dly !== dly) { if (e.note === -2 && note >= 0 && e.dly > dly && e.dly < 16) cut = e.dly; else clash++; continue; }   /* (a key-off later in the row: note cut) */
        if (note !== null && note >= 0 && e.legato) { note = e.note; continue; }   /* (a pitch change after a key-on in the same tick: the key-on stays) */
        note = e.note; dly = e.dly; legato = !!e.legato; ins = e.inst ? variant(e.inst, cur[c].kind) : 0;
        if (e.inst && R.ins[e.inst].vol < 64) fx.push([4, 12, vol63(R.ins[e.inst].vol), 1]);
      } else if (e.kind === 'fx') { const pr = e.src === 'main' ? 0 : e.src === 'riff' ? 2 : 5;
        if (e.fx === 3) { if (e.note >= 0) { if (note === null) { note = e.note; dly = e.dly; } } fx.push([pr, 3, e.p, 1]); }
        else if (e.fx === 12) fx.push([pr, 12, vol63(e.p), 1]);
        else if (e.fx === 10 || e.fx === 5) { let v = e.p >= 50 ? e.p - 50 : -e.p; if (Math.abs(v) > 15) { W.add('VOLUME SLIDES ABOVE 15 A TICK: CUT TO 15'); v = Math.sign(v) * 15; }
          fx.push([pr, e.fx, v > 0 ? v << 4 : -v, 1]); }
        else if (e.fx === 1 || e.fx === 2) fx.push([pr, e.fx, e.p, 1]);
        else if (e.fx === 15) fx.push([pr, 15, Math.min(31, e.p), 0]);
        else if (e.fx === 13) fx.push([pr, 13, e.p, 0]);
      } else if (e.kind === 'op') {
        if (e.fx === RADK.VOLUME) { const which = e.op; /* RAD op 1 = A's carrier, 2 = A's modulator, 3, 4 the same on B */
          if (which < 2 || cur[c].kind === 'S') fx.push([5, which & 1 ? 9 : 18, Math.min(63, e.p & 63), which < 2 ? 'A' : 'B']);
          W.add('INSTRUMENT RIFF VOLUMES (V): AS MODULATOR / CARRIER VOLUME'); }
        else if (e.fx === RADK.FEEDBACK) W.add('INSTRUMENT RIFF FEEDBACK (U) LEFT OUT');
        else W.add('INSTRUMENT RIFF MULTIPLIERS (M) LEFT OUT');
      }
    }
    if (note === -2 && dly) { if (dly < 16) { fx.push([1, 36, 0x30 | dly, 1]); note = null; } else late++; }   /* a late key-off: note cut (ZC?) */
    else if (note !== null && dly) { if (dly < 16) fx.push([1, 36, 0x20 | dly, 1]); else { late++; } }
    if (note !== null && note >= 0 && legato) { fx.push([3, 3, 255, 1]); }
    if (cut) fx.push([1, 36, 0x30 | cut, 1]);
    const two = cur[c].kind === 'S';
    if (note !== null) { A[0] = note; if (ins) A[1] = ins; if (two) { B[0] = note; if (ins) B[1] = ins + 1; } }
    fx.sort((x, y) => x[0] - y[0]);
    const put = (cell, f, v) => { if (cell[2] < 0) { cell[2] = f; cell[3] = v; return true; } if (cell[4] < 0) { cell[4] = f; cell[5] = v; return true; } return false; };
    for (const [, f, v, both] of fx) {
      if (both === 'B') { if (!put(two ? B : A, f, v)) lost++; continue; }
      if (both === 'A') { if (!put(A, f, v)) lost++; continue; }
      if (!put(A, f, v)) lost++; else if (two && both && !put(B, f, v)) lost++;
    }
  }
  /* the same patterns once */
  const uniq = [], idx = new Map(), order = [];
  pats.forEach((P, k) => { const s = JSON.stringify(P); if (!idx.has(s)) { idx.set(s, uniq.length); uniq.push(P); } order.push(idx.get(s)); });
  if (uniq.length > 128) { W.add('MORE THAN 128 PATTERNS: CUT'); }
  const ord = order.slice(0, 127).map(v => Math.min(127, v));
  if (loopTo > 0 && loopTo < ord.length) ord.push(0x80 + loopTo);
  if (lost) W.add(lost + ' EFFECTS DID NOT FIT IN TWO COLUMNS');
  if (late) W.add(late + ' RIFF NOTES MORE THAN 15 TICKS INTO A ROW: ON THE ROW');
  if (clash) W.add(clash + ' NOTES IN THE SAME ROW AND CHANNEL: THE FIRST KEPT');
  if (R.slow) W.add('SLOW-TIMER TUNE (18.2 HZ): BPM 46');
  if (played.length < R.order.length) { /* (positions never reached are not in the song) */ }
  let four = 0; is4.forEach((v, c) => { if (v) four |= 1 << c; });
  if (!inst.length) inst.push({ name: 'EMPTY', fb: 0, con: 0, pan: 1, ft: 0, op: [OPF(SIL), OPF(SIL)] });
  const name = (R.desc.split('\n').find(l => l.trim()) || 'RAD').trim().toUpperCase().replace(/[^\x20-\x7e]/g, '?').replace(/^[\s"'*=_-]+|[\s"'*=_-]+$/g, '').slice(0, 11) || 'RAD';
  const bpm = R.slow ? 46 : R.bpm;
  if (bpm > 255) W.add('BPM ' + bpm + ': 255');
  const song = Object.assign({ name, bpm: Math.max(32, Math.min(255, bpm)), speed: Math.max(1, Math.min(31, R.speed || 6)), rows: 64, order: ord,
    patterns: uniq.slice(0, 128), inst, lfo: 0, perc: false, mspd: 1, four, opl: 3, gvol: 63 }, defaultTables());
  return { song: normSong(song), ver: R.ver, warn: [...W] };
}
