'use client'
import { useEffect, useRef, useState } from 'react'
export function PrintFrame({src,title,className}:{src:string;title:string;className:string}){
  const ref=useRef<HTMLIFrameElement>(null),[height,setHeight]=useState(1200)
  useEffect(()=>{
    function resize(event:MessageEvent){
      if(event.origin!==window.location.origin||event.source!==ref.current?.contentWindow||event.data?.type!=='iq-print-height')return
      const next=event.data.height
      if(typeof next==='number'&&Number.isFinite(next)&&next>=600&&next<=12000)setHeight(Math.ceil(next))
    }
    window.addEventListener('message',resize)
    return ()=>window.removeEventListener('message',resize)
  },[])
  return <iframe ref={ref} src={src} title={title} className={className} style={{height}} onLoad={()=>ref.current?.contentWindow?.postMessage({type:'iq-print-request-height'},window.location.origin)}/>
}
