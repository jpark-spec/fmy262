/* t48: RAD import against AdPlug's RAD replayer. Each tune in vendor/rad (or RAD_MODULES) is played tick by tick
   by AdPlug (tests/rad/rad_dump.cpp, linked to the installed libadplug) and, after importRAD, by web/engine.js
   with a register-logging OPL. Per RAD channel and tick we compare key-on and pitch (cents) of the sounding
   OPL channel. Needs c++ and libadplug (brew install adplug); skipped without them. */
process.chdir(require('path').join(__dirname, '../web'));
const fs = require('fs'), cp = require('child_process'), path = require('path');
eval(fs.readFileSync('engine.js', 'utf8') + fs.readFileSync('demo.js', 'utf8') + fs.readFileSync('rad.js', 'utf8') + ';global.E=Engine;global.X={importRAD};');
const dir = process.env.RAD_MODULES || '../vendor/rad', bin = '../tests/out/rad_dump';
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.rad$/i.test(f)).map(f => path.join(dir, f)) : [];
const inc = ['/opt/homebrew/include', '/usr/local/include', '/usr/include'].find(d => fs.existsSync(d + '/adplug/rad2.h'));
if (!files.length || !inc) { console.log('t48: skipped (no RAD tunes or no libadplug)'); process.exit(0); }
/* the RAD replayer from AdPlug's current source when it is there (vendor/rad/rad2.cpp, or RAD2_CPP): AdPlug 2.4's
   own copy keeps the first riff of a nested chain going, against what the RAD test tunes (nest-*.rad) describe */
const src = process.env.RAD2_CPP || '../vendor/rad/rad2.cpp', own = fs.existsSync(src);
try { cp.execSync(`c++ -std=c++11 -O1 -w -I../tests/rad -I${inc}/adplug -I${inc} -I${inc}/libbinio ../tests/rad/rad_dump.cpp ${own ? src : ''} -L${path.dirname(inc)}/lib -ladplug -lbinio -o ${bin}`, { stdio: 'pipe' }); }
catch (e) { console.log('t48: skipped (cannot build rad_dump)', String(e.stderr).slice(0, 200)); process.exit(0); }

const TA = [0, 2, 4, 9, 11, 13, 6, 8, 16], PRI = [0, 1, 2, 0x100, 0x101, 0x102, 6, 7, 8], SEC = [3, 4, 5, 0x103, 0x104, 0x105, 0x106, 0x107, 0x108];
const kidx = k => (k >> 8) * 9 + (k & 0xFF);
const hz = (b, a) => ((b & 3) << 8 | a) * Math.pow(2, (b >> 2) & 7);
const TICKS = +process.env.T48_TICKS || 3000, TOL = +process.env.T48_CENTS || 6;
let bad = 0;
for (const f of files) {
  const ref = cp.execFileSync(bin, [f, String(TICKS)], { maxBuffer: 1 << 26 }).toString().trim().split('\n');
  const rhz = parseFloat(ref.shift().split(' ')[1]); const rows = ref.filter(l => !l.startsWith('end')).map(l => { const [ch, x] = l.split(' ');
    return { ch: Array.from({ length: 18 }, (_, k) => [parseInt(ch.substr(k * 4, 2), 16), parseInt(ch.substr(k * 4 + 2, 2), 16)]), four: parseInt(x.substr(0, 2), 16) }; });
  let song, warn, ver1; try { ({ song, warn, ver: ver1 } = X.importRAD(new Uint8Array(fs.readFileSync(f)))); ver1 = ver1 === 1; } catch (e) { console.log(path.basename(f), 'IMPORT ERROR', e.message); bad++; continue; }
  const R = new Uint8Array(512), fake = () => ({ opl_reset() {}, opl_write_now(r, v) { R[r & 511] = v; }, opl_render() { return 0; }, opl_scope_on() {}, memory: { buffer: new ArrayBuffer(4096) } });
  const e = new E(44100, fake, () => {}); e.handle({ t: 'song', song }); e.handle({ t: 'play', ord: 0, row: 0 });
  const st = { ticks: 0, used: 0, key: 0, pitch: 0, worst: 0, first: null };
  for (let t = 0; t < rows.length; t++) { e.flush(); e.doTick(); e.flush();
    const A = rows[t], dbg = process.env.T48_DBG && path.basename(f) === process.env.T48_DBG.split(':')[0] ? +process.env.T48_DBG.split(':')[1] - 1 : -1;
    for (let c = 0; c < 9; c++) {
      const four = c < 6 && (A.four >> [0, 1, 2, 3, 4, 5][c] & 1);   /* 0x104 bits: pairs 0-2 bank 0, 3-5 bank 1 */
      const [rb, ra] = A.ch[ver1 ? c : kidx(four ? PRI[c] : SEC[c])];   /* v1 is OPL2: RAD channel = OPL channel */
      const k = e.regs(e.fch(TA[c])).k, mb = R[(k & 0x100) | 0xB0 | (k & 0xFF)], ma = R[(k & 0x100) | 0xA0 | (k & 0xFF)];
      const ron = !!(rb & 0x20), mon = !!(mb & 0x20); st.ticks++;
      if (c === dbg && t < (+process.env.T48_N || 400)) console.log(t, e.ord, e.row, e.tick, (rb << 8 | ra).toString(16).padStart(4, 0), (mb << 8 | ma).toString(16).padStart(4, 0), ron !== mon ? 'KEY' : ron && Math.abs(1200 * Math.log2(hz(mb, ma) / hz(rb, ra))) > TOL ? 'PITCH' : '');
      if (ron || mon) st.used++;
      if (ron !== mon) { st.key++; if (!st.first) st.first = `tick ${t} ch ${c + 1} key ${ron ? 'on' : 'off'}/${mon ? 'on' : 'off'}`; continue; }
      if (ron) { const d = Math.abs(1200 * Math.log2(hz(mb, ma) / hz(rb, ra))); if (d > st.worst) st.worst = d;
        if (d > TOL) { st.pitch++; if (!st.first) st.first = `tick ${t} ch ${c + 1} pitch ${d.toFixed(1)} cents (${rb.toString(16)}${ra.toString(16).padStart(2, '0')} / ${mb.toString(16)}${ma.toString(16).padStart(2, '0')})`; } }
    } }
    console.log(`${path.basename(f)}: ${rows.length} ticks @${rhz}Hz, sounding ${st.used} ch-ticks, key diff ${st.key}, pitch > ${TOL}c ${st.pitch} (worst ${st.worst.toFixed(1)}c)${st.first ? ' first: ' + st.first : ''}${warn.length ? ' | ' + warn.join('; ') : ''}`);
  /* a tune whose rows took everything (no lost effects, clashing or late notes) must match AdPlug; the others only report */
  const fits = !warn.some(w => /DID NOT FIT|SAME ROW|MORE THAN 15 TICKS/.test(w));
  if ((fits || process.env.T48_STRICT) && st.key + st.pitch) { bad++; console.log('  ^ FAIL'); }
}
console.log(bad ? `t48: ${bad} failed` : 't48: done');
process.exit(bad ? 1 : 0);
