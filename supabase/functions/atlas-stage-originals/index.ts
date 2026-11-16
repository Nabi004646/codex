// Fixed, private original-template staging job. No arbitrary URLs, paths or code.
import {unzipSync} from 'npm:fflate@0.8.2';
const PACK_SHA='d98a3762a6d53897599a5fa37a9f8f9d9f468ee3590deb12cc90b678f98d11db';
const PACK='review-packs/native-templates-20261113.zip',BUCKET='fra-template-drafts';
const sha=async(b:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');
const envKey=(name:string)=>{try{return JSON.parse(Deno.env.get(name)||'{}').default||'';}catch{return '';}};
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin'),cors=origin&&['https://supabase.com','https://freeresourceatlas.com','https://www.freeresourceatlas.com'].includes(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}:{};
 const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{...cors,'Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 try{
  const base=(Deno.env.get('SUPABASE_URL')||'').replace(/\/$/,''),legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',secret=envKey('SUPABASE_SECRET_KEYS')||legacy,publishable=envKey('SUPABASE_PUBLISHABLE_KEYS')||Deno.env.get('SUPABASE_ANON_KEY')||'';
  if(!base||!secret||!publishable)return reply({error:'Staging service is not configured.'},503);
  const chunks:Uint8Array[]=[];let size=0;const reader=req.body?.getReader();if(!reader)return reply({error:'Request body required.'},400);
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return reply({error:'Request is too large.'},413);}chunks.push(value);}
  const body=new Uint8Array(size);let written=0;for(const chunk of chunks){body.set(chunk,written);written+=chunk.length;}const text=new TextDecoder().decode(body);
  const data=JSON.parse(text),offset=data.offset??0,count=data.count??20;
  if(!Number.isInteger(offset)||offset<0||offset>239||!Number.isInteger(count)||count<1||count>25)return reply({error:'Use a valid batch offset and count.'},400);
  const authorization=req.headers.get('authorization')||'',bearer=authorization.replace(/^Bearer\s+/i,''),apiKey=req.headers.get('apikey')||'';
  const service=[secret,legacy].some(key=>key&&(key===bearer||key===apiKey));
  if(!service){
   if(!bearer||typeof data.grant_hash!=='string'||!/^[a-f0-9]{64}$/.test(data.grant_hash))return reply({error:'Unlock the owner admin first.'},403);
   const access=await fetch(base+'/rest/v1/rpc/atlas_admin_operations',{method:'POST',headers:{apikey:publishable,Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({p_action:'health',p_grant_hash:data.grant_hash,p_data:{}}),redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!access.ok||(await access.json()).project!=='jawldxxtolppeccxcihh')return reply({error:'Owner authenticator session required.'},403);
  }
  const headers={apikey:secret,...(secret.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+secret})};
  const read=async(path:string)=>{const response=await fetch(base+'/storage/v1/object/authenticated/'+BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/'),{headers,redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('A private source file could not be read.');return new Uint8Array(await response.arrayBuffer());};
  const packed=await read(PACK);if(packed.length>10000000||await sha(packed)!==PACK_SHA)throw Error('The private review pack checksum does not match the approved staging source.');
  const zip=unzipSync(packed),manifest=JSON.parse(new TextDecoder().decode(zip['manifest.json']));
  if(!Array.isArray(manifest)||manifest.length!==100)throw Error('Unexpected source manifest.');
  const files=manifest.flatMap((t:any)=>t.files.map((f:any)=>({...f,resource_id:t.resource_id})));
  if(files.length!==240)throw Error('Unexpected native file inventory.');
  const batch=files.slice(offset,offset+count),ids=[...new Set(batch.map((f:any)=>f.resource_id))];
  const parents=await fetch(base+'/rest/v1/resources?select=id,publication,resource_type&id=in.('+ids.join(',')+')',{headers,redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!parents.ok)throw Error('Template resource drafts could not be confirmed.');
  const records=await parents.json();if(ids.some(id=>!records.some((r:any)=>r.id===id&&r.publication==='draft'&&r.resource_type==='template')))throw Error('Create the original template resource drafts before staging their files.');
  let added=0,existing=0;
  for(const f of batch){
   if(!/^templates\/[a-z0-9/-]+\.(docx|xlsx|pdf|csv)$/.test(f.object_path)||f.object_path.includes('..')||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('Unexpected file path.');
   const bytes=zip[f.object_path];if(!bytes||bytes.length!==f.bytes||await sha(bytes)!==f.sha256)throw Error('Original file checksum mismatch.');
   const response=await fetch(base+'/storage/v1/object/'+BUCKET+'/'+f.object_path.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{...headers,'Content-Type':f.content_type,'x-upsert':'false'},body:bytes,redirect:'error',signal:AbortSignal.timeout(20000)});
   if(!response.ok){const result=await response.json();if(response.status!==409&&!['409','Duplicate'].includes(String(result.statusCode||result.error)))throw Error('Private file upload failed.');existing++;}else added++;
   const stored=await read(f.object_path);if(stored.length!==f.bytes||await sha(stored)!==f.sha256)throw Error('Stored file checksum mismatch.');
   const registered=await fetch(base+'/rest/v1/resource_files',{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({resource_id:f.resource_id,bucket_id:BUCKET,object_key:f.object_path,format:f.format,version:f.version,bytes:f.bytes,sha256:f.sha256,publication:'draft',license_approved:false}),redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!registered.ok)throw Error('File metadata could not be registered.');
   const check=await fetch(base+'/rest/v1/resource_files?resource_id=eq.'+f.resource_id+'&format=eq.'+f.format+'&version=eq.'+f.version+'&select=bucket_id,object_key,bytes,sha256,publication,license_approved',{headers,redirect:'error',signal:AbortSignal.timeout(15000)});
   const saved=check.ok?(await check.json())[0]:null;
   if(!saved||saved.bucket_id!==BUCKET||saved.object_key!==f.object_path||Number(saved.bytes)!==f.bytes||saved.sha256!==f.sha256||saved.publication!=='draft'||saved.license_approved!==false)throw Error('Registered file metadata does not match the source.');
  }
  return reply({staged:batch.length,added,existing,next_offset:offset+batch.length,total:240,complete:offset+batch.length>=240,publication:'draft',license_approved:false});
 }catch(error){return reply({error:error instanceof Error?error.message:'Private staging could not finish. Retry the same batch to resume.'},503);}
});
