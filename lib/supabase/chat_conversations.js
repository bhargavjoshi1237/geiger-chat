"use client";

// Data layer for public.flow_chat_conversations + public.flow_chat_members.
// A conversation is a 'dm' (two members, deduped by dm_key) or a 'channel'.
// Returns camelCase view-models matching the chat UI:
//   dm:      { id, type:"dm", participantId, unread, pinned, lastActivity, messages }
//   channel: { id, type:"channel", name, topic, memberIds, unread, pinned, lastActivity, messages }
// Pure: console.error on failure, return null/[]/false. Never throws/toasts.

import { createClient } from "./client";
import { isSupabaseConfigured, minsAgo, chatDb } from "./config";
import { normalizeMessage } from "./chat_messages";
import { isPlaygroundMode, pg } from "@/lib/chat/playground";

const CONVERSATIONS = "conversations";
const MEMBERS = "members";
const MESSAGES = "messages";

// Assemble a conversation view-model from a conversation row + resolved members,
// last message and unread count.
export function normalizeConversation(c, { meId, memberIds = [], lastMessage = null, unread = 0, pinned = false, reads = {} } = {}) {
  if (!c) return null;
  const base = {
    id: c.id,
    type: c.kind,
    pinned: !!pinned,
    unread: unread || 0,
    lastActivity: minsAgo(c.last_activity_at),
    // Map of profileId -> last_read_at ISO string, for read receipts.
    reads: reads || {},
    messages: lastMessage ? [normalizeMessage(lastMessage)] : [],
  };
  if (c.kind === "channel") {
    return {
      ...base,
      name: c.name || "",
      topic: c.topic || "",
      visibility: c.visibility || "public",
      memberIds,
    };
  }
  return { ...base, participantId: memberIds.find((id) => id !== meId) || null };
}

// All of my conversations of a kind, newest activity first, each with its last
// message (preview) and unread count. When organizationId is provided, the
// result is scoped to that org so /home only shows the current org's chats.
export async function listConversations(meId, kind, organizationId = null) {
  if (isPlaygroundMode()) return pg.conversations(kind);
  if (!meId || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();

    // 1) my memberships, joined to the conversation (inner-filtered by kind).
    let membersQuery = sb
      .from(MEMBERS)
      .select("pinned, last_read_at, conversation:conversations!inner(*)")
      .eq("profile_id", meId)
      .eq("conversation.kind", kind)
      .is("conversation.deleted_at", null);
    if (organizationId) {
      membersQuery = membersQuery.eq("conversation.organization_id", organizationId);
    }
    const { data: memberRows, error: mErr } = await membersQuery;
    if (mErr) {
      console.error("[chat_conversations.list]", mErr.message);
      return null;
    }
    const convs = (memberRows || [])
      .filter((r) => r.conversation)
      .map((r) => ({ row: r.conversation, pinned: r.pinned, lastReadAt: r.last_read_at }));
    if (convs.length === 0) return [];

    const convIds = convs.map((c) => c.row.id);

    // 2) all members of those conversations (for memberIds / dm participant),
    //    plus each member's last_read_at to drive read receipts.
    const { data: allMembers } = await sb
      .from(MEMBERS)
      .select("conversation_id, profile_id, last_read_at")
      .in("conversation_id", convIds);
    const membersByConv = {};
    const readsByConv = {};
    for (const m of allMembers || []) {
      (membersByConv[m.conversation_id] ||= []).push(m.profile_id);
      (readsByConv[m.conversation_id] ||= {})[m.profile_id] = m.last_read_at || null;
    }

    // 3) messages for last-preview + unread. Thread replies (thread_id set) are
    //    excluded so a busy thread doesn't skew the main preview / unread count.
    const { data: msgs } = await sb
      .from(MESSAGES)
      .select("id, conversation_id, author_id, text, created_at")
      .in("conversation_id", convIds)
      .is("deleted_at", null)
      .is("thread_id", null)
      .order("created_at", { ascending: true })
      .limit(2000);
    const lastByConv = {};
    const msgsByConv = {};
    for (const m of msgs || []) {
      (msgsByConv[m.conversation_id] ||= []).push(m);
      lastByConv[m.conversation_id] = m;
    }

    convs.sort(
      (a, b) =>
        new Date(b.row.last_activity_at).getTime() - new Date(a.row.last_activity_at).getTime(),
    );

    return convs.map((c) => {
      const lastReadTs = c.lastReadAt ? new Date(c.lastReadAt).getTime() : 0;
      const unread = (msgsByConv[c.row.id] || []).filter(
        (m) => m.author_id !== meId && new Date(m.created_at).getTime() > lastReadTs,
      ).length;
      return normalizeConversation(c.row, {
        meId,
        memberIds: membersByConv[c.row.id] || [],
        lastMessage: lastByConv[c.row.id] || null,
        unread,
        pinned: c.pinned,
        reads: readsByConv[c.row.id] || {},
      });
    });
  } catch (e) {
    console.error("[chat_conversations.list]", e);
    return null;
  }
}

