/* t44: the C screen (firmware/ui) against the page's (web/template.html), pixel by pixel.
 * The same input scripts go to both: the page opened with #uitest (window.__ui) and its clock held, and
 * firmware/ui/test/ui_host. Each "shot" compares the 240 x 240 screen in RGB565 (the page's canvas sampled at
 * its 3x pixel centres). Needs cc and Chrome (CHROME=path, or the usual places); differing shots are kept in
 * tests/out/ui as PPMs (page, C, difference). */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..'), UI = path.join(ROOT, 'firmware/ui'), OUT = path.join(__dirname, 'out/ui');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(p => fs.existsSync(p));
if (!CHROME) { console.log('t44: no Chrome, skipped'); process.exit(0); }

const BIN = path.join(OUT, 'ui_host');
cp.execSync(`node ${UI}/tools/ui2c.cjs > ${UI}/ui_data.h`);
cp.execSync(`cc -std=c99 -O1 -g -Wall -Wextra -Werror -fsanitize=address,undefined -I${UI} -I${ROOT}/firmware/engine -DENG_EXACT ` +
  `${UI}/ui.c ${UI}/uisong.c ${UI}/songfile.c ${UI}/slots.c ${ROOT}/firmware/engine/songmem.c ${ROOT}/firmware/engine/eng.c ${UI}/test/ui_host.c -lm -o ${BIN}`, { stdio: 'inherit' });

