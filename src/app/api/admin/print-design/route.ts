import { createHash, randomUUID } from 'node:crypto'
import { readPrintableCard } from '@/lib/print/design'
import { readLimitedRequestBody } from '@/lib/http/read-limited-body'
import { NextResponse } from 'next/server'
import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { getPrintDesign, validPrintLookup, type PrintSource } from '@/lib/print/repository'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}
export async function GET(request: Request) {
  try {
    const account=await getVerifiedCurrentAccount()
    if(!account)return NextResponse.json({error:'Sign in with a verified administrator account.'},{status:401,headers})
    if(account.role!=='admin')return NextResponse.json({error:'Administrator access is required.'},{status:403,headers})
    const params=new URL(request.url).searchParams,source=params.get('source'),id=params.get('id')
    if(!validPrintLookup(source,id))return NextResponse.json({error:'Choose an available saved design.'},{status:400,headers})
    const design=await getPrintDesign(source as PrintSource,id!)
    if(!design)return NextResponse.json({error:'This exact saved design is unavailable. No substitute has been loaded.'},{status:404,headers})
    return NextResponse.json(design,{headers})
  }catch{return NextResponse.json({error:'This design could not be loaded. Please try again.'},{status:503,headers})}
}

export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers})
  try{
    const account=await getVerifiedCurrentAccount()
    if(!account)return NextResponse.json({error:'Sign in with a verified administrator account.'},{status:401,headers})
    if(account.role!=='admin')return NextResponse.json({error:'Administrator access is required.'},{status:403,headers})
    const text=await readLimitedRequestBody(request,2_000_000)
    if(text===null)return NextResponse.json({error:'Choose a saved design file smaller than 2 MB.'},{status:413,headers})
    let body
    try{body=JSON.parse(text)}catch{return NextResponse.json({error:'Choose a valid saved design JSON file.'},{status:400,headers})}
    const designId=body?.design_id??body?.designId,card=readPrintableCard(body?.design_payload??body?.payload)
    if(typeof designId!=='string'||!/^IQD-[a-zA-Z0-9-]{1,64}$/.test(designId)||!card)return NextResponse.json({error:'This file does not contain a complete saved physical card. No defaults have been substituted.'},{status:400,headers})
    const revision=createHash('sha256').update(JSON.stringify(card.configuration)).digest('hex').slice(0,16)
    return NextResponse.json({id:randomUUID(),source:'import',importVersion:1,designId,configuration:card.configuration,revision,frozen:true,label:'Private saved-design import · source record unchanged'},{headers})
  }catch{return NextResponse.json({error:'The private design file could not be opened. Please try again.'},{status:503,headers})}
}
