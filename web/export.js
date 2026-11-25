/* ---- aPLib-style compressor in the variant AT2's APACK_decompress reads (no last-was-match state) ---- */
function aplibPack(src) {
  const n = src.length, out = []; let tagPos = -1, bitsLeft = 0, R0 = -1, lwm = 0;
  const putBit = b => { if (bitsLeft === 0) { tagPos = out.length; out.push(0); bitsLeft = 8; } bitsLeft--; if (b) out[tagPos] |= 1 << bitsLeft; };
  const putGamma = v => { let m = 1; while (m * 2 <= v) m *= 2; m >>= 1; while (m) { putBit(v & m ? 1 : 0); m >>= 1; putBit(m ? 1 : 0); } };
  if (!n) return new Uint8Array([0]);
  out.push(src[0]);
  const HB = 16, head = new Int32Array(1 << HB).fill(-1), prev = new Int32Array(n).fill(-1), MAXOFF = 65280, MAXLEN = 65535;
  const hash = i => ((src[i] << 8 ^ src[i + 1] << 4 ^ src[i + 2]) * 2654435761 >>> (32 - HB));
  const ins = i => { if (i + 2 < n) { const h = hash(i); prev[i] = head[h]; head[h] = i; } };
  ins(0);
  let i = 1;
  while (i < n) {
    let bestLen = 0, bestOff = 0;
    if (i + 2 < n) {
      let j = head[hash(i)], tries = 48;
      while (j >= 0 && tries-- > 0) { const off = i - j; if (off > MAXOFF) break;
        if (src[j] === src[i] && src[j + bestLen] === src[i + bestLen]) { let l = 0; while (i + l < n && l < MAXLEN && src[j + l] === src[i + l]) l++;
          if (l > bestLen) { bestLen = l; bestOff = off; } }
        j = prev[j]; }
    }
    if (R0 > 0 && i - R0 >= 0) { let l = 0; while (i + l < n && l < MAXLEN && src[i - R0 + l] === src[i + l]) l++; if (l >= 2 && l + 1 >= bestLen) { bestLen = l; bestOff = -1; } }
    const minLen = bestOff < 0 ? 2 : bestOff < 128 ? 4 : bestOff < 1280 ? 2 : bestOff < 32000 ? 3 : 4;
    if (bestOff < 0 && bestLen >= 2) {
      putBit(1); putBit(0); putGamma(2); putGamma(bestLen); lwm = 1;
    } else if (bestLen >= minLen && bestOff > 0) {
      putBit(1); putBit(0); putGamma((bestOff >> 8) + 3); out.push(bestOff & 255);
      putGamma(bestLen - (bestOff >= 32000 ? 1 : 0) - (bestOff >= 1280 ? 1 : 0) - (bestOff < 128 ? 2 : 0)); R0 = bestOff; lwm = 1;
    } else if (i >= 1 && bestLen >= 2 && bestLen <= 3 && bestOff > 0 && bestOff < 128) {
      bestLen = Math.min(bestLen, 3); putBit(1); putBit(1); putBit(0); out.push(bestOff << 1 | (bestLen - 2)); R0 = bestOff; lwm = 1;
    } else {
      bestLen = 1; const b = src[i]; let k = 0;
      if (b === 0) k = 0; else for (let o = 1; o <= 15 && o <= i; o++) if (src[i - o] === b) { k = o; break; }
      if (b === 0 || k) { putBit(1); putBit(1); putBit(1); for (let t = 3; t >= 0; t--) putBit(k >> t & 1); }
      else { putBit(0); out.push(b); }
      lwm = 0;
    }
    for (let t = 0; t < bestLen; t++) ins(i + t);
    i += bestLen;
  }
  putBit(1); putBit(1); putBit(0); out.push(0);
  return new Uint8Array(out);
}
function aplibUnpack(src, size) {
  const dst = new Uint8Array(size); let s = 0, d = 0, tag = 0, bits = 0, R0 = 0, lwm = 0;
  const bit = () => { if (!bits) { tag = src[s++]; bits = 8; } bits--; return tag >> bits & 1; };
  const gamma = () => { let r = 1; do { r = (r << 1) + bit(); } while (bit()); return r; };
  const copy = (off, len) => { for (let k = 0; k < len; k++, d++) dst[d] = dst[d - off]; };
  dst[d++] = src[s++];
  for (;;) {
    if (!bit()) { dst[d++] = src[s++]; lwm = 0; continue; }
    if (!bit()) { let off = gamma();
      if (off === 2) { copy(R0, gamma()); }
      else { off -= 3; off = off * 256 + src[s++]; let len = gamma(); if (off >= 32000) len++; if (off >= 1280) len++; if (off < 128) len += 2; copy(off, len); R0 = off; }
      lwm = 1; continue; }
    if (!bit()) { let off = src[s++]; const len = 2 + (off & 1); off >>= 1; if (!off) break; copy(off, len); R0 = off; lwm = 1; continue; }
    let off = 0; for (let t = 0; t < 4; t++) off = off * 2 + bit(); dst[d] = off ? dst[d - off] : 0; d++; lwm = 0;
  }
  return dst.subarray(0, d);
}
/* ---- CRC32 as AT2's Update32 (reflected table, no final xor) ---- */
const CRC_T = (() => { const t = new Int32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? c >>> 1 ^ 0xEDB88320 : c >>> 1; t[i] = c; } return t; })();
function crcUpd(buf, crc) { for (let i = 0; i < buf.length; i++) crc = CRC_T[(crc ^ buf[i]) & 255] ^ crc >>> 8; return crc >>> 0; }

