process.chdir(require('path').join(__dirname,'../web'));
const fs=require('fs');
eval(fs.readFileSync('opl3fn.js','utf8')+fs.readFileSync('engine.js','utf8')+fs.readFileSync('demo.js','utf8')+fs.readFileSync('export.js','utf8')+';global.E=Engine;global.D={demoSong,emptyPattern,exportA2M,importA2M};');
// all catalogue entries from template
const tpl=fs.readFileSync('template.html','utf8'); const s0=tpl.indexOf('const FXR = ['), e0=tpl.indexOf('];',s0)+2; eval(tpl.slice(s0,e0).replace('const FXR','global.FXR'));
const s=D.demoSong(); const P=D.emptyPattern(64); s.patterns=[P]; s.order=[0];
FXR.forEach((r,k)=>{ const [f,hi,lo]=r; const v=hi===undefined?0x23:(hi<<4|(lo===undefined?2:lo)); const row=k%64, ch=(k>>6)*2;
  P[row][ch]=[48+(k%12),1+(k%8),f,v,12,40]; P[row][ch+1]=[-1,0,f,v,-1,0]; });
P[63][5]=[-1,0,-1,0,-1,0];
const e=new E(49716,makeOPL,()=>{}); e.handle({t:'song',song:s}); e.handle({t:'play',ord:0,row:0});
let err=null; try{ for(let i=0;i<6*200;i++){ e.doTick(); for(const c of e.ch){ if(!isFinite(c.pitch)||!isFinite(c.vol)) throw new Error('nan '+JSON.stringify(c).slice(0,200)); } } }catch(x){err=x}
console.log('engine run', err?err.stack:'ok', 'row', e.row, 'ord', e.ord);
const a=D.exportA2M(s), r=D.importA2M(a); let d=0; P.forEach((l,ri)=>l.forEach((c,ci)=>{ if(JSON.stringify(c)!==JSON.stringify(r.song.patterns[0][ri][ci])){ if(d++<4) console.log(ri,ci,c,r.song.patterns[0][ri][ci]); } }));
console.log('roundtrip diffs',d,r.warn); fs.writeFileSync('../tests/out/allfx.a2m',a);
// audio renders
const L=new Float32Array(49716*4),R=new Float32Array(49716*4); e.handle({t:'play',ord:0,row:0}); e.render(L,R,L.length); let m=0; for(const v of L) m=Math.max(m,Math.abs(v)); console.log('peak',m.toFixed(3));
