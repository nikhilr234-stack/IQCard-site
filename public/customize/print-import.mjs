export const PRINT_IMPORT_KEY='iqcard.printImport.';
export async function loadPrintRecord(params,fetchRecord=fetch,storage){
  const source=params.get('source'),id=params.get('id');let record;
  if(source==='import'){
    let local;
    try{local=storage??window.sessionStorage;record=JSON.parse(local.getItem(PRINT_IMPORT_KEY+id)||'null');}catch{throw new Error('This browser cannot read the private tab proof. Reopen its saved design file with tab storage enabled.');}
    if(record?.importVersion!==1||record.id!==id||record.source!==source||!record.configuration||!record.revision)throw new Error('This private proof is no longer open in this tab. Reopen its saved design file in the Print desk.');
    // Revalidate both administrator access and complete artwork before displaying cached private data.
    const response=await fetchRecord('/api/admin/print-design',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({design_id:record.designId,design_payload:{schemaVersion:'1.0',configuration:record.configuration}})});
    const checked=await response.json();
    if(!response.ok){if(response.status===401||response.status===403){local.removeItem(PRINT_IMPORT_KEY+id);if(local.getItem(PRINT_IMPORT_KEY+'active')===id)local.removeItem(PRINT_IMPORT_KEY+'active');}throw new Error(checked.error||'Sign in as an administrator and reopen the saved design file.');}
    if(checked.revision!==record.revision||checked.designId!==record.designId)throw new Error('This private snapshot changed. Reopen the original saved design file.');
    record={...checked,id};
  }else{
    const response=await fetchRecord(`/api/admin/print-design?source=${encodeURIComponent(source||'')}&id=${encodeURIComponent(id||'')}`,{credentials:'same-origin',cache:'no-store'});
    record=await response.json();if(!response.ok)throw new Error(record.error||'This design could not be loaded.');
  }
  if(!record?.configuration||record.id!==id||record.source!==source||!record.revision)throw new Error('The returned design does not match your selection.');
  return record;
}