/* the scripts: name -> lines */
const S = {
  pat: `shot pat0
knob sel 5
knob 3 2
shot pat_field
knob 2 3
shot pat_fxval
knob alg 4
shot pat_fxtype
tap FX
shot pat_fx2
wait 1200
knob 1 4
knob 0 1
shot pat_ch
knob pre 2
wait 1100
shot pat_ins
tap FX
tap FX
knob sel -8
shot pat_up`,
  compact: `tap HOME
shot c9
wait 1100
tap SEL
shot c9b
knob sel 70
shot c9wrap`,
  block: `knob sel 2
down HOME
knob 0 5
knob 1 2
shot blk
up HOME
knob 2 2
shot blk_tr
down HOME
tap OCT-
up HOME
wait 1100
knob sel 20
down HOME
tap OCT+
up HOME
shot blk_paste
tap HOME
tap EDIT
shot blk_del`,
  ins: `tap ENV
shot ins0
tap ENV
shot ins1
tap ENV
shot ins2
tap ENV
shot ins3
knob 0 2
knob 1 1
shot ins3b
tap SEL
knob 0 1
tap ENV
knob 0 -3
knob 1 2
knob 2 5
knob 3 1
shot ins0b
knob sel 1
knob 0 2
knob 1 1
knob 2 -2
knob 3 -4
shot ins1b
knob sel 1
knob 0 7
knob 1 3
knob 2 -15
knob 3 2
shot ins2b`,
  four: `tap ENV
knob alg 2
wait 1100
shot f4_0
tap SEL
tap SEL
shot f4_op3
knob sel -1
shot f4_conn
knob alg 1
wait 1100
shot f4_conn2
tap FX
knob sel 1
key 0 down
key 0 up
shot f4_pat`,
  mac: `tap ARP
shot arp0
knob 0 2
knob 1 3
knob 2 -5
shot arp1
knob pre 3
wait 1100
shot arp_shape
tap ARP
shot vib0
knob alg 2
knob sel -2
shot vib1
tap ARP
wait 1100
shot reg0
knob sel 3
knob 1 5
knob 2 4
shot reg1
knob 0 1
knob 3 2
down HOME
knob 1 1
up HOME
shot reg2
knob 1 21
knob 2 -40
shot reg3`,
  seq: `tap SEQ
shot seq0
knob 2 3
knob 0 2
knob 1 -1
shot seq1
tap OCT+
wait 1100
shot seq2
knob 1 200
shot seq3`,
  glo: `tap GLO
shot glo0
knob 0 7
knob 1 -2
knob 3 -10
shot glo0b
knob 2 1
wait 1100
shot glo_rows
tap GLO
shot glo1
knob 3 241
knob 1 1
shot glo1b
knob 3 -230
shot glo1c
tap GLO
shot glo2
knob 1 2
knob 2 1
wait 1100
shot glo2b
knob 0 1
shot glo2c`,
  ask: `tap GLO
tap GLO
knob 0 -1
shot ask0
tap OCT-
shot ask1`,
  menu: `down HOME
wait 800
up HOME
shot menu0
knob alg 1
knob pre 2
knob 0 1
shot menu1
knob alg -1
knob 0 3
shot menu_theme
tap HOME
wait 1100
shot theme_pat
tap ENV
shot theme_ins`,
  fxp: `knob 3 2
down FX
wait 600
up FX
shot fxp0
knob sel 9
shot fxp1
knob 0 2
shot fxp2
tap SEL
shot fxp_pick`,
  presets: `tap ENV
knob pre 1
shot pre0
knob 0 2
shot pre1
knob sel 5
shot pre2
tap SEL
wait 1100
shot pre_load`,
  name: `tap ENV
tap SAVE
shot nm0
key 0 down
key 0 up
key 0 down
key 0 up
key 7 down
key 7 up
shot nm1
knob 1 3
tap EDIT
shot nm2
wait 1100
key 2 down
key 2 up
wait 1100
shot nm3`,
  rec: `tap REC
key 0 down
key 0 up
key 4 down
key 4 up
down HOME
key 2 down
key 2 up
up HOME
shot rec0
tap EDIT
shot rec1
tap OCT+
wait 1100
key 3 down
key 3 up
shot rec2`,
  perc: `tap GLO
tap GLO
tap GLO
knob 0 1
shot perc_ask
tap OCT+
wait 1100
tap HOME
tap SEL
tap SEL
tap SEL
tap SEL
tap SEL
tap SEL
shot perc_pat`,
  about: `shot splash
key 3 down
key 3 up
shot splash_gone
down HOME
wait 800
up HOME
knob alg 4
knob pre 9
shot menu_info
tap SEL
shot info0
tap SEL
shot info1
knob sel 1
shot info2
tap OCT-
shot info1b
knob sel 40
shot info_end
tap SEL
shot info_wrap
tap SEL
tap PLAY
shot info_play
tap ENV
shot info_closed
tap PLAY
shot stopped`,
  aboutwait: `wait 3100
shot splash_timeout`,
  file: `down HOME
tap GLO
up HOME
shot file0
knob sel 2
shot file2
tap SAVE
shot file_name
tap ENV
tap PLAY
shot file_cancel
tap SAVE
shot file_pick`,
  newsong: `knob 1 1
tap SAVE
tap OCT+
shot new_ask
tap OCT+
shot new_song
knob 2 3
shot new_song_ch`,
  scope: `tap HOME
tap HOME
wait 1100
shot sc1
knob 1 4
knob 2 3
knob sel 5
shot sc1_ch
tap HOME
wait 1100
shot sc9
tap SEL
shot sc9_g2
down HOME
tap REC
up HOME
wait 1100
shot sc9_mute
tap EDIT
tap HOME
shot sc_back
tap HOME
tap HOME
tap FX
wait 1100
shot sc_fx`,
  allins: `down HOME
knob pre 1
up HOME
shot allins0
wait 1100
knob 1 2
down HOME
knob pre 3
up HOME
shot allins1`,
};

const ppm = (file, px) => { const b = Buffer.alloc(240 * 240 * 3); for (let i = 0; i < 240 * 240; i++) { const v = px[i]; b[i * 3] = (v >> 11) << 3; b[i * 3 + 1] = ((v >> 5) & 63) << 2; b[i * 3 + 2] = (v & 31) << 3; } fs.writeFileSync(file, Buffer.concat([Buffer.from('P6 240 240 255\n'), b])); };

