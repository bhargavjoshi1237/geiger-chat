"use client";

// Data layer for public.flow_chat_files — metadata for files shared in the
// workspace (binaries live in Storage; see chat_storage.js).

import { isSupabaseConfigured, minsAgo, chatDb } from "./config";

const TABLE = "files";

export function normalizeFile(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name ?? "file",
    kind: row.kind ?? "doc",
    size: row.size ?? "",
    ownerId: row.owner_id ?? null,
    source: row.source ?? "",
    url: row.url ?? "",
    conversationId: row.conversation_id ?? null,
    messageId: row.message_id ?? null,
    contentType: row.content_type ?? "",
    minsAgo: minsAgo(row.created_at),
  };
}

export async function listFiles() {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[chat_files.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeFile);
  } catch (e) {
    console.error("[chat_files.list]", e);
    return null;
  }
}

export async function createFile({ id, name, kind = "doc", size = "", source = "", url, ownerId, conversationId, messageId, contentType }) {
  if (!name || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const payload = {
      name, kind, size, source, url: url || null, owner_id: ownerId || null,
      conversation_id: conversationId || null,
      message_id: messageId || null,
      content_type: contentType || null,
    };
    if (id) payload.id = id;
    const { data, error } = await sb.from(TABLE).insert(payload).select("*").single();
    if (error) {
      console.error("[chat_files.create]", error.message);
      return null;
    }
    return normalizeFile(data);
  } catch (e) {
    console.error("[chat_files.create]", e);
    return null;
  }
}

// Files shared in one conversation (Files panel), newest first.
export async function listFilesByConversation(conversationId) {
  if (!conversationId || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[chat_files.listByConversation]", error.message);
      return null;
    }
    return (data || []).map(normalizeFile);
  } catch (e) {
    console.error("[chat_files.listByConversation]", e);
    return null;
  }
}
