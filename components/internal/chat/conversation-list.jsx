"use client";

import React, { useMemo, useState } from "react";
import { Search, Hash } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { fromNow, lastMessagePreview, previewAuthor } from "./chat-utils";
import { ConversationRowMenu } from "./conversation-row-menu";
import { NewMessageDialog } from "./new-message-dialog";
import { CreateChannelDialog } from "./create-channel-dialog";
import { getPerson } from "@/lib/mock/chat-data";
import { cn } from "@/lib/utils";

function ConversationRow({ conversation, active, onSelect, variant }) {
  const isChannel = conversation.type === "channel";
  const person = isChannel ? null : getPerson(conversation.participantId);
  const title = isChannel ? conversation.name : person?.name;

  return (
    <ConversationRowMenu conversation={conversation} variant={variant}>
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
          active ? "bg-[#242424]" : "hover:bg-[#202020]",
        )}
      >
        {isChannel ? (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-[#a3a3a3]",
              active ? "border-[#333] bg-[#262626]" : "border-[#2a2a2a] bg-[#202020]",
            )}
          >
            <Hash className="h-[18px] w-[18px]" />
          </div>
        ) : (
          <UserAvatar person={person} size="md" showPresence />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("truncate text-sm", active || conversation.unread ? "font-semibold text-white" : "font-medium text-[#e7e7e7]")}>
              {isChannel ? `#${title}` : title}
            </span>
            <span className="shrink-0 text-[11px] text-[#6b6b6b]">{fromNow(conversation.lastActivity)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-[#737373]">
              <span className="text-[#8a8a8a]">{previewAuthor(conversation)}</span>
              {lastMessagePreview(conversation)}
            </span>
            {conversation.unread ? (
              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#e7e7e7] px-1 text-[10px] font-semibold text-[#161616]">
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

  return (
    <div className="flex h-full w-full flex-col border-r border-[#2a2a2a] md:w-80 lg:w-[336px]">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
        <h1 className="text-base font-semibold text-white">{title}</h1>
        {variant === "channel" ? (
          <CreateChannelDialog />
        ) : (
          <NewMessageDialog items={items} onSelect={onSelect} />
        )}
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 transition-colors focus-within:border-[#474747]">
          <Search className="h-4 w-4 text-[#6b6b6b]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={variant === "channel" ? "Search channels" : "Search messages"}
            className="h-9 flex-1 bg-transparent text-sm text-[#e7e7e7] placeholder:text-[#6b6b6b] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3 scrollbar-subtle">
        {pinned.length ? (
          <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-[#6b6b6b]">Pinned</p>
        ) : null}
        {pinned.map((c) => (
          <ConversationRow key={c.id} conversation={c} active={c.id === activeId} onSelect={onSelect} variant={variant} />
        ))}
        {pinned.length ? (
          <p className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-[#6b6b6b]">
            {variant === "channel" ? "All channels" : "Recent"}
          </p>
        ) : null}
        {rest.map((c) => (
          <ConversationRow key={c.id} conversation={c} active={c.id === activeId} onSelect={onSelect} variant={variant} />
        ))}
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-[#6b6b6b]">No conversations found.</p>
        ) : null}
      </div>
    </div>
  );
}
