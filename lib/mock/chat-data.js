// Frontend-only mock data for the Geiger Chat workspace and landing playground.
// No backend — this powers the in-app screens and the interactive demo with
// realistic-looking content so the UI can be built and reviewed end to end.

export const ME = {
  id: "u-me",
  name: "You",
  firstName: "You",
  role: "Product Designer",
  color: "#6366f1",
  presence: "online",
};

export const PEOPLE = [
  { id: "u-1", name: "Mara Vance", firstName: "Mara", role: "Engineering Lead", color: "#6366f1", presence: "online", lastSeen: 2 },
  { id: "u-2", name: "Theo Park", firstName: "Theo", role: "Product Manager", color: "#0ea5e9", presence: "online", lastSeen: 5 },
  { id: "u-3", name: "Priya Nair", firstName: "Priya", role: "Design Systems", color: "#ec4899", presence: "away", lastSeen: 24 },
  { id: "u-4", name: "Sam Okafor", firstName: "Sam", role: "Backend Engineer", color: "#10b981", presence: "online", lastSeen: 1 },
  { id: "u-5", name: "Lena Hoffman", firstName: "Lena", role: "Marketing", color: "#f59e0b", presence: "offline", lastSeen: 320 },
  { id: "u-6", name: "Diego Romero", firstName: "Diego", role: "QA Engineer", color: "#8b5cf6", presence: "dnd", lastSeen: 0 },
  { id: "u-7", name: "Ava Chen", firstName: "Ava", role: "Data Analyst", color: "#14b8a6", presence: "online", lastSeen: 8 },
  { id: "u-8", name: "Noah Bauer", firstName: "Noah", role: "Support Lead", color: "#ef4444", presence: "away", lastSeen: 46 },
];

export const PEOPLE_BY_ID = Object.fromEntries(
  [ME, ...PEOPLE].map((p) => [p.id, p]),
);

export function getPerson(id) {
  return PEOPLE_BY_ID[id] || { id, name: "Unknown", firstName: "Unknown", color: "#737373", presence: "offline" };
}

// Relative timestamps are expressed as "minutes ago" so the UI can render
// stable, deterministic times without depending on the current clock.
const m = (minutes) => minutes;

export const DIRECT_CONVERSATIONS = [
  {
    id: "dm-1",
    type: "dm",
    participantId: "u-1",
    unread: 2,
    pinned: true,
    lastActivity: m(3),
    messages: [
      { id: "dm1-1", authorId: "u-1", minsAgo: 58, text: "Morning! Did you get a chance to look at the new composer spec?" },
      { id: "dm1-2", authorId: "u-me", minsAgo: 55, text: "Yeah, going through it now. The threading model looks solid." },
      { id: "dm1-3", authorId: "u-1", minsAgo: 52, text: "Good. I want to ship the message reactions this sprint if we can." },
      { id: "dm1-4", authorId: "u-me", minsAgo: 50, text: "Doable. I'll have the hover affordances ready by Thursday." },
      { id: "dm1-5", authorId: "u-1", minsAgo: 6, text: "Just pushed the realtime presence branch — can you review?" },
      { id: "dm1-6", authorId: "u-1", minsAgo: 3, text: "No rush, but before EOD would be great 🙏" },
    ],
  },
  {
    id: "dm-2",
    type: "dm",
    participantId: "u-2",
    unread: 0,
    pinned: false,
    lastActivity: m(34),
    messages: [
      { id: "dm2-1", authorId: "u-2", minsAgo: 95, text: "Roadmap review moved to 2pm. Can you still make it?" },
      { id: "dm2-2", authorId: "u-me", minsAgo: 90, text: "Works for me." },
      { id: "dm2-3", authorId: "u-2", minsAgo: 34, text: "Perfect, sending the deck over in a sec." },
    ],
  },
  {
    id: "dm-3",
    type: "dm",
    participantId: "u-3",
    unread: 0,
    pinned: false,
    lastActivity: m(120),
    messages: [
      { id: "dm3-1", authorId: "u-me", minsAgo: 180, text: "The new icon set is live in the design tokens package." },
      { id: "dm3-2", authorId: "u-3", minsAgo: 120, text: "Amazing, thank you! Updating the Figma library now." },
    ],
  },
  {
    id: "dm-4",
    type: "dm",
    participantId: "u-4",
    unread: 1,
    pinned: false,
    lastActivity: m(15),
    messages: [
      { id: "dm4-1", authorId: "u-4", minsAgo: 40, text: "Pushed the message pagination endpoint to staging." },
      { id: "dm4-2", authorId: "u-me", minsAgo: 38, text: "Nice. Cursor-based?" },
      { id: "dm4-3", authorId: "u-4", minsAgo: 15, text: "Yep, keyset pagination. Should scroll smoothly even on huge channels." },
    ],
  },
  {
    id: "dm-5",
    type: "dm",
    participantId: "u-7",
    unread: 0,
    pinned: false,
    lastActivity: m(300),
    messages: [
      { id: "dm5-1", authorId: "u-7", minsAgo: 320, text: "Weekly active numbers are up 12% after the calls launch." },
      { id: "dm5-2", authorId: "u-me", minsAgo: 300, text: "Let's put that in the all-hands deck." },
    ],
  },
];

