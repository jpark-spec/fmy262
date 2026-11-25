process.chdir(require('path').join(__dirname,'../web'));
const fs=require('fs');
eval(fs.readFileSync('opl3fn.js','utf8')+fs.readFileSync('engine.js','utf8')+fs.readFileSync('demo.js','utf8')+fs.readFileSync('export.js','utf8')+';global.E=Engine;global.D={demoSong,exportA2M,importA2M,emptyPattern};');
const s=D.demoSong(); s.order=[0,1,0x80+0,1]; s.rows=4; s.patterns=[D.emptyPattern(4),D.emptyPattern(4)]; s.patterns.push(...Array(100).fill(null)); s.patterns[100]=D.emptyPattern(4); s.order.push(100);
const r=D.importA2M(D.exportA2M(s)).song; console.log('order roundtrip', JSON.stringify(r.order), 'pat100', !!r.patterns[100]);
const pos=[]; const e=new E(49716,makeOPL,m=>{if(m.t==='pos')pos.push(m.ord+':'+m.row)}); e.handle({t:'song',song:s}); e.handle({t:'play',ord:0,row:0}); for(let i=0;i<6*14;i++) e.doTick(); console.log(pos.join(' '));
