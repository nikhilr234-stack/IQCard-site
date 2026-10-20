import { MATERIAL_SURFACES, MATERIAL_SURFACE_VERSION } from './material-surfaces.mjs';

export async function mountMaterialReview(renderer,materials){
  const root=document.getElementById('iq-atelier');
  document.documentElement.classList.remove('saved-preview','saved-loading');
  const css=document.createElement('link');css.rel='stylesheet';css.href='/customize/material-review.css';document.head.append(css);
  root.replaceChildren();root.className='material-review';
  root.innerHTML='<header class="material-review-heading"><a href="/customize">iq</a><h1>The material collection.</h1><p>Twelve fixed surfaces. Inspect the studio card or its flat artwork.</p><div class="material-review-actions" role="group" aria-label="Material view"><button data-view="studio" aria-pressed="true">Studio cards</button><button data-view="flat" aria-pressed="false">Flat artwork</button></div><p id="material-review-status" role="status">Preparing the shared material renderer…</p></header><div class="material-review-grid"></div><footer>These digital material maps reproduce the surface artwork. Matte lamination determines the physical finish of the temporary sticker.</footer>';
  const grid=root.querySelector('.material-review-grid'),status=root.querySelector('#material-review-status');root.dataset.view='studio';root.dataset.version=MATERIAL_SURFACE_VERSION;
  root.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{root.dataset.view=button.dataset.view;root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
  if(!renderer?.ready){status.textContent='WebGL2 is unavailable. Enable hardware acceleration and reload to inspect the studio cards.';root.dataset.state='failed';return;}
  // Keep the actual shared WebGL renderer measurable while it renders each proof.
  renderer.mount.style.cssText='position:fixed;left:-10000px;top:0;width:1000px;height:660px;opacity:1;visibility:visible';root.append(renderer.mount);renderer.resize();renderer.cameraDistance=6.2;
  let failures=0;
  for(const material of materials){
    const surface=MATERIAL_SURFACES[material.name],figure=document.createElement('figure');figure.dataset.material=material.name;
    const views=document.createElement('div');views.className='material-review-views';
    const flat=new Image();flat.className='material-review-flat';flat.alt=`${material.name} flat surface artwork`;flat.src=surface.url;flat.width=surface.width;flat.height=surface.height;
    const studio=new Image();studio.className='material-review-studio';studio.alt=`${material.name} on the rounded IQ Card`;views.append(studio,flat);
    const caption=document.createElement('figcaption'),name=document.createElement('h2'),feel=document.createElement('p'),link=document.createElement('a');name.textContent=material.name;feel.textContent=material.feel;link.href=surface.url;link.target='_blank';link.rel='noopener';link.textContent='Inspect full texture ↗';caption.append(name,feel,link);figure.append(views,caption);grid.append(figure);
    try{
      renderer.update({core:'black',step:'final',material:material.name,customColor:null,craft:'printed',identity:{name:'',tone:material.preferredTone,composition:'signature',fineTune:{nameScale:1,x:0,y:0,align:'left'}},logo:{mode:'none',scale:1,x:0,y:0,align:'left'},backLayout:'pure'});
      await renderer.materialReady;renderer.setPose(10,-14,-3,1.25);
      // WebGL's buffer is copied synchronously after draw, before its compositor clears it.
      const snapshot=document.createElement('canvas');snapshot.width=renderer.canvas.width;snapshot.height=renderer.canvas.height;snapshot.getContext('2d').drawImage(renderer.canvas,0,0);studio.src=snapshot.toDataURL('image/png');await studio.decode();
      figure.dataset.state='ready';status.textContent=`${grid.querySelectorAll('[data-state="ready"]').length} of 12 materials rendered.`;
    }catch(error){failures++;figure.dataset.state='failed';const problem=document.createElement('p');problem.className='material-review-error';problem.textContent=error.message;figure.append(problem);}
  }
  renderer.mount.remove();root.dataset.state=failures?'failed':'ready';
  status.textContent=failures?`${failures} surfaces could not load. Reload to retry.`:'All 12 surfaces ready. Studio and flat views use the same fixed texture maps.';
}
