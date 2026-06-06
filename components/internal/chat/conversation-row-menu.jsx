"use client";

import React from "react";
import {
  Pin, BellOff, CheckCheck, Archive, Trash2, Settings, Users, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { getPerson } from "@/lib/mock/chat-data";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function ConversationRowMenu({ conversation, variant, children }) {
  const isChannel = variant === "channel";
  const name = isChannel ? `#${conversation.name}` : getPerson(conversation.participantId).name;
  const act = (msg) => () => toast.success(msg);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={act(conversation.pinned ? `Unpinned ${name}` : `Pinned ${name}`)}>
          <Pin /> {conversation.pinned ? "Unpin" : "Pin to top"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={act(`Muted ${name}`)}>
          <BellOff /> Mute notifications
        </ContextMenuItem>
        <ContextMenuItem onSelect={act(`Marked ${name} as read`)}>
          <CheckCheck /> Mark as read
        </ContextMenuItem>
        <ContextMenuSeparator />
        {isChannel ? (
          <>
            <ContextMenuItem onSelect={act(`Opening ${name} settings`)}>
              <Settings /> Channel settings
            </ContextMenuItem>
            <ContextMenuItem onSelect={act(`Showing members of ${name}`)}>
              <Users /> View members
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onSelect={act(`Left ${name}`)}>
              <LogOut /> Leave channel
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem onSelect={act(`Archived ${name}`)}>
              <Archive /> Archive conversation
            </ContextMenuItem>
            <ContextMenuItem variant="destructive" onSelect={act(`Deleted conversation with ${name}`)}>
              <Trash2 /> Delete conversation
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
