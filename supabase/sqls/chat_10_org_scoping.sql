-- ===========================================================================
-- Geiger Chat — organization scoping.
--
-- geiger-chat shares the Supabase project with geiger-dash (the suite hub), so
-- a user authenticated against dash is authenticated here too. dash owns the
-- org model in the public schema:
--   public.organizations (id, name, slug, ...)
--   public.organization_users (organization, "user", role)
--   public.is_org_member(uuid), public.org_role(uuid), public.user_has_org()
--
-- This migration scopes chat rows to an organization so /home becomes a
-- per-org chat "circle": only the current org's conversations/members show up.
-- It is additive, idempotent and non-destructive — existing demo rows keep
-- their null organization_id (hidden from org-scoped queries) and the landing
-- page's mock playground is unaffected.
--
-- Isolation is enforced in application code (every list/create call filters by
-- organization_id) plus the auth gate that redirects unauthenticated users.
-- The demo-open RLS policies are intentionally left in place for now; tightening
-- them to org-scoped predicates is a documented follow-up.
-- ===========================================================================

-- conversations -------------------------------------------------------------
-- Which org a conversation belongs to. Null = legacy/demo row.
alter table chat.conversations
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

-- A DM key is now unique per org, so the same two people can have a DM in two
-- different orgs. Drop the old global unique index and replace it with a
-- composite one. The DROP needs a guard because older DBs may not have it yet;
-- the CREATE is IF NOT EXISTS so the whole block is re-runnable.
do $$
begin
  if exists (
    select 1 from pg_indexes
    where schemaname = 'chat' and indexname = 'chat_conversations_dm_key'
  ) then
    drop index chat.chat_conversations_dm_key;
  end if;
end $$;

create unique index if not exists chat_conversations_dm_key
  on chat.conversations (organization_id, dm_key)
  where dm_key is not null;

create index if not exists chat_conversations_org_kind_idx
  on chat.conversations (organization_id, kind)
  where deleted_at is null;

-- Channel names are unique within an org (case-insensitive). This keeps the
-- per-org #general bootstrap idempotent under a create race — a lost insert
-- hits this index and the app fetches the winning row instead of duplicating
-- the channel. Only applies to org-scoped channels; legacy null-org rows and
-- DMs are unaffected.
create unique index if not exists chat_conversations_org_channel_name_key
  on chat.conversations (organization_id, lower(name))
  where kind = 'channel' and deleted_at is null and organization_id is not null;

-- profiles ------------------------------------------------------------------
-- A chat profile reflects the user's presence in their current org. With the
-- single-row model the column records which org the user is currently chatting
-- in; it updates when they switch orgs.
alter table chat.profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists chat_profiles_org_idx on chat.profiles (organization_id);

-- Backfill opportunity: nothing to migrate — demo rows stay null and are
-- excluded by the org-scoped queries (`.eq("organization_id", orgId)`).
