import config from '../config/backend.public.json' with {type:'json'};
import {officialUrl} from '../src/model.mjs';
const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'};
const reply=(value,status)=>Response.json(value,{status,headers});
export async function submissionResponse(request,{fetcher=fetch}={}){
 if(request.method!=='POST')return reply({error:'Use POST.'},405);
 const origin=new URL(request.url).origin;
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Submit this form from the website.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Use a JSON request.'},415);
 try{
  const reader=request.body?.getReader();if(!reader)return reply({error:'The form is empty.'},400);
  const chunks=[];let bytes=0;
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>49152){await reader.cancel();return reply({error:'The form is too large.'},413);}chunks.push(value);}
  const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
  let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer));}catch{return reply({error:'Check the form fields.'},400);}
  if(!data||typeof data!=='object'||Array.isArray(data)||typeof data.token!=='string'||!/^[a-f0-9]{64}$/.test(data.token))return reply({error:'Reload the form and try again.'},400);
  const withdraw=new URL(request.url).pathname==='/api/submissions/withdraw';
  const body={p_request_token:data.token};
  if(!withdraw){
   if(data.website||!['resource_suggestion','correction'].includes(data.kind)||typeof data.url!=='string'||data.url.length>4096||typeof data.summary!=='string'||typeof data.evidence!=='string')return reply({error:'Check the form fields.'},400);
   let url;try{url=officialUrl(data.url);}catch{return reply({error:'Use the official public HTTPS URL for this resource or page.'},400);}
   const summary=data.summary.trim(),evidence=data.evidence.trim();
   if(summary.length<10||summary.length>2000||evidence.length<10||evidence.length>4000)return reply({error:'Provide a summary and supporting evidence within the form limits.'},400);
   Object.assign(body,{p_kind:data.kind,p_url:url,p_summary:summary,p_evidence:evidence});
  }
  const upstream=await fetcher(config.url+'/rest/v1/rpc/'+(withdraw?'atlas_withdraw':'atlas_submit'),{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(upstream.status>=300&&upstream.status<400)return reply({error:'The review queue is temporarily unavailable. Please try again later.'},503);
  const value=await upstream.json();
  if(!upstream.ok){if(value.code==='54000')return reply({error:'The review queue is busy. Please try again later.'},429);if(['22023','23514','23502'].includes(value.code))return reply({error:'Check the URL, summary and evidence.'},400);return reply({error:'The review queue is temporarily unavailable. Your form has not been cleared; try again.'},503);}
  if(withdraw){if(typeof value.withdrawn!=='boolean')throw Error('Incomplete response');return reply({withdrawn:value.withdrawn},200);}
  if(value.received!==true||typeof value.id!=='string')throw Error('Incomplete response');
  return reply({received:true,id:value.id,state:value.state},201);
 }catch{return reply({error:'The request could not be confirmed. Keep this form open and try again.'},503);}
}