export const CHANNELS = [
  {
    id: "ch-1",
    type: "channel",
    name: "general",
    topic: "Company-wide announcements and watercooler chat",
    memberIds: ["u-me", "u-1", "u-2", "u-3", "u-4", "u-5", "u-6", "u-7", "u-8"],
    unread: 5,
    pinned: true,
    lastActivity: m(8),
    messages: [
      { id: "c1-1", authorId: "u-2", minsAgo: 240, text: "Welcome to the three new folks joining this week 👋" },
      { id: "c1-2", authorId: "u-5", minsAgo: 200, text: "Reminder: the offsite survey closes Friday." },
      { id: "c1-3", authorId: "u-8", minsAgo: 60, text: "Coffee machine on the 4th floor is fixed 🎉" },
      { id: "c1-4", authorId: "u-1", minsAgo: 20, text: "Realtime presence is now in staging if anyone wants to dogfood." },
      { id: "c1-5", authorId: "u-7", minsAgo: 8, text: "Numbers from the calls launch are looking great — thread incoming." },
    ],
  },
  {
    id: "ch-2",
    type: "channel",
    name: "engineering",
    topic: "Builds, deploys, and architecture decisions",
    memberIds: ["u-me", "u-1", "u-4", "u-6", "u-7"],
    unread: 0,
    pinned: true,
    lastActivity: m(25),
    messages: [
      { id: "c2-1", authorId: "u-4", minsAgo: 120, text: "Migrating the message store to keyset pagination today." },
      { id: "c2-2", authorId: "u-6", minsAgo: 80, text: "I'll add regression coverage for the infinite scroll case." },
      { id: "c2-3", authorId: "u-1", minsAgo: 25, text: "Deploy window is 4pm. Freeze merges to main after 3:30." },
    ],
  },
  {
    id: "ch-3",
    type: "channel",
    name: "design",
    topic: "Design systems, reviews, and critique",
    memberIds: ["u-me", "u-3", "u-2", "u-5"],
    unread: 2,
    pinned: false,
    lastActivity: m(45),
    messages: [
      { id: "c3-1", authorId: "u-3", minsAgo: 140, text: "Updated the spacing scale — 4px base, everything snaps cleanly now." },
      { id: "c3-2", authorId: "u-me", minsAgo: 100, text: "Love it. Makes the message density much easier to tune." },
      { id: "c3-3", authorId: "u-3", minsAgo: 45, text: "Posted the new empty-states in the review board." },
    ],
  },
  {
    id: "ch-4",
    type: "channel",
    name: "product",
    topic: "Roadmap, specs, and release planning",
    memberIds: ["u-me", "u-2", "u-1", "u-7"],
    unread: 0,
    pinned: false,
    lastActivity: m(180),
    messages: [
      { id: "c4-1", authorId: "u-2", minsAgo: 220, text: "Q3 themes: reliability, calls, and search. Details in the doc." },
      { id: "c4-2", authorId: "u-7", minsAgo: 180, text: "Search is the most requested item in the feedback inbox." },
    ],
  },
  {
    id: "ch-5",
    type: "channel",
    name: "random",
    topic: "Off-topic and fun",
    memberIds: ["u-me", "u-1", "u-5", "u-8", "u-6"],
    unread: 0,
    pinned: false,
    lastActivity: m(420),
    messages: [
      { id: "c5-1", authorId: "u-8", minsAgo: 460, text: "Anyone up for board games after the offsite?" },
      { id: "c5-2", authorId: "u-5", minsAgo: 420, text: "I'm in. Bringing Catan." },
    ],
  },
];

