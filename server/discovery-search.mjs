import manifest from '../data/discovery-runtime.json' with {type:'json'};
import {bucket,normalize,searchTerms,unpackPostings,isPublicLink} from './discovery-codec.mjs';
const cache=new Map(),MAX_CACHE=48;
async function asset(name,read){const path=manifest.root+'/'+name;if(cache.has(path)){const value=cache.get(path);cache.delete(path);cache.set(path,value);return value;}const value=await read(path);cache.set(path,value);while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);return value;}
const intersect=(a,b)=>{if(!a)return new Set(b);const set=new Set(b);return new Set([...a].filter(id=>set.has(id)));};
function distance(a,b){const row=Array.from({length:b.length+1},(_,n)=>n);for(let i=1;i<=a.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));previous=old;}}return row[b.length];}
function suggestions(query){const q=normalize(query);if(q.length>=3&&q.length<=70){const found=(manifest.editorial_names||[]).map(name=>({name,score:distance(q,normalize(name))})).filter(r=>r.score<=Math.max(2,Math.floor(q.length/4))).sort((a,b)=>a.score-b.score).slice(0,3).map(r=>r.name);if(found.length)return found;}return ['SEO','AI','automation','video editing'].filter(value=>value!==query).slice(0,3);}
export function inflateDiscovery(row){if(!Array.isArray(row))return row;const [id,name,url,category,subcategory,kind,sourceIndex,tags,facts]=row,source=manifest.sources[sourceIndex],snapshot=facts?.snapshot||source.snapshot;const description=facts?.summary||((subcategory||category)+' · '+(tags.slice(0,3).join(', ')||'Community collection')+'. Current access terms need checking.');return{id,name,url,category,subcategory,kind,tags,pricing:'Check terms',status:'discovery',discovery:true,source:isPublicLink(facts?.source_url)?facts.source_url:source.url,source_label:source.name,discovery_snapshot:snapshot||null,reported_license:facts?.license_reported||null,source_reference:facts?.reference||null,description,featured:false,free_details:{platforms:[],signup:'Unknown',limits:'Current availability, license and free-use limits have not been checked for this listing.',source_urls:[source.url]},editorial:{source_verified_at:null,review_type:'Community discovery listing; provider terms not checked',license:'Check provider terms'}};}

async function records(indices,read){const chunks=[...new Set(indices.map(n=>Math.floor(n/manifest.record_size)))],tables=await Promise.all(chunks.map(n=>asset('records-'+n+'.json',read)));const loaded=new Map(chunks.map((n,i)=>[n,tables[i]]));return indices.map(n=>inflateDiscovery(loaded.get(Math.floor(n/manifest.record_size))[n%manifest.record_size])).filter(Boolean);}
async function positions(ids,read){const unique=[...new Set(ids)].filter(id=>/^[A-Za-z0-9_-]{1,80}$/.test(id)).slice(0,500),groups=[...new Set(unique.map(id=>bucket(id,manifest.id_buckets)))],maps=await Promise.all(groups.map(n=>asset('ids-'+n+'.json',read))),lookup=Object.assign({},...maps);return [...new Set(unique.map(id=>lookup[id]).filter(Number.isInteger))];}
export async function discoveryByIds(ids,read){return records(await positions(ids,read),read);}
export async function queryDiscovery(params=new URLSearchParams(),read){
 const query=params.get('q')||'';if(query.length>160)throw Error('Use at most 160 search characters.');
 const requested=Number(params.get('page')||1);if(!Number.isInteger(requested)||requested<1||requested>10000)throw Error('The requested page is invalid.');
 const filters=await asset('filters.json',read),terms=searchTerms(query);let eligible=null;
 const apply=(name,value)=>{if(value)eligible=intersect(eligible,filters[name]?.[value]||[]);};
 for(const [name,key]of[['category','category'],['subcategory','subcategory'],['kind','kind'],['pricing','pricing'],['platform','platform'],['signup','signup'],['offline','offline'],['gpu','gpu']])apply(name,params.get(key));
 if(params.get('reviewed'))apply('reviewed','yes');
 if(['reels','video editing'].includes(terms.intent))apply('intent','video');
 if(terms.intent==='seo')apply('intent','seo');
 if(params.get('country'))eligible=new Set();
 if(params.get('mobile'))apply('mobile',params.get('mobile'));
 if(params.get('ram')){const n=Number(params.get('ram')),ram=params.get('workload')?filters.workload_ram[params.get('workload')]||{}:filters.ram;eligible=intersect(eligible,Object.entries(ram).filter(([value])=>Number(value)<=n).flatMap(([,ids])=>ids));}
 if(params.has('ids'))eligible=intersect(eligible,await positions(params.get('ids').split(','),read));
 const scores=new Map();
 if(terms.groups.length){
  const distinct=[...new Set(terms.groups.flat())],tables=await Promise.all([...new Set(distinct.map(t=>bucket(t)))].map(async n=>[n,await asset('terms-'+n+'.json',read)]));const maps=new Map(tables);
  for(const group of terms.groups){let matches=null;const groupScores=new Map();for(const term of group){const posting=unpackPostings(maps.get(bucket(term))?.[term]);matches=intersect(matches,posting.map(([id])=>id));for(const [id,score]of posting)groupScores.set(id,(groupScores.get(id)||0)+score);}for(const id of matches||[])if(!eligible||eligible.has(id))scores.set(id,Math.max(scores.get(id)||0,groupScores.get(id)||0));}
 }
 let indices=terms.groups.length?[...scores.keys()]:eligible?[...eligible]:Array.from({length:manifest.total},(_,i)=>i);
 const sort=params.get('sort')||'featured';if(!['featured','az','name','newest','recent'].includes(sort))throw Error('Choose an available sort order.');
 indices.sort((a,b)=>['az','name'].includes(sort)?filters.az[a]-filters.az[b]:['newest','recent'].includes(sort)?filters.newest[a]-filters.newest[b]:((scores.get(b)||0)+(query&&b<manifest.editorial_count?40:0))-((scores.get(a)||0)+(query&&a<manifest.editorial_count?40:0))||a-b);
 const total=indices.length,pages=Math.max(1,Math.ceil(total/24)),page=Math.min(requested,pages),selected=indices.slice((page-1)*24,page*24),rows=await records(selected,read);
 // Exact product names take precedence within the returned page.
 if(query&&sort==='featured'){const exact=normalize(query);rows.sort((a,b)=>Number(normalize(b.name)===exact)-Number(normalize(a.name)===exact));}
 return {resources:rows,total,totalCatalog:manifest.total,page,pages,categories:manifest.categories,suggestions:!total&&query?suggestions(query):[],offline:false,catalogMode:'discovery',catalogLabel:'discovered listings',relatedQuery:terms.related,discoveryVersion:manifest.version};
}
export {manifest as discoveryManifest};
