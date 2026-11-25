/* firmware/engine/songmem.c: random edits against a full-array model (firmware/engine/test/sm_test.c), with
 * AddressSanitizer and UBSan, in a small arena that keeps filling up, a roomy one and a tiny one. (C compiler: cc) */
const cp = require('child_process'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'out/eng'), BIN = path.join(OUT, 'sm_test');
fs.mkdirSync(OUT, { recursive: true });
cp.execSync(`cc -O1 -g -fsanitize=address,undefined -std=c99 -Wall -Wextra -Werror -I${ROOT}/firmware/engine ${ROOT}/firmware/engine/songmem.c ${ROOT}/firmware/engine/test/sm_test.c -o ${BIN}`, { stdio: 'inherit' });
let bad = 0;
for (const [steps, seed, kb] of [[200000, 1, 16], [200000, 2, 16], [200000, 3, 64], [200000, 4, 4]]) {
  const r = cp.spawnSync(BIN, [steps, seed, kb]);
  process.stdout.write(r.stdout.toString() + r.stderr.toString());
  if (r.status) bad++;
}
if (bad) process.exit(1);
