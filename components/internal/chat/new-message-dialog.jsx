"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, PenSquare, UserPlus } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { searchProfiles } from "@/lib/supabase/chat_profiles";
import { ME } from "@/lib/chat/people-store";
import { useOrg } from "@/lib/chat/org-context";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

// "New message" dialog: pick a teammate (or type an email / username) to start a
// direct conversation. Selecting a person calls onStartDm(person); a typed
// address that isn't in the directory calls onStartDm({ query }) so the screen
// can resolve it server-side.
export function NewMessageDialog({ people = [], onStartDm }) {
  const { currentOrgId } = useOrg();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState([]);

  // Live directory search: query the users table by name/username/email so
  // anyone is findable, not just the preloaded roster. Debounced; merged with
  // the local list below. Scoped to the current org.
  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(() => {
      if (!open || !q) {
        setRemote([]);
        return;
      }
      searchProfiles(q, { organizationId: currentOrgId }).then((rows) => setRemote(rows || []));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, currentOrgId]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const local = people.filter((p) => {
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
      );
    });
    // Merge in DB matches, de-duped by id and excluding self.
    const seen = new Set(local.map((p) => p.id));
    const merged = [...local];
    for (const p of remote) {
      if (p?.id && p.id !== ME.id && !seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
    return merged;
  }, [people, query, remote]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setRemote([]);
  };

  const start = (person) => {
    close();
    onStartDm?.(person);
  };

  const startByQuery = () => {
    const q = query.trim();
    if (!q) return;
    close();
    onStartDm?.({ query: q });
  };

  const looksLikeAddress = /\S+@\S+|^[\w.-]+$/.test(query.trim());

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
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
          <DialogDescription>Search a teammate, or enter an email or username.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-card px-2.5 transition-colors focus-within:border-border-strong">
          <Search className="h-4 w-4 text-text-secondary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email or username"
            className="h-9 flex-1 bg-transparent text-sm text-foreground placeholder:text-text-secondary focus:outline-none"
          />
        </div>
        <div className="max-h-72 space-y-0.5 overflow-y-auto scrollbar-subtle">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => start(p)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-hover"
            >
              <UserAvatar person={p} size="md" showPresence />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                <p className="truncate text-xs text-text-secondary">
                  {p.username ? `@${p.username}` : p.role}
                </p>
              </div>
            </button>
          ))}
          {results.length === 0 ? (
            query.trim() && looksLikeAddress ? (
              <button
                type="button"
                onClick={startByQuery}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface-card text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">Start chat with “{query.trim()}”</p>
                  <p className="truncate text-xs text-text-secondary">Look up this email or username</p>
                </div>
              </button>
            ) : (
              <p className="px-3 py-8 text-center text-sm text-text-secondary">No people found.</p>
            )
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
