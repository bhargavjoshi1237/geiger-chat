-- ===========================================================================
-- Geiger Chat — file storage (Supabase Storage)
--
-- Self-contained and idempotent. Creates the public "chat" bucket and the RLS
-- policies on storage.objects. Shared files live at:
--     chat / files / <profile-uuid> / <file>
-- Public read (the app persists public URLs in flow_chat_files.url). Writes are
-- demo-open (anon + authenticated) to match the app's current unauthenticated
-- posture; tighten to an owner/org policy when auth lands.
--
-- Runs as part of `npm run db:push`.
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('chat', 'chat', true)
on conflict (id) do update
  set name = excluded.name,
      public = excluded.public;

drop policy if exists "Chat public read" on storage.objects;
drop policy if exists "Chat demo write" on storage.objects;
drop policy if exists "Chat demo update" on storage.objects;
drop policy if exists "Chat demo delete" on storage.objects;

create policy "Chat public read"
  on storage.objects for select to public
  using (bucket_id = 'chat');

create policy "Chat demo write"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'chat');

create policy "Chat demo update"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'chat') with check (bucket_id = 'chat');

create policy "Chat demo delete"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'chat');
