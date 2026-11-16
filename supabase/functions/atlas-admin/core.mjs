import {normalizeResource,digest} from '../../../src/admin-normalize.mjs';
import {answerDigest,passwordFields} from './password.mjs';
export class ApiError extends Error{constructor(status,message,code='REQUEST_FAILED'){super(message);this.status=status;this.code=code;}}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function tokenClaims(token,projectUrl){try{const p=token.split('.')[1];const claims=JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));if(!UUID.test(claims.sub)||!UUID.test(claims.session_id)||claims.iss!==projectUrl+'/auth/v1'||!Number.isFinite(claims.exp)||claims.exp<=Date.now()/1000)throw Error();return claims;}catch{throw new ApiError(401,'Sign in again.','AUTH_REQUIRED');}}
async function readJson(req){if(Number(req.headers.get('content-length')||0)>900000)throw new ApiError(413,'Use smaller import batches.');const reader=req.body?.getReader();if(!reader)return {};let size=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>900000){await reader.cancel();throw new ApiError(413,'Use smaller import batches.');}chunks.push(value);}const buffer=new Uint8Array(size);let i=0;for(const c of chunks){buffer.set(c,i);i+=c.length;}try{return JSON.parse(new TextDecoder().decode(buffer));}catch{throw new ApiError(400,'Use a valid JSON request.');}}
const opaque=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
export function createAdminHandler({projectUrl,serviceKey,publishableKey,allowedOrigins,fetcher=fetch}){
 const origins=new Set(allowedOrigins),serviceHeaders={apikey:serviceKey,'Content-Type':'application/json',...(serviceKey?.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+serviceKey})};
 async function rpc(action,actor,provider,grant,data={}){const res=await fetcher(projectUrl+'/rest/v1/rpc/admin_execute',{method:'POST',headers:serviceHeaders,body:JSON.stringify({p_action:action,p_actor:actor,p_provider:provider,p_grant_hash:grant||null,p_data:data}),signal:AbortSignal.timeout(15000)});const result=await res.json();if(!res.ok){if(result.code==='42501')throw new ApiError(403,'Security check required. Sign in again.','AUTH_CHECK_REQUIRED');if(result.code==='40001')throw new ApiError(409,'This content changed. Refresh before retrying.','CONFLICT');if(result.code==='54000'&&result.message?.startsWith('Capacity checkpoint'))throw new ApiError(409,'This staging catalog needs a capacity review before more resources can be imported.','CAPACITY_CHECKPOINT');if(result.code==='54000')throw new ApiError(429,'Wait before requesting another challenge.','RATE_LIMITED');if(['23505','23514','22023','22P02'].includes(result.code))throw new ApiError(422,'Check the resource fields or saved import progress.','VALIDATION');throw new ApiError(500,'The operation could not be completed.');}return result;}
 async function auth(token,path,body){const response=await fetcher(projectUrl+'/auth/v1/'+path,{method:body?'POST':'GET',headers:{apikey:publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});const data=await response.json();if(!response.ok)throw new ApiError(path.endsWith('/verify')?422:401,path.endsWith('/verify')?'The authenticator code was not accepted.':'Sign in again.',path.endsWith('/verify')?'INVALID_CODE':'AUTH_REQUIRED');return data;}
 return async function handle(req){const origin=req.headers.get('Origin'),cors=origin&&origins.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS',Vary:'Origin'}:{};
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  try{if(origin&&!origins.has(origin))throw new ApiError(403,'Origin is not allowed.');if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return reply({error:'Use POST.'},405);if(!projectUrl||!serviceKey||!publishableKey)throw new ApiError(503,'Admin service is not configured.');
   const data=await readJson(req),token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'')||(data.action==='revoke'?data.authorization:'');if(typeof token!=='string'||token.length>16000||!token.includes('.'))throw new ApiError(401,'Sign in first.','AUTH_REQUIRED');
   const claims=tokenClaims(token,projectUrl),user=await auth(token,'user');if(user.id!==claims.sub)throw new ApiError(401,'Sign in again.','AUTH_REQUIRED');
   const actor=user.id,provider=claims.session_id;const grant=typeof data.grant==='string'&&/^[a-f0-9]{64}$/.test(data.grant)?await digest(data.grant):null;
   if(data.action==='owner')return reply(await rpc('owner',actor,provider,null));
   if(data.action==='challenge'){
    if(!UUID.test(data.factor_id||''))throw new ApiError(422,'Choose your authenticator.');
    await rpc('owner',actor,provider,null);const response=await auth(token,'factors/'+data.factor_id+'/challenge',{factorId:data.factor_id}),nonce=opaque();
    const expiry=typeof response.expires_at==='number'?new Date(response.expires_at*1000).toISOString():response.expires_at;
    await rpc('challenge_start',actor,provider,null,{factor_id:data.factor_id,challenge_id:response.id,nonce_hash:await digest(nonce),expires_at:expiry});return reply({nonce});
   }
   if(data.action==='verify'){
    if(!/^[a-f0-9]{64}$/.test(data.nonce||'')||!/^\d{6}$/.test(data.code||''))throw new ApiError(422,'Enter a six-digit authenticator code.');
    const nonceHash=await digest(data.nonce),challenge=await rpc('challenge_get',actor,provider,null,{nonce_hash:nonceHash});
    const verified=await auth(token,'factors/'+challenge.factor_id+'/verify',{challenge_id:challenge.challenge_id,code:data.code}),confirmed=tokenClaims(verified.access_token,projectUrl),checkedUser=await auth(verified.access_token,'user');
    if(confirmed.aal!=='aal2'||confirmed.sub!==actor||checkedUser.id!==actor||confirmed.session_id!==provider||!confirmed.amr?.some(x=>x.method==='totp'&&x.timestamp>=Date.now()/1000-120))throw new ApiError(403,'A fresh authenticator verification is required.');
    const plainGrant=opaque(),session=await rpc('challenge_consume',actor,provider,null,{nonce_hash:nonceHash,grant_hash:await digest(plainGrant)});
    return reply({grant:plainGrant,...session,session:{access_token:verified.access_token,refresh_token:verified.refresh_token}});
   }
   if(data.action==='revoke')return reply(await rpc('revoke',actor,provider,grant));
   if(claims.aal!=='aal2'||!grant)throw new ApiError(403,'Authenticator verification is required.','AUTH_CHECK_REQUIRED');
   const payload=data.payload||{};
   if(['seo_list','seo_save','seo_approve','seo_retire','redirect_list','redirect_save','audit_list','seo_health'].includes(data.action)){
    const response=await fetcher(projectUrl+'/rest/v1/rpc/admin_editorial_execute',{method:'POST',headers:serviceHeaders,body:JSON.stringify({p_action:data.action,p_actor:actor,p_provider:provider,p_grant_hash:grant,p_data:payload}),signal:AbortSignal.timeout(15000),redirect:'error'});
    const value=await response.json();
    if(!response.ok){if(value.code==='42501')throw new ApiError(403,'Verify your security check again.','AUTH_CHECK_REQUIRED');if(value.code==='40001')throw new ApiError(409,'This revision changed. Refresh before saving.','CONFLICT');if(['23514','23505','22023','22P02'].includes(value.code))throw new ApiError(422,'Check the metadata, quality checklist, path and saved revision.','VALIDATION');throw new ApiError(503,'The editorial service is not available.');}
    return reply(value);
   }
   if(data.action==='password_info'){
    const info=await rpc('password_info',actor,provider,grant);
    return reply({configured:info.configured,question:info.question||'who is you ?'});
   }
   if(data.action==='password_change'){
    let fields;try{fields=passwordFields(payload);}catch(e){throw new ApiError(422,e.message,'VALIDATION');}
    if(!claims.amr?.some(x=>x.method==='totp'&&x.timestamp>=Date.now()/1000-60))throw new ApiError(403,'Verify a fresh authenticator code before changing the password.','AUTH_CHECK_REQUIRED');
    const material=await rpc('password_material',actor,provider,grant);
    if(material.rate_limited)throw new ApiError(429,'Wait before trying the verification check again.','RATE_LIMITED');
    if(!material.configured)throw new ApiError(503,'The private verification check has not been configured.','SECURITY_SETUP_REQUIRED');
    const decision=await rpc('password_check',actor,provider,grant,{attempt_id:material.attempt_id,candidate:await answerDigest(fields.answer,material.salt,material.iterations)});
    if(!decision.authorized)throw new ApiError(422,'The extra verification check was not accepted.','EXTRA_CHECK_FAILED');
    // All admin grants are revoked BEFORE the provider password mutation.
    // Never use an administrative password-reset endpoint to bypass current credentials.
    // Verify current credentials explicitly; hosted current-password enforcement
    // is configurable, so forwarding the field alone would not establish proof.
    let currentVerified=false,temporaryAccess='';
    try{
     const response=await fetcher(projectUrl+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:fields.current}),signal:AbortSignal.timeout(10000),redirect:'error'});
     const proof=await response.json();
     currentVerified=response.ok&&proof.user?.id===actor&&typeof proof.access_token==='string';
     if(currentVerified)temporaryAccess=proof.access_token;
    }catch{}
    if(temporaryAccess){try{await fetcher(projectUrl+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:publishableKey,Authorization:'Bearer '+temporaryAccess},signal:AbortSignal.timeout(10000),redirect:'error'});}catch{}}
    if(!currentVerified)throw new ApiError(401,'The current password was not accepted. Sign in again.','AUTH_REQUIRED');
    let changed=false;
    try{
     const response=await fetcher(projectUrl+'/auth/v1/user',{method:'PUT',headers:{apikey:publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({password:fields.next,current_password:fields.current}),signal:AbortSignal.timeout(15000),redirect:'error'});
     changed=response.ok;
    }catch{}
    try{await fetcher(projectUrl+'/rest/v1/rpc/admin_password_result',{method:'POST',headers:serviceHeaders,body:JSON.stringify({p_actor:actor,p_provider:provider,p_success:changed}),signal:AbortSignal.timeout(10000)});}catch{}
    if(!changed)throw new ApiError(401,'The password change was not accepted. Sign in again before retrying.','AUTH_REQUIRED');
    let providerSessionsRevoked=false;
    try{providerSessionsRevoked=(await fetcher(projectUrl+'/auth/v1/logout?scope=global',{method:'POST',headers:{apikey:publishableKey,Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000),redirect:'error'})).ok;}catch{}
    return reply({changed:true,admin_grants_revoked:true,provider_sessions_revoked:providerSessionsRevoked,sign_in_required:true});
   }
   if(data.action==='save'){
    let normalized;try{normalized=await normalizeResource(payload.record);}catch(e){throw new ApiError(422,e.message,'VALIDATION');}return reply(await rpc('save',actor,provider,grant,{record:normalized,expected_revision:payload.expected_revision??null}));
   }
   if(data.action==='import_batch'){
    if(!Array.isArray(payload.rows)||payload.rows.length<1||payload.rows.length>100)throw new ApiError(422,'Use a batch of one to 100 resources.');
    let rows;try{rows=await Promise.all(payload.rows.map(r=>normalizeResource(r)));}catch(e){throw new ApiError(422,e.message,'VALIDATION');}return reply(await rpc('import_batch',actor,provider,grant,{job_id:payload.job_id,offset:payload.offset,rows}));
   }
   if(!['overview','list','publish','import_start','import_status','import_rollback'].includes(data.action))throw new ApiError(400,'Unknown operation.');
   return reply(await rpc(data.action,actor,provider,grant,payload));
  }catch(error){if(error instanceof ApiError)return reply({error:error.message,code:error.code},error.status);return reply({error:'The admin service is temporarily unavailable.',code:'SERVICE_UNAVAILABLE'},503);}
 };
}
