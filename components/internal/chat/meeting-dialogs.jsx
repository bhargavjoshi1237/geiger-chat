"use client";

import React, { useMemo, useState } from "react";
import {
  addDays, addMonths, endOfMonth, endOfWeek, format, isBefore,
  isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import {
  Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, Link2,
  Mic, MicOff, Plus, Search, Video, VideoOff, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserAvatar, AvatarStack } from "./user-avatar";
import { PRESENCE } from "./chat-utils";
import { ME, PEOPLE } from "@/lib/mock/chat-data";
import { cn } from "@/lib/utils";

// --- Meeting code / link helpers ------------------------------------------
// Codes look like "abc-defg-hij" (Meet-style). Generated client-side only so
// nothing leaks into SSR markup and the demo stays self-contained.
const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const MEET_BASE = "https://meet.geiger.app/";

function makeMeetingCode() {
  const seg = (n) =>
    Array.from({ length: n }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
}

function meetingLink(code) {
  return `${MEET_BASE}${code}`;
}

// Deterministically derive who is "already in" a meeting from its code so the
// join-confirmation screen feels real without any backend.
function hashCode(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function meetingFromCode(code) {
  const h = hashCode(code || "meeting");
  const host = PEOPLE[h % PEOPLE.length];
  const otherCount = 1 + (h % 4); // 1–4 others alongside the host
  const others = PEOPLE.filter((p) => p.id !== host.id).slice(0, otherCount);
  return { host, participants: [host, ...others] };
}

// --- Shared bits -----------------------------------------------------------

// Read-only link field with a copy affordance, used by both the invite and
// schedule dialogs.
function CopyLinkRow({ value, label = "Copy link" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link");
    }
  };
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-[#333333] bg-[#161616] px-3">
        <Link2 className="h-4 w-4 shrink-0 text-[#737373]" />
        <span className="truncate text-sm text-[#d4d4d4]">{value}</span>
      </div>
      <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={copy}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : label}
      </Button>
    </div>
  );
}

// Round mic / camera toggle in the pre-join lounge.
function MediaToggle({ on, onIcon: OnIcon, offIcon: OffIcon, label, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-pressed={on}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
        on
          ? "border-[#333] bg-[#2a2a2a] text-white hover:bg-[#333]"
          : "border-transparent bg-[#3a1d1d] text-red-300 hover:bg-[#4a2424]",
      )}
    >
      {on ? <OnIcon className="h-[18px] w-[18px]" /> : <OffIcon className="h-[18px] w-[18px]" />}
    </button>
  );
}

