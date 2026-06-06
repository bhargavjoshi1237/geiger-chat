"use client";

import React, { useState } from "react";
import { Hash, MessageSquare } from "lucide-react";
import { TwoPaneChat } from "./two-pane-chat";
import { SegmentedTabs } from "@/components/internal/shared/segmented_tabs";
import { PortalContainerProvider } from "@/components/ui/portal-container";

// Self-contained conversations for the landing demo. Kept local so the
// playground never touches workspace state — pure exploration, no save/load.
const PG_CHANNELS = [
  {
    id: "pg-general",
    type: "channel",
    name: "general",
    topic: "Welcome to the Geiger Chat playground",
    memberIds: ["u-me", "u-1", "u-2", "u-7", "u-4"],
    pinned: true,
    unread: 2,
    lastActivity: 4,
    messages: [
      { id: "pg-g-1", authorId: "u-2", minsAgo: 14, text: "Hey 👋 this is a live playground — everything runs right in your browser." },
      { id: "pg-g-2", authorId: "u-1", minsAgo: 9, text: "Send a message below and someone will reply. Try a call or open the details panel too!" },
      { id: "pg-g-3", authorId: "u-7", minsAgo: 4, text: "Switch between Messages and Channels up top to explore the whole surface." },
    ],
  },
  {
    id: "pg-design",
    type: "channel",
    name: "design",
    topic: "Design systems & critique",
    memberIds: ["u-me", "u-3", "u-2"],
    pinned: false,
    unread: 0,
    lastActivity: 12,
    messages: [
      { id: "pg-d-1", authorId: "u-3", minsAgo: 20, text: "Pushed the new spacing scale — message density looks so much cleaner now." },
      { id: "pg-d-2", authorId: "u-me", minsAgo: 12, text: "Love it. Ship it." },
    ],
  },
  {
    id: "pg-eng",
    type: "channel",
    name: "engineering",
    topic: "Builds, deploys & architecture",
    memberIds: ["u-me", "u-1", "u-4"],
    pinned: false,
    unread: 0,
    lastActivity: 16,
    messages: [
      { id: "pg-e-1", authorId: "u-4", minsAgo: 30, text: "Realtime presence is on staging if anyone wants to dogfood." },
      { id: "pg-e-2", authorId: "u-1", minsAgo: 16, text: "Nice — deploy window is 4pm, freeze merges after 3:30." },
    ],
  },
];

const PG_DMS = [
  {
    id: "pg-dm-1",
    type: "dm",
    participantId: "u-1",
    pinned: true,
    unread: 1,
    lastActivity: 5,
    messages: [
      { id: "pg-dm1-1", authorId: "u-1", minsAgo: 22, text: "Did you get a chance to look at the new composer spec?" },
      { id: "pg-dm1-2", authorId: "u-me", minsAgo: 18, text: "Going through it now — threading model looks solid." },
      { id: "pg-dm1-3", authorId: "u-1", minsAgo: 5, text: "Pushed the presence branch, ping me when you can review 🙏" },
    ],
  },
  {
    id: "pg-dm-2",
    type: "dm",
    participantId: "u-2",
    pinned: false,
    unread: 0,
    lastActivity: 34,
    messages: [
      { id: "pg-dm2-1", authorId: "u-2", minsAgo: 90, text: "Roadmap review moved to 2pm — can you still make it?" },
      { id: "pg-dm2-2", authorId: "u-me", minsAgo: 34, text: "Works for me." },
    ],
  },
  {
    id: "pg-dm-3",
    type: "dm",
    participantId: "u-7",
    pinned: false,
    unread: 0,
    lastActivity: 120,
    messages: [
      { id: "pg-dm3-1", authorId: "u-7", minsAgo: 160, text: "Weekly active numbers are up 12% after the calls launch." },
      { id: "pg-dm3-2", authorId: "u-me", minsAgo: 120, text: "Let's put that in the all-hands deck." },
    ],
  },
];

// Canned replies so the demo feels alive without any backend.
const PG_REPLIES = {
  "pg-general": [
    "Welcome aboard! This whole thing runs right here in your browser.",
    "Nice — try the details panel or start the meet preview on the right.",
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
  "pg-dm-1": ["On it 👍", "Reviewing now — looks good so far.", "Thanks, that helps a lot."],
  "pg-dm-2": ["Perfect, works for me.", "Let me check and get back to you.", "Great, talk soon!"],
  "pg-dm-3": ["Nice, the numbers look strong.", "Adding that to the deck.", "Appreciate the update!"],
};

function pickReply(id) {
  const pool = PG_REPLIES[id] || PG_REPLIES["pg-general"];
  return pool[Math.floor(Math.random() * pool.length)];
}

const TABS = [
  { label: "Messages", value: "dm", icon: MessageSquare },
  { label: "Channels", value: "channel", icon: Hash },
];

// Landing demo: the real Geiger Chat surface (list + thread + details + calls)
// running on the page. `transform` makes this frame the containing block for
// fixed-positioned overlays, and the PortalContainerProvider redirects dialogs
// and sheets here, so everything opens inside the playground — never the page.
export function ChatPlayground() {
  const [variant, setVariant] = useState("channel");
  const [container, setContainer] = useState(null);

  const items = variant === "channel" ? PG_CHANNELS : PG_DMS;
  const title = variant === "channel" ? "Channels" : "Messages";

  return (
    <div
      ref={setContainer}
      className="relative flex h-full flex-col overflow-hidden bg-[#161616]"
      style={{ transform: "translateZ(0)" }}
    >
      <PortalContainerProvider container={container}>
        {/* App-style topbar */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#222] px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#e7e7e7] text-[11px] font-bold text-[#161616]">G</div>
            <span className="text-sm font-semibold text-white">Geiger Chat</span>
            <span className="hidden rounded-full bg-[#222] px-2 py-0.5 text-[10px] font-medium text-[#a3a3a3] sm:inline">
              Playground
            </span>
          </div>
          <SegmentedTabs tabs={TABS} value={variant} onChange={setVariant} className="w-auto" />
        </header>

        <div className="min-h-0 flex-1">
          <TwoPaneChat
            key={variant}
            title={title}
            items={items}
            variant={variant}
            autoReply={(_, conversation) => pickReply(conversation?.id)}
          />
        </div>
      </PortalContainerProvider>
    </div>
  );
}
