"use client";

import React, { useState } from "react";
import { Phone, Video, Search, Info, Hash, Pin, Users, ChevronLeft, X, MessagesSquare, Paperclip } from "lucide-react";
import { UserAvatar, AvatarStack } from "./user-avatar";
import { DetailsSheet } from "./details-sheet";
import { InviteMembersDialog } from "./invite-members-dialog";
import { PRESENCE } from "./chat-utils";
import { ExternalBadge } from "./external-badge";
import { getPerson, isExternalPerson } from "@/lib/chat/people-store";
import { cn } from "@/lib/utils";

function HeaderButton({ icon: Icon, title, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground",
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

// Header toggle for a right-side panel (Threads / Files), highlighted when its
// panel is open, with an optional count badge.
function PanelButton({ icon: Icon, title, onClick, active, count, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-surface-active text-foreground"
          : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {count ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

// Top bar of a conversation thread: identity on the left, call/detail actions on
// the right. On mobile a back button returns to the conversation list.
export function ThreadHeader({
  conversation, onStartCall, onBack, onClose, people = [], onInvite,
  onToggleThreads, onToggleFiles, activePanel, threadCount = 0, fileCount = 0,
}) {
  const isChannel = conversation.type === "channel";
  const person = isChannel ? null : getPerson(conversation.participantId);
  const external = !isChannel && isExternalPerson(person);
  const members = (conversation.memberIds || []).map(getPerson);
  const presence = person ? PRESENCE[person.presence] || PRESENCE.offline : null;
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-3 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground md:hidden"
            title="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : null}
        {isChannel ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-card text-muted-foreground">
            <Hash className="h-[18px] w-[18px]" />
          </div>
        ) : (
          <UserAvatar person={person} size="md" showPresence />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {isChannel ? conversation.name : person?.name}
            </h2>
            {external ? <ExternalBadge /> : null}
            {conversation.pinned ? <Pin className="h-3 w-3 shrink-0 text-text-secondary" /> : null}
          </div>
          <p className="truncate text-xs text-text-secondary">
            {external ? "Outside your organization" : isChannel ? conversation.topic : presence?.label}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isChannel ? (
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            title="View members"
            className="mr-1 hidden rounded-full p-0.5 transition-opacity hover:opacity-80 md:block"
          >
            <AvatarStack people={members} max={4} />
          </button>
        ) : null}
        {isChannel && onInvite ? (
          <InviteMembersDialog
            channelName={conversation.name}
            people={people}
            excludeIds={conversation.memberIds || []}
            onInvite={onInvite}
          />
        ) : null}
        {onToggleThreads ? (
          <PanelButton
            title="Threads"
            icon={MessagesSquare}
            onClick={onToggleThreads}
            active={activePanel === "threads"}
            count={threadCount}
          />
        ) : null}
        {onToggleFiles ? (
          <PanelButton
            title="Files"
            icon={Paperclip}
            onClick={onToggleFiles}
            active={activePanel === "files"}
            count={fileCount}
          />
        ) : null}
        <HeaderButton title="Search" icon={Search} className="hidden sm:flex" />
        <HeaderButton title="Start audio call" icon={Phone} onClick={() => onStartCall?.("audio")} />
        <HeaderButton title="Start video meeting" icon={Video} onClick={() => onStartCall?.("video")} />
        <HeaderButton
          title={isChannel ? "Channel details" : "Conversation details"}
          icon={isChannel ? Users : Info}
          className="hidden sm:flex"
          onClick={() => setDetailsOpen(true)}
        />
        {onClose ? (
          <HeaderButton
            title={isChannel ? "Close channel" : "Close conversation"}
            icon={X}
            onClick={onClose}
          />
        ) : null}
      </div>

      <DetailsSheet
        conversation={conversation}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStartCall={onStartCall}
      />
    </header>
  );
}
