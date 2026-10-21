import {describe,it,expect,vi} from 'vitest'
// @ts-expect-error Browser module shared by preview and print.
import {surfaceFor,SurfaceMapCache,MATERIAL_SURFACES} from '../../../public/customize/material-surfaces.mjs'
describe('fixed material source loading',()=>{
 it('covers the complete existing twelve-material selection',()=>expect(Object.keys(MATERIAL_SURFACES)).toHaveLength(12))
 it('keeps custom colours and the undecorated core outside the material map',()=>{expect(surfaceFor({material:'Ivory Marble',customColor:'blue'})).toBeNull();expect(surfaceFor({material:'Ivory Marble',step:'core'})).toBeNull()})
 it('rejects an unknown material rather than substituting walnut',()=>expect(()=>surfaceFor({material:'Unknown'})).toThrow('material'))
 it('deduplicates in-flight image loads and reuses the same decoded source',async()=>{const source={texture:'decoded'},load=vi.fn(async()=>source),cache=new SurfaceMapCache(load);const [a,b]=await Promise.all([cache.get({material:'Ivory Marble'}),cache.get({material:'Ivory Marble'})]);expect(a).toBe(b);expect(a).toMatchObject({texture:'decoded',surface:{key:'ivory-marble'}});expect(load).toHaveBeenCalledTimes(1)})
 it('fails closed and permits retry after a failed image load',async()=>{let fail=true;const cache=new SurfaceMapCache(async()=>{if(fail)throw new Error('Texture unavailable');return {texture:'recovered'}});await expect(cache.get({material:'Ivory Marble'})).rejects.toThrow('Texture unavailable');fail=false;expect(await cache.get({material:'Ivory Marble'})).toMatchObject({texture:'recovered'})})
})
