process.chdir(require('path').join(__dirname,'../web'));
const puppeteer=require('puppeteer-core');
(async()=>{
 const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:1280,height:900}); const logs=[]; p.on('pageerror',e=>logs.push('ERR '+e.message));
 await p.goto('file://'+require('path').resolve(__dirname,'../dist/fm1-opl3-tracker.html')+''); await p.click('#scr'); await new Promise(r=>setTimeout(r,300));
 const box=async s=>(await (await p.$(s)).boundingBox());
 const click=async s=>{const bb=await box(s);await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height-10);await new Promise(r=>setTimeout(r,150));};
 const shot=async n=>{await new Promise(r=>setTimeout(r,250)); await p.screenshot({path:`../tests/out/${n}.png`,clip:{x:200,y:60,width:390,height:390}});};
 await click('.btn[data-n="SAVE"]'); const kb=await box('.knob[data-k="sel"]'); await p.mouse.move(kb.x+25,kb.y+25); await p.mouse.down(); await p.mouse.move(kb.x+25,kb.y+25-20,{steps:4}); await p.mouse.up();
 await shot('t20a'); await click('.btn[data-n="SAVE"]'); await shot('t20b'); await p.keyboard.type('X'); await click('.btn[data-n="SAVE"]'); await shot('t20c');
 console.log(logs.join('\n')||'no errors'); await b.close(); })();
