import {initial} from './preview.mjs';import {publicData,summaries} from './page-data.mjs';import {publishedSearch,publishedDetail,publishedMetadata,publicRows,publishedCard} from './published.mjs';
const staticUtility=new Set(['/downloads','/games/gta-6','/','/search','/collections','/toolkits','/compare','/guides','/kits','/finder','/blog','/about','/sources','/editorial-policy','/privacy','/cookies','/terms','/advertising','/contact','/submit','/authors/nabin-kunwar']);
export async function productionState(path,fetcher=fetch){
 const page=initial(path);page.production=true;page.result=null;page.localResource=null;page.localCount=0;page.articleCards=[];
 if(page.kind==='admin')return page;
 if(page.path.startsWith('/preview/')){page.kind='missing';page.status=404;return page;}
 const metadata=await publishedMetadata(page.path,fetcher);page.seo=metadata;
 if(metadata?.mapped_query&&!new URL(path,'https://atlas.invalid').searchParams.has('q')){page.params.q=metadata.mapped_query;page.query=metadata.mapped_query;}
 if(page.kind==='resource_lookup'){
  page.liveResource=await publishedDetail(page.path.split('/')[2],fetcher);
  if(!page.liveResource){page.kind='missing';page.status=404;}else{const p=new URLSearchParams({category:page.liveResource.category});page.related=(await publishedSearch(p,fetcher)).resources.filter(r=>r.id!==page.liveResource.id).slice(0,3);}return page;
 }
 if(page.kind==='missing')return page;
 const approved=await publicRows('seo_pages',{publication:'eq.published',index_intent:'eq.index',path:'like./blog/*',select:'path,title,description,last_meaningful_change',limit:'100'},fetcher);
 page.articleCards=summaries.filter(a=>approved.some(p=>p.path==='/blog/'+a.slug)).map(a=>{const p=approved.find(p=>p.path==='/blog/'+a.slug);return {...a,title:p.title,description:p.description};});
 if(page.kind==='public'){
  if(page.path.startsWith('/templates')){page.kind='missing';page.status=404;return page;}
  if(!staticUtility.has(page.path)&&!metadata){page.kind='missing';page.status=404;return page;}
  page.document=publicData(page.path,page.params);page.document.articleCards=page.articleCards;
  if(page.document.article)page.document.article={...page.document.article,state:'published',updated_at:metadata.last_meaningful_change};
  if(page.document.type==='compare'){
   const ids=[...new Set(String(page.params.ids||'').split(',').filter(v=>/^[A-Za-z0-9_-]{1,80}$/.test(v)))].slice(0,4);
   const rows=ids.length?await publicRows('resources',{publication:'eq.published',id:'in.('+ids.join(',')+')',select:'*',limit:'4'},fetcher):[];
   page.document.resources=rows.map(publishedCard);page.document.hasIds=ids.length>0;
  }else if(page.document.resources?.length){const names=page.document.resources.map(r=>'"'+r.name.replaceAll('"','\\"')+'"');const rows=await publicRows('resources',{publication:'eq.published',display_name:'in.('+names.join(',')+')',select:'*',limit:'24'},fetcher);page.document.resources=rows.map(publishedCard);}
  return page;
 }
 page.result=await publishedSearch(new URLSearchParams(page.params),fetcher);return page;
}
