"use client";

import React, { useMemo, useState } from "react";
import { Search, PenSquare } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "./user-avatar";
import { PEOPLE } from "@/lib/mock/chat-data";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

// "New message" dialog: pick a teammate to start a direct conversation. If a DM
// with that person already exists it's selected; otherwise it's a mock start.
export function NewMessageDialog({ items, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PEOPLE.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [query]);

  const start = (person) => {
    const existing = items.find((c) => c.participantId === person.id);
    setOpen(false);
    setQuery("");
    if (existing) {
      onSelect(existing.id);
    } else {
      toast.success(`Started a chat with ${person.name}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="New message"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <PenSquare className="h-[17px] w-[17px]" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Choose a teammate to start a conversation.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-card px-2.5 transition-colors focus-within:border-border-strong">
          <Search className="h-4 w-4 text-text-secondary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people"
            className="h-9 flex-1 bg-transparent text-sm text-foreground placeholder:text-text-secondary focus:outline-none"
          />
        </div>
        <div className="max-h-72 space-y-0.5 overflow-y-auto scrollbar-subtle">
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => start(p)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-active"
            >
              <UserAvatar person={p} size="md" showPresence />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                <p className="truncate text-xs text-text-secondary">{p.role}</p>
              </div>
            </button>
          ))}
          {people.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-text-secondary">No people found.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
