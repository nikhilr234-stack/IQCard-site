import {describe,it,expect} from 'vitest'
import {readPrintableCard} from './design'
const payload={schemaVersion:'1.0',configuration:{core:'black',material:'Ivory Marble',customColor:null,craft:'engrave',backLayout:'identity',identity:{name:'Saved Name',tone:'light',composition:'signature',fineTune:{nameScale:1.2,x:8,y:-4,align:'right'}},logo:{mode:'iq',scale:.8,x:12,y:5,align:'right'}}}
describe('print payload completeness',()=>{
 it('preserves a complete design',()=>expect(readPrintableCard(payload)?.configuration).toMatchObject(payload.configuration))
 it.each(['core','craft','logo'])('rejects missing %s instead of printing defaults',key=>{const p=structuredClone(payload);delete (p.configuration as Record<string,unknown>)[key];expect(readPrintableCard(p)).toBeNull()})
 it('rejects missing or partial name placement',()=>{const p=structuredClone(payload);delete (p.configuration.identity as Record<string,unknown>).fineTune;expect(readPrintableCard(p)).toBeNull();expect(readPrintableCard({...payload,configuration:{...payload.configuration,identity:{...payload.configuration.identity,fineTune:{x:0}}}})).toBeNull()})
 it('rejects partial logo placement',()=>expect(readPrintableCard({...payload,configuration:{...payload.configuration,logo:{mode:'iq'}}})).toBeNull())
})
