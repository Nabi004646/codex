import {useLocale} from './LocaleProvider';
import {useEffect,useState,useRef} from 'react';
import {boundedFetch} from './network.mjs';
import {matchesPublicFilters} from '../server/catalog-overrides.mjs';
import {isTemplateResource,publishedCardHref,shouldShowPublishedMatches} from './browse-presentation.mjs';
import ResourcePreview from './ResourcePreview';
export default function PublishedHighlights({params='',excludeIds=[]}:{params?:string;excludeIds?:string[]}){
 const {t:tr}=useLocale();
 const [data,setData]=useState<any>({resources:[],has_more:false}),[page,setPage]=useState(1),[busy,setBusy]=useState(false);
 const cursors=useRef(new Map<number,string>()),previous=useRef(params),skip=excludeIds.join(','),enabled=shouldShowPublishedMatches(params);
 useEffect(()=>{
  if(!enabled){setData({resources:[],has_more:false});return;}
  if(previous.current!==params){previous.current=params;cursors.current.clear();if(page!==1){setPage(1);return;}}
  const controller=new AbortController(),query=new URLSearchParams(params);query.set('page',String(page));if(page>1){const cursor=cursors.current.get(page);if(!cursor){setPage(1);return;}query.set('cursor',cursor);}
  setBusy(true);setData({resources:[],has_more:false});
  boundedFetch('/api/live/resources?'+query,{signal:controller.signal,cache:'no-store'},{timeout:8000}).then(async response=>{if(!response.ok)throw Error('Unavailable');const value=await response.json();if(!controller.signal.aborted){if(value.next_cursor)cursors.current.set(page+1,JSON.stringify(value.next_cursor));setData({...value,resources:(value.resources||[]).filter((r:any)=>!excludeIds.includes(r.id)&&matchesPublicFilters(r,query))});}}).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
  return()=>controller.abort();
 },[params,page,skip,enabled]);
 if(!enabled||!data.resources.length&&!data.has_more&&page===1)return null;
 const templates=data.resources.length>0&&data.resources.every(isTemplateResource),rows=templates?data.resources.slice(0,4):data.resources,templateHref='/templates?'+new URLSearchParams({q:new URLSearchParams(params).get('q')||''});
 return <section className="published-highlights" aria-busy={busy}><div className="section-heading"><h2>{templates?'Matching templates':tr('Published in the library')}</h2>{templates&&<a href={templateHref}>Browse matching templates →</a>}</div><div className="published-match-grid">{rows.map((r:any)=><article className="published-match-card" key={r.id}><a className="published-match-preview" href={publishedCardHref(r)} aria-label={'Open '+r.name}><ResourcePreview resource={r}/></a><div className="published-match-copy"><span className="published-match-kind">{isTemplateResource(r)?'Original template':r.kind}</span><h3><a href={publishedCardHref(r)}>{r.name}</a></h3><p lang="en" dir="ltr">{r.description}</p><a className="published-match-action" href={publishedCardHref(r)}>{isTemplateResource(r)?'Open template':'View resource'} →</a></div></article>)}</div>{!templates&&(data.has_more||page>1)&&<nav className="pagination" aria-label={tr('Published resource pages')}><button disabled={busy||page===1} onClick={()=>setPage(value=>value-1)}>{tr('Previous')}</button><span>{tr('Page')} {page}</span><button disabled={busy||!data.has_more} onClick={()=>setPage(value=>value+1)}>{tr('Next page')}</button></nav>}</section>;
}
