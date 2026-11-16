-- Original native release v2. Version 1 and review archives stay private.
create table atlas_ops.template_release_approvals(
 release_id text primary key check(release_id='original-v2'),
 source_sha text not null check(source_sha ~ '^[a-f0-9]{64}$'),
 license text not null check(license='CC BY 4.0'),
 approved_at timestamptz not null default now()
);
create table atlas_ops.template_release_log(
 resource_id text primary key references public.resources(id),
 source_sha text not null, license text not null, native_files integer not null,
 published_at timestamptz not null default now()
);
alter table atlas_ops.template_release_approvals enable row level security;
alter table atlas_ops.template_release_log enable row level security;
revoke all on atlas_ops.template_release_approvals,atlas_ops.template_release_log from public,anon,authenticated;
grant usage on schema storage to anon,authenticated;
grant select on storage.objects to anon,authenticated;
-- Only exact approved versions with a currently published parent are readable.
create policy fra_licensed_original_download on storage.objects for select to anon,authenticated
using(bucket_id='fra-public-templates' and exists(
 select 1 from public.resource_files f join public.resources r on r.id=f.resource_id
 where f.bucket_id=storage.objects.bucket_id and f.object_key=storage.objects.name
 and f.publication='published' and f.license_approved and r.publication='published'
));
create function atlas_ops.publish_original_v2(p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.resources; f jsonb; n integer; actor uuid; approved atlas_ops.template_release_approvals;
begin
 select * into approved from atlas_ops.template_release_approvals where release_id='original-v2';
 if approved.source_sha is null or approved.source_sha is distinct from p_data->>'source_sha'
  or p_data->>'license' is distinct from 'CC BY 4.0' then raise exception 'Original release approval does not match' using errcode='42501';end if;
 select * into r from public.resources where id=p_data->>'resource_id' for update;
 if not found or r.id !~ '^fra_template_[0-9]{3}$' or r.resource_type<>'template'
  or r.canonical_url<>'https://freeresourceatlas.com/templates/'||r.slug then raise exception 'Original template not found' using errcode='22023';end if;
 if exists(select 1 from atlas_ops.template_release_log l where l.resource_id=r.id and l.source_sha=approved.source_sha)
  then return jsonb_build_object('published',r.publication='published','already_released',true,'id',r.id);end if;
 if r.revision is distinct from (p_data->>'expected_revision')::integer then raise exception 'Template changed; review again' using errcode='40001';end if;
 if jsonb_typeof(p_data->'files') is distinct from 'array' or jsonb_array_length(p_data->'files') not between 2 and 3
  or not exists(select 1 from jsonb_array_elements(p_data->'files') x where x->>'format'='pdf')
  or not exists(select 1 from jsonb_array_elements(p_data->'files') x where x->>'format' in ('docx','xlsx'))
  then raise exception 'Original native files are incomplete' using errcode='23514';end if;
 n:=0;
 for f in select * from jsonb_array_elements(p_data->'files') loop
  if (f->>'version')::integer is distinct from 2 or f->>'format' is null or f->>'object_path' is null or f->>'sha256' is null or f->>'bytes' is null or f->>'format' not in ('pdf','docx','xlsx','csv')
   or f->>'object_path' !~ ('^templates/[a-z0-9-]+/'||r.slug||'/v2/'||r.slug||'\.(pdf|docx|xlsx|csv)$')
   or f->>'sha256' !~ '^[a-f0-9]{64}$' or (f->>'bytes')::bigint not between 1 and 8388608
   or not exists(select 1 from storage.objects o where o.bucket_id='fra-public-templates' and o.name=f->>'object_path' and (o.metadata->>'size')::bigint=(f->>'bytes')::bigint)
   then raise exception 'Verified stored file is missing' using errcode='23514';end if;
  insert into public.resource_files(resource_id,bucket_id,object_key,format,version,bytes,sha256,publication,license_approved)
  values(r.id,'fra-public-templates',f->>'object_path',f->>'format',2,(f->>'bytes')::bigint,f->>'sha256','published',true);
  n:=n+1;
 end loop;
 select user_id into actor from app_private.admin_members where role='owner' and enabled order by user_id limit 1;
 if actor is null then raise exception 'Configured owner required' using errcode='42501';end if;
 update public.resources set pricing_model='free_forever',license='CC BY 4.0',
  access_limits='Free download, editing and redistribution with attribution under CC BY 4.0. Use an application compatible with the file format. Examples are fictional; replace them with your own work. https://creativecommons.org/licenses/by/4.0/',
  short_summary=case when length(short_summary)<60 then short_summary||' Adapt this original template to one task and keep your supporting notes.' else short_summary end,
  signup_required=false,offline_support='yes',platforms=array['Windows','macOS','Linux'],
  source_verified_at=now(),reviewed_at=now(),publication='published',media_rights='original',
  revision=revision+1,updated_at=now() where id=r.id;
 insert into public.seo_pages(resource_id,path,page_type,title,description,canonical_url,publication,index_intent,quality_checks,quality_reviewed_at,reviewer_id,sitemap_group)
 values(r.id,'/templates/'||r.slug,'template',r.display_name||' — Free editable template',r.short_summary,r.canonical_url,'published','index',
  '{"distinct_intent":true,"original_purpose":true,"practical_example":true,"free_limits":true,"source_review":true,"metadata":true,"media_rights":true,"internal_links":true,"accessibility":true}',now(),actor,'pages')
 on conflict(path,locale) do update set title=excluded.title,description=excluded.description,publication='published',index_intent='index',quality_checks=excluded.quality_checks,quality_reviewed_at=now(),reviewer_id=actor,last_meaningful_change=now();
 insert into atlas_ops.template_release_log(resource_id,source_sha,license,native_files) values(r.id,approved.source_sha,approved.license,n);
 insert into app_private.audit_events(actor_id,action,target,details)
 values(actor,'original_template.v2.published',r.id,jsonb_build_object('files',n,'source_sha',approved.source_sha,'license',approved.license));
 return jsonb_build_object('published',true,'id',r.id,'files',n,'version',2);
end $$;
revoke all on function atlas_ops.publish_original_v2(jsonb) from public,anon,authenticated;
create function public.atlas_publish_original_v2(p_data jsonb) returns jsonb
language sql security invoker set search_path='' as $$select atlas_ops.publish_original_v2(p_data)$$;
revoke all on function public.atlas_publish_original_v2(jsonb) from public,anon,authenticated;
grant usage on schema atlas_ops to service_role;
grant execute on function atlas_ops.publish_original_v2(jsonb),public.atlas_publish_original_v2(jsonb) to service_role;

-- Owner approved this exact original archive and CC BY 4.0 release.
insert into atlas_ops.template_release_approvals(release_id,source_sha,license) values('original-v2','87a5e7140b03d8c4137792c710ca09b609bec68b8b92641ef828dc1a6048f818','CC BY 4.0');
