import {beforeEach,expect,it,vi} from 'vitest'
const {results}=vi.hoisted(()=>({results:[] as unknown[]}))
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({from:()=>{const result=results.shift();const q={select:()=>q,order:()=>q,eq:()=>q,not:()=>q,limit:()=>Promise.resolve(result)};return q}})}))
import {listPrintDesigns} from './repository'
beforeEach(()=>results.length=0)
it('includes saved registration cards when paid orders have not launched',async()=>{
 results.push({error:{code:'PGRST205'},data:null},{data:[{id:'fixture-id',design_id:'IQD-TEST',email:'fixture@example.test',print_name:'Saved Customer',created_at:'2026-10-04'}]},{data:[]})
 expect(await listPrintDesigns()).toEqual([expect.objectContaining({source:'registration',name:'Saved Customer'})])
})
it('does not hide other database failures',async()=>{results.push({error:{code:'42501'}},{data:[]},{data:[]});await expect(listPrintDesigns()).rejects.toThrow('Unable to load')})
