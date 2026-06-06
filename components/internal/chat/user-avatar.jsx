"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { initials, PRESENCE } from "./chat-utils";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
  xl: "h-16 w-16 text-xl",
};

const DOT_SIZES = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5",
};

// Deterministic colored-initials avatar with an optional presence indicator.
// Kept self-contained (no remote images) so screens render reliably offline.
export function UserAvatar({ person, size = "md", showPresence = false, className }) {
  if (!person) return null;
  const presence = PRESENCE[person.presence] || PRESENCE.offline;

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-[#333333] font-semibold uppercase text-[#e7e7e7] ring-1 ring-[#474747]",
          SIZES[size],
        )}
        aria-hidden
      >
        {initials(person.name)}
      </span>
      {showPresence ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-[#161616]",
            DOT_SIZES[size],
          )}
          style={{ backgroundColor: presence.color }}
          title={presence.label}
        />
      ) : null}
    </div>
  );
}

// Overlapping stack of avatars for showing meeting / channel members.
export function AvatarStack({ people = [], size = "sm", max = 4 }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <div key={p.id} className="rounded-full ring-2 ring-[#161616]">
            <UserAvatar person={p} size={size} />
          </div>
        ))}
      </div>
      {extra > 0 ? (
        <span className="ml-1.5 text-xs text-[#a3a3a3]">+{extra}</span>
      ) : null}
    </div>
  );
}
