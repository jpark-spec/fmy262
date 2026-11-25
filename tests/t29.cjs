process.chdir(require('path').join(__dirname,'../web'));
const puppeteer=require('puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:1280,height:1000,deviceScaleFactor:2}); const logs=[]; p.on('pageerror',e=>logs.push('ERR '+e.message));
 await p.goto('file://'+require('path').resolve(__dirname,'../dist/fm1-opl3-tracker.html')+''); await p.click('#scr'); const w=ms=>new Promise(r=>setTimeout(r,ms));
 const bb=await (await p.$('.btn[data-n="FX"]')).boundingBox();
 const shot=async n=>{await w(1100); await (await p.$('#scr')).screenshot({path:`../tests/out/y_${n}.png`});};
 await p.keyboard.press('ArrowDown');
 await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height-10); await p.mouse.down(); await w(700); await p.mouse.up(); await shot('a');
 for(let i=0;i<5;i++) await p.keyboard.press('PageDown'); await p.keyboard.press('ArrowDown'); await shot('b');
 await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height-10); await p.mouse.down(); await w(100); await p.mouse.up(); await shot('c');
 const kb=await (await p.$('.knob[data-k="alg"]')).boundingBox(); await p.mouse.move(kb.x+25,kb.y+25); await p.mouse.down(); await p.mouse.move(kb.x+25,kb.y+5,{steps:4}); await p.mouse.up(); await shot('d');
 console.log(logs.join('\n')||'no errors'); await b.close(); })();
