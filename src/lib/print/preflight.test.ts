import {describe,it,expect} from 'vitest'
// @ts-expect-error Browser module.
import {inspectBounds} from '../../../public/customize/print-renderer.mjs'
// @ts-expect-error Browser module.
import {printGeometry} from '../../../public/customize/print-files.mjs'
const box={side:'Front',label:'name',x:100,y:800,width:400,height:100}
describe('print preflight',()=>{
 it('passes interior art without moving it',()=>{const before={...box};expect(inspectBounds([box],printGeometry()).errors).toEqual([]);expect(box).toEqual(before)})
 it('blocks clipped text and rounded-corner collisions',()=>{expect(inspectBounds([{...box,x:1550}],printGeometry()).errors).toHaveLength(1);expect(inspectBounds([{...box,x:0,y:0,width:15,height:15}],printGeometry()).errors).toHaveLength(1)})
 it('warns on safe margin and low-resolution logos',()=>{expect(inspectBounds([{...box,x:30,rasterWidth:40}],printGeometry()).warnings).toHaveLength(2)})
})
