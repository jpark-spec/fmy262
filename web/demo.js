function OP(mult, tl, ar, dr, sl, rr, ws, egt, x) {
  return Object.assign({ am: 0, vib: 0, egt, ksr: 0, mult, ksl: 0, tl, ar, dr, sl, rr, ws }, x || {});
}
function defaultInstruments() {
  return [
    { name: 'KICK', fb: 0, con: 0, pan: 1, op: [OP(1, 28, 15, 10, 15, 15, 0, 0), OP(1, 0, 15, 7, 15, 9, 0, 0)] },
    { name: 'SNARE', fb: 7, con: 0, pan: 1, op: [OP(15, 0, 15, 9, 15, 12, 0, 0), OP(1, 2, 15, 9, 15, 10, 0, 0)] },
    { name: 'HAT', fb: 7, con: 0, pan: 1, op: [OP(15, 0, 15, 10, 15, 13, 0, 0), OP(7, 0, 15, 10, 15, 12, 0, 0)] },
    { name: 'BASS', fb: 5, con: 0, pan: 1, op: [OP(1, 20, 15, 5, 4, 7, 0, 1, { ksl: 1 }), OP(1, 0, 15, 4, 2, 8, 0, 1)] },
    { name: 'PAD', fb: 0, con: 1, pan: 1, op: [OP(1, 8, 7, 2, 2, 5, 0, 1, { vib: 1 }), OP(2, 12, 6, 2, 2, 5, 1, 1, { vib: 1 })] },
    { name: 'E.PIANO', fb: 3, con: 0, pan: 0, op: [OP(1, 26, 15, 6, 12, 6, 0, 0, { ksr: 1 }), OP(1, 0, 15, 3, 15, 6, 0, 0)] },
    { name: 'LEAD', fb: 4, con: 0, pan: 1, op: [OP(1, 24, 14, 1, 1, 5, 1, 1, { vib: 1 }), OP(1, 0, 13, 1, 1, 6, 0, 1, { vib: 1 })] },
    { name: 'BELL', fb: 0, con: 0, pan: 2, op: [OP(7, 30, 15, 4, 15, 4, 0, 0), OP(2, 0, 15, 3, 15, 4, 0, 0)] },
  ];
}
function emptyPattern(rows) {
  const p = []; for (let r = 0; r < rows; r++) { const l = []; for (let c = 0; c < 20; c++) l.push([-1, 0, -1, 0, -1, 0]); p.push(l); } return p;
}
/* an empty song: the "New" of the side panel and the file page (OCT+), the FM-1's too (ui2c: its FMY1 bytes) */
function newSong() {
  return normSong(Object.assign({ name: 'NEW', bpm: 125, speed: 6, rows: 64, order: [0], patterns: [emptyPattern(64)], inst: defaultInstruments() }, defaultTables()));
}
function demoSong() {
  const rows = 64, S = Object.assign({ name: 'DEMO', bpm: 125, speed: 6, rows, order: [0, 1, 1, 0], patterns: [], inst: defaultInstruments() }, defaultTables());
  S.inst[6].vibT = 2; S.inst[7].arpT = 3;
  const set = (p, r, c, n, i, v, fx, fv) => { const e = []; if (v !== undefined && v >= 0) e.push(12, v); if (fx !== undefined) e.push(fx, fv || 0); while (e.length < 4) e.push(-1, 0); S.patterns[p][r][c] = [n, i, ...e]; };
  const roots = [45, 41, 36, 43];
  const pads = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]];
  const arps = [[69, 0x37], [65, 0x47], [72, 0x47], [67, 0x47]];
  for (let p = 0; p < 2; p++) {
    S.patterns.push(emptyPattern(rows));
    for (let b = 0; b < 4; b++) { const o = b * 16;
      [0, 8, 10].forEach(r => set(p, o + r, 0, 50, 1, 63, 2, 0x30));
      [4, 12].forEach(r => set(p, o + r, 1, 60, 2, 56));
      for (let r = 0; r < 16; r += 2) set(p, o + r, 2, 84, 3, r % 4 ? 44 : 30);
      for (let r = 0; r < 16; r += 2) set(p, o + r, 3, roots[b] + (r % 4 ? 12 : 0), 4, 58);
      pads[b].forEach((n, k) => set(p, o, 4 + k, n, 5, 44));
      set(p, o, 7, arps[b][0], 6, 50, 0, arps[b][1]); set(p, o + 8, 7, arps[b][0], 6, 46, 0, arps[b][1]);
    }
  }
  set(0, 0, 15, -1, 0, -1, 15, 6);
  const lead = [[0, 76], [6, 72], [8, 74], [12, 76], [16, 77], [22, 76], [24, 72], [28, 69], [32, 67], [36, 72], [40, 76], [44, 79], [48, 74], [52, 71], [56, 74], [60, -2]];
  lead.forEach(([r, n]) => set(1, r, 8, n, n < 0 ? 0 : 7, n < 0 ? -1 : 54));
  [[0, 88], [16, 84], [32, 88], [48, 86]].forEach(([r, n]) => set(1, r, 9, n, 8, 44));
  return normSong(S);
}
const ARP_SHAPES = [['MAJOR', [0, 4, 7]], ['MINOR', [0, 3, 7]], ['MAJ7', [0, 4, 7, 11]], ['MIN7', [0, 3, 7, 10]], ['SUS4', [0, 5, 7]], ['DIM', [0, 3, 6]], ['POWER', [0, 7, 12]], ['OCTAVE', [0, 12]], ['TRILL', [0, 2]], ['CHIP RISE', [0, 4, 7, 12, 16, 19, 24]], ['DROP', [24, 12, 7, 0]]];
const VIB_SHAPES = [['SINE', [0, 3, 6, 8, 6, 3, 0, -3, -6, -8, -6, -3], 0], ['WIDE SINE', [0, 12, 22, 28, 22, 12, 0, -12, -22, -28, -22, -12], 0], ['DELAYED', [0, 3, 6, 8, 6, 3, 0, -3, -6, -8, -6, -3], 12], ['TRIANGLE', [0, 4, 8, 4, 0, -4, -8, -4], 0], ['SAW', [8, 6, 4, 2, 0, -2, -4, -6, -8], 0], ['SQUARE', [8, 8, 8, -8, -8, -8], 0], ['BEND UP', [-32, -24, -16, -8, -4, 0], 0], ['WOBBLE', [0, 16, 0, -16], 0]];
function blankTable(kind) { return { name: '', len: 1, spd: 1, loop: -1, delay: 0, data: Array(16).fill(0) }; }
function shapeTable(kind, k) { const t = blankTable(kind); const sh = kind === 'arp' ? ARP_SHAPES[k] : VIB_SHAPES[k];
  sh[1].forEach((v, i) => t.data[i] = v); t.len = sh[1].length; t.name = sh[0]; t.loop = kind === 'arp' && k === 10 ? -1 : 0; if (kind === 'vib') t.delay = sh[2]; return t; }
