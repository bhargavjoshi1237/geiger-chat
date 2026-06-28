"use client";

// WebRTC call engine for the chat. A peer-to-peer MESH: one RTCPeerConnection
// per remote participant, so 1:1 DMs and small channels both work. Signaling
// (ring + offer/answer/ice) rides Supabase broadcast — see chat_call_signaling.
//
// Status machine: idle → calling (outgoing ring) | connecting (accepted) →
// active → idle. An incoming invite surfaces via `incoming` while status stays
// idle until the user accepts.

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ME } from "@/lib/chat/people-store";
import { logCall } from "@/lib/supabase/chat_calls";
import { sendMessage } from "@/lib/supabase/chat_messages";
import {
  iceServers, subscribeRing, ring, joinCall,
} from "@/lib/supabase/chat_call_signaling";

export function useCall() {
  const meId = ME.id;

  const [status, setStatus] = useState("idle"); // idle | calling | connecting | active
  const [call, setCall] = useState(null); // { conversationId, kind, title, targetIds, type, fromId, startedAt }
  const [incoming, setIncoming] = useState(null); // { callId, conversationId, from, fromName, kind, type, title }
  const [remoteStreams, setRemoteStreams] = useState({}); // peerId -> MediaStream
  const [localStream, setLocalStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);

  const localStreamRef = useRef(null);
  const pcsRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const sigRef = useRef(null); // { send, leave }
  const knownRef = useRef(new Set()); // peers we've started negotiating with
  const callRef = useRef(null);
  const statusRef = useRef("idle");
  const hangupRef = useRef(() => {});

  useEffect(() => { statusRef.current = status; }, [status]);

  const ensureLocalStream = useCallback(async (kind) => {
    if (localStreamRef.current) return localStreamRef.current;
    const constraints = kind === "video" ? { audio: true, video: true } : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    setMicOn(true);
    setCamOn(kind === "video");
    return stream;
  }, []);

  const removePeer = useCallback((peerId) => {
    const pc = pcsRef.current.get(peerId);
    if (pc) {
      try { pc.close(); } catch { /* ignore */ }
      pcsRef.current.delete(peerId);
    }
    knownRef.current.delete(peerId);
    setRemoteStreams((prev) => {
      if (!(peerId in prev)) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
    // In a 1:1 DM, the other side leaving ends the call.
    if (callRef.current?.type === "dm" && pcsRef.current.size === 0 && statusRef.current !== "idle") {
      hangupRef.current();
    }
  }, []);

  // Build (or reuse) the peer connection to `peerId`. The lexicographically
  // smaller id is the offerer, which avoids glare.
  const createPeer = useCallback((peerId, initiator) => {
    if (pcsRef.current.has(peerId)) return pcsRef.current.get(peerId);
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    pcsRef.current.set(peerId, pc);

    const local = localStreamRef.current;
    if (local) local.getTracks().forEach((t) => pc.addTrack(t, local));

    pc.onicecandidate = (e) => {
      if (e.candidate) sigRef.current?.send("ice", { from: meId, to: peerId, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (stream) setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        setStatus((cur) => (cur === "calling" || cur === "connecting" ? "active" : cur));
      } else if (s === "failed" || s === "closed" || s === "disconnected") {
        removePeer(peerId);
      }
    };

    if (initiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => sigRef.current?.send("offer", { from: meId, to: peerId, sdp: pc.localDescription }))
        .catch((err) => console.error("[call.offer]", err));
    }
    return pc;
  }, [meId, removePeer]);

  // Join the conversation's call channel and wire mesh negotiation.
  const attachSignaling = useCallback((conversationId) => {
    knownRef.current = new Set();
    sigRef.current = joinCall(conversationId, {
      onReady: () => sigRef.current?.send("join", { from: meId }),
      onJoin: ({ from } = {}) => {
        if (!from || from === meId || knownRef.current.has(from)) return;
        knownRef.current.add(from);
        sigRef.current?.send("join", { from: meId }); // announce back so they learn me
        if (meId < from) createPeer(from, true);
      },
      onOffer: async ({ from, to, sdp } = {}) => {
        if (to !== meId || !from) return;
        knownRef.current.add(from);
        const pc = createPeer(from, false);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sigRef.current?.send("answer", { from: meId, to: from, sdp: pc.localDescription });
        } catch (e) {
          console.error("[call.answer]", e);
        }
      },
      onAnswer: async ({ from, to, sdp } = {}) => {
        if (to !== meId) return;
        const pc = pcsRef.current.get(from);
        if (pc) {
          try { await pc.setRemoteDescription(new RTCSessionDescription(sdp)); }
          catch (e) { console.error("[call.setAnswer]", e); }
        }
      },
      onIce: async ({ from, to, candidate } = {}) => {
        if (to !== meId || !candidate) return;
        const pc = pcsRef.current.get(from);
        if (pc) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
          catch (e) { console.error("[call.addIce]", e); }
        }
      },
      onLeave: ({ from } = {}) => { if (from) removePeer(from); },
    });
  }, [meId, createPeer, removePeer]);

  const hangup = useCallback(() => {
    if (statusRef.current === "idle" && !callRef.current) return;
    pcsRef.current.forEach((pc) => { try { pc.close(); } catch { /* ignore */ } });
    pcsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);

    const data = callRef.current;
    sigRef.current?.send("leave", { from: meId });
    if (statusRef.current === "calling" && data) {
      ring(data.targetIds, "cancel", { callId: data.callId });
    }
    sigRef.current?.leave();
    sigRef.current = null;

    // Log the call (best-effort) when it actually connected.
    if (data && meId && statusRef.current === "active") {
      const durationMins = Math.max(0, Math.round((Date.now() - (data.startedAt || Date.now())) / 60000));
      logCall({
        title: data.title || "Call",
        kind: data.kind,
        direction: data.fromId === meId ? "outgoing" : "incoming",
        durationMins,
        ownerId: meId,
        participantIds: data.targetIds || [],
      });
    }

    // Post a call-event card into the conversation. Only the initiator posts so
    // a 1:1 call yields a single card; realtime delivers it to everyone.
    if (data && meId && data.fromId === meId && data.conversationId) {
      const connected = statusRef.current === "active";
      const durationMins = connected
        ? Math.max(0, Math.round((Date.now() - (data.startedAt || Date.now())) / 60000))
        : 0;
      sendMessage({
        conversationId: data.conversationId,
        authorId: meId,
        text: "",
        call: {
          status: connected ? "ended" : "missed",
          kind: data.kind,
          durationMins,
          initiatorId: data.fromId,
          participantIds: data.targetIds || [],
        },
      });
    }

    knownRef.current = new Set();
    setRemoteStreams({});
    callRef.current = null;
    setCall(null);
    setStatus("idle");
  }, [meId]);

  useEffect(() => { hangupRef.current = hangup; }, [hangup]);

  // Outgoing call.
  const start = useCallback(async ({ conversationId, kind = "audio", title, targetIds = [], type = "dm" }) => {
    if (statusRef.current !== "idle") return;
    const ids = (targetIds || []).filter((id) => id && id !== meId);
    if (!conversationId || !ids.length) {
      toast.error("No one to call.");
      return;
    }
    try {
      await ensureLocalStream(kind);
    } catch {
      toast.error("Couldn't access your microphone or camera.");
      return;
    }
    const data = {
      callId: crypto.randomUUID(), conversationId, kind, title, targetIds: ids, type,
      fromId: meId, startedAt: Date.now(),
    };
    callRef.current = data;
    setCall(data);
    setStatus("calling");
    attachSignaling(conversationId);
    ring(ids, "invite", {
      callId: data.callId, conversationId, from: meId, fromName: ME.name || "Someone",
      kind, type, title,
    });
  }, [meId, ensureLocalStream, attachSignaling]);

  // Accept the current incoming invite.
  const accept = useCallback(async () => {
    const inv = incoming;
    if (!inv) return;
    try {
      await ensureLocalStream(inv.kind);
    } catch {
      toast.error("Couldn't access your microphone or camera.");
      ring([inv.from], "decline", { callId: inv.callId, from: meId });
      setIncoming(null);
      return;
    }
    const data = {
      callId: inv.callId, conversationId: inv.conversationId, kind: inv.kind,
      title: inv.type === "channel" ? inv.title : inv.fromName,
      targetIds: [inv.from], type: inv.type || "dm", fromId: inv.from, startedAt: Date.now(),
    };
    callRef.current = data;
    setCall(data);
    setIncoming(null);
    setStatus("connecting");
    attachSignaling(inv.conversationId);
    ring([inv.from], "accept", { callId: inv.callId, from: meId });
  }, [incoming, meId, ensureLocalStream, attachSignaling]);

  const decline = useCallback(() => {
    if (!incoming) return;
    ring([incoming.from], "decline", { callId: incoming.callId, from: meId });
    setIncoming(null);
  }, [incoming, meId]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  const toggleCam = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }, []);

  // Personal ring subscription — alive for the whole session. Uses refs so it
  // never needs to re-subscribe.
  useEffect(() => {
    if (!meId) return undefined;
    const unsub = subscribeRing(meId, {
      onInvite: (p) => {
        if (!p?.callId) return;
        if (statusRef.current !== "idle") {
          ring([p.from], "busy", { callId: p.callId });
          return;
        }
        setIncoming(p);
      },
      onCancel: (p) => setIncoming((cur) => (cur && cur.callId === p?.callId ? null : cur)),
      onDecline: (p) => {
        if (callRef.current?.callId === p?.callId) {
          toast("Call declined");
          hangupRef.current();
        }
      },
      onAccept: () => setStatus((s) => (s === "calling" ? "connecting" : s)),
      onBusy: () => {
        if (statusRef.current === "calling") {
          toast("They're on another call");
          hangupRef.current();
        }
      },
    });
    return unsub;
  }, [meId]);

  // Clean up media/peers if the component unmounts mid-call.
  useEffect(() => () => hangupRef.current(), []);

  return {
    status, call, incoming, remoteStreams, localStream,
    micOn, camOn,
    start, accept, decline, hangup, toggleMic, toggleCam,
  };
}
