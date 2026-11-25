process.chdir(require('path').join(__dirname,'../web'));
const puppeteer=require('puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:1280,height:1000,deviceScaleFactor:2}); const logs=[]; p.on('pageerror',e=>logs.push('ERR '+e.message));
 await p.goto('file://'+require('path').resolve(__dirname,'../dist/fm1-opl3-tracker.html')+''); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.click('#scr'); const w=ms=>new Promise(r=>setTimeout(r,ms));
 const click=async n=>{const bb=await (await p.$(`.btn[data-n="${n}"]`)).boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height-10);await w(200);};
 const turn=async(k,dy)=>{const bb=await (await p.$(`.knob[data-k="${k}"]`)).boundingBox(); await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2); await p.mouse.down(); await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2+dy,{steps:6}); await p.mouse.up(); await w(150);};
 const shot=async n=>{await w(1300); await (await p.$('#scr')).screenshot({path:`../tests/out/v2_${n}.png`});};
 await click('GLO'); await click('GLO'); await click('GLO'); await turn('0',-30); await turn('2',-30); await shot('voices'); await click('OCT−');
 await click('HOME'); await w(300); for(let i=0;i<5;i++) await click('SEL'); await shot('drums');
 await click('SEL'); await p.keyboard.down('Shift'); await turn('0',-40); await turn('1',-20); await p.keyboard.up('Shift'); await turn('2',-20); await shot('block');
 await click('ENV'); await turn('alg',-30); await click('SEL'); await click('SEL'); await shot('ins4op'); await click('ENV'); await click('ENV'); await click('ENV'); await shot('ins4op_p4');
 await click('ARP'); await click('ARP'); await click('ARP'); await turn('2',-40); await turn('1',-10); await turn('2',-20); await shot('reg');
 console.log(logs.join('\n')||'no errors'); await b.close(); })();
