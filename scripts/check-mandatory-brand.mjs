import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
for (const file of ['index.html','print-engine.html']) {
 const source=readFileSync(new URL(`../public/customize/${file}`,import.meta.url),'utf8');
 const code=source.slice(source.indexOf('class PBRRenderer {'),source.indexOf('  function initPBRRenderer(){'));
 const Renderer=runInNewContext(`(${code.trim()})`,{STEPS:['identity','final']});
 for(const mode of ['iq','custom','none']) test(`${file}: ${mode} front always includes exactly one top-left IQ mark`,()=>{
  const texts=[],images=[];
  const ctx={setTransform(){},clearRect(){},save(){},restore(){},fillText(text,x,y){texts.push({text,x,y})},drawImage(...args){images.push(args)}};
  const renderer=Object.create(Renderer.prototype);
  renderer.frontDecalCanvas={width:1600,height:1000,getContext:()=>ctx};
  renderer.getCustomLogoImage=()=>({width:1000,height:400});
  const config={step:'final',craft:'engrave',identity:{name:'Saved Name',tone:'light',composition:'signature',fineTune:{nameScale:1,x:0,y:0,align:'left'}},logo:{mode,scale:1.93,x:28,y:-10,align:'right',dataUrl:'saved'}};
  const before=structuredClone(config);renderer.drawFrontDecal(config);
  assert.deepEqual(texts.filter(t=>t.text==='iq'),[{text:'iq',x:105,y:86}]);
  assert.deepEqual(texts.find(t=>t.text==='Saved Name'),{text:'Saved Name',x:105,y:910});
  assert.deepEqual(config,before);assert.equal(images.length,mode==='custom'?1:0);
  if(mode==='custom'){assert.equal(images[0][2],61);assert.ok(Math.abs(images[0][1]-1080.588)<.001)}
 });
}
