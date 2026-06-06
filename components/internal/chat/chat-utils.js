// Shared helpers for the chat UI. Times are stored as "minutes ago" so the
// rendered output is deterministic and independent of the wall clock.

import { ME, getPerson } from "@/lib/mock/chat-data";

export const PRESENCE = {
  online: { color: "#22c55e", label: "Active" },
  away: { color: "#f59e0b", label: "Away" },
  dnd: { color: "#ef4444", label: "Do not disturb" },
  offline: { color: "#737373", label: "Offline" },
};

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

// "minutes ago" -> clock time label (e.g. "9:42 AM"), derived deterministically
// from a fixed anchor so the demo never shifts between renders.
export function clockTime(minsAgo) {
  // Anchor at 10:00 for stable, readable timestamps across the mock data.
  const anchor = 10 * 60; // minutes since midnight
  let total = anchor - minsAgo;
  total = ((total % 1440) + 1440) % 1440;
  let hours = Math.floor(total / 60);
  const minutes = total % 60;
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
