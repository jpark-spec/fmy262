const fs=require('fs');fs.mkdirSync('../dist',{recursive:true});let t=fs.readFileSync('template.html','utf8');
const m={'/*OPL*/':'opl3fn.js','/*ENGINE*/':'engine.js','/*DEMO*/':'demo.js','/*PRESETS*/':'presets.js','/*EXPORT*/':'export.js','/*RAD*/':'rad.js','/*FONT*/':'font.js'};
for(const k in m) t=t.replace(k,()=>fs.readFileSync(m[k],'utf8'));
fs.writeFileSync('../dist/fm1-opl3-tracker.html',t);console.log('ok',t.length);
/* the workbench (USB: the FM-1's song slots <-> A2M): fm1-base's companion client and port finder inlined, their
 * ES module words taken out */
{
  const B = '../vendor/fm1-base/web/';
  const mod = f => fs.readFileSync(f, 'utf8').replace(/^import .*$/mg, '').replace(/^export /mg, '');
  const w = { '/*DEMO*/': 'demo.js', '/*EXPORT*/': 'export.js', '/*RAD*/': 'rad.js', '/*SONGFILE*/': 'songfile.js' };
  let h = fs.readFileSync('workbench.html', 'utf8');
  for (const k in w) h = h.replace(k, () => fs.readFileSync(w[k], 'utf8'));
  if (fs.existsSync(B + 'fm1ports.js')) {
    h = h.replace('/*COMPANION*/', () => 'const { Companion, findCompanions, emuAccess } = (() => {\n' + mod(B + 'fm1ports.js') + mod(B + 'companion/companion.js') + mod(B + 'emu/parts/port_client.js') + '\nreturn { Companion, findCompanions, emuAccess };\n})();');
    fs.writeFileSync('../dist/fmy262-workbench.html', h); console.log('ok workbench', h.length);
  } else console.log('workbench left out: no vendor/fm1-base');
}
