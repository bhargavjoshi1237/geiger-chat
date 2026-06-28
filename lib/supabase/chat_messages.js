"use client";

// Data layer for public.flow_chat_messages. Pure data access; the screen owns
// optimistic state and toasts.

import { createClient } from "./client";
import { isSupabaseConfigured, minsAgo, chatDb } from "./config";

const TABLE = "messages";

// DB row -> camelCase message view-model. `reactions` ({ emoji: [profileId] })
// and `replyTo` ({ id, authorId, text }) live in the metadata bag. Keeps
// createdAt around for ordering / de-duplication against realtime inserts.
export function normalizeMessage(row) {
  if (!row) return null;
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    authorId: row.author_id,
    minsAgo: minsAgo(row.created_at),
    text: row.text ?? "",
    createdAt: row.created_at,
    reactions: meta.reactions && typeof meta.reactions === "object" ? meta.reactions : {},
    replyTo: meta.replyTo || null,
    call: meta.call || null,
  };
}

export async function listMessages(conversationId) {
  if (!conversationId || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[chat_messages.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeMessage);
  } catch (e) {
    console.error("[chat_messages.list]", e);
    return null;
  }
}

// Insert a message. Honors a caller-supplied id so the optimistic row and the
// inserted row share a UUID. A `replyTo` ({ id, authorId, text }) is denormalized
// into the metadata bag so the quoted snippet renders without an extra fetch.
export async function sendMessage({ id, conversationId, authorId, text, replyTo, call }) {
  if (!conversationId || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const payload = {
      conversation_id: conversationId,
      author_id: authorId || null,
      text: text ?? "",
    };
    if (id) payload.id = id;
    if (replyTo?.id || call) {
      payload.metadata = {};
      if (replyTo?.id) {
        payload.metadata.replyTo = { id: replyTo.id, authorId: replyTo.authorId || null, text: replyTo.text || "" };
      }
      // A call-event card ("call ended" / "missed call") rendered inline in the
      // thread; carries kind, status and duration.
      if (call) payload.metadata.call = call;
    }
    const { data, error } = await sb.from(TABLE).insert(payload).select("*").single();
    if (error) {
      console.error("[chat_messages.send]", error.message);
      return null;
    }
    return normalizeMessage(data);
  } catch (e) {
    console.error("[chat_messages.send]", e);
    return null;
  }
}

// Persist a message's reactions map ({ emoji: [profileId] }) via the metadata
// merge RPC, so it never clobbers a sibling key (e.g. replyTo).
export async function setMessageReactions(id, reactions) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    const { error } = await sb.rpc("merge_message_meta", {
      p_id: id,
      p_patch: { reactions: reactions || {} },
    });
    if (error) {
      console.error("[chat_messages.react]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_messages.react]", e);
    return false;
  }
}

// Subscribe to message inserts AND updates (the latter carry reaction / edit
// changes). The handler receives the raw row plus the event type ("INSERT" |
// "UPDATE"); the screen decides whether it belongs to a conversation it shows.
// Returns an unsubscribe function (no-op when the DB isn't configured).
export function subscribeMessages(handler) {
  if (!isSupabaseConfigured()) return () => {};
  try {
    const sb = createClient();
    const channel = sb
      .channel(`chat-messages-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "chat", table: TABLE },
        (payload) => handler?.(payload.new, payload.eventType),
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
    console.error("[chat_messages.subscribe]", e);
    return () => {};
  }
}
