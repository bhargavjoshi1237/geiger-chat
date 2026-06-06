"use client";

import React from "react";
import { Smile, Reply, Copy, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

// Hover toolbar of per-message options. Each option is a shadcn Tooltip so the
// affordance label appears on hover. Actions are mock-only aside from Copy.
// Relies on a `group/msg` ancestor to reveal itself on hover.
export function MessageActions({ msg, isMe }) {
  const actions = [
    { key: "react", label: "React", icon: Smile, run: () => toast.success("Reaction added") },
    { key: "reply", label: "Reply", icon: Reply, run: () => toast.success("Replying in thread") },
    {
      key: "copy",
      label: "Copy text",
      icon: Copy,
      run: () => {
        navigator.clipboard?.writeText(msg.text).catch(() => {});
        toast.success("Copied to clipboard");
      },
    },
    { key: "more", label: "More", icon: MoreHorizontal, run: () => toast("Pin, forward, delete…") },
  ];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] p-0.5 opacity-0 shadow-sm transition-opacity group-hover/msg:opacity-100 focus-within:opacity-100",
        isMe ? "mr-1" : "ml-1",
      )}
    >
      {actions.map(({ key, label, icon: Icon, run }) => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={run}
              aria-label={label}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#a3a3a3] transition-colors hover:bg-[#2a2a2a] hover:text-white"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
