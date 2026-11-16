const formats={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',csv:'text/csv; charset=utf-8'};
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
export function createReleaseHandler({base,secret,legacy='',publishable,packSha,unzip,fetcher=fetch,onError=()=>{}}){
 const privateBucket='fra-template-drafts',publicBucket='fra-public-templates',pack='review-packs/native-templates-20261116-v2.zip';
 const serviceHeaders={apikey:secret,...(secret.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+secret})};
 async function stored(bucket,path){const response=await fetcher(base+'/storage/v1/object/authenticated/'+bucket+'/'+path,{headers:serviceHeaders,redirect:'error',signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('A release source file could not be verified.');return new Uint8Array(await response.arrayBuffer());}
 return async req=>{
  const origin=req.headers.get('origin'),cors=['https://freeresourceatlas.com','https://www.freeresourceatlas.com','https://supabase.com'].includes(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS',Vary:'Origin'}:{};
  const reply=(data,status=200)=>Response.json(data,{status,headers:{...cors,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply({error:'Use POST.'},405);
  try{
   if(!base||!secret||!publishable||!/^[a-f0-9]{64}$/.test(packSha))return reply({error:'The approved release is not configured.'},503);
   const reader=req.body?.getReader();if(!reader)return reply({error:'Release request required.'},400);let size=0;const parts=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return reply({error:'Request too large.'},413);}parts.push(value);}
   const bytes=new Uint8Array(size);let pos=0;for(const part of parts){bytes.set(part,pos);pos+=part.length;}const data=JSON.parse(new TextDecoder().decode(bytes));
   const offset=data.offset??0,count=data.count??4;
   if(data.license!=='CC BY 4.0'||data.approved!==true||!Number.isInteger(offset)||offset<0||offset>99||!Number.isInteger(count)||count<1||count>4)return reply({error:'Use a bounded, explicitly approved original release request.'},400);
   const authorization=req.headers.get('authorization')||'',bearer=authorization.replace(/^Bearer\s+/i,''),apiKey=req.headers.get('apikey')||'';
   const maintenance=[secret,legacy].some(key=>key&&(key===bearer||key===apiKey));
   if(!maintenance){
    if(!bearer||!/^[a-f0-9]{64}$/.test(data.grant_hash||''))return reply({error:'Unlock the owner admin first.'},403);
    const access=await fetcher(base+'/rest/v1/rpc/atlas_admin_operations',{method:'POST',headers:{apikey:publishable,Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({p_action:'health',p_grant_hash:data.grant_hash,p_data:{}}),redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!access.ok||(await access.json()).project!=='jawldxxtolppeccxcihh')return reply({error:'Owner authenticator session required.'},403);
   }
   const packed=await stored(privateBucket,pack);if(packed.length>12000000||await digest(packed)!==packSha)throw Error('The approved release archive checksum does not match.');
   const zip=unzip(packed),manifest=JSON.parse(new TextDecoder().decode(zip['manifest.json']));
   if(!Array.isArray(manifest)||manifest.length!==100||manifest.reduce((n,t)=>n+t.files.length,0)!==240)throw Error('Original release inventory is incomplete.');
   const batch=manifest.slice(offset,offset+count),items=[];
   for(const t of batch){
    if(!/^fra_template_\d{3}$/.test(t.resource_id)||!/^[-a-z0-9]+$/.test(t.slug)||t.version!==2||t.license!=='CC BY 4.0')throw Error('Unexpected original release metadata.');
    const parent=await fetcher(base+'/rest/v1/resources?select=id,slug,resource_type,revision,canonical_url&id=eq.'+t.resource_id,{headers:serviceHeaders,redirect:'error',signal:AbortSignal.timeout(15000)});
    const r=parent.ok?(await parent.json())[0]:null;
    if(!r||r.slug!==t.slug||r.resource_type!=='template'||r.canonical_url!=='https://freeresourceatlas.com/templates/'+t.slug)throw Error('The original resource record changed. Review it before release.');
    for(const f of t.files){
     if(f.version!==2||!formats[f.format]||f.content_type!==formats[f.format]||!/^templates\/[a-z0-9-]+\/[a-z0-9-]+\/v2\/[a-z0-9-]+\.(pdf|docx|xlsx|csv)$/.test(f.object_path)||f.bytes>8388608||f.bytes<1||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('Unexpected release file.');
     const content=zip[f.object_path];if(!content||content.length!==f.bytes||await digest(content)!==f.sha256)throw Error('Release file checksum mismatch.');
     const upload=await fetcher(base+'/storage/v1/object/'+publicBucket+'/'+f.object_path,{method:'POST',headers:{...serviceHeaders,'Content-Type':f.content_type,'x-upsert':'false'},body:content,redirect:'error',signal:AbortSignal.timeout(25000)});
     if(!upload.ok){const result=await upload.json();if(upload.status!==409&&!['409','Duplicate'].includes(String(result.statusCode||result.error)))throw Error('Release upload could not be confirmed.');}
     const checked=await stored(publicBucket,f.object_path);if(checked.length!==f.bytes||await digest(checked)!==f.sha256)throw Error('Stored release bytes differ from the approved source.');
    }
    const published=await fetcher(base+'/rest/v1/rpc/atlas_publish_original_v2',{method:'POST',headers:{...serviceHeaders,'Content-Type':'application/json'},body:JSON.stringify({p_data:{resource_id:t.resource_id,expected_revision:r.revision,source_sha:packSha,license:'CC BY 4.0',files:t.files}}),redirect:'error',signal:AbortSignal.timeout(15000)});
    const result=await published.json();if(!published.ok||result.published!==true)throw Error('The saved revision could not be released. Existing source and files remain preserved.');items.push(result);
   }
   return reply({released:items.length,items,next_offset:offset+items.length,total:100,complete:offset+items.length===100,license:'CC BY 4.0',version:2});
  }catch(error){onError(error);return reply({error:'The release could not be confirmed. Check the stored archive, owner access and saved revision, then resume the same bounded batch.'},503);}
 };
}
