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
it('shows unlinked completed cards in All designs and keeps the linked section separate',async()=>{
 list.mockResolvedValue([{id,source:'registration',designId:'IQD-FINISHED',name:'Saved Customer',email:'fixture@example.test',material:'Oxidised Steel',accountLinked:false,label:'Account not linked · saved design'}])
 const all=renderToStaticMarkup(await Page({searchParams:Promise.resolve({})}));expect(all).toContain('All designs');expect(all).toContain('Account linked');expect(all).toContain('Saved Customer');expect(all).not.toContain('Latest 100')
 const linked=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:'linked'})}));expect(linked).not.toContain('Saved Customer')
})
