import {LocaleProvider,LocaleSettings} from './LocaleProvider';
import {useState,useEffect,lazy,Suspense} from 'react';
import ResourceDetail from './ResourceDetail';
import PublicPages from './PublicPages';
import Library from './Library';
import SiteFooter from './SiteFooter';
import {CompareTray} from './ResourceActions';
import {observeSidebarPosition} from './sidebar-position.mjs';
const AdminPanel=lazy(()=>import('./AdminPanel'));
function AdminRoute(){
 const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 const fallback=<main className="admin-gate" aria-busy="true"><h1>Admin sign in</h1><p role="status">Loading secure sign-in…</p></main>;
 // renderToString cannot await a lazy component. Match the server shell on
 // hydration, then load the private UI after mount without aborting hydration.
 return mounted?<Suspense fallback={fallback}><AdminPanel/></Suspense>:fallback;
}
export default function App({page}:any){
 const [country,setCountry]=useState(page.params.country||'');
 const changeCountry=(value:string)=>{setCountry(value);try{localStorage.setItem('atlas-country',value);}catch{}};
 useEffect(()=>{try{if(!Object.hasOwn(page.params,'country')){const saved=localStorage.getItem('atlas-country');if(saved!==null&&['','US','GB','CA','AU'].includes(saved))setCountry(saved);}}catch{}},[]);
 useEffect(()=>observeSidebarPosition(window,document),[country,page.path]);
 let content;
 if(page.kind==='admin')content=<AdminRoute/>;
 else if(page.liveResource)content=<ResourceDetail resource={page.liveResource} related={page.related}/>;
 else if(page.document)content=<PublicPages doc={page.document}/>;
 else if(page.kind==='missing'||page.kind==='pending')content=<><main className="atlas-control document" lang="en" dir="ltr"><a href="/">← Back to directory</a><h1>{page.kind==='missing'?'Page not found':'This resource is temporarily unavailable'}</h1><p>{page.kind==='missing'?'This address is not available. Browse the library or choose a guide to continue.':'The catalog could not answer this request. Retry later; no unpublished resource has been substituted.'}</p><a href="/guides">Explore practical guides →</a></main><SiteFooter/></>;
 else content=<><Library initial={page.result} initialFilters={page.params} articles={page.articleCards} country={country} onCountryChange={changeCountry}/>{page.topic&&<section className="topic-editorial atlas-control"><h2>A useful starting point for this topic</h2><p>{page.topic.intro}</p><a href={'/blog/'+page.topic.guide}>Read the practical workflow →</a><p>These are local editorial review entries. Read each listing’s source-check state and limits before using it. A suggested workflow is not a tested compatibility guarantee.</p></section>}</>;
 if(page.kind==='admin')return content;
 return <LocaleProvider initialLocale={page.uiLocale||'en'} countryHint={page.countryHint||''}>{page.kind!=='admin'&&<LocaleSettings country={country} showCountry={false} setCountry={changeCountry}/>}{content}{page.kind!=='admin'&&<CompareTray/>}</LocaleProvider>;
}
