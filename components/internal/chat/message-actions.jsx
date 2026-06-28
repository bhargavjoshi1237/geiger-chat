"use client";

import React from "react";
import { SmilePlus, Reply, Copy, Info } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { REACTIONS } from "./chat-utils";
import { cn } from "@/lib/utils";

function ActionButton({ label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// Hover toolbar of per-message options: react (emoji picker), reply, copy, info.
// Reveals on hover of the `group/msg` ancestor.
export function MessageActions({ msg, isMe, onReact, onReply, onInfo }) {
  const copy = () => {
    navigator.clipboard?.writeText(msg.text).catch(() => {});
    toast.success("Copied to clipboard");
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface-subtle p-0.5 opacity-0 shadow-sm transition-opacity group-hover/msg:opacity-100 focus-within:opacity-100",
        isMe ? "mr-1" : "ml-1",
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="React"
            title="React"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isMe ? "end" : "start"} className="flex gap-0.5 border-border bg-surface-dialog p-1">
          {REACTIONS.map(({ key, label, icon: Icon, colorClass }) => (
            <DropdownMenuItem
              key={key}
              onSelect={() => onReact?.(msg, key)}
              aria-label={label}
              title={label}
              className="cursor-pointer rounded-md p-2 text-muted-foreground focus:bg-surface-hover"
            >
              <Icon className={cn("h-4 w-4", colorClass)} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {onReply ? <ActionButton label="Reply" icon={Reply} onClick={() => onReply(msg)} /> : null}
      <ActionButton label="Copy text" icon={Copy} onClick={copy} />
      {onInfo ? <ActionButton label="Info" icon={Info} onClick={() => onInfo(msg)} /> : null}
    </div>
  );
}
