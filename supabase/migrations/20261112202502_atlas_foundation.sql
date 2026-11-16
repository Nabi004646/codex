-- FreeResourceAtlas v2.5 foundation. NEW, EMPTY PROJECT ONLY.
-- LOCAL/STAGING proposal: no hosted execution is authorized by this file.
create schema if not exists extensions;
create schema if not exists app_private;
create extension if not exists pg_trgm with schema extensions;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant usage on schema extensions to anon,authenticated,service_role;
alter default privileges in schema public revoke execute on functions from public;

create function app_private.join_text(text[]) returns text language sql immutable security invoker set search_path='' as $$ select pg_catalog.array_to_string($1,' ') $$;

create table public.categories (
 id text primary key check(id ~ '^[a-z0-9-]{1,80}$'), name text not null,
 parent_id text references public.categories(id), sort_order smallint not null default 0,
 publication text not null default 'draft' check(publication in ('draft','published'))
);
create table public.resources (
 id text primary key check(id ~ '^[a-zA-Z0-9_-]{1,80}$'),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 display_name text not null check(length(display_name) between 2 and 180),
 canonical_url text not null unique check(canonical_url ~ '^https://[A-Za-z0-9.-]+(/|$)'),
 short_summary text not null check(length(short_summary) between 10 and 600),
 editorial_description text not null default '' check(length(editorial_description)<=16000),
 category_id text not null references public.categories(id),
 resource_type text not null check(resource_type in ('website','github_repo','learning','asset','template','mobile_app')),
 pricing_model text not null default 'unknown' check(pricing_model in ('unknown','free_forever','open_source','freemium','trial','paid')),
 signup_required boolean, offline_support text not null default 'unknown' check(offline_support in ('unknown','yes','limited','no')),
 platforms text[] not null default '{}', tags text[] not null default '{}', aliases text[] not null default '{}',
 image_url text, image_alt text not null default '', media_rights text not null default 'unreviewed',
 mobile_platforms text[] not null default '{}', mobile jsonb,
 source_urls text[] not null default '{}', source_verified_at timestamptz,
 publication text not null default 'draft' check(publication in ('draft','review','published','discontinued')),
 revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 search_vector tsvector generated always as (
  setweight(to_tsvector('simple',display_name),'A') ||
  setweight(to_tsvector('simple',app_private.join_text(aliases)),'A') ||
  setweight(to_tsvector('simple',app_private.join_text(tags)),'B') ||
  setweight(to_tsvector('simple',short_summary),'C')
 ) stored,
 check(cardinality(tags)<=20 and cardinality(aliases)<=20 and cardinality(platforms)<=8),
 check(not(publication='published' and pricing_model='paid'))
);
-- array_to_string is stable in PostgreSQL; wrap its fixed text[] form so the
-- generated expression is immutable (no locale-dependent element casts).
create index resources_fts_published on public.resources using gin(search_vector) where publication='published';
create index resources_category_id on public.resources(category_id,slug,id) where publication='published';
create index resources_name_exact on public.resources(lower(display_name),id) where publication='published';
create index resources_name_typo on public.resources using gin(display_name extensions.gin_trgm_ops) where publication='published';
create index resources_platforms on public.resources using gin(platforms) where publication='published';

create function app_private.valid_mobile(kind text, platforms text[], detail jsonb, state text, price text, checked timestamptz)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare p text; link text;
begin
 if kind<>'mobile_app' then return cardinality(platforms)=0 and detail is null; end if;
 if cardinality(platforms) not between 1 and 2 or not platforms <@ array['android','ios']::text[] or
    cardinality(platforms)<>(select count(distinct x) from unnest(platforms) x) or jsonb_typeof(detail)<>'object' then return false; end if;
 for p in select unnest(platforms) loop
  link:=detail->p->>'url';
  if p='android' and coalesce(link,'') !~ '^https://play\.google\.com/store/apps/details\?id=[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$' then return false; end if;
  if p='ios' and coalesce(link,'') !~ '^https://apps\.apple\.com/([a-z]{2}/)?app/[^?#]*/id[0-9]+/?$' then return false; end if;
  if state='published' and nullif(detail->p->>'verified_at','') is null then return false; end if;
 end loop;
 if exists(select 1 from jsonb_object_keys(detail) k where not k=any(platforms)) then return false; end if;
 if state='published' and (price not in ('free_forever','open_source','freemium') or checked is null) then return false; end if;
 return true;
end $$;
alter table public.resources add constraint mobile_store_integrity check(app_private.valid_mobile(resource_type,mobile_platforms,mobile,publication,pricing_model,source_verified_at));

