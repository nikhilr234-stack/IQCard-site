import {describe,it,expect} from 'vitest'
// @ts-expect-error Browser module.
import {inkContrast,applyPrintInk,describeSavedDesign,addContrastMeasurements} from '../../../public/customize/print-analysis.mjs'
// @ts-expect-error Browser module.
import {inspectBounds} from '../../../public/customize/print-renderer.mjs'
// @ts-expect-error Browser module.
import {printGeometry} from '../../../public/customize/print-files.mjs'
const saved={material:'Black',core:'black',customColor:null,craft:'engrave',backLayout:'pure',identity:{name:'Saved Name',tone:'dark',composition:'signature',fineTune:{x:0,y:0,nameScale:1,align:'left'}},logo:{mode:'iq',scale:1,x:0,y:0,align:'left'}}
describe('full print card analysis',()=>{
 it('detects black ink on the actual near-black material',()=>{expect(inkContrast([0,0,0],[8,9,10],1)).toBeLessThan(1.1);expect(inkContrast([255,255,255],[8,9,10],1)).toBeGreaterThan(19)})
 it('blocks near-invisible identity rather than reporting ready',()=>{const result=inspectBounds([{side:'Front',label:'name',x:100,y:800,width:400,height:100,font:104,contrastRatio:1.05}],printGeometry());expect(result.errors.join(' ')).toContain('almost invisible')})
 it('warns for tiny low-contrast microtext without blocking the entire card',()=>{const result=inspectBounds([{side:'Back',label:'microtext',x:1200,y:800,width:100,height:20,font:18,contrastRatio:1.05}],printGeometry());expect(result.errors).toHaveLength(0);expect(result.warnings.join(' ')).toContain('contrast')})
 it('keeps the original config unchanged unless a print override is chosen',()=>{const original=structuredClone(saved);expect(applyPrintInk(saved,'saved')).toEqual(saved);const changed=applyPrintInk(saved,'light');expect(changed.identity.tone).toBe('light');expect(changed.logo).toEqual(saved.logo);expect(changed.identity.fineTune).toEqual(saved.identity.fineTune);expect(saved).toEqual(original);expect(()=>applyPrintInk(saved,'automatic')).toThrow()})
 it.each(['foil','emboss','deboss'])('uses actual white ink rather than a %s simulation for an explicit ink override',craft=>{expect(applyPrintInk({...saved,craft},'light')).toMatchObject({craft:'printed',identity:{tone:'light'}});expect(applyPrintInk({...saved,craft},'saved').craft).toBe(craft)})
 it('does not mistake an opaque logo background for invisible foreground lettering',()=>{const boxes=[{side:'Front',label:'custom logo',x:100,y:100,width:400,height:100,alpha:1,logoSamples:Array.from({length:20},(_,i)=>({u:i/20,v:.5,rgb:i===0?[0,0,0]:[255,255,255],alpha:1})),contrastRatio:0}];const white={width:1,height:1,getContext:()=>({getImageData:()=>({data:new Uint8Array([255,255,255,255])})})};addContrastMeasurements(boxes,white,printGeometry());expect(boxes[0].contrastRatio).toBeGreaterThan(19);expect(inspectBounds(boxes,printGeometry()).errors).toHaveLength(0)})
 it('explains the saved material, name, IQ logo and intentionally pure back',()=>{const values=describeSavedDesign(saved);expect(values).toContainEqual(['Surface','Black']);expect(values).toContainEqual(['Front name','Saved Name']);expect(values).toContainEqual(['Saved ink','Black']);expect(values).toContainEqual(['Logo','IQ mark — no custom logo saved']);expect(values).toContainEqual(['Back layout','Pure — no name or logo'])})
})
