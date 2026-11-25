#!/bin/sh
# Builds web/opl3fn.js from DBOPL (the FM-1's own chip: firmware/opl3bench/emu, DBOPL_SPEC + DBOPL_PRE) → wasm →
# plain JS function makeOPL, used by web/build.cjs and the tests. Nuked OPL3's (build-wasm.sh) goes to web/nukedfn.js.
# Needs clang with the wasm32 target, wasm-ld, and binaryen's wasm2js (npm i binaryen@116).
set -e
cd "$(dirname "$0")"
E=../firmware/opl3bench/emu
L=/opt/homebrew/opt/emscripten/libexec/llvm/bin; [ -d $L ] && PATH=$L:$PATH   # (Apple's clang has no wasm-ld)
clang --target=wasm32 -O2 -ffreestanding -nostdlib -Iinc -I. -I$E -I$E/dbopl -fno-builtin -w \
  -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=2097152 -o dbopl.wasm wrap_dbopl.c
npx -y -p binaryen@116.0.0 wasm2js dbopl.wasm -O2 -o dbopl.mjs
node -e "
const fs=require('fs');let s=fs.readFileSync('dbopl.mjs','utf8');
s=s.replace(/^import .*\n/mg,'').replace(/var retasmFunc = asmFunc\(\{[\s\S]*$/,'return asmFunc({});\n');
fs.writeFileSync('../web/opl3fn.js','/* DBOPL (the FM-1\'s chip) as a plain JS function: opl3/build-dbopl-wasm.sh */\nfunction makeOPL(){\n'+s+'}\n');"
echo built ../web/opl3fn.js
