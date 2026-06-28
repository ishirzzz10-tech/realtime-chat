-- ============================================================================
-- 0002_messenger.sql — v2: profiles, DMs, channels, reactions, receipts,
-- images, push tokens. Anonymous Auth + RLS-enforced privacy.
-- ============================================================================

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- profiles (the searchable user directory)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     citext not null unique check (char_length(username::text) between 1 and 40),
  avatar_color text not null default '#7c3aed',
  last_seen    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rooms + membership
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('dm','channel')),
  name       text,
  dm_key     text unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id      uuid not null references public.rooms(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'member',
  joined_at    timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists room_members_user_idx on public.room_members (user_id);

-- ---------------------------------------------------------------------------
-- messages (reshape the v1 table — it has 0 rows)
-- ---------------------------------------------------------------------------
alter table public.messages drop column if exists username;
alter table public.messages drop column if exists user_id;
alter table public.messages add column if not exists room_id    uuid references public.rooms(id) on delete cascade;
alter table public.messages add column if not exists sender_id  uuid references public.profiles(id) on delete set null;
alter table public.messages add column if not exists image_path text;
alter table public.messages add column if not exists edited_at  timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages alter column content drop not null;

do $$ begin
  alter table public.messages alter column room_id set not null;
exception when others then null; end $$;

do $$ begin
  alter table public.messages
    add constraint messages_has_body check (content is not null or image_path is not null);
exception when duplicate_object then null; end $$;

create index if not exists messages_room_created_idx on public.messages (room_id, created_at);

-- ---------------------------------------------------------------------------
-- reactions + push tokens
-- ---------------------------------------------------------------------------
create table if not exists public.reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists public.push_tokens (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,
  platform   text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- ---------------------------------------------------------------------------
-- membership helper — SECURITY DEFINER so RLS policies that need to check
-- membership do NOT recurse back through room_members' own RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_room_member(p_room uuid, p_user uuid)
  returns boolean
  language sql
  security definer
  set search_path = public
  stable
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room and user_id = p_user
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.rooms        enable row level security;
alter table public.room_members enable row level security;
alter table public.messages     enable row level security;
alter table public.reactions    enable row level security;
alter table public.push_tokens  enable row level security;

-- remove v1 open policies (the whole point of v2 is real privacy)
drop policy if exists "Public can read messages"   on public.messages;
drop policy if exists "Public can insert messages" on public.messages;

-- profiles: everyone signed-in can search anyone; you manage only your row
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- rooms: channels are public (browse/join); DMs only to members
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms for select to authenticated
  using (kind = 'channel' or public.is_room_member(id, auth.uid()));
drop policy if exists rooms_insert on public.rooms;
create policy rooms_insert on public.rooms for insert to authenticated with check (created_by = auth.uid());

-- room_members: members see co-members (needed for receipts); manage own row
drop policy if exists room_members_select on public.room_members;
create policy room_members_select on public.room_members for select to authenticated
  using (public.is_room_member(room_id, auth.uid()));
drop policy if exists room_members_insert on public.room_members;
create policy room_members_insert on public.room_members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists room_members_update on public.room_members;
create policy room_members_update on public.room_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- messages: read/post only within rooms you belong to; edit/delete only your own
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (public.is_room_member(room_id, auth.uid()));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_room_member(room_id, auth.uid()));
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

-- reactions: within rooms you belong to; only your own
drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions for select to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id and public.is_room_member(m.room_id, auth.uid())));
drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.messages m where m.id = message_id and public.is_room_member(m.room_id, auth.uid())));
drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions for delete to authenticated using (user_id = auth.uid());

