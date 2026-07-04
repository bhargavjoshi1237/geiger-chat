"use client";

import React, { useMemo, useRef, useState } from "react";
import { Search, Hash, MessageSquare } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { fromNow, lastMessagePreview, previewAuthor } from "./chat-utils";
import { ConversationRowMenu } from "./conversation-row-menu";
import { NewMessageDialog } from "./new-message-dialog";
import { CreateChannelDialog } from "./create-channel-dialog";
import { getPerson, isExternalPerson } from "@/lib/chat/people-store";
import { ExternalBadge } from "./external-badge";
import { cn } from "@/lib/utils";

function ConversationRow({ conversation, active, onSelect, variant, onPin, onMarkRead, onLeave }) {
  const isChannel = conversation.type === "channel";
  const person = isChannel ? null : getPerson(conversation.participantId);
  const title = isChannel ? conversation.name : person?.name;
  const external = !isChannel && isExternalPerson(person);

  // The list re-orders live — a new/sent message bumps a conversation to the top,
  // and rows are keyed by id, so React physically moves the DOM node. With a plain
  // onClick, a re-order landing between pointer-down and pointer-up moves the row
  // out from under the cursor and the click never fires ("sometimes clicking does
  // nothing"). Select on pointer-down for mouse so the press alone commits the
  // choice; touch/keyboard keep click so a scroll gesture isn't hijacked.
  const pointerSelectedAt = useRef(0);

  return (
    <ConversationRowMenu
      conversation={conversation}
      variant={variant}
      onPin={onPin}
      onMarkRead={onMarkRead}
      onLeave={onLeave}
    >
      <button
        type="button"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button === 0) {
            pointerSelectedAt.current = Date.now();
            onSelect(conversation.id);
          }
        }}
        onClick={() => {
          if (Date.now() - pointerSelectedAt.current < 700) return; // already selected on press
          onSelect(conversation.id);
        }}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
          active ? "bg-surface-hover" : "hover:bg-surface-card",
        )}
      >
        {isChannel ? (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground",
              active ? "border-border-strong bg-surface-active" : "border-border bg-surface-card",
            )}
          >
            <Hash className="h-[18px] w-[18px]" />
          </div>
        ) : (
          <UserAvatar person={person} size="md" showPresence />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={cn("truncate text-sm", active || conversation.unread ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                {isChannel ? `#${title}` : title}
              </span>
              {external ? <ExternalBadge label="Ext." className="px-1" /> : null}
            </span>
            <span className="shrink-0 text-[11px] text-text-secondary">{fromNow(conversation.lastActivity)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-text-secondary">
              <span className="text-text-secondary">{previewAuthor(conversation)}</span>
              {lastMessagePreview(conversation)}
            </span>
            {conversation.unread ? (
              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {conversation.unread}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </ConversationRowMenu>
  );
}

// Left rail listing conversations. Self-contained search; selection is owned by
// the parent screen so the active thread can render alongside it. The header
// action opens a new-message or create-channel dialog depending on variant.
export function ConversationList({
  title,
  items,
  activeId,
  onSelect,
  variant = "dm",
  loading = false,
  people = [],
  onStartDm,
  onCreateChannel,
  onPin,
  onMarkRead,
  onLeave,
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const name = c.type === "channel" ? c.name : getPerson(c.participantId).name;
      return name.toLowerCase().includes(q);
    });
  }, [items, query]);

  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);

  const EmptyIcon = variant === "channel" ? Hash : MessageSquare;

  return (
    <div className="flex h-full w-full flex-col border-r border-border md:w-80 lg:w-[336px]">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {variant === "channel" ? (
          <CreateChannelDialog people={people} onCreateChannel={onCreateChannel} />
        ) : (
          <NewMessageDialog people={people} onStartDm={onStartDm} />
        )}
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-subtle px-2.5 transition-colors focus-within:border-border-strong">
          <Search className="h-4 w-4 text-text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={variant === "channel" ? "Search channels" : "Search messages"}
            className="h-9 flex-1 bg-transparent text-sm text-foreground placeholder:text-text-secondary focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3 scrollbar-subtle">
        {loading ? (
          <div className="space-y-2 px-1 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-1.5 py-2">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-surface-card" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-surface-card" />
                  <div className="h-2.5 w-3/4 animate-pulse rounded bg-surface-card" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {pinned.length ? (
              <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">Pinned</p>
            ) : null}
            {pinned.map((c) => (
              <ConversationRow key={c.id} conversation={c} active={c.id === activeId} onSelect={onSelect} variant={variant} onPin={onPin} onMarkRead={onMarkRead} onLeave={onLeave} />
            ))}
            {pinned.length && rest.length ? (
              <p className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                {variant === "channel" ? "All channels" : "Recent"}
              </p>
            ) : null}
            {rest.map((c) => (
              <ConversationRow key={c.id} conversation={c} active={c.id === activeId} onSelect={onSelect} variant={variant} onPin={onPin} onMarkRead={onMarkRead} onLeave={onLeave} />
            ))}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-card text-muted-foreground">
                  <EmptyIcon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <p className="text-sm text-text-secondary">
                  {query.trim()
                    ? "No conversations match your search."
                    : variant === "channel"
                      ? "No channels yet. Create one to get started."
                      : "No messages yet. Start a conversation."}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
