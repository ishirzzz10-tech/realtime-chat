-- ============================================================================
-- Realtime Chat — database schema
-- Run this in the Supabase Dashboard → SQL Editor (or `supabase db push`).
-- ============================================================================

-- Messages table -------------------------------------------------------------
create table if not exists public.messages (
  id         uuid        primary key default gen_random_uuid(),
  content    text        not null check (char_length(content) between 1 and 2000),
  username   text        not null check (char_length(username) between 1 and 40),
  user_id    text        not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_created_at_idx
  on public.messages (created_at);

-- Row Level Security ---------------------------------------------------------
alter table public.messages enable row level security;

-- Demo policies: anyone using the anon key can read and post.
-- This suits a username-only chat. Tighten these once you add real auth
-- (e.g. require auth.uid() and check ownership).
drop policy if exists "Public can read messages" on public.messages;
create policy "Public can read messages"
  on public.messages
  for select
  using (true);

drop policy if exists "Public can insert messages" on public.messages;
create policy "Public can insert messages"
  on public.messages
  for insert
  with check (true);

-- Enable Realtime on the table ----------------------------------------------
-- Wrapped so re-running the migration doesn't error if it's already added.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
