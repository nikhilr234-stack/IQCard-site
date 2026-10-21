import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfaceFor, SurfaceMapCache, MATERIAL_SURFACES } from '../public/customize/material-surfaces.mjs';
const paired=['Walnut','Natural Oak','Travertine','Concrete','Ivory Marble','Oxidised Steel'];
for(const material of paired)test(`${material}: back has an independent immutable map`,()=>{
 const config={material},front=surfaceFor(config,'front'),back=surfaceFor(config,'back');
 assert.notEqual(front.url,back.url);assert.notEqual(front.sha256,back.sha256);assert.notEqual(front.key,back.key);
 assert.deepEqual(surfaceFor(config,'back'),back);
 assert.equal(front,MATERIAL_SURFACES[material]);
});
for(const material of ['White','Black','Graphite','Terracotta','Mustard','Oxblood'])test(`${material}: keep the original shared surface`,()=>assert.equal(surfaceFor({material},'front'),surfaceFor({material},'back')));
test('cache keeps both faces distinct and deduplicates repeated back loads',async()=>{
 const calls=[],cache=new SurfaceMapCache(async surface=>{calls.push(surface.url);return {decoded:surface.key};});
 const [front,back,again]=await Promise.all([cache.get({material:'Ivory Marble'},'front'),cache.get({material:'Ivory Marble'},'back'),cache.get({material:'Ivory Marble'},'back')]);
 assert.notEqual(front,back);assert.equal(back,again);assert.equal(calls.length,2);
});
test('invalid face names are rejected rather than silently printing the front',()=>assert.throws(()=>surfaceFor({material:'Walnut'},'rear'),/face/i));
test('custom colours and the undecorated core stay unchanged on both faces',()=>{
 for(const face of ['front','back']){assert.equal(surfaceFor({material:'Walnut',customColor:'#ffffff'},face),null);assert.equal(surfaceFor({material:'Walnut',step:'core'},face),null);}
});

for(const material of Object.keys(MATERIAL_SURFACES))for(const face of ['front','back'])test(`${material}/${face}: immutable bytes match manifest`,()=>{const map=surfaceFor({material},face),bytes=readFileSync(new URL('../public'+map.url,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),map.sha256);});
