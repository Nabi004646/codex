-- Staging only. Password knowledge checks supplement, never replace, owner + MFA.
create table app_private.password_checks(
 id smallint primary key check(id=1),
 question text not null check(length(question) between 3 and 160),
 answer_salt text not null check(answer_salt ~ '^[a-f0-9]{64}$'),
 answer_digest text not null check(answer_digest ~ '^[a-f0-9]{64}$'),
 iterations integer not null default 600000 check(iterations between 100000 and 2000000)
);
create table app_private.password_attempts(
 user_id uuid primary key references auth.users(id),
 window_started timestamptz not null default now(),
 attempts integer not null default 0 check(attempts between 0 and 5),
 attempt_id uuid, provider_session_id uuid, grant_hash text,
 attempted_at timestamptz, consumed boolean not null default false
);
alter table app_private.password_checks enable row level security;
alter table app_private.password_attempts enable row level security;
revoke all on app_private.password_checks,app_private.password_attempts from public,anon,authenticated;
alter function public.admin_execute(text,uuid,uuid,text,jsonb) rename to admin_execute_v1;
create function public.admin_execute(p_action text,p_actor uuid,p_provider uuid,p_grant_hash text default null,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare config app_private.password_checks; attempt app_private.password_attempts; passed boolean;
begin
 if p_action not in ('password_info','password_material','password_check','password_result') then
  return public.admin_execute_v1(p_action,p_actor,p_provider,p_grant_hash,p_data);
 end if;
 perform app_private.assert_admin(p_actor,p_provider,p_grant_hash,
  case when p_action in ('password_material','password_check') then 60 else 0 end);
 select * into config from app_private.password_checks where id=1;
 if p_action='password_info' then
  return jsonb_build_object('configured',config.id is not null,'question',config.question);
 end if;
 if p_action='password_result' then
  -- Results are audited through a separate service-only function after grants lock.
  raise exception 'Use the service result function' using errcode='42501';
 end if;
 if config.id is null then return jsonb_build_object('configured',false);end if;
 if p_action='password_material' then
  insert into app_private.password_attempts(user_id) values(p_actor) on conflict do nothing;
  select * into attempt from app_private.password_attempts where user_id=p_actor for update;
  if attempt.window_started<=now()-interval '15 minutes' then
   update app_private.password_attempts set attempts=0,window_started=now() where user_id=p_actor;
   attempt.attempts:=0;
  end if;
  if attempt.attempts>=5 then
   return jsonb_build_object('rate_limited',true,'retry_after',greatest(1,ceil(extract(epoch from attempt.window_started+interval '15 minutes'-now()))));
  end if;
  update app_private.password_attempts set attempts=attempts+1,attempt_id=gen_random_uuid(),
   provider_session_id=p_provider,grant_hash=p_grant_hash,attempted_at=now(),consumed=false
   where user_id=p_actor returning * into attempt;
  return jsonb_build_object('configured',true,'salt',config.answer_salt,'iterations',config.iterations,'attempt_id',attempt.attempt_id);
 end if;
 select * into attempt from app_private.password_attempts where user_id=p_actor for update;
 if not found or attempt.consumed or attempt.attempted_at<=now()-interval '60 seconds' or
    attempt.attempt_id::text is distinct from p_data->>'attempt_id' or
    attempt.provider_session_id is distinct from p_provider or attempt.grant_hash is distinct from p_grant_hash then
  return jsonb_build_object('authorized',false);
 end if;
 update app_private.password_attempts set consumed=true where user_id=p_actor;
 passed:=coalesce((p_data->>'candidate') ~ '^[a-f0-9]{64}$' and p_data->>'candidate'=config.answer_digest,false);
 insert into app_private.audit_events(actor_id,action,target)
  values(p_actor,case when passed then 'password.change_authorized' else 'password.extra_check_failed' end,p_provider::text);
 if passed then
  update app_private.admin_sessions set revoked_at=now() where user_id=p_actor and revoked_at is null;
 end if;
 return jsonb_build_object('authorized',passed,'admin_grants_revoked',passed);
end $$;
revoke all on function public.admin_execute(text,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_execute(text,uuid,uuid,text,jsonb) to service_role;
-- No password, answer, nonce or token is accepted by this audit routine.
create function public.admin_password_result(p_actor uuid,p_provider uuid,p_success boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from app_private.password_attempts where user_id=p_actor and provider_session_id=p_provider and consumed and attempted_at>now()-interval '2 minutes') then
  raise exception 'No password operation' using errcode='42501';
 end if;
 insert into app_private.audit_events(actor_id,action,target)
 values(p_actor,case when p_success then 'password.changed' else 'password.provider_rejected' end,p_provider::text);
end $$;
revoke all on function public.admin_password_result(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_password_result(uuid,uuid,boolean) to service_role;
-- Additional staging control plane; appended to the new migration.
alter table public.seo_pages add column revision integer not null default 1;
create table public.site_redirects(
 source_path text primary key check(source_path ~ '^/[a-zA-Z0-9/_-]*$' and source_path<>'/'),
 target_path text, status smallint not null check(status in (301,308,410)),
 revision integer not null default 1, updated_at timestamptz not null default now(),
 check((status=410 and target_path is null) or (status in (301,308) and target_path ~ '^/[a-zA-Z0-9/_-]*$' and source_path<>target_path)),
 check(source_path !~ '^/(admin|api)(/|$)' and coalesce(target_path,'/') !~ '^/(admin|api)(/|$)')
);
alter table public.site_redirects enable row level security;
create policy redirect_read on public.site_redirects for select to anon,authenticated using(true);
grant select on public.site_redirects to anon,authenticated;
revoke insert,update,delete,truncate on public.site_redirects from anon,authenticated;
create function app_private.redirect_integrity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Keep every redirect a single hop; both new chains and reverse chains fail.
 if new.status<>410 and exists(select 1 from public.site_redirects where source_path=new.target_path) or
 exists(select 1 from public.site_redirects where target_path=new.source_path and source_path<>new.source_path) then
  raise exception 'Use a direct final destination, without chains or loops' using errcode='23514';
 end if;
 return new;
end $$;
create trigger redirect_integrity before insert or update on public.site_redirects for each row execute function app_private.redirect_integrity();
create trigger redirects_revision after insert or update or delete on public.site_redirects for each statement execute function app_private.bump_revision();

create function public.admin_editorial_execute(p_action text,p_actor uuid,p_provider uuid,p_grant_hash text,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare record_data jsonb; result jsonb; target uuid; changed integer; checks jsonb;
begin
 perform app_private.assert_admin(p_actor,p_provider,p_grant_hash,case when p_action in ('seo_approve','redirect_save','seo_retire') then 120 else 0 end);
 if p_action='seo_list' then
  return jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from
   (select * from public.seo_pages where(p_data->>'after' is null or id>(p_data->>'after')::uuid) order by id limit 31) x),
   'total',(select count(*) from public.seo_pages),
   'approved',(select count(*) from public.approved_canonicals));
 elsif p_action='seo_save' then
  record_data:=p_data->'record';
  if length(coalesce(record_data->>'title','')) not between 10 and 100 or length(coalesce(record_data->>'description','')) not between 40 and 300 or
     record_data->>'locale'<>'en' and not exists(select 1 from public.site_locales where locale=record_data->>'locale' and enabled and content_reviewed) then raise exception 'Review page metadata and language' using errcode='23514';end if;
  target:=coalesce(nullif(record_data->>'id','')::uuid,gen_random_uuid());
  if p_data->>'expected_revision' is null then
   insert into public.seo_pages(id,resource_id,path,locale,page_type,title,description,canonical_url,mapped_query,sitemap_group)
   values(target,nullif(record_data->>'resource_id',''),record_data->>'path',coalesce(record_data->>'locale','en'),coalesce(record_data->>'page_type','WebPage'),
    record_data->>'title',record_data->>'description','https://freeresourceatlas.com'||(record_data->>'path'),nullif(record_data->>'mapped_query',''),coalesce(record_data->>'sitemap_group','pages'));
  else
   update public.seo_pages set resource_id=nullif(record_data->>'resource_id',''),path=record_data->>'path',title=record_data->>'title',description=record_data->>'description',
    canonical_url='https://freeresourceatlas.com'||(record_data->>'path'),mapped_query=nullif(record_data->>'mapped_query',''),publication='draft',index_intent='noindex',
    quality_reviewed_at=null,reviewer_id=null,quality_checks='{}',revision=revision+1,last_meaningful_change=now()
   where id=target and revision=(p_data->>'expected_revision')::integer;
   get diagnostics changed=row_count;if changed<>1 then raise exception 'Content changed' using errcode='40001';end if;
  end if;
  insert into app_private.audit_events(actor_id,action,target) values(p_actor,'seo.draft_saved',target::text);
  select to_jsonb(p) into result from public.seo_pages p where id=target;return result;
 elsif p_action='seo_approve' then
  checks:=p_data->'checks';
  update public.seo_pages set publication='published',index_intent='index',quality_checks=checks,quality_reviewed_at=now(),reviewer_id=p_actor,
   revision=revision+1,last_meaningful_change=now()
  where id=(p_data->>'id')::uuid and revision=(p_data->>'expected_revision')::integer;
  get diagnostics changed=row_count;if changed<>1 then raise exception 'Content changed' using errcode='40001';end if;
  insert into app_private.audit_events(actor_id,action,target) values(p_actor,'seo.index_approved',p_data->>'id');
  return jsonb_build_object('approved',true);
 elsif p_action='seo_retire' then
  update public.seo_pages set publication='retired',index_intent='noindex',revision=revision+1,last_meaningful_change=now()
   where id=(p_data->>'id')::uuid and revision=(p_data->>'expected_revision')::integer;
  get diagnostics changed=row_count;if changed<>1 then raise exception 'Content changed' using errcode='40001';end if;
  insert into app_private.audit_events(actor_id,action,target) values(p_actor,'seo.retired',p_data->>'id');return jsonb_build_object('retired',true);
 elsif p_action='redirect_list' then
  return jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from
   (select * from public.site_redirects where(p_data->>'after' is null or source_path>p_data->>'after') order by source_path limit 31) x));
 elsif p_action='redirect_save' then
  record_data:=p_data->'record';
  if p_data->>'expected_revision' is null then
   insert into public.site_redirects(source_path,target_path,status) values(record_data->>'source_path',nullif(record_data->>'target_path',''),(record_data->>'status')::smallint);
  else
   update public.site_redirects set target_path=nullif(record_data->>'target_path',''),status=(record_data->>'status')::smallint,revision=revision+1,updated_at=now()
    where source_path=record_data->>'source_path' and revision=(p_data->>'expected_revision')::integer;
   get diagnostics changed=row_count;if changed<>1 then raise exception 'Content changed' using errcode='40001';end if;
  end if;
  insert into app_private.audit_events(actor_id,action,target) values(p_actor,'redirect.saved',record_data->>'source_path');return jsonb_build_object('saved',true);
 elsif p_action='audit_list' then
  return jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from
   (select e.id,e.action,e.target,e.created_at from app_private.audit_events e where(p_data->>'before' is null or id<(p_data->>'before')::bigint) order by id desc limit 31) x));
 elsif p_action='seo_health' then
  return jsonb_build_object('database_bytes',pg_database_size(current_database()),'catalog_count',(select count(*) from public.resources),
   'published',(select count(*) from public.resources where publication='published'),
   'approved_canonical_urls',(select count(*) from public.approved_canonicals),
   'catalog_capacity',(select max_catalog_rows from app_private.owner_config where id=1),
   'content_revision',(select value from app_private.content_revision where id=1),
   'integrations',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from app_private.integration_state s));
 end if;
 raise exception 'Unknown editorial operation' using errcode='22023';
end $$;
revoke all on function public.admin_editorial_execute(text,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_editorial_execute(text,uuid,uuid,text,jsonb) to service_role;
revoke all on function app_private.redirect_integrity() from public,anon,authenticated;
