"use client";

// Data layer for public.flow_chat_notifications — the Inbox. Shape mirrors the
// suite's inbox rows (icon = lucide name, bg_color/icon_color = tailwind
// classes, extra = rich payload).

import { createClient } from "./client";
import { isSupabaseConfigured, minsAgo, chatDb } from "./config";
import { isPlaygroundMode, pg } from "@/lib/chat/playground";

const TABLE = "notifications";

export function normalizeNotification(row) {
  if (!row) return null;
  let extra = row.extra ?? null;
  if (typeof extra === "string") {
    try {
      extra = JSON.parse(extra);
    } catch {
      extra = null;
    }
  }
  return {
    id: row.id,
    type: row.type ?? "Message",
    title: row.title ?? "",
    description: row.description ?? "",
    read: !!row.read,
    icon: row.icon ?? "Bell",
    bg_color: row.bg_color ?? "bg-surface-hover",
    icon_color: row.icon_color ?? "text-muted-foreground",
    extra,
    minsAgo: minsAgo(row.created_at),
    time: row.created_at,
  };
}

export async function listNotifications(meId) {
  if (isPlaygroundMode()) return pg.notifications();
  if (!meId || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("profile_id", meId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[chat_notifications.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeNotification);
  } catch (e) {
    console.error("[chat_notifications.list]", e);
    return null;
  }
}

export async function createNotification({ id, profileId, type, title, description, icon, bgColor, iconColor, extra }) {
  if (!profileId || !isSupabaseConfigured()) return null;
  try {
    const sb = chatDb();
    const payload = {
      profile_id: profileId,
      type: type || "Message",
      title: title || "",
      description: description || "",
      icon: icon || "Bell",
      bg_color: bgColor || "bg-surface-hover",
      icon_color: iconColor || "text-muted-foreground",
      extra: extra ?? null,
    };
    if (id) payload.id = id;
    const { data, error } = await sb.from(TABLE).insert(payload).select("*").single();
    if (error) {
      console.error("[chat_notifications.create]", error.message);
      return null;
    }
    return normalizeNotification(data);
  } catch (e) {
    console.error("[chat_notifications.create]", e);
    return null;
  }
}

export async function markNotificationRead(id, read = true) {
  if (isPlaygroundMode()) return true;
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    const { error } = await sb.from(TABLE).update({ read }).eq("id", id);
    if (error) {
      console.error("[chat_notifications.markRead]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_notifications.markRead]", e);
    return false;
  }
}

export async function markAllNotificationsRead(meId) {
  if (isPlaygroundMode()) return true;
  if (!meId || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    const { error } = await sb.from(TABLE).update({ read: true }).eq("profile_id", meId).eq("read", false);
    if (error) {
      console.error("[chat_notifications.markAllRead]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_notifications.markAllRead]", e);
    return false;
  }
}

export async function deleteNotification(id) {
  if (isPlaygroundMode()) return true;
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = chatDb();
    const { error } = await sb.from(TABLE).delete().eq("id", id);
    if (error) {
      console.error("[chat_notifications.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[chat_notifications.delete]", e);
    return false;
  }
}

export function subscribeNotifications(meId, handler) {
  if (isPlaygroundMode()) return () => {};
  if (!meId || !isSupabaseConfigured()) return () => {};
  try {
    const sb = createClient();
    const channel = sb
      .channel(`chat-notifications-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "chat", table: TABLE, filter: `profile_id=eq.${meId}` },
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
    console.error("[chat_notifications.subscribe]", e);
    return () => {};
  }
}
