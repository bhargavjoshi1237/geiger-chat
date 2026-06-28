-- ===========================================================================
-- Geiger Chat — dedicated `chat` product schema (mirrors geiger-flow's `flow`).
--
-- Creates the `chat` schema and ALL chat tables inside it (unprefixed), migrates
-- any rows from the previous public.flow_chat_* tables, then drops those old
-- public tables. Self-contained and idempotent.
--
-- IMPORTANT: for the API to serve this schema you must also add `chat` to
-- Settings -> API -> Exposed schemas in the Supabase dashboard (same one-time
-- step geiger-flow needs for `flow`). SQL grants alone don't expose it.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Schema + grants
-- ---------------------------------------------------------------------------
create schema if not exists chat;
grant usage on schema chat to anon, authenticated, service_role;
alter default privileges in schema chat grant all on tables to anon, authenticated, service_role;
alter default privileges in schema chat grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema chat grant all on functions to anon, authenticated, service_role;

-- Shared "touch updated_at" trigger function, scoped to this schema.
create or replace function chat.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists chat.profiles (
  id uuid primary key default gen_random_uuid(),
  email text,
  username text,
  display_name text not null default 'User',
  role text not null default '',
  avatar_color text not null default '#6366f1',
  presence text not null default 'offline',
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists chat_profiles_email_key on chat.profiles (lower(email)) where email is not null;
create unique index if not exists chat_profiles_username_key on chat.profiles (lower(username)) where username is not null;

create table if not exists chat.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'dm',
  name text,
  topic text,
  visibility text not null default 'public',
  dm_key text,
  created_by uuid references chat.profiles(id) on delete set null,
  last_activity_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists chat_conversations_dm_key on chat.conversations (dm_key) where dm_key is not null;
create index if not exists chat_conversations_activity_idx on chat.conversations (last_activity_at desc) where deleted_at is null;

create table if not exists chat.members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat.conversations(id) on delete cascade,
  profile_id uuid not null references chat.profiles(id) on delete cascade,
  role text not null default 'member',
  pinned boolean not null default false,
  muted boolean not null default false,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists chat_members_unique on chat.members (conversation_id, profile_id);
create index if not exists chat_members_profile_idx on chat.members (profile_id);

create table if not exists chat.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat.conversations(id) on delete cascade,
  author_id uuid references chat.profiles(id) on delete set null,
  text text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists chat_messages_conversation_idx on chat.messages (conversation_id, created_at) where deleted_at is null;

create table if not exists chat.calls (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Call',
  kind text not null default 'video',
  direction text not null default 'outgoing',
  missed boolean not null default false,
  duration_mins integer not null default 0,
  owner_id uuid references chat.profiles(id) on delete cascade,
  participant_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_calls_owner_idx on chat.calls (owner_id, created_at desc);

create table if not exists chat.files (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'file',
  kind text not null default 'doc',
  size text not null default '',
  source text not null default '',
  url text,
  owner_id uuid references chat.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists chat_files_created_idx on chat.files (created_at desc);

create table if not exists chat.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references chat.profiles(id) on delete cascade,
  type text not null default 'Message',
  title text not null default '',
  description text not null default '',
  read boolean not null default false,
  icon text not null default 'Bell',
  bg_color text not null default 'bg-surface-hover',
  icon_color text not null default 'text-muted-foreground',
  extra jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_notifications_recipient_idx on chat.notifications (profile_id, created_at desc);

create table if not exists chat.scheduled_calls (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Scheduled call',
  kind text not null default 'video',
  scheduled_at timestamptz not null,
  conversation_id uuid,
  created_by uuid references chat.profiles(id) on delete cascade,
  participant_ids jsonb not null default '[]'::jsonb,
  reminded boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists chat_scheduled_calls_owner_idx on chat.scheduled_calls (created_by, scheduled_at);

-- ---------------------------------------------------------------------------
-- Triggers + RPC
-- ---------------------------------------------------------------------------
drop trigger if exists chat_profiles_touch on chat.profiles;
create trigger chat_profiles_touch before update on chat.profiles
  for each row execute function chat.touch_updated_at();
drop trigger if exists chat_conversations_touch on chat.conversations;
create trigger chat_conversations_touch before update on chat.conversations
  for each row execute function chat.touch_updated_at();
drop trigger if exists chat_messages_touch on chat.messages;
create trigger chat_messages_touch before update on chat.messages
  for each row execute function chat.touch_updated_at();

create or replace function chat.bump_activity()
returns trigger language plpgsql as $$
begin
  update chat.conversations set last_activity_at = now() where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists chat_messages_bump_activity on chat.messages;
create trigger chat_messages_bump_activity after insert on chat.messages
  for each row execute function chat.bump_activity();

-- Shallow-merge a patch into a message's metadata bag (reactions, replyTo, …).
create or replace function chat.merge_message_meta(p_id uuid, p_patch jsonb)
returns void language sql as $$
  update chat.messages
     set metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_patch, '{}'::jsonb)
   where id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- RLS (demo-open; replace with org-scoped policy when auth lands)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','conversations','members','messages','calls','files','notifications','scheduled_calls']
  loop
    execute format('alter table chat.%I enable row level security', t);
    execute format('drop policy if exists %I on chat.%I', t || '_demo_all', t);
    execute format('create policy %I on chat.%I for all to anon, authenticated using (true) with check (true)', t || '_demo_all', t);
  end loop;
end $$;

grant all on all tables in schema chat to anon, authenticated, service_role;
grant all on all sequences in schema chat to anon, authenticated, service_role;
grant all on all functions in schema chat to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['messages','members','conversations','profiles','notifications']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname='supabase_realtime' and schemaname='chat' and tablename=t
      ) then
        execute format('alter publication supabase_realtime add table chat.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Migrate any rows from the previous public.flow_chat_* tables (if present)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.flow_chat_profiles') is not null then
    insert into chat.profiles select * from public.flow_chat_profiles on conflict (id) do nothing;
  end if;
  if to_regclass('public.flow_chat_conversations') is not null then
    insert into chat.conversations select * from public.flow_chat_conversations on conflict (id) do nothing;
  end if;
  if to_regclass('public.flow_chat_members') is not null then
    insert into chat.members select * from public.flow_chat_members on conflict do nothing;
  end if;
  if to_regclass('public.flow_chat_messages') is not null then
    insert into chat.messages select * from public.flow_chat_messages on conflict (id) do nothing;
  end if;
  if to_regclass('public.flow_chat_calls') is not null then
    insert into chat.calls select * from public.flow_chat_calls on conflict (id) do nothing;
  end if;
  if to_regclass('public.flow_chat_files') is not null then
    insert into chat.files select * from public.flow_chat_files on conflict (id) do nothing;
  end if;
  if to_regclass('public.flow_chat_notifications') is not null then
    insert into chat.notifications select * from public.flow_chat_notifications on conflict (id) do nothing;
  end if;
  if to_regclass('public.flow_chat_scheduled_calls') is not null then
    insert into chat.scheduled_calls select * from public.flow_chat_scheduled_calls on conflict (id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Seed (stable demo cast + public #general). on conflict do nothing.
-- ---------------------------------------------------------------------------
insert into chat.profiles (id, email, username, display_name, role, avatar_color, presence)
values
  ('11111111-1111-4111-8111-111111111111', 'mara@geiger.app',  'mara',  'Mara Vance',   'Engineering Lead', '#6366f1', 'online'),
  ('22222222-2222-4222-8222-222222222222', 'theo@geiger.app',  'theo',  'Theo Park',    'Product Manager',  '#0ea5e9', 'online'),
  ('33333333-3333-4333-8333-333333333333', 'priya@geiger.app', 'priya', 'Priya Nair',   'Design Systems',   '#ec4899', 'away'),
  ('44444444-4444-4444-8444-444444444444', 'sam@geiger.app',   'sam',   'Sam Okafor',   'Backend Engineer', '#10b981', 'online'),
  ('55555555-5555-4555-8555-555555555555', 'lena@geiger.app',  'lena',  'Lena Hoffman', 'Marketing',        '#f59e0b', 'offline'),
  ('66666666-6666-4666-8666-666666666666', 'diego@geiger.app', 'diego', 'Diego Romero', 'QA Engineer',      '#8b5cf6', 'dnd'),
  ('77777777-7777-4777-8777-777777777777', 'ava@geiger.app',   'ava',   'Ava Chen',     'Data Analyst',     '#14b8a6', 'online'),
  ('88888888-8888-4888-8888-888888888888', 'noah@geiger.app',  'noah',  'Noah Bauer',   'Support Lead',     '#ef4444', 'away')
on conflict (id) do nothing;

insert into chat.conversations (id, kind, name, topic, visibility, created_by)
values ('c0000000-0000-4000-8000-000000000001', 'channel', 'general',
        'Company-wide announcements and watercooler chat', 'public',
        '11111111-1111-4111-8111-111111111111')
on conflict (id) do nothing;

insert into chat.members (conversation_id, profile_id, role)
select 'c0000000-0000-4000-8000-000000000001', id,
       case when id = '11111111-1111-4111-8111-111111111111' then 'admin' else 'member' end
from chat.profiles
where id in (
  '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777','88888888-8888-4888-8888-888888888888'
)
on conflict (conversation_id, profile_id) do nothing;

insert into chat.messages (id, conversation_id, author_id, text)
values
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   '22222222-2222-4222-8222-222222222222', 'Welcome to the team 👋 Say hi in here!'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
   '44444444-4444-4444-8444-444444444444', 'Realtime presence is now live in staging if anyone wants to dogfood.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Drop the old public.flow_chat_* tables (children first). Their triggers go
-- with them; the shared public.flow_touch_updated_at() (used by other apps) is
-- intentionally left in place.
-- ---------------------------------------------------------------------------
drop table if exists public.flow_chat_messages cascade;
drop table if exists public.flow_chat_members cascade;
drop table if exists public.flow_chat_scheduled_calls cascade;
drop table if exists public.flow_chat_notifications cascade;
drop table if exists public.flow_chat_files cascade;
drop table if exists public.flow_chat_calls cascade;
drop table if exists public.flow_chat_conversations cascade;
drop table if exists public.flow_chat_profiles cascade;
drop function if exists public.flow_chat_bump_activity() cascade;
drop function if exists public.flow_chat_merge_message_meta(uuid, jsonb);
