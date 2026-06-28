-- ============================================================================
-- 0003_harden.sql — tighten SECURITY DEFINER exposure
--   * move the internal is_room_member() helper out of the REST-exposed schema
--   * make the RPCs authenticated-only (block the unauthenticated anon role)
-- ============================================================================

-- Hide the membership helper from PostgREST while keeping it usable by RLS
-- policies (policies reference it by OID, so the schema move is transparent).
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.is_room_member(uuid, uuid) set schema private;
revoke execute on function private.is_room_member(uuid, uuid) from public, anon;
grant  execute on function private.is_room_member(uuid, uuid) to authenticated;

-- RPCs are the app's API: callable by signed-in users only.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.get_or_create_dm(uuid)',
    'public.create_channel(text)',
    'public.join_channel(uuid)',
    'public.join_general()',
    'public.mark_room_read(uuid)',
    'public.my_rooms()'
  ] loop
    execute format('revoke execute on function %s from public, anon;', fn);
    execute format('grant execute on function %s to authenticated;', fn);
  end loop;
end $$;
