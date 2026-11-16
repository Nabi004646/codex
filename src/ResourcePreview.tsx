import {useEffect,useMemo,useRef,useState} from 'react';
import {resourceImage,resourceImageCandidates} from './resource-images';
export default function ResourcePreview({resource:r,eager=false,caption=false}:any){
 const candidates=useMemo(()=>resourceImageCandidates(r),[r.id,r.url,r.image_url,r.name,r.status]),key=r.id+'|'+r.url+'|'+r.image_url+'|'+r.status;
 const [attempt,setAttempt]=useState(0),[loaded,setLoaded]=useState(false),[near,setNear]=useState(eager),ref=useRef<HTMLImageElement|null>(null),box=useRef<HTMLDivElement|null>(null),image=candidates[attempt];
 useEffect(()=>{setAttempt(0);setLoaded(false);},[key]);
 useEffect(()=>{if(eager||!('IntersectionObserver' in window)){setNear(true);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setNear(true);observer.disconnect();}},{rootMargin:'350px'});if(box.current)observer.observe(box.current);return()=>observer.disconnect();},[key,eager]);
 useEffect(()=>{setLoaded(false);},[image?.src]);
 useEffect(()=>{if(!image||!near||loaded)return;if(ref.current?.complete&&ref.current.naturalWidth){setLoaded(true);return;}if(ref.current?.complete&&ref.current.currentSrc&&!ref.current.naturalWidth){setAttempt(i=>i===attempt?i+1:i);return;}const timer=setTimeout(()=>setAttempt(i=>i===attempt?i+1:i),5000);return()=>clearTimeout(timer);},[image?.src,near,loaded]);
 const original=resourceImage(r),advance=()=>{setLoaded(false);setAttempt(i=>i===attempt?i+1:i);},emblem=image&&['logo','icon'].includes(image.kind);
 let host='';try{host=new URL(r.url).hostname.replace(/^www\./,'');}catch{}
 const picture=image&&<img key={image.src} ref={ref} src={image.src} srcSet={image.srcSet} sizes={emblem?'72px':'(max-width:700px) 100vw, (max-width:1100px) 50vw, 33vw'} alt={image.alt} width={emblem?72:1000} height={emblem?72:560} loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'low'} decoding="async" referrerPolicy="no-referrer" onLoad={()=>setLoaded(true)} onError={advance}/>;
 return <><div ref={box} className={'resource-preview publisher-preview preview-'+(image?image.kind:'unavailable')+(image&&!loaded?' preview-loading':'')}>{image?<>{emblem?<div className="publisher-identity-preview">{picture}<div><span>{r.subcategory||r.category}</span><strong>{r.name}</strong><small>{host}</small></div></div>:picture}{!loaded&&<span className="preview-loading-label" aria-hidden="true">Loading preview…</span>}</>:<div className="source-preview-unavailable"><span>{r.subcategory||r.category||r.kind}</span><strong>{r.name}</strong><small>{(original as any).notice||host}</small></div>}</div>{caption&&<figcaption>{image?image.label:'Resource name preview'} · <a href={original.source} target="_blank" rel="noopener noreferrer">Source ↗</a></figcaption>}</>;
}
