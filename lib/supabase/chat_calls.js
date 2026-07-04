"use client";

// Data layer for public.flow_chat_calls — the persisted call log shown on the
// Calls screen. (There is no live WebRTC transport; the meet stage is local UI.)

import { isSupabaseConfigured, minsAgo, chatDb } from "./config";
import { isPlaygroundMode, pg } from "@/lib/chat/playground";

const TABLE = "calls";

export function normalizeCall(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title ?? "Call",
    kind: row.kind ?? "video",
    direction: row.direction ?? "outgoing",
    missed: !!row.missed,
    durationMins: Number(row.duration_mins ?? 0),
    participantIds: Array.isArray(row.participant_ids) ? row.participant_ids : [],
    minsAgo: minsAgo(row.created_at),
  };
}

export async function listCalls(meId) {
  if (isPlaygroundMode()) return pg.calls();
  if (!meId || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("owner_id", meId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[chat_calls.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeCall);
  } catch (e) {
    console.error("[chat_calls.list]", e);
    return null;
  }
}

export async function logCall({ id, title, kind = "video", direction = "outgoing", missed = false, durationMins = 0, ownerId, participantIds = [] }) {
  if (isPlaygroundMode()) return pg.logCall({ id, title, kind, direction, durationMins, ownerId, participantIds });
  if (!ownerId || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const payload = {
      title: title || "Call",
      kind,
      direction,
      missed,
      duration_mins: Number(durationMins) || 0,
      owner_id: ownerId,
      participant_ids: participantIds,
    };
    if (id) payload.id = id;
    const { data, error } = await sb.from(TABLE).insert(payload).select("*").single();
    if (error) {
      console.error("[chat_calls.log]", error.message);
      return null;
    }
    return normalizeCall(data);
  } catch (e) {
    console.error("[chat_calls.log]", e);
    return null;
  }
}
