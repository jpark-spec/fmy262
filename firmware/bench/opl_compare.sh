#!/bin/sh
# Build and run the OPL3 emulator comparison on the host (needs vendor/libADLMIDI: git clone --depth 1
# https://github.com/Wohlstand/libADLMIDI.git vendor/libADLMIDI)
set -e
cd "$(dirname "$0")/../.."
C=vendor/libADLMIDI/src/chips
O=${OUT:-/tmp/opl_compare}; mkdir -p "$O"
F="-O2 -I$C -Iopl3"
cc $F -c opl3/opl3.c -o "$O/nuked.o"
cc $F -DOPL3_Generate4ChStream=OPL3Fast_Generate4ChStream -c $C/nuked_fast/nukedopl3_fast.c -o "$O/nf.o"
cc $F -DOPL3_Generate4ChStream=OPL3Fast_Generate4ChStream -c firmware/bench/opl_compare_nf.c -o "$O/nfw.o"
cc $F -c $C/opal/opal.c -o "$O/opal.o"
cc -O2 -Ivendor/dbopl-c -c vendor/dbopl-c/dbopl.c -o "$O/dbc.o"
cc -O2 -Ivendor/dbopl-c -c firmware/bench/opl_compare_db.c -o "$O/dbcw.o"
cc $F -c $C/vpc_opl3/vpc_opl3.c -o "$O/vpc.o"
c++ $F -std=c++14 -c $C/dosbox/dbopl.cpp -o "$O/dbopl.o"
for f in opl adpcm pcm; do c++ $F -std=c++14 -c $C/ymfm/ymfm_$f.cpp -o "$O/ymfm_$f.o"; done
c++ $F -std=c++14 -c firmware/bench/opl_compare.cpp -o "$O/main.o"
c++ "$O"/*.o -o "$O/opl_compare"
"$O/opl_compare"
