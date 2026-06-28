"use client";

import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import { PeoplePicker } from "./people-picker";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

// Add people to an existing channel. Renders its own trigger (a UserPlus button)
// so it can sit in the thread header. Persists through onInvite(profileIds).
export function InviteMembersDialog({ channelName, people = [], excludeIds = [], onInvite }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);

  const reset = () => setSelected([]);
  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const invite = () => {
    if (selected.length === 0) return;
    setOpen(false);
    onInvite?.(selected);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Add people"
          aria-label="Add people"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <UserPlus className="h-[18px] w-[18px]" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add people{channelName ? ` to #${channelName}` : ""}</DialogTitle>
          <DialogDescription>Search by name, username or email to invite teammates.</DialogDescription>
        </DialogHeader>
        <PeoplePicker people={people} selectedIds={selected} onToggle={toggle} excludeIds={excludeIds} />
        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-surface-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={invite}
            disabled={selected.length === 0}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            Add{selected.length ? ` ${selected.length}` : ""}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
