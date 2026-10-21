// Run with a Playwright installation and PRINT_CHROMIUM_EXECUTABLE when Chromium is not bundled.
const path=require('path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright') : 'playwright');
const fs=require('fs');
const repo=path.resolve(__dirname,'..');
const artifacts=process.env.PRINT_VERIFICATION_DIR||path.join(repo,'.print-verification');fs.mkdirSync(artifacts,{recursive:true});
const base={material:'Ivory Marble',core:'black',customColor:null,identity:{name:'NIKHIL RAKESH',tone:'dark',composition:'signature',fineTune:{nameScale:1,x:0,y:0,align:'left'}},logo:{mode:'iq',dataUrl:null,filename:null,mimeType:null,scale:1,x:0,y:0,align:'left'},backLayout:'identity',craft:'engrave'};
const id='10000000-0000-4000-8000-000000000001';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PRINT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PRINT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1200,height:1150}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://iqcard.test/**',route=>{const pathname=new URL(route.request().url()).pathname;const file=path.join(repo,'public')+(pathname==='/customize'?'/customize/print-engine.html':pathname);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'image/png'});});
 await page.route('**/api/admin/print-design?*',route=>route.fulfill({json:{id,source:'registration',designId:'IQD-FIXTURE',label:'Saved registration design',revision:'1234567890abcdef',configuration:base,frozen:false}}));
 await page.goto('https://iqcard.test/customize?print=1&source=registration&id='+id);await page.locator('#print-pack').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#print-pack').disabled,{timeout:30000});
 await page.screenshot({path:path.join(artifacts,'print-desktop.png'),fullPage:true});
 const desktop=await page.locator('#print-checks').innerText();
 const brandPolicy=await page.evaluate(async config=>{
  const {renderPrintArtwork,roundedTrimArtwork}=await import('/customize/print-renderer.mjs');
  const r=window.__iqPBR,c={...config,logo:{...config.logo,align:'right',x:28,y:12},identity:{...config.identity,fineTune:{...config.identity.fineTune,x:3,y:-2,nameScale:.85}}};
  const original=JSON.stringify(c),result=await renderPrintArtwork(r,c,{dpi:300});
  const mark=result.boxes.find(b=>b.label==='text “iq”'),trim=roundedTrimArtwork(result.sides.front,result.geometry),ctx=trim.getContext('2d');
  const logo=document.createElement('canvas');logo.width=800;logo.height=300;logo.getContext('2d').fillRect(0,0,800,300);
  const custom={...c,logo:{...c.logo,mode:'custom',dataUrl:logo.toDataURL(),scale:.75}};
  const customResult=await renderPrintArtwork(r,custom,{dpi:300});
  const uploaded=customResult.boxes.find(b=>b.label==='custom logo');
  return {markLeft:mark.x<150,markTop:mark.y<150,noCaption:!result.boxes.some(b=>b.label.includes('NFC / IQ 01')),savedUnchanged:JSON.stringify(c)===original,roundedCorner:ctx.getImageData(0,0,1,1).data[3]===0,opaqueCentre:ctx.getImageData(trim.width>>1,trim.height>>1,1,1).data[3]===255,customRight:uploaded.x>1000,customOffset:uploaded.y===116,name:result.boxes.find(b=>b.label.includes(config.identity.name))};
 },base);
 if(!brandPolicy.markLeft||!brandPolicy.markTop||!brandPolicy.noCaption||!brandPolicy.savedUnchanged||!brandPolicy.roundedCorner||!brandPolicy.opaqueCentre||!brandPolicy.customRight||!brandPolicy.customOffset)throw new Error('Brand policy verification failed: '+JSON.stringify(brandPolicy));
 console.log(JSON.stringify({brandPolicy}));
 const selectedMaterial=await page.evaluate(async config=>{const {renderPrintArtwork}=await import('/customize/print-renderer.mjs');const r=window.__iqPBR;r.update({...config,step:'final',material:'Ivory Marble'});await r.materialReady;await renderPrintArtwork(r,{...config,material:'Walnut'},{dpi:300});return r.surfaceKey;},base);
 if(selectedMaterial!=='walnut')throw new Error('Print used the previously displayed material instead of its supplied saved configuration: '+selectedMaterial);
 const jobIsolation=await page.evaluate(async config=>{const {renderPrintArtwork}=await import('/customize/print-renderer.mjs');const r=window.__iqPBR,input=structuredClone(config),pending=renderPrintArtwork(r,input,{dpi:300});input.identity.name='CHANGED AFTER START';input.material='Black';const rendered=await pending;const isolated=rendered.boxes.some(b=>b.label.includes(config.identity.name))&&!rendered.boxes.some(b=>b.label.includes('CHANGED AFTER START'));const races=await Promise.allSettled([renderPrintArtwork(r,{...config,material:'Walnut'},{dpi:300}),renderPrintArtwork(r,{...config,material:'Concrete'},{dpi:300})]);return {isolated,olderBlocked:races[0].status==='rejected',newerRendered:races[1].status==='fulfilled',newerSurface:r.surfaceKey};},base);
 if(!jobIsolation.isolated||!jobIsolation.olderBlocked||!jobIsolation.newerRendered||jobIsolation.newerSurface!=='concrete')throw new Error('Concurrent or mutated print job mixed artwork: '+JSON.stringify(jobIsolation));
 const bleedInvariant=await page.evaluate(()=>{const r=window.__iqPBR;const raw=r.renderFlatSurface({trimWidth:80,trimHeight:50,artWidth:80,artHeight:50,bleed:0,pixelsWide:800,pixelsHigh:500}).getContext('2d').getImageData(0,0,800,500).data;const b=r.renderFlatSurface({trimWidth:80,trimHeight:50,artWidth:96,artHeight:66,bleed:8,pixelsWide:960,pixelsHigh:660}).getContext('2d').getImageData(80,80,800,500).data;let sum=0;for(let i=0;i<raw.length;i++)sum+=Math.abs(raw[i]-b[i]);return sum/raw.length;});
 if(bleedInvariant>.2)throw new Error('Bleed changed the pattern inside trim: mean channel error '+bleedInvariant);
 if(process.argv.includes('--bleed-only')){console.log(JSON.stringify({bleedInvariant}));await browser.close();return;}

 const downloadPromise=page.waitForEvent('download');await page.locator('#print-pack').click();const download=await downloadPromise;await download.saveAs(path.join(artifacts,'print-pack.zip'));
 const matrix=await page.evaluate(async config=>{
   const {renderPrintArtwork}=await import('/customize/print-renderer.mjs');const renderer=window.__iqPBR;const original=renderer.renderFlatSurface.bind(renderer),cache=new Map();renderer.renderFlatSurface=g=>{const key=renderer.lastConfig.material+':'+g.pixelsWide+':'+g.pixelsHigh;if(!cache.has(key))cache.set(key,original(g));return cache.get(key);};const materials=['White','Black','Graphite','Terracotta','Mustard','Oxblood','Walnut','Natural Oak','Travertine','Concrete','Ivory Marble','Oxidised Steel'];let count=0,blocked=0;const problems=[];
   for(const material of materials)for(const composition of ['signature','editorial','minimal','centered','statement'])for(const backLayout of ['pure','branded','identity','custom']){
    const tone=count%2?'light':'dark',core=count%2?'white':'black',current={...config,material,core,backLayout,identity:{...config.identity,tone,composition}};renderer.update({...current,step:'final'});const result=await renderPrintArtwork(renderer,current,{dpi:300});const pixel=result.sides.front.getContext('2d').getImageData(50,50,1,1).data;
    if(pixel[3]!==255)problems.push(`${material}/${composition}/${backLayout}: transparent surface`);if(result.preflight.errors.length)blocked++;count++;
   }
   return {count,blocked,problems};
 },base);
 // The screenshot's actual configuration must be diagnosed, not silently made printable.
 const contrastRegression=await page.evaluate(async config=>{
   const {renderPrintArtwork}=await import('/customize/print-renderer.mjs');const {applyPrintInk}=await import('/customize/print-analysis.mjs');const c={...config,material:'Black',backLayout:'pure',identity:{...config.identity,name:'nikhil preview2',tone:'dark'}};const original=JSON.stringify(c);window.__iqPBR.update({...c,step:'final'});const dark=await renderPrintArtwork(window.__iqPBR,c,{dpi:300});const white=await renderPrintArtwork(window.__iqPBR,applyPrintInk(c,'light'),{dpi:300});return {blocked:dark.preflight.errors.some(x=>x.includes('almost invisible')),whiteErrors:white.preflight.errors,unchanged:JSON.stringify(c)===original,namePreserved:white.boxes.some(x=>x.label.includes('nikhil preview2')),pureBackPreserved:!white.boxes.some(x=>x.side==='Back'&&x.label.includes('nikhil preview2'))};
 },base);
 if(!contrastRegression.blocked||contrastRegression.whiteErrors.length||!contrastRegression.unchanged||!contrastRegression.namePreserved||!contrastRegression.pureBackPreserved)throw new Error('Actual card contrast regression failed: '+JSON.stringify(contrastRegression));
 // Custom logo must be present and blank lettering must remain blank.
 const logo=await page.evaluate(async config=>{
  const {renderPrintArtwork}=await import('/customize/print-renderer.mjs');const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=400;const ctx=canvas.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,1000,400);const c={...config,identity:{...config.identity,name:''},logo:{...config.logo,mode:'custom',dataUrl:canvas.toDataURL(),filename:'logo.png',mimeType:'image/png'},backLayout:'custom'};window.__iqPBR.update({...c,step:'final'});const result=await renderPrintArtwork(window.__iqPBR,c,{dpi:300});return {custom:result.boxes.filter(x=>x.label==='custom logo').length,blankPreserved:!result.boxes.some(x=>x.label.includes('NIKHIL')),errors:result.preflight.errors};
 },base);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(artifacts,'print-mobile.png'),fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 // Changing dimensions disables stale downloads until applied.
 await page.locator('[name=inset]').fill('0.5');const staleDisabled=await page.locator('#print-pack').isDisabled();await page.getByRole('button',{name:'Apply print settings'}).click();await page.waitForFunction(()=>document.querySelector('#print-status').textContent.startsWith('Proof ready'));
 const revised=await page.locator('#print-measurements').innerText();
 if(matrix.count!==240||matrix.problems.length||logo.custom!==2||!logo.blankPreserved||logo.errors.length||overflow||!staleDisabled||errors.length)throw new Error('Print verification failed: '+JSON.stringify({matrix,logo,overflow,staleDisabled,errors}));
 fs.writeFileSync(path.join(artifacts,'print-verification.json'),JSON.stringify({desktop,selectedMaterial,jobIsolation,bleedInvariant,contrastRegression,matrix,logo,overflow,staleDisabled,revised,pageErrors:errors},null,2));console.log(JSON.stringify({selectedMaterial,jobIsolation,contrastRegression,matrix,logo,overflow,staleDisabled,revised,pageErrors:errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
