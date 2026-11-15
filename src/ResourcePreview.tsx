import {useEffect,useRef,useState} from 'react';
import {resourceImage} from './resource-images';
export default function ResourcePreview({resource:r,eager=false,caption=false}:any){
 const [failed,setFailed]=useState(false),ref=useRef<HTMLImageElement|null>(null),image=resourceImage(r);
 useEffect(()=>{setFailed(false);if(ref.current?.complete&&!ref.current.naturalWidth)setFailed(true);},[image.src]);
 const available=!!image.src&&!failed;
 return <><div className={'resource-preview publisher-preview preview-'+(available?image.kind:'unavailable')}>{available?<img ref={ref} src={image.src!} alt={image.alt} width={1000} height={560} loading={eager?'eager':'lazy'} decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<div className="source-preview-unavailable"><span>{r.subcategory||r.category}</span><strong>{r.name}</strong><small>Publisher image unavailable</small></div>}</div>{caption&&<figcaption>{available?image.label:'Publisher image unavailable'} · <a href={image.source} target="_blank" rel="noopener noreferrer">Image source ↗</a></figcaption>}</>;
}
