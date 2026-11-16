// Produces an additive, owner-executed draft import. Never changes a saved row or
// licenses/publishes a file. Native files remain in private Storage.
import fs from 'node:fs/promises';
import templates from '../data/template-drafts.json' with {type:'json'};
const categories={'small-business-operations':'business-and-operations','freelancers-and-client-work':'business-and-operations','careers-and-job-search':'courses-and-learning','study-learning-and-education':'education-and-teaching','creators-and-video-production':'video-and-film','ai-automation-and-productivity':'productivity','cybersecurity-and-digital-privacy':'cybersecurity','software-web-projects-and-tech-workflows':'developer-tools','home-and-everyday-planning':'productivity','regional-relevance-us-uk-canada-australia':'productivity'};
const rows=templates.map(t=>({id:t.resource_id,slug:t.slug,display_name:t.title,canonical_url:'https://freeresourceatlas.com/templates/'+t.slug,short_summary:t.purpose,editorial_description:t.description,category_id:categories[t.category_slug]||'productivity'}));
const files=templates.flatMap(t=>t.files.map(f=>({resource_id:t.resource_id,object_key:f.object_path,format:f.format,version:f.version,bytes:f.bytes,sha256:f.sha256})));
const literal=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";
const sql=`begin;
with source as (select * from jsonb_to_recordset(${literal(rows)}) as r(id text,slug text,display_name text,canonical_url text,short_summary text,editorial_description text,category_id text))
insert into public.resources(id,slug,display_name,canonical_url,short_summary,editorial_description,category_id,resource_type,pricing_model,license,access_limits,source_urls,tags,publication)
select id,slug,display_name,canonical_url,short_summary,editorial_description,category_id,'template','unknown','Owner distribution review pending','Draft original template. Publication and reuse terms require a separate review.',array[canonical_url],array['original-template','native-file'],'draft' from source
on conflict do nothing;
with source as (select * from jsonb_to_recordset(${literal(files)}) as f(resource_id text,object_key text,format text,version integer,bytes bigint,sha256 text))
insert into public.resource_files(resource_id,bucket_id,object_key,format,version,bytes,sha256,publication,license_approved)
select f.resource_id,'fra-template-drafts',f.object_key,f.format,f.version,f.bytes,f.sha256,'draft',false from source f
where exists(select 1 from storage.objects o where o.bucket_id='fra-template-drafts' and o.name=f.object_key and (o.metadata->>'size')::bigint=f.bytes)
 and exists(select 1 from public.resources r where r.id=f.resource_id and r.resource_type='template' and r.publication='draft')
on conflict do nothing;
insert into app_private.audit_events(actor_id,action,target,details)
select user_id,'template_source_staged','original-100-template-pack',jsonb_build_object('source_resources',100,'source_files',240,'publication','draft','license_approved',false)
from app_private.admin_members where role='owner' and enabled order by user_id limit 1;
commit;
select 'draft_resources' as section,count(*) as total from public.resources where id like 'fra_template_%' and publication='draft'
union all select 'registered_private_files',count(*) from public.resource_files where bucket_id='fra-template-drafts' and publication='draft';
`;
await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/template-staging.sql',sql);
console.log('Prepared draft-only import for '+rows.length+' original templates and '+files.length+' files; no hosted changes performed.');
