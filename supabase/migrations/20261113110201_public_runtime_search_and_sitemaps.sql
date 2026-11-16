-- Indexed runtime fields. Unknown facts never become positive filter claims.
alter table public.resources add column subcategory text not null default '' check(length(subcategory)<=100);
alter table public.resources add column minimum_ram_gb integer check(minimum_ram_gb between 1 and 1024);
alter table public.resources add column workload_ram jsonb not null default '{}' check(jsonb_typeof(workload_ram)='object');
alter table public.resources add column dedicated_gpu text not null default 'Unknown' check(dedicated_gpu in ('Yes','No','Optional','Unknown'));
alter table public.resources add column requirement_sources text[] not null default '{}';
create index resources_subcategory on public.resources(category_id,subcategory,id) where publication='published';
create index resources_reviewed on public.resources(source_verified_at desc nulls last,id) where publication='published';
create index resources_minimum_ram on public.resources(minimum_ram_gb,id) where publication='published';
create index resources_mobile_platforms on public.resources using gin(mobile_platforms) where publication='published';
create function public.catalog_stats() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('total',(select count(*) from public.resources where publication='published'),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('category',c.category_id,'subcategory',c.subcategory,'count',c.n))
 from(select category_id,subcategory,count(*) as n from public.resources where publication='published' group by category_id,subcategory) c),'[]'::jsonb),
 'revision',(select coalesce(max(updated_at)::text,'empty') from public.resources where publication='published'))
$$;
revoke all on function public.catalog_stats() from public;
grant execute on function public.catalog_stats() to anon,authenticated;

