function makeOPL(){

  var bufferView;
  var base64ReverseLookup = new Uint8Array(123/*'z'+1*/);
  for (var i = 25; i >= 0; --i) {
    base64ReverseLookup[48+i] = 52+i; // '0-9'
    base64ReverseLookup[65+i] = i; // 'A-Z'
    base64ReverseLookup[97+i] = 26+i; // 'a-z'
  }
  base64ReverseLookup[43] = 62; // '+'
  base64ReverseLookup[47] = 63; // '/'
  /** @noinline Inlining this function would mean expanding the base64 string 4x times in the source code, which Closure seems to be happy to do. */
  function base64DecodeToExistingUint8Array(uint8Array, offset, b64) {
    var b1, b2, i = 0, j = offset, bLength = b64.length, end = offset + (bLength*3>>2) - (b64[bLength-2] == '=') - (b64[bLength-1] == '=');
    for (; i < bLength; i += 4) {
      b1 = base64ReverseLookup[b64.charCodeAt(i+1)];
      b2 = base64ReverseLookup[b64.charCodeAt(i+2)];
      uint8Array[j++] = base64ReverseLookup[b64.charCodeAt(i)] << 2 | b1 >> 4;
      if (j < end) uint8Array[j++] = b1 << 4 | b2 >> 2;
      if (j < end) uint8Array[j++] = b2 << 6 | base64ReverseLookup[b64.charCodeAt(i+3)];
    }
  }
function initActiveSegments(imports) {
  base64DecodeToExistingUint8Array(bufferView, 1025, "AQIGBwgMDQ4SExQYGRoeHyA=");
  base64DecodeToExistingUint8Array(bufferView, 1057, "AQIDBAX//wYHCAkKC///DA0ODxAR/////////////wgBAg==");
  base64DecodeToExistingUint8Array(bufferView, 1108, "AQAAAAEAAQABAQEAAQIEBggKDA4QEhQUGBgeHgEAAAACAAAAAwAAAAQAAAAFAAAABgAAAAcAAAAIAAAAWQjDBgcGiwUuBeQEpgRxBEMEGgT1A9MDtQOYA34DZQNOAzkDJAMRA/8C7QLcAs0CvQKvAqACkwKGAnkCbQJhAlYCSwJAAjYCLAIiAhgCDwIGAv0B9QHsAeQB3AHUAc0BxQG+AbcBsAGpAaIBmwGVAY8BiAGCAXwBdwFxAWsBZgFgAVsBVQFQAUsBRgFBATwBNwEzAS4BKQElASEBHAEYARQBDwELAQcBAwH/APsA+AD0APAA7ADpAOUA4gDeANsA1wDUANEAzQDKAMcAxADBAL4AuwC4ALUAsgCvAKwAqQCnAKQAoQCfAJwAmQCXAJQAkgCPAI0AigCIAIYAgwCBAH8AfQB6AHgAdgB0AHIAcABuAGwAagBoAGYAZABiAGAAXgBcAFsAWQBXAFUAUwBSAFAATgBNAEsASgBIAEYARQBDAEIAQAA/AD4APAA7ADkAOAA3ADUANAAzADEAMAAvAC4ALQArACoAKQAoACcAJgAlACQAIwAiACEAIAAfAB4AHQAcABsAGgAZABgAFwAXABYAFQAUABQAEwASABEAEQAQAA8ADwAOAA0ADQAMAAwACwAKAAoACQAJAAgACAAHAAcABwAGAAYABQAFAAUABAAEAAQAAwADAAMAAgACAAIAAgABAAEAAQABAAEAAQAB");
  base64DecodeToExistingUint8Array(bufferView, 1680, "+gf1B+8H6gfkB98H2gfUB88HyQfEB78HuQe0B64HqQekB58HmQeUB48HigeEB38Hegd1B3AHagdlB2AHWwdWB1EHTAdHB0IHPQc4BzMHLgcpByQHHwcaBxUHEAcLBwYHAgf9BvgG8wbuBukG5QbgBtsG1gbSBs0GyAbEBr8Guga1BrEGrAaoBqMGngaaBpUGkQaMBogGgwZ/BnoGdgZxBm0GaAZkBl8GWwZXBlIGTgZJBkUGQQY8BjgGNAYwBisGJwYjBh4GGgYWBhIGDgYJBgUGAQb9BfkF9QXwBewF6AXkBeAF3AXYBdQF0AXMBcgFxAXABbwFuAW0BbAFrAWoBaQFoAWcBZkFlQWRBY0FiQWFBYEFfgV6BXYFcgVvBWsFZwVjBWAFXAVYBVQFUQVNBUkFRgVCBT4FOwU3BTQFMAUsBSkFJQUiBR4FGwUXBRQFEAUMBQkFBgUCBf8E+wT4BPQE8QTtBOoE5wTjBOAE3ATZBNYE0gTPBMwEyATFBMIEvgS7BLgEtQSxBK4EqwSoBKQEoQSeBJsEmASUBJEEjgSLBIgEhQSCBH4EewR4BHUEcgRvBGwEaQRmBGMEYARdBFoEVwRUBFEETgRLBEgERQRCBD8EPAQ5BDYEMwQwBC0EKgQoBCUEIgQfBBwEGQQWBBQEEQQOBAsECAQGBAMEAAQAICgtMDM1Nzg6Ozw9Pj9A");
}
function asmFunc(imports) {
 var buffer = new ArrayBuffer(1048576);
 var HEAP8 = new Int8Array(buffer);
 var HEAP16 = new Int16Array(buffer);
 var HEAP32 = new Int32Array(buffer);
 var HEAPU8 = new Uint8Array(buffer);
 var HEAPU16 = new Uint16Array(buffer);
 var HEAPU32 = new Uint32Array(buffer);
 var HEAPF32 = new Float32Array(buffer);
 var HEAPF64 = new Float64Array(buffer);
 var Math_imul = Math.imul;
 var Math_fround = Math.fround;
 var Math_abs = Math.abs;
 var Math_clz32 = Math.clz32;
 var Math_min = Math.min;
 var Math_max = Math.max;
 var Math_floor = Math.floor;
 var Math_ceil = Math.ceil;
 var Math_trunc = Math.trunc;
 var Math_sqrt = Math.sqrt;
 var __stack_pointer = 103648;
 function opl_reset($0) {
  $0 = $0 | 0;
  var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
  $1 = 2208;
  $2 = 19520;
  while (1) {
   HEAP8[$1 + 7 | 0] = 0;
   HEAP8[$1 + 6 | 0] = 0;
   HEAP8[$1 + 5 | 0] = 0;
   HEAP8[$1 + 4 | 0] = 0;
   HEAP8[$1 + 3 | 0] = 0;
   HEAP8[$1 + 2 | 0] = 0;
   HEAP8[$1 + 1 | 0] = 0;
   HEAP8[$1 | 0] = 0;
   $1 = $1 + 8 | 0;
   $2 = $2 - 8 | 0;
   if ($2) {
    continue
   }
   break;
  };
  while (1) {
   $1 = $3 + 2208 | 0;
   HEAP8[$1 + 1062 | 0] = $4;
   HEAP32[$1 + 1036 >> 2] = 5264;
   HEAP8[$1 + 1031 | 0] = 3;
   $2 = $1 + 1026 | 0;
   HEAP16[$2 >> 1] = 511;
   HEAP16[$2 + 2 >> 1] = 511;
   HEAP32[$1 + 1020 >> 2] = 5264;
   HEAP32[$1 + 1012 >> 2] = 2208;
   $3 = $3 + 56 | 0;
   $4 = $4 + 1 | 0;
   if (($4 | 0) != 36) {
    continue
   }
   break;
  };
  $6 = -1008;
  $3 = 0;
  while (1) {
   $1 = $6 + 2208 | 0;
   $2 = Math_imul(HEAPU8[$3 + 1024 | 0], 56) + 2208 | 0;
   $5 = $2 + 1176 | 0;
   HEAP32[$1 + 1012 >> 2] = $5;
   $4 = $1 + 1008 | 0;
   $2 = $2 + 1008 | 0;
   HEAP32[$4 >> 2] = $2;
   HEAP32[$5 >> 2] = $4;
   HEAP32[$2 >> 2] = $4;
   $2 = 3;
   $5 = (($3 & 255) >>> 0) % 9 | 0;
   label$3 : {
    if ($5 >>> 0 >= 3) {
     $2 = -3;
     if ($5 >>> 0 > 5) {
      break label$3
     }
    }
    HEAP32[$1 + 1016 >> 2] = Math_imul($2 + $3 | 0, 56) + 2208;
   }
   HEAP8[$1 + 1060 | 0] = $3;
   HEAP32[$1 + 1052 >> 2] = -1;
   HEAP8[$1 + 1040 | 0] = 0;
   HEAP32[$1 + 1036 >> 2] = 5264;
   HEAP32[$1 + 1032 >> 2] = 5264;
   HEAP32[$1 + 1028 >> 2] = 5264;
   HEAP32[$1 + 1024 >> 2] = 5264;
   HEAP32[$1 + 1020 >> 2] = 2208;
   OPL3_ChannelSetupAlg($4);
   $3 = $3 + 1 | 0;
   $6 = $6 + 56 | 0;
   if ($6) {
    continue
   }
   break;
  };
  HEAP32[1315] = 1;
  HEAP8[5259] = 4;
  HEAP8[5256] = 1;
  HEAP32[1323] = ($0 << 10 >>> 0) / 49716;
 }
 
 function opl_write($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
  $2 = $0 & 65535;
  $6 = $1 & 255;
  $7 = HEAP32[1333];
  $3 = ($7 << 4) + 2208 | 0;
  $1 = $3 + 3136 | 0;
  $8 = $3 + 3144 | 0;
  $0 = HEAPU16[$8 >> 1];
  label$1 : {
   if (!($0 & 512)) {
    $3 = $7 + 1 & 1023;
    $4 = HEAP32[1330];
    $5 = HEAP32[1331];
    break label$1;
   }
   OPL3_WriteReg($0 & 511, HEAPU8[$3 + 3146 | 0]);
   $3 = $7 + 1 & 1023;
   HEAP32[1332] = $3;
   $0 = $1;
   $4 = HEAP32[$0 >> 2];
   $0 = HEAP32[$0 + 4 >> 2];
   $5 = $0;
   HEAP32[1330] = $4;
   HEAP32[1331] = $0;
  }
  HEAP32[1333] = $3;
  HEAP16[$8 >> 1] = $2 | 512;
  HEAP8[($7 << 4) + 5354 | 0] = $6;
  $6 = HEAP32[1334] + 2 | 0;
  $2 = HEAP32[1335];
  $2 = $6 >>> 0 < 2 ? $2 + 1 | 0 : $2;
  $0 = ($2 | 0) == ($5 | 0) & $4 >>> 0 < $6 >>> 0 | $2 >>> 0 > $5 >>> 0;
  $4 = $0 ? $6 : $4;
  HEAP32[1334] = $4;
  $5 = $0 ? $2 : $5;
  HEAP32[1335] = $5;
  $0 = $1;
  HEAP32[$0 >> 2] = $4;
  HEAP32[$0 + 4 >> 2] = $5;
 }
 
 function opl_write_now($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  OPL3_WriteReg($0 & 65535, $1 & 255);
 }
 
 function opl_render($0) {
  $0 = $0 | 0;
  var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
  $7 = 21728;
  $6 = __stack_pointer - 16 | 0;
  __stack_pointer = $6;
  $8 = $0 >>> 0 >= 4096 ? 4096 : $0;
  if ($8) {
   while (1) {
    $9 = $6 + 8 | 0;
    $0 = HEAP32[1324];
    $2 = HEAP32[1323];
    if (($0 | 0) >= ($2 | 0)) {
     while (1) {
      $0 = HEAP32[1328];
      HEAP32[1325] = HEAP32[1327];
      HEAP32[1326] = $0;
      $4 = 0;
      $3 = 0;
      $0 = 0;
      $1 = HEAP32[1318];
      $1 = ($1 | 0) <= -32768 ? -32768 : $1;
      HEAP16[2655] = ($1 | 0) >= 32767 ? 32767 : $1;
      $1 = HEAP32[1320];
      $1 = ($1 | 0) <= -32768 ? -32768 : $1;
      HEAP16[2657] = ($1 | 0) >= 32767 ? 32767 : $1;
      OPL3_ProcessSlot(3216);
      OPL3_ProcessSlot(3272);
      OPL3_ProcessSlot(3328);
      OPL3_ProcessSlot(3384);
      OPL3_ProcessSlot(3440);
      OPL3_ProcessSlot(3496);
      OPL3_ProcessSlot(3552);
      OPL3_ProcessSlot(3608);
      OPL3_ProcessSlot(3664);
      OPL3_ProcessSlot(3720);
      OPL3_ProcessSlot(3776);
      OPL3_ProcessSlot(3832);
      OPL3_ProcessSlot(3888);
      OPL3_ProcessSlot(3944);
      OPL3_ProcessSlot(4e3);
      while (1) {
       $1 = $3 + 2208 | 0;
       $2 = ((HEAPU16[HEAP32[$1 + 20 >> 2] >> 1] + HEAPU16[HEAP32[$1 + 16 >> 2] >> 1] | 0) + HEAPU16[HEAP32[$1 + 24 >> 2] >> 1] | 0) + HEAPU16[HEAP32[$1 + 28 >> 2] >> 1] | 0;
       $4 = (($2 & HEAPU16[$1 + 48 >> 1]) << 16 >> 16) + $4 | 0;
       $0 = ((HEAPU16[$1 + 44 >> 1] & $2) << 16 >> 16) + $0 | 0;
       $3 = $3 + 56 | 0;
       if (($3 | 0) != 1008) {
        continue
       }
       break;
      };
      HEAP32[1317] = $0;
      HEAP32[1319] = $4;
      OPL3_ProcessSlot(4056);
      OPL3_ProcessSlot(4112);
      OPL3_ProcessSlot(4168);
      $3 = HEAP32[1317];
      $3 = ($3 | 0) <= -32768 ? -32768 : $3;
      HEAP16[2654] = ($3 | 0) >= 32767 ? 32767 : $3;
      $1 = HEAP32[1319];
      $1 = ($1 | 0) <= -32768 ? -32768 : $1;
      HEAP16[2656] = ($1 | 0) >= 32767 ? 32767 : $1;
      OPL3_ProcessSlot(4224);
      OPL3_ProcessSlot(4280);
      OPL3_ProcessSlot(4336);
      OPL3_ProcessSlot(4392);
      OPL3_ProcessSlot(4448);
      OPL3_ProcessSlot(4504);
      OPL3_ProcessSlot(4560);
      OPL3_ProcessSlot(4616);
      OPL3_ProcessSlot(4672);
      OPL3_ProcessSlot(4728);
      OPL3_ProcessSlot(4784);
      OPL3_ProcessSlot(4840);
      OPL3_ProcessSlot(4896);
      OPL3_ProcessSlot(4952);
      OPL3_ProcessSlot(5008);
      $3 = 0;
      $0 = 0;
      $4 = 0;
      while (1) {
       $1 = $3 + 2208 | 0;
       $2 = ((HEAPU16[HEAP32[$1 + 20 >> 2] >> 1] + HEAPU16[HEAP32[$1 + 16 >> 2] >> 1] | 0) + HEAPU16[HEAP32[$1 + 24 >> 2] >> 1] | 0) + HEAPU16[HEAP32[$1 + 28 >> 2] >> 1] | 0;
       $4 = (($2 & HEAPU16[$1 + 50 >> 1]) << 16 >> 16) + $4 | 0;
       $0 = ((HEAPU16[$1 + 46 >> 1] & $2) << 16 >> 16) + $0 | 0;
       $3 = $3 + 56 | 0;
       if (($3 | 0) != 1008) {
        continue
       }
       break;
      };
      HEAP32[1320] = $4;
      HEAP32[1318] = $0;
      OPL3_ProcessSlot(5064);
      OPL3_ProcessSlot(5120);
      OPL3_ProcessSlot(5176);
      $1 = HEAPU8[5258];
      $3 = HEAPU16[2616];
      if (($3 & 63) == 63) {
       $1 = $1 + (($1 & 255) >>> 0 < 209 ? 1 : 47) | 0;
       HEAP8[5258] = $1;
      }
      $1 = $1 & 255;
      label$4 : {
       if ($1 >>> 0 <= 104) {
        $0 = $1 >>> HEAPU8[5259] | 0;
        break label$4;
       }
       $0 = 210 - $1 >> HEAPU8[5259];
      }
      HEAP8[5257] = $0;
      if (($3 & 1023) == 1023) {
       HEAP8[5255] = HEAPU8[5255] + 1 & 7
      }
      $1 = 1;
      HEAP16[2616] = $3 + 1;
      $3 = HEAPU8[5249];
      label$7 : {
       label$8 : {
        if ($3) {
         $2 = HEAP32[1311];
         $4 = HEAP32[1310];
         $0 = $4;
         label$10 : {
          if ($0 & 1) {
           break label$10
          }
          $1 = 2;
          if ($0 & 2) {
           break label$10
          }
          $1 = 3;
          if ($0 & 4) {
           break label$10
          }
          $1 = 4;
          if ($0 & 8) {
           break label$10
          }
          $1 = 5;
          if ($0 & 16) {
           break label$10
          }
          $1 = 6;
          if ($0 & 32) {
           break label$10
          }
          $1 = 7;
          if ($0 & 64) {
           break label$10
          }
          $1 = 8;
          if ($0 & 128) {
           break label$10
          }
          $1 = 9;
          if ($0 & 256) {
           break label$10
          }
          $1 = 10;
          if ($0 & 512) {
           break label$10
          }
          $1 = 11;
          if ($0 & 1024) {
           break label$10
          }
          $1 = 12;
          if ($0 & 2048) {
           break label$10
          }
          $1 = $0 & 4096 ? 13 : 0;
         }
         HEAP8[5250] = $1;
         HEAP8[5251] = $0 & 3;
         break label$8;
        }
        if (!HEAPU8[5248]) {
         break label$7
        }
        $4 = HEAP32[1310];
        $2 = HEAP32[1311];
       }
       $1 = ($4 | 0) == -1 & ($2 | 0) == 15;
       HEAP8[5248] = $1;
       $0 = $4 + 1 | 0;
       $2 = $0 ? $2 : $2 + 1 | 0;
       HEAP32[1310] = $1 ? 0 : $0;
       HEAP32[1311] = $1 ? 0 : $2;
      }
      HEAP8[5249] = $3 ^ 1;
      $1 = HEAP32[1332];
      $3 = ($1 << 4) + 2208 | 0;
      $5 = $3 + 3136 | 0;
      $0 = HEAP32[$5 >> 2];
      $5 = HEAP32[$5 + 4 >> 2];
      $2 = HEAP32[1331];
      $4 = HEAP32[1330];
      label$11 : {
       if (($5 | 0) == ($2 | 0) & $4 >>> 0 < $0 >>> 0 | $2 >>> 0 < $5 >>> 0) {
        break label$11
       }
       $3 = $3 + 3144 | 0;
       $0 = HEAPU16[$3 >> 1];
       if (!($0 & 512)) {
        break label$11
       }
       while (1) {
        $0 = $0 & 511;
        HEAP16[$3 >> 1] = $0;
        OPL3_WriteReg($0, HEAPU8[(($1 << 4) + 5344 | 0) + 10 | 0]);
        $1 = HEAP32[1332] + 1 & 1023;
        HEAP32[1332] = $1;
        $3 = $1 << 4;
        $2 = $3 + 5344 | 0;
        $0 = HEAP32[$2 >> 2];
        $5 = HEAP32[$2 + 4 >> 2];
        $2 = HEAP32[1331];
        $4 = HEAP32[1330];
        if (($5 | 0) == ($2 | 0) & $0 >>> 0 > $4 >>> 0 | $5 >>> 0 > $2 >>> 0) {
         break label$11
        }
        $3 = $3 + 5352 | 0;
        $0 = HEAPU16[$3 >> 1];
        if ($0 & 512) {
         continue
        }
        break;
       };
      }
      $4 = $4 + 1 | 0;
      HEAP32[1330] = $4;
      $0 = $2;
      HEAP32[1331] = $4 ? $0 : $0 + 1 | 0;
      $2 = HEAP32[1323];
      $0 = HEAP32[1324] - $2 | 0;
      HEAP32[1324] = $0;
      if (($0 | 0) >= ($2 | 0)) {
       continue
      }
      break;
     }
    }
    $1 = $2 - $0 | 0;
    HEAP16[$9 >> 1] = (Math_imul(HEAP16[2654], $0) + Math_imul($1, HEAP16[2650]) | 0) / ($2 | 0);
    HEAP16[$9 + 2 >> 1] = (Math_imul(HEAP16[2655], $0) + Math_imul(HEAP16[2651], $1) | 0) / ($2 | 0);
    HEAP16[$9 + 4 >> 1] = (Math_imul(HEAP16[2656], $0) + Math_imul(HEAP16[2652], $1) | 0) / ($2 | 0);
    HEAP32[1324] = $0 + 1024;
    HEAP16[$9 + 6 >> 1] = (Math_imul(HEAP16[2657], $0) + Math_imul(HEAP16[2653], $1) | 0) / ($2 | 0);
    $0 = HEAPU16[$6 + 8 >> 1] | HEAPU16[$6 + 10 >> 1] << 16;
    HEAP16[$7 >> 1] = $0;
    HEAP16[$7 + 2 >> 1] = $0 >>> 16;
    $7 = $7 + 4 | 0;
    $8 = $8 - 1 | 0;
    if ($8) {
     continue
    }
    break;
   }
  }
  __stack_pointer = $6 + 16 | 0;
  return 21728;
 }
 
 function OPL3_ProcessSlot($0) {
  var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $9 = HEAP32[$0 >> 2];
  $5 = HEAPU8[$9 + 40 | 0];
  label$1 : {
   if ($5) {
    $2 = HEAP16[$0 + 8 >> 1];
    $5 = $2 + HEAP16[$0 + 16 >> 1] >> 9 - $5;
    break label$1;
   }
   $2 = HEAPU16[$0 + 8 >> 1];
   $5 = 0;
  }
  HEAP16[$0 + 16 >> 1] = $2;
  HEAP16[$0 + 10 >> 1] = $5;
  $1 = HEAPU16[$0 + 18 >> 1];
  $12 = HEAPU8[HEAP32[$0 + 28 >> 2]] + ($1 + (HEAPU8[$0 + 37 | 0] << 2) + (HEAPU8[$0 + 25 | 0] >>> HEAPU8[HEAPU8[$0 + 36 | 0] + 1088 | 0]) | 0) | 0;
  HEAP16[$0 + 20 >> 1] = $12;
  $10 = HEAPU8[$0 + 43 | 0];
  $4 = HEAPU8[$0 + 23 | 0];
  $5 = !$10 | ($4 | 0) != 3;
  label$3 : {
   label$4 : {
    if (!$5) {
     $2 = 1;
     $3 = HEAPU8[$0 + 38 | 0];
     break label$4;
    }
    $2 = 0;
    label$6 : {
     switch ($4 | 0) {
     case 0:
      $3 = HEAPU8[$0 + 38 | 0];
      $4 = 0;
      break label$3;
     case 1:
      $3 = HEAPU8[$0 + 39 | 0];
      $4 = 1;
      break label$3;
     case 2:
      $4 = 2;
      if (HEAPU8[$0 + 33 | 0]) {
       break label$3
      }
      $3 = HEAPU8[$0 + 41 | 0];
      break label$3;
     case 3:
      break label$6;
     default:
      break label$3;
     };
    }
    $3 = HEAPU8[$0 + 41 | 0];
   }
   $4 = 3;
  }
  HEAP32[$0 + 44 >> 2] = $2;
  $7 = HEAPU8[$9 + 43 | 0] >>> ((HEAPU8[$0 + 34 | 0] ^ 1) << 1) | 0;
  $2 = $7 + ($3 << 2) | 0;
  $8 = $2 & 64 ? 15 : ($2 & 252) >>> 2 | 0;
  $2 = HEAP32[$0 + 4 >> 2];
  $13 = $5 ^ 1;
  label$11 : {
   if (!($3 & 255)) {
    break label$11
   }
   if ($8 >>> 0 <= 11) {
    if (!HEAPU8[$2 + 3041 | 0]) {
     break label$11
    }
    label$13 : {
     switch ((HEAPU8[$2 + 3042 | 0] + $8 & 255) - 12 | 0) {
     case 0:
      $6 = 1;
      break label$11;
     case 1:
      $6 = $7 >>> 1 & 1;
      break label$11;
     case 2:
      break label$13;
     default:
      break label$11;
     };
    }
    $6 = $7 & 1;
    break label$11;
   }
   $3 = HEAPU8[(HEAPU8[$2 + 3043 | 0] + (($7 & 3) << 2) | 0) + 1104 | 0] + ($8 & 3) | 0;
   $6 = $3 & 4 ? 3 : $3;
   if ($6 & 255) {
    break label$11
   }
   $6 = HEAPU8[$2 + 3041 | 0];
  }
  $3 = $5 ? $1 : ($8 | 0) != 15 ? $1 : 0;
  $7 = $1 & 504;
  $3 = ($7 | 0) != 504 ? $3 : $4 ? ($13 ? $3 : 511) : $3;
  label$16 : {
   label$17 : {
    switch ($4 | 0) {
    case 0:
     if (!$1) {
      HEAP8[$0 + 23 | 0] = 1;
      break label$16;
     }
     if (!$10) {
      break label$16
     }
     if (!($6 & 255)) {
      break label$16
     }
     if (($8 | 0) == 15) {
      break label$16
     }
     $11 = $1 >>> 4 - ($6 & 255) ^ -1;
     break label$16;
    case 1:
     if (HEAPU8[$0 + 40 | 0] == ($1 >>> 4 | 0)) {
      HEAP8[$0 + 23 | 0] = 2;
      break label$16;
     }
     if ($5 ^ 1 | ($7 | 0) == 504) {
      break label$16
     }
     $1 = $6 & 255;
     if (!$1) {
      break label$16
     }
     $11 = 1 << $1 - 1;
     break label$16;
    case 2:
    case 3:
     break label$17;
    default:
     break label$16;
    };
   }
   if ($5 ^ 1 | ($7 | 0) == 504) {
    break label$16
   }
   $1 = $6 & 255;
   if (!$1) {
    break label$16
   }
   $11 = 1 << $1 - 1;
  }
  HEAP16[$0 + 18 >> 1] = $3 + $11 & 511;
  if (!(($13 ^ 1) & ($10 | 0) != 0)) {
   HEAP8[$0 + 23 | 0] = $10 ? 0 : 3
  }
  $4 = HEAPU16[$9 + 34 >> 1];
  if (HEAPU8[$0 + 32 | 0]) {
   $1 = HEAPU8[$2 + 3047 | 0];
   $3 = ($1 & 3 ? ($4 >>> 7 & 7) >>> ($1 & 1) | 0 : 0) >>> HEAPU8[$2 + 3048 | 0] | 0;
   $4 = ($1 & 4 ? 0 - $3 | 0 : $3) + $4 | 0;
  }
  $1 = HEAP32[$0 + 48 >> 2];
  $3 = $1 >>> 9 | 0;
  HEAP16[$0 + 52 >> 1] = $3;
  HEAP32[$0 + 48 >> 2] = (Math_imul(HEAPU8[HEAPU8[$0 + 35 | 0] + 1120 | 0], ($4 & 65535) << HEAPU8[$9 + 38 | 0] >> 1) >>> 1 | 0) + ($5 ? $1 : 0);
  label$24 : {
   label$25 : {
    label$26 : {
     $4 = HEAPU8[$0 + 54 | 0];
     switch ($4 - 13 | 0) {
     case 4:
      break label$25;
     case 0:
      break label$26;
     default:
      break label$24;
     };
    }
    HEAP8[$2 + 3079 | 0] = $1 >>> 17 & 1;
    HEAP8[$2 + 3078 | 0] = $1 >>> 16 & 1;
    HEAP8[$2 + 3077 | 0] = $1 >>> 12 & 1;
    HEAP8[$2 + 3076 | 0] = $1 >>> 11 & 1;
    break label$24;
   }
   if (!(HEAPU8[$2 + 3046 | 0] & 32)) {
    break label$24
   }
   HEAP8[$2 + 3081 | 0] = $1 >>> 14 & 1;
   HEAP8[$2 + 3080 | 0] = $1 >>> 12 & 1;
  }
  $5 = HEAP32[$2 + 3052 >> 2];
  label$27 : {
   if (!(HEAPU8[$2 + 3046 | 0] & 32)) {
    break label$27
   }
   $1 = HEAPU8[$2 + 3081 | 0];
   $1 = $1 ^ HEAPU8[$2 + 3077 | 0] | HEAPU8[$2 + 3078 | 0] ^ HEAPU8[$2 + 3076 | 0] | $1 ^ HEAPU8[$2 + 3080 | 0];
   label$28 : {
    label$29 : {
     switch ($4 - 13 | 0) {
     case 0:
      $4 = $1 << 9;
      $3 = $4 | 208;
      if (($5 & 1) != ($1 & 255)) {
       break label$28
      }
      $3 = $4 | 52;
      break label$28;
     case 3:
      $1 = HEAPU8[$2 + 3079 | 0];
      $3 = ($1 ^ $5 & 1) << 8 | $1 << 9;
      break label$28;
     case 4:
      break label$29;
     default:
      break label$27;
     };
    }
    $3 = $1 << 9 | 128;
   }
   HEAP16[$0 + 52 >> 1] = $3;
  }
  HEAP32[$2 + 3052 >> 2] = ($5 ^ $5 >>> 14) << 22 & 4194304 | $5 >>> 1;
  (wasm2js_i32$0 = $0, wasm2js_i32$1 = FUNCTION_TABLE[HEAP32[(HEAPU8[$0 + 42 | 0] << 2) + 1136 >> 2]]($3 + HEAPU16[HEAP32[$0 + 12 >> 2] >> 1] & 65535, $12 & 65535) | 0), HEAP16[wasm2js_i32$0 + 8 >> 1] = wasm2js_i32$1;
 }
 
 function OPL3_WriteReg($0, $1) {
  var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0;
  $2 = $0 >>> 8 & 1;
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : {
      label$5 : {
       label$6 : {
        label$7 : {
         label$8 : {
          label$9 : {
           label$10 : {
            $0 = $0 & 255;
            switch ($0 >>> 4 | 0) {
            case 0:
             break label$10;
            case 12:
             break label$2;
            case 11:
             break label$3;
            case 10:
             break label$4;
            case 14:
            case 15:
             break label$5;
            case 8:
            case 9:
             break label$6;
            case 6:
            case 7:
             break label$7;
            case 4:
            case 5:
             break label$8;
            case 2:
            case 3:
             break label$9;
            default:
             break label$1;
            };
           }
           $0 = $0 & 15;
           if ($2) {
            label$12 : {
             switch ($0 - 4 | 0) {
             case 0:
              while (1) {
               $0 = ($6 >>> 0 > 2 ? $10 + 6 | 0 : $6) & 255;
               $2 = $0 + 3 | 0;
               $4 = Math_imul($0, 56) + 2208 | 0;
               $7 = $4 + 32 | 0;
               label$22 : {
                if ($1 >>> $6 & 1) {
                 $0 = HEAP32[$4 + 8 >> 2];
                 $8 = HEAPU8[$4 + 38 | 0];
                 HEAP8[$0 + 38 | 0] = $8;
                 $3 = HEAPU16[$4 + 34 >> 1];
                 HEAP16[$0 + 34 >> 1] = $3;
                 $5 = HEAP32[$0 >> 2];
                 $9 = $5;
                 $5 = HEAP32[$5 >> 2];
                 $5 = ((HEAPU8[(HEAPU16[$5 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$5 + 38 | 0] << 5) | 0) - 256 | 0;
                 HEAP8[$9 + 25 | 0] = ($5 | 0) > 0 ? $5 : 0;
                 HEAP8[$7 | 0] = 1;
                 HEAP8[(Math_imul($2, 56) + 2208 | 0) + 32 | 0] = 2;
                 HEAP8[$0 + 43 | 0] = $3 >>> 9 - HEAPU8[HEAP32[$0 + 12 >> 2] + 3045 | 0] & 1 | $8 << 1;
                 $2 = HEAP32[$0 + 4 >> 2];
                 $3 = $2;
                 $2 = HEAP32[$2 >> 2];
                 $2 = ((HEAPU8[(HEAPU16[$2 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$2 + 38 | 0] << 5) | 0) - 256 | 0;
                 HEAP8[$3 + 25 | 0] = ($2 | 0) > 0 ? $2 : 0;
                 HEAP8[$0 + 42 | 0] = HEAPU8[$0 + 41 | 0] | HEAPU8[$4 + 41 | 0] << 1 | 4;
                 HEAP8[$4 + 42 | 0] = 8;
                 OPL3_ChannelSetupAlg($0);
                 break label$22;
                }
                $0 = Math_imul($2, 56) + 2208 | 0;
                $2 = HEAPU8[$0 + 39 | 0];
                HEAP8[$0 + 38 | 0] = $2;
                $8 = HEAPU16[$0 + 36 >> 1];
                HEAP16[$0 + 34 >> 1] = $8;
                $3 = HEAP32[$0 >> 2];
                $5 = $3;
                $3 = HEAP32[$3 >> 2];
                $3 = ((HEAPU8[(HEAPU16[$3 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$3 + 38 | 0] << 5) | 0) - 256 | 0;
                HEAP8[$5 + 25 | 0] = ($3 | 0) > 0 ? $3 : 0;
                HEAP8[$7 | 0] = 0;
                HEAP8[$0 + 32 | 0] = 0;
                HEAP8[$0 + 43 | 0] = $8 >>> 9 - HEAPU8[HEAP32[$0 + 12 >> 2] + 3045 | 0] & 1 | $2 << 1;
                $2 = HEAP32[$0 + 4 >> 2];
                $3 = $2;
                $2 = HEAP32[$2 >> 2];
                $2 = ((HEAPU8[(HEAPU16[$2 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$2 + 38 | 0] << 5) | 0) - 256 | 0;
                HEAP8[$3 + 25 | 0] = ($2 | 0) > 0 ? $2 : 0;
                HEAP8[$4 + 42 | 0] = HEAPU8[$4 + 41 | 0];
                OPL3_ChannelSetupAlg($4);
                $4 = HEAPU8[$0 + 41 | 0];
                HEAP8[$0 + 42 | 0] = $4;
                $2 = $0 + 42 | 0;
                label$43 : {
                 switch (HEAPU8[$0 + 32 | 0] - 1 | 0) {
                 case 0:
                  $0 = HEAP32[$0 + 8 >> 2];
                  HEAP8[$0 + 42 | 0] = HEAPU8[$0 + 41 | 0] | $4 << 1 | 4;
                  HEAP8[$2 | 0] = 8;
                  OPL3_ChannelSetupAlg($0);
                  break label$22;
                 case 1:
                  $7 = HEAP32[$0 + 8 >> 2];
                  HEAP8[$2 | 0] = HEAPU8[$7 + 41 | 0] << 1 | $4 | 4;
                  HEAP8[$7 + 42 | 0] = 8;
                  break;
                 default:
                  break label$43;
                 };
                }
                OPL3_ChannelSetupAlg($0);
               }
               $10 = $10 + 1 | 0;
               $6 = $6 + 1 | 0;
               if (($6 | 0) != 6) {
                continue
               }
               break;
              };
              return;
             case 1:
              break label$12;
             default:
              break label$1;
             };
            }
            HEAP8[5252] = $1 & 1;
            return;
           }
           if (($0 | 0) != 8) {
            break label$1
           }
           HEAP8[5253] = $1 >>> 6 & 1;
           return;
          }
          if (!(4144959 >>> $0 & 1)) {
           break label$1
          }
          $0 = Math_imul(HEAP8[($0 & 31) + 1056 | 0] + Math_imul($2, 18) | 0, 56) + 2208 | 0;
          HEAP8[$0 + 1043 | 0] = $1 & 15;
          HEAP8[$0 + 1042 | 0] = $1 >>> 4 & 1;
          HEAP8[$0 + 1041 | 0] = $1 >>> 5 & 1;
          HEAP8[$0 + 1040 | 0] = $1 >>> 6 & 1;
          HEAP32[$0 + 1036 >> 2] = HEAP32[$0 + 1012 >> 2] + ($1 << 24 >> 24 < 0 ? 3049 : 3056);
          return;
         }
         if (!(4144959 >>> $0 & 1)) {
          break label$1
         }
         $0 = Math_imul(HEAP8[($0 & 31) + 1056 | 0] + Math_imul($2, 18) | 0, 56) + 2208 | 0;
         HEAP8[$0 + 1045 | 0] = $1 & 63;
         HEAP8[$0 + 1044 | 0] = $1 >>> 6;
         $1 = $0 + 1033 | 0;
         $0 = HEAP32[$0 + 1008 >> 2];
         $0 = ((HEAPU8[(HEAPU16[$0 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$0 + 38 | 0] << 5) | 0) - 256 | 0;
         HEAP8[$1 | 0] = ($0 | 0) > 0 ? $0 : 0;
         return;
        }
        if (!(4144959 >>> $0 & 1)) {
         break label$1
        }
        $0 = Math_imul(HEAP8[($0 & 31) + 1056 | 0] + Math_imul($2, 18) | 0, 56) + 2208 | 0;
        HEAP8[$0 + 1047 | 0] = $1 & 15;
        HEAP8[$0 + 1046 | 0] = $1 >>> 4;
        return;
       }
       if (!(4144959 >>> $0 & 1)) {
        break label$1
       }
       $0 = Math_imul(HEAP8[($0 & 31) + 1056 | 0] + Math_imul($2, 18) | 0, 56) + 2208 | 0;
       HEAP8[$0 + 1049 | 0] = $1 & 15;
       $3 = $0 + 1048 | 0;
       $0 = $1 >>> 4 | 0;
       HEAP8[$3 | 0] = ($0 | 0) == 15 ? 31 : $0;
       return;
      }
      if (!(4144959 >>> $0 & 1)) {
       break label$1
      }
      $0 = Math_imul(HEAP8[($0 & 31) + 1056 | 0] + Math_imul($2, 18) | 0, 56) + 2208 | 0;
      $4 = $0 + 1050 | 0;
      HEAP8[$4 | 0] = $1 & 7;
      if (HEAPU8[HEAP32[$0 + 1012 >> 2] + 3044 | 0]) {
       break label$1
      }
      HEAP8[$4 | 0] = $1 & 3;
      return;
     }
     $0 = $0 & 15;
     if ($0 >>> 0 > 8) {
      break label$1
     }
     $5 = Math_imul($2, 9) + $0 | 0;
     $0 = Math_imul($5, 56) + 2208 | 0;
     $1 = $1 | HEAPU16[$0 + 36 >> 1] & 768;
     HEAP16[$0 + 36 >> 1] = $1;
     $2 = HEAPU8[$0 + 32 | 0];
     if (($2 | 0) == 2) {
      break label$1
     }
     $4 = HEAPU8[$0 + 39 | 0];
     HEAP8[$0 + 38 | 0] = $4;
     HEAP16[$0 + 34 >> 1] = $1;
     $3 = HEAP32[$0 >> 2];
     $9 = $3;
     $3 = HEAP32[$3 >> 2];
     $3 = ((HEAPU8[(HEAPU16[$3 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$3 + 38 | 0] << 5) | 0) - 256 | 0;
     HEAP8[$9 + 25 | 0] = ($3 | 0) > 0 ? $3 : 0;
     $3 = $4 << 1;
     HEAP8[$0 + 43 | 0] = $3 | $1 >>> 9 - HEAPU8[HEAP32[$0 + 12 >> 2] + 3045 | 0] & 1;
     $0 = HEAP32[$0 + 4 >> 2];
     $9 = $0;
     $0 = HEAP32[$0 >> 2];
     $0 = ((HEAPU8[(HEAPU16[$0 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$0 + 38 | 0] << 5) | 0) - 256 | 0;
     HEAP8[$9 + 25 | 0] = ($0 | 0) > 0 ? $0 : 0;
     if (($2 | 0) != 1) {
      break label$1
     }
     $0 = HEAP32[(Math_imul($5, 56) + 2208 | 0) + 8 >> 2];
     HEAP8[$0 + 38 | 0] = $4;
     HEAP16[$0 + 34 >> 1] = $1;
     $4 = HEAP32[$0 >> 2];
     $2 = $4;
     $4 = HEAP32[$4 >> 2];
     $4 = ((HEAPU8[(HEAPU16[$4 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$4 + 38 | 0] << 5) | 0) - 256 | 0;
     HEAP8[$2 + 25 | 0] = ($4 | 0) > 0 ? $4 : 0;
     HEAP8[$0 + 43 | 0] = $3 | $1 >>> 9 - HEAPU8[HEAP32[$0 + 12 >> 2] + 3045 | 0] & 1;
     $0 = HEAP32[$0 + 4 >> 2];
     $1 = $0;
     $0 = HEAP32[$0 >> 2];
     $0 = ((HEAPU8[(HEAPU16[$0 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$0 + 38 | 0] << 5) | 0) - 256 | 0;
     HEAP8[$1 + 25 | 0] = ($0 | 0) > 0 ? $0 : 0;
     return;
    }
    label$14 : {
     if (($0 | 0) != 189) {
      break label$14
     }
     if ($2) {
      break label$14
     }
     HEAP8[5254] = $1 & 63;
     $0 = $1 >>> 6 ^ -1;
     HEAP8[5256] = $0 & 1;
     HEAP8[5259] = ($0 & 2) + 2;
     if (!($1 & 32)) {
      HEAP8[2576] = 0;
      OPL3_ChannelSetupAlg(2544);
      $0 = HEAP32[636];
      HEAP8[$0 + 43 | 0] = HEAPU8[$0 + 43 | 0] & 253;
      HEAP8[2632] = 0;
      $0 = HEAP32[637];
      HEAP8[$0 + 43 | 0] = HEAPU8[$0 + 43 | 0] & 253;
      OPL3_ChannelSetupAlg(2600);
      $0 = HEAP32[650];
      HEAP8[$0 + 43 | 0] = HEAPU8[$0 + 43 | 0] & 253;
      HEAP8[2688] = 0;
      $0 = HEAP32[651];
      HEAP8[$0 + 43 | 0] = HEAPU8[$0 + 43 | 0] & 253;
      OPL3_ChannelSetupAlg(2656);
      $0 = HEAP32[664];
      HEAP8[$0 + 43 | 0] = HEAPU8[$0 + 43 | 0] & 253;
      $0 = HEAP32[665];
      HEAP8[$0 + 43 | 0] = HEAPU8[$0 + 43 | 0] & 253;
      return;
     }
     HEAP32[643] = 5264;
     HEAP32[642] = 5264;
     HEAP8[2688] = 3;
     HEAP8[2632] = 3;
     HEAP8[2576] = 3;
     $0 = HEAP32[650] + 8 | 0;
     HEAP32[655] = $0;
     HEAP32[654] = $0;
     $0 = HEAP32[664] + 8 | 0;
     HEAP32[669] = $0;
     HEAP32[668] = $0;
     $0 = HEAP32[637] + 8 | 0;
     HEAP32[641] = $0;
     HEAP32[640] = $0;
     $0 = HEAP32[651] + 8 | 0;
     HEAP32[657] = $0;
     HEAP32[656] = $0;
     $0 = HEAP32[665] + 8 | 0;
     HEAP32[671] = $0;
     HEAP32[670] = $0;
     OPL3_ChannelSetupAlg(2544);
     OPL3_ChannelSetupAlg(2600);
     OPL3_ChannelSetupAlg(2656);
     $0 = HEAP32[650];
     $1 = $0;
     $3 = HEAPU8[$0 + 43 | 0] & 253;
     $0 = HEAPU8[5254];
     HEAP8[$1 + 43 | 0] = $3 | $0 << 1 & 2;
     $2 = HEAP32[665];
     HEAP8[$2 + 43 | 0] = HEAPU8[$2 + 43 | 0] & 253 | $0 & 2;
     $2 = HEAP32[664];
     HEAP8[$2 + 43 | 0] = HEAPU8[$2 + 43 | 0] & 253 | $0 >>> 1 & 2;
     $1 = HEAP32[651];
     HEAP8[$1 + 43 | 0] = HEAPU8[$1 + 43 | 0] & 253 | $0 >>> 2 & 2;
     $1 = HEAP32[636];
     $2 = HEAPU8[$1 + 43 | 0];
     if ($0 & 16) {
      HEAP8[$1 + 43 | 0] = $2 | 2;
      $0 = HEAP32[637];
      HEAP8[$0 + 43 | 0] = HEAPU8[$0 + 43 | 0] | 2;
      return;
     }
     HEAP8[$1 + 43 | 0] = $2 & 253;
     $0 = HEAP32[637];
     HEAP8[$0 + 43 | 0] = HEAPU8[$0 + 43 | 0] & 253;
     return;
    }
    $0 = $0 & 15;
    if ($0 >>> 0 > 8) {
     break label$1
    }
    $0 = Math_imul(Math_imul($2, 9) + $0 | 0, 56) + 2208 | 0;
    $5 = $1 >>> 2 & 7;
    HEAP8[$0 + 39 | 0] = $5;
    $2 = HEAPU8[$0 + 36 | 0] | $1 << 8 & 768;
    HEAP16[$0 + 36 >> 1] = $2;
    $7 = HEAPU8[$0 + 32 | 0];
    label$15 : {
     if (($7 | 0) == 2) {
      break label$15
     }
     HEAP8[$0 + 38 | 0] = $5;
     HEAP16[$0 + 34 >> 1] = $2;
     $3 = HEAP32[$0 >> 2];
     $4 = $3;
     $3 = HEAP32[$3 >> 2];
     $3 = ((HEAPU8[(HEAPU16[$3 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$3 + 38 | 0] << 5) | 0) - 256 | 0;
     HEAP8[$4 + 25 | 0] = ($3 | 0) > 0 ? $3 : 0;
     $6 = $5 << 1;
     HEAP8[$0 + 43 | 0] = $6 | $2 >>> 9 - HEAPU8[HEAP32[$0 + 12 >> 2] + 3045 | 0] & 1;
     $3 = HEAP32[$0 + 4 >> 2];
     $4 = $3;
     $3 = HEAP32[$3 >> 2];
     $3 = ((HEAPU8[(HEAPU16[$3 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$3 + 38 | 0] << 5) | 0) - 256 | 0;
     HEAP8[$4 + 25 | 0] = ($3 | 0) > 0 ? $3 : 0;
     if (($7 | 0) != 1) {
      break label$15
     }
     $4 = HEAP32[$0 + 8 >> 2];
     HEAP8[$4 + 38 | 0] = $5;
     HEAP16[$4 + 34 >> 1] = $2;
     $5 = HEAP32[$4 >> 2];
     $3 = $5;
     $5 = HEAP32[$5 >> 2];
     $5 = ((HEAPU8[(HEAPU16[$5 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$5 + 38 | 0] << 5) | 0) - 256 | 0;
     HEAP8[$3 + 25 | 0] = ($5 | 0) > 0 ? $5 : 0;
     HEAP8[$4 + 43 | 0] = $6 | $2 >>> 9 - HEAPU8[HEAP32[$4 + 12 >> 2] + 3045 | 0] & 1;
     $4 = HEAP32[$4 + 4 >> 2];
     $3 = $4;
     $4 = HEAP32[$4 >> 2];
     $4 = ((HEAPU8[(HEAPU16[$4 + 34 >> 1] >>> 6 | 0) + 2192 | 0] << 2) + (HEAPU8[$4 + 38 | 0] << 5) | 0) - 256 | 0;
     HEAP8[$3 + 25 | 0] = ($4 | 0) > 0 ? $4 : 0;
    }
    if ($1 & 32) {
     label$16 : {
      switch (HEAPU8[$0 + 32 | 0]) {
      case 1:
       $1 = HEAP32[$0 >> 2];
       HEAP8[$1 + 43 | 0] = HEAPU8[$1 + 43 | 0] | 1;
       $1 = HEAP32[$0 + 4 >> 2];
       HEAP8[$1 + 43 | 0] = HEAPU8[$1 + 43 | 0] | 1;
       $0 = HEAP32[$0 + 8 >> 2];
      case 0:
      case 3:
       $1 = HEAP32[$0 >> 2];
       HEAP8[$1 + 43 | 0] = HEAPU8[$1 + 43 | 0] | 1;
       $0 = HEAP32[$0 + 4 >> 2];
       HEAP8[$0 + 43 | 0] = HEAPU8[$0 + 43 | 0] | 1;
       break;
      default:
       break label$16;
      };
     }
     return;
    }
    label$17 : {
     switch (HEAPU8[$0 + 32 | 0]) {
     case 1:
      $1 = HEAP32[$0 >> 2];
      HEAP8[$1 + 43 | 0] = HEAPU8[$1 + 43 | 0] & 254;
      $1 = HEAP32[$0 + 4 >> 2];
      HEAP8[$1 + 43 | 0] = HEAPU8[$1 + 43 | 0] & 254;
      $0 = HEAP32[$0 + 8 >> 2];
     case 0:
     case 3:
      $1 = HEAP32[$0 >> 2];
      HEAP8[$1 + 43 | 0] = HEAPU8[$1 + 43 | 0] & 254;
      $0 = HEAP32[$0 + 4 >> 2];
      HEAP8[$0 + 43 | 0] = HEAPU8[$0 + 43 | 0] & 254;
      break;
     default:
      break label$17;
     };
    }
    return;
   }
   $0 = $0 & 15;
   if ($0 >>> 0 > 8) {
    break label$1
   }
   $5 = Math_imul($2, 9) + $0 | 0;
   $0 = Math_imul($5, 56) + 2208 | 0;
   $2 = $1 & 1;
   HEAP8[$0 + 42 | 0] = $2;
   HEAP8[$0 + 41 | 0] = $2;
   HEAP8[$0 + 40 | 0] = $1 >>> 1 & 7;
   $4 = $0 + 42 | 0;
   label$18 : {
    label$19 : {
     switch (HEAPU8[$0 + 32 | 0] - 1 | 0) {
     case 0:
      $0 = HEAP32[$0 + 8 >> 2];
      HEAP8[$0 + 42 | 0] = HEAPU8[$0 + 41 | 0] | $2 << 1 | 4;
      HEAP8[$4 | 0] = 8;
      OPL3_ChannelSetupAlg($0);
      break label$18;
     case 1:
      $3 = HEAP32[$0 + 8 >> 2];
      HEAP8[$4 | 0] = $2 | HEAPU8[$3 + 41 | 0] << 1 | 4;
      HEAP8[$3 + 42 | 0] = 8;
      break;
     default:
      break label$19;
     };
    }
    OPL3_ChannelSetupAlg($0);
   }
   $0 = Math_imul($5, 56) + 2208 | 0;
   label$226 : {
    if (!HEAPU8[HEAP32[$0 + 12 >> 2] + 3044 | 0]) {
     $4 = 0;
     $2 = 65535;
     $5 = 0;
     $1 = 65535;
     break label$226;
    }
    $4 = $1 << 24 >> 24 >> 7;
    $5 = $1 << 25 >> 31;
    $2 = $1 << 26 >> 31;
    $1 = $1 << 27 >> 31;
   }
   HEAP16[$0 + 50 >> 1] = $4;
   HEAP16[$0 + 44 >> 1] = $1;
   HEAP16[$0 + 46 >> 1] = $2;
   HEAP16[$0 + 48 >> 1] = $5;
  }
 }
 
 function OPL3_ChannelSetupAlg($0) {
  var $1 = 0, $2 = 0, $3 = 0;
  if (HEAPU8[$0 + 32 | 0] == 3) {
   if ((HEAPU8[$0 + 52 | 0] - 7 & 255) >>> 0 <= 1) {
    $1 = HEAP32[$0 + 12 >> 2] + 3056 | 0;
    HEAP32[HEAP32[$0 >> 2] + 12 >> 2] = $1;
    HEAP32[HEAP32[$0 + 4 >> 2] + 12 >> 2] = $1;
    return;
   }
   $1 = HEAP32[$0 >> 2];
   HEAP32[$1 + 12 >> 2] = $1 + 10;
   if (!(HEAP8[$0 + 42 | 0] & 1)) {
    HEAP32[HEAP32[$0 + 4 >> 2] + 12 >> 2] = HEAP32[$0 >> 2] + 8;
    return;
   }
   HEAP32[HEAP32[$0 + 4 >> 2] + 12 >> 2] = HEAP32[$0 + 12 >> 2] + 3056;
   return;
  }
  $1 = HEAPU8[$0 + 42 | 0];
  if (!($1 & 8)) {
   if ($1 & 4) {
    HEAP32[HEAP32[$0 + 8 >> 2] + 16 >> 2] = HEAP32[$0 + 12 >> 2] + 3056;
    HEAP32[HEAP32[$0 + 8 >> 2] + 20 >> 2] = HEAP32[$0 + 12 >> 2] + 3056;
    HEAP32[HEAP32[$0 + 8 >> 2] + 24 >> 2] = HEAP32[$0 + 12 >> 2] + 3056;
    HEAP32[HEAP32[$0 + 8 >> 2] + 28 >> 2] = HEAP32[$0 + 12 >> 2] + 3056;
    $2 = HEAP32[$0 + 8 >> 2];
    $3 = HEAP32[$2 >> 2];
    HEAP32[$3 + 12 >> 2] = $3 + 10;
    $3 = HEAP32[$2 + 4 >> 2];
    label$6 : {
     switch (($1 & 3) - 1 | 0) {
     default:
      HEAP32[$3 + 12 >> 2] = HEAP32[$2 >> 2] + 8;
      HEAP32[HEAP32[$0 >> 2] + 12 >> 2] = HEAP32[$2 + 4 >> 2] + 8;
      HEAP32[HEAP32[$0 + 4 >> 2] + 12 >> 2] = HEAP32[$0 >> 2] + 8;
      $1 = HEAP32[$0 + 12 >> 2] + 3056 | 0;
      HEAP32[$0 + 28 >> 2] = $1;
      HEAP32[$0 + 24 >> 2] = $1;
      HEAP32[$0 + 20 >> 2] = $1;
      HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 4 >> 2] + 8;
      return;
     case 0:
      HEAP32[$3 + 12 >> 2] = HEAP32[$2 >> 2] + 8;
      $1 = HEAP32[$0 + 12 >> 2] + 3056 | 0;
      HEAP32[HEAP32[$0 >> 2] + 12 >> 2] = $1;
      HEAP32[HEAP32[$0 + 4 >> 2] + 12 >> 2] = HEAP32[$0 >> 2] + 8;
      $2 = HEAP32[$2 + 4 >> 2];
      HEAP32[$0 + 24 >> 2] = $1;
      HEAP32[$0 + 28 >> 2] = $1;
      HEAP32[$0 + 16 >> 2] = $2 + 8;
      HEAP32[$0 + 20 >> 2] = HEAP32[$0 + 4 >> 2] + 8;
      return;
     case 1:
      $1 = HEAP32[$0 + 12 >> 2] + 3056 | 0;
      HEAP32[$3 + 12 >> 2] = $1;
      HEAP32[HEAP32[$0 >> 2] + 12 >> 2] = HEAP32[$2 + 4 >> 2] + 8;
      HEAP32[HEAP32[$0 + 4 >> 2] + 12 >> 2] = HEAP32[$0 >> 2] + 8;
      $2 = HEAP32[$2 >> 2];
      HEAP32[$0 + 24 >> 2] = $1;
      HEAP32[$0 + 28 >> 2] = $1;
      HEAP32[$0 + 16 >> 2] = $2 + 8;
      HEAP32[$0 + 20 >> 2] = HEAP32[$0 + 4 >> 2] + 8;
      return;
     case 2:
      break label$6;
     };
    }
    $1 = HEAP32[$0 + 12 >> 2] + 3056 | 0;
    HEAP32[$3 + 12 >> 2] = $1;
    HEAP32[HEAP32[$0 >> 2] + 12 >> 2] = HEAP32[$2 + 4 >> 2] + 8;
    HEAP32[HEAP32[$0 + 4 >> 2] + 12 >> 2] = $1;
    $2 = HEAP32[$2 >> 2];
    HEAP32[$0 + 28 >> 2] = $1;
    HEAP32[$0 + 16 >> 2] = $2 + 8;
    HEAP32[$0 + 24 >> 2] = HEAP32[$0 + 4 >> 2] + 8;
    HEAP32[$0 + 20 >> 2] = HEAP32[$0 >> 2] + 8;
    return;
   }
   $2 = HEAP32[$0 >> 2];
   HEAP32[$2 + 12 >> 2] = $2 + 10;
   if (!($1 & 1)) {
    HEAP32[HEAP32[$0 + 4 >> 2] + 12 >> 2] = HEAP32[$0 >> 2] + 8;
    $1 = HEAP32[$0 + 12 >> 2] + 3056 | 0;
    HEAP32[$0 + 28 >> 2] = $1;
    HEAP32[$0 + 24 >> 2] = $1;
    HEAP32[$0 + 20 >> 2] = $1;
    HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 4 >> 2] + 8;
    return;
   }
   $1 = HEAP32[$0 + 12 >> 2] + 3056 | 0;
   HEAP32[HEAP32[$0 + 4 >> 2] + 12 >> 2] = $1;
   HEAP32[$0 + 28 >> 2] = $1;
   HEAP32[$0 + 24 >> 2] = $1;
   HEAP32[$0 + 16 >> 2] = HEAP32[$0 >> 2] + 8;
   HEAP32[$0 + 20 >> 2] = HEAP32[$0 + 4 >> 2] + 8;
  }
 }
 
 function OPL3_EnvelopeCalcSin0($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $2 = 0;
  $2 = $1 << 3;
  $1 = $0 & 255;
  $1 = $2 + HEAPU16[(($0 & 256 ? $1 ^ 255 : $1) << 1) + 1168 >> 1] | 0;
  $1 = $1 >>> 0 >= 8191 ? 8191 : $1;
  return (HEAPU16[(($1 & 255) << 1) + 1680 >> 1] << 1 >>> ($1 >>> 8) ^ (($0 & 1023) >>> 0 > 511 ? -1 : 0)) << 16 >> 16;
 }
 
 function OPL3_EnvelopeCalcSin1($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $2 = 0;
  $2 = 4096;
  $0 = $0 & 1023;
  if ($0 >>> 0 <= 511) {
   $2 = HEAPU16[(($0 >>> 0 < 256 ? $0 : ($0 ^ -1) & 255) << 1) + 1168 >> 1]
  }
  $2 = $2 + ($1 << 3) | 0;
  $2 = $2 >>> 0 >= 8191 ? 8191 : $2;
  return HEAPU16[(($2 & 255) << 1) + 1680 >> 1] << 1 >>> ($2 >>> 8) << 16 >> 16;
 }
 
 function OPL3_EnvelopeCalcSin2($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $2 = 0;
  $2 = $1 << 3;
  $1 = $0 & 255;
  $0 = $2 + HEAPU16[(($0 & 256 ? $1 ^ 255 : $1) << 1) + 1168 >> 1] | 0;
  $0 = $0 >>> 0 >= 8191 ? 8191 : $0;
  return HEAPU16[(($0 & 255) << 1) + 1680 >> 1] << 1 >>> ($0 >>> 8) << 16 >> 16;
 }
 
 function OPL3_EnvelopeCalcSin3($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $2 = 0;
  $2 = 4096;
  if (!($0 & 256)) {
   $2 = HEAPU16[(($0 & 255) << 1) + 1168 >> 1]
  }
  $0 = $2 + ($1 << 3) | 0;
  $0 = $0 >>> 0 >= 8191 ? 8191 : $0;
  return HEAPU16[(($0 & 255) << 1) + 1680 >> 1] << 1 >>> ($0 >>> 8) << 16 >> 16;
 }
 
 function OPL3_EnvelopeCalcSin4($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $2 = 0;
  $2 = 4096;
  $0 = $0 & 1023;
  if ($0 >>> 0 <= 511) {
   $2 = $0 << 1 & 254;
   $2 = HEAPU16[(($0 & 128 ? $2 ^ 254 : $2) << 1) + 1168 >> 1];
  }
  $2 = $2 + ($1 << 3) | 0;
  $2 = $2 >>> 0 >= 8191 ? 8191 : $2;
  return (HEAPU16[(($2 & 255) << 1) + 1680 >> 1] << 1 >>> ($2 >>> 8) ^ (($0 & 768) == 256 ? -1 : 0)) << 16 >> 16;
 }
 
 function OPL3_EnvelopeCalcSin5($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $2 = 0;
  $2 = 4096;
  $0 = $0 & 1023;
  if ($0 >>> 0 <= 511) {
   $2 = $0 << 1 & 254;
   $2 = HEAPU16[(($0 & 128 ? $2 ^ 254 : $2) << 1) + 1168 >> 1];
  }
  $2 = $2 + ($1 << 3) | 0;
  $2 = $2 >>> 0 >= 8191 ? 8191 : $2;
  return HEAPU16[(($2 & 255) << 1) + 1680 >> 1] << 1 >>> ($2 >>> 8) << 16 >> 16;
 }
 
 function OPL3_EnvelopeCalcSin6($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $1 = $1 << 3;
  $1 = $1 >>> 0 >= 8191 ? 8191 : $1;
  return ($0 << 6 << 16 >> 16 >>> 15 ^ HEAPU16[(($1 & 255) << 1) + 1680 >> 1] << 1 >>> ($1 >>> 8)) << 16 >> 16;
 }
 
 function OPL3_EnvelopeCalcSin7($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $2 = 0, $3 = 0;
  $2 = ($0 ^ -1) & 511;
  $0 = $0 & 1023;
  $3 = $0;
  $0 = $0 >>> 0 > 511;
  $1 = ($1 << 3) + (($0 ? $2 : $3) << 3) | 0;
  $1 = $1 >>> 0 >= 8191 ? 8191 : $1;
  return (HEAPU16[(($1 & 255) << 1) + 1680 >> 1] << 1 >>> ($1 >>> 8) ^ ($0 ? -1 : 0)) << 16 >> 16;
 }
 
 bufferView = HEAPU8;
 initActiveSegments(imports);
 var FUNCTION_TABLE = [null, OPL3_EnvelopeCalcSin0, OPL3_EnvelopeCalcSin1, OPL3_EnvelopeCalcSin2, OPL3_EnvelopeCalcSin3, OPL3_EnvelopeCalcSin4, OPL3_EnvelopeCalcSin5, OPL3_EnvelopeCalcSin6, OPL3_EnvelopeCalcSin7];
 function __wasm_memory_size() {
  return buffer.byteLength / 65536 | 0;
 }
 
 function __wasm_memory_grow(pagesToAdd) {
  pagesToAdd = pagesToAdd | 0;
  var oldPages = __wasm_memory_size() | 0;
  var newPages = oldPages + pagesToAdd | 0;
  if ((oldPages < newPages) && (newPages < 65536)) {
   var newBuffer = new ArrayBuffer(Math_imul(newPages, 65536));
   var newHEAP8 = new Int8Array(newBuffer);
   newHEAP8.set(HEAP8);
   HEAP8 = new Int8Array(newBuffer);
   HEAP16 = new Int16Array(newBuffer);
   HEAP32 = new Int32Array(newBuffer);
   HEAPU8 = new Uint8Array(newBuffer);
   HEAPU16 = new Uint16Array(newBuffer);
   HEAPU32 = new Uint32Array(newBuffer);
   HEAPF32 = new Float32Array(newBuffer);
   HEAPF64 = new Float64Array(newBuffer);
   buffer = newBuffer;
   bufferView = HEAPU8;
  }
  return oldPages;
 }
 
 return {
  "memory": Object.create(Object.prototype, {
   "grow": {
    "value": __wasm_memory_grow
   }, 
   "buffer": {
    "get": function () {
     return buffer;
    }
    
   }
  }), 
  "opl_reset": opl_reset, 
  "opl_write": opl_write, 
  "opl_write_now": opl_write_now, 
  "opl_render": opl_render
 };
}

return asmFunc({});
}