(async () => {
  const puppeteer = require('puppeteer-core');
  const br = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  let shots = 0, bad = 0;
  const only = process.argv[2];
  for (let [name, text] of Object.entries(S)) {
    if (only && only !== name) continue;
    const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
    if (!name.startsWith('about')) text = 'tap SEL\n' + text;   /* (the start screen: any input skips it) */
    const sf = path.join(dir, 'script.txt'); fs.writeFileSync(sf, text + '\n');
    cp.execFileSync(BIN, [sf, dir], { stdio: ['ignore', 'pipe', 'inherit'] });
    const p = await br.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.evaluateOnNewDocument(() => { window.__T = 1000; performance.now = () => window.__T; try { Object.defineProperty(Navigator.prototype, 'requestMIDIAccess', { value: undefined }); } catch (e) {} try { localStorage.clear(); } catch (e) {} });
    await p.goto('file://' + path.join(ROOT, 'dist/fm1-opl3-tracker.html') + '#uitest');
    await p.waitForFunction(() => window.__ui);
    await p.evaluate(() => { window.__ui.st.msg = ''; });   /* (headless Chrome: MIDI NOT AVAILABLE at the start) */
    for (const line of text.split('\n')) {
      const [a, b, c] = line.trim().split(/\s+/); if (!a || a[0] === '#') continue;
      const bn = x => x === 'OCT-' ? 'OCT−' : x;
      if (a === 'wait') { await p.evaluate(ms => { window.__T += ms; }, +b); await new Promise(r => setTimeout(r, +b + 30)); }
      else if (a === 'knob') await p.evaluate((k, d) => window.__ui.knob(isNaN(+k) ? k : +k, d), b, +c);
      else if (a === 'down') await p.evaluate(n => window.__ui.btnDown(n), bn(b));
      else if (a === 'up') await p.evaluate(n => window.__ui.btnUp(n), bn(b));
      else if (a === 'tap') await p.evaluate(n => { window.__ui.btnDown(n); window.__ui.btnUp(n); }, bn(b));
      else if (a === 'key') await p.evaluate((k, d) => d === 'down' ? window.__ui.keyDown(k) : window.__ui.keyUp(k), +b, c);
      else if (a === 'shot') {
        await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        const js = await p.evaluate(() => { const cv = document.querySelector('#scr'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, s = cv.width / 240, o = [];
          for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) { const i = ((y * s + (s >> 1)) * cv.width + x * s + (s >> 1)) * 4; o.push((d[i] >> 3) << 11 | (d[i + 1] >> 2) << 5 | d[i + 2] >> 3); } return o; });
        const raw = fs.readFileSync(path.join(dir, b + '.raw')), c16 = new Uint16Array(raw.buffer, raw.byteOffset, 240 * 240);
        let n = 0, first = null; const diff = new Uint16Array(240 * 240);
        for (let i = 0; i < 240 * 240; i++) if (js[i] !== c16[i]) { n++; diff[i] = 0xF800; if (!first) first = [i % 240, Math.floor(i / 240)]; } else diff[i] = (js[i] >> 2) & 0x39E7;
        shots++;
        if (n) { bad++; console.log(`t44 ${name}/${b}: ${n} pixels differ, first at ${first}`); ppm(path.join(dir, b + '_js.ppm'), js); ppm(path.join(dir, b + '_c.ppm'), c16); ppm(path.join(dir, b + '_diff.ppm'), diff); }
      }
    }
    if (errs.length) { bad++; console.log(`t44 ${name}: page errors: ${errs.join('; ')}`); }
    await p.close();
  }
  await br.close();
  console.log(`t44: ${shots} shots, ${bad ? bad + ' differ' : 'all the same'}`);
  process.exit(bad ? 1 : 0);
})();