export async function createChannel({ id, name, topic, visibility = "public", createdBy, memberIds = [], organizationId = null }) {
  if (isPlaygroundMode()) return pg.createChannel({ id, name, topic, visibility, createdBy, memberIds });
  if (!isSupabaseConfigured()) return null;
  const clean = (name || "").trim().replace(/^#/, "");
  if (!clean) return null;
  try {
    const sb = chatDb();
    const payload = { kind: "channel", name: clean, topic: topic || null, visibility, created_by: createdBy || null };
    if (id) payload.id = id;
    if (organizationId) payload.organization_id = organizationId;
    const { data: conv, error } = await sb.from(CONVERSATIONS).insert(payload).select("*").single();
    if (error) {
      console.error("[chat_conversations.createChannel]", error.message);
      return null;
    }
    const memberSet = [...new Set([createdBy, ...memberIds].filter(Boolean))];
    if (memberSet.length) {
      const rows = memberSet.map((pid) => ({
        conversation_id: conv.id,
        profile_id: pid,
        role: pid === createdBy ? "admin" : "member",
      }));
      const { error: memErr } = await sb
        .from(MEMBERS)
        .upsert(rows, { onConflict: "conversation_id,profile_id" });
      if (memErr) console.error("[chat_conversations.createChannel.members]", memErr.message);
    }
    return normalizeConversation(conv, { meId: createdBy, memberIds: memberSet, pinned: false });
  } catch (e) {
    console.error("[chat_conversations.createChannel]", e);
    return null;
  }
}

// Get the existing DM with a person, or create one. Deduped by a sorted dm_key,
// scoped to the org when organizationId is provided so the same two people can
// have a separate DM thread in each org they share.
export async function createOrGetDm(meId, otherId, organizationId = null) {
  if (isPlaygroundMode()) return pg.createOrGetDm(meId, otherId);
  if (!meId || !otherId || meId === otherId || !isSupabaseConfigured()) return null;
  const dmKey = [meId, otherId].sort().join(":");
  try {
    const sb = chatDb();
    let lookup = sb
      .from(CONVERSATIONS)
      .select("*")
      .eq("dm_key", dmKey)
      .is("deleted_at", null);
    if (organizationId) lookup = lookup.eq("organization_id", organizationId);
    const { data: existing } = await lookup.maybeSingle();

    let conv = existing;
    let pinned = false;
    if (!conv) {
      const insertPayload = { kind: "dm", dm_key: dmKey, created_by: meId };
      if (organizationId) insertPayload.organization_id = organizationId;
      const { data: created, error } = await sb
        .from(CONVERSATIONS)
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) {
        // Lost a race on the unique dm_key — fetch the winner.
        let raceLookup = sb
          .from(CONVERSATIONS)
          .select("*")
          .eq("dm_key", dmKey);
        if (organizationId) raceLookup = raceLookup.eq("organization_id", organizationId);
        const { data: raced } = await raceLookup.maybeSingle();
        if (!raced) {
          console.error("[chat_conversations.createOrGetDm]", error.message);
          return null;
        }
        conv = raced;
      } else {
        conv = created;
      }
    }

    // Make sure both members exist (and that I'm one of them).
    await sb.from(MEMBERS).upsert(
      [
        { conversation_id: conv.id, profile_id: meId },
        { conversation_id: conv.id, profile_id: otherId },
      ],
      { onConflict: "conversation_id,profile_id" },
    );

    return normalizeConversation(conv, { meId, memberIds: [meId, otherId], pinned });
  } catch (e) {
    console.error("[chat_conversations.createOrGetDm]", e);
    return null;
  }
}

