-- One verified owner, fresh TOTP grants, draft-only resumable imports.
create table app_private.owner_config (
 id smallint primary key check(id=1), owner_email text not null check(owner_email=lower(trim(owner_email))),
 user_id uuid unique references auth.users(id), enabled boolean not null default true, max_catalog_rows integer not null default 1000 check(max_catalog_rows between 1 and 100000)
);
alter table app_private.owner_config enable row level security;
revoke all on app_private.owner_config from public,anon,authenticated;
alter table app_private.admin_sessions add column mfa_verified_at timestamptz;
alter table app_private.admin_sessions add column factor_id uuid references auth.mfa_factors(id) on delete set null;
create index admin_sessions_factor on app_private.admin_sessions(factor_id);
alter table app_private.admin_challenges add column attempts smallint not null default 0 check(attempts between 0 and 6);
create index admin_challenges_provider_expiry on app_private.admin_challenges(provider_session_id,expires_at);
alter table public.resources add column license text not null default '' check(length(license)<=240);
alter table public.resources add column access_limits text not null default '' check(length(access_limits)<=4000);
alter table public.resources add column reviewed_at timestamptz;
alter table app_private.import_jobs add column archived_rows integer not null default 0;
alter table app_private.import_jobs add column received_rows integer not null default 0;
alter table app_private.import_jobs add column duplicate_rows integer not null default 0;
alter table app_private.import_jobs add column before_total bigint not null default 0;
alter table app_private.import_jobs add column after_total bigint;
alter table app_private.import_jobs add column finished_at timestamptz;
create unique index import_job_owner_file on app_private.import_jobs(actor_id,file_hash);
create index admin_sessions_owner on app_private.admin_sessions(user_id);

create function app_private.owner_context(actor uuid,provider uuid) returns void
language plpgsql security definer set search_path='' as $$
declare configured app_private.owner_config; account_email text;
begin
 select * into configured from app_private.owner_config where id=1 for update;
 select lower(u.email) into account_email from auth.users u join auth.sessions s on s.user_id=u.id
  where u.id=actor and s.id=provider and u.email_confirmed_at is not null and u.deleted_at is null and (s.not_after is null or s.not_after>now());
 if not found or not coalesce(configured.enabled,false) or account_email<>configured.owner_email or
   (configured.user_id is not null and configured.user_id<>actor) then raise exception 'Admin access is locked' using errcode='42501';end if;
 if configured.user_id is null then update app_private.owner_config set user_id=actor where id=1;end if;
 insert into app_private.admin_members(user_id,role,enabled) values(actor,'owner',true) on conflict(user_id) do nothing;
 if not exists(select 1 from app_private.admin_members where user_id=actor and role='owner' and enabled) then raise exception 'Admin access is locked' using errcode='42501';end if;
end $$;

create or replace function app_private.assert_admin(actor uuid,provider uuid,grant_hash text,fresh_seconds integer default 0)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform app_private.owner_context(actor,provider);
 if not exists(select 1 from app_private.admin_sessions s join app_private.admin_members m on m.user_id=s.user_id join auth.sessions a on a.id=s.provider_session_id and a.user_id=m.user_id
  where s.token_hash=grant_hash and s.user_id=actor and s.provider_session_id=provider and m.enabled and s.revoked_at is null and
    exists(select 1 from auth.mfa_factors f where f.id=s.factor_id and f.user_id=actor and f.status='verified' and f.factor_type='totp') and s.mfa_verified_at is not null and s.mfa_verified_at>=s.created_at-interval '5 seconds' and
    s.expires_at>now() and s.last_activity_at>now()-interval '5 minutes' and (a.not_after is null or a.not_after>now()) and
    (fresh_seconds=0 or s.mfa_verified_at>now()-make_interval(secs=>fresh_seconds))) then raise exception 'Admin access is locked' using errcode='42501';end if;
 update app_private.admin_sessions set last_activity_at=now() where token_hash=grant_hash;
end $$;

