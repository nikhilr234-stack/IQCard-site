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
