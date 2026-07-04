"use client";

// Playground (landing demo) data mode.
//
// The landing page ("/") embeds the REAL chat workspace — the same topbar,
// sidebar and screens as /home — but there is no signed-in user or org, so the
// live data layer would return empty. This module lets the workspace run against
// the frontend-only sample data in `lib/mock/chat-data` instead.
//
// How it works: `ChatPlayground` flips the flag on (before any screen mounts) and
// off on unmount. Every data-layer `list*/create*/subscribe*` checks
// `isPlaygroundMode()` at the top and, when set, returns the matching mock view
// model instead of hitting Supabase. It is a no-op for /home (the flag is only
// ever set by the playground), so those guards never fire there.
//
// The mock returns already match the camelCase view models the real
// `normalize*` helpers produce, so screens render them without any special case.

import {
  ME as MOCK_ME,
  PEOPLE,
  PEOPLE_BY_ID,
  DIRECT_CONVERSATIONS,
  CHANNELS,
  RECENT_CALLS,
  FILES,
  INBOX_NOTIFICATIONS,
} from "@/lib/mock/chat-data";

const ORG_ID = "pg-org";

let ON = false;

export function enablePlaygroundMode() {
  ON = true;
}
export function disablePlaygroundMode() {
  ON = false;
}
export function isPlaygroundMode() {
  return ON;
}

function rid() {
  return crypto.randomUUID();
}

// A stable-ish ISO timestamp derived from a "minutes ago" offset, so message
// ordering and relative times render sensibly without a real clock column.
function isoAgo(mins = 0) {
  return new Date(Date.now() - (mins || 0) * 60000).toISOString();
}

// mock person -> profile view-model (matches normalizeProfile).
function toProfileVM(p) {
  const uname = (p.firstName || p.name || "user").toLowerCase().replace(/\s+/g, "");
  return {
    id: p.id,
    name: p.name,
    firstName: p.firstName || (p.name || "").split(" ")[0] || p.name,
    role: p.role ?? "",
    color: p.color || "#6366f1",
    presence: p.presence || "offline",
    lastSeen: p.lastSeen ?? 0,
    email: p.email || `${uname}@geiger.app`,
    username: uname,
    organizationId: ORG_ID,
  };
}

// mock message -> message view-model (matches normalizeMessage).
function toMessageVM(msg) {
  return {
    id: msg.id,
    authorId: msg.authorId,
    minsAgo: msg.minsAgo ?? 0,
    text: msg.text ?? "",
    createdAt: isoAgo(msg.minsAgo),
    threadId: null,
    reactions: {},
    replyTo: null,
    call: null,
    attachments: [],
  };
}

// mock conversation -> conversation view-model (matches normalizeConversation).
function toConversationVM(c) {
  const base = {
    id: c.id,
    type: c.type,
    unread: c.unread || 0,
    pinned: !!c.pinned,
    lastActivity: c.lastActivity ?? 0,
    reads: {},
    messages: (c.messages || []).map(toMessageVM),
  };
  if (c.type === "channel") {
    return {
      ...base,
      name: c.name || "",
      topic: c.topic || "",
      visibility: c.visibility || "public",
      memberIds: c.memberIds || [],
    };
  }
  return { ...base, participantId: c.participantId || null };
}

const ALL_CONVERSATIONS = [...DIRECT_CONVERSATIONS, ...CHANNELS];

function findConversation(id) {
  return ALL_CONVERSATIONS.find((c) => c.id === id) || null;
}

// mock file -> file view-model (matches normalizeFile).
function toFileVM(f) {
  return {
    id: f.id,
    name: f.name,
    kind: f.kind || "doc",
    size: f.size || "",
    ownerId: f.ownerId || null,
    source: f.source || "",
    url: f.url || "",
    conversationId: f.conversationId || null,
    messageId: null,
    contentType: "",
    minsAgo: f.minsAgo ?? 0,
  };
}