create table public.resource_countries(
 resource_id text not null references public.resources(id) on delete cascade,
 country char(2) not null check(country in ('US','GB','CA','AU')),
 availability text not null check(availability in ('available','restricted','unavailable')),
 note text not null default '', source_url text not null check(source_url like 'https://%'),
 verified_at timestamptz not null, primary key(resource_id,country)
);
create index resource_country_filter on public.resource_countries(country,availability,resource_id);
create table public.resource_translations(
 resource_id text not null references public.resources(id) on delete cascade, locale text not null,
 title text not null, summary text not null, body text not null default '',
 state text not null default 'draft' check(state in ('draft','translated','reviewed','published','stale')),
 source_revision integer not null, reviewed_at timestamptz, primary key(resource_id,locale),
 check(state<>'published' or reviewed_at is not null)
);
create table public.site_locales(locale text primary key, native_name text not null, enabled boolean not null default false, content_reviewed boolean not null default false, check(not enabled or content_reviewed));
create table public.seo_pages(
 id uuid primary key default gen_random_uuid(), resource_id text references public.resources(id),
 path text not null, locale text not null default 'en', page_type text not null,
 title text not null, description text not null, canonical_url text not null unique,
 publication text not null default 'draft' check(publication in ('draft','published','retired')),
 index_intent text not null default 'noindex' check(index_intent in ('index','noindex')),
 quality_checks jsonb not null default '{}', quality_reviewed_at timestamptz, reviewer_id uuid,
 http_status integer not null default 200, translation_reviewed boolean not null default false,
 mapped_query text, sitemap_group text not null default 'resources',
 last_meaningful_change timestamptz not null default now(), unique(path,locale),
 check(path ~ '^/[a-zA-Z0-9/_-]*$' and path not like '/admin%' and path not like '/api/%' and path not like '/search%'),
 check(canonical_url='https://freeresourceatlas.com'||path)
);
create index seo_approved_inventory on public.seo_pages(sitemap_group,locale,id) where publication='published' and index_intent='index' and http_status=200;
create index seo_resource_lookup on public.seo_pages(resource_id);
create table public.resource_files(
 resource_id text not null references public.resources(id), bucket_id text not null check(bucket_id in ('fra-public-templates','fra-template-drafts')),
 object_key text not null check(object_key ~ '^templates/[a-z0-9/-]+\.(docx|xlsx|pdf|csv)$' and object_key not like '%..%'),
 format text not null check(format in ('docx','xlsx','pdf','csv')), version integer not null check(version>0),
 bytes bigint not null check(bytes between 1 and 52428800), sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 publication text not null default 'draft' check(publication in ('draft','published')), license_approved boolean not null default false,
 primary key(resource_id,format,version),unique(bucket_id,object_key),
 check(publication<>'published' or bucket_id='fra-public-templates' and license_approved)
);
create table public.search_lexicon(term text primary key, expansions text[] not null check(cardinality(expansions)<=8));

create table app_private.admin_members(user_id uuid primary key references auth.users(id), role text not null check(role in ('owner','editor')), enabled boolean not null default true);
create table app_private.admin_sessions(
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'), user_id uuid not null references app_private.admin_members(user_id),
 provider_session_id uuid not null unique, created_at timestamptz not null default now(), expires_at timestamptz not null,
 last_activity_at timestamptz not null default now(), revoked_at timestamptz,
 check(expires_at<=created_at+interval '10 minutes')
);
create index admin_sessions_expiry on app_private.admin_sessions(expires_at);
create table app_private.admin_challenges(nonce_hash text primary key, provider_session_id uuid not null, factor_id uuid not null, challenge_id uuid not null, expires_at timestamptz not null, used_at timestamptz);
create table app_private.audit_events(id bigint generated always as identity primary key, actor_id uuid not null, action text not null,target text not null, details jsonb not null default '{}', created_at timestamptz not null default now());
create table app_private.import_jobs(id uuid primary key default gen_random_uuid(),actor_id uuid not null, file_hash text not null,total_rows integer not null check(total_rows between 1 and 50000),saved_rows integer not null default 0,status text not null default 'preview',created_at timestamptz not null default now());
create table app_private.import_items(job_id uuid not null references app_private.import_jobs(id),row_number integer not null,resource_id text,before_payload jsonb,after_payload jsonb,error text, primary key(job_id,row_number));
create table app_private.integration_state(provider text primary key,status text not null default 'not_connected',last_success_at timestamptz, note text);
insert into app_private.integration_state(provider) values('google_search_console'),('bing_webmaster'),('google_genai_export'),('google_multimodal_export');
create table app_private.index_observations(page_id uuid not null references public.seo_pages(id),observed_at timestamptz not null,source text not null check(source in ('google_inspection','google_aggregate_export','internal_http')),payload jsonb not null,primary key(page_id,observed_at,source));
create table app_private.content_revision(id smallint primary key check(id=1),value bigint not null default 1);
insert into app_private.content_revision(id) values(1);

