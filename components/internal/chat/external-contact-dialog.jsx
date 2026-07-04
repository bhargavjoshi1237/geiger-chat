"use client";

// Confirmation shown before starting a conversation with someone who isn't a
// member of the current organization. Makes the "you're reaching outside your
// org" moment explicit rather than silently opening the thread.

import React from "react";
import { Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserAvatar } from "./user-avatar";
import { ExternalBadge } from "./external-badge";
import { useOrg } from "@/lib/chat/org-context";

export function ExternalContactDialog({ person, onConfirm, onCancel }) {
  const { currentOrg } = useOrg();
  const orgName = currentOrg?.name || "your organization";

  return (
    <Dialog open={!!person} onOpenChange={(v) => { if (!v) onCancel?.(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-500">
            <Globe className="h-5 w-5" />
          </div>
          <DialogTitle>Start an external conversation?</DialogTitle>
          <DialogDescription>
            {person?.name || "This person"} isn&apos;t a member of{" "}
            <span className="font-medium text-foreground">{orgName}</span>. Messages
            with people outside your organization happen beyond your workspace&apos;s
            chat circle.
          </DialogDescription>
        </DialogHeader>

        {person ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-card p-3">
            <UserAvatar person={person} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-foreground">
                  {person.name}
                </span>
                <ExternalBadge />
              </div>
              {person.email || person.username ? (
                <span className="truncate text-xs text-text-secondary">
                  {person.email || `@${person.username}`}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-surface-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Message anyway
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
