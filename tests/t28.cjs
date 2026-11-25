process.chdir(require('path').join(__dirname,'../web'));
const fs=require('fs');
eval(fs.readFileSync('opl3fn.js','utf8')+fs.readFileSync('engine.js','utf8')+fs.readFileSync('demo.js','utf8')+';global.E=Engine;global.D={demoSong,emptyPattern};');
function run(setup, ticks, probe){ const s=D.demoSong(); const P=D.emptyPattern(16); s.patterns=[P,D.emptyPattern(16)]; s.order=[0,1]; s.speed=6; setup(P);
  const e=new E(49716,makeOPL,()=>{}); const keyons=[]; const ow=e.w; e.w=(r,v)=>{ if((r&0xF0)===0xB0 && (r&0xF)===0 && r<0x100) keyons.push((v&0x20)?1:0); ow(r,v); };
  e.handle({t:'song',song:s}); e.handle({t:'play',ord:0,row:0}); const out=[]; for(let i=0;i<ticks;i++){ e.doTick(); e.flush(); out.push(probe(e)); } return out; }
console.log('note delay &23:', run(P=>{P[0][0]=[60,1,36,0x23,-1,0]}, 6, e=>e.ch[0].on?1:0).join(''));
console.log('note cut &32:  ', run(P=>{P[0][0]=[60,1,36,0x32,-1,0]}, 6, e=>e.ch[0].on?1:0).join(''));
console.log('retrig L02:    ', run(P=>{P[0][0]=[60,1,21,2,-1,0]}, 12, e=>e.ch[0].pend||e.ch[0].ap===0&&e.ch[0].ac<=1?'r':'.').join(''));
console.log('tremor N21:    ', run(P=>{P[0][0]=[60,4,23,0x21,-1,0]; for(let r=1;r<4;r++)P[r][0]=[-1,0,23,0x21,-1,0]}, 18, e=>e.ch[0].tmute?'_':'#').join(''));
console.log('loop ZC0/ZC2:  ', run(P=>{P[1][0]=[-1,0,35,0xC0,-1,0]; P[3][0]=[-1,0,35,0xC2,-1,0]}, 6*12, e=>e.tick===0?e.row.toString(16):'').join(''));
console.log('row delay &12: ', run(P=>{P[1][0]=[-1,0,36,0x12,-1,0]}, 6*5, e=>e.tick===0?e.row:'').join(','));
console.log('vol slide A04 :', run(P=>{P[0][0]=[60,4,10,0x04,-1,0]}, 6, e=>e.ch[0].vol).join(','));
console.log('Z2 mod atk 5 :', run(P=>{P[0][0]=[60,4,35,0x25,-1,0]}, 1, e=>e.ch[0].patch.op[0].ar+' song ins untouched '+e.song.inst[3].op[0].ar).join(''));
console.log('#7 car mult 4:', run(P=>{P[0][0]=[60,4,41,0x74,-1,0]}, 1, e=>e.ch[0].patch.op[1].mult).join(''));
{ const s=D.demoSong(); const P=D.emptyPattern(16); s.patterns=[P]; s.order=[0]; P[0][0]=[60,1,21,2,-1,0]; P[1][0]=[-1,0,21,2,-1,0];
  const e=new E(49716,makeOPL,()=>{}); let n=0; const tr=e.trigger.bind(e); e.trigger=(c,x)=>{ if(c===0) n++; return tr(c,x); };
  e.handle({t:'song',song:s}); e.handle({t:'play',ord:0,row:0}); const o=[]; for(let i=0;i<12;i++){ const b=n; e.doTick(); o.push(n>b?'T':'.'); } console.log('retrig L02 triggers:', o.join('')); }
