"use client";

import { createClient } from "./client";

// All chat tables live in the dedicated `chat` Postgres schema (mirrors
// geiger-flow's `flow`). This returns a schema-scoped client for data access
// (.from/.rpc). NOTE: the schema-scoped client is data-only — for Realtime
// (.channel) and Storage (.storage) use the base createClient() and pass
// `schema: "chat"` in the realtime filter.
export function chatDb() {
  return createClient().schema("chat");
}

// Shared config guard for the chat data layer. Imported by every
// lib/supabase/chat_*.js module so a missing env degrades to "no DB" (the call
// returns null/[]/false and the screen renders an empty state) rather than
// crashing. There is no static sample-data fallback.
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// Whole-minutes-ago from a timestamp — the unit the chat UI renders with
// (fromNow / clockTime). Clamped at 0.
export function minsAgo(ts) {
  if (!ts) return 0;
  const ms = Date.now() - new Date(ts).getTime();
  return Math.max(0, Math.round(ms / 60000));
}