// ===========================================================================
// New meeting → invite people
// ===========================================================================
// The dialogs below are remounted by the parent (via a `key` that changes on
// each open), so lazy initializers give every session a fresh code and a clean
// slate without resetting state from an effect.
export function InvitePeopleDialog({ open, onOpenChange, onStart }) {
  const [code] = useState(makeMeetingCode);
  const [query, setQuery] = useState("");
  const [invited, setInvited] = useState([]);

  const invitedIds = useMemo(() => new Set(invited.map((p) => p.id)), [invited]);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PEOPLE.filter(
      (p) => !invitedIds.has(p.id) && (!q || p.name.toLowerCase().includes(q) || p.role?.toLowerCase().includes(q)),
    );
  }, [query, invitedIds]);

  const add = (person) => setInvited((prev) => [...prev, person]);
  const remove = (id) => setInvited((prev) => prev.filter((p) => p.id !== id));

  const startWith = (participants) => {
    onStart({ title: invited.length ? "Team meeting" : "Instant meeting", participants, code });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(512px,calc(100vw-32px))] gap-0 p-0">
        <div className="border-b border-[#2a2a2a] p-5">
          <DialogTitle>New meeting</DialogTitle>
          <DialogDescription className="mt-1">
            Invite people to join, or start instantly on your own.
          </DialogDescription>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5 scrollbar-subtle">
          {/* Search people */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add people by name"
              className="h-9 w-full rounded-md border border-[#333333] bg-[#161616] pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-[#737373] focus:border-[#474747]"
            />
          </div>

          {/* Invited chips */}
          {invited.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {invited.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#333333] bg-[#202020] py-1 pl-1 pr-2 text-sm text-[#e7e7e7]"
                >
                  <UserAvatar person={p} size="xs" />
                  {p.firstName}
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[#737373] hover:bg-[#333] hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {/* Suggestions */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#737373]">
              {query.trim() ? "Results" : "Suggested"}
            </p>
            <ul className="flex flex-col">
              {suggestions.length === 0 ? (
                <li className="py-2 text-sm text-[#737373]">No people to add.</li>
              ) : (
                suggestions.map((p) => {
                  const presence = PRESENCE[p.presence] || PRESENCE.offline;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => add(p)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#222]"
                      >
                        <UserAvatar person={p} size="md" showPresence />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-[#e7e7e7]">{p.name}</span>
                          <span className="block truncate text-xs text-[#737373]">{p.role}</span>
                        </span>
                        <span className="text-xs" style={{ color: presence.color }}>
                          {presence.label}
                        </span>
                        <Plus className="h-4 w-4 text-[#737373]" />
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Share link */}
          <div className="mt-5 border-t border-[#2a2a2a] pt-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#737373]">
              Meeting link
            </p>
            <CopyLinkRow value={meetingLink(code)} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#2a2a2a] p-4">
          <Button variant="outline" size="sm" className="h-9" onClick={() => startWith([])}>
            Start instant
          </Button>
          <Button size="sm" className="h-9" disabled={!invited.length} onClick={() => startWith(invited)}>
            <Video className="h-4 w-4" />
            Start meeting{invited.length ? ` (${invited.length + 1})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Join with a code → confirm
// ===========================================================================
export function JoinConfirmDialog({ open, code, onOpenChange, onJoin }) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const { host, participants } = useMemo(() => meetingFromCode(code), [code]);

  const join = () => {
    onJoin({
      title: host ? `${host.firstName}'s meeting` : "Meeting",
      participants,
      initialMic: micOn,
      initialCam: camOn,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(440px,calc(100vw-32px))] gap-0 p-0">
        <div className="border-b border-[#2a2a2a] p-5">
          <DialogTitle>Ready to join?</DialogTitle>
          <DialogDescription className="mt-1">
            {code ? <>Meeting code <span className="font-mono text-[#d4d4d4]">{code}</span></> : "Check your camera and mic before joining."}
          </DialogDescription>
        </div>

        <div className="p-5">
          {/* Self preview */}
          <div className="relative flex min-h-[150px] items-center justify-center overflow-hidden rounded-xl border border-[#262626] bg-[#0e0e0e]">
            {camOn ? (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 90% at 30% 20%, #2c2c2c, transparent 60%), radial-gradient(120% 90% at 80% 90%, #232323, #121212 70%)",
                }}
              />
            ) : null}
            <div className="relative">
              <UserAvatar person={ME} size="xl" />
            </div>
            {!camOn ? (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-black/45 px-2 py-1 text-xs text-[#cbd5e1] backdrop-blur-sm">
                Camera is off
              </span>
            ) : null}
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <MediaToggle on={micOn} onIcon={Mic} offIcon={MicOff} label={micOn ? "Mute" : "Unmute"} onToggle={() => setMicOn((v) => !v)} />
              <MediaToggle on={camOn} onIcon={Video} offIcon={VideoOff} label={camOn ? "Stop video" : "Start video"} onToggle={() => setCamOn((v) => !v)} />
            </div>
          </div>

          {/* Who's in there */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#202020] px-4 py-3">
            <AvatarStack people={participants} size="sm" max={4} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[#e7e7e7]">
                {host?.firstName} is hosting
              </p>
              <p className="text-xs text-[#737373]">
                {participants.length} {participants.length === 1 ? "person" : "people"} in the call
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#2a2a2a] p-4">
          <Button variant="outline" size="sm" className="h-9" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="h-9" onClick={join}>
            Join now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Schedule
// ===========================================================================

// Half-hour time slots across the day for the time dropdown.
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 ? 30 : 0;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { value: i * 30, label: `${hour12}:${String(m).padStart(2, "0")} ${period}` };
});

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function MiniCalendar({ selected, onSelect }) {
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()));
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    const out = [];
    for (let d = start; !isBefore(end, d); d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);

  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#a3a3a3] hover:bg-[#2a2a2a] hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-[#e7e7e7]">{format(month, "MMMM yyyy")}</span>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#a3a3a3] hover:bg-[#2a2a2a] hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="flex h-7 items-center justify-center text-[11px] font-medium text-[#737373]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const isSelected = selected && isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const isPast = isBefore(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(day)}
              className={cn(
                "flex h-8 items-center justify-center rounded-md text-sm transition-colors",
                isSelected
                  ? "bg-[#e7e7e7] font-semibold text-[#161616]"
                  : isPast
                    ? "text-[#3f3f3f]"
                    : inMonth
                      ? "text-[#e7e7e7] hover:bg-[#2a2a2a]"
                      : "text-[#525252] hover:bg-[#2a2a2a]",
                !isSelected && isToday && "ring-1 ring-[#474747]",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleDialog({ open, onOpenChange, defaultTitle = "" }) {
  const [title, setTitle] = useState(defaultTitle);
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [slot, setSlot] = useState(540); // 9:00 AM default
  const [code] = useState(makeMeetingCode);

  const slotLabel = TIME_SLOTS.find((s) => s.value === slot)?.label ?? "";

  const schedule = () => {
    const when = date ? format(date, "EEE, MMM d") : "";
    toast.success("Meeting scheduled", {
      description: `${title.trim() || "Untitled meeting"} · ${when} at ${slotLabel}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(480px,calc(100vw-32px))] gap-0 p-0">
        <div className="border-b border-[#2a2a2a] p-5">
          <DialogTitle>Schedule a meeting</DialogTitle>
          <DialogDescription className="mt-1">
            Pick a date and time, then share the link with your team.
          </DialogDescription>
        </div>

        <div className="max-h-[64vh] space-y-4 overflow-y-auto p-5 scrollbar-subtle">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#737373]">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Planning"
              className="h-9 w-full rounded-md border border-[#333333] bg-[#161616] px-3 text-sm text-white outline-none transition-colors placeholder:text-[#737373] focus:border-[#474747]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#737373]">
              Date
            </label>
            <MiniCalendar selected={date} onSelect={setDate} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#737373]">
              Time
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-full items-center gap-2 rounded-md border border-[#333333] bg-[#161616] px-3 text-sm text-[#e7e7e7] transition-colors hover:border-[#474747]"
                >
                  <Clock className="h-4 w-4 text-[#737373]" />
                  <span className="flex-1 text-left">{slotLabel}</span>
                  <ChevronDown className="h-4 w-4 text-[#737373]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-64 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto scrollbar-subtle">
                {TIME_SLOTS.map((s) => (
                  <DropdownMenuItem key={s.value} onSelect={() => setSlot(s.value)} className="justify-between">
                    {s.label}
                    {s.value === slot ? <Check className="h-4 w-4" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#737373]">
              Meeting link
            </label>
            <CopyLinkRow value={meetingLink(code)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#2a2a2a] p-4">
          <Button variant="outline" size="sm" className="h-9" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="h-9" disabled={!date} onClick={schedule}>
            <Calendar className="h-4 w-4" />
            Schedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
