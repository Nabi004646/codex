import release from '../data/template-release-v2.json' with {type:'json'};
import config from '../config/backend.public.json' with {type:'json'};
import {publicRows} from './published.mjs';
const sources=new Map(release.map(t=>[t.id,t]));
const closed={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff'};
const unavailable=(status=404)=>Response.json({error:status===404?'This template file is not currently published.':'This download could not be verified. Try again.'},{status,headers:closed});
const matching=(actual,expected)=>actual&&actual.bucket_id==='fra-public-templates'&&actual.publication==='published'&&actual.license_approved===true&&actual.object_key===expected.object_path&&actual.version===2&&actual.sha256===expected.sha256&&Number(actual.bytes)===expected.bytes;
export async function nativeTemplateDocument(document,fetcher=fetch){
 if(document.quick)return document;
 const selected=document.template?[sources.get(document.template.id)].filter(Boolean):release;
 const ids='in.('+selected.map(t=>t.resource_id).join(',')+')';
 const [records,files]=await Promise.all([
  publicRows('resources',{id:ids,publication:'eq.published',resource_type:'eq.template',select:'id,display_name,short_summary,editorial_description,license,access_limits,revision,updated_at',limit:'100'},fetcher),
  publicRows('resource_files',{resource_id:ids,bucket_id:'eq.fra-public-templates',publication:'eq.published',license_approved:'eq.true',version:'eq.2',select:'resource_id,bucket_id,object_key,format,version,bytes,sha256,publication,license_approved',limit:'300'},fetcher),
 ]);
 if(!Array.isArray(records)||!Array.isArray(files))throw Error('Native template publication could not be checked.');
 const approved=new Map(selected.map(t=>{
  const r=records.find(r=>r.id===t.resource_id);
  const published=!!r&&r.license==='CC BY 4.0'&&t.files.every(f=>matching(files.find(x=>x.resource_id===t.resource_id&&x.format===f.format),f));
  return [t.id,{...t,published,...(published?{title:r.display_name,purpose:r.short_summary,description:r.editorial_description,license:r.license,access_limits:r.access_limits,revision:r.revision,updated_at:r.updated_at}:{}),files:t.files.map(f=>({...f,download_url:published?'/api/template-download?'+new URLSearchParams({id:String(t.id),format:f.format}):null}))}];
 }));
 if(document.template){const template=approved.get(document.template.id);return {...document,template,downloadsAvailable:template?.published===true};}
 return {...document,listing:{...document.listing,publishedCount:[...approved.values()].filter(t=>t.published).length,items:document.listing.items.map(t=>({...t,...approved.get(t.id)}))}};
}
export async function nativeTemplateApprovals(fetcher=fetch){
 const [{listing},pages]=await Promise.all([
  nativeTemplateDocument({listing:{items:release}},fetcher),
  publicRows('seo_pages',{path:'like./templates/*',publication:'eq.published',index_intent:'eq.index',http_status:'eq.200',locale:'eq.en',select:'resource_id,path,title,description,canonical_url,last_meaningful_change,locale,publication,index_intent',limit:'100'},fetcher),
 ]);
 const available=new Set(listing.items.filter(t=>t.published).map(t=>t.resource_id));
 return pages.filter(p=>available.has(p.resource_id)&&release.some(t=>t.resource_id===p.resource_id&&p.path==='/templates/'+t.slug&&p.canonical_url==='https://freeresourceatlas.com'+p.path));
}
export async function nativeTemplateDownload(request,{fetcher=fetch}={}){
 const url=new URL(request.url),id=url.searchParams.get('id')||'',format=url.searchParams.get('format')||'';
 if(!/^\d{1,3}$/.test(id)||!['pdf','docx','xlsx','csv'].includes(format))return unavailable();
 const t=sources.get(Number(id)),expected=t?.files.find(f=>f.format===format);if(!expected)return unavailable();
 try{
  const rows=await publicRows('resource_files',{resource_id:'eq.'+t.resource_id,format:'eq.'+format,version:'eq.2',publication:'eq.published',license_approved:'eq.true',bucket_id:'eq.fra-public-templates',select:'bucket_id,object_key,format,version,bytes,sha256,publication,license_approved',limit:'1'},fetcher);
  if(!matching(rows[0],expected))return unavailable();
  const headers={...closed,'Content-Type':expected.content_type,'Content-Disposition':'attachment; filename="'+t.slug+'.'+format+'"','Content-Length':String(expected.bytes),'ETag':'"'+expected.sha256+'"'};
  if(request.method==='HEAD')return new Response(null,{headers});
  const response=await fetcher(config.url+'/storage/v1/object/authenticated/fra-public-templates/'+expected.object_path,{headers:{apikey:config.publishableKey},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok)return unavailable([400,401,403,404].includes(response.status)?404:503);
  const reader=response.body?.getReader();if(!reader)return unavailable(503);const parts=[];let count=0;
  while(true){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>expected.bytes){await reader.cancel();return unavailable(503);}parts.push(value);}
  if(count!==expected.bytes)return unavailable(503);
  const bytes=new Uint8Array(count);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  if(digest!==expected.sha256)return unavailable(503);
  return new Response(bytes,{headers});
 }catch{return unavailable(503);}
}
