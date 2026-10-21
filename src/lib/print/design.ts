import { canonicalizeCardPayload } from '@/lib/customizer/card-configuration'
const record=(value:unknown):Record<string,unknown>|null=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null
const has=(value:Record<string,unknown>|null,keys:string[])=>Boolean(value&&keys.every(key=>Object.hasOwn(value,key)))
// Printing must not create a missing logo, craft, core or placement using editor defaults.
export function readPrintableCard(value:unknown){
  const payload=record(value),config=record(payload?.configuration),identity=record(config?.identity),logo=record(config?.logo)
  if(!has(config,['material','core','craft','identity','logo','backLayout'])||!has(identity,['name','tone','composition','fineTune'])||!has(record(identity?.fineTune),['nameScale','x','y','align'])||!has(logo,['mode','scale','x','y','align']))return null
  return canonicalizeCardPayload(value)
}
