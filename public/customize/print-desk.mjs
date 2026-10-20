import { loadPrintRecord } from './print-import.mjs';
import { applyPrintInk, describeSavedDesign } from './print-analysis.mjs';
import { renderPrintArtwork } from './print-renderer.mjs';
import { canvasRaster, createPrintPdf, createStoredZip, cutContourSvg, downloadBlob } from './print-files.mjs';

export async function mountPrintDesk(renderer,params){
  const root=document.getElementById('iq-atelier');root.replaceChildren();document.documentElement.classList.remove('saved-preview');document.documentElement.classList.remove('saved-loading');
  const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/customize/print-desk.css';document.head.append(sheet);
  if(window.parent!==window){
    const reportHeight=()=>requestAnimationFrame(()=>window.parent.postMessage({type:'iq-print-height',height:Math.max(600,Math.ceil(root.getBoundingClientRect().height))},location.origin));
    new ResizeObserver(reportHeight).observe(root);
    window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===window.parent&&event.data?.type==='iq-print-request-height')reportHeight();});
  }
  root.className='print-desk';root.innerHTML='<p role="status" class="print-loading">Loading the exact saved design…</p>';
  try{
    const record=await loadPrintRecord(params);
    const config=record.configuration;renderer?.update({...config,step:'final'});
    root.innerHTML=`<header class="print-heading"><div><h2 id="print-title"></h2><p id="print-record"></p></div><span class="print-medium">Matte-laminated sticker</span></header>
      <section class="print-build"><h3>Saved card analysis</h3><dl id="print-saved-details"></dl><p id="print-material-note"></p><p id="print-visibility-alert" role="alert" class="print-error"></p><button type="button" id="print-fix-ink" hidden></button></section>
      <div class="print-controls"><form id="print-settings"><h3>Production dimensions</h3><p>Blank card: <strong>85.6 × 54 mm</strong></p><div class="print-fields">
      <label>Ink for this print<select name="ink"><option value="saved">Use saved ink</option><option value="light">White ink · flat print override</option><option value="dark">Black ink · flat print override</option></select></label>
      <label>Inset per edge · mm<input name="inset" type="number" min="0" max="2" step="0.1" value="0" required></label>
      <label>Bleed per edge · mm<input name="bleed" type="number" min="0" max="5" step="0.5" value="3" required></label>
      <label>Safe margin · mm<input name="safe" type="number" min="0" max="8" step="0.5" value="3" required></label>
      <label>Blank corner radius · mm<input name="radius" type="number" min="0" max="6" step="0.01" value="3.18" required></label>
      <label>Output resolution<select name="dpi"><option value="600">600 DPI</option><option value="300">300 DPI</option></select></label>
      </div><p class="print-ink-note" id="print-ink-note">Saved ink is preserved. Ink overrides use flat printed lettering and the IQ mark; uploaded logos are not recoloured.</p><div class="print-settings-end"><p>Bleed and radius are proposed values. Confirm them with your printer and blank supplier.</p><button type="submit">Apply print settings</button></div></form></div>
      <div class="print-proof-title"><h3>Front & back proof</h3><label><input id="print-guides" type="checkbox" checked> Show cut & safety guides</label></div>
      <div id="print-proofs" class="print-proofs"></div><p id="print-measurements" class="print-measurements"></p>
      <section class="print-preflight"><h3>Artwork checks</h3><div id="print-checks" aria-live="polite"></div><p>Legacy designs use Helvetica / Arial system fonts. Review this proof on your print workstation. The pack records its font measurements and design revision.</p><p>Engraving, embossing, debossing and foil become printed simulations on this temporary sticker. Files use RGB colour. Print one sample to approve colour conversion, legibility, corner fit and lamination.</p></section>
      <footer class="print-exports"><div><button id="print-pack" class="print-primary" type="button" disabled>Download print pack · ZIP</button><p>Front + back PNG/JPEG, two PDFs, cutting SVG and production notes.</p></div><div class="print-downloads"><button data-pdf="press" disabled>Press PDF · bleed & crop marks</button><button data-pdf="trim" disabled>Cut-size PDF · actual size</button></div></footer><p id="print-status" role="status" class="print-status"></p>`;
    root.querySelector('#print-title').textContent=config.identity.name||'Unlettered IQ Card';
    root.querySelector('#print-record').textContent=`${record.designId} · ${record.label} · Revision ${record.revision}`;
    const details=root.querySelector('#print-saved-details');
    for(const [label,value] of describeSavedDesign(config)){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);details.append(row);}
    root.querySelector('#print-material-note').textContent=config.material==='Black'&&!config.customColor?'Black has very subtle matte grain. This flat print artwork excludes the inspection view’s moving lights. Dark ink can disappear on this surface.':'The surface pattern comes from the saved Atelier material. Flat print artwork excludes the inspection view’s moving lights.';
    let artwork=null,rendering=false,revision=0;
    const status=root.querySelector('#print-status'),form=root.querySelector('#print-settings'),pack=root.querySelector('#print-pack');
    const settings=()=>Object.fromEntries(['inset','bleed','safe','radius','dpi'].map(key=>[key,Number(new FormData(form).get(key))]));
    const setButtons=disabled=>root.querySelectorAll('[data-download],[data-pdf],#print-pack').forEach(b=>{b.disabled=disabled;});
    const dirty=()=>{revision++;artwork=null;setButtons(true);status.textContent='Dimensions changed. Apply print settings to regenerate this proof before downloading.';};
    form.addEventListener('input',dirty);form.addEventListener('change',dirty);
    root.querySelector('#print-guides').addEventListener('change',event=>root.classList.toggle('print-hide-guides',!event.target.checked));
    async function render(){
      if(rendering)return;rendering=true;const current=revision;artwork=null;setButtons(true);status.textContent='Preparing both sides from the saved Atelier artwork…';
      try{
        const ink=new FormData(form).get('ink'),printConfiguration=applyPrintInk(config,ink);
        const result=await renderPrintArtwork(renderer,printConfiguration,settings());result.printConfiguration=printConfiguration;result.printInk=ink;
        root.querySelector('#print-ink-note').textContent=ink==='saved'?`Using the saved ${config.identity.tone==='light'?'white':'black'} ink. The saved design is unchanged.`:`Print copy uses ${ink==='light'?'white':'black'} flat printed lettering and IQ mark. The saved design and uploaded logo are unchanged.`;if(current!==revision){status.textContent='Dimensions changed while rendering. Apply print settings again.';return;}artwork=result;
        const {geometry:g,sides,preflight}=artwork,proofs=root.querySelector('#print-proofs');proofs.replaceChildren();
        for(const side of ['front','back']){
          const figure=document.createElement('figure');figure.innerHTML=`<figcaption>${side==='front'?'Front':'Back'} <span>Readable · no mirroring</span></figcaption><div class="print-art"><div class="print-cut-guide"></div><div class="print-safe-guide"></div></div><div class="print-side-download"><button data-download="${side}:image/png">PNG</button><button data-download="${side}:image/jpeg">JPEG</button></div>`;
          const art=figure.querySelector('.print-art');art.prepend(sides[side]);art.style.setProperty('--bleed-x',`${g.bleed/g.artWidth*100}%`);art.style.setProperty('--bleed-y',`${g.bleed/g.artHeight*100}%`);art.style.setProperty('--safe-x',`${(g.bleed+g.safe)/g.artWidth*100}%`);art.style.setProperty('--safe-y',`${(g.bleed+g.safe)/g.artHeight*100}%`);art.style.setProperty('--radius',`${Math.max(0,g.radius-g.inset)/g.artWidth*100}%`);proofs.append(figure);
        }
        root.querySelector('#print-measurements').textContent=`Sticker ${g.trimWidth} × ${g.trimHeight} mm · Artwork with bleed ${g.artWidth} × ${g.artHeight} mm · ${g.pixelsWide} × ${g.pixelsHigh} px at ${g.dpi} DPI. Pink = cut; green = safe area. Guides are excluded from image files.`;
        const checks=root.querySelector('#print-checks');checks.replaceChildren();
        const visibility=preflight.errors.find(text=>text.includes('almost invisible'));
        root.querySelector('#print-visibility-alert').textContent=visibility||'';
        const fixInk=root.querySelector('#print-fix-ink');fixInk.hidden=!visibility||ink!=='saved';fixInk.textContent=`Create ${config.identity.tone==='dark'?'white':'black'}-ink print proof`;
        root.dataset.printState=preflight.errors.length?'blocked':'ready';
        if(!preflight.errors.length){const p=document.createElement('p');p.className='print-pass';p.textContent='Both sides rendered. No artwork crosses the cutting boundary.';checks.append(p);}
        for(const [items,className] of [[preflight.errors,'print-error'],[preflight.warnings,'print-warning']])for(const text of items){const p=document.createElement('p');p.className=className;p.textContent=text;checks.append(p);}
        setButtons(Boolean(preflight.errors.length));status.textContent=preflight.errors.length?'Export blocked. Correct the saved design, then reopen it here.':'Proof ready. Print at 100% / actual size; turn off “fit to page”.';
      }catch(error){const checks=root.querySelector('#print-checks');checks.textContent=error.message;checks.className='print-error';root.dataset.printState='failed';status.textContent='Export unavailable. No substitute design has been generated.';}finally{rendering=false;}
    }
    form.addEventListener('submit',event=>{event.preventDefault();render();});
    root.querySelector('#print-fix-ink').addEventListener('click',()=>{form.elements.ink.value=config.identity.tone==='dark'?'light':'dark';dirty();render();});
    const name=(result=artwork)=>`${(config.identity.name||'iqcard').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'iqcard'}-${record.revision}-${result?.printInk==='light'?'white-print':result?.printInk==='dark'?'black-print':'saved-ink'}`;
    async function images(result){return Promise.all(['front','back'].map(async side=>({bytes:new Uint8Array(await (await canvasRaster(result.sides[side],'image/jpeg',result.geometry.dpi)).arrayBuffer()),width:result.geometry.pixelsWide,height:result.geometry.pixelsHigh})));}
    root.addEventListener('click',async event=>{
      const button=event.target.closest('[data-download],[data-pdf],#print-pack');if(!button||button.disabled||!artwork||artwork.preflight.errors.length)return;
      const exportArtwork=artwork;
      setButtons(true);status.textContent='Building print files…';
      try{
        if(button.dataset.download){const [side,type]=button.dataset.download.split(':');const extension=type==='image/png'?'png':'jpg';downloadBlob(await canvasRaster(exportArtwork.sides[side],type,exportArtwork.geometry.dpi),`${name(exportArtwork)}-${side}.${extension}`);}
        else if(button.dataset.pdf){const press=button.dataset.pdf==='press';downloadBlob(new Blob([createPrintPdf(await images(exportArtwork),exportArtwork.geometry,press)],{type:'application/pdf'}),`${name(exportArtwork)}-${press?'press':'actual-size'}.pdf`);}
        else{
          const files=[];for(const side of ['front','back'])for(const type of ['image/png','image/jpeg']){const extension=type==='image/png'?'png':'jpg';files.push({name:`${side}.${extension}`,bytes:new Uint8Array(await (await canvasRaster(exportArtwork.sides[side],type,exportArtwork.geometry.dpi)).arrayBuffer())});}
          const pair=await images(exportArtwork);files.push({name:'press-front-back.pdf',bytes:createPrintPdf(pair,exportArtwork.geometry,true)},{name:'actual-size-front-back.pdf',bytes:createPrintPdf(pair,exportArtwork.geometry,false)},{name:'cut-contour.svg',bytes:new TextEncoder().encode(cutContourSvg(exportArtwork.geometry))});
          const probe=document.createElement('canvas').getContext('2d');probe.font='700 104px Helvetica,Arial,sans-serif';
          const manifest={designId:record.designId,source:record.source,recordId:record.id,configurationRevision:record.revision,frozenOrderSnapshot:record.frozen,renderer:'atelier-v8-flat-2',exportedAt:new Date().toISOString(),configuration:config,printConfiguration:exportArtwork.printConfiguration,printInk:exportArtwork.printInk,geometry:exportArtwork.geometry,preflight:exportArtwork.preflight,font:{stack:'Helvetica,Arial,sans-serif',probeText:'IQ Card Rohan Biligi',probeWidth:probe.measureText('IQ Card Rohan Biligi').width,userAgent:navigator.userAgent},notes:['Front and back are readable and not mirrored. Apply separately to opposite faces.','The fixed NFC micro-caption is placed opposite a right-aligned logo to prevent overlap; saved name/logo positions are unchanged.','All image files include bleed, without guides. PDFs distinguish actual trim size from press bleed/marks.','Print at 100% actual size. Do not fit to page.','Corner radius, bleed and sticker inset require printer/blank approval.','Raster images are RGB; press PDF is DeviceRGB, not certified PDF/X or CMYK. Agree colour handling with the printer.','Material appearance is unlit; surface reflections and 3D lighting are excluded. Craft depth/foil is simulated ink.','Legacy system fonts require proof review on this workstation.','A physical laminated sample must approve colour, fit and legibility before batch production.']};
          files.push({name:'production-notes.json',bytes:new TextEncoder().encode(JSON.stringify(manifest,null,2))});downloadBlob(new Blob([createStoredZip(files)],{type:'application/zip'}),`${name(exportArtwork)}-print-pack.zip`);
        }
        status.textContent='Download prepared. Print at actual size and approve one laminated sample.';
      }catch(error){status.textContent=`Download failed: ${error.message}`;}finally{setButtons(!artwork||Boolean(artwork.preflight.errors.length));}
    });
    await render();
  }catch(error){root.replaceChildren();const message=document.createElement('p');message.setAttribute('role','alert');message.className='print-error';message.textContent=error.message;root.append(message);}
}
