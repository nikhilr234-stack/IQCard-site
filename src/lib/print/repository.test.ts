import {beforeEach,expect,it,vi} from 'vitest'
const {results,filters}=vi.hoisted(()=>({results:[] as unknown[],filters:[] as string[]}))
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({from:()=>{const result=results.shift();const q={select:()=>q,order:()=>q,eq:(key:string)=>{filters.push(key);return q},not:(key:string)=>{filters.push(key);return q},range:()=>Promise.resolve(result)};return q}})}))
import {listPrintDesigns} from './repository'
beforeEach(()=>{results.length=0;filters.length=0})
it('includes unlinked completed card designs when paid orders have not launched',async()=>{
 results.push({error:{code:'PGRST205'},data:null},{data:[{id:'fixture-id',design_id:'IQD-TEST',email:'fixture@example.test',print_name:'Saved Customer',status:'pending',owner_id:null,created_at:'2026-10-04'}]},{data:[]})
 expect(await listPrintDesigns()).toEqual([expect.objectContaining({source:'registration',name:'Saved Customer',accountLinked:false})])
 expect(filters).not.toContain('status');expect(filters).not.toContain('owner_id');expect(filters).not.toContain('claimed_at')
})
it('does not hide other database failures',async()=>{results.push({error:{code:'42501'}},{data:[]},{data:[]});await expect(listPrintDesigns()).rejects.toThrow('Unable to load')})
it('uses a derived print ID instead of exposing an unclaimed handoff token',async()=>{
 const token='10000000-0000-4000-8000-000000000001';results.push({data:[]},{data:[]},{data:[{token,owner_id:null,design_id:'IQD-LEGACY',created_at:'2026-10-04',email:'fixture@example.test'}]})
 const list=await listPrintDesigns();expect(list).toHaveLength(1);expect(list[0].id).not.toBe(token);expect(JSON.stringify(list)).not.toContain(token);expect(list[0].accountLinked).toBe(false)
})
