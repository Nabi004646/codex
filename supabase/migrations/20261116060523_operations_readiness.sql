-- Additive operations setup for the existing Free-library project.
-- No catalog publication, email delivery, public Storage access or credential changes.
begin;
create schema atlas_ops;
revoke all on schema atlas_ops from public;
grant usage on schema atlas_ops to anon, authenticated;

create table atlas_ops.release_state (
 id smallint primary key check(id=1), version text not null, installed_at timestamptz not null default now()
);
insert into atlas_ops.release_state(id,version) values(1,'operations-2026-11-16');
create table atlas_ops.submissions (
 id uuid primary key default gen_random_uuid(), request_hash text not null unique,
 kind text not null check(kind in ('resource_suggestion','correction')),
 url text not null check(length(url) between 10 and 4096 and url ~ '^https://[^[:space:]]+$'),
 summary text not null check(length(summary) between 10 and 2000),
 evidence text not null check(length(evidence) between 10 and 4000),
 state text not null default 'pending' check(state in ('pending','reviewed','archived','withdrawn')),
 revision integer not null default 1, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), review_note text not null default '' check(length(review_note)<=2000)
);
create index submissions_pending on atlas_ops.submissions(created_at desc,id) where state='pending';
create index submissions_recent on atlas_ops.submissions(created_at desc);
alter table atlas_ops.release_state enable row level security;
alter table atlas_ops.submissions enable row level security;
revoke all on all tables in schema atlas_ops from public,anon,authenticated;

