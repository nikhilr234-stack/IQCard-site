import Link from 'next/link'
import { requireVerifiedAdminAccount } from '@/lib/auth/account'
import { listPrintDesigns, getPrintDesign, validPrintLookup, type PrintSource } from '@/lib/print/repository'
import styles from './print.module.css'
import { PrintFrame } from './PrintFrame'
import { PrintImport } from './PrintImport'
export const dynamic='force-dynamic'
export const metadata={title:'Print desk · IQ Card',robots:{index:false,follow:false}}
export default async function PrintDeskPage({searchParams}:{searchParams:Promise<{source?:string;id?:string;q?:string;view?:string}>}) {
  await requireVerifiedAdminAccount()
  const params=await searchParams
  let designs:Awaited<ReturnType<typeof listPrintDesigns>>=[],failed=false
  try{designs=await listPrintDesigns()}catch{failed=true}
  let selected=designs.find(d=>d.source===params.source&&d.id===params.id)
  if(!selected&&validPrintLookup(params.source,params.id)){
    try{selected=await getPrintDesign(params.source as PrintSource,params.id!)??undefined}catch{failed=true}
  }
  const search=(params.q??'').trim().toLowerCase()
  const linkedOnly=params.view==='linked'
  const filtered=designs.filter(d=>(!linkedOnly||d.accountLinked)&&(!search||`${d.email} ${d.name??''} ${d.material??''} ${d.designId} ${d.label}`.toLowerCase().includes(search)))
  return <main className={styles.desk}>
    <header className={styles.header}><Link href="/admin" className={styles.brand} aria-label="IQ Card admin">iq</Link><div><h1>Print desk</h1><p>Exact saved artwork. Ready for your printer.</p></div><Link href="/admin">Admin dashboard</Link></header>
    <nav className={styles.views} aria-label="Print design sections">
      <Link href={`/admin/print${search?`?q=${encodeURIComponent(params.q??'')}`:''}`} aria-current={!linkedOnly?'page':undefined}>All designs <span>{designs.length}</span></Link>
      <Link href={`/admin/print?view=linked${search?`&q=${encodeURIComponent(params.q??'')}`:''}`} aria-current={linkedOnly?'page':undefined}>Account linked <span>{designs.filter(d=>d.accountLinked).length}</span></Link>
    </nav>
    <PrintImport frameClassName={styles.frame}/>
    <div className={styles.workspace}>
      <aside className={styles.queue}><h2>Choose a design</h2><form action="/admin/print">{linkedOnly?<input type="hidden" name="view" value="linked"/>:null}<label htmlFor="print-search">Find by name, email, material or design ID</label><div className={styles.search}><input id="print-search" name="q" defaultValue={params.q??''} placeholder="Search saved designs"/><button type="submit">Find</button></div></form>
        <p className={styles.count}>{filtered.length} saved designs shown · {linkedOnly?'account linked':'all accounts and unlinked designs'}</p>
        {failed?<p role="alert">Designs could not be loaded. Refresh this page to try again.</p>:!filtered.length?<p>No matching saved designs. Profiles without a saved physical-card design cannot be reconstructed automatically.</p>:<nav aria-label="Saved print designs">{filtered.map(d=><Link key={`${d.source}:${d.id}`} href={`/admin/print?source=${d.source}&id=${d.id}${linkedOnly?'&view=linked':''}${search?`&q=${encodeURIComponent(params.q??'')}`:''}`} className={`${styles.design} ${selected?.id===d.id&&selected.source===d.source?styles.selected:''}`} aria-current={selected?.id===d.id&&selected.source===d.source?'page':undefined}><strong>{d.name?.trim()||d.email}</strong>{d.name?.trim()?<span>{d.email}</span>:null}<span>{d.material?`${d.material} · `:''}{d.designId}</span><small>{d.label}</small></Link>)}</nav>}
      </aside>
      <section className={styles.preview} aria-label="Print preparation">{selected?<PrintFrame key={`${selected.source}:${selected.id}`} title={`Print artwork ${selected.designId}`} src={`/customize/print-engine.html?print=1&source=${selected.source}&id=${selected.id}`} className={styles.frame}/>:<div className={styles.empty}><div className={styles.blankCard}><span>iq</span><small>85.6 × 54 mm</small></div><h2>Your next card, precisely.</h2><p>Choose a saved design to inspect both sides and download a print pack with PNG, JPEG, PDF and a cutting contour.</p><p>Matte-laminated sticker production. Confirm a physical proof before printing a batch.</p></div>}</section>
    </div>
  </main>
}
