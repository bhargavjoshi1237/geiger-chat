"use client";

import React, { useState } from "react";
import { Hash, MessageSquare } from "lucide-react";
import { ConversationList } from "./conversation-list";
import { ChatThread } from "./chat-thread";
import { MeetStage } from "./meet-stage";
import { getPerson, ME } from "@/lib/chat/people-store";
import { cn } from "@/lib/utils";

// Empty state shown in the thread pane when no conversation is open.
function EmptyThread({ variant }) {
  const Icon = variant === "channel" ? Hash : MessageSquare;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-card text-muted-foreground">
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          {variant === "channel" ? "No channel selected" : "No conversation selected"}
        </p>
        <p className="max-w-xs text-xs text-text-secondary">
          {variant === "channel"
            ? "Choose a channel from the list to jump back into the discussion."
            : "Choose a conversation from the list to start chatting."}
        </p>
      </div>
    </div>
  );
}

// Conversation list + active thread, controlled by the parent screen (which owns
// data, selection and persistence). Side-by-side on desktop; on mobile the list
// and the thread swap based on selection. Starting a call opens the MeetStage as
// a full-workspace overlay.
export function TwoPaneChat({
  title,
  items,
  variant = "dm",
  loading = false,
  activeId,
  onSelect,
  onCloseActive,
  autoReply,
  people = [],
  onStartDm,
  onCreateChannel,
  onSendMessage,
  onReact,
  onInvite,
  onCall,
  onPin,
  onMarkRead,
  onLeave,
}) {
  const [showThreadMobile, setShowThreadMobile] = useState(false);
  const [call, setCall] = useState(null); // { kind }

  // Controlled by the screen (activeId prop) or self-managed for the landing
  // playground (no activeId prop → seed from the first conversation).
  const isControlled = activeId !== undefined;
  const [internalActive, setInternalActive] = useState(items[0]?.id);
  const currentActive = isControlled ? activeId : internalActive;

  const active = items.find((c) => c.id === currentActive) || null;

  const select = (id) => {
    if (!isControlled) setInternalActive(id);
    onSelect?.(id);
    setShowThreadMobile(true);
  };

  const close = () => {
    if (!isControlled) setInternalActive(null);
    onCloseActive?.();
    setShowThreadMobile(false);
  };

  // When a real call engine is wired in (the app), hand off to it. Otherwise
  // (the landing playground) fall back to the local demo MeetStage.
  const startCall = (kind) => {
    if (onCall) {
      onCall(kind, active);
      return;
    }
    setCall({ kind });
  };

  const callParticipants = !active
    ? []
    : active.type === "channel"
      ? (active.memberIds || []).filter((id) => id !== ME.id).slice(0, 5).map(getPerson)
      : [getPerson(active.participantId)];

  return (
    <div className="relative flex h-full min-h-0">
      <div className={cn("h-full w-full md:block md:w-auto", showThreadMobile && "hidden")}>
        <ConversationList
          title={title}
          items={items}
          activeId={currentActive}
          onSelect={select}
          variant={variant}
          loading={loading}
          people={people}
          onStartDm={onStartDm}
          onCreateChannel={onCreateChannel}
          onPin={onPin}
          onMarkRead={onMarkRead}
          onLeave={onLeave}
        />
      </div>

      <div className={cn("h-full min-w-0 flex-1 md:flex", showThreadMobile ? "flex" : "hidden")}>
        {active ? (
          <ChatThread
            key={active.id}
            conversation={active}
            onStartCall={startCall}
            onSendMessage={onSendMessage}
            onReact={onReact}
            onInvite={onInvite}
            autoReply={autoReply}
            people={people}
            onBack={() => setShowThreadMobile(false)}
            onClose={close}
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
