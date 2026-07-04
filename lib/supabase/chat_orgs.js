"use client";

// Data layer for the organization model owned by geiger-dash.
//
// geiger-chat shares the Supabase project with geiger-dash, so a session
// authenticated against dash is valid here too. dash owns the org tables in the
// public schema and gates them with RLS (a user only sees orgs they belong to).
// We read them directly with the authenticated browser client — no service role.
//
// These functions target the *public* schema (not the chat schema), so they use
// the base createClient() rather than chatDb(). Pure: console.error on failure,
// return null/[]/false. Never throws, never toasts.

import { createClient } from "./client";
import { isSupabaseConfigured, chatDb } from "./config";
import { getUser } from "./user";

const ORGS = "organizations";
const ORG_USERS = "organization_users";
const ORG_SELECT = "id, name, slug, description, avatar_url, created_at, owner, created_by, metadata";

// DB row -> camelCase org view-model.
function normalizeOrg(o) {
  if (!o) return null;
  return {
    id: o.id,
    name: o.name || "Untitled org",
    slug: o.slug || null,
    description: o.description || "",
    avatarUrl: o.avatar_url || null,
    createdAt: o.created_at || null,
  };
}

// DB membership row -> camelCase view-model.
function normalizeMember(m) {
  if (!m) return null;
  return {
    userId: m.user ?? null,
    organizationId: m.organization ?? null,
    role: m.role ?? "User",
  };
}

// Resolve display names for a set of user ids from chat.profiles (the only
// browser-readable place a user's name lives — there is no public.users table).
// Returns { [id]: name }. Best-effort: missing users just don't get a name.
async function resolveOwnerNames(ownerIds) {
  const map = {};
  if (!ownerIds.length) return map;
  try {
    const db = chatDb();
    if (!db) return map;
    const { data } = await db
      .from("profiles")
      .select("id, display_name, username, email")
      .in("id", ownerIds);
    for (const p of data || []) {
      map[p.id] =
        p.display_name || p.username || (p.email ? p.email.split("@")[0] : null) || null;
    }
  } catch {
    /* best-effort */
  }
  return map;
}

// All organizations the current user belongs to, each enriched with owner info
// for the workspace picker. Mirrors geiger-dash's canonical membership: an org
// counts as mine if I created it, own it, or I'm listed in metadata.members.
// Using explicit filters (rather than a bare select) keeps this correct whether
// or not the org RLS policies are applied. Returns [] when I'm in no org.
export async function listMyOrganizations() {
  if (!isSupabaseConfigured()) return null;
  try {
    const me = await getUser().catch(() => null);
    if (!me?.id) return [];
    const sb = createClient();
    const [created, owned, joined] = await Promise.all([
      sb.from(ORGS).select(ORG_SELECT).eq("created_by", me.id),
      sb.from(ORGS).select(ORG_SELECT).eq("owner", me.id),
      sb.from(ORGS).select(ORG_SELECT).contains("metadata", { members: [me.id] }),
    ]);

    // Dedupe across the three membership sources.
    const byId = new Map();
    for (const grp of [created.data, owned.data, joined.data]) {
      for (const o of grp || []) byId.set(String(o.id), o);
    }
    if (byId.size === 0) {
      const err = created.error || owned.error || joined.error;
      if (err) {
        console.error("[chat_orgs.listMine]", err.message);
        return null;
      }
      return [];
    }

    const rows = Array.from(byId.values());
    const ownerIds = [...new Set(rows.map((o) => o.owner || o.created_by).filter(Boolean))];
    const ownerNames = await resolveOwnerNames(ownerIds);

    return rows
      .map((o) => {
        const ownerId = o.owner || o.created_by || null;
        const isOwner = !!ownerId && ownerId === me.id;
        return {
          ...normalizeOrg(o),
          ownerId,
          isOwner,
          ownerName: isOwner ? "You" : ownerNames[ownerId] || "Workspace owner",
          role: isOwner ? "Owner" : "Member",
        };
      })
      .sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0),
      );
  } catch (e) {
    console.error("[chat_orgs.listMine]", e);
    return null;
  }
}

// A single org by id. RLS hides orgs the user isn't a member of.
export async function getOrganization(orgId) {
  if (!orgId || !isSupabaseConfigured()) return null;
  try {
    const sb = createClient();
    const { data, error } = await sb
      .from(ORGS)
      .select("id, name, slug, description, avatar_url, created_at")
      .eq("id", orgId)
      .maybeSingle();
    if (error) {
      console.error("[chat_orgs.get]", error.message);
      return null;
    }
    return normalizeOrg(data);
  } catch (e) {
    console.error("[chat_orgs.get]", e);
    return null;
  }
}

// Membership rows for an org — the authoritative org roster. RLS requires the
// caller to be a member. Names/avatars are resolved later via chat.profiles.
export async function listOrgMembers(orgId) {
  if (!orgId || !isSupabaseConfigured()) return null;
  try {
    const sb = createClient();
    const { data, error } = await sb
      .from(ORG_USERS)
      .select(`"user", organization, role, created_at`)
      .eq("organization", orgId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[chat_orgs.members]", error.message);
      return null;
    }
    return (data || []).map(normalizeMember).filter((m) => m?.userId);
  } catch (e) {
    console.error("[chat_orgs.members]", e);
    return null;
  }
}

// Convenience wrapper around dash's is_org_member(uuid) RPC. Used by callers
// that need a single boolean answer without loading the org list.
export async function isOrgMember(orgId) {
  if (!orgId || !isSupabaseConfigured()) return false;
  try {
    const sb = createClient();
    const { data, error } = await sb.rpc("is_org_member", { target_org: orgId });
    if (error) {
      console.error("[chat_orgs.isMember]", error.message);
      return false;
    }
    return Boolean(data);
  } catch (e) {
    console.error("[chat_orgs.isMember]", e);
    return false;
  }
}
