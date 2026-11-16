import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pg_trgm} from '@electric-sql/pglite/contrib/pg_trgm';
import {normalizeResource} from '../src/admin-normalize.mjs';

// Supabase supplies these platform-owned objects. No hosted database, account,
// credential or private backup is used by this isolated recovery rehearsal.
const platform=`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema storage;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users,not_after timestamptz);
create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users,status text,factor_type text);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`;
const names=(await fs.readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort();
async function emptyApplication(){
 const db=await PGlite.create({extensions:{pg_trgm}});
 await db.exec(platform);
 for(const name of names)try{await db.exec(await fs.readFile('supabase/migrations/'+name,'utf8'));}catch(error){throw new Error('Recovery migration failed: '+name,{cause:error});}
 await db.exec(await fs.readFile('supabase/seed.sql','utf8'));
 return db;
}
const db=await emptyApplication();
const owner='10000000-0000-4000-8000-000000000001',provider='20000000-0000-4000-8000-000000000001',factor='30000000-0000-4000-8000-000000000001',challenge='40000000-0000-4000-8000-000000000001',grant='a'.repeat(64),nonce='b'.repeat(64);
await db.query("insert into auth.users values($1,'recovery@example.invalid',now(),null)",[owner]);
await db.query('insert into auth.sessions values($1,$2,null)',[provider,owner]);
await db.query("insert into auth.mfa_factors values($1,$2,'verified','totp')",[factor,owner]);
await db.exec("insert into app_private.owner_config(id,owner_email) values(1,'recovery@example.invalid')");
const execute=async(action,data={},hash=grant)=>(await db.query('select public.admin_execute($1,$2,$3,$4,$5) as result',[action,owner,provider,hash,data])).rows[0].result;
assert.equal((await execute('owner',{},null)).owner,true);
await execute('challenge_start',{factor_id:factor,challenge_id:challenge,nonce_hash:nonce,expires_at:new Date(Date.now()+120000).toISOString()},null);
await execute('challenge_consume',{nonce_hash:nonce,grant_hash:grant},null);
await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:owner,session_id:provider,aal:'aal2'})]);
const record=await normalizeResource({id:'recovery_fixture',name:'Isolated restore example',url:'https://example.com/recovery',description:'A fictional record used only to test a database restore in local PostgreSQL.',editorial_description:'A fictional record used only in an isolated restore rehearsal. No hosted website receives this content. It verifies saved revisions, source checks, publication guards, public visibility and schema recovery.',category:'developer-tools',pricing:'free_forever',source_verified_at:new Date().toISOString(),access_limits:'Fictional local fixture; never offered as a real resource.'});
assert.equal((await execute('save',{record})).saved,true);
await db.exec('set role anon');
assert.equal((await db.query('select count(*)::int as n from public.resources')).rows[0].n,0);
await assert.rejects(db.query('select * from app_private.owner_config'),/permission denied/);
await assert.rejects(db.query("select public.admin_execute('overview',$1,$2,$3,'{}')",[owner,provider,grant]),/permission denied/);
await db.exec('reset role');
await assert.rejects(execute('publish',{id:record.id,expected_revision:1,reviewed_sources:false}),/Confirm original-source review/);
assert.equal((await execute('publish',{id:record.id,expected_revision:1,reviewed_sources:true})).published,true);
await assert.rejects(execute('save',{record,expected_revision:1}),/changed/);
await db.exec('set role authenticated');
assert.equal((await db.query("select public.atlas_admin_operations('health',$1) as result",[grant])).rows[0].result.catalog.published,1);
await db.exec('reset role');

// Preserve real column values and generated-column rules, then restore into an
// independently rebuilt database. Auth/grants are deliberately not transferred.
const snapshot=(await db.query('select to_jsonb(r)-\'search_vector\' as record from public.resources r')).rows.map(x=>x.record);
const restored=await emptyApplication();
for(const row of snapshot){
 const columns=Object.keys(row);
 await restored.query('insert into public.resources('+columns.map(c=>'"'+c+'"').join(',')+') values('+columns.map((_,i)=>'$'+(i+1)).join(',')+')',columns.map(c=>row[c]));
}
assert.deepEqual((await restored.query("select to_jsonb(r)-'search_vector' as record from public.resources r")).rows.map(x=>x.record),snapshot);
await restored.exec('set role anon');
assert.equal((await restored.query('select count(*)::int as n from public.resources')).rows[0].n,1);
await assert.rejects(restored.query('select * from atlas_ops.submissions'),/permission denied/);
await restored.exec('reset role');
await db.exec('delete from auth.sessions');
await assert.rejects(execute('overview'),/locked/);
if(process.argv[2]){
 const backup=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
 assert.equal(backup.format,'atlas-content-backup-v1');assert.equal(backup.project,'jawldxxtolppeccxcihh');
 const order=['categories','site_locales','search_lexicon','resources','resource_countries','resource_translations','resource_files','seo_pages','site_redirects'];
 const liveRestore=await emptyApplication();
 await liveRestore.exec('truncate public.categories,public.site_locales,public.search_lexicon cascade');
 let total=0;
 for(const table of order){
  const rows=backup.tables[table];assert.ok(Array.isArray(rows));
  const columns=(await liveRestore.query("select attname from pg_attribute where attrelid=$1::regclass and attnum>0 and not attisdropped and attgenerated='' order by attnum",['public.'+table])).rows.map(x=>'"'+x.attname+'"').join(',');
  for(const row of rows)await liveRestore.query('insert into public.'+table+'('+columns+') select '+columns+' from jsonb_populate_record(null::public.'+table+',$1)',[row]);
  assert.equal((await liveRestore.query('select count(*)::int as n from public.'+table)).rows[0].n,rows.length);total+=rows.length;
 }
 const canonical=sql=>sql.replace(/\s+/g,'').toLowerCase();
 const recovered=(await liveRestore.query("select n.nspname as schema,p.proname as name,pg_get_functiondef(p.oid) as ddl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private','atlas_ops') and p.prokind='f'")).rows;
 for(const fn of backup.functions){const source=recovered.find(x=>x.schema===fn.schema&&x.name===fn.name);assert.ok(source,'Missing recovered function '+fn.schema+'.'+fn.name);assert.equal(canonical(source.ddl),canonical(fn.ddl),'Production function differs: '+fn.schema+'.'+fn.name);}
 await liveRestore.exec('set role anon');assert.equal((await liveRestore.query('select count(*)::int as n from public.resources')).rows[0].n,backup.tables.resources.filter(x=>x.publication==='published').length);
 await assert.rejects(liveRestore.query('select * from atlas_ops.submissions'),/permission denied/);
 await liveRestore.close();
 console.log('PASS: live content snapshot restored '+total+' rows across '+order.length+' tables; '+backup.functions.length+' deployed function definitions match recovered source. Authentication and visitor records are excluded.');
}
await db.close();await restored.close();
console.log('PASS: '+names.length+' application migrations rebuilt twice; original owner/MFA/provider-session guards, save/publish/conflict gates, restored content and private permissions verified. No hosted database was changed.');
