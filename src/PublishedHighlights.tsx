import {useLocale} from './LocaleProvider';
import {useEffect,useState} from 'react';
import {boundedFetch} from './network.mjs';
import ResourcePreview from './ResourcePreview';
export default function PublishedHighlights({query=''}:{query?:string}){const {t:tr,n,locale}=useLocale();
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{const controller=new AbortController();boundedFetch('/api/live/resources?'+new URLSearchParams({q:query}),{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('Unavailable');const value=await response.json();if(!controller.signal.aborted){setRows(value.resources||[]);}}).catch(()=>{});return()=>controller.abort();},[query]);
 // This optional section supplements the complete directory. Its independent
 // outage must not look like a failure of the search that has just succeeded.
 if(!rows.length)return null;
 return <section className="published-highlights"><div className="section-heading"><h2>{tr("Published in the library")}</h2></div><p>Recently published listings. Read each resource’s source notes and access conditions.</p><div className="resource-grid">{rows.slice(0,6).map(r=><article className="resource-card" key={r.id}><a href={'/resource/'+r.id}><ResourcePreview resource={r}/><h3>{r.name}</h3></a><p className="resource-description" lang="en" dir="ltr">{r.description}</p><a className="original-link" href={r.url} target="_blank" rel="noopener noreferrer">Original source ↗</a></article>)}</div></section>;
}
