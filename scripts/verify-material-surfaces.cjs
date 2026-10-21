// Actual WebGL pixels must retain the selected master map, its orientation and its UVs.
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const repo=path.resolve(__dirname,'..');
const samples=[['White','white'],['Black','black'],['Graphite','graphite'],['Terracotta','terracotta'],['Mustard','mustard'],['Oxblood','oxblood'],['Walnut','walnut'],['Natural Oak','natural-oak'],['Travertine','travertine'],['Concrete','concrete'],['Ivory Marble','ivory-marble'],['Oxidised Steel','oxidised-steel']];
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PRINT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PRINT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://iqcard.test/**',route=>{const p=new URL(route.request().url()).pathname,file=path.join(repo,'public',p==='/customize'?'customize/index.html':p);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.webp')?'image/webp':'image/png'});});
  await page.goto('https://iqcard.test/customize');await page.waitForFunction(()=>window.__iqPBR?.ready);
  const results=await page.evaluate(async samples=>{
   const r=window.__iqPBR,results=[],g={trimWidth:85.6,trimHeight:54,artWidth:85.6,artHeight:54,bleed:0,pixelsWide:856,pixelsHigh:540};
   const error=(a,b)=>{let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);return sum/a.length;};
   const {surfaceFor}=await import('/customize/material-surfaces.mjs');
   for(const [name] of samples){
    r.update({...r.lastConfig,step:'final',material:name,customColor:null});await r.materialReady;
    for(const face of ['front','back']){
     const surface=r.renderFlatSurface(g,face),actual=surface.getContext('2d').getImageData(0,0,856,540).data;
     const img=new Image();img.src=surfaceFor(r.lastConfig,face).url;await img.decode();const reference=document.createElement('canvas');reference.width=856;reference.height=540;reference.getContext('2d').drawImage(img,0,0,856,540);
     const referenceError=error(actual,reference.getContext('2d').getImageData(0,0,856,540).data);
     const bleed=r.renderFlatSurface({...g,artWidth:101.6,artHeight:70,bleed:8,pixelsWide:1016,pixelsHigh:700},face);
     results.push({name,face,referenceError,bleedError:error(actual,bleed.getContext('2d').getImageData(80,80,856,540).data)});
    }
   }
   return results;
  },process.argv.includes('--red')?samples.filter(([name])=>name==='Ivory Marble'):samples);
  console.log(JSON.stringify({results,pageErrors:errors}));
  if(results.some(x=>x.referenceError>2||x.bleedError>.3)||errors.length)throw new Error('Material master differs from rendered texture, rear face is mirrored, or bleed changes its crop.');
  if(!process.argv.includes('--red')){
   const artifacts=process.env.PRINT_VERIFICATION_DIR||path.join(repo,'.print-verification');fs.mkdirSync(artifacts,{recursive:true});
   await page.goto('https://iqcard.test/customize?materials=1');await page.waitForFunction(()=>document.querySelector('.material-review')?.dataset.state==='ready');
   if(await page.locator('figure[data-state=ready]').count()!==12)throw new Error('Not all twelve studio cards rendered.');
   const renders=await page.evaluate(()=>Array.from(document.querySelectorAll('figure[data-state=ready]')).map(figure=>({name:figure.dataset.material,png:figure.querySelector('.material-review-studio').src})));
   for(const render of renders)fs.writeFileSync(path.join(artifacts,render.name.toLowerCase().replaceAll(' ','-')+'-studio.png'),Buffer.from(render.png.split(',')[1],'base64'));
   const board=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=2000;const ctx=canvas.getContext('2d');ctx.fillStyle='#f6f5f1';ctx.fillRect(0,0,1800,2000);ctx.fillStyle='#20211e';ctx.font='500 54px Helvetica,Arial,sans-serif';ctx.fillText('IQ Card — the twelve materials',70,90);ctx.font='23px Helvetica,Arial,sans-serif';ctx.fillStyle='#66675e';ctx.fillText('Fixed texture maps · shared by the Atelier preview and flat artwork',70,135);
    Array.from(document.querySelectorAll('figure[data-state=ready]')).forEach((figure,i)=>{const x=70+i%3*565,y=180+Math.floor(i/3)*440;ctx.fillStyle='#eeede7';ctx.fillRect(x,y,530,350);ctx.drawImage(figure.querySelector('.material-review-studio'),x,y,530,350);ctx.fillStyle='#20211e';ctx.font='500 27px Helvetica,Arial,sans-serif';ctx.fillText(figure.dataset.material,x,y+390);});ctx.fillStyle='#66675e';ctx.font='21px Helvetica,Arial,sans-serif';ctx.fillText('Digital surface artwork. Physical matte lamination is a separate finish.',70,1960);return canvas.toDataURL('image/png');
   });
   fs.writeFileSync(path.join(artifacts,'IQ-Card-Twelve-Materials.png'),Buffer.from(board.split(',')[1],'base64'));
   await page.screenshot({path:path.join(artifacts,'materials-studio-desktop.png'),fullPage:true});
   await page.getByRole('button',{name:'Flat artwork',exact:true}).click();await page.screenshot({path:path.join(artifacts,'materials-flat-desktop.png'),fullPage:true});
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(artifacts,'materials-flat-mobile.png'),fullPage:true});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Material review overflows the mobile viewport.');
   const failed=await browser.newPage();
   await failed.route('https://iqcard.test/**',route=>{const p=new URL(route.request().url()).pathname,file=path.join(repo,'public',p==='/customize'?'customize/index.html':p);if(p.endsWith('ivory-marble.webp'))return route.abort();if(!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'image/webp'});});
   await failed.goto('https://iqcard.test/customize');await failed.waitForFunction(()=>window.__iqPBR?.ready);
   const failure=await failed.evaluate(async()=>{const r=window.__iqPBR;r.update({...r.lastConfig,step:'final',material:'Ivory Marble'});try{await r.materialReady;}catch{}try{r.renderFlatSurface({pixelsWide:10,pixelsHigh:10});return false;}catch{return r.mount.dataset.surfaceState==='failed';}});
   if(!failure)throw new Error('A failed map load silently substituted a printable material.');
   await failed.unrouteAll();
   await failed.route('https://iqcard.test/**',route=>{const p=new URL(route.request().url()).pathname,file=path.join(repo,'public',p==='/customize'?'customize/index.html':p);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});const bytes=fs.readFileSync(file);if(p.endsWith('ivory-marble.webp'))bytes[Math.floor(bytes.length/2)]^=1;return route.fulfill({body:bytes,contentType:file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'image/webp'});});
   await failed.reload();await failed.waitForFunction(()=>window.__iqPBR?.ready);
   const tampered=await failed.evaluate(async()=>{const r=window.__iqPBR;r.update({...r.lastConfig,step:'final',material:'Ivory Marble'});try{await r.materialReady;return false;}catch(error){return error.message.includes('changed or is corrupted');}});
   if(!tampered)throw new Error('A changed material file bypassed source verification.');
   console.log('All 12 studio cards rendered; mobile layout fits; missing material blocks export.');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
