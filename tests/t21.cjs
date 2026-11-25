process.chdir(require('path').join(__dirname,'../web'));
const puppeteer=require('puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:1280,height:1000,deviceScaleFactor:2}); const logs=[]; p.on('pageerror',e=>logs.push('ERR '+e.message)); p.on('console',m=>{if(m.type()==='error')logs.push(m.text())});
 await p.goto('file://'+require('path').resolve(__dirname,'../dist/fm1-opl3-tracker.html')+''); await p.click('#scr'); await new Promise(r=>setTimeout(r,400));
 const w=ms=>new Promise(r=>setTimeout(r,ms));
 const click=async n=>{const bb=await (await p.$(`.btn[data-n="${n}"]`)).boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height-10);await w(200);};
 const shot=async n=>{await w(1100); const el=await p.$('#scr'); await el.screenshot({path:`../tests/out/u_${n}.png`});};
 await shot('pat'); await click('HOME'); await shot('pat6'); await click('HOME');
 await p.keyboard.press('Space'); await w(1500); await shot('play'); await p.keyboard.press('Space');
 await click('ENV'); await shot('ins0'); await click('ENV'); await shot('ins1'); await click('ENV'); await shot('ins2'); await click('ENV'); await shot('ins3'); await click('ENV');
 await p.keyboard.press('BracketRight'); await shot('presets'); await p.keyboard.press('Escape');
 await click('SAVE'); await p.keyboard.type('MY'); await shot('name'); await p.keyboard.press('Escape');
 await click('ARP'); await shot('arp'); await click('ARP'); await shot('vib');
 await click('SEQ'); await shot('seq'); await click('GLO'); await shot('file'); await click('ENV'); await shot('imp');
 console.log(logs.join('\n')||'no errors'); await b.close(); })();