/* ---- AT2 A2M v11 writer ---- */
const A2 = { SONG: 1138338, NAME: 43, INS: 14, REGT: 3831, MAC: 521, O_NAMES: 86, O_INS: 11051, O_IMAC: 14621, O_MAC: 991526, O_ORD: 1124381, O_TEMPO: 1124509, O_PLEN: 1124512, O_NTRK: 1124514, O_MSPD: 1124515, O_BPM: 1138335, O_RES: 1137311, O_DIS: 1130042, O_I4: 1137182, PAT: 245760 };
function putStr(b, off, s, max) { s = String(s).replace(/[^\x20-\x7e]/g, '?').slice(0, max); b[off] = s.length; for (let k = 0; k < s.length; k++) b[off + 1 + k] = s.charCodeAt(k); }
const at2Note = m => Math.max(1, Math.min(97, m - 11));
function a2mSongdata(song) {
  const b = new Uint8Array(A2.SONG);
  putStr(b, 0, song.name || 'FM-1 SONG', 42); putStr(b, 43, 'FM-1 OPL3 TRACKER', 42);
  song.inst.forEach((ins, k) => {
    putStr(b, A2.O_NAMES + k * A2.NAME, ins.name, 32);
    const o = A2.O_INS + k * A2.INS, [m, c] = ins.op, r20 = p => p.am << 7 | p.vib << 6 | p.egt << 5 | p.ksr << 4 | p.mult;
    b.set([r20(m), r20(c), m.ksl << 6 | m.tl, c.ksl << 6 | c.tl, m.ar << 4 | m.dr, c.ar << 4 | c.dr, m.sl << 4 | m.rr, c.sl << 4 | c.rr, m.ws, c.ws, ins.fb << 1 | ins.con], o);
    b[o + 11] = [1, 0, 2][ins.pan]; b[o + 12] = Math.round((ins.ft || 0) * 0.28) & 255;
    const mo = A2.O_IMAC + k * A2.REGT; b[mo + 4] = ins.arpT || 0; b[mo + 5] = ins.vibT || 0; b[o + 13] = ins.pv || 0;
    const M = ins.fmm; if (M && M.len) { b[mo] = M.len; b[mo + 1] = M.lb; b[mo + 2] = M.ll; b[mo + 3] = M.ko;
      M.steps.slice(0, M.len).forEach((s, i) => { const q = mo + 6 + i * 15; b.set(s.d, q); b[q + 11] = s.fs & 255; b[q + 12] = s.fs >> 8 & 255; b[q + 13] = s.pan; b[q + 14] = s.dur; });
      M.dis.forEach((v, j) => b[A2.O_DIS + k * 28 + j] = v ? 1 : 0); }
  });
  const f4 = song.inst.map((x, k) => x.four ? k + 1 : 0).filter(Boolean).slice(0, 128); b[A2.O_I4] = f4.length; f4.forEach((n, i) => b[A2.O_I4 + 1 + i] = n);
  for (let t = 0; t < 16; t++) {
    const mo = A2.O_MAC + t * A2.MAC, A = song.arp[t], V = song.vib[t];
    if (A && (A.len > 1 || A.data[0])) { b[mo] = A.len; b[mo + 1] = A.spd; if (A.loop >= 0) { b[mo + 2] = A.loop + 1; b[mo + 3] = A.len - A.loop; }
      for (let k = 0; k < A.len; k++) b[mo + 5 + k] = Math.max(0, Math.min(96, A.data[k])); }
    const vo = mo + 260;
    if (V && (V.len > 1 || V.data[0])) { b[vo] = V.len; b[vo + 1] = V.spd; b[vo + 2] = V.delay; if (V.loop >= 0) { b[vo + 3] = V.loop + 1; b[vo + 4] = V.len - V.loop; }
      /* AT2 vibrato macro values are offsets from the note's base frequency in F-number steps (0 = base) */
      for (let k = 0; k < V.len; k++) { const abs = V.data[k], v = Math.round(abs * 1.7);
        b[vo + 6 + k] = (abs === 0 ? 0 : v === 0 ? Math.sign(abs) : Math.max(-127, Math.min(127, v))) & 255; } }
  }
  for (let k = 0; k < 128; k++) b[A2.O_ORD + k] = k < song.order.length ? song.order[k] : 0x80;
  b[A2.O_TEMPO] = Math.max(1, Math.min(255, Math.round(song.bpm * 0.4))); b[A2.O_TEMPO + 1] = song.speed;
  b[A2.O_TEMPO + 2] = ((song.lfo || 0) >> 1 & 1) << 3 | ((song.lfo || 0) & 1) << 4 | (song.perc ? 0x40 : 0) | (song.vdir ? 0 : 0x80); /* bit 7: AT2 volume scaling (how FMY262 plays volumes unless vdir) */
  b[A2.O_PLEN] = song.rows & 255; b[A2.O_PLEN + 1] = song.rows >> 8; b[A2.O_NTRK] = song.perc ? 20 : song.opl === 2 ? 9 : 18; b[A2.O_NTRK + 3] = (song.four || 0) & 63; b[A2.O_MSPD] = Math.max(1, Math.min(8, song.mspd || 1));
  b[A2.O_BPM] = 4;
  /* FM-1 extras in reserved_data: exact values the A2M stores only approximately */
  const x = A2.O_RES; 'FM1X'.split('').forEach((ch, k) => b[x + k] = ch.charCodeAt(0)); b[x + 4] = 1; b[x + 5] = song.bpm;
  const crcI = crcUpd(b.subarray(A2.O_INS, A2.O_INS + 255 * A2.INS), 0xFFFFFFFF), crcM = crcUpd(b.subarray(A2.O_MAC, A2.O_MAC + 16 * A2.MAC), 0xFFFFFFFF);
  new DataView(b.buffer).setUint32(x + 6, crcI, true); new DataView(b.buffer).setUint32(x + 10, crcM, true);
  song.inst.slice(0, 64).forEach((ins, k) => b[x + 14 + k] = (ins.ft || 0) & 255);
  for (let t = 0; t < 16; t++) { const A = song.arp[t], V = song.vib[t];
    for (let k = 0; k < 16; k++) { b[x + 78 + t * 16 + k] = (A ? A.data[k] : 0) & 255; b[x + 334 + t * 16 + k] = (V ? V.data[k] : 0) & 255; }
    putStr(b, x + 590 + t * 10, A && A.name || '', 9); putStr(b, x + 750 + t * 10, V && V.name || '', 9); }
  b[x + 912] = 0xA5; b[x + 913] = song.opl === 2 ? 2 : 3; b[x + 914] = song.gvol === undefined ? 63 : song.gvol; b[x + 915] = song.vtab || 0; b[x + 916] = 0xA0 | (song.vdir ? 1 : 0);
  return b;
}
function a2mPatternBlock(song, blk) {
  const b = new Uint8Array(A2.PAT);
  for (let p = 0; p < 8; p++) { const P = song.patterns[blk * 8 + p]; if (!P) continue;
    for (let r = 0; r < Math.min(256, song.rows); r++) for (let c = 0; c < 20; c++) { const cl = P[r][c]; if (!cl) continue; const o = ((p * 20 + c) * 256 + r) * 6;
      if (cl[0] >= 0) b[o] = at2Note(cl[0]); else if (cl[0] === -2) b[o] = 0xFF; /* AT2: key off = BYTE_NULL */
      b[o + 1] = cl[1] || 0;
      const at2 = (f, v) => f < 0 || (f === 0 && !v) ? [0, 0] : f === 15 ? (v < 32 ? [15, v] : [14, Math.round(v * 0.4)]) : f === 12 ? [12, Math.max(0, Math.min(63, v))] : [f, v];
      [b[o + 2], b[o + 3]] = at2(cl[2], cl[3]); [b[o + 4], b[o + 5]] = at2(cl[4], cl[5]); } }
  return b;
}
function exportA2M(song) {
  const used = Math.max(0, ...song.order.filter(v => v < 0x80), ...song.patterns.map((p, k) => p ? k : 0));
  const patts = used + 1, nblk = Math.ceil(patts / 8);
  const b0 = aplibPack(a2mSongdata(song)), blocks = [];
  for (let k = 0; k < nblk; k++) blocks.push(aplibPack(a2mPatternBlock(song, k)));
  const hdr = new Uint8Array(84), dv = new DataView(hdr.buffer);
  '_A2module_'.split('').forEach((ch, k) => hdr[k] = ch.charCodeAt(0));
  hdr[14] = 11; hdr[15] = patts; dv.setUint32(16, b0.length, true); blocks.forEach((x, k) => dv.setUint32(20 + k * 4, x.length, true));
  let crc = 0xFFFFFFFF; crc = crcUpd(b0, crc); blocks.forEach(x => { crc = crcUpd(x, crc); });
  crc = crcUpd(hdr.subarray(16, 18), crc); for (let k = 0; k < 16; k++) crc = crcUpd(hdr.subarray(20 + k * 4, 22 + k * 4), crc);
  dv.setUint32(10, crc, true);
  const total = 84 + b0.length + blocks.reduce((a, x) => a + x.length, 0), out = new Uint8Array(total);
  out.set(hdr, 0); let p = 84; out.set(b0, p); p += b0.length; blocks.forEach(x => { out.set(x, p); p += x.length; });
  return out;
}
/* ---- minimal ZIP (stored) ---- */
function zipFiles(files) {
  const enc = new TextEncoder(), parts = [], cdir = []; let off = 0;
  const crcz = d => (crcUpd(d, 0xFFFFFFFF) ^ 0xFFFFFFFF) >>> 0;
  files.forEach(f => { const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crcz(data);
    const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, 0, true); lh.setUint16(12, 0x5821, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(14, 0x5821, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    cdir.push(new Uint8Array(ch.buffer), name); off += 30 + name.length + data.length; });
  const csize = cdir.reduce((a, x) => a + x.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, off, true);
  const all = parts.concat(cdir, [new Uint8Array(end.buffer)]), out = new Uint8Array(all.reduce((a, x) => a + x.length, 0)); let p = 0; all.forEach(x => { out.set(x, p); p += x.length; });
  return out;
}
/* ---- LZH decoder (port of AT2 adt2pack.pas LZH_decompress) ---- */
function lzhUnpack(src) {
  const NC = 255 + 256 + 2 - 2, NP = 15, NT = 19, CBIT = 16, TBIT = 15, PBIT = 14;
  const lt = new Uint16Array(2 * NC), rt = new Uint16Array(2 * NC), pTab = new Uint16Array(256), pLen = new Uint8Array(NT), cTab = new Uint16Array(4096), cLen = new Uint8Array(NC);
  let ii = 0; const insz = src.length;
  const ultra = src[ii++] !== 0; const total = src[ii] | src[ii + 1] << 8 | src[ii + 2] << 16 | src[ii + 3] << 24; ii += 4;
  const DIC = ultra ? 1 << 14 : 1 << 13, out = new Uint8Array(total >>> 0);
  let bitBuf = 0, sBuf = 0, bitCnt = 0, blockSize = 0, decCounter = 0, decPtr = 0, op = 0;
  const fill = n => { bitBuf = (bitBuf << n) & 0xFFFF;
    while (n > bitCnt) { n -= bitCnt; bitBuf = (bitBuf | (sBuf << n)) & 0xFFFF; sBuf = ii <= insz ? (src[ii] || 0) : 0; ii++; bitCnt = 8; }
    bitCnt -= n; bitBuf = (bitBuf | (sBuf >> bitCnt)) & 0xFFFF; };
  const getBits = n => { const v = bitBuf >> (16 - n); fill(n); return v; };
  function makeTable(nChar, bitLen, bits, table) {
    const count = new Uint16Array(17), weight = new Uint16Array(17), start = new Uint16Array(18);
    for (let i = 0; i < nChar; i++) count[bitLen[i]]++;
    start[1] = 0; for (let i = 1; i <= 16; i++) start[i + 1] = (start[i] + (count[i] << (16 - i))) & 0xFFFF;
    const jb = 16 - bits; for (let i = 1; i <= bits; i++) { start[i] >>= jb; weight[i] = 1 << (bits - i); }
    for (let i = bits + 1; i <= 16; i++) weight[i] = 1 << (16 - i);
    let i = start[bits + 1] >> jb;
    if (i !== 0) { const i2 = 1 << bits; if (i !== i2) { table.fill(0, i, i2); } }
    let avail = nChar; const mask = 1 << (15 - bits);
    for (let ch = 0; ch < nChar; ch++) { const len = bitLen[ch]; if (!len) continue;
      let i2 = start[len]; const next = i2 + weight[len];
      if (len <= bits) { for (let k = i2; k < next; k++) table[k] = ch; }
      else { let arr = table, ai = (i2 & 0xFFFF) >> jb, n = len - bits;
        while (n !== 0) { if (arr[ai] === 0) { rt[avail] = 0; lt[avail] = 0; arr[ai] = avail; avail++; }
          const node = arr[ai]; if (i2 & mask) { arr = rt; ai = node; } else { arr = lt; ai = node; }
          i2 = (i2 << 1) & 0xFFFF; n--; }
        arr[ai] = ch; }
      start[len] = next & 0xFFFF; }
  }
  function readPtrLen(nChar, nBit, iBit) {
    const bits = getBits(nBit);
    if (bits === 0) { const ch = getBits(nBit); pLen.fill(0); pTab.fill(ch); return; }
    let i = 0;
    while (i < bits) { let ch = bitBuf >> 13;
      if (ch === 7) { let m = 1 << 12; while (m & bitBuf) { m >>= 1; ch++; } }
      fill(ch < 7 ? 3 : ch - 3); pLen[i++] = ch;
      if (i === iBit) { let c = getBits(2) - 1; while (c >= 0) { pLen[i++] = 0; c--; } } }
    while (i < nChar) pLen[i++] = 0;
    makeTable(nChar, pLen, 8, pTab);
  }
  function readCharLen() {
    const bits = getBits(CBIT);
    if (bits === 0) { const ch = getBits(CBIT); cLen.fill(0); cTab.fill(ch); return; }
    let i = 0;
    while (i < bits) { let ch = pTab[bitBuf >> 8];
      if (ch >= NT) { let m = 1 << 7; do { ch = bitBuf & m ? rt[ch] : lt[ch]; m >>= 1; } while (ch >= NT); }
      fill(pLen[ch]);
      if (ch <= 2) { if (ch === 1) ch = 2 + getBits(4); else if (ch === 2) ch = 19 + getBits(CBIT); while (ch >= 0) { cLen[i++] = 0; ch--; } }
      else cLen[i++] = ch - 2; }
    while (i < NC) cLen[i++] = 0;
    makeTable(NC, cLen, 12, cTab);
  }
  function decodeChar() {
    if (blockSize === 0) { blockSize = getBits(16); readPtrLen(NT, TBIT, 3); readCharLen(); readPtrLen(NP, PBIT, -1); }
    blockSize = (blockSize - 1) & 0xFFFF;
    let ch = cTab[bitBuf >> 4];
    if (ch >= NC) { let m = 1 << 3; do { ch = bitBuf & m ? rt[ch] : lt[ch]; m >>= 1; } while (ch >= NC); }
    fill(cLen[ch]); return ch;
  }
  function decodePtr() {
    let p = pTab[bitBuf >> 8];
    if (p >= NP) { let m = 1 << 7; do { p = bitBuf & m ? rt[p] : lt[p]; m >>= 1; } while (p >= NP); }
    fill(pLen[p]); if (p !== 0) { p--; p = (1 << p) + getBits(p); } return p;
  }
  const buf = new Uint8Array(DIC);
  function decodeBuffer(count) {
    let i2 = 0; decCounter--;
    while (decCounter >= 0) { buf[i2] = buf[decPtr]; decPtr = (decPtr + 1) & (DIC - 1); i2++; if (i2 === count) return; decCounter--; }
    for (;;) { const c = decodeChar();
      if (c <= 255) { buf[i2++] = c; if (i2 === count) return; }
      else { decCounter = c - (256 - 2); decPtr = (i2 - decodePtr() - 1) & (DIC - 1); decCounter--;
        while (decCounter >= 0) { buf[i2] = buf[decPtr]; decPtr = (decPtr + 1) & (DIC - 1); i2++; if (i2 === count) return; decCounter--; } } }
  }
  fill(16);
  let size = total >>> 0;
  while (size > 0) { const n = Math.min(size, DIC); decodeBuffer(n); out.set(buf.subarray(0, n), op); op += n; size -= n; }
  return out;
}

/* ---- A2M import (AT2 format v9-14) ---- */
function importA2M(bytes) {
  const d = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), dv = new DataView(d.buffer, d.byteOffset, d.byteLength), warn = [];
  if (String.fromCharCode(...d.subarray(0, 10)) !== '_A2module_') throw new Error('NOT AN A2M FILE');
  const ver = d[14], patts = d[15];
  if (ver < 9 || ver > 14) throw new Error(ver < 9 ? 'OLD A2M (V' + ver + '): RESAVE IN AT2' : 'UNKNOWN A2M VERSION ' + ver);
  const b0len = dv.getUint32(16, true), lens = []; for (let k = 0; k < 16; k++) lens.push(dv.getUint32(20 + k * 4, true));
  const nblk = 1 + [...Array(15)].filter((_, k) => Math.floor((patts - 1) / 8) > k).length;
  let p = 84, crc = 0xFFFFFFFF; const blocks = [];
  const b0 = d.subarray(p, p + b0len); p += b0len; crc = crcUpd(b0, crc);
  for (let k = 0; k < nblk; k++) { const bl = d.subarray(p, p + lens[k]); p += lens[k]; crc = crcUpd(bl, crc); blocks.push(bl); }
  crc = crcUpd(d.subarray(16, 18), crc); for (let k = 0; k < 16; k++) crc = crcUpd(d.subarray(20 + k * 4, 22 + k * 4), crc);
  if (crc !== dv.getUint32(10, true)) warn.push('CRC MISMATCH');
  const unpack = bl => ver >= 12 ? lzhUnpack(bl) : aplibUnpack(bl, ver === 11 ? A2.SONG : A2.SONG);
  const sd0 = unpack(b0), sd = new Uint8Array(A2.SONG); sd.set(sd0.subarray(0, A2.SONG));
  const pat = blocks.map(bl => { const u = ver >= 12 ? lzhUnpack(bl) : aplibUnpack(bl, A2.PAT); const z = new Uint8Array(A2.PAT); z.set(u.subarray(0, A2.PAT)); return z; });
  const str = (o, max) => String.fromCharCode(...sd.subarray(o + 1, o + 1 + Math.min(sd[o], max))).replace(/[^\x20-\x7e]/g, '?');
  const u16 = o => sd[o] | sd[o + 1] << 8, s8 = v => v > 127 ? v - 256 : v;
  const rows = Math.max(1, Math.min(256, u16(A2.O_PLEN) || 64)), ntr = sd[A2.O_NTRK] || 18;
  const x = A2.O_RES, hasX = String.fromCharCode(...sd.subarray(x, x + 4)) === 'FM1X';
  const xI = hasX && new DataView(sd.buffer).getUint32(x + 6, true) === crcUpd(sd.subarray(A2.O_INS, A2.O_INS + 255 * A2.INS), 0xFFFFFFFF);
  const xM = hasX && new DataView(sd.buffer).getUint32(x + 10, true) === crcUpd(sd.subarray(A2.O_MAC, A2.O_MAC + 16 * A2.MAC), 0xFFFFFFFF);
  /* order */
  /* AT2 order: 0..7F pattern, 80h+n = jump to position n; unused entries hold 80h */
  const raw = [...sd.subarray(A2.O_ORD, A2.O_ORD + 128)]; let last = 127; while (last >= 0 && raw[last] === 0x80) last--;
  const order = raw.slice(0, last + 1).map(v => v >= 0x80 && v - 0x80 > last ? 0x80 : v);
  if (!order.length || order.every(v => v >= 0x80)) order.unshift(0);
  /* patterns */
  const patterns = []; let lost = 0, maxIns = 0;
  const maxPat = Math.max(...order.filter(v => v < 0x80), patts - 1);
  for (let pi = 0; pi <= maxPat; pi++) { const blk = pat[pi >> 3]; if (!blk) { patterns.push(emptyPattern(rows)); continue; }
    const P = emptyPattern(rows), q = pi & 7;
    for (let r = 0; r < rows; r++) for (let c = 0; c < 20; c++) { const o = ((q * 20 + c) * 256 + r) * 6, cl = P[r][c];
      const n = blk[o]; if (n >= 1 && n <= 97) cl[0] = n + 11; else if (n === 0xFF || (n === 0x80 && hasX)) cl[0] = -2; else if (n > 0x90 && n <= 0x90 + 97) cl[0] = n - 0x90 + 11; /* 0xFF = AT2 key off; 0x80 = FMY262 before 0.8.2 */
      cl[1] = blk[o + 1]; maxIns = Math.max(maxIns, cl[1]);
      [[blk[o + 2], blk[o + 3]], [blk[o + 4], blk[o + 5]]].forEach(([fd, fv], k) => { const i = 2 + k * 2;
        if (fd === 0 && fv === 0) return;
        if (fd === 12 || fd === 18 || fd === 9 || fd === 40) { cl[i] = fd; cl[i + 1] = Math.min(63, fv); }
        else if (fd <= 47 && fd !== 14 && fd !== 15) { cl[i] = fd; cl[i + 1] = fd === 37 ? Math.min(63, fv) : fv; }
        else if (fd === 15) { cl[i] = 15; cl[i + 1] = Math.min(31, fv); }
        else if (fd === 14) { cl[i] = 15; cl[i + 1] = Math.max(32, Math.min(255, Math.round(fv * 2.5))); } else lost++; }); }
    patterns.push(P); }
  if (lost) warn.push(lost + ' UNKNOWN EFFECTS SKIPPED');
  /* instruments */
  let nIns = maxIns; for (let k = 0; k < 255; k++) { const o = A2.O_INS + k * A2.INS; if (sd.subarray(o, o + 11).some(v => v) || sd[A2.O_NAMES + k * A2.NAME]) nIns = Math.max(nIns, k + 1); }
  nIns = Math.max(1, Math.min(255, nIns));
  const inst = [];
  for (let k = 0; k < nIns; k++) { const o = A2.O_INS + k * A2.INS, f = sd.subarray(o, o + 11);
    const op = (r20, r40, r60, r80, re0) => ({ am: r20 >> 7 & 1, vib: r20 >> 6 & 1, egt: r20 >> 5 & 1, ksr: r20 >> 4 & 1, mult: r20 & 15, ksl: r40 >> 6, tl: r40 & 63, ar: r60 >> 4, dr: r60 & 15, sl: r80 >> 4, rr: r80 & 15, ws: re0 & 7 });
    const nm = str(A2.O_NAMES + k * A2.NAME, 32).trim().slice(0, 11) || 'INS ' + (k + 1).toString(16).toUpperCase().padStart(2, '0');
    const mo = A2.O_IMAC + k * A2.REGT;
    inst.push({ name: nm, fb: f[10] >> 1 & 7, con: f[10] & 1, pan: [1, 0, 2][sd[o + 11]] ?? 1,
      ft: xI && k < 64 ? s8(sd[x + 14 + k]) : Math.max(-99, Math.min(99, Math.round(s8(sd[o + 12]) / 0.28))),
      arpT: sd[mo + 4] <= 16 ? sd[mo + 4] : 0, vibT: sd[mo + 5] <= 16 ? sd[mo + 5] : 0,
      op: [op(f[0], f[2], f[4], f[6], f[8]), op(f[1], f[3], f[5], f[7], f[9])], pv: sd[o + 13] || 0,
      fmm: sd[mo] ? { len: sd[mo], lb: sd[mo + 1], ll: sd[mo + 2], ko: sd[mo + 3], dis: [...sd.subarray(A2.O_DIS + k * 28, A2.O_DIS + k * 28 + 28)].map(v => !!v),
        steps: [...Array(sd[mo])].map((_, i) => { const q = mo + 6 + i * 15; return { d: [...sd.subarray(q, q + 11)], fs: (sd[q + 11] | sd[q + 12] << 8) << 16 >> 16, pan: sd[q + 13], dur: sd[q + 14] }; }) } : undefined });
    if (sd[mo + 4] > 16 || sd[mo + 5] > 16) warn.push('MACRO TABLES ABOVE 16 DROPPED'); }
  for (let i = 0; i < Math.min(128, sd[A2.O_I4]); i++) { const n = sd[A2.O_I4 + 1 + i]; if (inst[n - 1] && inst[n]) inst[n - 1].four = true; }
  /* macro tables */
  const arp = [], vib = [];
  for (let t = 0; t < 16; t++) { const mo = A2.O_MAC + t * A2.MAC, vo = mo + 260, A = blankTable('arp'), V = blankTable('vib');
    const al = Math.min(16, sd[mo]); if (al) { A.len = al; A.spd = Math.max(1, sd[mo + 1]); A.loop = sd[mo + 2] && sd[mo + 3] ? sd[mo + 2] - 1 : -1;
      for (let k = 0; k < al; k++) { const v = sd[mo + 5 + k]; A.data[k] = xM ? s8(sd[x + 78 + t * 16 + k]) : v <= 96 ? v : 0; } if (sd[mo] > 16) warn.push('ARP TABLE CUT TO 16 STEPS'); }
    let vl = Math.min(16, sd[vo]); if (vl) { V.len = vl; V.spd = Math.max(1, sd[vo + 1]); V.delay = sd[vo + 2]; V.loop = sd[vo + 3] && sd[vo + 4] ? sd[vo + 3] - 1 : -1;
      /* AT2 tables run to 255 steps; a longer one is taken every k-th step at k times the speed (same shape and period) */
      let full = sd[vo]; if (!xM && V.loop >= 0) full = Math.min(full, sd[vo + 3] + sd[vo + 4] - 1); const k = xM ? 1 : Math.max(1, Math.ceil(full / 16));
      if (k > 1) { vl = V.len = Math.ceil(full / k); V.spd = Math.min(16, V.spd * k); if (V.loop >= 0) V.loop = Math.min(vl - 1, Math.round(V.loop / k)); warn.push('VIBRATO TABLE ' + (t + 1) + ': ' + full + ' STEPS MADE ' + vl); }
      for (let k2 = 0; k2 < vl; k2++) V.data[k2] = xM ? s8(sd[x + 334 + t * 16 + k2]) : Math.max(-64, Math.min(64, Math.round(s8(sd[vo + 6 + k2 * k]) / 1.7))); }
    if (xM) { A.name = str(x + 590 + t * 10, 9); V.name = str(x + 750 + t * 10, 9); }
    arp.push(A); vib.push(V); }
  const tempo = sd[A2.O_TEMPO] || 50, flags = sd[A2.O_TEMPO + 2];
  const song = { name: str(0, 42).trim().slice(0, 11) || 'IMPORTED', bpm: hasX && sd[x + 5] >= 32 ? sd[x + 5] : Math.max(32, Math.min(255, Math.round(tempo * 2.5))), speed: Math.max(1, sd[A2.O_TEMPO + 1] || 6),
    rows, order, patterns, inst, arp, vib, lfo: (flags >> 4 & 1) | (flags >> 3 & 1) << 1,
    perc: !!(flags >> 6 & 1), mspd: Math.max(1, Math.min(8, u16(A2.O_MSPD) || 1)), four: sd[A2.O_NTRK + 3] & 63, opl: hasX && sd[x + 912] === 0xA5 ? sd[x + 913] : 3, gvol: hasX && sd[x + 912] === 0xA5 ? Math.min(63, sd[x + 914]) : 63, vtab: hasX && sd[x + 912] === 0xA5 ? sd[x + 915] : 0,
    /* AT2 volume scaling off: volumes are levels (FMY262's own files before 0.8.2 had no mark and always scaled) */
    vdir: hasX ? ((sd[x + 916] & 0xF0) === 0xA0 ? sd[x + 916] & 1 : 0) : flags >> 7 & 1 ? 0 : 1 };
  return { song: normSong(song), ver, warn: [...new Set(warn)] };
}
