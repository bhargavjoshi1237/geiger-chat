"use client";

import React, { useState } from "react";
import {
  MessageSquare, Hash, Phone, Users, Video, PenSquare,
  ArrowRight, Clock, ArrowUpRight, CalendarClock,
} from "lucide-react";
import { ScreenContainer, ScreenHeader, btnPrimary, btnSecondary } from "./screen-shell";
import { UserAvatar, AvatarStack } from "@/components/internal/chat/user-avatar";
import { MeetStage } from "@/components/internal/chat/meet-stage";
import { fromNow, lastMessagePreview, previewAuthor } from "@/components/internal/chat/chat-utils";
import {
  DIRECT_CONVERSATIONS, CHANNELS, RECENT_CALLS, UPCOMING_MEETINGS, PEOPLE, getPerson,
} from "@/lib/mock/chat-data";
import { cn } from "@/lib/utils";

const PRESENCE_ORDER = { online: 0, away: 1, dnd: 2, offline: 3 };

function untilLabel(mins) {
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `in ${h} hr ${m} min` : `in ${h} hr`;
}

/* ---------- containers ---------- */
function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-subtle p-4 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-card text-muted-foreground">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {hint ? <span className="text-[11px] text-text-secondary">{hint}</span> : null}
      </div>
      <div className="mt-3 text-2xl font-semibold leading-none text-foreground">{value}</div>
      <div className="mt-1.5 text-xs text-text-secondary">{label}</div>
    </div>
  );
}

// One grouped section: a titled panel that visually contains its items.
function Panel({ icon: Icon, title, hint, action, children, className }) {
  return (
    <section className={cn("flex flex-col rounded-2xl border border-border bg-surface-subtle p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-card text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint ? <span className="text-xs text-text-secondary">{hint}</span> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function HeaderLink({ label, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-foreground">
      {label} <ArrowRight className="h-3 w-3" />
    </button>
  );
}

/* ---------- items ---------- */
function ConversationCard({ conversation, onClick }) {
  const isChannel = conversation.type === "channel";
  const person = isChannel ? null : getPerson(conversation.participantId);
  const sub = isChannel ? `${conversation.memberIds.length} members` : person?.role;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-2.5 rounded-xl bg-surface-card p-3.5 text-left ring-1 ring-inset ring-transparent transition-colors hover:bg-surface-active hover:ring-[#333]"
    >
      <div className="flex items-center gap-2.5">
        {isChannel ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle text-muted-foreground">
            <Hash className="h-[18px] w-[18px]" />
          </div>
        ) : (
          <UserAvatar person={person} size="md" showPresence />
        )}
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-semibold text-foreground">
            {isChannel ? `#${conversation.name}` : person?.name}
          </span>
          <p className="truncate text-[11px] text-text-secondary">{sub}</p>
        </div>
        {conversation.unread ? (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#e7e7e7] px-1.5 text-[11px] font-semibold text-[#161616]">
            {conversation.unread}
          </span>
        ) : (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[#3a3a3a] transition-colors group-hover:text-muted-foreground" />
        )}
      </div>
      <p className="line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-muted-foreground">
        <span className="text-muted-foreground">{previewAuthor(conversation)}</span>
        {lastMessagePreview(conversation)}
      </p>
      <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
        <Clock className="h-3 w-3" />
        {fromNow(conversation.lastActivity)} ago
      </div>
    </button>
  );
}
 
export function OverviewScreen({ onNavigate }) {
  const [meeting, setMeeting] = useState(null);

  const unread = [...DIRECT_CONVERSATIONS, ...CHANNELS].reduce((s, c) => s + (c.unread || 0), 0);
  const onlineCount = PEOPLE.filter((p) => p.presence === "online").length + 1;

  const jumpBackIn = [...DIRECT_CONVERSATIONS, ...CHANNELS]
    .slice()
    .sort((a, b) => a.lastActivity - b.lastActivity)
    .slice(0, 4);

  const [nextMeeting, ...laterMeetings] = [...UPCOMING_MEETINGS].sort((a, b) => a.inMins - b.inMins);
  const peopleSorted = [...PEOPLE].sort(
    (a, b) => PRESENCE_ORDER[a.presence] - PRESENCE_ORDER[b.presence],
  );

  const startInstant = () =>
    setMeeting({ title: "Instant meeting", participants: PEOPLE.filter((p) => p.presence === "online").slice(0, 3) });

  const nextPeople = nextMeeting.participantIds.map(getPerson);

  return (
    <>
      <ScreenContainer fill>
        <ScreenHeader
          title="Overview"
          description={`Good morning, You. You have ${unread} unread messages and ${UPCOMING_MEETINGS.length} meetings today.`}
          actions={
            <>
              <button type="button" onClick={() => onNavigate?.("Messages")} className={btnSecondary}>
                <PenSquare className="h-4 w-4" /> New message
              </button>
              <button type="button" onClick={startInstant} className={btnPrimary}>
                <Video className="h-4 w-4" /> Start meeting
              </button>
            </>
          }
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={MessageSquare} label="Unread messages" value={unread} hint="3 chats" />
          <StatCard icon={Hash} label="Active channels" value={CHANNELS.length} />
          <StatCard icon={Phone} label="Calls today" value={RECENT_CALLS.length} />
          <StatCard icon={Users} label="People online" value={onlineCount} hint="now" />
        </div>

        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          {/* Jump back in */}
          <Panel
            icon={MessageSquare}
            title="Jump back in"
            className="lg:min-w-0 lg:basis-0 lg:grow-[1.4]"
            action={<HeaderLink label="All messages" onClick={() => onNavigate?.("Messages")} />}
          >
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              {jumpBackIn.map((c) => (
                <ConversationCard
                  key={c.id}
                  conversation={c}
                  onClick={() => onNavigate?.(c.type === "channel" ? "Channels" : "Messages")}
                />
              ))}
            </div>
          </Panel>

          {/* Upcoming */}
          <Panel
            icon={CalendarClock}
            title="Upcoming"
            className="lg:min-w-0 lg:basis-0 lg:grow"
            action={<HeaderLink label="Calls" onClick={() => onNavigate?.("Calls")} />}
          >
            {/* Up-next hero */}
            <div className="relative overflow-hidden rounded-xl bg-surface-card p-4">
              <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#e7e7e7] to-[#5a5a5a]" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Up next</span>
                  <h4 className="mt-1 truncate text-base font-semibold text-white">{nextMeeting.title}</h4>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {untilLabel(nextMeeting.inMins)}
                  </p>
                </div>
                <AvatarStack people={nextPeople} max={3} />
              </div>
              <button
                onClick={() => setMeeting({ title: nextMeeting.title, participants: nextPeople })}
                className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#e7e7e7] text-sm font-semibold text-[#161616] transition-colors hover:bg-white"
              >
                <Video className="h-4 w-4" /> Join meeting
              </button>
            </div>

            {/* Later meetings */}
            <div className="mt-2 space-y-1">
              {laterMeetings.map((mt) => {
                const people = mt.participantIds.map(getPerson);
                return (
                  <button
                    key={mt.id}
                    onClick={() => setMeeting({ title: mt.title, participants: people })}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-card"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-card text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{mt.title}</p>
                      <p className="text-xs text-text-secondary">{untilLabel(mt.inMins)}</p>
                    </div>
                    <AvatarStack people={people} max={3} />
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

      </ScreenContainer>

      {meeting ? (
        <MeetStage title={meeting.title} participants={meeting.participants} onLeave={() => setMeeting(null)} />
      ) : null}
    </>
  );
}
