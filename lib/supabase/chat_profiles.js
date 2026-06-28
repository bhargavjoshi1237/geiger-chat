"use client";

// Data layer for public.flow_chat_profiles — the people directory the app
// discovers users through (search / invite / DM by email or username).
// DB is snake_case; the UI is camelCase. Pure: validate, console.error on
// failure, return null/[]/false. Never throws, never toasts.

import { createClient } from "./client";
import { isSupabaseConfigured, minsAgo, chatDb } from "./config";

const TABLE = "profiles";

// DB row -> camelCase person view-model (matches the shape the chat UI reads:
// id, name, firstName, role, color, presence, lastSeen).
export function normalizeProfile(row) {
  if (!row) return null;
  const name =
    row.display_name ||
    row.username ||
    (row.email ? row.email.split("@")[0] : "") ||
    "User";
  return {
    id: row.id,
    name,
    firstName: name.split(" ")[0] || name,
    role: row.role ?? "",
    color: row.avatar_color || "#6366f1",
    presence: row.presence ?? "offline",
    lastSeen: minsAgo(row.last_seen_at),
    email: row.email ?? "",
    username: row.username ?? "",
  };
}

// camelCase patch -> snake_case columns; emits a column only when its key is
// present, so the same helper serves a full upsert and a partial update.
function toRow(input) {
  const row = {};
  const map = {
    email: "email",
    username: "username",
    name: "display_name",
    displayName: "display_name",
    role: "role",
    color: "avatar_color",
    avatarColor: "avatar_color",
    presence: "presence",
  };
  for (const [k, col] of Object.entries(map)) if (k in input) row[col] = input[k];
  if (row.email) row.email = String(row.email).toLowerCase();
  if (row.username) row.username = String(row.username).toLowerCase();
  return row;
}

export async function listProfiles() {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .order("display_name", { ascending: true });
    if (error) {
      console.error("[chat_profiles.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeProfile);
  } catch (e) {
    console.error("[chat_profiles.list]", e);
    return null;
  }
}

export async function getProfile(id) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const { data, error } = await sb.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("[chat_profiles.get]", error.message);
      return null;
    }
    return normalizeProfile(data);
  } catch (e) {
    console.error("[chat_profiles.get]", e);
    return null;
  }
}

// Exact match on email OR username (case-insensitive) — used to resolve a person
// typed into the "start a chat / invite by email or username" field.
export async function findProfile(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .or(`email.eq.${q},username.eq.${q}`)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[chat_profiles.find]", error.message);
      return null;
    }
    return normalizeProfile(data);
  } catch (e) {
    console.error("[chat_profiles.find]", e);
    return null;
  }
}

// Fuzzy directory search by name, username or email (case-insensitive, partial)
// — backs the live typeahead in "new message" and the channel people-picker so
// any user in the table is findable, not just the preloaded roster. Returns []
// when there's no DB or no query.
export async function searchProfiles(query, { limit = 20 } = {}) {
  const q = (query || "").trim().toLowerCase();
  if (!q || !isSupabaseConfigured()) return [];
  try {
    const sb = chatDb();
    // Strip characters that would break PostgREST's comma-separated or() filter.
    const safe = q.replace(/[%,()]/g, " ").trim();
    if (!safe) return [];
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .or(`display_name.ilike.%${safe}%,username.ilike.%${safe}%,email.ilike.%${safe}%`)
      .order("display_name", { ascending: true })
      .limit(limit);
    if (error) {
      console.error("[chat_profiles.search]", error.message);
      return [];
    }
    return (data || []).map(normalizeProfile);
  } catch (e) {
    console.error("[chat_profiles.search]", e);
    return [];
  }
}

// Upsert (by id) the signed-in / demo identity so it lives in the directory and
// others can find it. Returns the normalized profile.
export async function ensureProfile(input) {
  if (!input?.id || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const payload = { id: input.id, ...toRow(input) };
    const { data, error } = await sb
      .from(TABLE)
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();
    if (error) {
      console.error("[chat_profiles.ensure]", error.message);
      return null;
    }
    return normalizeProfile(data);
  } catch (e) {
    console.error("[chat_profiles.ensure]", e);
    return null;
  }
}

// Realtime: profile changes for everyone (presence / display updates). The
// handler receives the raw row; the screen maps it through normalizeProfile and
// re-hydrates the people store. Returns an unsubscribe function.
export function subscribeProfiles(handler) {
  if (!isSupabaseConfigured()) return () => {};
  try {
    const sb = createClient();
    const channel = sb
      .channel(`chat-profiles-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "chat", table: TABLE },
        (payload) => handler?.(payload.new),
      )
      .subscribe();
    return () => {
      try {
        sb.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  } catch (e) {
    console.error("[chat_profiles.subscribe]", e);
    return () => {};
  }
}

export async function setPresence(id, presence) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    const { error } = await sb
      .from(TABLE)
      .update({ presence, last_seen_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[chat_profiles.presence]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_profiles.presence]", e);
    return false;
  }
}