create function public.admin_execute(p_action text,p_actor uuid,p_provider uuid,p_grant_hash text default null,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare challenge app_private.admin_challenges; job app_private.import_jobs; target text; record_data jsonb; rows_added integer;
 row_count integer; before_count bigint; result jsonb; matched_count integer; published_count bigint; draft_count bigint;
begin
 perform app_private.owner_context(p_actor,p_provider);
 if p_action='owner' then
  return jsonb_build_object('owner',true,'has_verified_totp',exists(select 1 from auth.mfa_factors where user_id=p_actor and factor_type='totp' and status='verified'));
 elsif p_action='challenge_start' then
  if (select count(*) from app_private.admin_challenges where provider_session_id=p_provider and expires_at>now()-interval '1 minute')>=3 then raise exception 'Wait before requesting another code' using errcode='54000';end if;
  if not exists(select 1 from auth.mfa_factors f where f.id=(p_data->>'factor_id')::uuid and f.user_id=p_actor and f.factor_type='totp' and
     (f.status='verified' or not exists(select 1 from auth.mfa_factors v where v.user_id=p_actor and v.status='verified' and v.factor_type='totp'))) then raise exception 'Authenticator is unavailable' using errcode='42501';end if;
  if p_data->>'nonce_hash' !~ '^[a-f0-9]{64}$' then raise exception 'Invalid challenge';end if;
  insert into app_private.admin_challenges(nonce_hash,provider_session_id,factor_id,challenge_id,expires_at)
   values(p_data->>'nonce_hash',p_provider,(p_data->>'factor_id')::uuid,(p_data->>'challenge_id')::uuid,least((p_data->>'expires_at')::timestamptz,now()+interval '2 minutes'));
  return jsonb_build_object('started',true);
 elsif p_action='challenge_get' then
  select * into challenge from app_private.admin_challenges where nonce_hash=p_data->>'nonce_hash' and provider_session_id=p_provider for update;
  if not found or challenge.used_at is not null or challenge.expires_at<=now() or challenge.attempts>=6 then raise exception 'Request a new authenticator challenge' using errcode='42501';end if;
  update app_private.admin_challenges set attempts=attempts+1 where nonce_hash=challenge.nonce_hash;
  return jsonb_build_object('factor_id',challenge.factor_id,'challenge_id',challenge.challenge_id);
 elsif p_action='challenge_consume' then
  select * into challenge from app_private.admin_challenges where nonce_hash=p_data->>'nonce_hash' and provider_session_id=p_provider for update;
  if not found or challenge.used_at is not null or challenge.expires_at<=now() or not exists(select 1 from auth.mfa_factors where id=challenge.factor_id and user_id=p_actor and status='verified' and factor_type='totp') or p_data->>'grant_hash' !~ '^[a-f0-9]{64}$' then raise exception 'Admin access is locked' using errcode='42501';end if;
  update app_private.admin_challenges set used_at=now() where nonce_hash=challenge.nonce_hash;
  insert into app_private.admin_sessions(token_hash,user_id,provider_session_id,created_at,expires_at,last_activity_at,mfa_verified_at,factor_id)
   values(p_data->>'grant_hash',p_actor,p_provider,now(),now()+interval '10 minutes',now(),now(),challenge.factor_id)
   on conflict(provider_session_id) do update set token_hash=excluded.token_hash,created_at=excluded.created_at,expires_at=excluded.expires_at,last_activity_at=excluded.last_activity_at,mfa_verified_at=excluded.mfa_verified_at,factor_id=excluded.factor_id,revoked_at=null;
  insert into app_private.audit_events(actor_id,action,target) values(p_actor,'admin.unlocked',p_provider::text);
  return jsonb_build_object('expires_at',now()+interval '10 minutes','idle_seconds',300);
 elsif p_action='revoke' then
  update app_private.admin_sessions set revoked_at=now() where user_id=p_actor and provider_session_id=p_provider and token_hash=p_grant_hash and revoked_at is null;
  return jsonb_build_object('locked',true);
 end if;
 perform app_private.assert_admin(p_actor,p_provider,p_grant_hash,case when p_action in ('import_start','import_rollback','publish') then 120 else 0 end);
 if p_action='overview' then
  select count(*),count(*) filter(where publication='published'),count(*) filter(where publication='draft') into before_count,published_count,draft_count from public.resources;
  return jsonb_build_object('total',before_count,'published',published_count,'draft',draft_count,
   'jobs',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select id,total_rows,received_rows,saved_rows,duplicate_rows,status,before_total,after_total,created_at from app_private.import_jobs where actor_id=p_actor order by created_at desc limit 10) x));
 elsif p_action='list' then
  return jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from
   (select r.* from public.resources r where (p_data->>'after' is null or r.id>p_data->>'after') and
    (coalesce(p_data->>'query','')='' or r.display_name ilike '%'||replace(replace(left(p_data->>'query',120),'%','\%'),'_','\_')||'%') order by r.id limit 31) x));
 elsif p_action='save' then
  record_data:=p_data->'record';target:=record_data->>'id';
  if p_data->>'expected_revision' is null then
   insert into public.resources(id,slug,display_name,canonical_url,short_summary,editorial_description,category_id,resource_type,pricing_model,signup_required,platforms,tags,image_url,image_alt,media_rights,mobile_platforms,mobile,source_urls,source_verified_at,license,access_limits)
    values(target,record_data->>'slug',record_data->>'display_name',record_data->>'canonical_url',record_data->>'short_summary',coalesce(record_data->>'editorial_description',''),record_data->>'category_id',record_data->>'resource_type',record_data->>'pricing_model',(record_data->>'signup_required')::boolean,array(select jsonb_array_elements_text(record_data->'platforms')),array(select jsonb_array_elements_text(record_data->'tags')),record_data->>'image_url',coalesce(record_data->>'image_alt',''),record_data->>'media_rights',array(select jsonb_array_elements_text(record_data->'mobile_platforms')),nullif(record_data->'mobile','null'::jsonb),array(select jsonb_array_elements_text(record_data->'source_urls')),(record_data->>'source_verified_at')::timestamptz,coalesce(record_data->>'license',''),coalesce(record_data->>'access_limits',''));
  else
   update public.resources set canonical_url=record_data->>'canonical_url',category_id=record_data->>'category_id',resource_type=record_data->>'resource_type',signup_required=(record_data->>'signup_required')::boolean,platforms=array(select jsonb_array_elements_text(record_data->'platforms')),tags=array(select jsonb_array_elements_text(record_data->'tags')),image_url=record_data->>'image_url',image_alt=coalesce(record_data->>'image_alt',''),media_rights=record_data->>'media_rights',mobile_platforms=array(select jsonb_array_elements_text(record_data->'mobile_platforms')),mobile=nullif(record_data->'mobile','null'::jsonb),source_urls=array(select jsonb_array_elements_text(record_data->'source_urls')),publication='draft',reviewed_at=null,display_name=record_data->>'display_name',short_summary=record_data->>'short_summary',editorial_description=coalesce(record_data->>'editorial_description',''),pricing_model=record_data->>'pricing_model',source_verified_at=(record_data->>'source_verified_at')::timestamptz,license=coalesce(record_data->>'license',''),access_limits=coalesce(record_data->>'access_limits',''),revision=revision+1,updated_at=now()
    where id=target and revision=(p_data->>'expected_revision')::integer;
   if not found then raise exception 'Resource changed; reload before editing' using errcode='40001';end if;
  end if;
  insert into app_private.audit_events(actor_id,action,target) values(p_actor,'resource.saved',target);
  return jsonb_build_object('saved',true);
 elsif p_action='publish' then
  target:=p_data->>'id';
  if not coalesce((p_data->>'reviewed_sources')::boolean,false) then raise exception 'Confirm original-source review';end if;
  update public.resources set publication='published',reviewed_at=now(),updated_at=now(),revision=revision+1 where id=target and revision=(p_data->>'expected_revision')::integer and pricing_model not in ('unknown','paid') and source_verified_at between now()-interval '1 year' and now()+interval '5 minutes' and (pricing_model<>'open_source' or length(license)>=2) and cardinality(source_urls)>0 and length(short_summary)>=60 and length(editorial_description)>=180 and length(access_limits)>=30 and (image_url is null or media_rights in ('official_permission','license_verified','original'));
  if not found then raise exception 'Publication needs source review, free-use limits, original details and the current revision' using errcode='23514';end if;
  insert into app_private.audit_events(actor_id,action,target) values(p_actor,'resource.published',target);
  return jsonb_build_object('published',true,'seo_approval','separate');
 elsif p_action='import_start' then
  if p_data->>'file_hash' !~ '^[a-f0-9]{64}$' or (p_data->>'total_rows')::integer not between 1 and 50000 then raise exception 'Invalid import';end if;
  select count(*) into before_count from public.resources;
  if not exists(select 1 from app_private.import_jobs where actor_id=p_actor and file_hash=p_data->>'file_hash') and ((p_data->>'total_rows')::integer+before_count>(select max_catalog_rows from app_private.owner_config where id=1) or pg_database_size(current_database())>419430400) then raise exception 'Capacity checkpoint required before another import' using errcode='54000';end if;
  insert into app_private.import_jobs(actor_id,file_hash,total_rows,status,before_total) values(p_actor,p_data->>'file_hash',(p_data->>'total_rows')::integer,'running',before_count) on conflict(actor_id,file_hash) do nothing;
  select * into job from app_private.import_jobs where actor_id=p_actor and file_hash=p_data->>'file_hash';
  if job.total_rows<>(p_data->>'total_rows')::integer then raise exception 'This import file changed';end if;
  return to_jsonb(job);
 elsif p_action in ('import_batch','import_status','import_rollback') then
  select * into job from app_private.import_jobs where id=(p_data->>'job_id')::uuid and actor_id=p_actor for update;
  if not found then raise exception 'Import not found' using errcode='42501';end if;
  if p_action='import_status' then return to_jsonb(job);end if;
  if p_action='import_rollback' then
   if job.status='rolled_back' then return jsonb_build_object('archived',job.archived_rows,'untouched',job.saved_rows-job.archived_rows);end if;
   with changed as(update public.resources r set publication='discontinued',revision=revision+1,updated_at=now() where r.publication='draft' and r.revision=1 and exists(select 1 from app_private.import_items i where i.job_id=job.id and i.resource_id=r.id and (i.after_payload->>'inserted')::boolean) returning r.id) select count(*) into rows_added from changed;
   update app_private.import_jobs set status='rolled_back',archived_rows=rows_added,finished_at=now() where id=job.id;
   insert into app_private.audit_events(actor_id,action,target,details) values(p_actor,'import.drafts_archived',job.id::text,jsonb_build_object('archived',rows_added));
   return jsonb_build_object('archived',rows_added,'untouched',job.saved_rows-rows_added);
  end if;
  row_count:=jsonb_array_length(p_data->'rows');
  if row_count not between 1 and 100 or (p_data->>'offset')::integer<0 or (p_data->>'offset')::integer+row_count>job.total_rows then raise exception 'Invalid import batch';end if;
  if (p_data->>'offset')::integer<job.received_rows then
   select count(*) into matched_count from jsonb_array_elements(p_data->'rows') with ordinality x(value,n) join app_private.import_items i on i.job_id=job.id and i.row_number=(p_data->>'offset')::integer+x.n and i.after_payload->>'fingerprint'=encode(sha256(convert_to(x.value::text,'UTF8')),'hex');
   if matched_count<>row_count then raise exception 'Retry payload differs from the saved batch' using errcode='23514';end if;
   return to_jsonb(job);
  end if;
  if job.status<>'running' or (p_data->>'offset')::integer<>job.received_rows then raise exception 'Import progress changed; refresh before retrying' using errcode='40001';end if;
  with incoming as materialized(select x.value d,x.n,(p_data->>'offset')::integer+x.n row_number,row_number() over(partition by x.value->>'canonical_url' order by x.n) url_rank from jsonb_array_elements(p_data->'rows') with ordinality x(value,n)),
  inserted as(insert into public.resources(id,slug,display_name,canonical_url,short_summary,editorial_description,category_id,resource_type,pricing_model,signup_required,platforms,tags,image_url,image_alt,media_rights,mobile_platforms,mobile,source_urls,source_verified_at,license,access_limits)
   select d->>'id',d->>'slug',d->>'display_name',d->>'canonical_url',d->>'short_summary',coalesce(d->>'editorial_description',''),d->>'category_id',d->>'resource_type',d->>'pricing_model',(d->>'signup_required')::boolean,array(select jsonb_array_elements_text(d->'platforms')),array(select jsonb_array_elements_text(d->'tags')),d->>'image_url',coalesce(d->>'image_alt',''),d->>'media_rights',array(select jsonb_array_elements_text(d->'mobile_platforms')),nullif(d->'mobile','null'::jsonb),array(select jsonb_array_elements_text(d->'source_urls')),(d->>'source_verified_at')::timestamptz,coalesce(d->>'license',''),coalesce(d->>'access_limits','') from incoming where url_rank=1 on conflict(canonical_url) do nothing returning id),
  ledger as(insert into app_private.import_items(job_id,row_number,resource_id,after_payload)
   select job.id,i.row_number::integer,i.d->>'id',jsonb_build_object('fingerprint',encode(sha256(convert_to(i.d::text,'UTF8')),'hex'),'inserted',n.id is not null and i.url_rank=1) from incoming i left join inserted n on n.id=i.d->>'id' returning row_number)
  select count(*) into rows_added from inserted;
  if (select count(*) from public.resources)>(select max_catalog_rows from app_private.owner_config where id=1) or pg_database_size(current_database())>419430400 then raise exception 'Capacity checkpoint required before another import' using errcode='54000';end if;
  update app_private.import_jobs set received_rows=received_rows+row_count,saved_rows=saved_rows+rows_added,duplicate_rows=duplicate_rows+row_count-rows_added where id=job.id returning * into job;
  if job.received_rows=job.total_rows then
   update app_private.import_jobs set status='completed',finished_at=now(),after_total=(select count(*) from public.resources) where id=job.id returning * into job;
   insert into app_private.audit_events(actor_id,action,target,details) values(p_actor,'import.completed',job.id::text,jsonb_build_object('saved',job.saved_rows,'duplicates',job.duplicate_rows));
  end if;
  return to_jsonb(job);
 end if;
 raise exception 'Unknown admin operation';
end $$;
revoke all on function public.admin_execute(text,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_execute(text,uuid,uuid,text,jsonb) to service_role;
revoke all on function app_private.owner_context(uuid,uuid) from public,anon,authenticated;
grant execute on function app_private.owner_context(uuid,uuid) to service_role;