create function public.sitemap_snapshot(p_group text default null,p_locale text default 'en',p_page integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare output jsonb;
begin
 if p_page<0 or p_page>100 or length(coalesce(p_group,''))>40 or p_locale !~ '^[a-z]{2}(-[a-z]{2})?$' then raise exception 'Invalid sitemap bounds' using errcode='22023';end if;
 if p_group is null then
  select jsonb_build_object('groups',coalesce(jsonb_agg(to_jsonb(g)),'[]')) into output from
   (select sitemap_group,locale,count(*) as count from public.approved_canonicals group by sitemap_group,locale order by sitemap_group,locale) g;
 else
  select jsonb_build_object('urls',coalesce(jsonb_agg(to_jsonb(u)),'[]')) into output from
   (select canonical_url,locale,last_meaningful_change from public.approved_canonicals
    where sitemap_group=p_group and locale=p_locale order by canonical_url limit 1000 offset p_page*1000) u;
 end if;
 return output;
end $$;
revoke all on function public.sitemap_snapshot(text,text,integer) from public;
grant execute on function public.sitemap_snapshot(text,text,integer) to anon,authenticated;

create function public.resource_search_v2(p_query text default '',p_category text default null,p_platform text default null,p_country text default null,p_pricing text default null,p_no_signup boolean default false,p_mobile text default null,p_after text default null,p_limit integer default 24,p_filters jsonb default '{}')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare normalized text;expanded text;extra text;v_term text;terms text[];query tsquery;where_sql text;stmt text;answer jsonb;cursor_data jsonb;cursor_id text;cursor_rank real;fuzzy boolean:=false;items jsonb;last_row jsonb;order_sql text;cursor_sql text;cursor_name text;cursor_checked timestamptz;v_sort text;
begin
 p_query:=coalesce(p_query,'');
 if p_limit is null or p_limit not between 1 and 30 or length(p_query)>160 or coalesce(length(p_after),0)>700 then raise exception 'Search bounds exceeded';end if;
 if coalesce(length(p_category),0)>80 or coalesce(length(p_platform),0)>80 or (p_pricing is not null and p_pricing not in ('unknown','free_forever','open_source','freemium','trial')) then raise exception 'Invalid search filter';end if;
 if p_mobile is not null and p_mobile not in ('android','ios','both') then raise exception 'Invalid mobile platform';end if;
 if p_country is not null and p_country not in ('US','GB','CA','AU') then raise exception 'Unsupported country';end if;
 if p_after is not null then cursor_data:=p_after::jsonb;cursor_id:=cursor_data->>'id';cursor_rank:=(cursor_data->>'rank')::real;fuzzy:=coalesce((cursor_data->>'fuzzy')::boolean,false);if cursor_id is null or cursor_id !~ '^[a-zA-Z0-9_-]{1,80}$' or cursor_rank<0 or cursor_rank>10000 or cursor_rank is null then raise exception 'Invalid cursor';end if;end if;
 if jsonb_typeof(p_filters)<>'object' or length(p_filters::text)>20000 then raise exception 'Invalid filters';end if;
 v_sort:=coalesce(p_filters->>'sort','featured');
 if v_sort not in ('featured','relevance','az','newest') then raise exception 'Invalid sort';end if;
 if p_after is not null then cursor_name:=cursor_data->>'name';cursor_checked:=nullif(cursor_data->>'checked','')::timestamptz;end if;
 normalized:=lower(trim(regexp_replace(p_query,'[^[:alnum:] _-]',' ','g')));
 normalized:=trim(regexp_replace(normalized,'\m(free|tools|tool|apps|app|for|the|and|to|a)\M',' ','g'));
 if length(normalized)=1 then return jsonb_build_object('items','[]'::jsonb,'has_more',false,'suggestions',jsonb_build_array('Use a category or add another letter.'));end if;
 select array_to_string(l.expansions,' OR ') into extra from public.search_lexicon l where l.term=normalized;
 terms:=regexp_split_to_array(normalized,'\s+');if cardinality(terms)>16 then raise exception 'Too many search terms';end if;expanded:=normalized||case when extra is null then '' else ' OR '||extra end;
 foreach v_term in array terms loop
  select array_to_string(l.expansions,' OR ') into extra from public.search_lexicon l where l.term=v_term;
  if extra is not null then expanded:=expanded||' OR '||extra;end if;
 end loop;
 query:=websearch_to_tsquery('simple',expanded);where_sql:='r.publication=''published''';
 if normalized<>'' then where_sql:=where_sql||' and r.search_vector @@ $1';end if;
 if p_category is not null then where_sql:=where_sql||' and r.category_id=$2';end if;
 if p_platform is not null then where_sql:=where_sql||' and r.platforms @> array[$3]::text[]';end if;
 if p_country is not null then where_sql:=where_sql||' and exists(select 1 from public.resource_countries c where c.resource_id=r.id and c.country=$4 and c.availability=''available'')';end if;
 if p_pricing is not null then where_sql:=where_sql||' and r.pricing_model=$5';end if;
 if p_no_signup then where_sql:=where_sql||' and r.signup_required=false';end if;
 if p_mobile='both' then where_sql:=where_sql||' and r.mobile_platforms @> array[''android'',''ios'']::text[]';elsif p_mobile is not null then where_sql:=where_sql||' and $6=any(r.mobile_platforms)';end if;

 if p_filters->>'reviewed'='1' then where_sql:=where_sql||' and r.source_verified_at is not null';end if;
 if nullif(p_filters->>'subcategory','') is not null then where_sql:=where_sql||' and r.subcategory=$12->>''subcategory''';end if;
 if nullif(p_filters->>'kind','') is not null then where_sql:=where_sql||' and r.resource_type=$12->>''kind''';end if;
 if p_filters ? 'ids' then
  if jsonb_typeof(p_filters->'ids')<>'array' or jsonb_array_length(p_filters->'ids')>500 then raise exception 'Invalid saved IDs';end if;
  where_sql:=where_sql||' and r.id in (select jsonb_array_elements_text($12->''ids''))';
 end if;
 if nullif(p_filters->>'signup','') is not null then where_sql:=where_sql||' and r.signup_required=($12->>''signup'')::boolean';end if;
 if nullif(p_filters->>'offline','') is not null then where_sql:=where_sql||' and r.offline_support=$12->>''offline''';end if;
 if nullif(p_filters->>'gpu','') is not null then where_sql:=where_sql||' and r.dedicated_gpu=$12->>''gpu''';end if;
 if nullif(p_filters->>'ram','') is not null then
  if (p_filters->>'ram')::integer not between 1 and 1024 then raise exception 'Invalid memory filter';end if;
  if nullif(p_filters->>'workload','') is null then where_sql:=where_sql||' and r.minimum_ram_gb<=($12->>''ram'')::integer';
  else where_sql:=where_sql||' and (r.workload_ram->>($12->>''workload''))::integer<=($12->>''ram'')::integer';end if;
 end if;
 if v_sort='az' then
  order_sql:='c.sort_name,c.id';cursor_sql:='$7::text is null or (sort_name,id)>($13::text,$7)';
 elsif v_sort='newest' then
  order_sql:='c.sort_checked desc nulls last,c.id';
  cursor_sql:='$7::text is null or (sort_checked<$14::timestamptz or (sort_checked=$14::timestamptz and id>$7) or (sort_checked is null and ($14::timestamptz is not null or id>$7)))';
 else
  order_sql:='c.relevance desc,c.id';cursor_sql:='$7::text is null or relevance<$10 or (relevance=$10 and id>$7)';
 end if;
 for attempt in 1..2 loop
  stmt:='with matched as (select r.id,r.slug,r.display_name,r.short_summary,r.canonical_url,r.category_id,r.resource_type,r.pricing_model,r.platforms,r.signup_required,r.offline_support,r.mobile_platforms,r.mobile,r.image_url,r.image_alt,r.subcategory,r.license,r.access_limits,r.source_verified_at,r.source_urls,r.minimum_ram_gb,r.workload_ram,r.dedicated_gpu,r.requirement_sources,lower(r.display_name) as sort_name,r.source_verified_at as sort_checked,((case when lower(r.display_name)=$9 then 100 else 0 end)+ts_rank_cd(r.search_vector,$1)+(case when $11 then extensions.similarity(r.display_name,$9) else 0 end))::real as relevance from public.resources r where '||case when fuzzy then replace(where_sql,'r.search_vector @@ $1','r.display_name operator(extensions.%) $9') else where_sql end||') select jsonb_build_object(''items'',coalesce(jsonb_agg(to_jsonb(c) order by '||order_sql||'),''[]''::jsonb)) from (select * from matched c where '||cursor_sql||' order by '||order_sql||' limit $8) c';
  execute stmt into answer using query,p_category,p_platform,p_country,p_pricing,p_mobile,cursor_id,p_limit+1,normalized,cursor_rank,fuzzy,p_filters,cursor_name,cursor_checked;
  exit when jsonb_array_length(answer->'items')>0 or length(normalized)<3 or fuzzy or p_after is not null;fuzzy:=true;
 end loop;
 items:=answer->'items';if jsonb_array_length(items)>p_limit then items:=items-p_limit;last_row:=items->(p_limit-1);return jsonb_build_object('items',items,'ranking_scope','all_matching_resources','has_more',true,'next_cursor',jsonb_build_object('id',last_row->>'id','rank',last_row->'relevance','fuzzy',fuzzy,'name',last_row->'sort_name','checked',last_row->'sort_checked'));end if;
 return jsonb_build_object('items',items,'ranking_scope','all_matching_resources','has_more',false,'next_cursor',null);
end $$;
revoke all on function public.resource_search_v2(text,text,text,text,text,boolean,text,text,integer,jsonb) from public;
grant execute on function public.resource_search_v2(text,text,text,text,text,boolean,text,text,integer,jsonb) to anon,authenticated;


-- Preserve import retry/ledger semantics while retaining structured facts.
create or replace function public.admin_execute_v1(p_action text,p_actor uuid,p_provider uuid,p_grant_hash text default null,p_data jsonb default '{}')
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
   insert into public.resources(id,slug,display_name,canonical_url,short_summary,editorial_description,category_id,resource_type,pricing_model,signup_required,platforms,tags,image_url,image_alt,media_rights,mobile_platforms,mobile,source_urls,source_verified_at,license,access_limits,subcategory,minimum_ram_gb,workload_ram,dedicated_gpu,requirement_sources,offline_support)
    values(target,record_data->>'slug',record_data->>'display_name',record_data->>'canonical_url',record_data->>'short_summary',coalesce(record_data->>'editorial_description',''),record_data->>'category_id',record_data->>'resource_type',record_data->>'pricing_model',(record_data->>'signup_required')::boolean,array(select jsonb_array_elements_text(record_data->'platforms')),array(select jsonb_array_elements_text(record_data->'tags')),record_data->>'image_url',coalesce(record_data->>'image_alt',''),record_data->>'media_rights',array(select jsonb_array_elements_text(record_data->'mobile_platforms')),nullif(record_data->'mobile','null'::jsonb),array(select jsonb_array_elements_text(record_data->'source_urls')),(record_data->>'source_verified_at')::timestamptz,coalesce(record_data->>'license',''),coalesce(record_data->>'access_limits',''),coalesce(record_data->>'subcategory',''),nullif(record_data->>'minimum_ram_gb','')::integer,coalesce(record_data->'workload_ram','{}'::jsonb),coalesce(record_data->>'dedicated_gpu','Unknown'),array(select jsonb_array_elements_text(coalesce(record_data->'requirement_sources','[]'))),coalesce(record_data->>'offline_support','unknown'));
  else
   update public.resources set canonical_url=record_data->>'canonical_url',category_id=record_data->>'category_id',resource_type=record_data->>'resource_type',signup_required=(record_data->>'signup_required')::boolean,platforms=array(select jsonb_array_elements_text(record_data->'platforms')),tags=array(select jsonb_array_elements_text(record_data->'tags')),image_url=record_data->>'image_url',image_alt=coalesce(record_data->>'image_alt',''),media_rights=record_data->>'media_rights',mobile_platforms=array(select jsonb_array_elements_text(record_data->'mobile_platforms')),mobile=nullif(record_data->'mobile','null'::jsonb),source_urls=array(select jsonb_array_elements_text(record_data->'source_urls')),publication='draft',reviewed_at=null,display_name=record_data->>'display_name',short_summary=record_data->>'short_summary',editorial_description=coalesce(record_data->>'editorial_description',''),pricing_model=record_data->>'pricing_model',source_verified_at=(record_data->>'source_verified_at')::timestamptz,license=coalesce(record_data->>'license',''),access_limits=coalesce(record_data->>'access_limits',''),subcategory=coalesce(record_data->>'subcategory',''),minimum_ram_gb=nullif(record_data->>'minimum_ram_gb','')::integer,workload_ram=coalesce(record_data->'workload_ram','{}'::jsonb),dedicated_gpu=coalesce(record_data->>'dedicated_gpu','Unknown'),requirement_sources=array(select jsonb_array_elements_text(coalesce(record_data->'requirement_sources','[]'))),offline_support=coalesce(record_data->>'offline_support','unknown'),revision=revision+1,updated_at=now()
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
  inserted as(insert into public.resources(id,slug,display_name,canonical_url,short_summary,editorial_description,category_id,resource_type,pricing_model,signup_required,platforms,tags,image_url,image_alt,media_rights,mobile_platforms,mobile,source_urls,source_verified_at,license,access_limits,subcategory,minimum_ram_gb,workload_ram,dedicated_gpu,requirement_sources,offline_support)
   select d->>'id',d->>'slug',d->>'display_name',d->>'canonical_url',d->>'short_summary',coalesce(d->>'editorial_description',''),d->>'category_id',d->>'resource_type',d->>'pricing_model',(d->>'signup_required')::boolean,array(select jsonb_array_elements_text(d->'platforms')),array(select jsonb_array_elements_text(d->'tags')),d->>'image_url',coalesce(d->>'image_alt',''),d->>'media_rights',array(select jsonb_array_elements_text(d->'mobile_platforms')),nullif(d->'mobile','null'::jsonb),array(select jsonb_array_elements_text(d->'source_urls')),(d->>'source_verified_at')::timestamptz,coalesce(d->>'license',''),coalesce(d->>'access_limits',''),coalesce(d->>'subcategory',''),nullif(d->>'minimum_ram_gb','')::integer,coalesce(d->'workload_ram','{}'::jsonb),coalesce(d->>'dedicated_gpu','Unknown'),array(select jsonb_array_elements_text(coalesce(d->'requirement_sources','[]'))),coalesce(d->>'offline_support','unknown') from incoming where url_rank=1 on conflict(canonical_url) do nothing returning id),
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
