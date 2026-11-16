-- Supabase's optional automatic-RLS event helper must not be an RPC for clients.
-- Preserve the helper and its event trigger; restrict direct execution only.
do $$
begin
 if pg_catalog.to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
 end if;
end $$;