create function app_private.assert_admin(actor uuid,provider uuid,grant_hash text,fresh_seconds integer default 0)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from app_private.admin_sessions s join app_private.admin_members m on m.user_id=s.user_id join auth.sessions a on a.id=s.provider_session_id and a.user_id=m.user_id
  where s.token_hash=grant_hash and s.user_id=actor and s.provider_session_id=provider and m.enabled and s.revoked_at is null and s.expires_at>now() and s.last_activity_at>now()-interval '5 minutes' and (a.not_after is null or a.not_after>now()) and (fresh_seconds=0 or s.created_at>now()-make_interval(secs=>fresh_seconds))) then raise exception 'Admin access is locked' using errcode='42501';end if;
 update app_private.admin_sessions set last_activity_at=now() where token_hash=grant_hash;
end $$;
create function app_private.quality_gate() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.index_intent='index' and new.publication='published' then
  if new.http_status<>200 or new.quality_reviewed_at is null or not exists(select 1 from app_private.admin_members where user_id=new.reviewer_id and enabled) or
   not new.quality_checks @> '{"distinct_intent":true,"original_purpose":true,"practical_example":true,"free_limits":true,"source_review":true,"metadata":true,"media_rights":true,"internal_links":true,"accessibility":true}'::jsonb or
   (new.resource_id is not null and not exists(select 1 from public.resources where id=new.resource_id and publication='published')) or
   (new.locale<>'en' and (not new.translation_reviewed or not exists(select 1 from public.site_locales where locale=new.locale and enabled and content_reviewed))) then raise exception 'Editorial index approval requirements are incomplete' using errcode='23514';end if;
 end if;return new;
end $$;
create trigger enforce_editorial_index_gate before insert or update on public.seo_pages for each row execute function app_private.quality_gate();
create function app_private.bump_revision() returns trigger language plpgsql security definer set search_path='' as $$ begin update app_private.content_revision set value=value+1 where id=1;return null;end $$;
create trigger resources_revision after insert or update or delete on public.resources for each statement execute function app_private.bump_revision();
create trigger seo_revision after insert or update or delete on public.seo_pages for each statement execute function app_private.bump_revision();

alter table public.categories enable row level security;
alter table public.resources enable row level security;
alter table public.resource_countries enable row level security;
alter table public.resource_translations enable row level security;
alter table public.site_locales enable row level security;
alter table public.seo_pages enable row level security;
alter table public.resource_files enable row level security;
alter table public.search_lexicon enable row level security;
create policy categories_read on public.categories for select to anon,authenticated using(publication='published');
create policy resources_read on public.resources for select to anon,authenticated using(publication='published');
create policy countries_read on public.resource_countries for select to anon,authenticated using(exists(select 1 from public.resources where id=resource_id and publication='published'));
create policy translations_read on public.resource_translations for select to anon,authenticated using(state='published' and exists(select 1 from public.resources r where r.id=resource_id and r.publication='published' and r.revision=source_revision));
create policy locales_read on public.site_locales for select to anon,authenticated using(enabled and content_reviewed);
create policy pages_read on public.seo_pages for select to anon,authenticated using(publication='published' and (resource_id is null or exists(select 1 from public.resources where id=resource_id and publication='published')));
create policy files_read on public.resource_files for select to anon,authenticated using(publication='published' and license_approved and bucket_id='fra-public-templates' and exists(select 1 from public.resources where id=resource_id and publication='published'));
create policy lexicon_read on public.search_lexicon for select to anon,authenticated using(true);
grant select on public.categories,public.resources,public.resource_countries,public.resource_translations,public.site_locales,public.seo_pages,public.resource_files,public.search_lexicon to anon,authenticated;
revoke insert,update,delete,truncate on public.categories,public.resources,public.resource_countries,public.resource_translations,public.site_locales,public.seo_pages,public.resource_files,public.search_lexicon from anon,authenticated;
do $$ declare table_name text;begin for table_name in select tablename from pg_tables where schemaname='app_private' loop execute format('alter table app_private.%I enable row level security',table_name);end loop;end $$;
revoke all on all tables in schema app_private from public,anon,authenticated;
revoke execute on all functions in schema app_private from public,anon,authenticated;

create view public.approved_canonicals with(security_invoker=true) as
 select p.id,p.canonical_url,p.locale,p.sitemap_group,p.last_meaningful_change
 from public.seo_pages p where p.publication='published' and p.index_intent='index' and p.http_status=200
 and(p.resource_id is null or exists(select 1 from public.resources r where r.id=p.resource_id and r.publication='published'));
grant select on public.approved_canonicals to anon,authenticated;