export const RECENT_CALLS = [
  { id: "call-1", title: "Design Critique", kind: "video", direction: "outgoing", participantIds: ["u-3", "u-2"], minsAgo: 45, durationMins: 32, missed: false },
  { id: "call-2", title: "Mara Vance", kind: "video", direction: "incoming", participantIds: ["u-1"], minsAgo: 130, durationMins: 18, missed: false },
  { id: "call-3", title: "Standup", kind: "video", direction: "outgoing", participantIds: ["u-1", "u-4", "u-6", "u-7"], minsAgo: 300, durationMins: 14, missed: false },
  { id: "call-4", title: "Theo Park", kind: "audio", direction: "incoming", participantIds: ["u-2"], minsAgo: 480, durationMins: 0, missed: true },
  { id: "call-5", title: "Roadmap Review", kind: "video", direction: "outgoing", participantIds: ["u-2", "u-7", "u-1"], minsAgo: 1440, durationMins: 47, missed: false },
];

export const UPCOMING_MEETINGS = [
  { id: "mt-1", title: "Sprint Planning", inMins: 35, participantIds: ["u-1", "u-2", "u-4", "u-6"] },
  { id: "mt-2", title: "Design ↔ Eng Sync", inMins: 150, participantIds: ["u-3", "u-1"] },
  { id: "mt-3", title: "All-Hands", inMins: 420, participantIds: ["u-1", "u-2", "u-3", "u-4", "u-5", "u-7", "u-8"] },
];

export const FILES = [
  { id: "f-1", name: "Composer-Spec-v3.pdf", kind: "pdf", size: "2.4 MB", ownerId: "u-1", minsAgo: 12, source: "engineering" },
  { id: "f-2", name: "Q3-Roadmap.key", kind: "slides", size: "8.1 MB", ownerId: "u-2", minsAgo: 34, source: "product" },
  { id: "f-3", name: "icon-set-2.0.zip", kind: "archive", size: "640 KB", ownerId: "u-3", minsAgo: 120, source: "design" },
  { id: "f-4", name: "active-users.csv", kind: "sheet", size: "118 KB", ownerId: "u-7", minsAgo: 300, source: "Ava Chen" },
  { id: "f-5", name: "offsite-photo.jpg", kind: "image", size: "3.9 MB", ownerId: "u-5", minsAgo: 420, source: "random" },
  { id: "f-6", name: "presence-architecture.png", kind: "image", size: "1.2 MB", ownerId: "u-4", minsAgo: 90, source: "engineering" },
  { id: "f-7", name: "release-notes.md", kind: "doc", size: "12 KB", ownerId: "u-2", minsAgo: 200, source: "product" },
  { id: "f-8", name: "brand-guidelines.pdf", kind: "pdf", size: "5.7 MB", ownerId: "u-5", minsAgo: 1440, source: "marketing" },
];

