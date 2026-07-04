"use client";

// Realtime signaling for WebRTC calls, over Supabase broadcast (ephemeral — no
// DB writes, which suits high-frequency ICE traffic). Two surfaces:
//   • a per-user RING channel (chat-ring-<userId>) carrying invite/cancel/
//     decline/accept/busy, so a callee is alerted even with no call open;
//   • a per-conversation CALL channel (chat-call-<convId>) carrying the mesh
//     signaling (join/offer/answer/ice/leave) between everyone in the call.

import { createClient } from "./client";
import { isSupabaseConfigured } from "./config";
import { isPlaygroundMode } from "@/lib/chat/playground";

// ICE servers: public STUN always; TURN only if configured (needed for ~10-15%
// of users behind strict/symmetric NATs). Set NEXT_PUBLIC_TURN_URL (+_USERNAME,
// +_CREDENTIAL) to enable relay.
export function iceServers() {
  const servers = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME || undefined,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || undefined,
    });
  }
  return servers;
}

// Subscribe to my personal ring channel. Returns an unsubscribe fn.
export function subscribeRing(meId, handlers = {}) {
  if (isPlaygroundMode()) return () => {};
  if (!meId || !isSupabaseConfigured()) return () => {};
  try {
    const sb = createClient();
    const channel = sb.channel(`chat-ring-${meId}`, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "invite" }, ({ payload }) => handlers.onInvite?.(payload))
      .on("broadcast", { event: "cancel" }, ({ payload }) => handlers.onCancel?.(payload))
      .on("broadcast", { event: "decline" }, ({ payload }) => handlers.onDecline?.(payload))
      .on("broadcast", { event: "accept" }, ({ payload }) => handlers.onAccept?.(payload))
      .on("broadcast", { event: "busy" }, ({ payload }) => handlers.onBusy?.(payload))
      .subscribe();
    return () => {
      try {
        sb.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  } catch (e) {
    console.error("[call_signaling.ring.subscribe]", e);
    return () => {};
  }
}

// Fire a one-off ring event at a set of users (their personal channels). Opens a
// transient channel per target, sends once it's joined, then tears down.
export async function ring(targetIds = [], event, payload) {
  if (!isSupabaseConfigured()) return;
  const ids = (targetIds || []).filter(Boolean);
  if (!ids.length) return;
  const sb = createClient();
  await Promise.all(
    ids.map(
      (id) =>
        new Promise((resolve) => {
          const ch = sb.channel(`chat-ring-${id}`);
          ch.subscribe((status) => {
            if (status !== "SUBSCRIBED") return;
            ch.send({ type: "broadcast", event, payload }).finally(() => {
              try {
                sb.removeChannel(ch);
              } catch {
                /* ignore */
              }
              resolve();
            });
          });
        }),
    ),
  );
}

// Join a conversation's call channel for mesh signaling. Returns { send, leave }
// or null when the DB isn't configured.
export function joinCall(conversationId, handlers = {}) {
  if (!conversationId || !isSupabaseConfigured()) return null;
  try {
    const sb = createClient();
    const channel = sb.channel(`chat-call-${conversationId}`, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "join" }, ({ payload }) => handlers.onJoin?.(payload))
      .on("broadcast", { event: "offer" }, ({ payload }) => handlers.onOffer?.(payload))
      .on("broadcast", { event: "answer" }, ({ payload }) => handlers.onAnswer?.(payload))
      .on("broadcast", { event: "ice" }, ({ payload }) => handlers.onIce?.(payload))
      .on("broadcast", { event: "leave" }, ({ payload }) => handlers.onLeave?.(payload))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") handlers.onReady?.();
      });
    return {
      send: (event, payload) => channel.send({ type: "broadcast", event, payload }),
      leave: () => {
        try {
          sb.removeChannel(channel);
        } catch {
          /* ignore */
        }
      },
    };
  } catch (e) {
    console.error("[call_signaling.joinCall]", e);
    return null;
  }
}
