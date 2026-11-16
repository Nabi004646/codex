import {useLocale} from './LocaleProvider';
import {useEffect,useState,useRef} from 'react';
import {boundedFetch} from './network.mjs';
import {matchesPublicFilters} from '../server/catalog-overrides.mjs';
import ResourcePreview from './ResourcePreview';
export default function PublishedHighlights({params='',excludeIds=[]}:{params?:string;excludeIds?:string[]}){
 const {t:tr}=useLocale();
 const [data,setData]=useState<any>({resources:[],has_more:false}),[page,setPage]=useState(1),[busy,setBusy]=useState(false);
 const cursors=useRef(new Map<number,string>()),previous=useRef(params),skip=excludeIds.join(',');
 useEffect(()=>{
  if(previous.current!==params){previous.current=params;cursors.current.clear();if(page!==1){setPage(1);return;}}
  const controller=new AbortController(),query=new URLSearchParams(params);query.set('page',String(page));if(page>1){const cursor=cursors.current.get(page);if(!cursor){setPage(1);return;}query.set('cursor',cursor);}
  setBusy(true);setData({resources:[],has_more:false});
  boundedFetch('/api/live/resources?'+query,{signal:controller.signal,cache:'no-store'},{timeout:8000}).then(async response=>{if(!response.ok)throw Error('Unavailable');const value=await response.json();if(!controller.signal.aborted){if(value.next_cursor)cursors.current.set(page+1,JSON.stringify(value.next_cursor));setData({...value,resources:(value.resources||[]).filter((r:any)=>!excludeIds.includes(r.id)&&matchesPublicFilters(r,query))});}}).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
  return()=>controller.abort();
 },[params,page,skip]);
 // Published records supplement discovery results without changing discovery counts.
 if(!data.resources.length&&!data.has_more&&page===1)return null;
 return <section className="published-highlights" aria-busy={busy}><div className="section-heading"><h2>{tr('Published in the library')}</h2></div><p>{tr('Reviewed records from the editable library. These match your current filters.')}</p><div className="resource-grid">{data.resources.map((r:any)=><article className="resource-card" key={r.id}><a href={'/resource/'+r.id}><ResourcePreview resource={r}/><h3>{r.name}</h3></a><p className="resource-description" lang="en" dir="ltr">{r.description}</p><a className="original-link" href={r.url} target="_blank" rel="noopener noreferrer">{tr('Original source')} ↗</a></article>)}</div>{(data.has_more||page>1)&&<nav className="pagination" aria-label={tr('Published resource pages')}><button disabled={busy||page===1} onClick={()=>setPage(value=>value-1)}>{tr('Previous')}</button><span>{tr('Page')} {page}</span><button disabled={busy||!data.has_more} onClick={()=>setPage(value=>value+1)}>{tr('Next page')}</button></nav>}</section>;
}
