-- ===========================================================================
-- Geiger Chat — message threads + per-conversation file linkage.
--
-- Adds:
--   * chat.threads          — a named sub-thread rooted on a message, owned by a
--                             conversation (channel or dm). Renameable, soft-del.
--   * chat.messages.thread_id  — a reply lives inside a thread (null = main
--                             timeline). ON DELETE CASCADE with the thread.
--   * chat.files.(conversation_id, message_id, content_type) — so files shared in
--                             a conversation can be listed in the Files panel.
--
-- Self-contained and idempotent. Runs as part of `npm run db:push`.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- chat.threads
-- ---------------------------------------------------------------------------
create table if not exists chat.threads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat.conversations(id) on delete cascade,
  root_message_id uuid,
  title text not null default 'Thread',
  created_by uuid references chat.profiles(id) on delete set null,
  last_activity_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists chat_threads_conversation_idx
  on chat.threads (conversation_id, last_activity_at desc)
  where deleted_at is null;

drop trigger if exists chat_threads_touch on chat.threads;
create trigger chat_threads_touch before update on chat.threads
  for each row execute function chat.touch_updated_at();

-- ---------------------------------------------------------------------------
-- chat.messages.thread_id  (null = main timeline)
-- ---------------------------------------------------------------------------
alter table chat.messages
  add column if not exists thread_id uuid references chat.threads(id) on delete cascade;
create index if not exists chat_messages_thread_idx
  on chat.messages (thread_id, created_at)
  where deleted_at is null;

-- root_message_id references a message; add the FK now that both exist. Guarded
-- so it's only added once.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chat_threads_root_message_fk'
  ) then
    alter table chat.threads
      add constraint chat_threads_root_message_fk
      foreign key (root_message_id) references chat.messages(id) on delete set null;
  end if;
end $$;

-- A reply posted into a thread bumps that thread's last_activity_at.
create or replace function chat.bump_thread_activity()
returns trigger language plpgsql as $$
begin
  if new.thread_id is not null then
    update chat.threads set last_activity_at = now() where id = new.thread_id;
  end if;
  return new;
end;
$$;
drop trigger if exists chat_messages_bump_thread on chat.messages;
create trigger chat_messages_bump_thread after insert on chat.messages
  for each row execute function chat.bump_thread_activity();

-- ---------------------------------------------------------------------------
-- chat.files — link a shared file to its conversation / message.
-- ---------------------------------------------------------------------------
alter table chat.files
  add column if not exists conversation_id uuid references chat.conversations(id) on delete cascade;
alter table chat.files
  add column if not exists message_id uuid references chat.messages(id) on delete set null;
alter table chat.files
  add column if not exists content_type text;
create index if not exists chat_files_conversation_idx
  on chat.files (conversation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS (demo-open; mirrors the sibling tables)
-- ---------------------------------------------------------------------------
alter table chat.threads enable row level security;
drop policy if exists threads_demo_all on chat.threads;
create policy threads_demo_all on chat.threads
  for all to anon, authenticated using (true) with check (true);

grant all on chat.threads to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='chat' and tablename='threads'
    ) then
      alter publication supabase_realtime add table chat.threads;
    end if;
  end if;
end $$;
