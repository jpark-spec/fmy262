process.chdir(require('path').join(__dirname,'../web'));
const puppeteer=require('puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:1280,height:1000,deviceScaleFactor:2}); const logs=[]; p.on('pageerror',e=>logs.push('ERR '+e.message));
 await p.goto('file://'+require('path').resolve(__dirname,'../dist/fm1-opl3-tracker.html')+''); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.click('#scr'); const w=ms=>new Promise(r=>setTimeout(r,ms));
 const click=async n=>{const bb=await (await p.$(`.btn[data-n="${n}"]`)).boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height-10);await w(200);};
 const kb=await (await p.$('.knob[data-k="alg"]')).boundingBox();
 const step=async()=>{ await p.mouse.move(kb.x+kb.width/2,kb.y+kb.height/2); await p.mouse.down(); await p.mouse.move(kb.x+kb.width/2,kb.y+kb.height/2-16,{steps:3}); await p.mouse.up(); await w(150); };
 const shot=async n=>{await w(1300); await (await p.$('#scr')).screenshot({path:`../tests/out/al_${n}.png`});};
 await click('ENV'); await click('ENV'); await click('ENV'); await click('ENV');
 for(let i=0;i<6;i++){ await step(); await shot(i); }
 console.log(logs.join('\n')||'no errors'); await b.close(); })();
