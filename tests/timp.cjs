process.chdir(require('path').join(__dirname,'../web'));
const fs=require('fs'),cp=require('child_process');
eval(fs.readFileSync('demo.js','utf8')+fs.readFileSync('export.js','utf8')+';global.X={demoSong,exportA2M,importA2M,emptyPattern};');
// 1) round trip
const s=X.demoSong(); s.inst[3].ft=-37; s.arp[4]={name:'NEG',len:4,spd:2,loop:1,delay:0,data:[0,-5,7,-12,0,0,0,0,0,0,0,0,0,0,0,0]}; s.inst[2].arpT=5; s.patterns[0][5][4]=[62,5,40,1,0x22]; s.patterns[1][9][12]=[-2,0,-1,-1,0]; s.bpm=131; s.lfo=3; s.name='ROUND TRIP';
const a=X.exportA2M(s), r=X.importA2M(a).song;
const strip=o=>JSON.parse(JSON.stringify(o));
const A=strip(s),B=strip(r); const diffs=[];
for (const k of ['name','bpm','speed','rows','order','lfo']) if(JSON.stringify(A[k])!==JSON.stringify(B[k])) diffs.push(k);
if(JSON.stringify(A.inst)!==JSON.stringify(B.inst)) diffs.push('inst');
if(JSON.stringify(A.arp)!==JSON.stringify(B.arp)) diffs.push('arp');
if(JSON.stringify(A.vib)!==JSON.stringify(B.vib)) diffs.push('vib');
A.patterns.forEach((p,i)=>{ if(JSON.stringify(p)!==JSON.stringify(B.patterns[i])) diffs.push('pattern'+i); });
console.log('roundtrip diffs:', diffs.length?diffs:'NONE', 'warn', X.importA2M(a).warn);
if(diffs.includes('inst')) A.inst.forEach((x,i)=>{ if(JSON.stringify(x)!==JSON.stringify(B.inst[i])) console.log(JSON.stringify(x),'\n',JSON.stringify(B.inst[i])); });
// 2) real AT2 files
const files=cp.execSync("find "+(process.env.AT2_MODULES||'../at2-modules')+" -name '*.a2m'").toString().trim().split('\n');
const stat={}; const warns={}; let fails=[];
for(const f of files){ const d=fs.readFileSync(f); const v=d[14]; stat[v]=stat[v]||{ok:0,err:0};
  try{ const t0=Date.now(); const res=X.importA2M(new Uint8Array(d)); stat[v].ok++; res.warn.forEach(w=>{const k=w.replace(/^\d+ /,'N '); warns[k]=(warns[k]||0)+1;});
    if(Math.random()<0.03) console.log(f.split('/').pop(), 'v'+v, JSON.stringify(res.song.name), 'ins',res.song.inst.length, res.song.inst.slice(0,3).map(i=>i.name).join('|'), 'pats',res.song.patterns.length,'ord',res.song.order.length,'rows',res.song.rows,'bpm',res.song.bpm,'spd',res.song.speed, (Date.now()-t0)+'ms');
  }catch(e){ stat[v].err++; fails.push(f.split('/').pop()+' v'+v+': '+e.message); } }
console.log(JSON.stringify(stat)); console.log(warns); console.log(fails.slice(0,8).join('\n'));
