import { surfaceFor } from './material-surfaces.mjs';
import { printGeometry } from './print-files.mjs';
import { roundedTrimArtwork } from './print-renderer.mjs';
const names=['Walnut','Natural Oak','Travertine','Concrete','Ivory Marble','Oxidised Steel'];
const error=(a,b)=>{let total=0,n=0;for(let i=0;i<a.length;i++)if(i%4!==3){total+=Math.abs(a[i]-b[i]);n++;}return total/n;};
export async function mountSurfacePairs(renderer){
 const root=document.getElementById('iq-atelier');document.documentElement.classList.remove('saved-preview','saved-loading');
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/customize/material-pairs.css';document.head.append(sheet);
 root.className='surface-pairs';root.innerHTML='<header><a href="/customize">iq</a><h1>Same material.<br>Different character.</h1><p>Six fixed front-and-back pairs. Original fronts, newly created backs.</p><p id="pairs-status" role="status">Preparing material proofs…</p></header><section class="pairs-grid"></section><footer>Patterns stay fixed across previews and printing. Names and custom logos keep their saved settings.</footer>';
 if(!renderer?.ready)throw new Error('WebGL2 is required to inspect the material proofs.');
 renderer.mount.style.cssText='position:fixed;left:-10000px;top:0;width:1000px;height:660px';root.append(renderer.mount);renderer.resize();
 const results=[];let failures=0;
 for(const material of names){
  const section=document.createElement('section');section.className='material-pair';section.innerHTML='<h2></h2><div class="pair-faces"></div>';section.querySelector('h2').textContent=material;root.querySelector('.pairs-grid').append(section);
  try{
   const config={core:'black',material,step:'final',craft:'printed',customColor:null,identity:{name:'',tone:'dark',composition:'signature',fineTune:{nameScale:1,x:0,y:0,align:'left'}},logo:{mode:'none',scale:1,x:0,y:0,align:'left'},backLayout:'pure'};
   renderer.update(config);await renderer.materialReady;
   const row={material};
   for(const face of ['front','back']){
    const g=printGeometry({dpi:300,bleed:0}),flat=renderer.renderFlatSurface(g,face),figure=document.createElement('figure'),caption=document.createElement('figcaption');
    caption.textContent=face==='front'?'Front · A':'Back · B';figure.append(roundedTrimArtwork(flat,g),caption);section.querySelector('.pair-faces').append(figure);
    const source=surfaceFor(config,face),image=new Image();image.src=source.url;await image.decode();
    const reference=document.createElement('canvas');reference.width=flat.width;reference.height=flat.height;reference.getContext('2d').drawImage(image,0,0,flat.width,flat.height);
    const actual=flat.getContext('2d').getImageData(0,0,flat.width,flat.height).data;
    row[face]={key:source.key,pixelError:error(actual,reference.getContext('2d').getImageData(0,0,flat.width,flat.height).data)};
    if(row[face].pixelError>3)throw new Error(`${face} does not match its material master.`);
   }
   if(row.front.key===row.back.key)throw new Error('Both faces used the same texture.');
   results.push(row);section.dataset.state='verified';
  }catch(e){failures++;section.dataset.state='failed';const p=document.createElement('p');p.setAttribute('role','alert');p.textContent=e.message;section.append(p);}
 }
 renderer.mount.remove();root.dataset.state=failures?'failed':'verified';root.dataset.verification=JSON.stringify(results);root.querySelector('#pairs-status').textContent=failures?`${failures} pairs could not be verified.`:'All six pairs ready · 12 faces verified against their texture masters.';
}
