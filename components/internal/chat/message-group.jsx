"use client";

import React from "react";
import { UserAvatar } from "./user-avatar";
import { MessageActions } from "./message-actions";
import { clockTime } from "./chat-utils";
import { ME, getPerson } from "@/lib/mock/chat-data";
import { cn } from "@/lib/utils";

// A run of consecutive messages from one author: avatar + name render once, with
// each bubble exposing its own hover action toolbar.
export function MessageGroup({ group }) {
  const author = getPerson(group.authorId);
  const isMe = group.authorId === ME.id;
  const first = group.items[0];

  return (
    <div className={cn("flex gap-3 px-3 md:px-6", isMe && "flex-row-reverse")}>
      <div className="pt-0.5">
        <UserAvatar person={author} size="sm" />
      </div>
      <div className={cn("flex min-w-0 max-w-[78%] flex-col gap-1", isMe && "items-end")}>
        <div className={cn("flex items-baseline gap-2", isMe && "flex-row-reverse")}>
          <span className="text-xs font-semibold text-foreground">{isMe ? "You" : author.name}</span>
          <span className="text-[11px] text-text-secondary">{clockTime(first.minsAgo ?? 0)}</span>
        </div>
        <div className={cn("flex flex-col gap-1", isMe && "items-end")}>
          {group.items.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "group/msg flex items-center",
                isMe && "flex-row-reverse",
              )}
            >
              <div
                className={cn(
                  "w-fit rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  isMe
                    ? "rounded-tr-md bg-[#e7e7e7] text-[#161616]"
                    : "rounded-tl-md border border-border bg-surface-card text-foreground",
                )}
              >
                {msg.text}
              </div>
              <MessageActions msg={msg} isMe={isMe} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
