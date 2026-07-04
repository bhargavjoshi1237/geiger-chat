"use client";

// Workspace (organization) picker — a clean dialog launched from the profile
// dropdown. Lists the orgs the signed-in user belongs to, each shown with its
// avatar, name and owner (name + pfp), and switches the active org on select.
// Selection is owned by the org context (persisted + scopes all chat data).

import React from "react";
import { Check, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOrg } from "@/lib/chat/org-context";
import { cn } from "@/lib/utils";

// Organizations are created and managed in geiger-dash, not here — chat only
// switches between the orgs the user already belongs to. This links to dash's
// workspace management page (/chat is proxied through dash in production, so the
// relative path resolves on the dash host).
const MANAGE_ORG_URL = process.env.NEXT_PUBLIC_DASH_ORG_URL || "/org";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Public profile-picture URL for a user id (same convention the app uses
// everywhere). Falls back to initials if the object doesn't exist.
function ownerPfp(ownerId) {
  return ownerId && SUPABASE_URL
    ? `${SUPABASE_URL}/storage/v1/object/public/pfp/${ownerId}/latest.jpg`
    : null;
}

export function OrgPickerDialog({ open, onOpenChange }) {
  const { orgs, currentOrg, selectOrg } = useOrg();

  const choose = (id) => {
    selectOrg(id);
    onOpenChange(false);
  };

  const hasOrgs = orgs && orgs.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Switch workspace</DialogTitle>
          <DialogDescription>
            Choose which organization&apos;s chat circle to open.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[360px] flex-col gap-1.5 overflow-y-auto">
          {hasOrgs ? (
            orgs.map((org) => {
              const active = org.id === currentOrg?.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => choose(org.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    active
                      ? "border-border-strong bg-surface-active"
                      : "border-border bg-surface-card hover:bg-surface-hover",
                  )}
                >
                  <Avatar className="size-10 rounded-lg border border-border">
                    {org.avatarUrl ? (
                      <AvatarImage src={org.avatarUrl} alt={org.name} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="rounded-lg bg-surface-strong text-xs font-semibold text-foreground">
                      {initialsOf(org.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {org.name}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Avatar className="size-4 shrink-0">
                        {ownerPfp(org.ownerId) ? (
                          <AvatarImage src={ownerPfp(org.ownerId)} alt={org.ownerName} />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-[8px] font-semibold text-white">
                          {initialsOf(org.ownerName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">
                        {org.isOwner ? "You own this workspace" : `Owned by ${org.ownerName}`}
                      </span>
                    </div>
                  </div>

                  {active ? <Check className="size-4 shrink-0 text-foreground" /> : null}
                </button>
              );
            })
          ) : (
            <div className="rounded-lg border border-border bg-surface-card p-4 text-center text-sm text-muted-foreground">
              You&apos;re not part of any workspace yet.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href = MANAGE_ORG_URL;
          }}
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Building2 className="size-4" />
          Manage workspaces
        </button>
      </DialogContent>
    </Dialog>
  );
}
