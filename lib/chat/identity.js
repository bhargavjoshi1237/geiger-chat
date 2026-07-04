"use client";

// Resolves the current chat identity and makes it discoverable in the directory.
// If a Supabase auth session exists, that user is "me"; otherwise a stable demo
// identity is persisted in localStorage. Either way the identity is upserted
// into chat.profiles so other people can find and message it.
//
// When organizationId is provided, the profile row is linked to that org so it
// appears in the org-scoped directory and the user's presence is tracked within
// that workspace.

import { getUser } from "@/lib/supabase/user";
import { ensureProfile } from "@/lib/supabase/chat_profiles";

const LS_KEY = "geiger-chat-demo-identity";
const COLORS = ["#6366f1", "#0ea5e9", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6", "#ef4444"];

function pickColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// Load a persisted demo identity, or mint and persist a new one.
function loadOrCreateDemo() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const n = Math.floor(Math.random() * 9000) + 1000;
  const demo = {
    id: crypto.randomUUID(),
    email: `you+${n}@geiger.app`,
    username: `you${n}`,
    name: "You",
    role: "Member",
    color: pickColor(),
  };
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(demo));
  } catch {
    /* ignore */
  }
  return demo;
}

// Resolve + upsert the current identity. Returns the normalized profile VM, or
// null when the DB isn't configured. When organizationId is supplied it is
// written to the profile so the row shows up under that org.
export async function ensureIdentity(organizationId = null) {
  let input;
  const authed = await getUser().catch(() => null);
  if (authed?.id) {
    input = {
      id: authed.id,
      email: authed.email || undefined,
      username: authed.email ? authed.email.split("@")[0] : undefined,
      name: authed.name || "You",
      organizationId: organizationId || undefined,
    };
  } else {
    input = loadOrCreateDemo();
  }
  if (!input?.id) return null;
  return ensureProfile(input);
}