// Inbox notifications, shaped to match the Geiger suite's inbox rows (the same
// fields geiger-flow's flow_notifications table provides): icon is a lucide
// component name, bg_color/icon_color are tailwind classes, extra carries rich
// payloads (comment / file / actions). `minsAgo` is converted to an ISO `time`
// by the InboxScreen at mount so relative timestamps stay live.
export const INBOX_NOTIFICATIONS = [
  {
    id: "in-1",
    type: "Mention",
    title: "Mara Vance mentioned you",
    description: "@you can you review the realtime presence branch before the 4pm deploy? No rush, but before EOD would be great.",
    minsAgo: 6,
    read: false,
    icon: "AtSign",
    bg_color: "bg-blue-500/10",
    icon_color: "text-blue-400",
  },
  {
    id: "in-2",
    type: "Meeting",
    title: "Sprint Planning invitation",
    description: "Theo Park invited you to Sprint Planning, starting in 35 minutes with Mara, Sam and Diego.",
    minsAgo: 18,
    read: false,
    icon: "CalendarPlus",
    bg_color: "bg-emerald-500/10",
    icon_color: "text-emerald-400",
    extra: { type: "actions", options: ["Decline", "Accept"] },
  },
  {
    id: "in-3",
    type: "Message",
    title: "New message from Theo Park",
    description: "Roadmap review moved to 2pm — sending the deck over in a sec.",
    minsAgo: 34,
    read: false,
    icon: "MessageSquare",
    bg_color: "bg-[#2a2a2a]",
    icon_color: "text-[#a3a3a3]",
  },
  {
    id: "in-4",
    type: "Reaction",
    title: "Priya Nair reacted to your message",
    description: "Priya reacted 🎉 to your message in #design.",
    minsAgo: 45,
    read: false,
    icon: "Heart",
    bg_color: "bg-pink-500/10",
    icon_color: "text-pink-400",
  },
  {
    id: "in-5",
    type: "File",
    title: "Sam Okafor shared a file",
    description: "Shared a file in #engineering.",
    minsAgo: 90,
    read: true,
    icon: "Paperclip",
    bg_color: "bg-[#2a2a2a]",
    icon_color: "text-[#a3a3a3]",
    extra: { type: "file", files: [{ name: "presence-architecture.png", size: "1.2 MB" }] },
  },
  {
    id: "in-6",
    type: "Comment",
    title: "Diego Romero replied in a thread",
    description: "Diego replied in a thread you follow in #engineering.",
    minsAgo: 140,
    read: true,
    icon: "MessageSquare",
    bg_color: "bg-[#2a2a2a]",
    icon_color: "text-[#a3a3a3]",
    extra: { type: "comment", text: "I'll add regression coverage for the infinite scroll case before we freeze merges." },
  },
  {
    id: "in-7",
    type: "Call",
    title: "Missed call from Theo Park",
    description: "You missed an audio call from Theo Park.",
    minsAgo: 480,
    read: true,
    icon: "PhoneMissed",
    bg_color: "bg-red-500/10",
    icon_color: "text-red-400",
  },
];

// Canned playground responses keyed by channel id, used by the landing demo to
// simulate a teammate replying after the visitor sends a message.
export const PLAYGROUND_REPLIES = {
  "pg-general": [
    "Welcome aboard! This whole thing runs right here in your browser.",
    "Nice — try switching channels or starting the meet preview on the right.",
    "Everything you see here is the real Geiger Chat interface.",
  ],
  "pg-design": [
    "Pulling up the latest mockups now 🎨",
    "The 4px spacing scale makes this so much cleaner.",
    "Dropping the new empty-states in the review board.",
  ],
  "pg-eng": [
    "Build's green ✅ deploying to staging.",
    "Keyset pagination keeps the scroll buttery even on huge channels.",
    "Realtime presence just landed — go dogfood it.",
  ],
};
