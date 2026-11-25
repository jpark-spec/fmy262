process.chdir(require('path').join(__dirname,'../web'));
const fs=require('fs');
eval(fs.readFileSync('opl3fn.js','utf8')+fs.readFileSync('engine.js','utf8')+fs.readFileSync('demo.js','utf8')+';global.E=Engine;global.D={demoSong,emptyPattern};');
const s=D.demoSong(); s.patterns=[D.emptyPattern(64),D.emptyPattern(64),D.emptyPattern(64)]; s.order=[0,1,2]; s.speed=6;
const P=s.patterns;
P[0][0][0]=[60,1,-1,0,-1,0]; P[0][1][0]=[72,1,3,0x10,-1,0];  // glide up an octave
P[0][4][0]=[-1,0,4,0x48,-1,0]; P[0][5][0]=[-1,0,13,0x10,-1,0]; // vibrato, then break to row 0x10 of next
P[1][16][0]=[-1,0,11,0,-1,0]; // jump back to order 0
const logs=[]; const e=new E(49716,makeOPL,m=>{if(m.t==='pos')logs.push(e.ord+':'+e.row)});
e.handle({t:'song',song:s}); e.handle({t:'play',ord:0,row:0});
const pit=[]; for(let i=0;i<6*20;i++){ e.doTick(); if(e.tick===1||i%6===3) pit.push((e.ch[0].pitch+(e.ch[0].vibo||0)).toFixed(2)); }
console.log('positions',logs.slice(0,12).join(' '));
console.log('pitch',pit.slice(0,30).join(' '));
