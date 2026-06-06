"use client";

import React from "react";
import { UserAvatar } from "./user-avatar";

// Animated "…" bubble shown while a teammate is composing a reply.
export function TypingIndicator({ person }) {
  return (
    <div className="flex items-center gap-3 px-3 md:px-6">
      <UserAvatar person={person} size="sm" />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-[#202020] px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a3a3a3] [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a3a3a3] [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a3a3a3]" />
      </div>
    </div>
  );
}