-- Anonymous write-only intake. A bounded global quota also applies to direct RPC
-- callers, so bypassing the website's honeypot cannot bypass database limits.
create function atlas_ops.submit(p_request_token text,p_kind text,p_url text,p_summary text,p_evidence text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved atlas_ops.submissions; v_request_hash text;
begin
 if p_request_token is null or p_request_token !~ '^[a-f0-9]{64}$' or p_kind not in ('resource_suggestion','correction') or
  p_url is null or p_url !~ '^https://[^[:space:]]+$' or length(p_url)>4096 or
  coalesce(length(btrim(p_summary)),0) not between 10 and 2000 or coalesce(length(btrim(p_evidence)),0) not between 10 and 4000 then
  raise exception 'Check the submission fields' using errcode='22023';
 end if;
 v_request_hash:=encode(pg_catalog.sha256(convert_to(p_request_token,'UTF8')),'hex');
 perform pg_advisory_xact_lock(7161101601);
 select * into saved from atlas_ops.submissions s where s.request_hash=v_request_hash;
 if found then return jsonb_build_object('id',saved.id,'state',saved.state,'received',true); end if;
 if (select count(*) from atlas_ops.submissions where created_at>now()-interval '15 minutes')>=60 or
    (select count(*) from atlas_ops.submissions where state='pending')>=2000 then
  raise exception 'The review queue is busy. Please try again later' using errcode='54000';
 end if;
 insert into atlas_ops.submissions(request_hash,kind,url,summary,evidence)
 values(v_request_hash,p_kind,p_url,btrim(p_summary),btrim(p_evidence)) returning * into saved;
 return jsonb_build_object('id',saved.id,'state',saved.state,'received',true);
end $$;
create function public.atlas_submit(p_request_token text,p_kind text,p_url text,p_summary text,p_evidence text)
returns jsonb language sql security invoker set search_path='' as $$
 select atlas_ops.submit(p_request_token,p_kind,p_url,p_summary,p_evidence)
$$;

-- A receipt token can only withdraw its own submission; it cannot read the queue.
create function atlas_ops.withdraw(p_request_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 if p_request_token is null or p_request_token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid receipt' using errcode='22023';end if;
 update atlas_ops.submissions set state='withdrawn',revision=revision+1,updated_at=now()
 where request_hash=encode(pg_catalog.sha256(convert_to(p_request_token,'UTF8')),'hex') and state<>'withdrawn';
 get diagnostics changed=row_count;
 return jsonb_build_object('withdrawn',changed=1);
end $$;
create function public.atlas_withdraw(p_request_token text) returns jsonb language sql security invoker set search_path='' as $$ select atlas_ops.withdraw(p_request_token) $$;

-- Both buckets start PRIVATE. No draft becomes publicly downloadable on setup.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('fra-template-drafts','fra-template-drafts',false,52428800,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','application/zip']),
 ('fra-public-templates','fra-public-templates',false,52428800,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv'])
on conflict(id) do nothing;

-- Storage access requires the same owner, provider session, AAL2 and unexpired
-- application grant as the existing admin. Reads never extend the idle timeout.
create function atlas_ops.can_upload_templates() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and auth.jwt()->>'aal'='aal2' and exists(
  select 1 from app_private.admin_sessions s
  join app_private.admin_members m on m.user_id=s.user_id
  join auth.sessions a on a.id=s.provider_session_id and a.user_id=m.user_id
  where m.user_id=auth.uid() and m.enabled and m.role='owner'
   and s.provider_session_id::text=auth.jwt()->>'session_id' and s.revoked_at is null
   and s.expires_at>now() and s.last_activity_at>now()-interval '5 minutes'
   and (a.not_after is null or a.not_after>now()))
$$;
create policy atlas_template_owner_read on storage.objects for select to authenticated
using(bucket_id='fra-template-drafts' and (select atlas_ops.can_upload_templates()));
create policy atlas_template_owner_upload on storage.objects for insert to authenticated
with check(bucket_id='fra-template-drafts' and name ~ '^templates/[a-z0-9/-]+\.(docx|xlsx|pdf|csv)$' and name not like '%..%' and (select atlas_ops.can_upload_templates()));
-- Immutable uploads: replacements require a new versioned object path.

create function atlas_ops.admin(p_action text,p_grant_hash text,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; provider uuid; answer jsonb; saved atlas_ops.submissions; changed integer;
begin
 actor:=auth.uid();
 if actor is null or auth.jwt()->>'aal' is distinct from 'aal2' or
  coalesce(auth.jwt()->>'session_id','') !~ '^[a-f0-9-]{36}$' then raise exception 'Admin access is locked' using errcode='42501';end if;
 provider:=(auth.jwt()->>'session_id')::uuid;
 perform app_private.assert_admin(actor,provider,p_grant_hash);
 if not exists(select 1 from app_private.admin_members where user_id=actor and enabled and role='owner') then raise exception 'Owner access required' using errcode='42501';end if;
 if p_action='health' then
  return jsonb_build_object('project','jawldxxtolppeccxcihh','release',(select version from atlas_ops.release_state where id=1),'checked_at',now(),
   'catalog',(select jsonb_build_object('total',count(*),'published',count(*) filter(where publication='published'),'draft',count(*) filter(where publication='draft')) from public.resources),
   'storage',(select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,'objects',(select count(*) from storage.objects o where o.bucket_id=b.id))),'[]'::jsonb) from storage.buckets b where b.id in ('fra-template-drafts','fra-public-templates')),
   'template_files',(select count(*) from public.resource_files),
   'pending_submissions',(select count(*) from atlas_ops.submissions where state='pending'),
   'integrations',(select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from app_private.integration_state s));
 elsif p_action='template_files' then
  return jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) from public.resource_files f where bucket_id='fra-template-drafts'));
 elsif p_action='template_register' then
  if coalesce(p_data->>'object_key','') !~ '^templates/[a-z0-9/-]+\.(docx|xlsx|pdf|csv)$' or (p_data->>'object_key') like '%..%' or
   coalesce(p_data->>'sha256','') !~ '^[a-f0-9]{64}$' or (p_data->>'format') not in ('docx','xlsx','pdf','csv') or
   (p_data->>'object_key') not like '%.'||(p_data->>'format') or
   not exists(select 1 from public.resources where id=p_data->>'resource_id' and resource_type='template' and publication='draft') or
   not exists(select 1 from storage.objects where bucket_id='fra-template-drafts' and name=p_data->>'object_key' and (metadata->>'size')::bigint=(p_data->>'bytes')::bigint) then
   raise exception 'Upload the matching draft file first' using errcode='22023';
  end if;
  insert into public.resource_files(resource_id,bucket_id,object_key,format,version,bytes,sha256,publication,license_approved)
   values(p_data->>'resource_id','fra-template-drafts',p_data->>'object_key',p_data->>'format',(p_data->>'version')::integer,(p_data->>'bytes')::bigint,p_data->>'sha256','draft',false)
   on conflict(resource_id,format,version) do nothing;
  if not exists(select 1 from public.resource_files where resource_id=p_data->>'resource_id' and format=p_data->>'format' and version=(p_data->>'version')::integer and sha256=p_data->>'sha256' and object_key=p_data->>'object_key' and bucket_id='fra-template-drafts') then
   raise exception 'A different file is already registered. Use a new version' using errcode='40001';
  end if;
  return jsonb_build_object('registered',true);
 elsif p_action='submissions_list' then
  if coalesce(p_data->>'state','pending') not in ('pending','reviewed','archived','withdrawn') then raise exception 'Invalid queue state' using errcode='22023';end if;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into answer from (
   select id,kind,url,summary,evidence,state,revision,created_at,review_note from atlas_ops.submissions
   where state=coalesce(p_data->>'state','pending') and (p_data->>'before' is null or created_at<(p_data->>'before')::timestamptz)
   order by created_at desc,id limit 30)t;
  return jsonb_build_object('items',answer);
 elsif p_action='submissions_review' then
  if p_data->>'state' not in ('pending','reviewed','archived') or coalesce(length(p_data->>'note'),0)>2000 then raise exception 'Invalid review' using errcode='22023';end if;
  update atlas_ops.submissions set state=p_data->>'state',review_note=coalesce(p_data->>'note',''),revision=revision+1,updated_at=now()
   where id=(p_data->>'id')::uuid and revision=(p_data->>'expected_revision')::integer and state<>'withdrawn' returning * into saved;
  if not found then raise exception 'The submission changed. Refresh the queue' using errcode='40001';end if;
  insert into app_private.audit_events(actor_id,action,target,details) values(actor,'submission_review',saved.id::text,jsonb_build_object('state',saved.state,'revision',saved.revision));
  return jsonb_build_object('id',saved.id,'state',saved.state,'revision',saved.revision);
 else raise exception 'Unknown operation' using errcode='22023';
 end if;
end $$;
create function public.atlas_admin_operations(p_action text,p_grant_hash text,p_data jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$ select atlas_ops.admin(p_action,p_grant_hash,p_data) $$;

revoke all on all functions in schema atlas_ops from public,anon,authenticated,service_role;
revoke all on function public.atlas_submit(text,text,text,text,text),public.atlas_withdraw(text),public.atlas_admin_operations(text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function atlas_ops.submit(text,text,text,text,text),atlas_ops.withdraw(text),public.atlas_submit(text,text,text,text,text),public.atlas_withdraw(text) to anon,authenticated;
grant execute on function atlas_ops.can_upload_templates(),atlas_ops.admin(text,text,jsonb),public.atlas_admin_operations(text,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
