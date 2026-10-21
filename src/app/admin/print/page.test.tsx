import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {beforeEach,describe,it,expect,vi} from 'vitest'
const {auth,list,get}=vi.hoisted(()=>({auth:vi.fn(),list:vi.fn(),get:vi.fn()}))
vi.mock('@/lib/auth/account',()=>({requireVerifiedAdminAccount:auth}))
vi.mock('@/lib/print/repository',async original=>({...await original<typeof import('@/lib/print/repository')>(),listPrintDesigns:list,getPrintDesign:get}))
import Page from './page'
const id='10000000-0000-4000-8000-000000000001'
beforeEach(()=>{vi.resetAllMocks();auth.mockResolvedValue({role:'admin'});list.mockResolvedValue([])})
describe('print desk selection',()=>{
 it('opens an exact order outside the latest100 queue',async()=>{get.mockResolvedValue({id,source:'order',designId:'IQD-OLDER',email:'fixture@example.test',label:'Frozen order'});const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({source:'order',id})}));expect(get).toHaveBeenCalledWith('order',id);expect(html).toContain('title="Print artwork IQD-OLDER"');expect(html).toContain('source=order')})
 it('does not resolve malformed selected IDs',async()=>{await Page({searchParams:Promise.resolve({source:'order',id:'bad'})});expect(get).not.toHaveBeenCalled()})
})
