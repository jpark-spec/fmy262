#!/bin/sh
# Builds web/opl3fn.js (Nuked OPL3 → wasm → plain JS function makeOPL) used by web/build.cjs.
# Needs clang with the wasm32 target, wasm-ld, and binaryen's wasm2js (npm i binaryen@116).
set -e
cd "$(dirname "$0")"
clang --target=wasm32 -O2 -ffreestanding -nostdlib -Iinc -I. -fno-builtin \
  -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=1048576 -o opl3.wasm wrap.c opl3.c
npx -y -p binaryen@116.0.0 wasm2js opl3.wasm -O2 -o opl3.mjs
node -e "
const fs=require('fs');let s=fs.readFileSync('opl3.mjs','utf8');
s=s.replace(/^import .*\n/mg,'').replace(/var retasmFunc = asmFunc\(\{[\s\S]*$/,'return asmFunc({});\n');
fs.writeFileSync('../web/opl3fn.js','function makeOPL(){\n'+s+'}\n');"
echo built ../web/opl3fn.js
