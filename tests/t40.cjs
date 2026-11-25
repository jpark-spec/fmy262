process.chdir(require('path').join(__dirname,'../web'));
const puppeteer=require('puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:1280,height:1000,deviceScaleFactor:2}); const logs=[]; p.on('pageerror',e=>logs.push('ERR '+e.message));
 await p.goto('file://'+require('path').resolve(__dirname,'../dist/fm1-opl3-tracker.html')+''); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.click('#scr'); const w=ms=>new Promise(r=>setTimeout(r,ms));
 const turn=async(k,dy)=>{const bb=await (await p.$(`.knob[data-k="${k}"]`)).boundingBox(); await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2); await p.mouse.down(); await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2+dy,{steps:6}); await p.mouse.up(); await w(150);};
 const shot=async n=>{await w(1300); await (await p.$('#scr')).screenshot({path:`../tests/out/k4_${n}.png`});};
 await turn('3',-15); await shot('a'); await turn('2',-15); await shot('b');
 console.log(logs.join('\n')||'no errors'); await b.close(); })();
