"use client";

import React from "react";
import {
  AtSign, Bell, Briefcase, Clock, Hash, Phone, Pin, Users, Video,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { UserAvatar } from "./user-avatar";
import { PRESENCE, fromNow } from "./chat-utils";
import { ME, getPerson } from "@/lib/mock/chat-data";
import { cn } from "@/lib/utils";

function emailFor(person) {
  if (person.id === ME.id) return "you@geiger.studio";
  return `${person.firstName.toLowerCase()}@geiger.studio`;
}

function lastActiveLabel(person) {
  if (person.presence === "online") return "Active now";
  if (person.presence === "dnd") return "Do not disturb";
  if (person.lastSeen == null) return "Offline";
  return `${fromNow(person.lastSeen)} ago`;
}

// Round action button matching the thread-header affordances.
function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#202020] py-3 text-[#a3a3a3] transition-colors hover:border-[#474747] hover:text-white"
    >
      <Icon className="h-[18px] w-[18px]" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-[#737373]" />
      <span className="w-24 shrink-0 text-xs text-[#737373]">{label}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-[#e7e7e7]">{value}</span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="px-5 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-[#737373]">
      {children}
    </p>
  );
}

function MemberRow({ person }) {
  const presence = PRESENCE[person.presence] || PRESENCE.offline;
  const isMe = person.id === ME.id;
  return (
    <div className="flex items-center gap-3 px-5 py-2">
      <UserAvatar person={person} size="md" showPresence />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[#e7e7e7]">
          {person.name}
          {isMe ? <span className="text-[#737373]"> (you)</span> : null}
        </p>
        <p className="truncate text-xs text-[#737373]">{person.role}</p>
      </div>
      <span className="shrink-0 text-xs" style={{ color: presence.color }}>
        {presence.label}
      </span>
    </div>
  );
}

// Slide-over details panel for a conversation. Renders a person card for DMs and
// a channel card with its member roster for channels.
export function DetailsSheet({ conversation, open, onOpenChange, onStartCall }) {
  if (!conversation) return null;
  const isChannel = conversation.type === "channel";
  const person = isChannel ? null : getPerson(conversation.participantId);
  const members = (conversation.memberIds || []).map(getPerson);
  const presence = person ? PRESENCE[person.presence] || PRESENCE.offline : null;

  const call = (kind) => {
    onOpenChange(false);
    onStartCall?.(kind);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 border-l border-[#2a2a2a] bg-[#1a1a1a] p-0 text-[#e7e7e7] sm:max-w-sm">
        <SheetHeader className="gap-0 border-b border-[#2a2a2a] p-5">
          <div className="flex flex-col items-center text-center">
            {isChannel ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-[#202020] text-[#a3a3a3]">
                <Hash className="h-7 w-7" />
              </div>
            ) : (
              <UserAvatar person={person} size="xl" showPresence />
            )}
            <SheetTitle className="mt-3 text-lg text-white">
              {isChannel ? `#${conversation.name}` : person?.name}
            </SheetTitle>
            <SheetDescription className="mt-0.5">
              {isChannel
                ? `${members.length} members`
                : `${person?.role} · ${presence?.label}`}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-subtle pb-6">
          {/* Quick actions */}
          <div className="flex gap-2 p-5">
            <ActionButton icon={Phone} label="Audio" onClick={() => call("audio")} />
            <ActionButton icon={Video} label="Video" onClick={() => call("video")} />
            <ActionButton icon={Bell} label="Mute" onClick={() => onOpenChange(false)} />
          </div>

          {isChannel ? (
            <>
              <SectionLabel>About</SectionLabel>
              <DetailRow icon={Hash} label="Channel" value={`#${conversation.name}`} />
              <DetailRow icon={Briefcase} label="Topic" value={conversation.topic} />
              <DetailRow icon={Users} label="Members" value={`${members.length} people`} />
              {conversation.pinned ? <DetailRow icon={Pin} label="Status" value="Pinned" /> : null}

              <SectionLabel>Members</SectionLabel>
              <div className="flex flex-col">
                {members.map((member) => (
                  <MemberRow key={member.id} person={member} />
                ))}
              </div>
            </>
          ) : (
            <>
              <SectionLabel>Contact info</SectionLabel>
              <DetailRow icon={AtSign} label="Email" value={emailFor(person)} />
              <DetailRow icon={Briefcase} label="Role" value={person?.role} />
              <DetailRow
                icon={Clock}
                label="Last active"
                value={lastActiveLabel(person)}
              />
              <div className="flex items-center gap-3 px-5 py-2.5">
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: presence?.color }}
                />
                <span className="w-24 shrink-0 text-xs text-[#737373]">Status</span>
                <span className={cn("min-w-0 flex-1 truncate text-sm text-[#e7e7e7]")}>
                  {presence?.label}
                </span>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
