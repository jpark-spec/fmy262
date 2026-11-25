class Engine {
  /* Effect numbers follow Adlib Tracker II (ef_* in typcons1.inc). The per-row / per-tick split follows AT2's
     play_line + update_fine_effects (once per row), update_effects (every tick, row tick included) and
     update_extra_fine_effects (every 4th tick). Global commands (%, `, >, <, &6–&B) act on every channel; OPL2 mode plays channels 1–9 only. */
  constructor(sr, makeOPL, send) {
    this.sr = sr; this.send = send || (() => {});
    this.o = makeOPL(); this.o.opl_reset(sr);
    const w = this.w = (r, v) => this.o.opl_write_now(r, v);
    w(0x105, 1); w(0x104, 0); w(0x01, 0x20); w(0x08, 0); w(0xBD, 0); this.bd = 0;
    /* AT2 track → OPL register map (typcons1.inc _chmm_* / _chpm_*): n = channel, m = modulator slot, c = carrier slot */
    this.MM = { n: [3, 0, 4, 1, 5, 2, 6, 7, 8, 0x103, 0x100, 0x104, 0x101, 0x105, 0x102, 0x106, 0x107, 0x108, -1, -1],
      m: [8, 0, 9, 1, 10, 2, 16, 17, 18, 0x108, 0x100, 0x109, 0x101, 0x10a, 0x102, 0x110, 0x111, 0x112, -1, -1],
      c: [11, 3, 12, 4, 13, 5, 19, 20, 21, 0x10b, 0x103, 0x10c, 0x104, 0x10d, 0x105, 0x113, 0x114, 0x115, -1, -1] };
    this.PM = { n: [3, 0, 4, 1, 5, 2, 0x106, 0x107, 0x108, 0x103, 0x100, 0x104, 0x101, 0x105, 0x102, 6, 7, 8, 8, 7],
      m: [8, 0, 9, 1, 10, 2, 0x110, 0x111, 0x112, 0x108, 0x100, 0x109, 0x101, 0x10a, 0x102, 0x10, 0x14, 0x12, 0x15, 0x11],
      c: [11, 3, 12, 4, 13, 5, 0x113, 0x114, 0x115, 0x10b, 0x103, 0x10c, 0x104, 0x10d, 0x105, 0x13, -1, -1, -1, -1] };
    this.DRUM = [0x10, 0x08, 0x04, 0x02, 0x01]; /* tracks 16–20: BD SD TT CY HH key bits in BDh */
    this.HI4 = [0, 2, 4, 9, 11, 13]; this.perc = false; this.f4 = 0;
    this.ch = []; for (let c = 0; c < 20; c++) this.ch.push(this.fresh());
    this.song = null; this.playing = false; this.loop = false;
    this.ord = 0; this.row = 0; this.tick = 0; this.acc = 0; this.speed = 6; this.bpm = 125; this.spt = 4294967296; this.xf = 0; this.extra = 0; this.gvol = 63; this.gsl = []; this.tune = 0; this.opl3 = true; this.vsize = 32; this.vfac = 1;
    this.gain = 2.4;
    this.VT = []; this.speedTab(0);
  }
  fresh() { return { inst: 0, pitch: 60, base: 60, had: false, vbase: 60, fch: false, vol: 63, mvol: 63, e: [], on: false, pend: false, fn: 0, blk: 0, mute: false, patch: null, own: false,
    fxo: 0, vibo: 0, tro: 0, as: 0, a1: 0, a2: 0, fsl: 0, pspd: 0, vspd: 0, vdep: 0, vpos: 0, tspd: 0, tdep: 0, tpos: 0, rtc: 0, trp: 0, tmute: false,
    ftn: 0, mp: -1, md: 0, kol: false, zero: false, nd: -1, ndn: 0, nc: -1, ls: 0, lc: {}, vlock: false, plock: false, panOv: -1, vst: 0, arpOv: -1, vibOv: -1, ap: 0, ac: 0, vp: 0, vc: 0, vd: 0 }; }
  /* AT2 generate_custom_vibrato (` command / GLOBAL page): 0 default sine, 1..239 triangle scaled by v/16, 240..255 size and speed factor */
  speedTab(v) { const D = [0, 24, 49, 74, 97, 120, 141, 161, 180, 197, 212, 224, 235, 244, 250, 253, 255, 253, 250, 244, 235, 224, 212, 197, 180, 161, 141, 120, 97, 74, 49, 24], T = new Array(256).fill(0);
    this.vfac = 1; this.vsize = 32;
    if (!v) for (let i = 0; i < 256; i++) T[i] = D[i & 31];
    else if (v < 240) { const m = v / 16; for (let b = 0; b < 8; b++) { for (let i = 1; i <= 16; i++) T[b * 32 + i] = Math.round(i * m) & 255; for (let i = 17; i < 32; i++) T[b * 32 + i] = Math.round((32 - i) * m) & 255; } }
    else { const sz = [16, 16, 16, 16, 32, 32, 32, 32, 64, 64, 64, 64, 128, 128, 128, 128][v - 240], mb = Math.floor(256 / sz); this.vfac = (v - 240) % 4 + 1; this.vsize = 2 * sz;
      for (let b = 0; b < 128 / sz; b++) { for (let i = 1; i <= sz; i++) T[2 * sz * b + i] = Math.max(0, i * mb - 1); for (let i = sz + 1; i < 2 * sz; i++) T[2 * sz * b + i] = Math.max(0, (2 * sz - i) * mb - 1); } }
    this.VT = T; }
  insOf(c) { const s = this.ch[c]; return s.patch || (this.song && this.song.inst[s.inst - 1]); }
  own(c) { const s = this.ch[c]; if (!s.own) { const i = this.insOf(c); if (!i) return null; s.patch = JSON.parse(JSON.stringify(i)); s.own = true; } return s.patch; }
  regs(c) { const T = this.perc ? this.PM : this.MM; return { k: T.n[c], m: T.m[c], c: T.c[c] }; }
  /* track c's OPL channel 0..17 (bank 1 = 9..17), -1 none */
  trackChan(c) { const k = this.regs(c).k; if (k < 0 || (!this.opl3 && k >= 0x100)) return -1; return (k & 0xff) + (k & 0x100 ? 9 : 0); }
  drum(c) { return this.perc && c >= 15 ? c - 15 : -1; }
  active(c) { const r = this.regs(c); return r.k >= 0 && (this.opl3 || r.k < 0x100); }
  pairHi(c) { const p = this.HI4.indexOf(c); return p >= 0 && this.opl3 && (this.f4 >> p & 1) ? p : -1; }
  pairLo(c) { return this.pairHi(c - 1) >= 0; }
  fch(c) { return this.pairHi(c) >= 0 ? c + 1 : c; } /* 4-op: frequency and key-on live on the pair's first OPL channel (the lo track) */
  partner(c) { const lo = this.ch[c + 1], h = this.insOf(c), S = this.song; return lo.patch || (S && S.inst[lo.inst - 1]) || (h && h.four && S && S.inst[this.ch[c].inst]) || null; }
  opRegs(a, o) { this.w(0x20 + a, (o.am << 7) | (o.vib << 6) | (o.egt << 5) | (o.ksr << 4) | o.mult); this.w(0x60 + a, (o.ar << 4) | o.dr); this.w(0x80 + a, (o.sl << 4) | o.rr); this.w(0xE0 + a, o.ws); }
  loadInst(c) {
    const ins = this.insOf(c); if (!ins) return null;
    const r = this.regs(c), s = this.ch[c], pan = s.panOv >= 0 ? s.panOv : ins.pan, d = this.drum(c);
    if (r.k < 0) return ins;
    if (d > 0) { this.opRegs(r.m, ins.op[0]); this.setVol(c); return ins; } /* single-operator drum: the instrument's modulator */
    this.opRegs(r.m, ins.op[0]); this.opRegs(r.c, ins.op[1]);
    this.w(0xC0 + r.k, [0x10, 0x30, 0x20][pan] | (ins.fb << 1) | ins.con);
    if (this.pairHi(c) >= 0) { const P = this.partner(c), q = this.regs(c + 1); if (P) { this.opRegs(q.m, P.op[0]); this.opRegs(q.c, P.op[1]); this.w(0xC0 + q.k, [0x10, 0x30, 0x20][pan] | (P.fb << 1) | P.con); } }
    this.setVol(c); return ins;
  }
  setVol(c) {
    const s = this.ch[c], ins = this.insOf(c); if (!ins) return;
    const r = this.regs(c), cl = v => Math.max(0, Math.min(63, v)); if (r.k < 0) return;
    const g = this.gvol / 63, cv = s.tmute ? 0 : cl(s.vol + s.tro) * g, mv = s.tmute && ins.con ? 0 : cl(s.mvol + (ins.con ? s.tro : 0)) * (ins.con ? g : 1);
    /* AT2 with volume scaling off (song.vdir): the volume is the operator's level itself (63 - TL), else it scales the
       instrument's TL. AT2's 4-op voices always scale */
    const dv = !!this.song.vdir, tl = (a, o, v, d) => this.w(0x40 + a, (o.ksl << 6) | Math.round(d ? 63 - v : 63 - (63 - o.tl) * v / 63));
    if (this.drum(c) > 0) return tl(r.m, ins.op[0], cv, dv);
    if (this.pairHi(c) >= 0) { const P = this.partner(c), q = this.regs(c + 1); if (P) { /* AT2 set_ins_volume_4op: carriers depend on (hi.con, lo.con) */
        const conn = (ins.con << 1) | P.con; tl(r.c, ins.op[1], cv); tl(r.m, ins.op[0], conn === 3 ? cv : 63); tl(q.c, P.op[1], conn === 2 ? cv : 63); tl(q.m, P.op[0], conn & 1 ? cv : 63);
        return; } }
    tl(r.m, ins.op[0], mv, dv); tl(r.c, ins.op[1], cv, dv);
  }
  /* a note's starting volume: full, or with AT2's volume scaling off the instrument's own levels */
  volInit(c) { const s = this.ch[c], ins = this.song && this.song.vdir && this.pairHi(c) < 0 && !this.pairLo(c) ? (s.patch && !s.own ? s.patch : this.song.inst[s.inst - 1]) : null;
    s.vol = ins ? 63 - ins.op[this.drum(c) > 0 ? 0 : 1].tl : 63; s.mvol = ins ? 63 - ins.op[0].tl : 63; }
  setFreq(c, semis) {
    const s = this.ch[c], ins = this.insOf(c);
    if (s.ftn) semis = this.slide(semis, Math.abs(s.ftn), Math.sign(s.ftn));
    const f = 437.52 * Math.pow(2, (semis + (((ins && ins.ft) || 0) + this.tune) / 100 - 69) / 12); /* A4 = the AdLib note table's (AT2, RAD): 9.81 cents below 440 Hz */
    let blk = 0, fn = s.zero ? 0 : Math.round(f * 1048576 / 49716);
    while (fn > 1023 && blk < 7) { blk++; fn = Math.round(f * Math.pow(2, 20 - blk) / 49716); }
    fn = Math.max(0, Math.min(1023, fn)); s.fn = fn; s.blk = blk;
    const r = this.regs(this.fch(c)); if (r.k < 0) return;
    this.w(0xA0 + r.k, fn & 255); this.w(0xB0 + r.k, (s.on && this.drum(c) < 0 ? 0x20 : 0) | (blk << 2) | (fn >> 8));
  }
  keyOff(c) { const s = this.ch[c], r = this.regs(this.fch(c)), d = this.drum(c); s.on = false; s.pend = false; if (r.k < 0) return;
    if (d >= 0) { this.bd &= ~this.DRUM[d]; this.w(0xBD, this.bd); } else this.w(0xB0 + r.k, (s.blk << 2) | (s.fn >> 8)); }
  trigger(c, note, keep) {
    const s = this.ch[c]; s.pitch = note; s.base = note; s.vbase = note; s.had = true; s.fxo = 0; s.vibo = 0; s.tro = 0; s.tmute = false; s.ftn = 0;
    s.ap = 0; s.ac = 0; s.vp = 0; s.vc = 0; s.vd = 0; s.arpOv = -1; s.vibOv = -1; if (!keep) { s.mp = 0; s.md = 0; s.zero = false; }
    if (!this.loadInst(c)) return false;
    this.keyOff(c); this.setFreq(c, note);
    if (!s.mute) s.pend = true; return !s.mute;
  }
  flush() { for (let c = 0; c < 20; c++) { const s = this.ch[c]; if (s.pend) { s.pend = false; s.on = true; const r = this.regs(this.fch(c)), d = this.drum(c); if (r.k < 0) continue;
      if (d >= 0) { this.bd |= this.DRUM[d]; this.w(0xBD, this.bd); } else this.w(0xB0 + r.k, 0x20 | (s.blk << 2) | (s.fn >> 8)); } } }
  /* samples per tick, sr * 5 / (2 bpm), in 32.32 fixed point: an integer below 2^53, so exact in a double and the same
     clock as firmware/engine (eng.c calcSpt) */
  calcSpt() { const n = this.sr * 5, d = 2 * this.bpm, q = Math.floor(n / d); let r = n % d; const f1 = Math.floor(r * 65536 / d); r = r * 65536 % d;
    this.spt = q * 4294967296 + f1 * 65536 + Math.floor(r * 65536 / d); }
  res(k) { const O = this.song.order; for (let g = 0; g < 128 && O[k] >= 0x80; g++) k = Math.min(O[k] - 0x80, O.length - 1); return O[k] >= 0x80 ? 0 : k; }
  pattern() { const p = this.song.order[this.ord]; return this.song.patterns[p]; }
  /* volume slide: AT2 volume_slide (up wins over down); target follows the Z/F 6·7·8 slide mode */
  vslide(c, up, dn) { const s = this.ch[c], ins = this.insOf(c), d = up ? up : -dn; if (!d) return;
    const car = s.vst !== 2, mod = s.vst >= 2 || (s.vst === 0 && ins && ins.con);
    if (car) s.vol = Math.max(0, Math.min(63, s.vol + d)); if (mod) s.mvol = Math.max(0, Math.min(63, s.mvol + d)); this.setVol(c); }
  setV(c, v, both) { const s = this.ch[c], ins = this.insOf(c); s.vol = Math.min(63, v); if (both || (ins && ins.con)) s.mvol = Math.min(63, v); this.setVol(c); }
  vibStep(c) { const s = this.ch[c]; if (!s.vspd || !s.vdep) return;
    s.vpos = (s.vpos + s.vspd * this.vfac) & 255; const amt = (s.vdep * this.VT[s.vpos & (this.vsize - 1)]) >> 7;
    s.vibo = this.slide(s.pitch, amt, s.vpos & this.vsize ? 1 : -1) - s.pitch; s.fch = true; }
  tremStep(c) { const s = this.ch[c]; if (!s.tspd || !s.tdep) return;
    s.tpos = (s.tpos + s.tspd * this.vfac) & 255; const amt = (s.tdep * this.VT[s.tpos & (this.vsize - 1)]) >> 7; s.tro = s.tpos & this.vsize ? amt : -amt; this.setVol(c); }
  gvolSet(v) { this.gvol = Math.max(0, Math.min(63, v)); for (let c = 0; c < 20; c++) this.setVol(c); }
  arpStep(c) { const s = this.ch[c]; s.fch = true; s.fxo = [0, s.a1, s.a2][s.as]; s.as = (s.as + 1) % 3; }
  porta(c) { const s = this.ch[c]; if (s.ptgt === undefined || !s.pspd) return; if (s.pitch !== s.ptgt) s.fch = true;
    if (s.pitch < s.ptgt) s.pitch = Math.min(s.ptgt, this.slide(s.pitch, s.pspd, 1)); else if (s.pitch > s.ptgt) s.pitch = Math.max(s.ptgt, this.slide(s.pitch, s.pspd, -1)); }
  pslide(c, v, dir) { const s = this.ch[c]; if (v) s.fch = true; if (v) s.pitch = Math.max(0, Math.min(127, this.slide(s.pitch, v, dir))); }
  /* FM register macro (AT2 macro_poll_proc): steps with duration, loop, key-off position; 28 columns can be disabled */
  fmMacro(c) { const s = this.ch[c], base = s.patch && !s.own ? s.patch : this.song && this.song.inst[s.inst - 1], M = base && base.fmm;
    if (!M || !M.len || s.mp < 0) return;
    if (s.md > 1) { s.md--; return; }
    const IDLE = 0xFFF, FIN = 0xFFFF, fin = s.kol ? IDLE : FIN; let p = s.mp;
    if (p <= M.len) { if (M.lb && M.ll) p = p === M.lb + M.ll - 1 ? M.lb : p < M.len ? p + 1 : fin; else p = p < M.len ? p + 1 : fin; } else p = fin;
    const on = s.on || s.pend;
    if (on && M.ko && p >= M.ko) p = IDLE; else if (!on && p !== 0 && M.ko && (p < M.ko || p === IDLE)) p = M.ko;
    s.mp = p; if (p === 0 || p === IDLE || p === FIN) return;
    const st = M.steps[p - 1]; if (!st) return; s.md = st.dur; if (!st.dur) return;
    const P = this.own(c), D = st.d, X = M.dis, en = j => !X[j]; if (!P) return;
    [0, 1].forEach(j => { const o = P.op[j], q = j * 12, a = D[j], kv = D[2 + j], ad = D[4 + j], sr = D[6 + j];
      if (en(q)) o.ar = ad >> 4; if (en(q + 1)) o.dr = ad & 15; if (en(q + 2)) o.sl = sr >> 4; if (en(q + 3)) o.rr = sr & 15; if (en(q + 4)) o.ws = D[8 + j] & 7;
      /* AT2 set_ins_volume from a macro level: the carrier's and (additive, or volume scaling off) the modulator's
         become the channel volume; an FM modulator's is its TL */
      if (en(q + 5)) { if (j) s.vol = 63 - (kv & 63); else if (this.song.vdir || P.con) s.mvol = 63 - (kv & 63); else o.tl = kv & 63; } if (en(q + 6)) o.ksl = kv >> 6; if (en(q + 7)) o.mult = a & 15; if (en(q + 8)) o.am = a >> 7; if (en(q + 9)) o.vib = a >> 6 & 1; if (en(q + 10)) o.ksr = a >> 4 & 1; if (en(q + 11)) o.egt = a >> 5 & 1; });
    if (en(24)) P.con = D[10] & 1; if (en(25)) P.fb = D[10] >> 1 & 7; if (en(27) && s.plock !== 1) s.panOv = [1, 0, 2][st.pan] ?? 1;
    this.loadInst(c);
    if (D[10] & 0x80) { this.trigger(c, s.base, true); }
    else if (D[10] & 0x40) { this.keyOff(c); s.pend = !s.mute; }
    else if (D[10] & 0x20) { s.zero = !s.zero; }
    if (en(26) && st.fs) this.pslide(c, Math.abs(st.fs), Math.sign(st.fs)); }
  setOp(c, j, k, v) { const p = this.own(c); if (!p) return; p.op[j][k] = v; this.loadInst(c); }
  doRow() {
    const pat = this.pattern(), trig = [];
    this.jump = -1; this.brk = -1; this.loopTo = -1; this.extra = 0; this.gsl = []; /* AT2 clears global slides every row */
    if (pat) { const line = pat[this.row];
      for (let c = 0; c < 20; c++) { let cell = line[c]; const s = this.ch[c]; if (!cell || !this.active(c) || this.pairLo(c)) continue; const prev = s.e.map(e => e[0]); s.ftn = 0;
        if (this.pairHi(c) >= 0 && line[c + 1]) { const lc = line[c + 1]; if (lc[1] > 0) { this.ch[c + 1].inst = lc[1]; this.ch[c + 1].patch = null; }
          /* a 4-op voice: the note and effects may sit on either track of the pair (AT2 allows both) */
          cell = [cell[0] !== -1 ? cell[0] : lc[0], cell[1], cell[2] >= 0 ? cell[2] : lc[2], cell[2] >= 0 ? cell[3] : lc[3], cell[4] >= 0 ? cell[4] : lc[4], cell[4] >= 0 ? cell[5] : lc[5]]; }
        s.fxo = 0; s.vibo = 0; if (s.tro) { s.tro = 0; this.setVol(c); }
        s.e = []; if (cell[2] >= 0) s.e.push([cell[2], cell[3]]); if (cell[4] >= 0) s.e.push([cell[4], cell[5]]);
        const has = f => s.e.find(e => e[0] === f), ext = (f, hi) => s.e.find(e => e[0] === f && e[1] >> 4 === hi);
        /* AT2: the vibrato and tremolo positions restart only on a row without such an effect, not on a new note */
        if (!s.e.some(([f]) => f === 4 || f === 6 || f === 17 || f === 43)) s.vpos = 0; if (!s.e.some(([f]) => f === 22 || f === 44)) s.tpos = 0;
        s.fineV = !!ext(35, 15) && (ext(35, 15)[1] & 15) === 13; s.fineT = !!ext(35, 15) && (ext(35, 15)[1] & 15) === 14;
        /* AT2 set_ins_data: an instrument number (with or without a note) resets the volume, unless locked on the same
           instrument; a bare note keeps it */
        let vr = false, tg = false; if (cell[1] > 0) { const same = s.inst === cell[1]; s.inst = cell[1]; if (!same) { s.patch = null; s.own = false; } if (!s.vlock || !same) { this.volInit(c); vr = true; } }
        const pe = has(3) || has(5) || has(16), nd = ext(36, 2);
        if (pe) { if (has(3) && has(3)[1]) s.pspd = has(3)[1]; if (cell[0] >= 0) s.ptgt = cell[0]; }
        if (cell[0] >= 0 && nd && (nd[1] & 15)) { s.nd = nd[1] & 15; s.ndn = cell[0]; }
        else if (cell[0] >= 0 && pe && (s.on || s.pend)) { /* tone portamento: glide, no retrigger */ }
        else if (cell[0] >= 0) { /* AT2: tone portamento after a key-off sounds the old note again and glides from there */
          const pk = !!pe && s.had; s.patch = null; s.own = false; tg = true; if (s.plock !== 1) s.panOv = -1; if (this.trigger(c, pk ? s.base : cell[0], pk)) trig.push(c); }
        else if (cell[0] === -2) this.keyOff(c);
        if (vr && !tg) this.loadInst(c);
        let noRestart = !!ext(35, 15) && (ext(35, 15)[1] & 15) === 15;
        for (const [f, v] of s.e) { const x = v >> 4, y = v & 15;
          switch (f) {
            case 0: case 42: if (!v) break; s.a1 = x; s.a2 = y; /* falls through */
            case 24: case 25: if (!prev.some(p => p === 0 || p === 42 || p === 24 || p === 25)) s.as = 0; break;
            case 1: case 2: case 7: case 8: s.fsl = v; break;
            case 4: case 43: if (x) s.vspd = x; if (y) s.vdep = y; break;
            case 22: case 44: if (x) s.tspd = x; if (y) s.tdep = y; break;
            case 9: s.mvol = Math.min(63, v); this.setVol(c); break;
            case 18: s.vol = Math.min(63, v); this.setVol(c); break;
            case 12: case 40: this.setV(c, v); break;
            case 11: this.jump = v; break;
            case 13: this.brk = v; break;
            case 15: if (v > 0) { if (v < 32) this.speed = v; else { this.bpm = v; this.calcSpt(); } } break;
            case 19: { const p = this.own(c); if (!p) break; if (x < 8) p.op[1].ws = x; if (y < 8) p.op[0].ws = y; this.loadInst(c); break; }
            case 21: if (v) { if (!prev.some(p => p === 21 || p === 26)) s.rtc = 1; } break;
            case 26: if (x) { if (!prev.some(p => p === 21 || p === 26)) s.rtc = 1; } break;
            case 23: if (x && y && !prev.includes(23)) { s.trp = 0; s.tmute = false; } break;
            case 38: s.arpOv = v; if (!noRestart) { s.ap = 0; s.ac = 0; } break;
            case 39: s.vibOv = v; if (!noRestart) { s.vp = 0; s.vc = 0; s.vd = 0; } break;
            case 35: this.extCmd(c, x, y, s.e); break;
            case 36:
              if (x === 0) this.extra = Math.max(this.extra, y); else if (x === 1) this.extra = Math.max(this.extra, this.speed * y);
              else if (x === 3) s.nc = y; else if (x === 4) s.ftn += y; else if (x === 5) s.ftn -= y; break;
            case 41: this.ext3(c, x, y); break;
            case 37: this.gvolSet(v); break;
            case 45: this.speedTab(v); break;
            case 46: case 47: for (let k = c; k < 20; k++) this.gsl[k] = [f === 46 ? 1 : -1, v]; s.fsl = v; break;
          } }
        /* once-per-row ("fine") effects: AT2 update_fine_effects */
        for (const [f, v] of s.e) { const x = v >> 4, y = v & 15;
          switch (f) {
            case 7: this.pslide(c, v, 1); break; case 8: this.pslide(c, v, -1); break;
            case 20: case 25: case 16: case 17: case 31: case 32: this.vslide(c, x, y); break;
            case 29: this.pslide(c, s.fsl, 1); break; case 30: this.pslide(c, s.fsl, -1); break;
            case 33: this.pslide(c, s.fsl, 1); this.vslide(c, x, y); break; case 34: this.pslide(c, s.fsl, -1); this.vslide(c, x, y); break;
            case 36: if (x === 8) this.gvolSet(this.gvol + y); else if (x === 9) this.gvolSet(this.gvol - y); break;
          }
          if (s.fineV && (f === 4 || f === 6 || f === 17)) this.vibStep(c);
          if (s.fineT && f === 22) this.tremStep(c); }
      } }
    this.send({ t: 'pos', ord: this.ord, row: this.row, trig });
  }
  extCmd(c, x, y, e) { const s = this.ch[c], ins = this.insOf(c);
    switch (x) {
      case 0: this.bd = y ? this.bd | 0x80 : this.bd & 0x7F; this.w(0xBD, this.bd); break;
      case 1: this.bd = y ? this.bd | 0x40 : this.bd & 0xBF; this.w(0xBD, this.bd); break;
      case 2: this.setOp(c, 0, 'ar', y); break; case 3: this.setOp(c, 0, 'dr', y); break; case 4: this.setOp(c, 0, 'sl', y); break; case 5: this.setOp(c, 0, 'rr', y); break;
      case 6: this.setOp(c, 1, 'ar', y); break; case 7: this.setOp(c, 1, 'dr', y); break; case 8: this.setOp(c, 1, 'sl', y); break; case 9: this.setOp(c, 1, 'rr', y); break;
      case 10: { const p = this.own(c); if (p) { p.fb = y & 7; this.loadInst(c); } break; }
      case 11: if (y <= 2) { s.panOv = [1, 0, 2][y]; this.loadInst(c); } break;
      case 12: case 13: { const k = this.ord + ':' + this.row;
        if (!y) { s.ls = this.row; break; }
        if (s.lc[k] === undefined) s.lc[k] = y;
        if (s.lc[k] > 0) { s.lc[k]--; this.loopTo = s.ls; } else delete s.lc[k]; break; }
      case 14: if (y === 4) { this.keyOff(c); s.pend = !s.mute; } else if (y === 0) s.kol = false; else if (y === 1) s.kol = true; break; /* restart envelope; macro key-off loop, porta key and 4-op locks have no effect here */
      case 15:
        if (y === 0) this.keyOff(c);
        else if (y === 1) { this.volInit(c); this.setVol(c); }
        else if (y === 2) s.vlock = true; else if (y === 3) s.vlock = false;
        else if (y === 6 || y === 7) { const both = e.some(q => q[0] === 35 && (q[1] === 0xF6 || q[1] === 0xF7) && q[1] !== (x << 4 | y)); s.vst = both ? 3 : y === 7 ? 1 : 2; }
        else if (y === 8) s.vst = 0;
        else if (y === 9) s.plock = 1; else if (y === 10) s.plock = 0;
        else if (y === 11) s.vibo = 0; else if (y === 12) { s.tro = 0; this.setVol(c); }
        break; }
  }
  ext3(c, x, y) { const p = this.own(c); if (!p) return; const j = x >= 7 ? 1 : 0, k = x >= 7 ? x - 6 : x;
    if (x === 0) p.con = y & 1;
    else if (k === 1) p.op[j].mult = y; else if (k === 2) p.op[j].ksl = y & 3; else if (k === 3) p.op[j].am = y & 1;
    else if (k === 4) p.op[j].vib = y & 1; else if (k === 5) p.op[j].ksr = y & 1; else if (k === 6) p.op[j].egt = y & 1;
    this.loadInst(c); }
  doFx(xf) {
    for (let c = 0; c < 20; c++) { const s = this.ch[c]; if (!this.active(c)) continue;
      if (!s.e.length && this.gsl[c]) this.pslide(c, this.gsl[c][1], this.gsl[c][0]);
      if (s.nd >= 0) { if (s.nd === 0) { s.nd = -1; s.patch = null; s.own = false; this.trigger(c, s.ndn); } else s.nd--; }
      if (s.nc >= 0) { if (s.nc === 0) { s.nc = -1; this.keyOff(c); } else s.nc--; }
      for (const [f, v] of s.e) { const x = v >> 4, y = v & 15;
        switch (f) {
          case 0: if (v) this.arpStep(c); break;
          case 24: this.vslide(c, x, y); this.arpStep(c); break;
          case 25: this.arpStep(c); break;
          case 1: this.pslide(c, v, 1); break; case 2: this.pslide(c, v, -1); break;
          case 3: case 16: this.porta(c); break;
          case 5: this.vslide(c, x, y); this.porta(c); break;
          case 4: case 17: if (!s.fineV) this.vibStep(c); break;
          case 6: this.vslide(c, x, y); if (!s.fineV) this.vibStep(c); break;
          case 10: this.vslide(c, x, y); break;
          case 22: if (!s.fineT) this.tremStep(c); break;
          case 27: this.pslide(c, s.fsl, 1); this.vslide(c, x, y); break;
          case 28: this.pslide(c, s.fsl, -1); this.vslide(c, x, y); break;
          case 29: case 30: this.vslide(c, x, y); break;
          case 31: this.pslide(c, s.fsl, 1); break; case 32: this.pslide(c, s.fsl, -1); break;
          case 21: if (v) { if (s.rtc >= v) { s.rtc = 0; this.trigger(c, s.base); } else s.rtc++; } break;
          case 26: if (x) { if (s.rtc >= x) { s.rtc = 0;
              if (y >= 1 && y <= 5) this.vslide(c, 0, [0, 1, 2, 4, 8, 16][y]); else if (y >= 9 && y <= 13) this.vslide(c, [0, 1, 2, 4, 8, 16][y - 8], 0);
              else if (y === 6) s.vol = Math.round(s.vol * 2 / 3); else if (y === 7) s.vol = Math.round(s.vol / 2);
              else if (y === 14) s.vol = Math.min(63, Math.round(s.vol * 3 / 2)); else if (y === 15) s.vol = Math.min(63, s.vol * 2);
              const keep = s.vol; this.trigger(c, s.base); s.vol = keep; this.setVol(c); } else s.rtc++; } break;
          case 36: if (x === 6) this.gvolSet(this.gvol + y); else if (x === 7) this.gvolSet(this.gvol - y); break;
          case 23: if (x && y) { /* tremor: x ticks on, y ticks off */
              if (s.trp >= 0) { if (s.trp + 1 <= x) s.trp++; else { s.tmute = true; s.trp = -1; this.setVol(c); } }
              else if (s.trp - 1 >= -y) s.trp--; else { s.tmute = false; s.trp = 1; this.setVol(c); } } break;
        }
        if (xf) switch (f) { /* extra fine: every 4th tick */
          case 42: this.arpStep(c); break;
          case 43: if (!s.fineV) this.vibStep(c); break;
          case 44: if (!s.fineT) this.tremStep(c); break;
          case 36: if (x === 10) this.gvolSet(this.gvol + y); else if (x === 11) this.gvolSet(this.gvol - y); else if (x === 12) this.vslide(c, y, 0); else if (x === 13) this.vslide(c, 0, y); else if (x === 14) this.pslide(c, y, 1); else if (x === 15) this.pslide(c, y, -1); break;
        } } }
  }
  slide(semis, v, dir) { /* AT2 calc_freq_shift_up/down: v F-number steps within the 0x156..0x2AE window */
    const f = 437.52 * Math.pow(2, (semis - 69) / 12); let blk = 0, fn = f * 1048576 / 49716;
    while (fn >= 0x2AE && blk < 7) { blk++; fn /= 2; }
    if (dir > 0) { fn += v; if (fn >= 0x2AE) { if (blk === 7) fn = 0x2AE; else { fn -= 0x158; blk++; } } }
    else { fn -= v; if (fn <= 0x156) { if (blk === 0) fn = 0x156; else { fn += 0x158; blk--; } } }
    return 69 + 12 * Math.log2(fn * 49716 / Math.pow(2, 20 - blk) / 437.52);
  }
  table(kind, n) { const L = this.song && this.song[kind]; return n > 0 && L ? L[n - 1] : null; }
  macroTick() {
    for (let c = 0; c < 20; c++) { const s = this.ch[c]; this.fmMacro(c); let fc = s.fch; s.fch = false; if (!s.on && !s.pend) continue;
      const ins = this.insOf(c); if (!ins) continue;
      const A = this.table('arp', s.arpOv >= 0 ? s.arpOv : ins.arpT), V = this.table('vib', s.vibOv >= 0 ? s.vibOv : ins.vibT);
      let off = 0;
      if (A && A.len > 0) { off += A.data[Math.min(s.ap, A.len - 1)] || 0; if (s.ac === 0) fc = true;
        if (++s.ac >= A.spd) { s.ac = 0; if (++s.ap >= A.len) s.ap = A.loop >= 0 && A.loop < A.len ? A.loop : A.len - 1; } }
      /* vibrato table (AT2 macro_poll_proc): steps are offsets from the frequency of the last note or pitch change
         (vbase). A pitch change by an effect restarts the table, and when a step lands the result becomes the
         channel's pitch, so a vibrato effect on top drifts the way it does in AT2. vp counts from 1, 0 = not started */
      if (V && V.len > 0) { if (fc) { s.vc = 0; s.vp = 0; s.vbase = s.pitch + s.fxo + s.vibo + off; }
        if (s.vc < V.spd - 1) s.vc++; else if (s.vd < V.delay) s.vd++;
        else { s.vc = 0; if (s.vp === V.len && V.loop >= 0 && V.loop < V.len) s.vp = V.loop + 1; else if (s.vp <= V.len) s.vp++;
          if (s.vp <= V.len) { s.pitch = s.vbase + (V.data[s.vp - 1] || 0) / 16 - s.fxo - off; s.vibo = 0; } } }
      if (!A && !V && !s.e.length && !s.vibo && !s.fxo && !s.ftn && s.mp < 0) continue;
      this.setFreq(c, s.pitch + s.fxo + s.vibo + off); }
  }
  doTick() {
    if (this.tick === 0) this.doRow();
    const xf = ++this.xf % 4 === 0;
    this.doFx(xf);
    for (let k = 0; k < (this.song.mspd || 1); k++) this.macroTick();
    if (++this.tick >= this.speed + this.extra) { this.tick = 0;
      const n = this.song.order.length;
      if (this.loopTo >= 0) this.row = this.loopTo; /* Z C/D pattern loop */
      else if (this.jump >= 0 || this.brk >= 0) { /* Bxx position jump, Dxx pattern break (row) */
        if (!this.loop) this.ord = this.res(this.jump >= 0 ? Math.min(this.jump, n - 1) : (this.ord + 1) % n);
        this.row = this.brk >= 0 ? Math.min(this.brk, this.song.rows - 1) : 0; }
      else if (++this.row >= this.song.rows) { this.row = 0; if (!this.loop) this.ord = this.res((this.ord + 1) % n); } }
  }
  applyGlobals() { const S = this.song, l = S.lfo || 0, o3 = S.opl !== 2, pc = !!S.perc, f4 = o3 ? (S.four || 0) & 63 : 0;
    if (o3 !== this.opl3 || pc !== this.perc || f4 !== this.f4) { this.silence(); this.opl3 = o3; this.perc = pc; this.f4 = f4; this.w(0x105, o3 ? 1 : 0); if (o3) this.w(0x104, f4); }
    this.bd = ((l >> 1) & 1) << 7 | (l & 1) << 6 | (pc ? 0x20 : 0); this.w(0xBD, this.bd); this.gvol = S.gvol === undefined ? 63 : S.gvol; this.speedTab(S.vtab || 0); for (let c = 0; c < 20; c++) this.setVol(c); }
  allOff() { for (let c = 0; c < 20; c++) this.keyOff(c); }
  /* stop: cut every voice at once (fast release + full attenuation), instead of letting release tails ring */
  silence() { for (let c = 0; c < 20; c++) { const r = this.regs(c), s = this.ch[c];
      for (const a of [r.m, r.c]) if (a >= 0) { this.w(0x80 + a, 0x0F); this.w(0x40 + a, 0x3F); }
      this.keyOff(c); s.nd = -1; s.nc = -1; s.e = []; } }
  handle(m) {
    if (m.t === 'song') { this.song = m.song; this.bpm = m.song.bpm; this.speed = m.song.speed; this.calcSpt(); this.applyGlobals(); }
    else if (m.t === 'tune') { this.tune = m.cents || 0; }
    else if (m.t === 'play') { this.silence(); for (let c = 0; c < 20; c++) { const mu = this.ch[c].mute; this.ch[c] = this.fresh(); this.ch[c].mute = mu; }
      this.applyGlobals(); this.gsl = [];
      this.ord = this.res(m.ord); this.row = m.row || 0; this.loop = !!m.loop; this.tick = 0; this.acc = this.spt; this.extra = 0;
      this.bpm = this.song.bpm; this.speed = this.song.speed; this.calcSpt(); this.playing = true; }
    else if (m.t === 'stop') { this.playing = false; this.silence(); }
    else if (m.t === 'on') { const I0 = m.patch || (this.song && this.song.inst[m.inst - 1]);
      if (I0 && I0.four && this.opl3 && this.pairHi(m.c) < 0) { /* preview a 4-op sound on the last pair */ this.f4 |= 32; this.w(0x104, this.f4); this.pmap = this.pmap || {}; this.pmap[m.c] = 13; m = Object.assign({}, m, { c: 13 }); this.ch[14].inst = 0; this.ch[14].patch = null; }
      else if (this.pmap) delete this.pmap[m.c];
      const s = this.ch[m.c]; s.mp = 0; s.md = 0; s.inst = m.inst; s.patch = m.patch || null; s.own = false; this.volInit(m.c); s.e = []; s.panOv = -1; this.trigger(m.c, m.note); }
    else if (m.t === 'off') this.keyOff(this.pmap && this.pmap[m.c] !== undefined ? this.pmap[m.c] : m.c);
    else if (m.t === 'scopeon') this.o.opl_scope_on(m.on ? 1 : 0);
    else if (m.t === 'scope') { /* the waveform screen: the latest n samples (22.05 kHz) of each asked track's OPL channel */
      const n = m.n || 448, d = m.tr.map(c => { const k = this.trackChan(c); if (k < 0) return null; return Array.from(new Int16Array(this.o.memory.buffer, this.o.opl_scope(k, n), n)); });
      this.send({ t: 'scope', tr: m.tr, d }); }
    else if (m.t === 'mute') { this.ch.forEach((s, i) => { s.mute = !!m.mute[i]; if (s.mute) this.keyOff(i); }); }
  }
  render(L, R, n) {
    let pos = 0;
    while (pos < n) { const k = Math.min(32, n - pos);
      this.flush();
      if (this.song) { this.acc += k * 4294967296; while (this.acc >= this.spt) { this.acc -= this.spt; this.playing ? this.doTick() : this.macroTick(); } }
      const p = this.o.opl_render(k), v = new Int16Array(this.o.memory.buffer, p, k * 2), g = this.gain / 32768;
      for (let i = 0; i < k; i++) { L[pos + i] = v[2 * i] * g; R[pos + i] = v[2 * i + 1] * g; }
      pos += k; }
  }
}
