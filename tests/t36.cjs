process.chdir(require('path').join(__dirname,'../web'));
const fs=require('fs');
eval(fs.readFileSync('opl3fn.js','utf8')+fs.readFileSync('engine.js','utf8')+fs.readFileSync('demo.js','utf8')+fs.readFileSync('export.js','utf8')+';global.E=Engine;global.D={demoSong,emptyPattern,exportA2M,importA2M,insBytes,blankFmm};');
const s=D.demoSong(); const P=D.emptyPattern(64); s.patterns=[P]; s.order=[0]; P[0][0]=[60,5,-1,0,-1,0];
const ins=s.inst[4]; const M=D.blankFmm(); M.len=3; M.lb=2; M.ll=2; M.ko=0;
for(let i=0;i<3;i++){ const d=D.insBytes(ins); d[9]=i+1; M.steps.push({d,fs:0,pan:0,dur:3}); } ins.fmm=M;
const ws=[]; const e=new E(49716,makeOPL,()=>{}); const ow=e.w; e.w=(r,v)=>{ if(r===0xE3) ws.push(v); ow(r,v); };  // track0 car slot = 0x0b → E0+0x0b=0xEB
e.w=(r,v)=>{ if(r===0xEB) ws.push(v); ow(r,v); };
e.handle({t:'song',song:s}); e.handle({t:'play',ord:0,row:0}); for(let i=0;i<20;i++) e.doTick();
console.log('car waveform writes', ws.join(','));
const r=D.importA2M(D.exportA2M(s)).song; console.log('fmm roundtrip', JSON.stringify(r.inst[4].fmm)===JSON.stringify(M));
fs.writeFileSync('../tests/out/fmm.a2m', D.exportA2M(s));
console.log(JSON.stringify(r.inst[4].fmm).slice(0,300)); console.log(JSON.stringify(M).slice(0,300));
