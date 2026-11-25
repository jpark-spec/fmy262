process.chdir(require('path').join(__dirname,'../web'));
const fs=require('fs');
eval(fs.readFileSync('opl3fn.js','utf8')+fs.readFileSync('engine.js','utf8')+fs.readFileSync('demo.js','utf8')+fs.readFileSync('export.js','utf8')+';global.E=Engine;global.D={demoSong,exportA2M,importA2M,emptyPattern};');
const s=D.demoSong(); s.opl=2; s.gvol=40; s.vtab=0xF5;
const r=D.importA2M(D.exportA2M(s)).song; console.log('globals roundtrip', r.opl, r.gvol, r.vtab);
const e=new E(49716,makeOPL,()=>{}); e.handle({t:'song',song:s}); e.handle({t:'play',ord:0,row:0});
const N=49716; const L=new Float32Array(N),R=new Float32Array(N); e.render(L,R,N); let m=0; for(const v of L)m=Math.max(m,Math.abs(v));
console.log('opl2 mode', e.opl3, 'gvol', e.gvol, 'vsize', e.vsize, 'vfac', e.vfac, 'peak', m.toFixed(3), 'ch9 on', e.ch[9].on);
const s2=D.demoSong(); s2.patterns[0][0][8]=[-1,0,37,0x10,-1,0]; const e2=new E(49716,makeOPL,()=>{}); e2.handle({t:'song',song:s2}); e2.handle({t:'play',ord:0,row:0}); e2.doTick(); console.log('% sets gvol', e2.gvol);
