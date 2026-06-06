"use client";

import React, { useState } from "react";
import { Hash, MessageSquare } from "lucide-react";
import { ConversationList } from "./conversation-list";
import { ChatThread } from "./chat-thread";
import { MeetStage } from "./meet-stage";
import { getPerson } from "@/lib/mock/chat-data";
import { cn } from "@/lib/utils";

// Empty state shown in the thread pane when no conversation is open.
function EmptyThread({ variant }) {
  const Icon = variant === "channel" ? Hash : MessageSquare;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-[#202020] text-[#a3a3a3]">
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-[#e7e7e7]">
          {variant === "channel" ? "No channel selected" : "No conversation selected"}
        </p>
        <p className="max-w-xs text-xs text-[#737373]">
          {variant === "channel"
            ? "Choose a channel from the list to jump back into the discussion."
            : "Choose a conversation from the list to start chatting."}
        </p>
      </div>
    </div>
  );
}

// Conversation list + active thread. Side-by-side on desktop; on mobile the
// list and the thread swap based on selection. Starting a call from the thread
// opens the MeetStage as a full-workspace overlay.
export function TwoPaneChat({ title, items, variant = "dm", autoReply }) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const [showThreadMobile, setShowThreadMobile] = useState(false);
  const [call, setCall] = useState(null); // { kind }

  const active = items.find((c) => c.id === activeId) || null;

  const onSelect = (id) => {
    setActiveId(id);
    setShowThreadMobile(true);
  };

  // Closing returns to the list (mobile) and clears the thread pane (desktop).
  const onClose = () => {
    setActiveId(null);
    setShowThreadMobile(false);
  };

  const startCall = (kind) => setCall({ kind });

  const callParticipants = !active
    ? []
    : active.type === "channel"
      ? (active.memberIds || []).filter((id) => id !== "u-me").slice(0, 5).map(getPerson)
      : [getPerson(active.participantId)];

  return (
    <div className="relative flex h-full min-h-0">
      <div className={cn("h-full w-full md:block md:w-auto", showThreadMobile && "hidden")}>
        <ConversationList
          title={title}
          items={items}
          activeId={activeId}
          onSelect={onSelect}
          variant={variant}
        />
      </div>

      <div className={cn("h-full min-w-0 flex-1 md:flex", showThreadMobile ? "flex" : "hidden")}>
        {active ? (
          <ChatThread
            key={active.id}
            conversation={active}
            onStartCall={startCall}
            onBack={() => setShowThreadMobile(false)}
            onClose={onClose}
            autoReply={autoReply}
          />
        ) : (
          <EmptyThread variant={variant} />
        )}
      </div>

      {call && active ? (
        <MeetStage
          title={active.type === "channel" ? `#${active.name}` : getPerson(active.participantId).name}
          participants={callParticipants}
          kind={call.kind}
          onLeave={() => setCall(null)}
        />
      ) : null}
    </div>
  );
}
