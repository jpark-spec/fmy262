process.chdir(require('path').join(__dirname,'../web'));
const puppeteer=require('puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:1280,height:1000,deviceScaleFactor:2}); const logs=[]; p.on('pageerror',e=>logs.push('ERR '+e.message));
 await p.goto('file://'+require('path').resolve(__dirname,'../dist/fm1-opl3-tracker.html')+''); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.click('#scr'); const w=ms=>new Promise(r=>setTimeout(r,ms));
 const btn=async n=>(await (await p.$(`.btn[data-n="${n}"]`)).boundingBox());
 const click=async n=>{const bb=await btn(n);await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height-10);await w(200);};
 const turn=async(k,dy)=>{const bb=await (await p.$(`.knob[data-k="${k}"]`)).boundingBox(); await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2); await p.mouse.down(); await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2+dy,{steps:6}); await p.mouse.up(); await w(150);};
 const shot=async n=>{await w(1900); await (await p.$('#scr')).screenshot({path:`../tests/out/z_${n}.png`});};
 await click('GLO'); await shot('glo0'); await click('GLO'); await shot('glo1');
 await turn('0',30); await shot('glo1b');  // OPL2
 await click('HOME'); await shot('pat_opl2');
 const hb=await btn('HOME'); await p.mouse.move(hb.x+hb.width/2,hb.y+hb.height-10); await p.mouse.down(); await w(1000); await p.mouse.up(); await shot('menu0');
 await turn('0',-40); await shot('menu_color');
 await turn('alg',-12); await shot('menu_ctrl');
 await click('HOME'); await shot('after');
 await click('SEQ'); await shot('seq');
 console.log(logs.join('\n')||'no errors'); await b.close(); })();