// The full mock-backed data surface. Each key mirrors a data-layer function and
// returns the same view model that function would on success.
export const pg = {
  // identity + org
  identity() {
    return {
      id: MOCK_ME.id,
      name: MOCK_ME.name,
      firstName: MOCK_ME.firstName,
      role: MOCK_ME.role || "Member",
      color: MOCK_ME.color || "#6366f1",
      presence: "online",
      lastSeen: 0,
      email: "you@geiger.app",
      username: "you",
      organizationId: ORG_ID,
    };
  },
  orgs() {
    return [
      {
        id: ORG_ID,
        name: "Geiger Studio",
        slug: "geiger-studio",
        description: "",
        avatarUrl: null,
        createdAt: null,
        ownerId: null,
        isOwner: false,
        ownerName: "Workspace owner",
        role: "Member",
      },
    ];
  },
  orgMembers() {
    return [MOCK_ME, ...PEOPLE].map((p) => ({
      userId: p.id,
      organizationId: ORG_ID,
      role: "User",
    }));
  },

  // profiles
  profiles() {
    return PEOPLE.map(toProfileVM);
  },
  profilesByIds(ids = []) {
    return [...new Set((ids || []).filter(Boolean))]
      .map((id) => PEOPLE_BY_ID[id])
      .filter(Boolean)
      .map(toProfileVM);
  },
  findProfile(query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return null;
    const hit = [MOCK_ME, ...PEOPLE].find((p) => {
      const vm = toProfileVM(p);
      return vm.email === q || vm.username === q || vm.name.toLowerCase() === q;
    });
    return hit ? toProfileVM(hit) : null;
  },
  searchProfiles(query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return PEOPLE.map(toProfileVM).filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.username.includes(q) ||
        p.email.includes(q),
    );
  },

  // conversations + messages
  conversations(kind) {
    const src = kind === "channel" ? CHANNELS : DIRECT_CONVERSATIONS;
    return src.map(toConversationVM);
  },
  messages(conversationId, { before = null } = {}) {
    if (before) return []; // no older pages in the demo
    const conv = findConversation(conversationId);
    return conv ? (conv.messages || []).map(toMessageVM) : [];
  },
  sendMessage({ id, authorId, text, replyTo, attachments } = {}) {
    return {
      id: id || rid(),
      authorId: authorId || MOCK_ME.id,
      minsAgo: 0,
      text: text ?? "",
      createdAt: new Date().toISOString(),
      threadId: null,
      reactions: {},
      replyTo: replyTo || null,
      call: null,
      attachments: Array.isArray(attachments) ? attachments : [],
    };
  },
  createChannel({ id, name, topic, visibility = "public", createdBy, memberIds = [] } = {}) {
    const clean = (name || "").trim().replace(/^#/, "") || "channel";
    return {
      id: id || rid(),
      type: "channel",
      name: clean,
      topic: topic || "",
      visibility,
      memberIds: [...new Set([createdBy, ...memberIds].filter(Boolean))],
      unread: 0,
      pinned: false,
      lastActivity: 0,
      reads: {},
      messages: [],
    };
  },
  createOrGetDm(meId, otherId) {
    const existing = DIRECT_CONVERSATIONS.find((c) => c.participantId === otherId);
    if (existing) return toConversationVM(existing);
    return {
      id: rid(),
      type: "dm",
      participantId: otherId,
      unread: 0,
      pinned: false,
      lastActivity: 0,
      reads: {},
      messages: [],
    };
  },

  // threads
  createThread({ id, conversationId, rootMessageId, title, createdBy } = {}) {
    return {
      id: id || rid(),
      conversationId,
      rootMessageId: rootMessageId || null,
      title: (title || "Thread").trim().slice(0, 120) || "Thread",
      createdBy: createdBy || null,
      lastActivity: 0,
      createdAt: new Date().toISOString(),
      replyCount: 0,
    };
  },

  // files
  files() {
    return FILES.map(toFileVM);
  },
  createFile({ id, name, kind = "doc", size = "", source = "", url, ownerId } = {}) {
    return {
      id: id || rid(),
      name: name || "file",
      kind,
      size,
      ownerId: ownerId || null,
      source: source || "Direct upload",
      url: url || "",
      conversationId: null,
      messageId: null,
      contentType: "",
      minsAgo: 0,
    };
  },

  // calls
  calls() {
    return RECENT_CALLS.map((c) => ({ ...c }));
  },
  logCall({ id, title, kind = "video", direction = "outgoing", durationMins = 0, ownerId, participantIds = [] } = {}) {
    return {
      id: id || rid(),
      title: title || "Call",
      kind,
      direction,
      missed: false,
      durationMins: Number(durationMins) || 0,
      participantIds: participantIds || [],
      minsAgo: 0,
      ownerId: ownerId || null,
    };
  },
  scheduledCall({ id, title, kind = "video", scheduledAt, createdBy, participantIds = [] } = {}) {
    return {
      id: id || rid(),
      title: title || "Scheduled call",
      kind,
      scheduledAt,
      conversationId: null,
      createdBy: createdBy || null,
      participantIds: participantIds || [],
      reminded: false,
    };
  },

  // inbox
  notifications() {
    return INBOX_NOTIFICATIONS.map((n) => ({
      id: n.id,
      type: n.type ?? "Message",
      title: n.title ?? "",
      description: n.description ?? "",
      read: !!n.read,
      icon: n.icon ?? "Bell",
      bg_color: n.bg_color ?? "bg-surface-hover",
      icon_color: n.icon_color ?? "text-muted-foreground",
      extra: n.extra ?? null,
      minsAgo: n.minsAgo ?? 0,
      time: isoAgo(n.minsAgo),
    }));
  },
};
