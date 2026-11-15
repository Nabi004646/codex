import {gunzipSync} from 'node:zlib';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import {catalog} from '../server/catalog.mjs';
import taxonomy from '../data/taxonomy.json' with {type:'json'};
import {bucket,isPublicLink,normalize,words,packPostings} from '../server/discovery-codec.mjs';
const flag=process.argv.indexOf('--source'),source=flag>=0?process.argv[flag+1]:null;
let seed;
if(source){
 const legacy=JSON.parse(await fs.readFile(source,'utf8')),sourceDir=path.dirname(source),sourceManifest=JSON.parse(await fs.readFile(path.join(sourceDir,'sources.json'),'utf8'));
 const sources=[],sourceIds=new Map();
 function credit(value,url){const key=isPublicLink(value)?value:url;if(sourceIds.has(key))return sourceIds.get(key);const found=sourceManifest.find(s=>key.startsWith(s.url)),entry=found?{...found,url:key}:{name:isPublicLink(value)?new URL(value).hostname+new URL(value).pathname:'Provider website',url:key,license:'Check original source',changes:'Names, links and taxonomy indexed; imported descriptions omitted.'};const id=sources.length;sources.push(entry);sourceIds.set(key,id);return id;}
 seed={source_manifest:sourceManifest,sources,entries:legacy.map(r=>[r.id,r.name,r.url,r.category,r.subcategory||'',r.kind||'Website',credit(r.source,r.url),(r.tags||[]).filter(t=>typeof t==='string').slice(0,8)])};
}else seed=JSON.parse(gunzipSync(await fs.readFile('data/discovery-seed.json.gz')).toString('utf8'));
const expansion=JSON.parse(gunzipSync(await fs.readFile('data/apps-expansion.json.gz')).toString('utf8'));
const mediaOverrides=JSON.parse(gunzipSync(await fs.readFile('data/source-media-overrides.json.gz')).toString('utf8'));
const offset=seed.sources.length;seed.sources.push(...expansion.sources);seed.source_manifest.push(...expansion.sources);seed.entries.push(...expansion.entries.map(row=>[...row.slice(0,6),row[6]+offset,...row.slice(7)]));
const sourceManifest=seed.source_manifest,sources=seed.sources;
const withheld=new Set(['1cec592b992c467f','903160da268c9e99','2bc8e64c5b95f2cf','ec479dd90f380eb1','d1d5765fb8cea062','b4809c2d9592fe71']);
const canonical=value=>{const u=new URL(value);if(u.hostname==='github.com'){const parts=u.pathname.split('/').filter(Boolean);if(parts.length>=2){parts[0]=parts[0].toLowerCase();parts[1]=parts[1].replace(/\.git$/i,'').toLowerCase();u.pathname='/'+parts.join('/');}}return u.href;};
const rows=catalog.map(r=>({...r,source_label:'Editorial catalog',discovery:false})),urls=new Set(rows.map(r=>canonical(r.url))),positions=new Map(rows.map((r,index)=>[canonical(r.url),index])),aliases=[],ids=new Set(rows.map(r=>r.id));let invalid=seed.legacy_excluded?.invalid||0,held=seed.legacy_excluded?.shorteners||0,overlaps=0;
for(let raw of seed.entries){const [id,name,url,category,subcategory,kind,sourceIndex,tags]=raw;const media=mediaOverrides[url.replace(/\/$/,'').replace('https://www.','https://')];if(media)raw=[...raw.slice(0,8),{...raw[8],...media}];if(!isPublicLink(url)){invalid++;continue;}if(withheld.has(id)){held++;continue;}const key=canonical(url);if(urls.has(key)){overlaps++;aliases.push([id,positions.get(key)]);continue;}if(ids.has(id))throw Error('Duplicate resource ID: '+id);if(!sources[sourceIndex]||!taxonomy.some(t=>t.name===category&&t.subcategories.includes(subcategory)))throw Error('Unknown source or taxonomy for '+id);urls.add(key);positions.set(key,rows.length);ids.add(id);rows.push([id,name,key,category,subcategory,kind,sourceIndex,tags,...raw.slice(8)]);}
const version=crypto.createHash('sha256').update(JSON.stringify(rows)+JSON.stringify(sourceManifest)+await fs.readFile(new URL(import.meta.url),'utf8')+await fs.readFile('server/discovery-codec.mjs','utf8')+await fs.readFile('server/discovery-search.mjs','utf8')+await fs.readFile('scripts/prepare-discovery-snapshots.mjs','utf8')+await fs.readFile('server/search-language-aliases.mjs','utf8')+await fs.readFile('server/search-intents.mjs','utf8')+await fs.readFile('server/search-autocomplete.mjs','utf8')).digest('hex').slice(0,16),root='/catalog/'+version,folder='public'+root;await fs.rm('public/catalog',{recursive:true,force:true});await fs.mkdir(folder,{recursive:true});
const termMaps=Array.from({length:32},()=>new Map()),idMaps=Array.from({length:4},()=>({}));const filters={category:{},subcategory:{},kind:{},pricing:{},platform:{},signup:{},offline:{},gpu:{},mobile:{},ram:{},workload_ram:{},intent:{},reviewed:{},named:{},az:[],newest:[]};const push=(key,value,id)=>{if(value)(filters[key][value]??=[]).push(id);};
const descriptions=[];
for(let id=0;id<rows.length;id++){
 const raw=rows[id],r=Array.isArray(raw)?{id:raw[0],name:raw[1],url:raw[2],category:raw[3],subcategory:raw[4],kind:raw[5],tags:raw[7],pricing:'Check terms',free_details:{platforms:raw[8]?.platforms||[]},mobile_platforms:raw[8]?.mobile_platforms||[]}:raw;
 idMaps[bucket(r.id,4)][r.id]=id;
 for(const key of ['category','subcategory','kind','pricing'])push(key,r[key],id);
 for(const platform of r.free_details?.platforms||[])push('platform',platform,id);push('signup',r.free_details?.signup,id);push('offline',r.device_details?.offline,id);push('gpu',r.device_details?.dedicated_gpu,id);if(r.device_details?.minimum_ram_gb)push('ram',String(r.device_details.minimum_ram_gb),id);
 for(const [workload,gb]of Object.entries(r.device_details?.workload_ram_gb||{}))((filters.workload_ram[workload]??={})[gb]??=[]).push(id);
 for(const platform of r.mobile_platforms||[])push('mobile',platform,id);if(r.mobile_platforms?.includes('android')&&r.mobile_platforms.includes('ios'))push('mobile','both',id);
 if(r.editorial?.source_verified_at)push('reviewed','yes',id);
 if(!Array.isArray(raw))for(const value of [r.name,...r.search_aliases||[]])push('named',normalize(value),id);
 if(r.kind==='Game')push('intent','games',id);
 if(r.kind==='Mobile app'||r.kind==='Desktop software'||r.consumer&&r.kind!=='Game')push('intent','apps',id);
 if(r.kind==='Desktop software'||r.kind!=='Game'&&r.free_details?.platforms?.some(p=>['Windows','Linux','macOS'].includes(p)))push('intent','software',id);
 if(r.free_details?.platforms?.some(p=>['Windows','Linux','macOS'].includes(p)))push('intent','desktop',id);
 if(r.mobile_platforms?.length)push('intent','mobile',id);
 if(r.category==='Video & Film'||/reels|captions?|subtitles?|transcri|ffmpeg|shotcut|kdenlive|openshot|obs studio|video.{0,10}edit/i.test([r.name,r.subcategory,...r.tags||[]].join(' ')))push('intent','video',id);
 const purpose=[r.name,r.subcategory,...r.tags||[]].join(' ');
 if(r.category==='Marketing & SEO'||/\bseo\b|^seo|search engine optim|search console|pagespeed|page speed|sitemap|keyword research/i.test(purpose)||/lighthouse/i.test(r.name)&&/github\.com\/GoogleChrome\/lighthouse|chrome\.google\.com|chromewebstore\.google\.com/i.test(r.url))push('intent','seo',id);
 const weighted=new Map();const add=(value,score)=>{for(const word of words(value)){const last=Math.min(10,word.length);for(let n=Math.min(2,last);n<=last;n++){const term=word.slice(0,n);weighted.set(term,Math.max(weighted.get(term)||0,score+(n===word.length?4:0)));}}};
 add(r.name,12);for(const alias of r.search_aliases||[])add(alias,14);if(!Array.isArray(raw))add(r.description,1);for(const tag of r.tags||[])add(tag,5);add(r.category,2);add(r.subcategory,4);add(r.kind,1);for(const platform of r.free_details?.platforms||[])add(platform,2);if(r.name==='Actual'&&r.url.includes('actualbudget'))add('Actual Budget',12);
 for(const [term,score]of weighted){const b=termMaps[bucket(term)];if(!b.has(term))b.set(term,[]);b.get(term).push([id,score]);}
 descriptions.push({id,name:r.name,checked:r.editorial?.source_verified_at||''});
}
descriptions.sort((a,b)=>a.name.localeCompare(b.name,'en'));descriptions.forEach((r,n)=>filters.az[r.id]=n);
descriptions.sort((a,b)=>b.checked.localeCompare(a.checked)||a.id-b.id);descriptions.forEach((r,n)=>filters.newest[r.id]=n);
const files=[];async function write(name,value){const text=JSON.stringify(value),file=folder+'/'+name;await fs.writeFile(file,text);files.push({name,bytes:Buffer.byteLength(text),sha256:crypto.createHash('sha256').update(text).digest('hex')});}
for(const [id,index]of aliases)if(idMaps[bucket(id,4)][id]===undefined)idMaps[bucket(id,4)][id]=index;
for(let i=0;i<rows.length;i+=512)await write('records-'+Math.floor(i/512)+'.json',rows.slice(i,i+512));
for(let i=0;i<32;i++)await write('terms-'+i+'.json',Object.fromEntries([...termMaps[i]].map(([term,p])=>[term,packPostings(p)])));
for(let i=0;i<4;i++)await write('ids-'+i+'.json',idMaps[i]);
await write('filters.json',filters);
const categoryMembers=new Map(taxonomy.map(t=>[t.name,new Set(filters.category[t.name]||[])]));
const categories=taxonomy.map(t=>({name:t.name,count:categoryMembers.get(t.name).size,subcategories:t.subcategories.map(name=>({name,count:(filters.subcategory[name]||[]).filter(id=>categoryMembers.get(t.name).has(id)).length})).filter(s=>s.count>0)}));
const manifest={version,root,total:rows.length,record_size:512,id_buckets:4,editorial_count:catalog.length,editorial_names:catalog.map(r=>r.name),discovery_count:rows.length-catalog.length,source_checked:filters.reviewed.yes.length,source_manifest:sourceManifest,sources,categories,excluded:{invalid,shorteners:held},legacy_overlaps:overlaps,id_alias_count:aliases.length,files};
await fs.writeFile('data/discovery-manifest.json',JSON.stringify(manifest));
// A compact immediate shortlist; the UI also completes from live search results.
const suggestionEntries=[
 ...['games','mobile apps','software','video editing','SEO','AI','automation'].map(label=>({label,kind:'Topic',popular:true,curated:true})),
 ...catalog.map(r=>({label:r.name,kind:r.kind,pricing:r.pricing,curated:true,...(r.search_aliases?.length?{aliases:r.search_aliases}:{})})),
 ...categories.map(c=>({label:c.name,kind:'Category'}))
];
await fs.writeFile('data/search-suggestions.json',JSON.stringify(suggestionEntries));
await fs.mkdir('public/catalog-notices',{recursive:true});
console.log(JSON.stringify({version,total:rows.length,editorial:catalog.length,source_checked:manifest.source_checked,invalid,held,overlaps,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)},null,2));
