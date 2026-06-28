"use client";

import React from "react";
import { Clock, User, CheckCheck, Check, Smile } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "./user-avatar";
import { REACTION_MAP } from "./chat-utils";
import { ME, getPerson } from "@/lib/chat/people-store";
import { cn } from "@/lib/utils";

// Full timestamp for a message, derived from its real createdAt when present,
// otherwise reconstructed from the "minutes ago" view value.
function sentAtLabel(message) {
  const ms = message.createdAt
    ? new Date(message.createdAt).getTime()
    : Date.now() - (message.minsAgo || 0) * 60000;
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <Icon className="h-4 w-4 shrink-0 text-text-secondary" />
      <span className="w-20 shrink-0 text-xs text-text-secondary">{label}</span>
      <span className="min-w-0 flex-1 text-sm text-foreground">{children}</span>
    </div>
  );
}

// Read-only details for a single message: who sent it, when, delivery status
// (for my own DMs) and a reaction breakdown.
export function MessageInfoDialog({ message, conversation, open, onOpenChange }) {
  if (!message) return null;
  const author = getPerson(message.authorId);
  const isMe = message.authorId === ME.id;

  // "Seen" only meaningful for my own messages in a DM.
  let status = null;
  if (isMe && conversation?.type === "dm") {
    const otherRead = conversation.reads?.[conversation.participantId];
    const seen =
      !!otherRead && !!message.createdAt &&
      new Date(otherRead).getTime() >= new Date(message.createdAt).getTime();
    status = seen ? "seen" : "sent";
  }

  const reactionEntries = Object.entries(message.reactions || {}).filter(
    ([, ids]) => (ids || []).length,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Message info</DialogTitle>
          <DialogDescription className="sr-only">
            Details for the selected message.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-surface-card px-3.5 py-2.5 text-sm text-foreground">
          {message.replyTo ? (
            <p className="mb-1 truncate border-l-2 border-border-strong pl-2 text-xs text-text-secondary">
              {getPerson(message.replyTo.authorId).firstName}: {message.replyTo.text}
            </p>
          ) : null}
          {message.text}
        </div>

        <div className="flex flex-col">
          <InfoRow icon={User} label="From">
            <span className="flex items-center gap-2">
              <UserAvatar person={author} size="xs" />
              {isMe ? "You" : author.name}
            </span>
          </InfoRow>
          <InfoRow icon={Clock} label="Sent">{sentAtLabel(message)}</InfoRow>
          {status ? (
            <InfoRow icon={status === "seen" ? CheckCheck : Check} label="Status">
              <span className={status === "seen" ? "text-primary" : "text-text-secondary"}>
                {status === "seen" ? "Seen" : "Sent"}
              </span>
            </InfoRow>
          ) : null}
          {reactionEntries.length ? (
            <InfoRow icon={Smile} label="Reactions">
              <span className="flex flex-wrap items-center gap-1.5">
                {reactionEntries.map(([key, ids]) => {
                  const meta = REACTION_MAP[key];
                  const Icon = meta?.icon || Smile;
                  return (
                    <span
                      key={key}
                      title={meta?.label}
                      className="flex items-center gap-1 rounded-full border border-border bg-surface-card px-1.5 py-0.5 text-xs"
                    >
                      <Icon className={cn("h-3.5 w-3.5", meta?.colorClass)} />
                      {ids.length}
                    </span>
                  );
                })}
              </span>
            </InfoRow>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
