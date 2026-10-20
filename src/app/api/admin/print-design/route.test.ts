import { beforeEach, describe, expect, it, vi } from 'vitest'
const { auth, load } = vi.hoisted(() => ({ auth: vi.fn(), load: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ getVerifiedCurrentAccount: auth }))
vi.mock('@/lib/print/repository', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/print/repository')>(), getPrintDesign: load }))
import { GET } from './route'
const id='10000000-0000-4000-8000-000000000001'
const request=(q=`source=registration&id=${id}`)=>new Request(`https://iqcard.test/api/admin/print-design?${q}`)
beforeEach(()=>{vi.resetAllMocks()})
describe('admin print design access',()=>{
  it('rejects signed out before any design read',async()=>{auth.mockResolvedValue(null);expect((await GET(request())).status).toBe(401);expect(load).not.toHaveBeenCalled()})
  it('rejects verified clients before design reads',async()=>{auth.mockResolvedValue({role:'client'});expect((await GET(request())).status).toBe(403);expect(load).not.toHaveBeenCalled()})
  it.each(['source=unknown&id='+id,'source=registration&id=bad','source=handoff&id=a-token'])('rejects invalid lookup %s',async q=>{auth.mockResolvedValue({role:'admin'});expect((await GET(request(q))).status).toBe(400);expect(load).not.toHaveBeenCalled()})
  it('returns only exact selected record with private caching',async()=>{auth.mockResolvedValue({role:'admin'});load.mockResolvedValue({id,designId:'IQD-SAVED',configuration:{material:'White'},revision:'abcd'});const r=await GET(request());expect(r.status).toBe(200);expect(load).toHaveBeenCalledWith('registration',id);expect(r.headers.get('Cache-Control')).toContain('no-store');expect((await r.json()).designId).toBe('IQD-SAVED')})
  it('never substitutes a card when lookup fails',async()=>{auth.mockResolvedValue({role:'admin'});load.mockResolvedValue(null);expect((await GET(request())).status).toBe(404)})
  it('contains database errors',async()=>{auth.mockResolvedValue({role:'admin'});load.mockRejectedValue(new Error('private'));const r=await GET(request());expect(r.status).toBe(503);expect(await r.text()).not.toContain('private')})
})
