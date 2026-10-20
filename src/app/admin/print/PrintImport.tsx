'use client'
import { useState } from 'react'
import { PrintFrame } from './PrintFrame'
export function PrintImport({frameClassName}:{frameClassName:string}){
  const [proof,setProof]=useState<{id:string;designId:string}|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false)
  async function open(file:File|undefined){
    if(!file)return
    setBusy(true);setStatus('Checking the saved design…');setProof(null)
    try{
      if(file.size>2_000_000)throw new Error('Choose a saved design JSON file smaller than 2 MB.')
      const text=await file.text(),response=await fetch('/api/admin/print-design',{method:'POST',headers:{'Content-Type':'application/json'},body:text,credentials:'same-origin'})
      const record=await response.json()
      if(!response.ok)throw new Error(record.error||'This saved design could not be opened.')
      const previous=sessionStorage.getItem('iqcard.printImport.active')
      if(previous)sessionStorage.removeItem('iqcard.printImport.'+previous)
      sessionStorage.setItem('iqcard.printImport.'+record.id,JSON.stringify(record));sessionStorage.setItem('iqcard.printImport.active',record.id)
      setProof({id:record.id,designId:record.designId});setStatus('Private proof opened in this tab. Original account and order records are unchanged.')
    }catch(error){setStatus(error instanceof Error?error.message:'The saved design could not be opened.')}finally{setBusy(false)}
  }
  return <details style={{background:'#fff',color:'#20211e',borderBottom:'1px solid #deddd9',padding:'20px 28px'}}>
    <summary style={{cursor:'pointer',fontSize:14,fontWeight:600}}>Open a private saved design file</summary>
    <div style={{paddingTop:18}}><label htmlFor="print-import-file" style={{display:'block',fontSize:13,marginBottom:10}}>Saved physical-card design · JSON</label><input id="print-import-file" type="file" accept="application/json,.json" disabled={busy} onChange={event=>open(event.target.files?.[0])}/><p style={{fontSize:12,color:'#62625b'}}>Use this to inspect an exported customer snapshot while working in Preview. The file is validated and kept only in this tab; it does not create or change customer records.</p><p role="status" style={{fontSize:12}}>{status}</p>{proof?<PrintFrame key={proof.id} src={`/customize?print=1&source=import&id=${proof.id}`} title={`Imported print artwork ${proof.designId}`} className={frameClassName}/>:null}</div>
  </details>
}
