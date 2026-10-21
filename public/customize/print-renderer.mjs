import { addContrastMeasurements, captureLogoSamples } from './print-analysis.mjs';
import { printGeometry } from './print-files.mjs';
import { surfaceFor } from './material-surfaces.mjs';

export function inspectBounds(boxes,g) {
  const errors=[],warnings=[];
  for(const b of boxes){
    const x=b.x/1600*g.trimWidth,y=b.y/1000*g.trimHeight,w=b.width/1600*g.trimWidth,h=b.height/1000*g.trimHeight,r=Math.max(0,g.radius-g.inset);
    const inside=(px,py)=>{if(px<0||py<0||px>g.trimWidth||py>g.trimHeight)return false;const cx=Math.max(r,Math.min(g.trimWidth-r,px)),cy=Math.max(r,Math.min(g.trimHeight-r,py));return Math.hypot(px-cx,py-cy)<=r+.001;};
    if(![[x,y],[x+w,y],[x,y+h],[x+w,y+h]].every(([px,py])=>inside(px,py))) errors.push(`${b.side}: ${b.label} crosses the cutting boundary. Edit the saved design before printing.`);
    else if(x<g.safe||y<g.safe||x+w>g.trimWidth-g.safe||y+h>g.trimHeight-g.safe)warnings.push(`${b.side}: ${b.label} is inside the ${g.safe} mm safety margin.`);
    if(Number.isFinite(b.contrastRatio)){
      const ratio=b.contrastRatio.toFixed(2);
      if(b.contrastRatio<1.5 && (!b.font||b.font>30))errors.push(`${b.side}: ${b.label} is almost invisible against this material (${ratio}:1 contrast). Choose a deliberate print ink override or edit the saved design.`);
      else if(b.contrastRatio<3)warnings.push(`${b.side}: ${b.label} has low contrast (${ratio}:1). Check legibility on the physical proof.`);
    }
    if(b.font&&b.font/1000*g.trimHeight/25.4*72<5)warnings.push(`${b.side}: ${b.label} is smaller than 5 pt. Check the physical proof.`);
    if(b.rasterWidth&&b.rasterWidth/(w/25.4)<300)warnings.push(`${b.side}: custom logo has ${Math.round(b.rasterWidth/(w/25.4))} effective DPI. A higher-resolution original is recommended.`);
  }
  return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
function observeCanvas(canvas,side,boxes){
  const ctx=canvas.getContext('2d'),fill=ctx.fillText.bind(ctx),image=ctx.drawImage.bind(ctx);
  ctx.fillText=(text,x,y,...rest)=>{
    const m=ctx.measureText(text);if(String(text).trim())boxes.push({side,label:`text “${text}”`,x:x-m.actualBoundingBoxLeft,y:y-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,ink:ctx.fillStyle,alpha:ctx.globalAlpha,font:parseFloat(ctx.font.match(/([\d.]+)px/)?.[1]||'0')});
    return fill(text,x,y,...rest);
  };
  ctx.drawImage=(img,x,y,w,h,...rest)=>{boxes.push({side,label:'custom logo',x,y,width:w,height:h,alpha:ctx.globalAlpha,logoSamples:captureLogoSamples(img),rasterWidth:img.src?.startsWith('data:image/svg+xml')?undefined:img.naturalWidth});return image(img,x,y,w,h,...rest);};
}
export async function renderPrintArtwork(renderer,configuration,settings={}) {
  configuration=structuredClone(configuration);
  const g=printGeometry(settings);
  if(!renderer?.ready||!renderer.gl||renderer.gl.isContextLost())throw new Error('The Atelier renderer is unavailable. Use a browser with WebGL2 enabled. No substitute artwork has been generated.');
  const generation=renderer.printGeneration=(renderer.printGeneration||0)+1;
  renderer.update({...configuration,step:'final'});
  await renderer.materialReady;
  await document.fonts.ready;
  if(configuration.logo.mode==='custom'){
    const img=new Image();img.src=configuration.logo.dataUrl;
    let timeout;try{await Promise.race([img.decode(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('The saved logo did not load. Export is blocked.')),10000);})]);}finally{clearTimeout(timeout);}
    if(!img.naturalWidth)throw new Error('The saved logo is empty.');renderer.customLogoImageCache.set(configuration.logo.dataUrl,img);
  }
  if(renderer.printGeneration!==generation||renderer.surfaceKey!==(surfaceFor(configuration)?.key||null)||renderer.lastConfig.customColor!==configuration.customColor||renderer.lastConfig.material!==configuration.material||renderer.lastConfig.core!==configuration.core)throw new Error('The selected artwork changed during preparation. Apply print settings again.');
  // Existing drawing functions retain the original 1600 × 1000 design coordinate system.
  const oldFront=renderer.frontDecalCanvas,oldBack=renderer.backDecalCanvas,front=document.createElement('canvas'),back=document.createElement('canvas'),boxes=[];
  front.width=back.width=3200;front.height=back.height=2000;
  observeCanvas(front,'Front',boxes);observeCanvas(back,'Back',boxes);
  try{renderer.frontDecalCanvas=front;renderer.backDecalCanvas=back;renderer.drawFrontDecal({...configuration,step:'final'});renderer.drawBackDecal({...configuration,step:'final'});}finally{renderer.frontDecalCanvas=oldFront;renderer.backDecalCanvas=oldBack;}
  const surface=renderer.renderFlatSurface(g),sides={};
  addContrastMeasurements(boxes,surface,g);
  for(const [side,decal] of [['front',front],['back',back]]){
    const canvas=document.createElement('canvas');canvas.width=g.pixelsWide;canvas.height=g.pixelsHigh;const ctx=canvas.getContext('2d');ctx.drawImage(surface,0,0);
    const x=g.bleed/g.artWidth*canvas.width,y=g.bleed/g.artHeight*canvas.height,w=g.trimWidth/g.artWidth*canvas.width,h=g.trimHeight/g.artHeight*canvas.height;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(decal,x,y,w,h);ctx.restore();sides[side]=canvas;
  }
  return {geometry:g,sides,preflight:inspectBounds(boxes,g),boxes};
}
