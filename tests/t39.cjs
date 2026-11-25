process.chdir(require('path').join(__dirname,'../web'));
const fs=require('fs'),cp=require('child_process');
eval(fs.readFileSync('opl3fn.js','utf8')+fs.readFileSync('engine.js','utf8')+fs.readFileSync('demo.js','utf8')+fs.readFileSync('export.js','utf8')+';global.E=Engine;global.X={importA2M};');
const files=cp.execSync("find "+(process.env.AT2_MODULES||'../at2-modules')+" -name '*.a2m'").toString().trim().split('\n');
let ok=0,bad=[],perc=0,four=0,fmm=0,silent=[];
for(const f of files){ let r; try{ r=X.importA2M(new Uint8Array(fs.readFileSync(f))); }catch(e){continue;}
  const s=r.song; if(s.perc)perc++; if(s.four)four++; if(s.inst.some(i=>i.fmm))fmm++;
  try{ const e=new E(44100,makeOPL,()=>{}); e.handle({t:'song',song:s}); e.handle({t:'play',ord:0,row:0}); const n=44100*3, L=new Float32Array(n),R=new Float32Array(n); e.render(L,R,n); let m=0; for(let i=0;i<n;i++){ const v=Math.abs(L[i])+Math.abs(R[i]); if(!(v<1e9)) throw new Error('nan'); m=Math.max(m,v);} if(m<0.001) silent.push(f.split('/').pop()); ok++; }catch(e){ bad.push(f.split('/').pop()+': '+e.message); } }
console.log('played',ok,'errors',bad.length, bad.slice(0,5), 'perc songs',perc,'4op songs',four,'fm-macro songs',fmm,'silent',silent.length, silent.slice(0,8));
