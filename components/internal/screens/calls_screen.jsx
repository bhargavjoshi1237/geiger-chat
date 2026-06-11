"use client";

import React, { useState } from "react";
import {
  Video, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Link2, Calendar, ArrowRight, MoreHorizontal, MessageSquare,
  FileText, Download, CalendarClock, Info,
} from "lucide-react";
import { toast } from "sonner";
import { ScreenContainer, ScreenHeader } from "./screen-shell";
import { UserAvatar } from "@/components/internal/chat/user-avatar";
import { MeetStage } from "@/components/internal/chat/meet-stage";
import {
  InvitePeopleDialog, JoinConfirmDialog, ScheduleDialog,
} from "@/components/internal/chat/meeting-dialogs";
import { fromNow, durationLabel } from "@/components/internal/chat/chat-utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RECENT_CALLS, getPerson } from "@/lib/mock/chat-data";
import { cn } from "@/lib/utils";

function ActionCard({ icon: Icon, title, subtitle, onClick, children }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface-subtle p-6 transition-colors hover:border-border-strong">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-card text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-text-secondary">{subtitle}</p>
      {children ? <div className="mt-4">{children}</div> : (
        <button onClick={onClick} className="mt-4 inline-flex h-8 w-fit items-center gap-1.5 rounded-lg bg-[#e7e7e7] px-3 text-xs font-semibold text-[#161616] transition-colors hover:bg-white">
          Start <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

const DIRECTION_META = {
  missed: { icon: PhoneMissed, label: "Missed", className: "text-red-400" },
  incoming: { icon: PhoneIncoming, label: "Incoming", className: "text-muted-foreground" },
  outgoing: { icon: PhoneOutgoing, label: "Outgoing", className: "text-muted-foreground" },
};

function CallTableRow({ call, onCallBack, onAction }) {
  const people = call.participantIds.map(getPerson);
  const dir = call.missed ? DIRECTION_META.missed : DIRECTION_META[call.direction] || DIRECTION_META.outgoing;
  const DirIcon = dir.icon;
  const KindIcon = call.kind === "video" ? Video : Phone;
  // Missed calls were never connected, so there's nothing to play back.
  const hasRecording = !call.missed && call.kind === "video";
  const hasTranscript = !call.missed;

  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar person={people[0]} size="md" />
          <div className="min-w-0">
            <p className={cn("truncate text-sm font-medium", call.missed ? "text-red-400" : "text-foreground")}>{call.title}</p>
            <p className="truncate text-xs text-text-secondary">{people.map((p) => p.firstName).join(", ")}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className={cn("inline-flex items-center gap-1.5 text-xs", dir.className)}>
          <DirIcon className="h-3.5 w-3.5" /> {dir.label}
        </span>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <KindIcon className="h-3.5 w-3.5 text-text-secondary" /> {call.kind === "video" ? "Video" : "Audio"}
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{call.missed ? "—" : durationLabel(call.durationMins)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{fromNow(call.minsAgo)} ago</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onCallBack(call)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-surface-hover hover:text-foreground group-hover:opacity-100"
            title="Call back"
          >
            <Phone className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground data-[state=open]:bg-surface-hover data-[state=open]:text-foreground"
                title="More"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem onSelect={() => onAction("reference", call)}>
                <MessageSquare className="h-4 w-4" />
                Reference in chat
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!hasTranscript} onSelect={() => onAction("transcript", call)}>
                <FileText className="h-4 w-4" />
                Download transcription
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!hasRecording} onSelect={() => onAction("video", call)}>
                <Download className="h-4 w-4" />
                Download video
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction("reschedule", call)}>
                <CalendarClock className="h-4 w-4" />
                Reschedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onAction("detail", call)}>
                <Info className="h-4 w-4" />
                Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function CallsScreen() {
  const [meeting, setMeeting] = useState(null);
  const [code, setCode] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState("");
  // Bumped on every open so each dialog remounts with a fresh code / clean form.
  const [session, setSession] = useState(0);

  const openInvite = () => {
    setSession((s) => s + 1);
    setInviteOpen(true);
  };
  const openJoin = () => {
    setJoinCode(code.trim());
    setSession((s) => s + 1);
    setJoinOpen(true);
  };
  const openSchedule = (title = "") => {
    setScheduleTitle(title);
    setSession((s) => s + 1);
    setScheduleOpen(true);
  };

  const handleCallAction = (action, call) => {
    switch (action) {
      case "reference":
        toast.success(`Added “${call.title}” to the chat composer`);
        break;
      case "transcript":
        toast.success(`Downloading transcript — ${call.title}`);
        break;
      case "video":
        toast.success(`Downloading recording — ${call.title}`);
        break;
      case "reschedule":
        openSchedule(call.title);
        break;
      case "detail":
        toast(call.title, {
          description: `${call.kind === "video" ? "Video" : "Audio"} · ${
            call.missed ? "Missed" : durationLabel(call.durationMins)
          } · ${call.participantIds.map((id) => getPerson(id).firstName).join(", ")}`,
        });
        break;
      default:
        break;
    }
  };

  return (
    <>
      <ScreenContainer>
        <ScreenHeader
          title="Calls & Meetings"
          description="Start an instant meeting, join with a code, or call anyone back."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            icon={Video}
            title="New meeting"
            subtitle="Start an instant video call and invite your team."
            onClick={openInvite}
          />
          <ActionCard icon={Link2} title="Join with a code" subtitle="Enter a meeting code to join an existing call.">
            <div className="flex items-center gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) openJoin(); }}
                placeholder="abc-defg-hij"
                className="h-8 w-full rounded-lg border border-border bg-surface-card px-2.5 text-xs text-foreground placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
              />
              <button
                onClick={openJoin}
                disabled={!code.trim()}
                className="inline-flex h-8 shrink-0 items-center rounded-lg bg-[#e7e7e7] px-3 text-xs font-semibold text-[#161616] hover:bg-white disabled:opacity-40 disabled:hover:bg-[#e7e7e7]"
              >
                Join
              </button>
            </div>
          </ActionCard>
          <ActionCard icon={Calendar} title="Schedule" subtitle="Plan a meeting and share the invite with your team." onClick={() => openSchedule()} />
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="font-medium text-foreground">Recent calls</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT_CALLS.map((c) => (
                <CallTableRow
                  key={c.id}
                  call={c}
                  onCallBack={(call) => setMeeting({ title: call.title, participants: call.participantIds.map(getPerson) })}
                  onAction={handleCallAction}
                />
              ))}
            </TableBody>
          </Table>
        </section>
      </ScreenContainer>

      <InvitePeopleDialog
        key={`invite-${session}`}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onStart={({ title, participants }) => {
          setInviteOpen(false);
          setMeeting({ title, participants });
        }}
      />

      <JoinConfirmDialog
        key={`join-${session}`}
        open={joinOpen}
        code={joinCode}
        onOpenChange={setJoinOpen}
        onJoin={({ title, participants, initialMic, initialCam }) => {
          setJoinOpen(false);
          setMeeting({ title, participants, initialMic, initialCam });
        }}
      />

      <ScheduleDialog key={`schedule-${session}`} open={scheduleOpen} onOpenChange={setScheduleOpen} defaultTitle={scheduleTitle} />

      {meeting ? (
        <MeetStage
          title={meeting.title}
          participants={meeting.participants}
          initialMic={meeting.initialMic}
          initialCam={meeting.initialCam}
          onLeave={() => setMeeting(null)}
        />
      ) : null}
    </>
  );
}
