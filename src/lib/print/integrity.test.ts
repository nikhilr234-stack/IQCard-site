import {describe,it,expect} from 'vitest'
import {webcrypto} from 'node:crypto'
// @ts-expect-error Browser module shared with the print exporter.
import {sha256Bytes,verifyBytes,createIntegrityManifest} from '../../../public/customize/print-integrity.mjs'
const subtle=webcrypto.subtle
describe('print artwork integrity',()=>{
 it('uses the standard SHA-256 digest',async()=>expect(await sha256Bytes(new TextEncoder().encode('abc'),subtle)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'))
 it('rejects altered source bytes even if their dimensions or byte lengths match',async()=>{const original=new Uint8Array([1,2,3]),hash=await sha256Bytes(original,subtle);await expect(verifyBytes(new Uint8Array([3,2,1]),hash,subtle)).rejects.toThrow('changed');expect(await verifyBytes(original,hash,subtle)).toBe(hash)})
 it('does not silently skip verification when secure hashing is unavailable',async()=>{await expect(sha256Bytes(new Uint8Array([1]),null)).rejects.toThrow('secure')})
 it('binds the archived files to the actual job, geometry and printed configuration',async()=>{const files=[{name:'front.png',bytes:new Uint8Array([1,2])},{name:'back.png',bytes:new Uint8Array([3,4])}],context={designId:'IQD-FIXTURE',geometry:{trimWidth:85.6},configuration:{material:'Ivory Marble'}};const original=await createIntegrityManifest(files,context,subtle),again=await createIntegrityManifest([...files].reverse(),context,subtle);expect(original.fingerprint).toBe(again.fingerprint);expect(original.files['front.png'].bytes).toBe(2);const changed=await createIntegrityManifest(files,{...context,geometry:{trimWidth:84.6}},subtle);expect(changed.fingerprint).not.toBe(original.fingerprint)})
})
