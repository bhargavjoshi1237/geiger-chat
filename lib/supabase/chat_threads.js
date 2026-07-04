"use client";

// Data layer for chat.threads — a named sub-thread rooted on a message and owned
// by a conversation (channel or dm). Replies live in chat.messages with a
// thread_id (see chat_messages.js). Returns camelCase view-models:
//   { id, conversationId, rootMessageId, title, createdBy, lastActivity,
//     replyCount }
// Pure: console.error on failure, return null/[]/false. Never throws/toasts.

import { createClient } from "./client";
import { isSupabaseConfigured, minsAgo, chatDb } from "./config";

const TABLE = "threads";
const MESSAGES = "messages";

export function normalizeThread(row, { replyCount = 0 } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    rootMessageId: row.root_message_id ?? null,
    title: row.title ?? "Thread",
    createdBy: row.created_by ?? null,
    lastActivity: minsAgo(row.last_activity_at),
    createdAt: row.created_at,
    replyCount: replyCount || 0,
  };
}

// All threads in a conversation, most-recently-active first, each with a reply
// count (messages carrying that thread_id).
export async function listThreads(conversationId) {
  if (!conversationId || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("last_activity_at", { ascending: false });
    if (error) {
      console.error("[chat_threads.list]", error.message);
      return null;
    }
    const threads = data || [];
    if (threads.length === 0) return [];

    // Reply counts: tally thread_id across the conversation's thread messages.
    const { data: msgs } = await sb
      .from(MESSAGES)
      .select("thread_id")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .not("thread_id", "is", null);
    const counts = {};
    for (const m of msgs || []) counts[m.thread_id] = (counts[m.thread_id] || 0) + 1;

    return threads.map((t) => normalizeThread(t, { replyCount: counts[t.id] || 0 }));
  } catch (e) {
    console.error("[chat_threads.list]", e);
    return null;
  }
}

export async function createThread({ id, conversationId, rootMessageId, title, createdBy }) {
  if (!conversationId || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const payload = {
      conversation_id: conversationId,
      root_message_id: rootMessageId || null,
      title: (title || "Thread").trim().slice(0, 120) || "Thread",
      created_by: createdBy || null,
    };
    if (id) payload.id = id;
    const { data, error } = await sb.from(TABLE).insert(payload).select("*").single();
    if (error) {
      console.error("[chat_threads.create]", error.message);
      return null;
    }
    return normalizeThread(data);
  } catch (e) {
    console.error("[chat_threads.create]", e);
    return null;
  }
}

export async function renameThread(id, title) {
  if (!id || !isSupabaseConfigured()) return false;
  const clean = (title || "").trim().slice(0, 120);
  if (!clean) return false;
  try {
    const sb = chatDb();
    const { error } = await sb.from(TABLE).update({ title: clean }).eq("id", id);
    if (error) {
      console.error("[chat_threads.rename]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_threads.rename]", e);
    return false;
  }
}

export async function softDeleteThread(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[chat_threads.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_threads.delete]", e);
    return false;
  }
}

// Realtime: threads created / renamed / soft-deleted in a conversation. The
// handler receives the raw row plus the event type. Returns an unsubscribe fn.
export function subscribeThreads(conversationId, handler) {
  if (!conversationId || !isSupabaseConfigured()) return () => {};
  try {
    const sb = createClient();
    const channel = sb
      .channel(`chat-threads-${conversationId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "chat", table: TABLE, filter: `conversation_id=eq.${conversationId}` },
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
    console.error("[chat_threads.subscribe]", e);
    return () => {};
  }
}
