/* firmware/ui/songfile.c + slots.c: song files round-tripped (and damaged ones refused), slot operations against a
 * model, and power cut at every point of a save (firmware/ui/test/sl_test.c), with AddressSanitizer and UBSan. (cc) */
const cp = require('child_process'), path = require('path'), fs = require('fs');
const UI = path.join(__dirname, '../firmware/ui'), OUT = path.join(__dirname, 'out/eng'), BIN = path.join(OUT, 'sl_test');
fs.mkdirSync(OUT, { recursive: true });
cp.execSync(`cc -std=c99 -O1 -g -Wall -Wextra -Werror -fsanitize=address,undefined -I. -I../engine -DENG_EXACT songfile.c slots.c uisong.c ../engine/songmem.c test/sl_test.c -o ${BIN}`, { cwd: UI, stdio: 'inherit' });
const r = cp.spawnSync(BIN, [], { cwd: UI });
process.stdout.write(r.stdout.toString() + r.stderr.toString());
if (r.status) process.exit(1);
