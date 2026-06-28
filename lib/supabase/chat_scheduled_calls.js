"use client";

// Data layer for public.flow_chat_scheduled_calls. Pure data access; the screen
// owns toasts, and the reminder poller (lib/chat/use-call-reminders.js) turns a
// due row into an Inbox notification.

import { isSupabaseConfigured, chatDb } from "./config";

const TABLE = "scheduled_calls";

export function normalizeScheduledCall(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title ?? "Scheduled call",
    kind: row.kind ?? "video",
    scheduledAt: row.scheduled_at,
    conversationId: row.conversation_id ?? null,
    createdBy: row.created_by ?? null,
    participantIds: Array.isArray(row.participant_ids) ? row.participant_ids : [],
    reminded: !!row.reminded,
  };
}

export async function createScheduledCall({ id, title, kind = "video", scheduledAt, conversationId, createdBy, participantIds = [] }) {
  if (!scheduledAt || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const payload = {
      title: title || "Scheduled call",
      kind,
      scheduled_at: scheduledAt,
      conversation_id: conversationId || null,
      created_by: createdBy || null,
      participant_ids: participantIds,
    };
    if (id) payload.id = id;
    const { data, error } = await sb.from(TABLE).insert(payload).select("*").single();
    if (error) {
      console.error("[chat_scheduled_calls.create]", error.message);
      return null;
    }
    return normalizeScheduledCall(data);
  } catch (e) {
    console.error("[chat_scheduled_calls.create]", e);
    return null;
  }
}

// My upcoming calls that fall inside the next hour and haven't been reminded yet
// (and haven't already started).
export async function listDueReminders(meId) {
  if (!meId || !isSupabaseConfigured()) return [];
  try {
    const sb = chatDb();
    const now = new Date();
    const inHour = new Date(now.getTime() + 60 * 60 * 1000);
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("created_by", meId)
      .eq("reminded", false)
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", inHour.toISOString());
    if (error) {
      console.error("[chat_scheduled_calls.due]", error.message);
      return [];
    }
    return (data || []).map(normalizeScheduledCall);
  } catch (e) {
    console.error("[chat_scheduled_calls.due]", e);
    return [];
  }
}

export async function markReminded(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    const { error } = await sb.from(TABLE).update({ reminded: true }).eq("id", id);
    if (error) {
      console.error("[chat_scheduled_calls.markReminded]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_scheduled_calls.markReminded]", e);
    return false;
  }
}
