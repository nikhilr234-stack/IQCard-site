// Fingerprints identify archived artwork, not customer approval or physical print colour.
export async function sha256Bytes(bytes,subtle=globalThis.crypto?.subtle){
  if(!subtle)throw new Error('Artwork verification needs a secure HTTPS connection.');
  const digest=await subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
}
export async function verifyBytes(bytes,expected,subtle=globalThis.crypto?.subtle){
  const actual=await sha256Bytes(bytes,subtle);
  if(!/^[a-f0-9]{64}$/.test(expected)||actual!==expected)throw new Error('The material texture changed or is corrupted. Export is blocked. Reload the approved source.');
  return actual;
}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
export async function createIntegrityManifest(files,context,subtle=globalThis.crypto?.subtle){
  const entries={};
  for(const file of [...files].sort((a,b)=>a.name.localeCompare(b.name))){
    if(!/^[a-zA-Z0-9_.-]+$/.test(file.name)||file.name.includes('..')||entries[file.name])throw new Error('Invalid or duplicate print filename.');
    entries[file.name]={bytes:file.bytes.byteLength,sha256:await sha256Bytes(file.bytes,subtle)};
  }
  const payload=canonical({schemaVersion:1,algorithm:'SHA-256',context,files:entries});
  return {...payload,fingerprint:await sha256Bytes(new TextEncoder().encode(JSON.stringify(payload)),subtle)};
}
