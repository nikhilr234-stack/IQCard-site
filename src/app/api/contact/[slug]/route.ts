import { NextResponse } from 'next/server'
import { getPublishedProfile } from '@/lib/profile/repository'
import { createVCard } from '@/lib/profile/vcard'
import { buildPublicProfileView } from '@/lib/profile/public-profile'
export async function GET(_: Request, { params }: { params: Promise<{ slug:string }> }) { const { slug } = await params; const profile = await getPublishedProfile(slug); if (!profile) return new NextResponse('Not found',{status:404}); const view = buildPublicProfileView(profile); return new NextResponse(createVCard({fullName:profile.full_name,phone:view.publicPhone,email:view.publicEmail,headline:profile.headline}),{headers:{'Content-Type':'text/vcard','Content-Disposition':`attachment; filename="${profile.slug}.vcf"`}}) }