-- push tokens: fully private to the owner
drop policy if exists push_tokens_all on public.push_tokens;
create policy push_tokens_all on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPCs (SECURITY DEFINER): atomic DM/channel creation, read tracking, overview
-- ---------------------------------------------------------------------------
create or replace function public.get_or_create_dm(other_user uuid)
  returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); k text; rid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other_user is null or other_user = me then raise exception 'invalid user'; end if;
  if me::text < other_user::text then k := me::text||'_'||other_user::text;
  else k := other_user::text||'_'||me::text; end if;
  select id into rid from rooms where dm_key = k;
  if rid is null then
    insert into rooms (kind, dm_key, created_by) values ('dm', k, me) returning id into rid;
    insert into room_members (room_id, user_id) values (rid, me), (rid, other_user) on conflict do nothing;
  end if;
  return rid;
end; $$;

create or replace function public.create_channel(p_name text)
  returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); rid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(p_name),'') = '' then raise exception 'name required'; end if;
  insert into rooms (kind, name, created_by) values ('channel', btrim(p_name), me) returning id into rid;
  insert into room_members (room_id, user_id) values (rid, me) on conflict do nothing;
  return rid;
end; $$;

create or replace function public.join_channel(p_room uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from rooms where id = p_room and kind = 'channel') then raise exception 'not a channel'; end if;
  insert into room_members (room_id, user_id) values (p_room, me) on conflict do nothing;
end; $$;

create or replace function public.join_general()
  returns void language sql security definer set search_path = public as $$
  insert into room_members (room_id, user_id)
  values ('11111111-1111-4111-8111-111111111111', auth.uid())
  on conflict do nothing;
$$;

create or replace function public.mark_room_read(p_room uuid)
  returns void language sql security definer set search_path = public as $$
  update room_members set last_read_at = now() where room_id = p_room and user_id = auth.uid();
$$;

create or replace function public.my_rooms()
  returns table (
    room_id uuid, kind text, title text, other_user_id uuid, avatar_color text,
    last_message text, last_image boolean, last_at timestamptz, unread_count bigint
  )
  language sql security definer set search_path = public stable as $$
  with my as (
    select rm.room_id, rm.last_read_at from room_members rm where rm.user_id = auth.uid()
  )
  select
    r.id,
    r.kind,
    case when r.kind = 'channel' then r.name
         else (select p.username::text from room_members rm2 join profiles p on p.id = rm2.user_id
               where rm2.room_id = r.id and rm2.user_id <> auth.uid() limit 1) end,
    case when r.kind = 'dm' then (select rm2.user_id from room_members rm2
               where rm2.room_id = r.id and rm2.user_id <> auth.uid() limit 1) end,
    case when r.kind = 'dm' then (select p.avatar_color from room_members rm2 join profiles p on p.id = rm2.user_id
               where rm2.room_id = r.id and rm2.user_id <> auth.uid() limit 1) end,
    lm.content,
    (lm.image_path is not null),
    lm.created_at,
    (select count(*) from messages msg where msg.room_id = r.id and msg.created_at > my.last_read_at
        and msg.sender_id <> auth.uid() and msg.deleted_at is null)
  from my
  join rooms r on r.id = my.room_id
  left join lateral (
    select content, image_path, created_at from messages m2
    where m2.room_id = r.id and m2.deleted_at is null order by m2.created_at desc limit 1
  ) lm on true
  order by coalesce(lm.created_at, r.created_at) desc;
$$;

-- ---------------------------------------------------------------------------
-- seed the default #general channel
-- ---------------------------------------------------------------------------
insert into public.rooms (id, kind, name)
  values ('11111111-1111-4111-8111-111111111111', 'channel', 'general')
  on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- realtime publication (idempotent)
-- ---------------------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.messages;     exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.reactions;    exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.room_members; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.rooms;        exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- storage: private bucket for chat images, scoped to room members
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('chat-images', 'chat-images', false)
  on conflict (id) do nothing;

drop policy if exists "chat images read"   on storage.objects;
create policy "chat images read" on storage.objects for select to authenticated
  using (bucket_id = 'chat-images' and public.is_room_member(((storage.foldername(name))[1])::uuid, auth.uid()));

drop policy if exists "chat images upload" on storage.objects;
create policy "chat images upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images' and public.is_room_member(((storage.foldername(name))[1])::uuid, auth.uid()));
