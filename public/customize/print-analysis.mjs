// These diagnostics inspect saved artwork; they never infer or rewrite a customer's design.
const srgb=v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;};
const luminance=rgb=>.2126*srgb(rgb[0])+.7152*srgb(rgb[1])+.0722*srgb(rgb[2]);
export function inkContrast(ink,background,alpha=1){
  const composite=ink.map((v,i)=>v*alpha+background[i]*(1-alpha)),a=luminance(composite),b=luminance(background);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
export function applyPrintInk(configuration,ink='saved'){
  if(!['saved','dark','light'].includes(ink))throw new Error('Choose saved, black or white print ink.');
  return ink==='saved'?configuration:{...configuration,craft:'printed',identity:{...configuration.identity,tone:ink}};
}
export function describeSavedDesign(c){
  const backs={pure:'Pure — no name or logo',identity:'Identity — name on back',branded:'Branded — logo on back',custom:'Custom — name and logo on back'};
  return [['Front name',c.identity.name||'Intentionally blank'],['Surface',c.customColor?`${c.material} · custom ${c.customColor}`:c.material],['Saved ink',c.identity.tone==='light'?'White':'Black'],['Logo',c.logo.mode==='custom'?`Custom — ${c.logo.filename||'uploaded logo'}`:'IQ mark — no custom logo saved'],['Treatment',({engrave:'Engraved',printed:'Printed',emboss:'Embossed',deboss:'Debossed',foil:'Foil'})[c.craft]||c.craft],['Front composition',c.identity.composition],['Back layout',backs[c.backLayout]],['NFC core',c.core==='white'?'White':'Black']];
}
function parseHex(value){if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))return null;return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16));}
// Sample the unlit material beneath the actual text/logo bounds, including alpha.
export function addContrastMeasurements(boxes,surface,g){
  const ctx=surface.getContext('2d'),pixels=ctx.getImageData(0,0,surface.width,surface.height).data;
  const background=(x,y)=>{const px=Math.max(0,Math.min(surface.width-1,Math.floor((g.bleed+x/1600*g.trimWidth)/g.artWidth*surface.width))),py=Math.max(0,Math.min(surface.height-1,Math.floor((g.bleed+y/1000*g.trimHeight)/g.artHeight*surface.height)));const at=(py*surface.width+px)*4;return [pixels[at],pixels[at+1],pixels[at+2]];};
  for(const box of boxes){
    const ratios=[];
    if(box.logoSamples){for(const s of box.logoSamples)ratios.push(inkContrast(s.rgb,background(box.x+s.u*box.width,box.y+s.v*box.height),s.alpha*(box.alpha??1)));}
    else{const ink=parseHex(box.ink);if(ink)for(const u of [.15,.5,.85])for(const v of [.25,.5,.75])ratios.push(inkContrast(ink,background(box.x+box.width*u,box.y+box.height*v),box.alpha??1));}
    // A logo may include an opaque background. Block only when no sampled foreground is distinguishable.
    if(ratios.length){ratios.sort((a,b)=>a-b);box.contrastRatio=box.logoSamples?ratios[ratios.length-1]:ratios[Math.floor(ratios.length/2)];}
    delete box.logoSamples;
  }
}
export function captureLogoSamples(img){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=20;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,20,20);const pixels=ctx.getImageData(0,0,20,20).data,samples=[];
  for(let y=0;y<20;y++)for(let x=0;x<20;x++){const at=(y*20+x)*4,alpha=pixels[at+3]/255;if(alpha>.2)samples.push({u:(x+.5)/20,v:(y+.5)/20,rgb:[pixels[at],pixels[at+1],pixels[at+2]],alpha});}
  return samples;
}
