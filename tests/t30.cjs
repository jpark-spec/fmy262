process.chdir(require('path').join(__dirname,'../web'));
const fs=require('fs');
eval(fs.readFileSync('opl3fn.js','utf8')+fs.readFileSync('engine.js','utf8')+fs.readFileSync('demo.js','utf8')+';global.E=Engine;global.D={demoSong};');
const s=D.demoSong(); const e=new E(49716,makeOPL,()=>{}); e.handle({t:'song',song:s}); e.handle({t:'play',ord:0,row:0});
const N=49716, L=new Float32Array(N*2), R=new Float32Array(N*2); e.render(L,R,N*2);
e.handle({t:'stop'}); const L2=new Float32Array(N), R2=new Float32Array(N); e.render(L2,R2,N);
const pk=(a,s,n)=>{let m=0;for(let i=s;i<s+n;i++)m=Math.max(m,Math.abs(a[i]));return m.toFixed(4)};
console.log('before', pk(L,N*2-2000,2000), 'after 0-10ms', pk(L2,0,497), '10-50ms', pk(L2,497,2000), '50ms+', pk(L2,2500,N-2500));
