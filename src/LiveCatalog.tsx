import {useEffect,useRef,useState} from 'react';
import {Search} from 'lucide-react';
import {Mark} from './Icons';
import {ResourceCard} from './Library';
export default function LiveCatalog({initial}:any) {
 const [query,setQuery]=useState(initial?.query||''),[data,setData]=useState(initial),[loading,setLoading]=useState(false),[error,setError]=useState(initial?.error||'');
 const skipFirst=useRef(true),active=useRef<AbortController|null>(null);
 async function load(cursor?:any) {
  active.current?.abort();const controller=new AbortController();active.current=controller;setLoading(true);setError('');
  const params=new URLSearchParams({q:query});if(cursor)params.set('cursor',JSON.stringify(cursor));
  try {const response=await fetch('/api/live/resources?'+params,{signal:controller.signal,cache:'no-store'});const value=await response.json();if(!response.ok)throw Error('The catalog is temporarily unavailable. Your search has been kept.');if(!controller.signal.aborted)setData(value);}
  catch(e:any){if(!controller.signal.aborted)setError(e.message||'The catalog is temporarily unavailable.');}
  finally{if(!controller.signal.aborted)setLoading(false);}
 }
 useEffect(()=>{if(skipFirst.current){skipFirst.current=false;return;}active.current?.abort();const timer=setTimeout(()=>void load(),350);return()=>clearTimeout(timer);},[query]);
 useEffect(()=>()=>active.current?.abort(),[]);
 return <><header className="site-header"><a className="wordmark" href="/"><Mark/><span>FreeResourceAtlas</span></a><p>Live catalog review</p><nav className="top-navigation"><a href="/">Design preview</a><a href="/preview/seo">Indexing preview</a></nav></header><main className="atlas-control document"><p className="eyebrow">FREE-LIBRARY · READ-ONLY STAGING</p><h1>Free Resources</h1><p>This view reads published resources from the selected Free-library project. The design preview uses a separate editorial review catalog.</p><form className="main-search" role="search" onSubmit={e=>{e.preventDefault();void load();}}><Search size={22}/><input type="search" aria-label="Search live resources" placeholder="Search the live catalog…" value={query} maxLength={160} onChange={e=>setQuery(e.target.value)}/><button className="search-submit" type="submit">Search</button></form><p role="status" aria-live="polite">{loading?'Searching…':data?.connected?'Live catalog connected':'Catalog connection unavailable'}</p>{error&&<p role="alert">{error}</p>}{!error&&!loading&&data?.resources?.length===0&&<div className="empty-state"><h2>{query?'No published resources match this search.':'No resources have been published yet.'}</h2><p>Verified resources will appear here after review and publication.</p></div>}<div className="resource-grid" aria-busy={loading}>{!error&&data?.resources?.map((r:any)=><ResourceCard key={r.id} r={r} saved={false} onSave={()=>{}}/>)}</div>{data?.has_more&&!error&&<button className="primary-button" disabled={loading} onClick={()=>void load(data.next_cursor)}>Next results</button>}</main></>;
}
