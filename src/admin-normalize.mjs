import taxonomy from '../data/taxonomy.json' with {type:'json'};
import {officialUrl,validateMobile,storeLink} from './model.mjs';
export const categorySlug=s=>String(s).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const ADMIN_CATEGORIES=taxonomy.map(c=>({id:categorySlug(c.name),name:c.name}));
const categories=new Map(ADMIN_CATEGORIES.flatMap(c=>[[c.id,c.id],[categorySlug(c.name),c.id]]));
for(const [alias,id] of Object.entries({design:'design-and-ui','ai-tools':'ai-and-machine-learning',ai:'ai-and-machine-learning',automation:'automation-and-workflows','video-editing':'video-and-film','content-creation':'video-and-film','github-repositories':'developer-tools',github:'developer-tools',business:'business-and-operations',finance:'finance-and-budgeting',fitness:'fitness-and-wellbeing',learning:'courses-and-learning'}))categories.set(alias,id);
export async function digest(value){const bytes=typeof value==='string'?new TextEncoder().encode(value):value;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function normalizeOfficialUrl(raw){const value=String(raw||'').trim();if(value.length>4096)throw Error('Official URLs must be at most 4,096 characters.');const url=new URL(officialUrl(value)),fragment=value.indexOf('#');if(fragment>=0)url.hash=value.slice(fragment);if(url.hostname==='github.com'){const parts=url.pathname.split('/').filter(Boolean);if(parts.length>=2){parts[0]=parts[0].toLowerCase();parts[1]=parts[1].replace(/\.git$/i,'').toLowerCase();url.pathname='/'+parts.join('/');}}return url.pathname==='/'&&!url.search&&!url.hash?url.origin:url.toString();}
const text=(v,max)=>String(v??'').trim().slice(0,max);
const list=(v,max)=>[...new Set((Array.isArray(v)?v:typeof v==='string'?v.split(/[|,]/):[]).map(x=>text(x,80)).filter(Boolean))].slice(0,max);
function boolean(v){if(v===true||v==='true')return true;if(v===false||v==='false')return false;return null;}
const pricing=new Map([['free forever','free_forever'],['free_forever','free_forever'],['open source','open_source'],['open_source','open_source'],['freemium','freemium'],['free plan','freemium'],['free trial','trial'],['trial','trial'],['paid','paid'],['unknown','unknown']]);
export async function normalizeResource(value,{defaultCategory='developer-tools'}={}){
 const raw=typeof value==='string'?{url:value}:value;if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Expected a resource object.');
 const canonical=normalizeOfficialUrl(raw.canonical_url||raw.url||raw.official_url),url=new URL(canonical),hash=await digest(canonical);
 const name=text(raw.display_name||raw.name||raw.title||(url.hostname==='github.com'?url.pathname.split('/').filter(Boolean).slice(0,2).join(' / '):url.hostname),180);if(name.length<2)throw Error('Name must have at least two characters.');
 const category=categories.get(categorySlug(raw.category_id||raw.category||defaultCategory));if(!category)throw Error('Choose a valid category.');
 const type=raw.resource_type||(/github/i.test(raw.kind||'')||url.hostname==='github.com'?'github_repo':'website');if(!['website','github_repo','learning','asset','template','mobile_app'].includes(type))throw Error('Unsupported resource type.');
 const id=raw.id?String(raw.id):'r_'+hash.slice(0,24);if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw Error('Invalid resource ID.');
 let verified=raw.source_verified_at?new Date(raw.source_verified_at):null;if(verified&&(!Number.isFinite(verified.getTime())||verified.getTime()>Date.now()+300000))throw Error('Use an actual source-verification date.');
 const rawSources=Array.isArray(raw.source_urls)?raw.source_urls:typeof raw.source_urls==='string'?raw.source_urls.split('|'):[];
 const sourceUrls=[...new Set(rawSources.map(x=>String(x).trim()).filter(Boolean).slice(0,8).map(normalizeOfficialUrl))];if(!sourceUrls.length)sourceUrls.push(canonical);
 const row={id,slug:raw.slug&&/^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw.slug)&&raw.slug.length<=180?raw.slug:categorySlug(name).slice(0,100).replace(/-$/,'')+'-'+hash.slice(0,8),display_name:name,canonical_url:canonical,
  short_summary:text(raw.short_summary||raw.description||'Editorial review required before publication.',600),editorial_description:text(raw.editorial_description,16000),category_id:category,resource_type:type,
  pricing_model:pricing.get(String(raw.pricing_model||raw.pricing||'unknown').toLowerCase())||'unknown',signup_required:boolean(raw.signup_required),platforms:list(raw.platforms,8),tags:list(raw.tags,20),
  image_url:raw.image_url?normalizeOfficialUrl(raw.image_url):null,image_alt:text(raw.image_alt,240),media_rights:['original','official_permission','license_verified'].includes(raw.media_rights)?raw.media_rights:'unreviewed',
  mobile_platforms:list(raw.mobile_platforms,2).map(x=>x.toLowerCase()),mobile:raw.mobile||null,source_urls:sourceUrls,source_verified_at:verified?.toISOString()||null,
  license:text(raw.license,240),access_limits:text(raw.access_limits,4000),publication:'draft'};
 const sub=text(raw.subcategory,100);
 if(sub&&!taxonomy.find(t=>categorySlug(t.name)===category)?.subcategories.includes(sub))throw Error('Choose a subcategory within this category.');
 row.subcategory=sub;
 row.minimum_ram_gb=raw.minimum_ram_gb==null||raw.minimum_ram_gb===''?null:Number(raw.minimum_ram_gb);
 if(row.minimum_ram_gb!==null&&(!Number.isInteger(row.minimum_ram_gb)||row.minimum_ram_gb<1||row.minimum_ram_gb>1024))throw Error('Use a documented RAM requirement in GB.');
 row.workload_ram=raw.workload_ram||{};
 if(typeof row.workload_ram!=='object'||Array.isArray(row.workload_ram)||Object.keys(row.workload_ram).length>8||Object.entries(row.workload_ram).some(([k,v])=>k.length>40||!Number.isInteger(v)||v<1||v>1024))throw Error('Use bounded numerical workload memory requirements.');
 row.dedicated_gpu=['Yes','No','Optional','Unknown'].includes(raw.dedicated_gpu)?raw.dedicated_gpu:'Unknown';
 const rs=Array.isArray(raw.requirement_sources)?raw.requirement_sources:typeof raw.requirement_sources==='string'?raw.requirement_sources.split('|'):[];
 row.requirement_sources=[...new Set(rs.map(v=>String(v).trim()).filter(Boolean).slice(0,8).map(normalizeOfficialUrl))];
 row.offline_support=['yes','limited','no'].includes(raw.offline_support)?raw.offline_support:'unknown';
 if((row.minimum_ram_gb!==null||Object.keys(row.workload_ram).length||row.dedicated_gpu!=='Unknown')&&!row.requirement_sources.length)throw Error('Link the original source for hardware requirements.');
 if(row.short_summary.length<10)throw Error('Summary must contain at least ten characters.');
 if(type==='mobile_app'){const mobile={};for(const platform of row.mobile_platforms){const entry=row.mobile?.[platform]||{};let checked=entry.verified_at?new Date(entry.verified_at):null;if(checked&&(!Number.isFinite(checked.getTime())||checked.getTime()>Date.now()+300000))throw Error('Use an actual store-verification date.');mobile[platform]={url:storeLink(platform,entry.url).url,...(checked?{verified_at:checked.toISOString()}:{})};}row.mobile=mobile;}if(type!=='mobile_app'&&(row.mobile_platforms.length||row.mobile))throw Error('Storefront data requires mobile_app type.');validateMobile(row);return row;
}
export function importBatches(rows,start=0){const result=[];let batch=[],bytes=0,offset=start;for(let i=start;i<rows.length;i++){const size=new TextEncoder().encode(JSON.stringify(rows[i])).length+1;if(batch.length&&(batch.length>=100||bytes+size>550000)){result.push({offset,rows:batch});offset=i;batch=[];bytes=0;}batch.push(rows[i]);bytes+=size;}if(batch.length)result.push({offset,rows:batch});return result;}
