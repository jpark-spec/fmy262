/* DBOPL (the FM-1's chip) as a plain JS function: opl3/build-dbopl-wasm.sh */
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
    return uint8Array;
  }
function initActiveSegments(imports) {
  base64DecodeToExistingUint8Array(bufferView, 65536, "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5wf9BxMIKAg+CFMIaQh+CJMIqAi9CNII5wj8CBAJJQk5CU4JYgl2CYoJngmyCcYJ2gnuCQEKFQooCjsKTgpiCnUKhwqaCq0KvwrSCuQK9goJCxsLLQs+C1ALYgtzC4ULlgunC7gLyQvaC+sL+wsMDBwMLAw8DE0MXAxsDHwMiwybDKoMuQzIDNcM5gz1DAMNEg0gDS4NPA1KDVgNZg1zDYENjg2bDagNtQ3CDc4N2w3nDfMN/w0LDhcOIw4uDjoORQ5QDlsOZg5xDnsOhg6QDpoOpA6uDrgOwQ7LDtQO3Q7mDu8O+A4BDwkPEQ8ZDyEPKQ8xDzkPQA9HD04PVQ9cD2MPaQ9wD3YPfA+CD4gPjg+TD5gPng+jD6cPrA+xD7UPuQ++D8IPxQ/JD80P0A/TD9YP2Q/cD98P4Q/jD+UP5w/pD+sP7Q/uD+8P8A/xD/IP8w/zD/MP8w/zD/MP8w/zD/IP8Q/wD+8P7g/tD+sP6Q/nD+UP4w/hD98P3A/ZD9YP0w/QD80PyQ/FD8IPvg+5D7UPsQ+sD6cPow+eD5gPkw+OD4gPgg98D3YPcA9pD2MPXA9VD04PRw9ADzkPMQ8pDyEPGQ8RDwkPAQ/4Du8O5g7dDtQOyw7BDrgOrg6kDpoOkA6GDnsOcQ5mDlsOUA5FDjoOLg4jDhcOCw7/DfMN5w3bDc4Nwg21DagNmw2ODYENcw1mDVgNSg08DS4NIA0SDQMN9QzmDNcMyAy5DKoMmwyLDHwMbAxcDE0MPAwsDBwMDAz7C+sL2gvJC7gLpwuWC4ULcwtiC1ALPgstCxsLCQv2CuQK0gq/Cq0KmgqHCnUKYgpOCjsKKAoVCgEK7gnaCcYJsgmeCYoJdgliCU4JOQklCRAJ/AjnCNIIvQioCJMIfghpCFMIPggoCBMI/QfnB9IHvAemB5AHegdjB00HNwchBwoH9AbdBsYGsAaZBoIGawZUBj0GJgYPBvgF4AXJBbIFmgWDBWsFVAU8BSQFDAX1BN0ExQStBJUEfQRlBE0ENQQcBAQE7APUA7sDowOLA3IDWgNBAykDEAP3At8CxgKtApUCfAJjAkoCMgIZAgAC5wHOAbUBnAGDAWoBUQE4AR8BBgHtANQAuwCiAIkAcABXAD4AJQAMAPT/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/w/+//7//v/+7/7v/t/+3/7f/s/+z/6//r/+r/6v/p/+n/6P/o/+f/5//m/+b/5f/l/+T/4//j/+L/4v/h/+D/3//f/97/3f/d/9z/2//a/9n/2P/Y/9f/1v/V/9T/0//S/9H/0P/P/87/zf/M/8r/yf/I/8f/xv/E/8P/wv/A/7//vv+8/7v/uf+4/7b/tP+z/7H/r/+t/6z/qv+o/6b/pP+i/6D/nv+c/5n/l/+V/5P/kP+O/4v/if+G/4P/gf9+/3v/eP91/3L/b/9s/2n/Zf9i/17/W/9X/1T/UP9M/0j/RP9A/zz/N/8z/y7/Kv8l/yD/HP8X/xH/DP8H/wH//P72/vD+6v7k/t7+2P7R/sv+xP69/rb+r/6n/qD+mP6Q/oj+gP53/m/+Zv5d/lT+Sv5B/jf+Lf4j/hj+Dv4D/vj97P3h/dX9yf28/a/9ov2V/Yj9ev1s/V39Tv0//TD9IP0Q/f/87/zd/Mz8uvyo/JX8gvxu/Fr8Rvwx/Bv8Bvzv+9j7wfup+5H7ePtf+0X7KvsP+/P61/q6+p36f/pg+kD6IPr/+d35u/mY+XT5T/kq+QP53Pi0+Iv4Yfg3+Av43vex94L3U/ci9/D2vvaK9lX2Hvbn9a71dfU59f30v/SA9ED0/vO783bzL/Po8p7yU/IH8rjxaPEW8cPwbfAW8OoPkw89D+oOmA5IDvkNrQ1iDRgN0QyKDEUMAgzAC4ALQQsDC8cKiwpSChkK4gmrCXYJQgkQCd4IrQh+CE8IIgj1B8kHnwd1B0wHJAf9BtYGsQaMBmgGRQYjBgEG4AXABaAFgQVjBUYFKQUNBfEE1gS7BKEEiARvBFcEPwQoBBEE+gPlA88DugOmA5IDfgNrA1gDRgM0AyMDEQMBA/AC4ALQAsECsgKjApQChgJ4AmsCXgJRAkQCNwIrAh8CFAIIAv0B8gHoAd0B0wHJAb8BtgGsAaMBmgGRAYkBgAF4AXABaAFgAVkBUQFKAUMBPAE1AS8BKAEiARwBFgEQAQoBBAH/APkA9ADvAOkA5ADgANsA1gDSAM0AyQDEAMAAvAC4ALQAsACsAKkApQCiAJ4AmwCXAJQAkQCOAIsAiACFAIIAfwB9AHoAdwB1AHIAcABtAGsAaQBnAGQAYgBgAF4AXABaAFgAVgBUAFMAUQBPAE0ATABKAEgARwBFAEQAQgBBAEAAPgA9ADwAOgA5ADgANwA2ADQAMwAyADEAMAAvAC4ALQAsACsAKgApACgAKAAnACYAJQAkACMAIwAiACEAIQAgAB8AHgAeAB0AHQAcABsAGwAaABoAGQAZABgAGAAXABcAFgAWABUAFQAUABQAEwATABMAEgASABEAEQARABAADAAlAD4AVwBwAIkAogC7ANQA7QAGAR8BOAFRAWoBgwGcAbUBzgHnAQACGQIyAkoCYwJ8ApUCrQLGAt8C9wIQAykDQQNaA3IDiwOjA7sD1APsAwQEHAQ1BE0EZQR9BJUErQTFBN0E9QQMBSQFPAVUBWsFgwWaBbIFyQXgBfgFDwYmBj0GVAZrBoIGmQawBsYG3Qb0BgoHIQc3B00HYwd6B5AHpge8B9IH5wf9BxMIKAg+CFMIaQh+CJMIqAi9CNII5wj8CBAJJQk5CU4JYgl2CYoJngmyCcYJ2gnuCQEKFQooCjsKTgpiCnUKhwqaCq0KvwrSCuQK9goJCxsLLQs+C1ALYgtzC4ULlgunC7gLyQvaC+sL+wsMDBwMLAw8DE0MXAxsDHwMiwybDKoMuQzIDNcM5gz1DAMNEg0gDS4NPA1KDVgNZg1zDYENjg2bDagNtQ3CDc4N2w3nDfMN/w0LDhcOIw4uDjoORQ5QDlsOZg5xDnsOhg6QDpoOpA6uDrgOwQ7LDtQO3Q7mDu8O+A4BDwkPEQ8ZDyEPKQ8xDzkPQA9HD04PVQ9cD2MPaQ9wD3YPfA+CD4gPjg+TD5gPng+jD6cPrA+xD7UPuQ++D8IPxQ/JD80P0A/TD9YP2Q/cD98P4Q/jD+UP5w/pD+sP7Q/uD+8P8A/xD/IP8w/zD/MP8w/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0/wwAPgBwAKIA1AAGATgBagGcAc4BAAIyAmMClQLGAvcCKQNaA4sDuwPsAxwETQR9BK0E3QQMBTwFawWaBckF+AUmBlQGggawBt0GCgc3B2MHkAe8B+cHEwg+CGkIkwi9COcIEAk5CWIJigmyCdoJAQooCk4KdQqaCr8K5AoJCy0LUAtzC5YLuAvaC/sLHAw8DFwMfAybDLkM1wz1DBINLg1KDWYNgQ2bDbUNzg3nDf8NFw4uDkUOWw5xDoYOmg6uDsEO1A7mDvgOCQ8ZDykPOQ9HD1UPYw9wD3wPiA+TD54Ppw+xD7kPwg/JD9AP1g/cD+EP5Q/pD+0P7w/xD/MP8w/zD/MP8g/wD+4P6w/nD+MP3w/ZD9MPzQ/FD74PtQ+sD6MPmA+OD4IPdg9pD1wPTg9ADzEPIQ8RDwEP7w7dDssOuA6kDpAOew5mDlAOOg4jDgsO8w3bDcINqA2ODXMNWA08DSANAw3mDMgMqgyLDGwMTQwsDAwM6wvJC6cLhQtiCz4LGwv2CtIKrQqHCmIKOwoVCu4JxgmeCXYJTgklCfwI0gioCH4IUwgoCP0H0gemB3oHTQchB/QGxgaZBmsGPQYPBuAFsgWDBVQFJAX1BMUElQRlBDUEBATUA6MDcgNBAxAD3wKtAnwCSgIZAucBtQGDAVEBHwHtALsAiQBXACUA9P/C/5D/Xv8s//r+yP6W/mT+Mv4A/s79nf1r/Tr9Cf3X/Kb8dfxF/BT85Puz+4P7U/sj+/T6xPqV+mb6N/oI+tr5rPl++VD5I/n2+Mn4nfhw+ET4Gfjt98L3l/dt90P3Gffw9sf2nvZ29k72Jvb/9dj1svWL9Wb1QfUc9ff00/Sw9I30avRI9Cb0BfTk88TzpPOE82XzR/Mp8wvz7vLS8rbymvJ/8mXyS/Iy8hnyAfLp8dLxu/Gl8Y/xevFm8VLxP/Es8RrxCPH38Ofw1/DH8Lnwq/Cd8JDwhPB48G3wYvBZ8E/wR/A+8DfwMPAq8CTwH/Ab8BfwE/AR8A/wDfAN8A3wDfAO8BDwEvAV8BnwHfAh8CfwLfAz8DvwQvBL8FTwXfBo8HLwfvCK8JfwpPCy8MDwz/Df8O/w//AR8SPxNfFI8VzxcPGF8ZrxsPHG8d3x9fEN8iXyPvJY8nLyjfKo8sTy4PL98hrzOPNW83XzlPOz89Tz9PMV9Df0WfR79J70wvTl9Ar1LvVT9Xn1nvXF9ev1EvY69mL2ivay9tv2BPcu91j3gvet99j3A/gu+Fr4hviz+N/4DPk6+Wf5lfnD+fH5IPpO+n36rPrc+gv7O/tr+5v7y/v8+yz8XfyO/L/88Pwh/VP9hP22/ef9Gf5L/n3+r/7h/hP/Rf93/6n/2//0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/9P/0//T/DAA+AHAAogDUAAYBOAFqAZwBzgEAAjICYwKVAsYC9wIpA1oDiwO7A+wDHARNBH0ErQTdBAwFPAVrBZoFyQX4BSYGVAaCBrAG3QYKBzcHYweQB7wH5wcTCD4IaQiTCL0I5wgQCTkJYgmKCbIJ2gkBCigKTgp1CpoKvwrkCgkLLQtQC3MLlgu4C9oL+wscDDwMXAx8DJsMuQzXDPUMEg0uDUoNZg2BDZsNtQ3ODecN/w0XDi4ORQ5bDnEOhg6aDq4OwQ7UDuYO+A4JDxkPKQ85D0cPVQ9jD3APfA+ID5MPng+nD7EPuQ/CD8kP0A/WD9wP4Q/lD+kP7Q/vD/EP8w/zD/MP8w/yD/AP7g/rD+cP4w/fD9kP0w/ND8UPvg+1D6wPow+YD44Pgg92D2kPXA9OD0APMQ8hDxEPAQ/vDt0Oyw64DqQOkA57DmYOUA46DiMOCw7zDdsNwg2oDY4Ncw1YDTwNIA0DDeYMyAyqDIsMbAxNDCwMDAzrC8kLpwuFC2ILPgsbC/YK0gqtCocKYgo7ChUK7gnGCZ4JdglOCSUJ/AjSCKgIfghTCCgI/QfSB6YHegdNByEH9AbGBpkGawY9Bg8G4AWyBYMFVAUkBfUExQSVBGUENQQEBNQDowNyA0EDEAPfAq0CfAJKAhkC5wG1AYMBUQEfAe0AuwCJAFcAJQAMAD4AcACiANQABgE4AWoBnAHOAQACMgJjApUCxgL3AikDWgOLA7sD7AMcBE0EfQStBN0EDAU8BWsFmgXJBfgFJgZUBoIGsAbdBgoHNwdjB5AHvAfnBxMIPghpCJMIvQjnCBAJOQliCYoJsgnaCQEKKApOCnUKmgq/CuQKCQstC1ALcwuWC7gL2gv7CxwMPAxcDHwMmwy5DNcM9QwSDS4NSg1mDYENmw21Dc4N5w3/DRcOLg5FDlsOcQ6GDpoOrg7BDtQO5g74DgkPGQ8pDzkPRw9VD2MPcA98D4gPkw+eD6cPsQ+5D8IPyQ/QD9YP3A/hD+UP6Q/tD+8P8Q/zD/MP8w/zD/IP8A/uD+sP5w/jD98P2Q/TD80PxQ++D7UPrA+jD5gPjg+CD3YPaQ9cD04PQA8xDyEPEQ8BD+8O3Q7LDrgOpA6QDnsOZg5QDjoOIw4LDvMN2w3CDagNjg1zDVgNPA0gDQMN5gzIDKoMiwxsDE0MLAwMDOsLyQunC4ULYgs+CxsL9grSCq0KhwpiCjsKFQruCcYJngl2CU4JJQn8CNIIqAh+CFMIKAj9B9IHpgd6B00HIQf0BsYGmQZrBj0GDwbgBbIFgwVUBSQF9QTFBJUEZQQ1BAQE1AOjA3IDQQMQA98CrQJ8AkoCGQLnAbUBgwFRAR8B7QC7AIkAVwAlAE//1vl89D/vHuoa5THgY9uw1hbSls0uyd/Ep8CGvHy4iLSpsOCsLKmMpQCih54im8+XjpRfkUGONYs6iE6Fc4Knf+t8Pnqfdw91jXIZcLJtWGsLactml2RvYlNgQ14+XERaVVhwVpZUxlIAUURPkU3nS0dKr0ghR5tFHUSnQjlB1D92Ph890DuIOkc5DDjZNqw1hjRlM0wyODEqMCEvHy4iLSosOCtLKmMpgCiiJ8gm9CUjJVgkkCPNIg4iVCGdIOofOx+PHugdRB2jHAYcbBvWGkMasxkmGZwYFRiRFw8XkRYVFpwVJRWxFEAU0RNkE/oSkhIsEsgRZxEHEaoQThD1D50PSA/0DqIOUg4DDrYNaw0hDdkMkwxODAoMyAuIC0gLCwvOCpMKWQogCugJsgl9CUkJFgnkCLMIhAhVCCcI+gfPB6QHegdRBykHAgfbBrUGkQZtBkkGJwYFBuQFxAWkBYUFZwVJBSwFEAX0BNkEvgSkBIsEcgRaBEIEKgQUBP0D5wPSA70DqAOUA4EDbgNbA0gDNgMlAxMDAwPyAuIC0gLDArQCpQKWAogCegJtAl8CUgJFAjkCLQIhAhUCCgL/AfQB6QHeAdQBygHAAbcBrQGkAZsBkgGKAYEBeQFxAWkBYQFaAVIBSwFEAT0BNgEwASkBIwEdARYBEAELAQUB/wD6APQA7wDqAOUA4ADbANcA0gDOAMkAxQDBAL0AuAC1ALEArQCpAKYAogCfAJsAmACVAJEAjgCLAIgAhQCCAIAAfQB6AHgAdQBzAHAAbgBrAGkAZwBlAGIAYABeAFwAWgBYAFYAVQBTAFEATwBOAEwASgBJAEcARgBEAEMAQQBAAD4APQA8ADsAOQA4ADcANgA1ADMAMgAxADAALwAuAC0ALAArACoAKQAoACgAJwAmACUAJAAkACMAIgAhACEAIAAfAB8AHgAdAB0AHAAbABsAGgAaABkAGQAYABgAFwAXABYAFgAVABUAFAAUABMAEwATABIAEgARABEAEQAQAAACBAEDBQYHCB8BAgAAAAAAAAACAAIACAAKAAwAAQAEAAI=");
  base64DecodeToExistingUint8Array(bufferView, 75147, "AgACAAH/A/8D/wH/Af8D/wMAAv8DAQABHoGAgZ4=");
  base64DecodeToExistingUint8Array(bufferView, 75176, "RKw=");
}
function asmFunc(imports) {
 var buffer = new ArrayBuffer(2097152);
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
 var __stack_pointer = 65536;
 function dbs_Operator__TemplateVolumeOFF($0) {
  $0 = $0 | 0;
  return 511;
 }
 
 function dbs_Channel__BlockTemplate_sm2FM($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
  label$1 : {
   label$2 : {
    $7 = HEAP32[$0 + 128 >> 2];
    if (($7 + HEAP32[$0 + 136 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 156 | 0] >>> HEAPU8[$0 + 163 | 0] & 1)) {
     break label$2
    }
    HEAP32[$0 + 176 >> 2] = 0;
    HEAP32[$0 + 180 >> 2] = 0;
    break label$1;
   }
   $5 = HEAP32[$0 + 20 >> 2];
   HEAP32[$0 + 24 >> 2] = $5;
   $6 = HEAPU8[$1 + 4156 | 0];
   HEAP32[$0 + 48 >> 2] = HEAP32[$0 + 44 >> 2] + ($6 & HEAPU8[$0 + 80 | 0]);
   $4 = HEAPU8[$1 + 4155 | 0];
   if (HEAPU8[$0 + 81 | 0] >>> $4 | 0) {
    $8 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 24 >> 2] = ($5 - $8 | 0) + ($8 ^ HEAP32[$0 + 36 >> 2] >>> $4);
   }
   $5 = HEAP32[$0 + 104 >> 2];
   HEAP32[$0 + 108 >> 2] = $5;
   HEAP32[$0 + 132 >> 2] = (HEAPU8[$0 + 164 | 0] & $6) + $7;
   if (HEAPU8[$0 + 165 | 0] >>> $4 | 0) {
    $1 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 108 >> 2] = ($5 - $1 | 0) + ($1 ^ HEAP32[$0 + 120 >> 2] >>> $4);
   }
   if (!$2) {
    break label$1
   }
   $8 = $0 + 84 | 0;
   while (1) {
    $1 = HEAP32[$0 + 176 >> 2];
    $4 = HEAP32[$0 + 180 >> 2];
    HEAP32[$0 + 176 >> 2] = $4;
    $7 = HEAPU8[$0 + 184 | 0];
    $6 = HEAP32[$0 + 48 >> 2] + (FUNCTION_TABLE[HEAP32[$0 >> 2]]($0) | 0) | 0;
    label$6 : {
     if ($6 >>> 0 >= 384) {
      HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2];
      $1 = 0;
      break label$6;
     }
     $5 = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2] | 0;
     HEAP32[$0 + 16 >> 2] = $5;
     $1 = Math_imul(HEAPU16[($6 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 4 >> 2] + ((HEAP32[$0 + 8 >> 2] & ($5 >>> 22) + ($1 + $4 >>> $7)) << 1) >> 1]) >> 16;
    }
    HEAP32[$0 + 180 >> 2] = $1;
    $6 = HEAP32[$0 + 176 >> 2];
    $4 = HEAP32[$0 + 132 >> 2];
    $7 = FUNCTION_TABLE[HEAP32[$0 + 84 >> 2]]($8) | 0;
    $5 = HEAP32[$0 + 100 >> 2] + HEAP32[$0 + 108 >> 2] | 0;
    HEAP32[$0 + 100 >> 2] = $5;
    $1 = 0;
    $4 = $4 + $7 | 0;
    if ($4 >>> 0 <= 383) {
     $1 = Math_imul(HEAPU16[($4 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 88 >> 2] + ((HEAP32[$0 + 92 >> 2] & $6 + ($5 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    HEAP32[$3 >> 2] = $1 + HEAP32[$3 >> 2];
    $3 = $3 + 4 | 0;
    $2 = $2 - 1 | 0;
    if ($2) {
     continue
    }
    break;
   };
  }
  return $0 + 192 | 0;
 }
 
 function dbs_Chip__WriteReg($0, $1) {
  var $2 = 0, $3 = 0, $4 = 0, $5 = 0;
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
            $3 = $0 >>> 4 | 0;
            switch ($3 & 15) {
            case 0:
             break label$10;
            case 14:
            case 15:
             break label$2;
            case 12:
             break label$3;
            case 11:
             break label$4;
            case 10:
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
           label$11 : {
            label$12 : {
             label$13 : {
              label$14 : {
               switch ($0 - 1 | 0) {
               default:
                switch ($0 - 260 | 0) {
                case 1:
                 break label$12;
                case 0:
                 break label$13;
                default:
                 break label$1;
                };
               case 1:
               case 2:
               case 3:
               case 4:
               case 5:
               case 6:
                break label$1;
               case 7:
                break label$11;
               case 0:
                break label$14;
               };
              }
              HEAP8[109203] = $1 << 2 << 24 >> 24 >>> 7 & 7;
              return;
             }
             if (!(($1 ^ HEAPU8[109192]) & 63)) {
              break label$1
             }
             HEAP8[109192] = $1 & 63 | 128;
             return;
            }
            if (!(($1 ^ HEAPU8[109204]) & 1)) {
             break label$1
            }
            $0 = 0;
            HEAP8[109204] = 0 - ($1 & 1);
            while (1) {
             $1 = $0 + 105044 | 0;
             $3 = $1 + 878 | 0;
             $4 = $3;
             $3 = HEAPU8[$3 | 0];
             HEAP8[$4 | 0] = $3 ^ -1;
             Channel__WriteC0($1 + 692 | 0, $3);
             $0 = $0 + 192 | 0;
             if (($0 | 0) != 3456) {
              continue
             }
             break;
            };
            break label$1;
           }
           HEAP8[109193] = $1;
           return;
          }
          $0 = HEAPU16[(($0 >>> 3 & 32 | $0 & 31) << 1) + 75184 >> 1];
          if (!$0) {
           break label$1
          }
          $0 = $0 + 105044 | 0;
          $4 = HEAPU8[$0 + 74 | 0];
          if (($1 | 0) == ($4 | 0)) {
           break label$1
          }
          HEAP8[$0 + 74 | 0] = $1;
          HEAP8[$0 + 80 | 0] = $1 << 24 >> 24 >>> 7;
          $3 = $1;
          $4 = $1 ^ $4;
          if ($4 & 16) {
           Operator__UpdateRates($0);
           $3 = HEAPU8[$0 + 74 | 0];
          }
          label$18 : {
           if (HEAP32[$0 + 64 >> 2] ? $3 & 32 : 1) {
            HEAP8[$0 + 72 | 0] = HEAPU8[$0 + 72 | 0] | 4;
            break label$18;
           }
           HEAP8[$0 + 72 | 0] = HEAPU8[$0 + 72 | 0] & 251;
          }
          if (!($4 & 79)) {
           break label$1
          }
          $2 = HEAP32[((($1 & 15) << 2) + 105044 | 0) + 20 >> 2];
          HEAP32[$0 + 32 >> 2] = $2;
          $1 = HEAP32[$0 + 28 >> 2];
          $4 = $1 & 1023;
          $5 = $4 >>> 7 | 0;
          HEAP8[$0 + 81 | 0] = $5 & $3 << 1 << 24 >> 24 >>> 7;
          $1 = $1 >>> 10 & 255;
          HEAP32[$0 + 20 >> 2] = Math_imul($4 << $1, $2);
          HEAP32[$0 + 36 >> 2] = Math_imul($5 << $1, $2) & $3 << 25 >> 31;
          return;
         }
         $0 = HEAPU16[(($0 >>> 3 & 32 | $0 & 31) << 1) + 75184 >> 1];
         if (!$0) {
          break label$1
         }
         $0 = $0 + 105044 | 0;
         if (($1 | 0) == HEAPU8[$0 + 75 | 0]) {
          break label$1
         }
         HEAP8[$0 + 75 | 0] = $1;
         HEAP32[$0 + 44 >> 2] = ($1 << 2 & 252) + (HEAPU8[$0 + 30 | 0] >>> HEAPU8[($1 >>> 6 | 0) + 75113 | 0] | 0);
         return;
        }
        $0 = HEAPU16[(($0 >>> 3 & 32 | $0 & 31) << 1) + 75184 >> 1];
        if (!$0) {
         break label$1
        }
        $0 = $0 + 105044 | 0;
        $3 = HEAPU8[$0 + 76 | 0];
        HEAP8[$0 + 76 | 0] = $1;
        $3 = $1 ^ $3;
        label$21 : {
         if (!($3 & 15)) {
          break label$21
         }
         $4 = $1 & 15;
         if ($4) {
          HEAP8[$0 + 72 | 0] = HEAPU8[$0 + 72 | 0] & 247;
          HEAP32[$0 + 60 >> 2] = HEAP32[(((HEAPU8[$0 + 82 | 0] + ($4 << 2) & 255) << 2) + 105044 | 0) + 84 >> 2];
          break label$21;
         }
         HEAP32[$0 + 60 >> 2] = 0;
         HEAP8[$0 + 72 | 0] = HEAPU8[$0 + 72 | 0] | 8;
        }
        if (($3 & 255) >>> 0 < 16) {
         break label$1
        }
        $1 = $1 >>> 4 | 0;
        if ($1) {
         HEAP8[$0 + 72 | 0] = HEAPU8[$0 + 72 | 0] & 239;
         HEAP32[$0 + 56 >> 2] = HEAP32[(((HEAPU8[$0 + 82 | 0] + ($1 << 2) & 255) << 2) + 105044 | 0) + 388 >> 2];
         return;
        }
        HEAP32[$0 + 56 >> 2] = 0;
        HEAP8[$0 + 72 | 0] = HEAPU8[$0 + 72 | 0] | 16;
        return;
       }
       $0 = HEAPU16[(($0 >>> 3 & 32 | $0 & 31) << 1) + 75184 >> 1];
       if (!$0) {
        break label$1
       }
       $0 = $0 + 105044 | 0;
       $3 = HEAPU8[$0 + 77 | 0];
       if (($1 | 0) == ($3 | 0)) {
        break label$1
       }
       HEAP8[$0 + 77 | 0] = $1;
       $4 = $1 >>> 4 | 0;
       HEAP32[$0 + 40 >> 2] = ($4 + 1 & 16 | $4) << 4;
       if (!(($1 ^ $3) & 15)) {
        break label$1
       }
       $1 = $1 & 15;
       if ($1) {
        $3 = HEAPU8[$0 + 72 | 0];
        HEAP8[$0 + 72 | 0] = $3 & 253;
        HEAP32[$0 + 64 >> 2] = HEAP32[(((HEAPU8[$0 + 82 | 0] + ($1 << 2) & 255) << 2) + 105044 | 0) + 84 >> 2];
        if (HEAPU8[$0 + 74 | 0] & 32) {
         break label$1
        }
        HEAP8[$0 + 72 | 0] = $3 & 249;
        return;
       }
       HEAP32[$0 + 64 >> 2] = 0;
       $2 = HEAPU8[$0 + 72 | 0];
       HEAP8[$0 + 72 | 0] = $2 | 2;
       if (HEAPU8[$0 + 74 | 0] & 32) {
        break label$1
       }
       HEAP8[$0 + 72 | 0] = $2 | 6;
       return;
      }
      $0 = HEAPU16[(($3 & 16 | $0 & 15) << 1) + 75312 >> 1];
      if (!$0) {
       break label$1
      }
      $0 = $0 + 105044 | 0;
      $4 = HEAPU8[$0 + 187 | 0] & (HEAPU8[109204] & HEAPU8[109192]);
      if ($4 >>> 0 > 128) {
       break label$1
      }
      $3 = HEAP32[$0 + 172 >> 2];
      if (($3 & 255) == ($1 | 0)) {
       break label$1
      }
      $1 = ($1 ^ $3) & 255 ^ $3;
      HEAP32[$0 + 172 >> 2] = $1;
      $2 = $3 >>> 8 | 0;
      $3 = $3 >>> 9 | 0;
      $1 = $1 & 65535;
      $1 = ((HEAPU8[109193] & 64 ? $2 : $3) & 1 | $3 & 14) << 24 | HEAPU8[($1 >>> 6 | 0) + 104864 | 0] << 16 | $1;
      Channel__SetChanData($0, $1);
      if (!($4 & 63)) {
       break label$1
      }
      Channel__SetChanData($0 + 192 | 0, $1);
      return;
     }
     if (($0 | 0) == 189) {
      $0 = HEAPU8[109195];
      if (($1 | 0) == ($0 | 0)) {
       break label$1
      }
      HEAP8[109195] = $1;
      HEAP8[109201] = !($1 & 64);
      HEAP8[109202] = $1 << 24 >> 24 >= 0 ? 2 : 0;
      $0 = ($0 ^ $1) & 32;
      if ($1 & 32) {
       if ($0) {
        HEAP32[26764] = HEAPU8[109204] ? 1 : 2
       }
       label$28 : {
        if ($1 & 16) {
         $0 = HEAPU8[106961];
         if (!$0) {
          HEAP8[106967] = 4;
          HEAP32[26739] = 0;
          HEAP32[26722] = 3;
          HEAP32[26726] = HEAP32[26725];
         }
         HEAP8[106961] = $0 | 2;
         $0 = HEAPU8[107045];
         if (!$0) {
          HEAP8[107051] = 4;
          HEAP32[26760] = 0;
          HEAP32[26743] = 3;
          HEAP32[26747] = HEAP32[26746];
         }
         HEAP8[107045] = $0 | 2;
         break label$28;
        }
        $0 = HEAPU8[106961] & 253;
        HEAP8[106961] = $0;
        label$32 : {
         if ($0) {
          break label$32
         }
         if (!HEAPU8[106967]) {
          break label$32
         }
         HEAP32[26722] = 4;
         HEAP8[106967] = 1;
        }
        $0 = HEAPU8[107045] & 253;
        HEAP8[107045] = $0;
        if ($0) {
         break label$28
        }
        if (!HEAPU8[107051]) {
         break label$28
        }
        HEAP32[26743] = 4;
        HEAP8[107051] = 1;
       }
       label$33 : {
        if ($1 & 1) {
         $0 = HEAPU8[107153];
         if (!$0) {
          HEAP8[107159] = 4;
          HEAP32[26787] = 0;
          HEAP32[26770] = 3;
          HEAP32[26774] = HEAP32[26773];
         }
         HEAP8[107153] = $0 | 2;
         break label$33;
        }
        $0 = HEAPU8[107153] & 253;
        HEAP8[107153] = $0;
        if ($0) {
         break label$33
        }
        if (!HEAPU8[107159]) {
         break label$33
        }
        HEAP32[26770] = 4;
        HEAP8[107159] = 1;
       }
       label$36 : {
        if ($1 & 8) {
         $0 = HEAPU8[107237];
         if (!$0) {
          HEAP8[107243] = 4;
          HEAP32[26808] = 0;
          HEAP32[26791] = 3;
          HEAP32[26795] = HEAP32[26794];
         }
         HEAP8[107237] = $0 | 2;
         break label$36;
        }
        $0 = HEAPU8[107237] & 253;
        HEAP8[107237] = $0;
        if ($0) {
         break label$36
        }
        if (!HEAPU8[107243]) {
         break label$36
        }
        HEAP32[26791] = 4;
        HEAP8[107243] = 1;
       }
       label$39 : {
        if ($1 & 4) {
         $0 = HEAPU8[107345];
         if (!$0) {
          HEAP8[107351] = 4;
          HEAP32[26835] = 0;
          HEAP32[26818] = 3;
          HEAP32[26822] = HEAP32[26821];
         }
         HEAP8[107345] = $0 | 2;
         break label$39;
        }
        $0 = HEAPU8[107345] & 253;
        HEAP8[107345] = $0;
        if ($0) {
         break label$39
        }
        if (!HEAPU8[107351]) {
         break label$39
        }
        HEAP32[26818] = 4;
        HEAP8[107351] = 1;
       }
       if ($1 & 2) {
        $0 = HEAPU8[107429];
        if (!$0) {
         HEAP8[107435] = 4;
         HEAP32[26856] = 0;
         HEAP32[26839] = 3;
         HEAP32[26843] = HEAP32[26842];
        }
        HEAP8[107429] = $0 | 2;
        return;
       }
       $0 = HEAPU8[107429] & 253;
       HEAP8[107429] = $0;
       if ($0) {
        break label$1
       }
       if (!HEAPU8[107435]) {
        break label$1
       }
       HEAP32[26839] = 4;
       HEAP8[107435] = 1;
       return;
      }
      if (!$0) {
       break label$1
      }
      $0 = HEAPU8[107074];
      HEAP8[107074] = $0 ^ -1;
      Channel__WriteC0(106888, $0);
      $0 = HEAPU8[106961] & 253;
      HEAP8[106961] = $0;
      label$44 : {
       if ($0) {
        break label$44
       }
       if (!HEAPU8[106967]) {
        break label$44
       }
       HEAP32[26722] = 4;
       HEAP8[106967] = 1;
      }
      $0 = HEAPU8[107045] & 253;
      HEAP8[107045] = $0;
      label$45 : {
       if ($0) {
        break label$45
       }
       if (!HEAPU8[107051]) {
        break label$45
       }
       HEAP32[26743] = 4;
       HEAP8[107051] = 1;
      }
      $0 = HEAPU8[107153] & 253;
      HEAP8[107153] = $0;
      label$46 : {
       if ($0) {
        break label$46
       }
       if (!HEAPU8[107159]) {
        break label$46
       }
       HEAP32[26770] = 4;
       HEAP8[107159] = 1;
      }
      $0 = HEAPU8[107237] & 253;
      HEAP8[107237] = $0;
      label$47 : {
       if ($0) {
        break label$47
       }
       if (!HEAPU8[107243]) {
        break label$47
       }
       HEAP32[26791] = 4;
       HEAP8[107243] = 1;
      }
      $0 = HEAPU8[107345] & 253;
      HEAP8[107345] = $0;
      label$48 : {
       if ($0) {
        break label$48
       }
       if (!HEAPU8[107351]) {
        break label$48
       }
       HEAP32[26818] = 4;
       HEAP8[107351] = 1;
      }
      $0 = HEAPU8[107429] & 253;
      HEAP8[107429] = $0;
      if ($0) {
       break label$1
      }
      if (!HEAPU8[107435]) {
       break label$1
      }
      HEAP32[26839] = 4;
      HEAP8[107435] = 1;
      return;
     }
     $0 = HEAPU16[(($3 & 16 | $0 & 15) << 1) + 75312 >> 1];
     if (!$0) {
      break label$1
     }
     $0 = $0 + 105044 | 0;
     $3 = HEAPU8[$0 + 187 | 0] & (HEAPU8[109204] & HEAPU8[109192]);
     $4 = $3;
     if ($3 >>> 0 > 128) {
      break label$1
     }
     $5 = HEAP32[$0 + 172 >> 2];
     $2 = ($5 ^ $1 << 8) & 7936;
     label$49 : {
      if (!$2) {
       break label$49
      }
      $5 = $2 ^ $5;
      HEAP32[$0 + 172 >> 2] = $5;
      $2 = $5 >>> 9 | 0;
      $2 = ((HEAPU8[109193] & 64 ? $5 >>> 8 | 0 : $2) & 1 | $2 & 14) << 24;
      $5 = $5 & 65535;
      $5 = $2 | HEAPU8[($5 >>> 6 | 0) + 104864 | 0] << 16 | $5;
      Channel__SetChanData($0, $5);
      if (!($3 & 63)) {
       break label$49
      }
      Channel__SetChanData($0 + 192 | 0, $5);
     }
     if (!(($1 ^ HEAPU8[$0 + 185 | 0]) & 32)) {
      break label$1
     }
     HEAP8[$0 + 185 | 0] = $1;
     $2 = HEAPU8[$0 + 73 | 0];
     if ($1 & 32) {
      if (!($2 & 255)) {
       HEAP8[$0 + 79 | 0] = 4;
       HEAP32[$0 + 68 >> 2] = 0;
       HEAP32[$0 >> 2] = 3;
       HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 12 >> 2];
      }
      HEAP8[$0 + 73 | 0] = $2 | 1;
      $2 = HEAPU8[$0 + 157 | 0];
      if (!$2) {
       HEAP8[$0 + 163 | 0] = 4;
       HEAP32[$0 + 152 >> 2] = 0;
       HEAP32[$0 + 84 >> 2] = 3;
       HEAP32[$0 + 100 >> 2] = HEAP32[$0 + 96 >> 2];
      }
      HEAP8[$0 + 157 | 0] = $2 | 1;
      if (!($4 & 63)) {
       break label$1
      }
      $2 = HEAPU8[$0 + 265 | 0];
      if (!$2) {
       HEAP8[$0 + 271 | 0] = 4;
       HEAP32[$0 + 260 >> 2] = 0;
       HEAP32[$0 + 192 >> 2] = 3;
       HEAP32[$0 + 208 >> 2] = HEAP32[$0 + 204 >> 2];
      }
      HEAP8[$0 + 265 | 0] = $2 | 1;
      $2 = HEAPU8[$0 + 349 | 0];
      if (!$2) {
       HEAP8[$0 + 355 | 0] = 4;
       HEAP32[$0 + 344 >> 2] = 0;
       HEAP32[$0 + 276 >> 2] = 3;
       HEAP32[$0 + 292 >> 2] = HEAP32[$0 + 288 >> 2];
      }
      HEAP8[$0 + 349 | 0] = $2 | 1;
      return;
     }
     $2 = $2 & 254;
     HEAP8[$0 + 73 | 0] = $2;
     label$55 : {
      if ($2) {
       break label$55
      }
      if (!HEAPU8[$0 + 79 | 0]) {
       break label$55
      }
      HEAP32[$0 >> 2] = 4;
      HEAP8[$0 + 79 | 0] = 1;
     }
     $2 = HEAPU8[$0 + 157 | 0] & 254;
     HEAP8[$0 + 157 | 0] = $2;
     label$56 : {
      if ($2) {
       break label$56
      }
      if (!HEAPU8[$0 + 163 | 0]) {
       break label$56
      }
      HEAP32[$0 + 84 >> 2] = 4;
      HEAP8[$0 + 163 | 0] = 1;
     }
     if (!($4 & 63)) {
      break label$1
     }
     $2 = HEAPU8[$0 + 265 | 0] & 254;
     HEAP8[$0 + 265 | 0] = $2;
     label$57 : {
      if ($2) {
       break label$57
      }
      if (!HEAPU8[$0 + 271 | 0]) {
       break label$57
      }
      HEAP32[$0 + 192 >> 2] = 4;
      HEAP8[$0 + 271 | 0] = 1;
     }
     $2 = HEAPU8[$0 + 349 | 0] & 254;
     HEAP8[$0 + 349 | 0] = $2;
     if ($2) {
      break label$1
     }
     if (!HEAPU8[$0 + 355 | 0]) {
      break label$1
     }
     HEAP32[$0 + 276 >> 2] = 4;
     HEAP8[$0 + 355 | 0] = 1;
     return;
    }
    $0 = HEAPU16[(($3 & 16 | $0 & 15) << 1) + 75312 >> 1];
    if (!$0) {
     break label$1
    }
    Channel__WriteC0($0 + 105044 | 0, $1);
    return;
   }
   $0 = HEAPU16[(($0 >>> 3 & 32 | $0 & 31) << 1) + 75184 >> 1];
   if (!$0) {
    break label$1
   }
   $0 = $0 + 105044 | 0;
   if (($1 | 0) == HEAPU8[$0 + 78 | 0]) {
    break label$1
   }
   HEAP8[$0 + 78 | 0] = $1;
   $2 = ($1 & (HEAPU8[109204] & 7 | HEAPU8[109203] & 3)) << 1;
   HEAP32[$0 + 8 >> 2] = HEAPU16[$2 + 75152 >> 1];
   HEAP32[$0 + 12 >> 2] = HEAPU16[$2 + 75136 >> 1] << 22;
   HEAP32[$0 + 4 >> 2] = (HEAPU16[$2 + 75120 >> 1] << 1) + 95904;
  }
 }
 
 function Channel__WriteC0($0, $1) {
  var $2 = 0, $3 = 0;
  label$1 : {
   if (HEAPU8[$0 + 186 | 0] == ($1 | 0)) {
    break label$1
   }
   HEAP8[$0 + 186 | 0] = $1;
   $2 = $1 >>> 1 & 7;
   HEAP8[$0 + 184 | 0] = $2 ? 9 - $2 | 0 : 31;
   if (HEAPU8[109204]) {
    $2 = HEAP8[$0 + 187 | 0];
    label$3 : {
     if ($2 & HEAPU8[109192] & 63) {
      label$5 : {
       label$6 : {
        label$7 : {
         label$8 : {
          $2 = ($2 | 0) >= 0;
          $3 = HEAPU8[($2 ? 378 : 186) + $0 | 0] << 1 & 2;
          $2 = ($2 ? 0 : -192) + $0 | 0;
          switch (($3 | HEAP8[$2 + 186 | 0] & 1) - 1 | 0) {
          case 2:
           break label$5;
          case 1:
           break label$6;
          case 0:
           break label$7;
          default:
           break label$8;
          };
         }
         HEAP32[$2 + 168 >> 2] = 5;
         break label$3;
        }
        HEAP32[$2 + 168 >> 2] = 6;
        break label$3;
       }
       HEAP32[$2 + 168 >> 2] = 7;
       break label$3;
      }
      HEAP32[$2 + 168 >> 2] = 8;
      break label$3;
     }
     if (HEAPU8[109195] & 32 ? $2 & 64 : 0) {
      break label$3
     }
     if ($1 & 1) {
      HEAP32[$0 + 168 >> 2] = 9;
      break label$3;
     }
     HEAP32[$0 + 168 >> 2] = 10;
    }
    HEAP8[$0 + 189 | 0] = $1 << 26 >> 31;
    HEAP8[$0 + 188 | 0] = $1 << 27 >> 31;
    return;
   }
   if (HEAPU8[109195] & 32 ? HEAPU8[$0 + 187 | 0] & 64 : 0) {
    break label$1
   }
   if ($1 & 1) {
    HEAP32[$0 + 168 >> 2] = 11;
    return;
   }
   HEAP32[$0 + 168 >> 2] = 12;
  }
 }
 
 function Operator__UpdateRates($0) {
  var $1 = 0, $2 = 0, $3 = 0, $4 = 0;
  label$1 : {
   $4 = HEAPU8[$0 + 74 | 0];
   $3 = HEAP32[$0 + 28 >> 2] >>> ($4 & 16 ? 24 : 26) | 0;
   if (($3 | 0) == HEAPU8[$0 + 82 | 0]) {
    break label$1
   }
   HEAP8[$0 + 82 | 0] = $3;
   $1 = HEAPU8[$0 + 76 | 0];
   $2 = $1 >>> 4 | 0;
   label$2 : {
    if ($2) {
     HEAP32[$0 + 56 >> 2] = HEAP32[((($3 + ($2 << 2) & 255) << 2) + 105044 | 0) + 388 >> 2];
     $2 = HEAPU8[$0 + 72 | 0] & -17;
     break label$2;
    }
    HEAP32[$0 + 56 >> 2] = 0;
    $2 = HEAPU8[$0 + 72 | 0] | 16;
   }
   $1 = $1 & 15;
   label$4 : {
    if ($1) {
     HEAP32[$0 + 60 >> 2] = HEAP32[((($3 + ($1 << 2) & 255) << 2) + 105044 | 0) + 84 >> 2];
     $1 = $2 & 247;
     break label$4;
    }
    HEAP32[$0 + 60 >> 2] = 0;
    $1 = $2 | 8;
   }
   $2 = HEAPU8[$0 + 77 | 0] & 15;
   if ($2) {
    HEAP8[$0 + 72 | 0] = $1 & 253;
    HEAP32[$0 + 64 >> 2] = HEAP32[((($3 + ($2 << 2) & 255) << 2) + 105044 | 0) + 84 >> 2];
    if ($4 & 32) {
     break label$1
    }
    HEAP8[$0 + 72 | 0] = $1 & 249;
    return;
   }
   HEAP32[$0 + 64 >> 2] = 0;
   HEAP8[$0 + 72 | 0] = $1 | 2;
   if ($4 & 32) {
    break label$1
   }
   HEAP8[$0 + 72 | 0] = $1 | 6;
  }
 }
 
 function Channel__SetChanData($0, $1) {
  var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
  HEAP32[$0 + 112 >> 2] = $1;
  HEAP32[$0 + 28 >> 2] = $1;
  $3 = HEAP32[$0 + 172 >> 2];
  HEAP32[$0 + 172 >> 2] = $1;
  $4 = HEAP32[$0 + 32 >> 2];
  $2 = $1 & 1023;
  $5 = $1 >>> 10 & 255;
  $6 = $2 << $5;
  HEAP32[$0 + 20 >> 2] = Math_imul($4, $6);
  $7 = HEAP32[$0 + 116 >> 2];
  HEAP32[$0 + 104 >> 2] = Math_imul($6, $7);
  $2 = $2 >>> 7 | 0;
  $6 = HEAPU8[$0 + 74 | 0];
  HEAP8[$0 + 81 | 0] = $2 & $6 << 1 << 24 >> 24 >>> 7;
  $5 = $2 << $5;
  HEAP32[$0 + 36 >> 2] = Math_imul($5, $4) & $6 << 25 >> 31;
  $4 = HEAPU8[$0 + 158 | 0];
  HEAP8[$0 + 165 | 0] = $2 & $4 << 1 << 24 >> 24 >>> 7;
  HEAP32[$0 + 120 >> 2] = Math_imul($5, $7) & $4 << 25 >> 31;
  $2 = $1 ^ $3;
  if ($2 & 16711680) {
   $3 = HEAPU8[$0 + 75 | 0];
   $1 = $1 >>> 16 & 255;
   HEAP32[$0 + 44 >> 2] = ($3 << 2 & 252) + ($1 >>> HEAPU8[($3 >>> 6 | 0) + 75113 | 0] | 0);
   $3 = HEAPU8[$0 + 159 | 0];
   HEAP32[$0 + 128 >> 2] = ($3 << 2 & 252) + ($1 >>> HEAPU8[($3 >>> 6 | 0) + 75113 | 0] | 0);
  }
  if ($2 >>> 0 >= 16777216) {
   Operator__UpdateRates($0);
   Operator__UpdateRates($0 + 84 | 0);
  }
 }
 
 function dbs_Channel__BlockTemplate_sm3Percussion($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0;
  $6 = HEAP32[$0 + 20 >> 2];
  HEAP32[$0 + 24 >> 2] = $6;
  $5 = HEAPU8[$1 + 4156 | 0];
  HEAP32[$0 + 48 >> 2] = HEAP32[$0 + 44 >> 2] + ($5 & HEAPU8[$0 + 80 | 0]);
  $4 = HEAPU8[$1 + 4155 | 0];
  if (HEAPU8[$0 + 81 | 0] >>> $4 | 0) {
   $7 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 24 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 36 >> 2] >>> $4);
  }
  $6 = HEAP32[$0 + 104 >> 2];
  HEAP32[$0 + 108 >> 2] = $6;
  HEAP32[$0 + 132 >> 2] = HEAP32[$0 + 128 >> 2] + (HEAPU8[$0 + 164 | 0] & $5);
  if (HEAPU8[$0 + 165 | 0] >>> $4 | 0) {
   $7 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 108 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 120 >> 2] >>> $4);
  }
  $6 = HEAP32[$0 + 212 >> 2];
  HEAP32[$0 + 216 >> 2] = $6;
  HEAP32[$0 + 240 >> 2] = HEAP32[$0 + 236 >> 2] + (HEAPU8[$0 + 272 | 0] & $5);
  if (HEAPU8[$0 + 273 | 0] >>> $4 | 0) {
   $7 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 216 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 228 >> 2] >>> $4);
  }
  $6 = HEAP32[$0 + 296 >> 2];
  HEAP32[$0 + 300 >> 2] = $6;
  HEAP32[$0 + 324 >> 2] = HEAP32[$0 + 320 >> 2] + (HEAPU8[$0 + 356 | 0] & $5);
  if (HEAPU8[$0 + 357 | 0] >>> $4 | 0) {
   $7 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 300 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 312 >> 2] >>> $4);
  }
  $6 = HEAP32[$0 + 404 >> 2];
  HEAP32[$0 + 408 >> 2] = $6;
  HEAP32[$0 + 432 >> 2] = HEAP32[$0 + 428 >> 2] + (HEAPU8[$0 + 464 | 0] & $5);
  if (HEAPU8[$0 + 465 | 0] >>> $4 | 0) {
   $7 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 408 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 420 >> 2] >>> $4);
  }
  $6 = HEAP32[$0 + 488 >> 2];
  HEAP32[$0 + 492 >> 2] = $6;
  HEAP32[$0 + 516 >> 2] = HEAP32[$0 + 512 >> 2] + (HEAPU8[$0 + 548 | 0] & $5);
  if (HEAPU8[$0 + 549 | 0] >>> $4 | 0) {
   $5 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 492 >> 2] = ($6 - $5 | 0) + ($5 ^ HEAP32[$0 + 504 >> 2] >>> $4);
  }
  if ($2) {
   $11 = $0 + 84 | 0;
   $12 = $0 + 192 | 0;
   $13 = $0 + 276 | 0;
   $14 = $0 + 384 | 0;
   $15 = $0 + 468 | 0;
   while (1) {
    $4 = HEAP32[$0 + 176 >> 2];
    $5 = HEAP32[$0 + 180 >> 2];
    HEAP32[$0 + 176 >> 2] = $5;
    $6 = HEAPU8[$0 + 184 | 0];
    $7 = HEAP32[$0 + 48 >> 2] + (FUNCTION_TABLE[HEAP32[$0 >> 2]]($0) | 0) | 0;
    label$9 : {
     if ($7 >>> 0 >= 384) {
      HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2];
      $4 = 0;
      break label$9;
     }
     $8 = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2] | 0;
     HEAP32[$0 + 16 >> 2] = $8;
     $4 = Math_imul(HEAPU16[($7 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 4 >> 2] + ((HEAP32[$0 + 8 >> 2] & ($8 >>> 22) + ($4 + $5 >>> $6)) << 1) >> 1]) >> 16;
    }
    HEAP32[$0 + 180 >> 2] = $4;
    $7 = 0;
    $4 = 0;
    $4 = HEAP8[$0 + 186 | 0] & 1 ? $4 : HEAP32[$0 + 176 >> 2];
    $5 = HEAP32[$0 + 132 >> 2];
    $6 = FUNCTION_TABLE[HEAP32[$0 + 84 >> 2]]($11) | 0;
    $8 = HEAP32[$0 + 100 >> 2] + HEAP32[$0 + 108 >> 2] | 0;
    HEAP32[$0 + 100 >> 2] = $8;
    $5 = $5 + $6 | 0;
    if ($5 >>> 0 <= 383) {
     $7 = Math_imul(HEAPU16[($5 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 88 >> 2] + ((HEAP32[$0 + 92 >> 2] & $4 + ($8 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    $8 = HEAP32[$1 + 8 >> 2] + HEAP32[$1 + 12 >> 2] | 0;
    HEAP32[$1 + 8 >> 2] = $8 & 4194303;
    $4 = HEAP32[$1 + 16 >> 2];
    $5 = $8 >>> 12 | 0;
    if ($5) {
     $6 = $5 & 3;
     if ($6) {
      while (1) {
       $5 = $5 - 1 | 0;
       $4 = ($4 ^ 0 - ($4 & 1) & 8389378) >>> 1 | 0;
       $6 = $6 - 1 | 0;
       if ($6) {
        continue
       }
       break;
      }
     }
     if ($8 >>> 0 >= 16384) {
      while (1) {
       $4 = $4 ^ 0 - ($4 & 1) & 8389378;
       $4 = $4 >>> 2 ^ $4 << 30 >> 31 & 4194689;
       $4 = 0 - ($4 & 1) & 8389378 ^ $4;
       $4 = $4 >>> 2 ^ $4 << 30 >> 31 & 4194689;
       $5 = $5 - 4 | 0;
       if ($5) {
        continue
       }
       break;
      }
     }
     HEAP32[$1 + 16 >> 2] = $4;
    }
    $5 = HEAP32[$0 + 208 >> 2] + HEAP32[$0 + 216 >> 2] | 0;
    HEAP32[$0 + 208 >> 2] = $5;
    $6 = HEAP32[$0 + 484 >> 2] + HEAP32[$0 + 492 >> 2] | 0;
    HEAP32[$0 + 484 >> 2] = $6;
    $8 = $5 >>> 17 & 128;
    $5 = $5 >>> 22 | 0;
    $6 = ($6 >>> 20 ^ $6 >>> 22) & 32 | $8 ^ $5 & 136 ? 2 : 0;
    $4 = $4 & 1;
    $8 = HEAP32[$0 + 240 >> 2] + (FUNCTION_TABLE[HEAP32[$0 + 192 >> 2]]($12) | 0) | 0;
    if ($8 >>> 0 <= 383) {
     $7 = $7 + (Math_imul(HEAPU16[($8 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 196 >> 2] + ((HEAP32[$0 + 200 >> 2] & (52 << ($4 << 1 ^ $6) | $6 << 8)) << 1) >> 1]) >> 16) | 0
    }
    $8 = HEAP32[$0 + 324 >> 2] + (FUNCTION_TABLE[HEAP32[$0 + 276 >> 2]]($13) | 0) | 0;
    if ($8 >>> 0 <= 383) {
     $7 = $7 + (Math_imul(HEAPU16[($8 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 280 >> 2] + ((HEAP32[$0 + 284 >> 2] & (($5 & 256) + 256 ^ $4 << 8)) << 1) >> 1]) >> 16) | 0
    }
    $4 = HEAP32[$0 + 432 >> 2];
    $8 = FUNCTION_TABLE[HEAP32[$0 + 384 >> 2]]($14) | 0;
    $10 = HEAP32[$0 + 400 >> 2] + HEAP32[$0 + 408 >> 2] | 0;
    HEAP32[$0 + 400 >> 2] = $10;
    $5 = 0;
    $4 = $4 + $8 | 0;
    if ($4 >>> 0 <= 383) {
     $5 = Math_imul(HEAPU16[($4 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 388 >> 2] + ((HEAP32[$0 + 392 >> 2] & $10 >>> 22) << 1) >> 1]) >> 16
    }
    $4 = ($9 << 3) + $3 | 0;
    $5 = $5 + $7 | 0;
    $7 = HEAP32[$0 + 516 >> 2] + (FUNCTION_TABLE[HEAP32[$0 + 468 >> 2]]($15) | 0) | 0;
    if ($7 >>> 0 <= 383) {
     $5 = $5 + (Math_imul(HEAPU16[($7 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 472 >> 2] + ((HEAP32[$0 + 476 >> 2] & ($6 << 8 | 256)) << 1) >> 1]) >> 16) | 0
    }
    $5 = $5 << 1;
    HEAP32[$4 >> 2] = $5 + HEAP32[$4 >> 2];
    HEAP32[$4 + 4 >> 2] = $5 + HEAP32[$4 + 4 >> 2];
    $9 = $9 + 1 | 0;
    if (($2 | 0) != ($9 | 0)) {
     continue
    }
    break;
   };
  }
  return $0 + 576 | 0;
 }
 
 function dbs_Channel__BlockTemplate_sm2Percussion($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0;
  $6 = HEAP32[$0 + 20 >> 2];
  HEAP32[$0 + 24 >> 2] = $6;
  $5 = HEAPU8[$1 + 4156 | 0];
  HEAP32[$0 + 48 >> 2] = HEAP32[$0 + 44 >> 2] + ($5 & HEAPU8[$0 + 80 | 0]);
  $4 = HEAPU8[$1 + 4155 | 0];
  if (HEAPU8[$0 + 81 | 0] >>> $4 | 0) {
   $7 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 24 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 36 >> 2] >>> $4);
  }
  $6 = HEAP32[$0 + 104 >> 2];
  HEAP32[$0 + 108 >> 2] = $6;
  HEAP32[$0 + 132 >> 2] = HEAP32[$0 + 128 >> 2] + (HEAPU8[$0 + 164 | 0] & $5);
  if (HEAPU8[$0 + 165 | 0] >>> $4 | 0) {
   $7 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 108 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 120 >> 2] >>> $4);
  }
  $6 = HEAP32[$0 + 212 >> 2];
  HEAP32[$0 + 216 >> 2] = $6;
  HEAP32[$0 + 240 >> 2] = HEAP32[$0 + 236 >> 2] + (HEAPU8[$0 + 272 | 0] & $5);
  if (HEAPU8[$0 + 273 | 0] >>> $4 | 0) {
   $7 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 216 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 228 >> 2] >>> $4);
  }
  $6 = HEAP32[$0 + 296 >> 2];
  HEAP32[$0 + 300 >> 2] = $6;
  HEAP32[$0 + 324 >> 2] = HEAP32[$0 + 320 >> 2] + (HEAPU8[$0 + 356 | 0] & $5);
  if (HEAPU8[$0 + 357 | 0] >>> $4 | 0) {
   $7 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 300 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 312 >> 2] >>> $4);
  }
  $6 = HEAP32[$0 + 404 >> 2];
  HEAP32[$0 + 408 >> 2] = $6;
  HEAP32[$0 + 432 >> 2] = HEAP32[$0 + 428 >> 2] + (HEAPU8[$0 + 464 | 0] & $5);
  if (HEAPU8[$0 + 465 | 0] >>> $4 | 0) {
   $7 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 408 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 420 >> 2] >>> $4);
  }
  $6 = HEAP32[$0 + 488 >> 2];
  HEAP32[$0 + 492 >> 2] = $6;
  HEAP32[$0 + 516 >> 2] = HEAP32[$0 + 512 >> 2] + (HEAPU8[$0 + 548 | 0] & $5);
  if (HEAPU8[$0 + 549 | 0] >>> $4 | 0) {
   $5 = HEAP8[$1 + 4154 | 0];
   HEAP32[$0 + 492 >> 2] = ($6 - $5 | 0) + ($5 ^ HEAP32[$0 + 504 >> 2] >>> $4);
  }
  if ($2) {
   $11 = $0 + 84 | 0;
   $12 = $0 + 192 | 0;
   $13 = $0 + 276 | 0;
   $14 = $0 + 384 | 0;
   $15 = $0 + 468 | 0;
   while (1) {
    $4 = HEAP32[$0 + 176 >> 2];
    $5 = HEAP32[$0 + 180 >> 2];
    HEAP32[$0 + 176 >> 2] = $5;
    $6 = HEAPU8[$0 + 184 | 0];
    $7 = HEAP32[$0 + 48 >> 2] + (FUNCTION_TABLE[HEAP32[$0 >> 2]]($0) | 0) | 0;
    label$9 : {
     if ($7 >>> 0 >= 384) {
      HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2];
      $4 = 0;
      break label$9;
     }
     $8 = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2] | 0;
     HEAP32[$0 + 16 >> 2] = $8;
     $4 = Math_imul(HEAPU16[($7 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 4 >> 2] + ((HEAP32[$0 + 8 >> 2] & ($8 >>> 22) + ($4 + $5 >>> $6)) << 1) >> 1]) >> 16;
    }
    HEAP32[$0 + 180 >> 2] = $4;
    $7 = 0;
    $4 = 0;
    $4 = HEAP8[$0 + 186 | 0] & 1 ? $4 : HEAP32[$0 + 176 >> 2];
    $5 = HEAP32[$0 + 132 >> 2];
    $6 = FUNCTION_TABLE[HEAP32[$0 + 84 >> 2]]($11) | 0;
    $8 = HEAP32[$0 + 100 >> 2] + HEAP32[$0 + 108 >> 2] | 0;
    HEAP32[$0 + 100 >> 2] = $8;
    $5 = $5 + $6 | 0;
    if ($5 >>> 0 <= 383) {
     $7 = Math_imul(HEAPU16[($5 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 88 >> 2] + ((HEAP32[$0 + 92 >> 2] & $4 + ($8 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    $8 = HEAP32[$1 + 8 >> 2] + HEAP32[$1 + 12 >> 2] | 0;
    HEAP32[$1 + 8 >> 2] = $8 & 4194303;
    $4 = HEAP32[$1 + 16 >> 2];
    $5 = $8 >>> 12 | 0;
    if ($5) {
     $6 = $5 & 3;
     if ($6) {
      while (1) {
       $5 = $5 - 1 | 0;
       $4 = ($4 ^ 0 - ($4 & 1) & 8389378) >>> 1 | 0;
       $6 = $6 - 1 | 0;
       if ($6) {
        continue
       }
       break;
      }
     }
     if ($8 >>> 0 >= 16384) {
      while (1) {
       $4 = $4 ^ 0 - ($4 & 1) & 8389378;
       $4 = $4 >>> 2 ^ $4 << 30 >> 31 & 4194689;
       $4 = 0 - ($4 & 1) & 8389378 ^ $4;
       $4 = $4 >>> 2 ^ $4 << 30 >> 31 & 4194689;
       $5 = $5 - 4 | 0;
       if ($5) {
        continue
       }
       break;
      }
     }
     HEAP32[$1 + 16 >> 2] = $4;
    }
    $5 = HEAP32[$0 + 208 >> 2] + HEAP32[$0 + 216 >> 2] | 0;
    HEAP32[$0 + 208 >> 2] = $5;
    $6 = HEAP32[$0 + 484 >> 2] + HEAP32[$0 + 492 >> 2] | 0;
    HEAP32[$0 + 484 >> 2] = $6;
    $8 = $5 >>> 17 & 128;
    $5 = $5 >>> 22 | 0;
    $6 = ($6 >>> 20 ^ $6 >>> 22) & 32 | $8 ^ $5 & 136 ? 2 : 0;
    $4 = $4 & 1;
    $8 = HEAP32[$0 + 240 >> 2] + (FUNCTION_TABLE[HEAP32[$0 + 192 >> 2]]($12) | 0) | 0;
    if ($8 >>> 0 <= 383) {
     $7 = $7 + (Math_imul(HEAPU16[($8 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 196 >> 2] + ((HEAP32[$0 + 200 >> 2] & (52 << ($4 << 1 ^ $6) | $6 << 8)) << 1) >> 1]) >> 16) | 0
    }
    $8 = HEAP32[$0 + 324 >> 2] + (FUNCTION_TABLE[HEAP32[$0 + 276 >> 2]]($13) | 0) | 0;
    if ($8 >>> 0 <= 383) {
     $7 = $7 + (Math_imul(HEAPU16[($8 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 280 >> 2] + ((HEAP32[$0 + 284 >> 2] & (($5 & 256) + 256 ^ $4 << 8)) << 1) >> 1]) >> 16) | 0
    }
    $4 = HEAP32[$0 + 432 >> 2];
    $8 = FUNCTION_TABLE[HEAP32[$0 + 384 >> 2]]($14) | 0;
    $10 = HEAP32[$0 + 400 >> 2] + HEAP32[$0 + 408 >> 2] | 0;
    HEAP32[$0 + 400 >> 2] = $10;
    $5 = 0;
    $4 = $4 + $8 | 0;
    if ($4 >>> 0 <= 383) {
     $5 = Math_imul(HEAPU16[($4 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 388 >> 2] + ((HEAP32[$0 + 392 >> 2] & $10 >>> 22) << 1) >> 1]) >> 16
    }
    $4 = ($9 << 2) + $3 | 0;
    $5 = $5 + $7 | 0;
    $7 = HEAP32[$0 + 516 >> 2] + (FUNCTION_TABLE[HEAP32[$0 + 468 >> 2]]($15) | 0) | 0;
    if ($7 >>> 0 <= 383) {
     $5 = $5 + (Math_imul(HEAPU16[($7 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 472 >> 2] + ((HEAP32[$0 + 476 >> 2] & ($6 << 8 | 256)) << 1) >> 1]) >> 16) | 0
    }
    HEAP32[$4 >> 2] = HEAP32[$4 >> 2] + ($5 << 1);
    $9 = $9 + 1 | 0;
    if (($2 | 0) != ($9 | 0)) {
     continue
    }
    break;
   };
  }
  return $0 + 576 | 0;
 }
 
 function dbs_Operator__TemplateVolumeATTACK($0) {
  $0 = $0 | 0;
  var $1 = 0, $2 = 0;
  $2 = HEAP32[$0 + 68 >> 2] + HEAP32[$0 + 56 >> 2] | 0;
  HEAP32[$0 + 68 >> 2] = $2 & 16777215;
  $1 = HEAP32[$0 + 52 >> 2];
  $2 = $2 >>> 24 | 0;
  if ($2) {
   $1 = $1 + (Math_imul($1 ^ -1, $2) >> 3) | 0;
   if (($1 | 0) < 0) {
    HEAP8[$0 + 79 | 0] = 3;
    HEAP32[$0 + 68 >> 2] = 0;
    HEAP32[$0 + 52 >> 2] = 0;
    HEAP32[$0 >> 2] = 13;
    return 0;
   }
   HEAP32[$0 + 52 >> 2] = $1;
  }
  return $1 | 0;
 }
 
 function dbs_Operator__TemplateVolumeRELEASE($0) {
  $0 = $0 | 0;
  var $1 = 0;
  $1 = HEAP32[$0 + 68 >> 2] + HEAP32[$0 + 64 >> 2] | 0;
  HEAP32[$0 + 68 >> 2] = $1 & 16777215;
  $1 = HEAP32[$0 + 52 >> 2] + ($1 >>> 24 | 0) | 0;
  if (($1 | 0) >= 511) {
   HEAP32[$0 >> 2] = 14;
   HEAP8[$0 + 79 | 0] = 0;
   $1 = 511;
  }
  HEAP32[$0 + 52 >> 2] = $1;
  return $1 | 0;
 }
 
 function dbs_Channel__BlockTemplate_sm3FMFM($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0;
  label$1 : {
   label$2 : {
    $7 = HEAP32[$0 + 320 >> 2];
    if (($7 + HEAP32[$0 + 328 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 348 | 0] >>> HEAPU8[$0 + 355 | 0] & 1)) {
     break label$2
    }
    HEAP32[$0 + 176 >> 2] = 0;
    HEAP32[$0 + 180 >> 2] = 0;
    break label$1;
   }
   $5 = HEAP32[$0 + 20 >> 2];
   HEAP32[$0 + 24 >> 2] = $5;
   $8 = HEAPU8[$1 + 4156 | 0];
   HEAP32[$0 + 48 >> 2] = HEAP32[$0 + 44 >> 2] + ($8 & HEAPU8[$0 + 80 | 0]);
   $4 = HEAPU8[$1 + 4155 | 0];
   if (HEAPU8[$0 + 81 | 0] >>> $4 | 0) {
    $6 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 24 >> 2] = ($5 - $6 | 0) + ($6 ^ HEAP32[$0 + 36 >> 2] >>> $4);
   }
   $5 = HEAP32[$0 + 104 >> 2];
   HEAP32[$0 + 108 >> 2] = $5;
   HEAP32[$0 + 132 >> 2] = HEAP32[$0 + 128 >> 2] + (HEAPU8[$0 + 164 | 0] & $8);
   if (HEAPU8[$0 + 165 | 0] >>> $4 | 0) {
    $6 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 108 >> 2] = ($5 - $6 | 0) + ($6 ^ HEAP32[$0 + 120 >> 2] >>> $4);
   }
   $5 = HEAP32[$0 + 212 >> 2];
   HEAP32[$0 + 216 >> 2] = $5;
   HEAP32[$0 + 240 >> 2] = HEAP32[$0 + 236 >> 2] + (HEAPU8[$0 + 272 | 0] & $8);
   if (HEAPU8[$0 + 273 | 0] >>> $4 | 0) {
    $6 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 216 >> 2] = ($5 - $6 | 0) + ($6 ^ HEAP32[$0 + 228 >> 2] >>> $4);
   }
   $5 = HEAP32[$0 + 296 >> 2];
   HEAP32[$0 + 300 >> 2] = $5;
   HEAP32[$0 + 324 >> 2] = (HEAPU8[$0 + 356 | 0] & $8) + $7;
   if (HEAPU8[$0 + 357 | 0] >>> $4 | 0) {
    $1 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 300 >> 2] = ($5 - $1 | 0) + ($1 ^ HEAP32[$0 + 312 >> 2] >>> $4);
   }
   if (!$2) {
    break label$1
   }
   $9 = $0 + 276 | 0;
   $10 = $0 + 192 | 0;
   $11 = $0 + 84 | 0;
   while (1) {
    $4 = HEAP32[$0 + 176 >> 2];
    $1 = HEAP32[$0 + 180 >> 2];
    HEAP32[$0 + 176 >> 2] = $1;
    $8 = HEAPU8[$0 + 184 | 0];
    $7 = HEAP32[$0 + 48 >> 2] + (FUNCTION_TABLE[HEAP32[$0 >> 2]]($0) | 0) | 0;
    label$8 : {
     if ($7 >>> 0 >= 384) {
      HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2];
      $1 = 0;
      break label$8;
     }
     $5 = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2] | 0;
     HEAP32[$0 + 16 >> 2] = $5;
     $1 = Math_imul(HEAPU16[($7 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 4 >> 2] + ((HEAP32[$0 + 8 >> 2] & ($5 >>> 22) + ($1 + $4 >>> $8)) << 1) >> 1]) >> 16;
    }
    HEAP32[$0 + 180 >> 2] = $1;
    $5 = HEAP32[$0 + 176 >> 2];
    $4 = HEAP32[$0 + 132 >> 2];
    $1 = FUNCTION_TABLE[HEAP32[$0 + 84 >> 2]]($11) | 0;
    $6 = HEAP32[$0 + 100 >> 2] + HEAP32[$0 + 108 >> 2] | 0;
    HEAP32[$0 + 100 >> 2] = $6;
    $8 = 0;
    $7 = 0;
    $4 = $1 + $4 | 0;
    if ($4 >>> 0 <= 383) {
     $7 = Math_imul(HEAPU16[($4 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 88 >> 2] + ((HEAP32[$0 + 92 >> 2] & $5 + ($6 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    $4 = HEAP32[$0 + 240 >> 2];
    $1 = FUNCTION_TABLE[HEAP32[$0 + 192 >> 2]]($10) | 0;
    $5 = HEAP32[$0 + 208 >> 2] + HEAP32[$0 + 216 >> 2] | 0;
    HEAP32[$0 + 208 >> 2] = $5;
    $4 = $1 + $4 | 0;
    if ($4 >>> 0 <= 383) {
     $8 = Math_imul(HEAPU16[($4 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 196 >> 2] + ((HEAP32[$0 + 200 >> 2] & $7 + ($5 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    $1 = HEAP32[$0 + 324 >> 2];
    $7 = FUNCTION_TABLE[HEAP32[$0 + 276 >> 2]]($9) | 0;
    $5 = HEAP32[$0 + 292 >> 2] + HEAP32[$0 + 300 >> 2] | 0;
    HEAP32[$0 + 292 >> 2] = $5;
    $4 = 0;
    $1 = $1 + $7 | 0;
    if ($1 >>> 0 <= 383) {
     $4 = Math_imul(HEAPU16[($1 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 280 >> 2] + ((HEAP32[$0 + 284 >> 2] & $8 + ($5 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    HEAP32[$3 >> 2] = HEAP32[$3 >> 2] + (HEAP8[$0 + 188 | 0] & $4);
    $1 = $3 + 4 | 0;
    HEAP32[$1 >> 2] = HEAP32[$1 >> 2] + (HEAP8[$0 + 189 | 0] & $4);
    $3 = $3 + 8 | 0;
    $2 = $2 - 1 | 0;
    if ($2) {
     continue
    }
    break;
   };
  }
  return $0 + 384 | 0;
 }
 
 function dbs_Channel__BlockTemplate_sm3AMFM($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0, $12 = 0;
  label$1 : {
   label$2 : {
    $4 = HEAP32[$0 + 44 >> 2];
    if (($4 + HEAP32[$0 + 52 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 72 | 0] >>> HEAPU8[$0 + 79 | 0] & 1)) {
     break label$2
    }
    if ((HEAP32[$0 + 328 >> 2] + HEAP32[$0 + 320 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 348 | 0] >>> HEAPU8[$0 + 355 | 0] & 1)) {
     break label$2
    }
    HEAP32[$0 + 176 >> 2] = 0;
    HEAP32[$0 + 180 >> 2] = 0;
    break label$1;
   }
   $5 = HEAP32[$0 + 20 >> 2];
   HEAP32[$0 + 24 >> 2] = $5;
   $7 = HEAPU8[$1 + 4156 | 0];
   HEAP32[$0 + 48 >> 2] = ($7 & HEAPU8[$0 + 80 | 0]) + $4;
   $4 = HEAPU8[$1 + 4155 | 0];
   if (HEAPU8[$0 + 81 | 0] >>> $4 | 0) {
    $6 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 24 >> 2] = ($5 - $6 | 0) + ($6 ^ HEAP32[$0 + 36 >> 2] >>> $4);
   }
   $5 = HEAP32[$0 + 104 >> 2];
   HEAP32[$0 + 108 >> 2] = $5;
   HEAP32[$0 + 132 >> 2] = HEAP32[$0 + 128 >> 2] + (HEAPU8[$0 + 164 | 0] & $7);
   if (HEAPU8[$0 + 165 | 0] >>> $4 | 0) {
    $6 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 108 >> 2] = ($5 - $6 | 0) + ($6 ^ HEAP32[$0 + 120 >> 2] >>> $4);
   }
   $5 = HEAP32[$0 + 212 >> 2];
   HEAP32[$0 + 216 >> 2] = $5;
   HEAP32[$0 + 240 >> 2] = HEAP32[$0 + 236 >> 2] + (HEAPU8[$0 + 272 | 0] & $7);
   if (HEAPU8[$0 + 273 | 0] >>> $4 | 0) {
    $6 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 216 >> 2] = ($5 - $6 | 0) + ($6 ^ HEAP32[$0 + 228 >> 2] >>> $4);
   }
   $5 = HEAP32[$0 + 296 >> 2];
   HEAP32[$0 + 300 >> 2] = $5;
   HEAP32[$0 + 324 >> 2] = HEAP32[$0 + 320 >> 2] + (HEAPU8[$0 + 356 | 0] & $7);
   if (HEAPU8[$0 + 357 | 0] >>> $4 | 0) {
    $1 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 300 >> 2] = ($5 - $1 | 0) + ($1 ^ HEAP32[$0 + 312 >> 2] >>> $4);
   }
   if (!$2) {
    break label$1
   }
   $9 = $0 + 84 | 0;
   $10 = $0 + 192 | 0;
   $11 = $0 + 276 | 0;
   while (1) {
    $4 = HEAP32[$0 + 176 >> 2];
    $1 = HEAP32[$0 + 180 >> 2];
    HEAP32[$0 + 176 >> 2] = $1;
    $7 = HEAPU8[$0 + 184 | 0];
    $5 = HEAP32[$0 + 48 >> 2] + (FUNCTION_TABLE[HEAP32[$0 >> 2]]($0) | 0) | 0;
    label$8 : {
     if ($5 >>> 0 >= 384) {
      HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2];
      $1 = 0;
      break label$8;
     }
     $6 = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2] | 0;
     HEAP32[$0 + 16 >> 2] = $6;
     $1 = Math_imul(HEAPU16[($5 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 4 >> 2] + ((HEAP32[$0 + 8 >> 2] & ($6 >>> 22) + ($1 + $4 >>> $7)) << 1) >> 1]) >> 16;
    }
    HEAP32[$0 + 180 >> 2] = $1;
    $1 = HEAP32[$0 + 176 >> 2];
    $4 = HEAP32[$0 + 132 >> 2];
    $7 = FUNCTION_TABLE[HEAP32[$0 + 84 >> 2]]($9) | 0;
    $8 = HEAP32[$0 + 100 >> 2] + HEAP32[$0 + 108 >> 2] | 0;
    HEAP32[$0 + 100 >> 2] = $8;
    $5 = 0;
    $6 = 0;
    $4 = $4 + $7 | 0;
    if ($4 >>> 0 <= 383) {
     $6 = Math_imul(HEAPU16[($4 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 88 >> 2] + ((HEAP32[$0 + 92 >> 2] & $8 >>> 22) << 1) >> 1]) >> 16
    }
    $4 = HEAP32[$0 + 240 >> 2];
    $7 = FUNCTION_TABLE[HEAP32[$0 + 192 >> 2]]($10) | 0;
    $8 = HEAP32[$0 + 208 >> 2] + HEAP32[$0 + 216 >> 2] | 0;
    HEAP32[$0 + 208 >> 2] = $8;
    $4 = $4 + $7 | 0;
    if ($4 >>> 0 <= 383) {
     $5 = Math_imul(HEAPU16[($4 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 196 >> 2] + ((HEAP32[$0 + 200 >> 2] & $6 + ($8 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    $7 = HEAP32[$0 + 324 >> 2];
    $6 = FUNCTION_TABLE[HEAP32[$0 + 276 >> 2]]($11) | 0;
    $8 = HEAP32[$0 + 292 >> 2] + HEAP32[$0 + 300 >> 2] | 0;
    HEAP32[$0 + 292 >> 2] = $8;
    $4 = 0;
    $12 = HEAP32[$3 >> 2];
    $7 = $7 + $6 | 0;
    if ($7 >>> 0 <= 383) {
     $4 = Math_imul(HEAPU16[($7 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 280 >> 2] + ((HEAP32[$0 + 284 >> 2] & $5 + ($8 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    $4 = $4 + $1 | 0;
    HEAP32[$3 >> 2] = $12 + ($4 & HEAP8[$0 + 188 | 0]);
    $1 = $3 + 4 | 0;
    HEAP32[$1 >> 2] = HEAP32[$1 >> 2] + (HEAP8[$0 + 189 | 0] & $4);
    $3 = $3 + 8 | 0;
    $2 = $2 - 1 | 0;
    if ($2) {
     continue
    }
    break;
   };
  }
  return $0 + 384 | 0;
 }
 
 function dbs_Channel__BlockTemplate_sm3FMAM($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0, $12 = 0;
  label$1 : {
   label$2 : {
    $5 = HEAP32[$0 + 128 >> 2];
    if (($5 + HEAP32[$0 + 136 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 156 | 0] >>> HEAPU8[$0 + 163 | 0] & 1)) {
     break label$2
    }
    if ((HEAP32[$0 + 328 >> 2] + HEAP32[$0 + 320 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 348 | 0] >>> HEAPU8[$0 + 355 | 0] & 1)) {
     break label$2
    }
    HEAP32[$0 + 176 >> 2] = 0;
    HEAP32[$0 + 180 >> 2] = 0;
    break label$1;
   }
   $4 = HEAP32[$0 + 20 >> 2];
   HEAP32[$0 + 24 >> 2] = $4;
   $7 = HEAPU8[$1 + 4156 | 0];
   HEAP32[$0 + 48 >> 2] = HEAP32[$0 + 44 >> 2] + ($7 & HEAPU8[$0 + 80 | 0]);
   $6 = HEAPU8[$1 + 4155 | 0];
   if (HEAPU8[$0 + 81 | 0] >>> $6 | 0) {
    $8 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 24 >> 2] = ($4 - $8 | 0) + ($8 ^ HEAP32[$0 + 36 >> 2] >>> $6);
   }
   $4 = HEAP32[$0 + 104 >> 2];
   HEAP32[$0 + 108 >> 2] = $4;
   HEAP32[$0 + 132 >> 2] = (HEAPU8[$0 + 164 | 0] & $7) + $5;
   if (HEAPU8[$0 + 165 | 0] >>> $6 | 0) {
    $5 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 108 >> 2] = ($4 - $5 | 0) + ($5 ^ HEAP32[$0 + 120 >> 2] >>> $6);
   }
   $5 = HEAP32[$0 + 212 >> 2];
   HEAP32[$0 + 216 >> 2] = $5;
   HEAP32[$0 + 240 >> 2] = HEAP32[$0 + 236 >> 2] + (HEAPU8[$0 + 272 | 0] & $7);
   if (HEAPU8[$0 + 273 | 0] >>> $6 | 0) {
    $4 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 216 >> 2] = ($5 - $4 | 0) + ($4 ^ HEAP32[$0 + 228 >> 2] >>> $6);
   }
   $5 = HEAP32[$0 + 296 >> 2];
   HEAP32[$0 + 300 >> 2] = $5;
   HEAP32[$0 + 324 >> 2] = HEAP32[$0 + 320 >> 2] + (HEAPU8[$0 + 356 | 0] & $7);
   if (HEAPU8[$0 + 357 | 0] >>> $6 | 0) {
    $1 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 300 >> 2] = ($5 - $1 | 0) + ($1 ^ HEAP32[$0 + 312 >> 2] >>> $6);
   }
   if (!$2) {
    break label$1
   }
   $9 = $0 + 84 | 0;
   $10 = $0 + 192 | 0;
   $11 = $0 + 276 | 0;
   while (1) {
    $6 = HEAP32[$0 + 176 >> 2];
    $1 = HEAP32[$0 + 180 >> 2];
    HEAP32[$0 + 176 >> 2] = $1;
    $7 = HEAPU8[$0 + 184 | 0];
    $5 = HEAP32[$0 + 48 >> 2] + (FUNCTION_TABLE[HEAP32[$0 >> 2]]($0) | 0) | 0;
    label$8 : {
     if ($5 >>> 0 >= 384) {
      HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2];
      $1 = 0;
      break label$8;
     }
     $4 = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2] | 0;
     HEAP32[$0 + 16 >> 2] = $4;
     $1 = Math_imul(HEAPU16[($5 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 4 >> 2] + ((HEAP32[$0 + 8 >> 2] & ($4 >>> 22) + ($1 + $6 >>> $7)) << 1) >> 1]) >> 16;
    }
    HEAP32[$0 + 180 >> 2] = $1;
    $4 = HEAP32[$0 + 176 >> 2];
    $1 = HEAP32[$0 + 132 >> 2];
    $7 = FUNCTION_TABLE[HEAP32[$0 + 84 >> 2]]($9) | 0;
    $8 = HEAP32[$0 + 100 >> 2] + HEAP32[$0 + 108 >> 2] | 0;
    HEAP32[$0 + 100 >> 2] = $8;
    $5 = 0;
    $6 = 0;
    $1 = $1 + $7 | 0;
    if ($1 >>> 0 <= 383) {
     $6 = Math_imul(HEAPU16[($1 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 88 >> 2] + ((HEAP32[$0 + 92 >> 2] & $4 + ($8 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    $1 = HEAP32[$0 + 240 >> 2];
    $7 = FUNCTION_TABLE[HEAP32[$0 + 192 >> 2]]($10) | 0;
    $4 = HEAP32[$0 + 208 >> 2] + HEAP32[$0 + 216 >> 2] | 0;
    HEAP32[$0 + 208 >> 2] = $4;
    $1 = $1 + $7 | 0;
    if ($1 >>> 0 <= 383) {
     $5 = Math_imul(HEAPU16[($1 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 196 >> 2] + ((HEAP32[$0 + 200 >> 2] & $4 >>> 22) << 1) >> 1]) >> 16
    }
    $7 = HEAP32[$0 + 324 >> 2];
    $4 = FUNCTION_TABLE[HEAP32[$0 + 276 >> 2]]($11) | 0;
    $8 = HEAP32[$0 + 292 >> 2] + HEAP32[$0 + 300 >> 2] | 0;
    HEAP32[$0 + 292 >> 2] = $8;
    $1 = 0;
    $12 = HEAP32[$3 >> 2];
    $7 = $4 + $7 | 0;
    if ($7 >>> 0 <= 383) {
     $1 = Math_imul(HEAPU16[($7 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 280 >> 2] + ((HEAP32[$0 + 284 >> 2] & $5 + ($8 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    $6 = $1 + $6 | 0;
    HEAP32[$3 >> 2] = $12 + ($6 & HEAP8[$0 + 188 | 0]);
    $1 = $3 + 4 | 0;
    HEAP32[$1 >> 2] = HEAP32[$1 >> 2] + (HEAP8[$0 + 189 | 0] & $6);
    $3 = $3 + 8 | 0;
    $2 = $2 - 1 | 0;
    if ($2) {
     continue
    }
    break;
   };
  }
  return $0 + 384 | 0;
 }
 
 function dbs_Channel__BlockTemplate_sm3AMAM($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0;
  label$1 : {
   label$2 : {
    $4 = HEAP32[$0 + 44 >> 2];
    if (($4 + HEAP32[$0 + 52 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 72 | 0] >>> HEAPU8[$0 + 79 | 0] & 1)) {
     break label$2
    }
    if ((HEAP32[$0 + 244 >> 2] + HEAP32[$0 + 236 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 264 | 0] >>> HEAPU8[$0 + 271 | 0] & 1)) {
     break label$2
    }
    if ((HEAP32[$0 + 328 >> 2] + HEAP32[$0 + 320 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 348 | 0] >>> HEAPU8[$0 + 355 | 0] & 1)) {
     break label$2
    }
    HEAP32[$0 + 176 >> 2] = 0;
    HEAP32[$0 + 180 >> 2] = 0;
    break label$1;
   }
   $6 = HEAP32[$0 + 20 >> 2];
   HEAP32[$0 + 24 >> 2] = $6;
   $5 = HEAPU8[$1 + 4156 | 0];
   HEAP32[$0 + 48 >> 2] = ($5 & HEAPU8[$0 + 80 | 0]) + $4;
   $4 = HEAPU8[$1 + 4155 | 0];
   if (HEAPU8[$0 + 81 | 0] >>> $4 | 0) {
    $7 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 24 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 36 >> 2] >>> $4);
   }
   $6 = HEAP32[$0 + 104 >> 2];
   HEAP32[$0 + 108 >> 2] = $6;
   HEAP32[$0 + 132 >> 2] = HEAP32[$0 + 128 >> 2] + (HEAPU8[$0 + 164 | 0] & $5);
   if (HEAPU8[$0 + 165 | 0] >>> $4 | 0) {
    $7 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 108 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 120 >> 2] >>> $4);
   }
   $6 = HEAP32[$0 + 212 >> 2];
   HEAP32[$0 + 216 >> 2] = $6;
   HEAP32[$0 + 240 >> 2] = HEAP32[$0 + 236 >> 2] + (HEAPU8[$0 + 272 | 0] & $5);
   if (HEAPU8[$0 + 273 | 0] >>> $4 | 0) {
    $7 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 216 >> 2] = ($6 - $7 | 0) + ($7 ^ HEAP32[$0 + 228 >> 2] >>> $4);
   }
   $6 = HEAP32[$0 + 296 >> 2];
   HEAP32[$0 + 300 >> 2] = $6;
   HEAP32[$0 + 324 >> 2] = HEAP32[$0 + 320 >> 2] + (HEAPU8[$0 + 356 | 0] & $5);
   if (HEAPU8[$0 + 357 | 0] >>> $4 | 0) {
    $1 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 300 >> 2] = ($6 - $1 | 0) + ($1 ^ HEAP32[$0 + 312 >> 2] >>> $4);
   }
   if (!$2) {
    break label$1
   }
   $9 = $0 + 84 | 0;
   $10 = $0 + 192 | 0;
   $11 = $0 + 276 | 0;
   while (1) {
    $4 = HEAP32[$0 + 176 >> 2];
    $1 = HEAP32[$0 + 180 >> 2];
    HEAP32[$0 + 176 >> 2] = $1;
    $5 = HEAPU8[$0 + 184 | 0];
    $6 = HEAP32[$0 + 48 >> 2] + (FUNCTION_TABLE[HEAP32[$0 >> 2]]($0) | 0) | 0;
    label$8 : {
     if ($6 >>> 0 >= 384) {
      HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2];
      $1 = 0;
      break label$8;
     }
     $7 = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2] | 0;
     HEAP32[$0 + 16 >> 2] = $7;
     $1 = Math_imul(HEAPU16[($6 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 4 >> 2] + ((HEAP32[$0 + 8 >> 2] & ($7 >>> 22) + ($1 + $4 >>> $5)) << 1) >> 1]) >> 16;
    }
    HEAP32[$0 + 180 >> 2] = $1;
    $1 = HEAP32[$0 + 176 >> 2];
    $5 = HEAP32[$0 + 132 >> 2];
    $6 = FUNCTION_TABLE[HEAP32[$0 + 84 >> 2]]($9) | 0;
    $8 = HEAP32[$0 + 100 >> 2] + HEAP32[$0 + 108 >> 2] | 0;
    HEAP32[$0 + 100 >> 2] = $8;
    $4 = 0;
    $7 = 0;
    $5 = $5 + $6 | 0;
    if ($5 >>> 0 <= 383) {
     $7 = Math_imul(HEAPU16[($5 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 88 >> 2] + ((HEAP32[$0 + 92 >> 2] & $8 >>> 22) << 1) >> 1]) >> 16
    }
    $5 = HEAP32[$0 + 240 >> 2];
    $6 = FUNCTION_TABLE[HEAP32[$0 + 192 >> 2]]($10) | 0;
    $8 = HEAP32[$0 + 208 >> 2] + HEAP32[$0 + 216 >> 2] | 0;
    HEAP32[$0 + 208 >> 2] = $8;
    $5 = $5 + $6 | 0;
    if ($5 >>> 0 <= 383) {
     $4 = Math_imul(HEAPU16[($5 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 196 >> 2] + ((HEAP32[$0 + 200 >> 2] & $7 + ($8 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    $5 = HEAP32[$0 + 324 >> 2];
    $6 = FUNCTION_TABLE[HEAP32[$0 + 276 >> 2]]($11) | 0;
    $7 = HEAP32[$0 + 292 >> 2] + HEAP32[$0 + 300 >> 2] | 0;
    HEAP32[$0 + 292 >> 2] = $7;
    $1 = $1 + $4 | 0;
    $4 = 0;
    $8 = HEAP32[$3 >> 2];
    $5 = $5 + $6 | 0;
    if ($5 >>> 0 <= 383) {
     $4 = Math_imul(HEAPU16[($5 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 280 >> 2] + ((HEAP32[$0 + 284 >> 2] & $7 >>> 22) << 1) >> 1]) >> 16
    }
    $4 = $4 + $1 | 0;
    HEAP32[$3 >> 2] = $8 + ($4 & HEAP8[$0 + 188 | 0]);
    $1 = $3 + 4 | 0;
    HEAP32[$1 >> 2] = HEAP32[$1 >> 2] + (HEAP8[$0 + 189 | 0] & $4);
    $3 = $3 + 8 | 0;
    $2 = $2 - 1 | 0;
    if ($2) {
     continue
    }
    break;
   };
  }
  return $0 + 384 | 0;
 }
 
 function dbs_Channel__BlockTemplate_sm3AM($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
  label$1 : {
   label$2 : {
    $4 = HEAP32[$0 + 44 >> 2];
    if (($4 + HEAP32[$0 + 52 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 72 | 0] >>> HEAPU8[$0 + 79 | 0] & 1)) {
     break label$2
    }
    if ((HEAP32[$0 + 136 >> 2] + HEAP32[$0 + 128 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 156 | 0] >>> HEAPU8[$0 + 163 | 0] & 1)) {
     break label$2
    }
    HEAP32[$0 + 176 >> 2] = 0;
    HEAP32[$0 + 180 >> 2] = 0;
    break label$1;
   }
   $5 = HEAP32[$0 + 20 >> 2];
   HEAP32[$0 + 24 >> 2] = $5;
   $6 = HEAPU8[$1 + 4156 | 0];
   HEAP32[$0 + 48 >> 2] = ($6 & HEAPU8[$0 + 80 | 0]) + $4;
   $4 = HEAPU8[$1 + 4155 | 0];
   if (HEAPU8[$0 + 81 | 0] >>> $4 | 0) {
    $7 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 24 >> 2] = ($5 - $7 | 0) + ($7 ^ HEAP32[$0 + 36 >> 2] >>> $4);
   }
   $5 = HEAP32[$0 + 104 >> 2];
   HEAP32[$0 + 108 >> 2] = $5;
   HEAP32[$0 + 132 >> 2] = HEAP32[$0 + 128 >> 2] + (HEAPU8[$0 + 164 | 0] & $6);
   if (HEAPU8[$0 + 165 | 0] >>> $4 | 0) {
    $1 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 108 >> 2] = ($5 - $1 | 0) + ($1 ^ HEAP32[$0 + 120 >> 2] >>> $4);
   }
   if (!$2) {
    break label$1
   }
   $8 = $0 + 84 | 0;
   while (1) {
    $1 = HEAP32[$0 + 176 >> 2];
    $4 = HEAP32[$0 + 180 >> 2];
    HEAP32[$0 + 176 >> 2] = $4;
    $6 = HEAPU8[$0 + 184 | 0];
    $5 = HEAP32[$0 + 48 >> 2] + (FUNCTION_TABLE[HEAP32[$0 >> 2]]($0) | 0) | 0;
    label$6 : {
     if ($5 >>> 0 >= 384) {
      HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2];
      $1 = 0;
      break label$6;
     }
     $7 = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2] | 0;
     HEAP32[$0 + 16 >> 2] = $7;
     $1 = Math_imul(HEAPU16[($5 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 4 >> 2] + ((HEAP32[$0 + 8 >> 2] & ($7 >>> 22) + ($1 + $4 >>> $6)) << 1) >> 1]) >> 16;
    }
    HEAP32[$0 + 180 >> 2] = $1;
    $4 = HEAP32[$0 + 176 >> 2];
    $6 = HEAP32[$0 + 132 >> 2];
    $5 = FUNCTION_TABLE[HEAP32[$0 + 84 >> 2]]($8) | 0;
    $7 = HEAP32[$0 + 100 >> 2] + HEAP32[$0 + 108 >> 2] | 0;
    HEAP32[$0 + 100 >> 2] = $7;
    $1 = 0;
    $9 = HEAP32[$3 >> 2];
    $6 = $5 + $6 | 0;
    if ($6 >>> 0 <= 383) {
     $1 = Math_imul(HEAPU16[($6 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 88 >> 2] + ((HEAP32[$0 + 92 >> 2] & $7 >>> 22) << 1) >> 1]) >> 16
    }
    $1 = $1 + $4 | 0;
    HEAP32[$3 >> 2] = $9 + ($1 & HEAP8[$0 + 188 | 0]);
    $4 = $3 + 4 | 0;
    HEAP32[$4 >> 2] = HEAP32[$4 >> 2] + (HEAP8[$0 + 189 | 0] & $1);
    $3 = $3 + 8 | 0;
    $2 = $2 - 1 | 0;
    if ($2) {
     continue
    }
    break;
   };
  }
  return $0 + 192 | 0;
 }
 
 function dbs_Channel__BlockTemplate_sm3FM($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
  label$1 : {
   label$2 : {
    $7 = HEAP32[$0 + 128 >> 2];
    if (($7 + HEAP32[$0 + 136 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 156 | 0] >>> HEAPU8[$0 + 163 | 0] & 1)) {
     break label$2
    }
    HEAP32[$0 + 176 >> 2] = 0;
    HEAP32[$0 + 180 >> 2] = 0;
    break label$1;
   }
   $5 = HEAP32[$0 + 20 >> 2];
   HEAP32[$0 + 24 >> 2] = $5;
   $6 = HEAPU8[$1 + 4156 | 0];
   HEAP32[$0 + 48 >> 2] = HEAP32[$0 + 44 >> 2] + ($6 & HEAPU8[$0 + 80 | 0]);
   $4 = HEAPU8[$1 + 4155 | 0];
   if (HEAPU8[$0 + 81 | 0] >>> $4 | 0) {
    $8 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 24 >> 2] = ($5 - $8 | 0) + ($8 ^ HEAP32[$0 + 36 >> 2] >>> $4);
   }
   $5 = HEAP32[$0 + 104 >> 2];
   HEAP32[$0 + 108 >> 2] = $5;
   HEAP32[$0 + 132 >> 2] = (HEAPU8[$0 + 164 | 0] & $6) + $7;
   if (HEAPU8[$0 + 165 | 0] >>> $4 | 0) {
    $1 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 108 >> 2] = ($5 - $1 | 0) + ($1 ^ HEAP32[$0 + 120 >> 2] >>> $4);
   }
   if (!$2) {
    break label$1
   }
   $8 = $0 + 84 | 0;
   while (1) {
    $1 = HEAP32[$0 + 176 >> 2];
    $4 = HEAP32[$0 + 180 >> 2];
    HEAP32[$0 + 176 >> 2] = $4;
    $7 = HEAPU8[$0 + 184 | 0];
    $6 = HEAP32[$0 + 48 >> 2] + (FUNCTION_TABLE[HEAP32[$0 >> 2]]($0) | 0) | 0;
    label$6 : {
     if ($6 >>> 0 >= 384) {
      HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2];
      $1 = 0;
      break label$6;
     }
     $5 = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2] | 0;
     HEAP32[$0 + 16 >> 2] = $5;
     $1 = Math_imul(HEAPU16[($6 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 4 >> 2] + ((HEAP32[$0 + 8 >> 2] & ($5 >>> 22) + ($1 + $4 >>> $7)) << 1) >> 1]) >> 16;
    }
    HEAP32[$0 + 180 >> 2] = $1;
    $6 = HEAP32[$0 + 176 >> 2];
    $4 = HEAP32[$0 + 132 >> 2];
    $7 = FUNCTION_TABLE[HEAP32[$0 + 84 >> 2]]($8) | 0;
    $5 = HEAP32[$0 + 100 >> 2] + HEAP32[$0 + 108 >> 2] | 0;
    HEAP32[$0 + 100 >> 2] = $5;
    $1 = 0;
    $4 = $4 + $7 | 0;
    if ($4 >>> 0 <= 383) {
     $1 = Math_imul(HEAPU16[($4 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 88 >> 2] + ((HEAP32[$0 + 92 >> 2] & $6 + ($5 >>> 22 | 0)) << 1) >> 1]) >> 16
    }
    HEAP32[$3 >> 2] = HEAP32[$3 >> 2] + (HEAP8[$0 + 188 | 0] & $1);
    $4 = $3 + 4 | 0;
    HEAP32[$4 >> 2] = HEAP32[$4 >> 2] + (HEAP8[$0 + 189 | 0] & $1);
    $3 = $3 + 8 | 0;
    $2 = $2 - 1 | 0;
    if ($2) {
     continue
    }
    break;
   };
  }
  return $0 + 192 | 0;
 }
 
 function dbs_Channel__BlockTemplate_sm2AM($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
  label$1 : {
   label$2 : {
    $4 = HEAP32[$0 + 44 >> 2];
    if (($4 + HEAP32[$0 + 52 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 72 | 0] >>> HEAPU8[$0 + 79 | 0] & 1)) {
     break label$2
    }
    if ((HEAP32[$0 + 136 >> 2] + HEAP32[$0 + 128 >> 2] | 0) < 384) {
     break label$2
    }
    if (!(HEAPU8[$0 + 156 | 0] >>> HEAPU8[$0 + 163 | 0] & 1)) {
     break label$2
    }
    HEAP32[$0 + 176 >> 2] = 0;
    HEAP32[$0 + 180 >> 2] = 0;
    break label$1;
   }
   $5 = HEAP32[$0 + 20 >> 2];
   HEAP32[$0 + 24 >> 2] = $5;
   $6 = HEAPU8[$1 + 4156 | 0];
   HEAP32[$0 + 48 >> 2] = ($6 & HEAPU8[$0 + 80 | 0]) + $4;
   $4 = HEAPU8[$1 + 4155 | 0];
   if (HEAPU8[$0 + 81 | 0] >>> $4 | 0) {
    $7 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 24 >> 2] = ($5 - $7 | 0) + ($7 ^ HEAP32[$0 + 36 >> 2] >>> $4);
   }
   $5 = HEAP32[$0 + 104 >> 2];
   HEAP32[$0 + 108 >> 2] = $5;
   HEAP32[$0 + 132 >> 2] = HEAP32[$0 + 128 >> 2] + (HEAPU8[$0 + 164 | 0] & $6);
   if (HEAPU8[$0 + 165 | 0] >>> $4 | 0) {
    $1 = HEAP8[$1 + 4154 | 0];
    HEAP32[$0 + 108 >> 2] = ($5 - $1 | 0) + ($1 ^ HEAP32[$0 + 120 >> 2] >>> $4);
   }
   if (!$2) {
    break label$1
   }
   $8 = $0 + 84 | 0;
   while (1) {
    $1 = HEAP32[$0 + 176 >> 2];
    $4 = HEAP32[$0 + 180 >> 2];
    HEAP32[$0 + 176 >> 2] = $4;
    $6 = HEAPU8[$0 + 184 | 0];
    $5 = HEAP32[$0 + 48 >> 2] + (FUNCTION_TABLE[HEAP32[$0 >> 2]]($0) | 0) | 0;
    label$6 : {
     if ($5 >>> 0 >= 384) {
      HEAP32[$0 + 16 >> 2] = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2];
      $1 = 0;
      break label$6;
     }
     $7 = HEAP32[$0 + 16 >> 2] + HEAP32[$0 + 24 >> 2] | 0;
     HEAP32[$0 + 16 >> 2] = $7;
     $1 = Math_imul(HEAPU16[($5 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 4 >> 2] + ((HEAP32[$0 + 8 >> 2] & ($7 >>> 22) + ($1 + $4 >>> $6)) << 1) >> 1]) >> 16;
    }
    HEAP32[$0 + 180 >> 2] = $1;
    $4 = HEAP32[$0 + 176 >> 2];
    $6 = HEAP32[$0 + 132 >> 2];
    $5 = FUNCTION_TABLE[HEAP32[$0 + 84 >> 2]]($8) | 0;
    $7 = HEAP32[$0 + 100 >> 2] + HEAP32[$0 + 108 >> 2] | 0;
    HEAP32[$0 + 100 >> 2] = $7;
    $1 = 0;
    $9 = HEAP32[$3 >> 2];
    $6 = $5 + $6 | 0;
    if ($6 >>> 0 <= 383) {
     $1 = Math_imul(HEAPU16[($6 << 1) + 104096 >> 1], HEAP16[HEAP32[$0 + 88 >> 2] + ((HEAP32[$0 + 92 >> 2] & $7 >>> 22) << 1) >> 1]) >> 16
    }
    HEAP32[$3 >> 2] = $9 + ($1 + $4 | 0);
    $3 = $3 + 4 | 0;
    $2 = $2 - 1 | 0;
    if ($2) {
     continue
    }
    break;
   };
  }
  return $0 + 192 | 0;
 }
 
 function dbs_Chip__GenerateBlock3($0, $1, $2) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  var $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0;
  if ($1) {
   $13 = $0 + 4148 | 0;
   $12 = $0 + 692 | 0;
   while (1) {
    $7 = HEAPU8[$0 + 4152 | 0];
    $3 = HEAPU8[($7 >>> 2 | 0) + 75168 | 0];
    HEAP8[$0 + 4154 | 0] = $3 << 24 >> 24 >>> 7;
    HEAP8[$0 + 4155 | 0] = HEAPU8[$0 + 4157 | 0] + ($3 & 7);
    $5 = HEAPU8[$0 + 4153 | 0];
    HEAP8[$0 + 4156 | 0] = HEAPU8[$5 + 104992 | 0] >>> HEAPU8[$0 + 4158 | 0];
    $3 = HEAP32[$0 + 4 >> 2];
    $4 = HEAP32[$0 >> 2];
    $8 = (($3 - $4 | 0) + 1048575 >>> 0) / ($3 >>> 0) | 0;
    label$3 : {
     if ($8 >>> 0 > $1 >>> 0) {
      HEAP32[$0 >> 2] = $4 + Math_imul($1, $3);
      $8 = $1;
      break label$3;
     }
     HEAP8[$0 + 4152 | 0] = $7 + 1 & 31;
     HEAP32[$0 >> 2] = $4 + Math_imul($3, $8) & 1048575;
     if ($5 >>> 0 <= 50) {
      HEAP8[$0 + 4153 | 0] = $5 + 1;
      break label$3;
     }
     HEAP8[$0 + 4153 | 0] = 0;
    }
    $9 = $8 << 1;
    label$6 : {
     if (!$9) {
      break label$6
     }
     $4 = $9 & 6;
     $5 = 0;
     if ($9 >>> 0 >= 8) {
      $7 = $9 & -8;
      $3 = $2;
      while (1) {
       HEAP32[$3 >> 2] = 0;
       HEAP32[$3 + 4 >> 2] = 0;
       $6 = $3 + 24 | 0;
       HEAP32[$6 >> 2] = 0;
       HEAP32[$6 + 4 >> 2] = 0;
       $6 = $3 + 16 | 0;
       HEAP32[$6 >> 2] = 0;
       HEAP32[$6 + 4 >> 2] = 0;
       $6 = $3 + 8 | 0;
       HEAP32[$6 >> 2] = 0;
       HEAP32[$6 + 4 >> 2] = 0;
       $3 = $3 + 32 | 0;
       $5 = $5 + 8 | 0;
       if (($5 | 0) != ($7 | 0)) {
        continue
       }
       break;
      };
      if (!$4) {
       break label$6
      }
     }
     $3 = ($5 << 2) + $2 | 0;
     while (1) {
      HEAP32[$3 >> 2] = 0;
      $3 = $3 + 4 | 0;
      $4 = $4 - 1 | 0;
      if ($4) {
       continue
      }
      break;
     };
    }
    $3 = $12;
    label$10 : {
     if (HEAP32[18844]) {
      $18 = $9 & -8;
      $14 = $9 & 6;
      $15 = HEAP32[18845];
      $16 = HEAP32[18846];
      $10 = $3;
      while (1) {
       $3 = ($10 - $12 | 0) / 192 | 0;
       label$13 : {
        if (!$9) {
         break label$13
        }
        $5 = 0;
        if ($9 >>> 0 >= 8) {
         $4 = 93840;
         while (1) {
          HEAP32[$4 >> 2] = 0;
          HEAP32[$4 + 4 >> 2] = 0;
          $6 = $4 + 24 | 0;
          HEAP32[$6 >> 2] = 0;
          HEAP32[$6 + 4 >> 2] = 0;
          $6 = $4 + 16 | 0;
          HEAP32[$6 >> 2] = 0;
          HEAP32[$6 + 4 >> 2] = 0;
          $6 = $4 + 8 | 0;
          HEAP32[$6 >> 2] = 0;
          HEAP32[$6 + 4 >> 2] = 0;
          $4 = $4 + 32 | 0;
          $5 = $5 + 8 | 0;
          if (($5 | 0) != ($18 | 0)) {
           continue
          }
          break;
         };
         if (!$14) {
          break label$13
         }
        }
        $4 = ($5 << 2) + 93840 | 0;
        $5 = $14;
        while (1) {
         HEAP32[$4 >> 2] = 0;
         $4 = $4 + 4 | 0;
         $5 = $5 - 1 | 0;
         if ($5) {
          continue
         }
         break;
        };
       }
       $10 = FUNCTION_TABLE[HEAP32[$10 + 168 >> 2]]($10, $0, $8, 93840) | 0;
       $4 = ($10 - $12 | 0) / 192 | 0;
       $7 = $4 >>> 0 >= 18 ? 18 : $4;
       label$17 : {
        if ($7 >>> 0 <= $3 >>> 0) {
         break label$17
        }
        $5 = $3;
        $4 = $7 - $3 & 7;
        if ($4) {
         while (1) {
          HEAP8[$5 + 75388 | 0] = $3;
          $5 = $5 + 1 | 0;
          $4 = $4 - 1 | 0;
          if ($4) {
           continue
          }
          break;
         }
        }
        if ($3 - $7 >>> 0 > 4294967288) {
         break label$17
        }
        $6 = $5 - $7 | 0;
        $7 = 0;
        while (1) {
         $4 = $5 + $7 | 0;
         HEAP8[$4 + 75395 | 0] = $3;
         HEAP8[$4 + 75394 | 0] = $3;
         HEAP8[$4 + 75393 | 0] = $3;
         HEAP8[$4 + 75392 | 0] = $3;
         HEAP8[$4 + 75391 | 0] = $3;
         HEAP8[$4 + 75390 | 0] = $3;
         HEAP8[$4 + 75389 | 0] = $3;
         HEAP8[$4 + 75388 | 0] = $3;
         $7 = $7 + 8 | 0;
         if ($7 + $6 | 0) {
          continue
         }
         break;
        };
       }
       label$21 : {
        if (!$8) {
         $11 = 0;
         break label$21;
        }
        $19 = ($3 << 10) + 75406 | 0;
        $3 = 0;
        $4 = $16;
        $6 = $8;
        $11 = 0;
        while (1) {
         $7 = HEAP32[$3 + 93844 >> 2];
         $5 = $2 + $3 | 0;
         $17 = HEAP32[$3 + 93840 >> 2];
         HEAP32[$5 >> 2] = $17 + HEAP32[$5 >> 2];
         $5 = $5 + 4 | 0;
         HEAP32[$5 >> 2] = HEAP32[$5 >> 2] + $7;
         if (!($4 & 1)) {
          $5 = $7 + $17 >> 1;
          $5 = ($5 | 0) <= -32768 ? -32768 : $5;
          HEAP16[(($11 + $15 & 511) << 1) + $19 >> 1] = ($5 | 0) >= 32767 ? 32767 : $5;
          $11 = $11 + 1 | 0;
         }
         $3 = $3 + 8 | 0;
         $4 = $4 + 1 | 0;
         $6 = $6 - 1 | 0;
         if ($6) {
          continue
         }
         break;
        };
       }
       if ($10 >>> 0 < $13 >>> 0) {
        continue
       }
       break;
      };
      HEAP32[18845] = $11 + $15;
      HEAP32[18846] = $8 + $16 & 1;
      break label$10;
     }
     while (1) {
      $3 = FUNCTION_TABLE[HEAP32[$3 + 168 >> 2]]($3, $0, $8, $2) | 0;
      if ($13 >>> 0 > $3 >>> 0) {
       continue
      }
      break;
     };
    }
    $2 = ($9 << 2) + $2 | 0;
    $1 = $1 - $8 | 0;
    if ($1) {
     continue
    }
    break;
   };
  }
 }
 
 function opl_reset($0) {
  $0 = $0 | 0;
  var $1 = 0, $2 = 0, $3 = 0, $4 = 0;
  HEAP32[18794] = $0 ? $0 : 44100;
  if (!HEAPU8[95888]) {
   HEAP8[95888] = 1;
   $2 = -8192;
   while (1) {
    $0 = $2 + 74336 | 0;
    $1 = HEAPU8[$0 | 0] | HEAPU8[$0 + 1 | 0] << 8 | (HEAPU8[$0 + 2 | 0] << 16 | HEAPU8[$0 + 3 | 0] << 24);
    $4 = HEAPU8[$0 + 4 | 0] | HEAPU8[$0 + 5 | 0] << 8 | (HEAPU8[$0 + 6 | 0] << 16 | HEAPU8[$0 + 7 | 0] << 24);
    $3 = $2 + 104096 | 0;
    $0 = $1;
    HEAP8[$3 | 0] = $0;
    HEAP8[$3 + 1 | 0] = $0 >>> 8;
    HEAP8[$3 + 2 | 0] = $0 >>> 16;
    HEAP8[$3 + 3 | 0] = $0 >>> 24;
    HEAP8[$3 + 4 | 0] = $4;
    HEAP8[$3 + 5 | 0] = $4 >>> 8;
    HEAP8[$3 + 6 | 0] = $4 >>> 16;
    HEAP8[$3 + 7 | 0] = $4 >>> 24;
    $2 = $2 + 8 | 0;
    if ($2) {
     continue
    }
    break;
   };
   $2 = -768;
   while (1) {
    $0 = $2 + 75104 | 0;
    $1 = HEAPU8[$0 | 0] | HEAPU8[$0 + 1 | 0] << 8 | (HEAPU8[$0 + 2 | 0] << 16 | HEAPU8[$0 + 3 | 0] << 24);
    $3 = HEAPU8[$0 + 4 | 0] | HEAPU8[$0 + 5 | 0] << 8 | (HEAPU8[$0 + 6 | 0] << 16 | HEAPU8[$0 + 7 | 0] << 24);
    $4 = $2 + 104864 | 0;
    $0 = $1;
    HEAP8[$4 | 0] = $0;
    HEAP8[$4 + 1 | 0] = $0 >>> 8;
    HEAP8[$4 + 2 | 0] = $0 >>> 16;
    HEAP8[$4 + 3 | 0] = $0 >>> 24;
    HEAP8[$4 + 4 | 0] = $3;
    HEAP8[$4 + 5 | 0] = $3 >>> 8;
    HEAP8[$4 + 6 | 0] = $3 >>> 16;
    HEAP8[$4 + 7 | 0] = $3 >>> 24;
    $2 = $2 + 8 | 0;
    if ($2) {
     continue
    }
    break;
   };
   $2 = 0;
   $3 = 0;
   while (1) {
    HEAP8[$3 + 104879 | 0] = $2 << 2;
    HEAP8[$3 + 104864 | 0] = 0;
    HEAP8[$3 + 104878 | 0] = ((($2 | 0) <= 1 ? 1 : $2) << 2) - 4;
    HEAP8[$3 + 104877 | 0] = ((($2 | 0) <= 2 ? 2 : $2) << 2) - 8;
    HEAP8[$3 + 104876 | 0] = ((($2 | 0) <= 3 ? 3 : $2) << 2) - 12;
    HEAP8[$3 + 104875 | 0] = ((($2 | 0) <= 4 ? 4 : $2) << 2) - 16;
    HEAP8[$3 + 104874 | 0] = ((($2 | 0) <= 5 ? 5 : $2) << 2) - 20;
    HEAP8[$3 + 104873 | 0] = ((($2 | 0) <= 6 ? 6 : $2) << 2) - 24;
    HEAP8[$3 + 104872 | 0] = ((($2 | 0) <= 8 ? 8 : $2) << 2) - 32;
    HEAP8[$3 + 104871 | 0] = ((($2 | 0) <= 10 ? 10 : $2) << 2) - 40;
    HEAP8[$3 + 104870 | 0] = ((($2 | 0) <= 11 ? 11 : $2) << 2) - 44;
    HEAP8[$3 + 104869 | 0] = ((($2 | 0) <= 12 ? 12 : $2) << 2) - 48;
    HEAP8[$3 + 104868 | 0] = ((($2 | 0) <= 16 ? 16 : $2) << 2) + -64;
    HEAP8[$3 + 104867 | 0] = ((($2 | 0) <= 19 ? 19 : $2) << 2) - 76;
    HEAP8[$3 + 104866 | 0] = ((($2 | 0) <= 24 ? 24 : $2) << 2) - 96;
    HEAP8[$3 + 104865 | 0] = (($2 | 0) <= 32 ? 32 : $2) << 2 ^ 128;
    $2 = $2 + 8 | 0;
    $3 = $3 + 16 | 0;
    if (($3 | 0) != 128) {
     continue
    }
    break;
   };
   $3 = 105042;
   $2 = 1;
   while (1) {
    $4 = $2 - 1 | 0;
    HEAP8[$2 + 104991 | 0] = $4;
    HEAP8[$3 + 1 | 0] = $4;
    HEAP8[$2 + 104992 | 0] = $2;
    HEAP8[$3 | 0] = $2;
    $3 = $3 - 2 | 0;
    $4 = ($2 | 0) != 25;
    $2 = $2 + 2 | 0;
    if ($4) {
     continue
    }
    break;
   };
   $2 = 0;
   $4 = 75312;
   while (1) {
    $3 = $2 & 15;
    if ($3 >>> 0 <= 8) {
     if ($3 >>> 0 <= 5) {
      $0 = $3 << 1;
      $3 = $3 >>> 0 > 2 | ($3 >>> 0 < 3 ? $0 : $0 - 6 | 0);
     }
     $0 = Math_imul($2 >>> 0 > 15 ? $3 + 9 | 0 : $3, 192) + 692 | 0;
    } else {
     $0 = 0
    }
    HEAP16[$4 >> 1] = $0;
    $4 = $4 + 2 | 0;
    $2 = $2 + 1 | 0;
    if (($2 | 0) != 32) {
     continue
    }
    break;
   };
   $4 = 75184;
   $2 = 0;
   while (1) {
    $0 = $2 & 7;
    $1 = 0;
    label$10 : {
     if ($0 >>> 0 > 5) {
      break label$10
     }
     $1 = 0;
     if (($2 & 24) == 24) {
      break label$10
     }
     $3 = Math_imul($2 >>> 3 | 0, 3) + ($0 >>> 0 < 3 ? $0 : $0 - 3 | 0) | 0;
     $1 = HEAPU16[(($3 >>> 0 > 11 ? $3 + 4 | 0 : $3) << 1) + 75312 >> 1] + ($0 >>> 0 > 2 ? 84 : 0) | 0;
    }
    HEAP16[$4 >> 1] = $1;
    $4 = $4 + 2 | 0;
    $2 = $2 + 1 | 0;
    if (($2 | 0) != 64) {
     continue
    }
    break;
   };
  }
  $0 = -4164;
  while (1) {
   $1 = $0 + 109216 | 0;
   HEAP8[$1 | 0] = 0;
   HEAP8[$1 + 1 | 0] = 0;
   HEAP8[$1 + 2 | 0] = 0;
   HEAP8[$1 + 3 | 0] = 0;
   $1 = $0 + 109208 | 0;
   HEAP8[$1 | 0] = 0;
   HEAP8[$1 + 1 | 0] = 0;
   HEAP8[$1 + 2 | 0] = 0;
   HEAP8[$1 + 3 | 0] = 0;
   HEAP8[$1 + 4 | 0] = 0;
   HEAP8[$1 + 5 | 0] = 0;
   HEAP8[$1 + 6 | 0] = 0;
   HEAP8[$1 + 7 | 0] = 0;
   $0 = $0 + 12 | 0;
   if ($0) {
    continue
   }
   break;
  };
  $0 = 0;
  while (1) {
   $1 = $0 + 105752 | 0;
   HEAP32[$1 >> 2] = 0;
   HEAP32[$1 + 4 >> 2] = 0;
   HEAP8[$0 + 105818 | 0] = 0;
   $1 = $0 + 105760 | 0;
   HEAP32[$1 >> 2] = 0;
   HEAP32[$1 + 4 >> 2] = 0;
   HEAP32[$0 + 105768 >> 2] = 0;
   $1 = $0 + 105809 | 0;
   HEAP8[$1 | 0] = 0;
   HEAP8[$1 + 1 | 0] = 0;
   HEAP8[$1 + 2 | 0] = 0;
   HEAP8[$1 + 3 | 0] = 0;
   $1 = $0 + 105812 | 0;
   HEAP8[$1 | 0] = 0;
   HEAP8[$1 + 1 | 0] = 0;
   HEAP8[$1 + 2 | 0] = 0;
   HEAP8[$1 + 3 | 0] = 0;
   HEAP8[$0 + 105808 | 0] = 1;
   HEAP32[$0 + 105736 >> 2] = 14;
   HEAP32[$0 + 105784 >> 2] = 511;
   HEAP32[$0 + 105776 >> 2] = 511;
   HEAP8[$0 + 105902 | 0] = 0;
   HEAP32[$0 + 105800 >> 2] = 0;
   HEAP32[$0 + 105788 >> 2] = 511;
   HEAP32[$0 + 105780 >> 2] = 511;
   $1 = $0 + 105836 | 0;
   HEAP32[$1 >> 2] = 0;
   HEAP32[$1 + 4 >> 2] = 0;
   $1 = $0 + 105844 | 0;
   HEAP32[$1 >> 2] = 0;
   HEAP32[$1 + 4 >> 2] = 0;
   HEAP32[$0 + 105852 >> 2] = 0;
   $1 = $0 + 105896 | 0;
   HEAP8[$1 | 0] = 0;
   HEAP8[$1 + 1 | 0] = 0;
   HEAP8[$1 + 2 | 0] = 0;
   HEAP8[$1 + 3 | 0] = 0;
   $1 = $0 + 105893 | 0;
   HEAP8[$1 | 0] = 0;
   HEAP8[$1 + 1 | 0] = 0;
   HEAP8[$1 + 2 | 0] = 0;
   HEAP8[$1 + 3 | 0] = 0;
   HEAP8[$0 + 105892 | 0] = 1;
   HEAP32[$0 + 105820 >> 2] = 14;
   HEAP32[$0 + 105860 >> 2] = 511;
   HEAP32[$0 + 105868 >> 2] = 511;
   HEAP32[$0 + 105864 >> 2] = 511;
   HEAP32[$0 + 105872 >> 2] = 511;
   HEAP32[$0 + 105884 >> 2] = 0;
   HEAP32[$0 + 105916 >> 2] = 0;
   HEAP32[$0 + 105912 >> 2] = 0;
   HEAP32[$0 + 105908 >> 2] = 0;
   $1 = $0 + 105921 | 0;
   HEAP8[$1 | 0] = 0;
   HEAP8[$1 + 1 | 0] = 0;
   HEAP16[$0 + 105924 >> 1] = 65535;
   HEAP8[$0 + 105923 | 0] = 0;
   HEAP8[$0 + 105920 | 0] = 31;
   HEAP32[$0 + 105904 >> 2] = 12;
   $0 = $0 + 192 | 0;
   if (($0 | 0) != 3456) {
    continue
   }
   break;
  };
  HEAP32[27298] = 0;
  HEAP8[109204] = 0;
  HEAP32[26265] = 1;
  HEAP32[26263] = 0;
  HEAP32[26264] = 4618;
  HEAP16[54598] = 0;
  HEAP32[26261] = 0;
  HEAP32[26262] = 4618;
  HEAP32[26280] = 69270;
  HEAP32[26281] = 69270;
  HEAP32[26278] = 55416;
  HEAP32[26279] = 55416;
  HEAP32[26276] = 46180;
  HEAP32[26277] = 46180;
  HEAP32[26274] = 36944;
  HEAP32[26275] = 41562;
  HEAP32[26272] = 27708;
  HEAP32[26273] = 32326;
  HEAP32[26270] = 18472;
  HEAP32[26271] = 23090;
  HEAP32[26268] = 9236;
  HEAP32[26269] = 13854;
  HEAP32[26266] = 2309;
  HEAP32[26267] = 4618;
  $0 = -304;
  while (1) {
   $1 = $0 + 65848 | 0;
   $2 = HEAP32[$1 >> 2];
   $1 = HEAP32[$1 + 4 >> 2];
   $3 = $0 + 105044 | 0;
   $4 = $3 + 396 | 0;
   HEAP32[$4 >> 2] = $2;
   HEAP32[$4 + 4 >> 2] = $1;
   $1 = $0 + 65840 | 0;
   $2 = HEAP32[$1 >> 2];
   $4 = HEAP32[$1 + 4 >> 2];
   $1 = $3 + 388 | 0;
   HEAP32[$1 >> 2] = $2;
   HEAP32[$1 + 4 >> 2] = $4;
   $0 = $0 + 16 | 0;
   if ($0) {
    continue
   }
   break;
  };
  $0 = -304;
  while (1) {
   $1 = $0 + 66152 | 0;
   $2 = HEAP32[$1 >> 2];
   $1 = HEAP32[$1 + 4 >> 2];
   $3 = $0 + 105044 | 0;
   $4 = $3 + 700 | 0;
   HEAP32[$4 >> 2] = $2;
   HEAP32[$4 + 4 >> 2] = $1;
   $1 = $0 + 66144 | 0;
   $2 = HEAP32[$1 >> 2];
   $4 = HEAP32[$1 + 4 >> 2];
   $1 = $3 + 692 | 0;
   HEAP32[$1 >> 2] = $2;
   HEAP32[$1 + 4 >> 2] = $4;
   $0 = $0 + 16 | 0;
   if ($0) {
    continue
   }
   break;
  };
  HEAP8[108611] = 160;
  HEAP8[108419] = 32;
  HEAP8[108227] = 144;
  HEAP8[108035] = 16;
  HEAP8[107843] = 136;
  HEAP8[107651] = 8;
  HEAP8[106883] = 132;
  HEAP8[106691] = 4;
  HEAP8[106499] = 130;
  HEAP8[106307] = 2;
  HEAP8[106115] = 129;
  HEAP8[105923] = 1;
  HEAP8[107459] = 64;
  HEAP8[107267] = 64;
  HEAP8[107075] = 64;
  if (!(HEAP8[109204] & 1)) {
   HEAP8[109204] = 255;
   $0 = 0;
   while (1) {
    $3 = $0 + 105044 | 0;
    $1 = $3 + 878 | 0;
    $4 = $1;
    $1 = HEAPU8[$1 | 0];
    HEAP8[$4 | 0] = $1 ^ -1;
    Channel__WriteC0($3 + 692 | 0, $1);
    $0 = $0 + 192 | 0;
    if (($0 | 0) != 3456) {
     continue
    }
    break;
   };
  }
  $0 = 0;
  while (1) {
   if (($0 | 0) != 261) {
    dbs_Chip__WriteReg($0, 255);
    dbs_Chip__WriteReg($0, 0);
   }
   $0 = $0 + 1 | 0;
   if (($0 | 0) != 512) {
    continue
   }
   break;
  };
  if (HEAP8[109204] & 1) {
   $0 = 0;
   HEAP8[109204] = 0;
   while (1) {
    $3 = $0 + 105044 | 0;
    $1 = $3 + 878 | 0;
    $4 = $1;
    $1 = HEAPU8[$1 | 0];
    HEAP8[$4 | 0] = $1 ^ -1;
    Channel__WriteC0($3 + 692 | 0, $1);
    $0 = $0 + 192 | 0;
    if (($0 | 0) != 3456) {
     continue
    }
    break;
   };
  }
  $0 = 0;
  while (1) {
   dbs_Chip__WriteReg($0, 255);
   dbs_Chip__WriteReg($0, 0);
   $0 = $0 + 1 | 0;
   if (($0 | 0) != 255) {
    continue
   }
   break;
  };
  HEAP32[27817] = 0;
  HEAP32[27816] = 0;
  HEAP8[111272] = 0;
  HEAP16[55638] = 0;
  HEAP16[55637] = 0;
 }
 
 function opl_write($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  dbs_Chip__WriteReg($0 & 65535, $1 & 255);
 }
 
 function opl_render($0) {
  $0 = $0 | 0;
  var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0;
  $5 = __stack_pointer - 16 | 0;
  __stack_pointer = $5;
  $8 = $0 >>> 0 >= 4096 ? 4096 : $0;
  $2 = HEAP32[18794];
  label$1 : {
   if (($2 | 0) == 44100) {
    if (!$0) {
     break label$1
    }
    $4 = 111280;
    $6 = $8;
    while (1) {
     HEAP32[$5 + 4 >> 2] = 15;
     $2 = $8 - $7 | 0;
     FUNCTION_TABLE[HEAP32[$5 + 4 >> 2]](105044, $2 >>> 0 >= 256 ? 256 : $2, 109216);
     $0 = ($6 >>> 0 >= 256 ? 256 : $6) << 3;
     $2 = $4;
     $3 = 0;
     while (1) {
      $1 = HEAP32[$3 + 109216 >> 2];
      $1 = ($1 | 0) <= -32768 ? -32768 : $1;
      HEAP16[$2 >> 1] = ($1 | 0) >= 32767 ? 32767 : $1;
      $1 = HEAP32[$3 + 109220 >> 2];
      $1 = ($1 | 0) <= -32768 ? -32768 : $1;
      HEAP16[$2 + 2 >> 1] = ($1 | 0) >= 32767 ? 32767 : $1;
      $2 = $2 + 4 | 0;
      $3 = $3 + 8 | 0;
      if (($3 | 0) != ($0 | 0)) {
       continue
      }
      break;
     };
     $6 = $6 - 256 | 0;
     $4 = $4 + 1024 | 0;
     $7 = $7 + 256 | 0;
     if ($8 >>> 0 > $7 >>> 0) {
      continue
     }
     break;
    };
    break label$1;
   }
   $4 = $2;
   if (!HEAPU8[111272]) {
    HEAP8[111272] = 1;
    HEAP32[$5 + 8 >> 2] = 15;
    $2 = 109216;
    FUNCTION_TABLE[HEAP32[$5 + 8 >> 2]](105044, 64, 109216);
    $3 = -256;
    while (1) {
     $1 = HEAP32[$2 >> 2];
     $1 = ($1 | 0) <= -32768 ? -32768 : $1;
     HEAP16[$3 + 127920 >> 1] = ($1 | 0) >= 32767 ? 32767 : $1;
     $1 = HEAP32[$2 + 4 >> 2];
     $1 = ($1 | 0) <= -32768 ? -32768 : $1;
     HEAP16[$3 + 127922 >> 1] = ($1 | 0) >= 32767 ? 32767 : $1;
     $2 = $2 + 8 | 0;
     $3 = $3 + 4 | 0;
     if ($3) {
      continue
     }
     break;
    };
    HEAP32[27817] = 0;
   }
   if (!$0) {
    break label$1
   }
   $10 = 2890137600 / ($4 >>> 0) | 0;
   $7 = HEAPU16[55638];
   $4 = HEAPU16[55637];
   $0 = HEAP32[27816];
   $1 = HEAP32[27817];
   while (1) {
    $2 = $0 + $10 | 0;
    HEAP32[27816] = $2;
    $3 = $6 << 2;
    $0 = $0 >>> 1 | 0;
    $9 = $1 << 2;
    HEAP16[$3 + 111280 >> 1] = (Math_imul($0, HEAP16[$9 + 127664 >> 1] - ($4 << 16 >> 16) | 0) >>> 15 | 0) + $4;
    HEAP16[$3 + 111282 >> 1] = (Math_imul($0, HEAP16[$9 + 127666 >> 1] - ($7 << 16 >> 16) | 0) >>> 15 | 0) + $7;
    if (!($2 >>> 0 < 65536)) {
     $0 = HEAPU8[111272];
     while (1) {
      $2 = $2 - 65536 | 0;
      HEAP32[27816] = $2;
      $3 = $1 + 1 | 0;
      HEAP32[27817] = $3;
      $1 = $1 << 2;
      HEAP16[55637] = HEAPU16[$1 + 127664 >> 1];
      HEAP16[55638] = HEAPU16[$1 + 127666 >> 1];
      if (($3 | 0) >= (($0 & 1 ? 64 : 0) | 0)) {
       HEAP8[111272] = 1;
       HEAP32[$5 + 12 >> 2] = 15;
       $2 = 109216;
       FUNCTION_TABLE[HEAP32[$5 + 12 >> 2]](105044, 64, 109216);
       $0 = HEAPU8[111272];
       $3 = -256;
       while (1) {
        $1 = HEAP32[$2 >> 2];
        $1 = ($1 | 0) <= -32768 ? -32768 : $1;
        HEAP16[$3 + 127920 >> 1] = ($1 | 0) >= 32767 ? 32767 : $1;
        $1 = HEAP32[$2 + 4 >> 2];
        $1 = ($1 | 0) <= -32768 ? -32768 : $1;
        HEAP16[$3 + 127922 >> 1] = ($1 | 0) >= 32767 ? 32767 : $1;
        $2 = $2 + 8 | 0;
        $3 = $3 + 4 | 0;
        if ($3) {
         continue
        }
        break;
       };
       $3 = 0;
       HEAP32[27817] = 0;
       $2 = HEAP32[27816];
      }
      $1 = $3;
      if ($2 >>> 0 > 65535) {
       continue
      }
      break;
     };
     $7 = HEAPU16[55638];
     $4 = HEAPU16[55637];
    }
    $0 = $2;
    $6 = $6 + 1 | 0;
    if (($8 | 0) != ($6 | 0)) {
     continue
    }
    break;
   };
  }
  __stack_pointer = $5 + 16 | 0;
  return 111280;
 }
 
 function opl_scope_on($0) {
  $0 = $0 | 0;
  var $1 = 0, $2 = 0, $3 = 0;
  label$1 : {
   if (!$0) {
    break label$1
   }
   if (HEAP32[18844]) {
    break label$1
   }
   $3 = 30;
   while (1) {
    $1 = $3 + 75384 | 0;
    HEAP8[$1 | 0] = 0;
    HEAP8[$1 + 1 | 0] = $2 >>> 8;
    HEAP8[$1 + 2 | 0] = $2 >>> 16;
    HEAP8[$1 + 3 | 0] = $2 >>> 24;
    $1 = $3 + 75376 | 0;
    HEAP8[$1 | 0] = 0;
    HEAP8[$1 + 1 | 0] = $2 >>> 8;
    HEAP8[$1 + 2 | 0] = $2 >>> 16;
    HEAP8[$1 + 3 | 0] = $2 >>> 24;
    HEAP8[$1 + 4 | 0] = 0;
    HEAP8[$1 + 5 | 0] = $2 >>> 8;
    HEAP8[$1 + 6 | 0] = $2 >>> 16;
    HEAP8[$1 + 7 | 0] = $2 >>> 24;
    $3 = $3 + 12 | 0;
    if (($3 | 0) != 18462) {
     continue
    }
    break;
   };
  }
  HEAP32[18844] = $0;
 }
 
 function opl_scope($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
  $2 = $1 >>> 0 >= 448 ? 448 : $1;
  $6 = HEAP32[18845];
  label$1 : {
   if ($0 >>> 0 >= 18) {
    if (!$1) {
     break label$1
    }
    $0 = $2 & 7;
    if ($1 >>> 0 >= 8) {
     $4 = $2 & -8;
     $3 = $2 << 1 & -16;
     $1 = 0;
     while (1) {
      $2 = $1 + 128696 | 0;
      HEAP32[$2 >> 2] = 0;
      HEAP32[$2 + 4 >> 2] = 0;
      $2 = $1 + 128688 | 0;
      HEAP32[$2 >> 2] = 0;
      HEAP32[$2 + 4 >> 2] = 0;
      $1 = $1 + 16 | 0;
      if (($1 | 0) != ($3 | 0)) {
       continue
      }
      break;
     };
     if (!$0) {
      break label$1
     }
    }
    $1 = ($4 << 1) + 128688 | 0;
    while (1) {
     HEAP16[$1 >> 1] = 0;
     $1 = $1 + 2 | 0;
     $0 = $0 - 1 | 0;
     if ($0) {
      continue
     }
     break;
    };
    break label$1;
   }
   if (!$1) {
    break label$1
   }
   $3 = $0 >>> 0 < 9;
   $0 = (HEAPU8[(($3 ? 0 : 9) + HEAPU8[($3 ? $0 : $0 - 9 | 0) + 75104 | 0] | 0) + 75388 | 0] << 10) + 75406 | 0;
   $4 = $2 & 3;
   if ($1 >>> 0 >= 4) {
    $7 = $6 - $2 | 0;
    $8 = $2 & 508;
    $1 = 128688;
    while (1) {
     $3 = $5 + $7 | 0;
     HEAP16[$1 >> 1] = HEAPU16[(($3 & 511) << 1) + $0 >> 1];
     HEAP16[$1 + 2 >> 1] = HEAPU16[(($3 + 1 & 511) << 1) + $0 >> 1];
     HEAP16[$1 + 4 >> 1] = HEAPU16[(($3 + 2 & 511) << 1) + $0 >> 1];
     HEAP16[$1 + 6 >> 1] = HEAPU16[(($3 + 3 & 511) << 1) + $0 >> 1];
     $1 = $1 + 8 | 0;
     $5 = $5 + 4 | 0;
     if (($5 | 0) != ($8 | 0)) {
      continue
     }
     break;
    };
    if (!$4) {
     break label$1
    }
   }
   $1 = ($5 + $6 | 0) - $2 | 0;
   $3 = ($5 << 1) + 128688 | 0;
   while (1) {
    HEAP16[$3 >> 1] = HEAPU16[(($1 & 511) << 1) + $0 >> 1];
    $1 = $1 + 1 | 0;
    $3 = $3 + 2 | 0;
    $4 = $4 - 1 | 0;
    if ($4) {
     continue
    }
    break;
   };
  }
  return 128688;
 }
 
 function dbs_Operator__TemplateVolumeSUSTAIN($0) {
  $0 = $0 | 0;
  var $1 = 0, $2 = 0;
  $1 = HEAP32[$0 + 52 >> 2];
  if (!(HEAPU8[$0 + 74 | 0] & 32)) {
   $2 = HEAP32[$0 + 68 >> 2] + HEAP32[$0 + 64 >> 2] | 0;
   HEAP32[$0 + 68 >> 2] = $2 & 16777215;
   $1 = $1 + ($2 >>> 24 | 0) | 0;
   if (($1 | 0) >= 511) {
    HEAP8[$0 + 79 | 0] = 0;
    HEAP32[$0 + 52 >> 2] = 511;
    HEAP32[$0 >> 2] = 14;
    return 511;
   }
   HEAP32[$0 + 52 >> 2] = $1;
  }
  return $1 | 0;
 }
 
 function dbs_Operator__TemplateVolumeDECAY($0) {
  $0 = $0 | 0;
  var $1 = 0;
  $1 = HEAP32[$0 + 68 >> 2] + HEAP32[$0 + 60 >> 2] | 0;
  HEAP32[$0 + 68 >> 2] = $1 & 16777215;
  $1 = HEAP32[$0 + 52 >> 2] + ($1 >>> 24 | 0) | 0;
  if (($1 | 0) >= HEAP32[$0 + 40 >> 2]) {
   if (($1 | 0) >= 511) {
    HEAP8[$0 + 79 | 0] = 0;
    HEAP32[$0 + 52 >> 2] = 511;
    HEAP32[$0 >> 2] = 14;
    return 511;
   }
   HEAP8[$0 + 79 | 0] = 2;
   HEAP32[$0 + 68 >> 2] = 0;
   HEAP32[$0 >> 2] = 16;
  }
  HEAP32[$0 + 52 >> 2] = $1;
  return $1 | 0;
 }
 
 bufferView = HEAPU8;
 initActiveSegments(imports);
 var FUNCTION_TABLE = [null, dbs_Channel__BlockTemplate_sm3Percussion, dbs_Channel__BlockTemplate_sm2Percussion, dbs_Operator__TemplateVolumeATTACK, dbs_Operator__TemplateVolumeRELEASE, dbs_Channel__BlockTemplate_sm3FMFM, dbs_Channel__BlockTemplate_sm3AMFM, dbs_Channel__BlockTemplate_sm3FMAM, dbs_Channel__BlockTemplate_sm3AMAM, dbs_Channel__BlockTemplate_sm3AM, dbs_Channel__BlockTemplate_sm3FM, dbs_Channel__BlockTemplate_sm2AM, dbs_Channel__BlockTemplate_sm2FM, dbs_Operator__TemplateVolumeDECAY, dbs_Operator__TemplateVolumeOFF, dbs_Chip__GenerateBlock3, dbs_Operator__TemplateVolumeSUSTAIN];
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
  "__stack_pointer": {
   get value() {
    return __stack_pointer;
   }, 
   set value(___stack_pointer) {
    __stack_pointer = ___stack_pointer;
   }
  }, 
  "opl_reset": opl_reset, 
  "opl_write": opl_write, 
  "opl_write_now": opl_write, 
  "opl_render": opl_render, 
  "opl_scope_on": opl_scope_on, 
  "opl_scope": opl_scope
 };
}

return asmFunc({});
}
