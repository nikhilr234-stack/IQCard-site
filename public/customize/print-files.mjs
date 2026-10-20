// Physical-size file generation. No scene, font or layout substitutions live here.
const enc = new TextEncoder();
const bytes = value => typeof value === 'string' ? enc.encode(value) : value;
function join(parts) { const out = new Uint8Array(parts.reduce((n,p) => n + p.length, 0)); let i=0; for(const p of parts){out.set(p,i);i+=p.length;} return out; }
export function crc32(data) { let crc=0xffffffff; for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0; }
export function printGeometry(settings = {}) {
  const s={ inset:0,bleed:3,safe:3,radius:3.18,dpi:600,...settings };
  for(const [key,min,max] of [['inset',0,2],['bleed',0,5],['safe',0,8],['radius',0,6],['dpi',300,600]]) {
    if(typeof s[key]!=='number'||!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw new Error(`Invalid ${key}.`);
  }
  if(![300,600].includes(s.dpi))throw new Error('Choose 300 or 600 DPI.');
  const trimWidth=Number((85.6-2*s.inset).toFixed(3)),trimHeight=Number((54-2*s.inset).toFixed(3));
  const artWidth=Number((trimWidth+2*s.bleed).toFixed(3)),artHeight=Number((trimHeight+2*s.bleed).toFixed(3));
  return {...s,trimWidth,trimHeight,artWidth,artHeight,pixelsWide:Math.round(artWidth/25.4*s.dpi),pixelsHigh:Math.round(artHeight/25.4*s.dpi)};
}
function u32(value,little=false){const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,value,little);return b;}
function pngChunk(type,data){const tagged=join([bytes(type),data]);return join([u32(data.length),tagged,u32(crc32(tagged))]);}
export async function withRasterDpi(blob,type,dpi) {
  if(![300,600].includes(dpi))throw new Error('Choose 300 or 600 DPI.');
  const input=new Uint8Array(await blob.arrayBuffer());
  if(type==='image/png'){
    if(input[0]!==137||input[1]!==80)throw new Error('Invalid PNG.');
    const chunks=[input.slice(0,8)];let at=8;
    while(at<input.length){const size=new DataView(input.buffer,input.byteOffset+at,4).getUint32(0),end=at+12+size;if(end>input.length)throw new Error('Invalid PNG chunk.');const kind=new TextDecoder().decode(input.slice(at+4,at+8));if(kind!=='pHYs')chunks.push(input.slice(at,end));if(kind==='IHDR'){const ppm=Math.round(dpi/0.0254);chunks.push(pngChunk('pHYs',join([u32(ppm),u32(ppm),new Uint8Array([1])])));}at=end;}
    return new Blob([join(chunks)],{type});
  }
  if(type==='image/jpeg'){
    if(input[0]!==255||input[1]!==216)throw new Error('Invalid JPEG.');
    if(input[2]===255&&input[3]===224&&String.fromCharCode(...input.slice(6,11))==='JFIF\0'){
      input[13]=1;new DataView(input.buffer).setUint16(14,dpi);new DataView(input.buffer).setUint16(16,dpi);return new Blob([input],{type});
    }
    const jfif=new Uint8Array([255,224,0,16,74,70,73,70,0,1,1,1,dpi>>>8,dpi&255,dpi>>>8,dpi&255,0,0]);
    return new Blob([input.slice(0,2),jfif,input.slice(2)],{type});
  }
  throw new Error('Unsupported raster format.');
}
const pt=mm=>(mm*72/25.4).toFixed(4);
// Each image is flattened RGB JPEG. Precise boxes carry dimensions; pixel rounding never changes mm.
export function createPrintPdf(images,g,press=true) {
  if(images.length!==2)throw new Error('Both front and back are required.');
  const margin=press?5:0,bleed=press?g.bleed:0,W=g.trimWidth+2*(margin+bleed),H=g.trimHeight+2*(margin+bleed),trim=margin+bleed;
  const objects=[null,bytes('<< /Type /Catalog /Pages 2 0 R >>'),bytes('<< /Type /Pages /Count 2 /Kids [3 0 R 6 0 R] >>')];
  for(let i=0;i<2;i++){
    const pageId=3+i*3,imId=pageId+1,streamId=pageId+2,image=images[i];
    const rect=(x,y,w,h)=>`[${pt(x)} ${pt(y)} ${pt(x+w)} ${pt(y+h)}]`;
    objects.push(bytes(`<< /Type /Page /Parent 2 0 R /MediaBox ${rect(0,0,W,H)} /TrimBox ${rect(trim,trim,g.trimWidth,g.trimHeight)} /BleedBox ${rect(margin,margin,W-2*margin,H-2*margin)} /Resources << /XObject << /Im ${imId} 0 R >> >> /Contents ${streamId} 0 R >>`));
    objects.push(join([bytes(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`),image.bytes,bytes('\nendstream')]));
    const artX=press?margin:-g.bleed,artY=press?margin:-g.bleed;
    let content=`q\n${pt(g.artWidth)} 0 0 ${pt(g.artHeight)} ${pt(artX)} ${pt(artY)} cm\n/Im Do\nQ\n`;
    if(press){content+='0 G 0.25 w\n';const x1=trim,x2=trim+g.trimWidth,y1=trim,y2=trim+g.trimHeight;
      for(const x of [x1,x2])for(const y of [y1,y2]){
        const left=x===x1,bottom=y===y1;
        content+=`${pt(left?.7:W-.7)} ${pt(y)} m ${pt(left?margin-1:W-margin+1)} ${pt(y)} l S\n`;
        content+=`${pt(x)} ${pt(bottom?.7:H-.7)} m ${pt(x)} ${pt(bottom?margin-1:H-margin+1)} l S\n`;
      }
    }
    const data=bytes(content);objects.push(join([bytes(`<< /Length ${data.length} >>\nstream\n`),data,bytes('endstream')]));
  }
  const parts=[bytes('%PDF-1.4\n% IQ Card print\n')],offsets=[0];let length=parts[0].length;
  for(let i=1;i<objects.length;i++){offsets.push(length);const object=join([bytes(`${i} 0 obj\n`),objects[i],bytes('\nendobj\n')]);parts.push(object);length+=object.length;}
  const xref=length;parts.push(bytes(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return join(parts);
}
export function cutContourSvg(g){return `<svg xmlns="http://www.w3.org/2000/svg" width="${g.trimWidth}mm" height="${g.trimHeight}mm" viewBox="0 0 ${g.trimWidth} ${g.trimHeight}"><title>IQ Card cutting contour — no scaling — radius requires physical approval</title><rect x="0" y="0" width="${g.trimWidth}" height="${g.trimHeight}" rx="${Math.max(0,g.radius-g.inset)}" fill="none" stroke="#ff00ff" stroke-width="0.01"/></svg>`;}
export function createStoredZip(files) {
  const local=[],central=[];let offset=0;
  for(const file of files){
    if(!/^[a-zA-Z0-9_.-]+$/.test(file.name)||file.name.includes('..'))throw new Error('Invalid archive filename.');
    const name=bytes(file.name),data=bytes(file.bytes),crc=crc32(data),header=new Uint8Array(30),view=new DataView(header.buffer);
    view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(12,33,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);
    local.push(header,name,data);
    const index=new Uint8Array(46),iv=new DataView(index.buffer);iv.setUint32(0,0x02014b50,true);iv.setUint16(4,20,true);iv.setUint16(6,20,true);iv.setUint16(14,33,true);iv.setUint32(16,crc,true);iv.setUint32(20,data.length,true);iv.setUint32(24,data.length,true);iv.setUint16(28,name.length,true);iv.setUint32(42,offset,true);central.push(index,name);offset+=header.length+name.length+data.length;
  }
  const directory=join(central),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,directory.length,true);ev.setUint32(16,offset,true);
  return join([...local,directory,end]);
}
export async function canvasRaster(canvas,type,dpi) {
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,1));if(!blob)throw new Error('Image export failed.');return withRasterDpi(blob,type,dpi);
}
export function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
