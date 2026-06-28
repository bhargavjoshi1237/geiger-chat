"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { ME, getPerson } from "@/lib/chat/people-store";
import { cn } from "@/lib/utils";

function useElapsed(active) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// One participant tile bound to a real MediaStream. Renders <video> for video
// calls, otherwise an avatar plus a hidden <audio> so remote audio plays.
function MediaTile({ person, stream, isVideo, isSelf, big, statusLabel }) {
  const mediaRef = useRef(null);
  useEffect(() => {
    if (mediaRef.current && stream) mediaRef.current.srcObject = stream;
  }, [stream]);

  const hasVideo = isVideo && !!stream;
  return (
    <div
      className={cn(
        "group relative flex items-center justify-center overflow-hidden rounded-xl border border-border bg-background",
        big ? "min-h-[260px]" : "min-h-[140px]",
      )}
    >
      {hasVideo ? (
        <video
          ref={mediaRef}
          autoPlay
          playsInline
          muted={isSelf}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <UserAvatar person={person} size={big ? "xl" : "lg"} showPresence />
          {statusLabel ? (
            <span className="text-xs text-text-secondary">{statusLabel}</span>
          ) : null}
          {!isSelf ? <audio ref={mediaRef} autoPlay /> : null}
        </div>
      )}

      <div className="absolute bottom-2 left-2 rounded-md bg-black/45 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
        {isSelf ? "You" : person.firstName}
      </div>
    </div>
  );
}

function ControlButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
        active
          ? "border-border-strong bg-surface-hover text-foreground hover:bg-surface-active"
          : "border-transparent bg-red-500/10 text-red-300 hover:bg-red-500/20",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

// Active-call surface driven by real WebRTC media from useCall(). Covers the
// workspace as an overlay.
export function CallStage({ call, status, remoteStreams, localStream, micOn, camOn, onToggleMic, onToggleCam, onHangup }) {
  const isVideo = call?.kind === "video";
  const active = status === "active";
  const elapsed = useElapsed(active);

  const statusLabel =
    status === "calling" ? "Ringing…" : status === "connecting" ? "Connecting…" : active ? elapsed : "";

  // Peers to show: whoever has a live stream, otherwise the people we're ringing.
  const peerIds = Object.keys(remoteStreams || {});
  const shownIds = peerIds.length ? peerIds : (call?.targetIds || []);
  const everyone = shownIds.length + 1;
  const big = everyone <= 2;
  const gridCols =
    everyone <= 2 ? "grid-cols-1 sm:grid-cols-2" : everyone <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {active ? (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
            </span>
          ) : null}
          <div>
            <h2 className="text-sm font-semibold text-foreground">{call?.title || "Call"}</h2>
            <p className="text-[11px] text-text-secondary">
              {isVideo ? "Video call" : "Audio call"}
              {statusLabel ? ` · ${statusLabel}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-subtle sm:p-4">
        <div className={cn("grid h-full gap-3", gridCols)}>
          {shownIds.map((pid) => (
            <MediaTile
              key={pid}
              person={getPerson(pid)}
              stream={remoteStreams?.[pid]}
              isVideo={isVideo}
              big={big}
              statusLabel={!remoteStreams?.[pid] ? statusLabel : ""}
            />
          ))}
          <MediaTile person={ME} stream={localStream} isVideo={isVideo && camOn} isSelf big={big} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3 sm:gap-3">
        <ControlButton icon={micOn ? Mic : MicOff} label={micOn ? "Mute" : "Unmute"} active={micOn} onClick={onToggleMic} />
        {isVideo ? (
          <ControlButton icon={camOn ? VideoIcon : VideoOff} label={camOn ? "Stop video" : "Start video"} active={camOn} onClick={onToggleCam} />
        ) : null}
        <button
          type="button"
          onClick={onHangup}
          className="ml-1 flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
        >
          <PhoneOff className="h-[18px] w-[18px]" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
}
