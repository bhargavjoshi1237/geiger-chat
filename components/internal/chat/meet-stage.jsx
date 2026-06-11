"use client";

import React, { useEffect, useState } from "react";
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp,
  Users, MessageSquare, PhoneOff, Hand, MoreHorizontal, Maximize2,
} from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { ME } from "@/lib/mock/chat-data";
import { cn } from "@/lib/utils";

function useElapsed(active) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// A "video" tile. With no real media we render a soft gradient lit by the
// person's accent colour, falling back to a centered avatar when their camera
// is off — which reads clearly as a meeting grid.
function ParticipantTile({ person, cameraOn = true, muted = false, speaking = false, isSelf = false, big = false }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-[#0e0e0e] transition-all",
        speaking ? "border-[#525252] ring-1 ring-ring" : "border-[#262626]",
        big ? "min-h-[260px]" : "min-h-[140px]",
      )}
    >
      {cameraOn ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 30% 20%, #2c2c2c, transparent 60%), radial-gradient(120% 90% at 80% 90%, #232323, #121212 70%)",
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <UserAvatar person={person} size={big ? "xl" : "lg"} />
        </div>
      )}

      {cameraOn ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <UserAvatar person={person} size={big ? "xl" : "lg"} />
        </div>
      ) : null}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/45 px-2 py-1 backdrop-blur-sm">
        <span className="text-xs font-medium text-white">{isSelf ? "You" : person.firstName}</span>
        {muted ? <MicOff className="h-3 w-3 text-red-400" /> : <Mic className="h-3 w-3 text-[#cbd5e1]" />}
      </div>
    </div>
  );
}

function ControlButton({ icon: Icon, label, active, danger, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
        danger
          ? "border-transparent bg-red-600 text-white hover:bg-red-500"
          : active
            ? "border-[#333] bg-surface-hover text-white hover:bg-[#333]"
            : "border-transparent bg-[#3a1d1d] text-red-300 hover:bg-[#4a2424]",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

// Active meeting surface. `embedded` keeps it inside a panel (Calls screen);
// otherwise it covers the workspace as a call overlay.
export function MeetStage({ title = "Meeting", participants = [], kind = "video", embedded = false, initialMic = true, initialCam, onLeave }) {
  const [micOn, setMicOn] = useState(initialMic);
  const [camOn, setCamOn] = useState(initialCam ?? kind === "video");
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const elapsed = useElapsed(true);

  const everyone = [...participants, ME];
  // Rotate the "speaking" highlight so the grid feels alive.
  const [speakingIdx, setSpeakingIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSpeakingIdx((i) => (i + 1) % Math.max(participants.length, 1)), 2600);
    return () => clearInterval(id);
  }, [participants.length]);

  const gridCols =
    everyone.length <= 2 ? "grid-cols-1 sm:grid-cols-2" :
    everyone.length <= 4 ? "grid-cols-2" :
    "grid-cols-2 lg:grid-cols-3";

  return (
    <div
      className={cn(
        "flex flex-col bg-[#0c0c0c]",
        embedded ? "h-full rounded-2xl border border-[#262626] overflow-hidden" : "fixed inset-0 z-50",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="text-[11px] text-text-secondary">{elapsed} · {everyone.length} in call</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="hidden h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-card hover:text-foreground sm:flex" title="Participants">
            <Users className="h-[18px] w-[18px]" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-card hover:text-foreground" title="Fullscreen">
            <Maximize2 className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-subtle sm:p-4">
        <div className={cn("grid h-full gap-3", gridCols)}>
          {participants.map((p, i) => (
            <ParticipantTile
              key={p.id}
              person={p}
              cameraOn
              muted={i % 3 === 0}
              speaking={i === speakingIdx}
              big={everyone.length <= 2}
            />
          ))}
          <ParticipantTile person={ME} cameraOn={camOn} muted={!micOn} isSelf big={everyone.length <= 2} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3 sm:gap-3">
        <ControlButton icon={micOn ? Mic : MicOff} label={micOn ? "Mute" : "Unmute"} active={micOn} onClick={() => setMicOn((v) => !v)} />
        <ControlButton icon={camOn ? VideoIcon : VideoOff} label={camOn ? "Stop video" : "Start video"} active={camOn} onClick={() => setCamOn((v) => !v)} />
        <ControlButton icon={MonitorUp} label="Share screen" active={sharing} onClick={() => setSharing((v) => !v)} />
        <ControlButton icon={Hand} label="Raise hand" active={handRaised} onClick={() => setHandRaised((v) => !v)} />
        <button className="hidden h-11 w-11 items-center justify-center rounded-full bg-surface-hover text-white hover:bg-[#333] sm:flex" title="Chat">
          <MessageSquare className="h-[18px] w-[18px]" />
        </button>
        <button className="hidden h-11 w-11 items-center justify-center rounded-full bg-surface-hover text-white hover:bg-[#333] sm:flex" title="More">
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="ml-1 flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
        >
          <PhoneOff className="h-[18px] w-[18px]" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
}