function defaultTables() {
  const arp = [], vib = [];
  for (let i = 0; i < 16; i++) { arp.push(i < 4 ? shapeTable('arp', [0, 1, 6, 9][i]) : blankTable('arp')); vib.push(i < 3 ? shapeTable('vib', [0, 2, 1][i]) : blankTable('vib')); }
  return { arp, vib };
}
// cells: [note, ins, fx1, fx1val, fx2, fx2val] (AT2 layout). Older 5-field cells [note, ins, vol, fx, val] are converted: vol → C (set volume)
function cellV2(c) { if (c.length >= 6) return c; const e = []; if (c[3] >= 0) e.push(c[3], c[4] || 0); if (c[2] >= 0) e.push(12, c[2]); while (e.length < 4) e.push(-1, 0); return [c[0], c[1], ...e]; }
// follow AT2 order jumps (80h+n) to the position that really plays
function orderPos(order, k) { for (let g = 0; g < 128 && order[k] >= 0x80; g++) k = Math.min(order[k] - 0x80, order.length - 1); return order[k] >= 0x80 ? 0 : k; }
// AT2 tFM_INST_DATA: 11 register bytes of an instrument (FM register macros store one per step)
function insBytes(ins) { const [m, c] = ins.op, r20 = p => p.am << 7 | p.vib << 6 | p.egt << 5 | p.ksr << 4 | p.mult;
  return [r20(m), r20(c), m.ksl << 6 | m.tl, c.ksl << 6 | c.tl, m.ar << 4 | m.dr, c.ar << 4 | c.dr, m.sl << 4 | m.rr, c.sl << 4 | c.rr, m.ws, c.ws, ins.fb << 1 | ins.con]; }
function blankFmm() { return { len: 0, lb: 0, ll: 0, ko: 0, steps: [], dis: Array(28).fill(false) }; }
function normSong(s) {
  s.patterns = s.patterns.map(P => P && P.map(l => { const L = l.map(cellV2); while (L.length < 20) L.push([-1, 0, -1, 0, -1, 0]); return L; }));
  if (!s.four) s.four = 0; s.perc = !!s.perc; if (!s.mspd) s.mspd = 1;
  if (!Array.isArray(s.arp) || !Array.isArray(s.vib)) { const t = defaultTables(); s.arp = t.arp; s.vib = t.vib; }
  if (s.opl !== 2) s.opl = 3; if (s.gvol === undefined) s.gvol = 63; if (s.vtab === undefined) s.vtab = 0;
  s.inst.forEach(i => { if (i.arpT === undefined) i.arpT = 0; if (i.vibT === undefined) i.vibT = 0; if (i.ft === undefined) i.ft = 0; });
  return s;
}
