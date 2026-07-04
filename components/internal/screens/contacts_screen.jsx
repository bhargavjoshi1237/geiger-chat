"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, MessageSquare, Phone, Video, UserPlus } from "lucide-react";
import { ScreenContainer, ScreenHeader, btnPrimary } from "./screen-shell";
import { UserAvatar } from "@/components/internal/chat/user-avatar";
import { MeetStage } from "@/components/internal/chat/meet-stage";
import { PRESENCE, fromNow } from "@/components/internal/chat/chat-utils";
import { SegmentedTabs } from "@/components/internal/shared/segmented_tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ensureIdentity } from "@/lib/chat/identity";
import { setMe, hydratePeople, ME } from "@/lib/chat/people-store";
import { useOrg } from "@/lib/chat/org-context";
import { listProfiles } from "@/lib/supabase/chat_profiles";
import { cn } from "@/lib/utils";

const FILTERS = [
  { label: "Everyone", value: "all" },
  { label: "Online", value: "online" },
  { label: "Away", value: "away" },
  { label: "Offline", value: "offline" },
];

const PRESENCE_BADGE = {
  online: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  away: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  dnd: "bg-red-500/15 text-red-300 border-red-500/30",
  offline: "bg-surface-hover text-muted-foreground border-border",
};

function lastActiveLabel(person) {
  if (person.presence === "online") return "Active now";
  if (person.presence === "dnd") return "Do not disturb";
  return `${fromNow(person.lastSeen)} ago`;
}

function emailFor(person) {
  return person.email || `${person.firstName.toLowerCase()}@geiger.app`;
}

export function ContactsScreen({ onNavigate }) {
  const { currentOrgId } = useOrg();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [call, setCall] = useState(null);
  const [directory, setDirectory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentOrgId) return; // wait for the org; keep the initial loading state
      const me = await ensureIdentity(currentOrgId);
      if (cancelled) return;
      if (me) setMe(me);
      const profiles = await listProfiles(currentOrgId);
      if (profiles) hydratePeople(profiles);
      if (!cancelled) {
        setDirectory((profiles ?? []).filter((p) => p.id !== ME.id));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentOrgId]);

  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directory.filter((p) => {
      if (filter !== "all" && p.presence !== filter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.role || "").toLowerCase().includes(q);
    });
  }, [directory, query, filter]);

  return (
    <>
      <ScreenContainer>
        <ScreenHeader
          title="Contacts"
          description="Your team directory. Message or call anyone in one tap."
          actions={
            <button className={btnPrimary}>
              <UserPlus className="h-4 w-4" /> Invite
            </button>
          }
        />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people"
                className="w-full rounded-lg border border-border bg-surface-subtle py-[7px] pl-9 pr-4 text-sm text-foreground transition-colors placeholder:text-text-tertiary focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-border-strong"
              />
            </div>
            <SegmentedTabs tabs={FILTERS} value={filter} onChange={setFilter} className="self-start sm:self-auto" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-surface-subtle">
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-text-secondary">
                    Loading your team…
                  </TableCell>
                </TableRow>
              ) : people.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-text-secondary">
                    {directory.length === 0 ? "No teammates yet." : "No people match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                people.map((person) => {
                  const presence = PRESENCE[person.presence] || PRESENCE.offline;
                  return (
                    <TableRow key={person.id} className="border-border hover:bg-surface-active">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar person={person} size="md" showPresence />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">{person.name}</div>
                            <div className="truncate text-xs text-text-secondary">{emailFor(person)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{person.role}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge className={cn("gap-1.5 border px-2 font-medium", PRESENCE_BADGE[person.presence])}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: presence.color }} />
                          {presence.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{lastActiveLabel(person)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Message"
                            className="text-muted-foreground hover:bg-surface-active hover:text-foreground"
                            onClick={() => onNavigate?.("Messages")}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Audio call"
                            className="text-muted-foreground hover:bg-surface-active hover:text-foreground"
                            onClick={() => setCall({ person, kind: "audio" })}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Video call"
                            className="text-muted-foreground hover:bg-surface-active hover:text-foreground"
                            onClick={() => setCall({ person, kind: "video" })}
                          >
                            <Video className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </ScreenContainer>

      {call ? (
        <MeetStage
          title={call.person.name}
          participants={[call.person]}
          kind={call.kind}
          onLeave={() => setCall(null)}
        />
      ) : null}
    </>
  );
}
