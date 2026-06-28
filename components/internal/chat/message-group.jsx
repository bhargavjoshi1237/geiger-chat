"use client";

import React from "react";
import { Reply as ReplyIcon } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { MessageActions } from "./message-actions";
import { clockTime, REACTION_MAP } from "./chat-utils";
import { ME, getPerson } from "@/lib/chat/people-store";
import { cn } from "@/lib/utils";

// Smoothly scroll to (and briefly highlight) the message a reply points at.
function jumpToMessage(id) {
  if (!id) return;
  const el = document.getElementById(`msg-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-primary/50", "rounded-2xl");
  setTimeout(() => el.classList.remove("ring-2", "ring-primary/50", "rounded-2xl"), 1300);
}

// Quoted snippet shown above a bubble when the message is a reply. Clicking it
// jumps to (and flashes) the original message.
function ReplyQuote({ replyTo, isMe }) {
  const who = replyTo.authorId === ME.id ? "You" : getPerson(replyTo.authorId).firstName;
  return (
    <button
      type="button"
      onClick={() => jumpToMessage(replyTo.id)}
      title="Go to message"
      className={cn(
        "mb-1 flex max-w-full items-center gap-1.5 rounded-lg border-l-2 bg-surface-hover/70 px-2 py-1 text-left text-xs transition-colors hover:bg-surface-hover",
        isMe ? "border-primary/60" : "border-border-strong",
      )}
    >
      <ReplyIcon className="h-3 w-3 shrink-0 text-primary" />
      <span className="shrink-0 font-medium text-foreground">{who}</span>
      <span className="truncate text-text-secondary">{replyTo.text}</span>
    </button>
  );
}

// Pills summarizing reactions on a message; the one I added is highlighted.
// Clicking toggles my reaction.
function Reactions({ msg, onReact }) {
  const entries = Object.entries(msg.reactions || {}).filter(([, ids]) => (ids || []).length);
  if (!entries.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {entries.map(([key, ids]) => {
        const meta = REACTION_MAP[key];
        if (!meta) return null;
        const Icon = meta.icon;
        const mine = (ids || []).includes(ME.id);
        return (
          <button
            key={key}
            type="button"
            onClick={onReact ? () => onReact(msg, key) : undefined}
            title={meta.label}
            aria-label={`${meta.label}: ${ids.length}`}
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors",
              mine
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border bg-surface-card text-text-secondary hover:bg-surface-hover",
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", mine ? "text-primary" : meta.colorClass)} />
            <span className="leading-none tabular-nums">{ids.length}</span>
          </button>
        );
      })}
    </div>
  );
}

// A run of consecutive messages from one author: avatar + name render once, with
// each bubble exposing its own hover action toolbar, optional reply quote, and
// reaction pills.
export function MessageGroup({ group, onReact, onReply, onInfo }) {
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
              id={`msg-${msg.id}`}
              className={cn(
                "group/msg flex items-center",
                isMe && "flex-row-reverse",
              )}
            >
              <div className={cn("flex min-w-0 flex-col", isMe && "items-end")}>
                {msg.replyTo ? <ReplyQuote replyTo={msg.replyTo} isMe={isMe} /> : null}
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
                <Reactions msg={msg} onReact={onReact} />
              </div>
              <MessageActions
                msg={msg}
                isMe={isMe}
                onReact={onReact}
                onReply={onReply}
                onInfo={onInfo}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
