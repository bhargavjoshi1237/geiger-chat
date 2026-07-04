"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { searchProfiles } from "@/lib/supabase/chat_profiles";
import { ME } from "@/lib/chat/people-store";
import { useOrg } from "@/lib/chat/org-context";
import { cn } from "@/lib/utils";

// Searchable multi-select roster used by the create-channel and invite dialogs.
// Matches on name, username or email so people are findable the way they're
// invited. Selection state is owned by the parent. Scoped to the current org.
export function PeoplePicker({
  people = [],
  selectedIds = [],
  onToggle,
  excludeIds = [],
  placeholder = "Search people by name, username or email",
  emptyLabel = "No people found.",
}) {
  const { currentOrgId } = useOrg();
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState([]);
  const selected = new Set(selectedIds);

  // Live directory search by name/username/email against the users table, so
  // people outside the preloaded roster are still addable. Debounced. Scoped to
  // the current org so only teammates in this workspace can be picked.
  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(() => {
      if (!q) {
        setRemote([]);
        return;
      }
      searchProfiles(q, { organizationId: currentOrgId }).then((rows) => setRemote(rows || []));
    }, 250);
    return () => clearTimeout(t);
  }, [query, currentOrgId]);

  const results = useMemo(() => {
    const ex = new Set(excludeIds);
    const q = query.trim().toLowerCase();
    const local = people
      .filter((p) => p?.id && !ex.has(p.id))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name?.toLowerCase().includes(q) ||
          p.username?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q)
        );
      });
    // Merge DB matches, de-duped by id and excluding self / already-excluded.
    const seen = new Set(local.map((p) => p.id));
    const merged = [...local];
    for (const p of remote) {
      if (p?.id && p.id !== ME.id && !ex.has(p.id) && !seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
    return merged;
  }, [people, query, excludeIds, remote]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-card px-2.5 transition-colors focus-within:border-border-strong">
        <Search className="h-4 w-4 text-text-secondary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-9 flex-1 bg-transparent text-sm text-foreground placeholder:text-text-secondary focus:outline-none"
        />
      </div>
      <div className="max-h-60 space-y-0.5 overflow-y-auto scrollbar-subtle">
        {results.map((p) => {
          const isSelected = selected.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle?.(p.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                isSelected ? "bg-surface-active" : "hover:bg-surface-hover",
              )}
            >
              <UserAvatar person={p} size="md" showPresence />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                <p className="truncate text-xs text-text-secondary">
                  {p.username ? `@${p.username}` : p.email || p.role}
                </p>
              </div>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-strong text-transparent",
                )}
              >
                <Check className="h-3 w-3" />
              </span>
            </button>
          );
        })}
        {results.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-text-secondary">{emptyLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
