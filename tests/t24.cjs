process.chdir(require('path').join(__dirname,'../web'));
const fs=require('fs');
eval(fs.readFileSync('demo.js','utf8')+fs.readFileSync('export.js','utf8')+';global.X={demoSong,exportA2M,importA2M,normSong,emptyPattern};');
const s=X.demoSong();
// add effects in both slots
s.patterns[0][1][5]=[-1,0,10,0x02,0,0x37]; s.patterns[0][2][6]=[60,5,12,0x20,1,0x05]; s.patterns[1][3][7]=[-1,0,15,140,-1,0];
const a=X.exportA2M(s); fs.writeFileSync('../tests/out/v2.a2m',a);
const r=X.importA2M(a); let diff=0;
s.patterns.forEach((P,pi)=>P.forEach((l,ri)=>l.forEach((c,ci)=>{const d=r.song.patterns[pi][ri][ci]; if(JSON.stringify(c)!==JSON.stringify(d)){ if(diff++<5)console.log(pi,ri,ci,c,d);} })));
console.log('cell diffs',diff,'warn',r.warn);
// migration
const old=[[50,1,40,2,0x30],[ -1,0,-1,-1,0],[60,2,63,-1,0],[-1,0,-1,0,0x37]];
console.log(old.map(c=>JSON.stringify(cellV2(c))).join(' '));