export async function inviteMembers(conversationId, profileIds = []) {
  if (isPlaygroundMode()) return true;
  const ids = [...new Set((profileIds || []).filter(Boolean))];
  if (!conversationId || ids.length === 0 || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    const rows = ids.map((pid) => ({ conversation_id: conversationId, profile_id: pid }));
    const { error } = await sb.from(MEMBERS).upsert(rows, { onConflict: "conversation_id,profile_id" });
    if (error) {
      console.error("[chat_conversations.invite]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_conversations.invite]", e);
    return false;
  }
}

export async function setPinned(conversationId, meId, pinned) {
  if (isPlaygroundMode()) return true;
  if (!conversationId || !meId || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    const { error } = await sb
      .from(MEMBERS)
      .update({ pinned: !!pinned })
      .eq("conversation_id", conversationId)
      .eq("profile_id", meId);
    if (error) {
      console.error("[chat_conversations.setPinned]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_conversations.setPinned]", e);
    return false;
  }
}

export async function markRead(conversationId, meId) {
  if (isPlaygroundMode()) return true;
  if (!conversationId || !meId || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    const { error } = await sb
      .from(MEMBERS)
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("profile_id", meId);
    if (error) {
      console.error("[chat_conversations.markRead]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_conversations.markRead]", e);
    return false;
  }
}

// Leave a channel / remove a DM from my list (drops my membership only).
export async function leaveConversation(conversationId, meId) {
  if (isPlaygroundMode()) return true;
  if (!conversationId || !meId || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    const { error } = await sb
      .from(MEMBERS)
      .delete()
      .eq("conversation_id", conversationId)
      .eq("profile_id", meId);
    if (error) {
      console.error("[chat_conversations.leave]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_conversations.leave]", e);
    return false;
  }
}

// Auto-join every public channel I'm not yet a member of (so seeded / team-wide
// channels show up for everyone). When organizationId is provided, only public
// channels in that org are considered.
export async function ensurePublicChannelMembership(meId, organizationId = null) {
  if (isPlaygroundMode()) return true;
  if (!meId || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    let pubQuery = sb
      .from(CONVERSATIONS)
      .select("id")
      .eq("kind", "channel")
      .eq("visibility", "public")
      .is("deleted_at", null);
    if (organizationId) pubQuery = pubQuery.eq("organization_id", organizationId);
    const { data: pub } = await pubQuery;
    if (!pub || pub.length === 0) return true;
    const pubIds = pub.map((p) => p.id);
    const { data: mine } = await sb
      .from(MEMBERS)
      .select("conversation_id")
      .eq("profile_id", meId)
      .in("conversation_id", pubIds);
    const mineSet = new Set((mine || []).map((m) => m.conversation_id));
    const toJoin = pubIds.filter((id) => !mineSet.has(id)).map((id) => ({ conversation_id: id, profile_id: meId }));
    if (toJoin.length) {
      await sb.from(MEMBERS).upsert(toJoin, { onConflict: "conversation_id,profile_id" });
    }
    return true;
  } catch (e) {
    console.error("[chat_conversations.ensurePublic]", e);
    return false;
  }
}

// Ensure the org has its default #general channel and that I'm a member of it.
// A fresh org starts with no channels (the seeded demo #general has a null org
// and is hidden from org-scoped queries), so this creates one on first use to
// give the org "circle" a place to talk. Deduped per org by the unique
// (organization_id, lower(name)) index on public channels; on the rare insert
// race we fetch the winner, mirroring createOrGetDm.
export async function ensureOrgGeneralChannel(meId, organizationId) {
  if (isPlaygroundMode()) return null;
  if (!meId || !organizationId || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    let { data: chan } = await sb
      .from(CONVERSATIONS)
      .select("*")
      .eq("organization_id", organizationId)
      .eq("kind", "channel")
      .eq("name", "general")
      .is("deleted_at", null)
      .maybeSingle();

    if (!chan) {
      const payload = {
        kind: "channel",
        name: "general",
        topic: "Company-wide announcements and team chat",
        visibility: "public",
        created_by: meId,
        organization_id: organizationId,
      };
      const { data: created, error } = await sb
        .from(CONVERSATIONS)
        .insert(payload)
        .select("*")
        .single();
      if (error) {
        // Lost the create race on the unique (org, name) index — fetch the winner.
        const { data: raced } = await sb
          .from(CONVERSATIONS)
          .select("*")
          .eq("organization_id", organizationId)
          .eq("kind", "channel")
          .eq("name", "general")
          .is("deleted_at", null)
          .maybeSingle();
        if (!raced) {
          console.error("[chat_conversations.ensureGeneral]", error.message);
          return null;
        }
        chan = raced;
      } else {
        chan = created;
      }
    }

    await sb
      .from(MEMBERS)
      .upsert({ conversation_id: chan.id, profile_id: meId }, { onConflict: "conversation_id,profile_id" });
    return chan.id;
  } catch (e) {
    console.error("[chat_conversations.ensureGeneral]", e);
    return null;
  }
}

// Realtime: any member's read marker moving (last_read_at), across all
// conversations. The screen filters to conversations it shows and to other
// people (my own reads are handled locally) to surface "Seen" on my messages.
// Returns an unsubscribe function.
export function subscribeMemberReads(handler) {
  if (isPlaygroundMode()) return () => {};
  if (!isSupabaseConfigured()) return () => {};
  try {
    const sb = createClient();
    const channel = sb
      .channel(`chat-reads-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "chat", table: MEMBERS },
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
    console.error("[chat_conversations.subscribeReads]", e);
    return () => {};
  }
}

// Realtime: my membership rows changing (a new channel / invite / removal).
// Returns an unsubscribe function.
export function subscribeMembership(meId, handler) {
  if (isPlaygroundMode()) return () => {};
  if (!meId || !isSupabaseConfigured()) return () => {};
  try {
    const sb = createClient();
    const channel = sb
      .channel(`chat-members-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "chat", table: MEMBERS, filter: `profile_id=eq.${meId}` },
        (payload) => handler?.(payload),
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
    console.error("[chat_conversations.subscribeMembership]", e);
    return () => {};
  }
}
