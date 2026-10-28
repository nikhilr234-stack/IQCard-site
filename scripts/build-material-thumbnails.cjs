// Encode small display-only previews; full versioned maps remain the rendering/print source.
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
(async()=>{
 const repo=path.resolve(__dirname,'..'),root=path.join(repo,'public/customize/surfaces/v2'),out=path.join(root,'thumbs');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.PRINT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PRINT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{const page=await browser.newPage();for(const file of fs.readdirSync(root).filter(name=>name.endsWith('.webp'))){const src='data:image/webp;base64,'+fs.readFileSync(path.join(root,file)).toString('base64');const encoded=await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=320;c.height=202;c.getContext('2d').drawImage(img,0,0,320,202);return c.toDataURL('image/webp',.9).split(',')[1];},src);fs.writeFileSync(path.join(out,file),Buffer.from(encoded,'base64'));}console.log('Encoded 12 small display previews.');}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
