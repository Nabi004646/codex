import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pg_trgm} from '@electric-sql/pglite/contrib/pg_trgm';
import release from '../data/template-release-v2.json' with {type:'json'};
import source from '../data/template-release-source-v2.json' with {type:'json'};
import {nativeTemplateDownload,nativeTemplateDocument,nativeTemplateApprovals} from '../server/template-publication.mjs';
import {templateData,templateListing} from '../server/templates.mjs';
import {createReleaseHandler} from '../supabase/functions/atlas-release-originals/core.mjs';

const db=await PGlite.create({extensions:{pg_trgm}}),t=release[0],owner='10000000-0000-4000-8000-000000000001';
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema storage;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users,not_after timestamptz);
create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users,status text,factor_type text);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`);
for(const name of (await fs.readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort())await db.exec(await fs.readFile('supabase/migrations/'+name,'utf8'));
await db.exec(await fs.readFile('supabase/seed.sql','utf8'));
await db.query("insert into auth.users values($1,'owner@example.invalid',now(),null)",[owner]);
await db.query("insert into app_private.admin_members values($1,'owner',true)",[owner]);
await db.query("insert into public.resources(id,slug,display_name,canonical_url,short_summary,editorial_description,category_id,resource_type) values($1,$2,$3,$4,$5,$6,'developer-tools','template')",[t.resource_id,t.slug,t.title,'https://freeresourceatlas.com/templates/'+t.slug,t.purpose,t.description]);
const data={resource_id:t.resource_id,expected_revision:1,source_sha:source.release_archive.sha256,license:'CC BY 4.0',files:t.files};
const publish=async value=>(await db.query('select public.atlas_publish_original_v2($1) as result',[value])).rows[0].result;
await assert.rejects(publish({...data,source_sha:'0'.repeat(64)}),/approval does not match/);
await assert.rejects(publish({...data,license:null}),/approval does not match/);
await assert.rejects(publish({...data,expected_revision:2}),/changed/);
await assert.rejects(publish(data),/stored file is missing/);
await db.exec('set role anon');
await assert.rejects(publish(data),/permission denied/);
await assert.rejects(db.query('select * from atlas_ops.template_release_approvals'),/permission denied/);
await db.exec('reset role');
for(const file of t.files)await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',['fra-public-templates',file.object_path,{size:file.bytes}]);
await db.query("insert into storage.objects(bucket_id,name,metadata) values('fra-template-drafts','private-original.zip','{}')");
await db.exec('set role anon');assert.equal((await db.query('select count(*)::int n from storage.objects')).rows[0].n,0);await db.exec('reset role');
assert.equal((await publish(data)).published,true);
assert.equal((await publish(data)).already_released,true);
assert.equal((await db.query('select revision from public.resources where id=$1',[t.resource_id])).rows[0].revision,2);
await db.exec('set role anon');
assert.equal((await db.query('select count(*)::int n from storage.objects')).rows[0].n,t.files.length);
assert.equal((await db.query('select count(*)::int n from public.seo_pages')).rows[0].n,1);
assert.equal((await db.query('select count(*)::int n from public.resource_files')).rows[0].n,t.files.length);
await db.exec('reset role');

const resource={id:t.resource_id,display_name:t.title,short_summary:t.purpose,editorial_description:t.description,license:'CC BY 4.0',revision:2};
let active=true,tamper=false,reads=0;
const fileRows=t.files.map(f=>({resource_id:t.resource_id,bucket_id:'fra-public-templates',object_key:f.object_path,format:f.format,version:2,bytes:f.bytes,sha256:f.sha256,publication:'published',license_approved:true}));
const provider=async(raw,options)=>{
 const u=new URL(raw);assert.equal(options.redirect,'manual');assert.ok(!JSON.stringify(options).includes('service_role'));
 if(u.pathname==='/rest/v1/resources')return Response.json(active?[resource]:[]);
 if(u.pathname==='/rest/v1/resource_files')return Response.json(active?fileRows.filter(f=>!u.searchParams.get('format')||u.searchParams.get('format')==='eq.'+f.format):[]);
 if(u.pathname==='/rest/v1/seo_pages')return Response.json(active?[{resource_id:t.resource_id,path:'/templates/'+t.slug,canonical_url:'https://freeresourceatlas.com/templates/'+t.slug}]:[]);
 if(u.pathname.startsWith('/storage/v1/object/authenticated/')){reads++;const f=t.files.find(f=>u.pathname.endsWith('/'+f.object_path)),bytes=await fs.readFile(f.local_path);if(tamper)bytes[bytes.length-1]^=1;return new Response(bytes);}
 throw Error('Unexpected provider path');
};
const request=(format='pdf',method='GET')=>new Request('https://freeresourceatlas.com/api/template-download?id=1&format='+format,{method});
let response=await nativeTemplateDownload(request(),{fetcher:provider});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),await fs.readFile(t.files.find(f=>f.format==='pdf').local_path));
const prior=reads;response=await nativeTemplateDownload(request('pdf','HEAD'),{fetcher:provider});assert.equal(response.status,200);assert.equal(reads,prior);assert.equal((await response.arrayBuffer()).byteLength,0);
tamper=true;assert.equal((await nativeTemplateDownload(request(),{fetcher:provider})).status,503);tamper=false;
assert.equal((await nativeTemplateDownload(request('../x'),{fetcher:provider})).status,404);
assert.equal((await nativeTemplateDocument(templateData('/templates/'+t.slug),provider)).downloadsAvailable,true);
assert.equal((await nativeTemplateDocument({listing:templateListing()},provider)).listing.publishedCount,1);
assert.equal((await nativeTemplateApprovals(provider)).length,1);
active=false;assert.equal((await nativeTemplateDownload(request(),{fetcher:provider})).status,404);
assert.equal((await nativeTemplateDocument(templateData('/templates/'+t.slug),provider)).downloadsAvailable,false);
assert.equal((await nativeTemplateApprovals(provider)).length,0);
await db.query("update public.resources set publication='draft' where id=$1",[t.resource_id]);
assert.equal((await publish(data)).published,false,'Retry must not republish an owner-withdrawn template');
await db.exec('set role anon');assert.equal((await db.query('select count(*)::int n from storage.objects')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from public.resource_files')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from public.seo_pages')).rows[0].n,0);await db.exec('reset role');await db.close();

let network=0;
const handler=createReleaseHandler({base:'https://example.invalid',secret:'server-secret',publishable:'public-key',packSha:source.release_archive.sha256,fetcher:async()=>{network++;throw Error('Should not reach provider');},unzip:()=>({})});
const call=(body,headers={})=>handler(new Request('https://example.invalid/release',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}));
assert.equal((await call({approved:true,license:'CC BY 4.0',offset:0,count:1})).status,403);assert.equal(network,0);
assert.equal((await call({approved:true,license:'CC BY 4.0',offset:0,count:5},{apikey:'server-secret'})).status,400);assert.equal(network,0);
assert.equal((await call({approved:true,license:'CC BY 4.0',offset:0,count:1},{apikey:'server-secret'})).status,503);assert.equal(network,1);
assert.ok((await fs.readFile('supabase/functions/atlas-release-originals/index.ts','utf8')).includes(source.release_archive.sha256));
const packed=new TextEncoder().encode('isolated pinned archive fixture'),testSha=Buffer.from(await crypto.subtle.digest('SHA-256',packed)).toString('hex');
const zipped={'manifest.json':new TextEncoder().encode(JSON.stringify(release))};
for(const row of release)for(const f of row.files)zipped[f.object_path]=new Uint8Array(await fs.readFile(f.local_path));
let corrupt=false,commits=0,uploaded=0,lastReleaseError;
const releaseProvider=async(raw,options)=>{
 const u=new URL(raw);
 if(u.pathname.endsWith('/review-packs/native-templates-20261116-v2.zip')){const b=packed.slice();if(corrupt)b[0]^=1;return new Response(b);}
 if(u.pathname==='/rest/v1/resources'){const row=release.find(t=>u.searchParams.get('id')==='eq.'+t.resource_id);return Response.json([{id:row.resource_id,slug:row.slug,resource_type:'template',revision:2,canonical_url:'https://freeresourceatlas.com/templates/'+row.slug}]);}
 if(u.pathname.startsWith('/storage/v1/object/fra-public-templates/')){uploaded++;return Response.json({Key:'stored'});}
 if(u.pathname.startsWith('/storage/v1/object/authenticated/fra-public-templates/'))return new Response(zipped[u.pathname.split('/fra-public-templates/')[1]]);
 if(u.pathname==='/rest/v1/rpc/atlas_publish_original_v2'){const {p_data}=JSON.parse(options.body);assert.equal(p_data.source_sha,testSha);assert.equal(p_data.expected_revision,2);commits++;return Response.json({published:true,id:p_data.resource_id});}
 throw Error('Unexpected release path '+u.pathname);
};
const releasing=createReleaseHandler({base:'https://example.invalid',secret:'server-secret',publishable:'public-key',packSha:testSha,fetcher:releaseProvider,unzip:()=>zipped,onError:error=>{lastReleaseError=error.message;}});
const releaseRequest=()=>new Request('https://example.invalid/release',{method:'POST',headers:{apikey:'server-secret','Content-Type':'application/json'},body:JSON.stringify({approved:true,license:'CC BY 4.0',offset:0,count:4})});
let released=await releasing(releaseRequest());assert.equal(released.status,200,lastReleaseError);assert.equal((await released.json()).next_offset,4);assert.equal(commits,4);assert.equal(uploaded,release.slice(0,4).reduce((n,t)=>n+t.files.length,0));
corrupt=true;released=await releasing(releaseRequest());assert.equal(released.status,503);assert.equal(commits,4,'Tampered archive never reaches publication');
console.log('PASS: pinned native bytes, publication/revision/license guards, private source isolation, verified downloads, tamper rejection and withdrawal from downloads/SEO.');
