// Shared helpers for the chat UI. Times are stored as "minutes ago" so the
// rendered output is deterministic and independent of the wall clock.

import { ThumbsUp, Heart, Laugh, PartyPopper, Lightbulb, Flame } from "lucide-react";
import { ME, getPerson } from "@/lib/chat/people-store";

export const PRESENCE = {
  online: { color: "#22c55e", label: "Active" },
  away: { color: "#f59e0b", label: "Away" },
  dnd: { color: "#ef4444", label: "Do not disturb" },
  offline: { color: "#737373", label: "Offline" },
};

// Single source of truth for message reactions. Stored by `key` (not an emoji
// glyph) so the UI is icon-only and consistent everywhere. `colorClass` tints
// the Lucide icon; consumers render `icon` as a component.
export const REACTIONS = [
  { key: "like", label: "Like", icon: ThumbsUp, colorClass: "text-blue-400" },
  { key: "love", label: "Love", icon: Heart, colorClass: "text-rose-400" },
  { key: "laugh", label: "Haha", icon: Laugh, colorClass: "text-amber-400" },
  { key: "celebrate", label: "Celebrate", icon: PartyPopper, colorClass: "text-fuchsia-400" },
  { key: "insightful", label: "Insightful", icon: Lightbulb, colorClass: "text-yellow-400" },
  { key: "fire", label: "Fire", icon: Flame, colorClass: "text-orange-400" },
];

export const REACTION_MAP = Object.fromEntries(REACTIONS.map((r) => [r.key, r]));

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// "minutes ago" -> short relative label (e.g. "3m", "2h", "Yesterday").
export function fromNow(minsAgo) {
  if (minsAgo < 1) return "now";
  if (minsAgo < 60) return `${minsAgo}m`;
  const hours = Math.round(minsAgo / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

// "minutes ago" -> clock time label (e.g. "9:42 AM"), computed from the actual
// time the message was sent (now minus minsAgo).
export function clockTime(minsAgo) {
  const d = new Date(Date.now() - (minsAgo || 0) * 60000);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function durationLabel(mins) {
  if (!mins) return "—";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function lastMessagePreview(conversation) {
  const last = conversation.messages?.[conversation.messages.length - 1];
  if (last?.call) {
    return last.call.status === "missed" ? "Missed call" : "Call ended";
  }
  return last?.text || "";
}

// Prefix for a conversation preview: "You: " for your own last message, or the
// author's first name in channels. DMs from the other person get no prefix.
export function previewAuthor(conversation) {
  const last = conversation.messages?.[conversation.messages.length - 1];
  if (!last) return "";
  if (last.authorId === ME.id) return "You: ";
  if (conversation.type === "channel") return `${getPerson(last.authorId).firstName}: `;
  return "";
}
