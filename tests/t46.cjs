/* FMY262's song slots over USB (fm1-base's companion files) on the tracker's host simulator: songs written by
 * web/songfile.js (the demo, and an A2M through web/export.js) sent, read back the same, a non-song refused, writes
 * refused while playing, a delete, the song loaded from its slot (firmware/tracker/tests/usb_test.py).
 * Needs vendor/fm1-base (its .venv); left out without it. */
const cp = require('child_process'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..'), BASE = path.join(ROOT, 'vendor/fm1-base'), OUT = path.join(__dirname, 'out/usb');
if (!fs.existsSync(path.join(BASE, '.venv/bin/python'))) { console.log('t46: no vendor/fm1-base: left out'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
process.chdir(path.join(ROOT, 'web'));
eval(['demo.js', 'export.js', 'songfile.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n') + ';global.demoSong=demoSong;global.fmyWrite=fmyWrite;global.exportA2M=exportA2M;global.importA2M=importA2M;');
const demo = demoSong(); demo.name = 'DEMO FROM USB';
const a2m = importA2M(exportA2M(Object.assign(demoSong(), { name: 'VIA A2M', bpm: 140 }))).song;
fs.writeFileSync(path.join(OUT, 'a.fmy'), fmyWrite(a2m).bytes);
fs.writeFileSync(path.join(OUT, 'b.fmy'), fmyWrite(demo).bytes);
cp.execSync(`.venv/bin/python tools/build.py --host ../../firmware/tracker`, { cwd: BASE, stdio: ['ignore', 'ignore', 'inherit'] });
const r = cp.spawnSync(path.join(BASE, '.venv/bin/python'), [path.join(ROOT, 'firmware/tracker/tests/usb_test.py'),
  path.join(ROOT, 'firmware/tracker/build/host/fmy262_host'), path.join(OUT, 'a.fmy'), path.join(OUT, 'b.fmy'), OUT]);
process.stdout.write('t46: ' + r.stdout.toString() + r.stderr.toString());
if (r.status) process.exit(1);