create function public.resource_search(p_query text default '',p_category text default null,p_platform text default null,p_country text default null,p_pricing text default null,p_no_signup boolean default false,p_mobile text default null,p_after text default null,p_limit integer default 24)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare normalized text;expanded text;extra text;v_term text;terms text[];query tsquery;where_sql text;stmt text;answer jsonb;cursor_data jsonb;cursor_id text;cursor_rank real;fuzzy boolean:=false;items jsonb;last_row jsonb;
begin
 p_query:=coalesce(p_query,'');
 if p_limit is null or p_limit not between 1 and 30 or length(p_query)>160 or coalesce(length(p_after),0)>240 then raise exception 'Search bounds exceeded';end if;
 if coalesce(length(p_category),0)>80 or coalesce(length(p_platform),0)>80 or (p_pricing is not null and p_pricing not in ('unknown','free_forever','open_source','freemium','trial')) then raise exception 'Invalid search filter';end if;
 if p_mobile is not null and p_mobile not in ('android','ios','both') then raise exception 'Invalid mobile platform';end if;
 if p_country is not null and p_country not in ('US','GB','CA','AU') then raise exception 'Unsupported country';end if;
 if p_after is not null then cursor_data:=p_after::jsonb;cursor_id:=cursor_data->>'id';cursor_rank:=(cursor_data->>'rank')::real;fuzzy:=coalesce((cursor_data->>'fuzzy')::boolean,false);if cursor_id is null or cursor_id !~ '^[a-zA-Z0-9_-]{1,80}$' or cursor_rank<0 or cursor_rank>10000 or cursor_rank is null then raise exception 'Invalid cursor';end if;end if;
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
 for attempt in 1..2 loop
  stmt:='with matched as (select r.id,r.slug,r.display_name,r.short_summary,r.canonical_url,r.category_id,r.resource_type,r.pricing_model,r.platforms,r.signup_required,r.offline_support,r.mobile_platforms,r.mobile,r.image_url,r.image_alt,((case when lower(r.display_name)=$9 then 100 else 0 end)+ts_rank_cd(r.search_vector,$1)+(case when $11 then extensions.similarity(r.display_name,$9) else 0 end))::real as relevance from public.resources r where '||case when fuzzy then replace(where_sql,'r.search_vector @@ $1','r.display_name operator(extensions.%) $9') else where_sql end||') select jsonb_build_object(''items'',coalesce(jsonb_agg(to_jsonb(c) order by c.relevance desc,c.id),''[]''::jsonb)) from (select * from matched where $7::text is null or relevance<$10 or (relevance=$10 and id>$7) order by relevance desc,id limit $8) c';
  execute stmt into answer using query,p_category,p_platform,p_country,p_pricing,p_mobile,cursor_id,p_limit+1,normalized,cursor_rank,fuzzy;
  exit when jsonb_array_length(answer->'items')>0 or length(normalized)<3 or fuzzy or p_after is not null;fuzzy:=true;
 end loop;
 items:=answer->'items';if jsonb_array_length(items)>p_limit then items:=items-p_limit;last_row:=items->(p_limit-1);return jsonb_build_object('items',items,'ranking_scope','all_matching_resources','has_more',true,'next_cursor',jsonb_build_object('id',last_row->>'id','rank',last_row->'relevance','fuzzy',fuzzy));end if;
 return jsonb_build_object('items',items,'ranking_scope','all_matching_resources','has_more',false,'next_cursor',null);
end $$;
revoke all on function public.resource_search(text,text,text,text,text,boolean,text,text,integer) from public;
grant execute on function public.resource_search(text,text,text,text,text,boolean,text,text,integer) to anon,authenticated;

create function public.admin_update_summary(p_resource_id text,p_summary text,p_expected_revision integer,p_actor uuid,p_provider uuid,p_grant_hash text)
returns integer language plpgsql security definer set search_path='' as $$ declare new_revision integer;begin
 perform app_private.assert_admin(p_actor,p_provider,p_grant_hash);
 if length(p_summary) not between 10 and 600 then raise exception 'Invalid summary';end if;
 update public.resources set short_summary=p_summary,revision=revision+1,updated_at=now() where id=p_resource_id and revision=p_expected_revision returning revision into new_revision;
 if new_revision is null then raise exception 'Resource changed; refresh before editing' using errcode='40001';end if;
 insert into app_private.audit_events(actor_id,action,target,details) values(p_actor,'resource.summary.updated',p_resource_id,jsonb_build_object('revision',new_revision));
 return new_revision;end $$;
revoke all on function public.admin_update_summary(text,text,integer,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_update_summary(text,text,integer,uuid,uuid,text) to service_role;
grant usage on schema app_private to service_role;
grant execute on all functions in schema app_private to service_role;
