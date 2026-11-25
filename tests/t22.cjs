process.chdir(require('path').join(__dirname,'../web'));
const puppeteer=require('puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:1280,height:1000,deviceScaleFactor:2}); const logs=[]; p.on('pageerror',e=>logs.push('ERR '+e.message));
 await p.goto('file://'+require('path').resolve(__dirname,'../dist/fm1-opl3-tracker.html')+''); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.click('#scr');
 const w=ms=>new Promise(r=>setTimeout(r,ms));
 const click=async n=>{const bb=await (await p.$(`.btn[data-n="${n}"]`)).boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height-10);await w(250);};
 const shot=async n=>{await w(200); await (await p.$('#scr')).screenshot({path:`../tests/out/v_${n}.png`});};
 const stat=async l=>logs.push(l+': '+await p.evaluate(()=>{const x=[];for(let k=0;k<4;k++)x.push(localStorage.getItem('fm1-opl3-slotmeta-'+k)?JSON.parse(localStorage.getItem('fm1-opl3-slotmeta-'+k)).name:'-');return x.join(',')}));
 await click('SAVE'); await shot('a'); await click('SAVE'); await p.keyboard.type('ABCDEFG'); await click('SAVE'); await stat('after first save'); await shot('b');
 await click('SAVE'); await click('SAVE'); await stat('resave same (should return)'); await shot('c');
 await p.keyboard.press('KeyZ'); await w(100); await click('SAVE'); await shot('d'); await click('SAVE'); await shot('e'); await click('SAVE'); await stat('overwrite confirmed');
 await click('GLO'); await click('EDIT'); await p.keyboard.press('Backspace'); await p.keyboard.type('X'); await click('SAVE'); await stat('renamed'); await shot('f');
 await click('OCT−'); await click('OCT−'); await stat('deleted'); await click('ARP'); await shot('g');
 console.log(logs.join('\n')); await b.close(); })();
