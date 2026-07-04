"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TwoPaneChat } from "./two-pane-chat";
import { CallStage } from "./call-stage";
import { IncomingCallDialog } from "./incoming-call-dialog";
import { useCall } from "@/lib/chat/use-call";
import { ensureIdentity } from "@/lib/chat/identity";
import { setMe, hydratePeople, getPerson, ME, setCurrentOrgId, isExternalPerson } from "@/lib/chat/people-store";
import { useOrg } from "@/lib/chat/org-context";
import { ExternalContactDialog } from "./external-contact-dialog";
import {
  listProfiles, findProfile, setPresence, subscribeProfiles, normalizeProfile,
} from "@/lib/supabase/chat_profiles";
import {
  listConversations, createChannel, createOrGetDm, inviteMembers,
  setPinned, markRead, leaveConversation, ensurePublicChannelMembership,
  ensureOrgGeneralChannel, subscribeMembership, subscribeMemberReads,
} from "@/lib/supabase/chat_conversations";
import {
  listMessages, sendMessage, subscribeMessages, normalizeMessage, setMessageReactions,
} from "@/lib/supabase/chat_messages";

// Data-owning container shared by the Messages (dm) and Channels (channel)
// screens. Fetches on mount, subscribes to realtime, and threads optimistic
// handlers down to the controlled TwoPaneChat. All data is scoped to the
// current organization from useOrg() so /home is a per-org chat circle.
// Outer wrapper: reads the current org and remounts the inner container per org
// (via key). Switching workspaces fully resets chat state — no imperative reset,
// no leak of the previous org's conversations/messages — and gives the inner
// container a stable `orgId` prop.
export function ChatScreen({ title, variant }) {
  const { currentOrgId, loading: orgLoading } = useOrg();
  return (
    <ChatScreenInner
      key={currentOrgId || "no-org"}
      title={title}
      variant={variant}
      orgId={currentOrgId}
      orgLoading={orgLoading}
    />
  );
}

function ChatScreenInner({ title, variant, orgId, orgLoading }) {
  const kind = variant; // 'dm' | 'channel'
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [ready, setReady] = useState(false);
  const [externalPending, setExternalPending] = useState(null); // person awaiting confirm
  const callApi = useCall();

  // Refs so realtime callbacks read current values without re-subscribing.
  const activeIdRef = useRef(null);
  const loadedConvs = useRef(new Set()); // conv ids with full messages loaded
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Initial load: identity -> directory -> #general bootstrap -> rows. Scoped to
  // this mount's org (fixed by the remount key on the wrapper).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // No org yet: keep the spinner while the org list resolves; if it resolved
      // to nothing (user is in no workspace), drop it and show the empty state.
      if (!orgId) {
        if (!orgLoading && !cancelled) setLoading(false);
        return;
      }
      // Tell the people-store which org we're in so external contacts can be
      // flagged consistently across the thread header, list and dialogs.
      setCurrentOrgId(orgId);
      const me = await ensureIdentity(orgId);
      if (cancelled) return;
      if (me) setMe(me);
      const profiles = await listProfiles(orgId);
      if (cancelled) return;
      if (profiles) {
        hydratePeople(profiles);
        if (!cancelled) setPeople(profiles.filter((p) => p.id !== ME.id));
      }
      if (ME.id) {
        // Guarantee the org has a #general and I'm in it, then join any other
        // public channels — so a brand-new org circle isn't empty.
        await ensureOrgGeneralChannel(ME.id, orgId);
        await ensurePublicChannelMembership(ME.id, orgId);
      }
      const convs = ME.id ? await listConversations(ME.id, kind, orgId) : null;
      if (!cancelled) {
        setItems(convs ?? []);
        setLoading(false);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, orgId, orgLoading]);

  // Re-fetch conversations, preserving already-loaded full message lists.
  const refresh = useCallback(async () => {
    if (!ME.id || !orgId) return;
    const convs = await listConversations(ME.id, kind, orgId);
    if (!convs) return;
    setItems((prev) => {
      const byId = Object.fromEntries(prev.map((c) => [c.id, c]));
      return convs.map((c) => {
        const old = byId[c.id];
        if (old && loadedConvs.current.has(c.id)) {
          return { ...c, messages: old.messages || c.messages, unread: c.id === activeIdRef.current ? 0 : c.unread };
        }
        return c;
      });
    });
  }, [kind, orgId]);

  // Realtime: a message inserted or updated (reaction / edit) somewhere.
  const onIncoming = useCallback((row, eventType) => {
    if (!row?.id) return;
    const convId = row.conversation_id;
    setItems((prev) => {
      const idx = prev.findIndex((c) => c.id === convId);
      if (idx === -1) return prev; // not one of my conversations (membership sub refetches)
      const conv = prev[idx];
      const msgs = conv.messages || [];
      const mIdx = msgs.findIndex((m) => m.id === row.id);
      const msg = normalizeMessage(row);
      // Existing message changed (reaction/edit) or optimistic echo — replace in
      // place, no reorder, no unread bump.
      if (mIdx >= 0) {
        const nextMsgs = msgs.slice();
        nextMsgs[mIdx] = msg;
        return prev.map((c, i) => (i === idx ? { ...conv, messages: nextMsgs } : c));
      }
      // An update to a message we don't have loaded — ignore.
      if (eventType === "UPDATE") return prev;
      // A brand-new message: append (or seed the preview) + bump unread + reorder.
      const isActive = convId === activeIdRef.current;
      const showsFull = isActive || loadedConvs.current.has(convId);
      const updated = {
        ...conv,
        messages: showsFull ? [...msgs, msg] : [msg],
        lastActivity: 0,
        unread: isActive ? 0 : (conv.unread || 0) + (row.author_id !== ME.id ? 1 : 0),
      };
      const next = prev.filter((_, i) => i !== idx);
      return [updated, ...next];
    });
    if (eventType !== "UPDATE" && convId === activeIdRef.current && ME.id) markRead(convId, ME.id);
  }, []);

  // A profile changed somewhere (presence / display). Re-hydrate the directory
  // so getPerson() reads fresh values, and bump `people` to re-render the tree.
  const onProfile = useCallback((row) => {
    const p = normalizeProfile(row);
    if (!p?.id) return;
    hydratePeople([p]);
    if (p.id === ME.id) return; // I manage my own presence locally.
    setPeople((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx === -1) return [...prev, p];
      const next = prev.slice();
      next[idx] = p;
      return next;
    });
  }, []);

  // Another member moved their read marker — record it so my last message can
  // flip to "Seen" in the conversation it belongs to.
  const onRead = useCallback((row) => {
    const cid = row?.conversation_id;
    const pid = row?.profile_id;
    if (!cid || !pid || pid === ME.id) return;
    setItems((prev) =>
      prev.map((c) =>
        c.id === cid ? { ...c, reads: { ...(c.reads || {}), [pid]: row.last_read_at } } : c,
      ),
    );
  }, []);

  useEffect(() => {
    if (!ready || !ME.id) return undefined;
    const unsubMsg = subscribeMessages(onIncoming);
    const unsubMem = subscribeMembership(ME.id, () => refresh());
    const unsubProfiles = subscribeProfiles(onProfile, orgId);
    const unsubReads = subscribeMemberReads(onRead);
    return () => {
      unsubMsg();
      unsubMem();
      unsubProfiles();
      unsubReads();
    };
  }, [ready, orgId, onIncoming, refresh, onProfile, onRead]);

  // Presence lifecycle: mark myself online while the chat is mounted and the tab
  // is visible, away when hidden, and offline on leave. A heartbeat keeps
  // last_seen_at fresh so staleness can be inferred if a tab dies abruptly.
  useEffect(() => {
    if (!ready || !ME.id) return undefined;
    const sync = () => setPresence(ME.id, document.hidden ? "away" : "online");
    sync();
    const beat = setInterval(sync, 45000);
    const onLeave = () => setPresence(ME.id, "offline");
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      clearInterval(beat);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("beforeunload", onLeave);
      setPresence(ME.id, "offline");
    };
  }, [ready]);

  const handleSelect = useCallback(async (id) => {
    setActiveId(id);
    if (!loadedConvs.current.has(id)) {
      const msgs = await listMessages(id);
      loadedConvs.current.add(id);
      if (msgs) setItems((prev) => prev.map((c) => (c.id === id ? { ...c, messages: msgs, unread: 0 } : c)));
    } else {
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    }
    if (ME.id) markRead(id, ME.id);
  }, []);

  const handleSend = useCallback(async (text, replyTo) => {
    const id = activeIdRef.current;
    const clean = (text || "").trim();
    if (!id || !clean || !ME.id) return;
    const msgId = crypto.randomUUID();
    const optimistic = {
      id: msgId, authorId: ME.id, minsAgo: 0, text: clean,
      createdAt: new Date().toISOString(), reactions: {}, replyTo: replyTo || null,
    };
    setItems((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const conv = { ...prev[idx], messages: [...(prev[idx].messages || []), optimistic], lastActivity: 0 };
      return [conv, ...prev.filter((_, i) => i !== idx)];
    });
    const saved = await sendMessage({ id: msgId, conversationId: id, authorId: ME.id, text: clean, replyTo });
    if (!saved) {
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, messages: (c.messages || []).filter((m) => m.id !== msgId) } : c)));
      toast.error("Couldn't send the message.");
    }
  }, []);

  // Toggle my reaction on a message (optimistic + persisted via merge RPC).
  // `msg` carries the current reactions snapshot from render.
  const handleReact = useCallback(async (msg, emoji) => {
    const id = activeIdRef.current;
    if (!id || !ME.id || !msg?.id || !emoji) return;
    const reactions = { ...(msg.reactions || {}) };
    const users = new Set(reactions[emoji] || []);
    if (users.has(ME.id)) users.delete(ME.id);
    else users.add(ME.id);
    if (users.size) reactions[emoji] = [...users];
    else delete reactions[emoji];
    setItems((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, messages: (c.messages || []).map((m) => (m.id === msg.id ? { ...m, reactions } : m)) }
          : c,
      ),
    );
    const ok = await setMessageReactions(msg.id, reactions);
    if (!ok) {
      toast.error("Couldn't update reaction.");
      refresh();
    }
  }, [refresh]);

  const handleCreateChannel = useCallback(async (draft) => {
    if (!ME.id) {
      toast.error("Sign-in / database isn't configured.");
      return;
    }
    const id = crypto.randomUUID();
    const created = await createChannel({
      id,
      name: draft.name,
      topic: draft.topic,
      visibility: draft.visibility,
      createdBy: ME.id,
      memberIds: draft.memberIds,
      organizationId: orgId,
    });
    if (created) {
      loadedConvs.current.add(created.id);
      setItems((prev) => [created, ...prev]);
      setActiveId(created.id);
      toast.success(`Created #${created.name}`);
    } else {
      toast.error("Couldn't create the channel.");
    }
  }, [orgId]);

  // Actually open (or create) the DM with a resolved person and select it.
  const openDmWith = useCallback(async (person) => {
    hydratePeople([person]);
    const conv = await createOrGetDm(ME.id, person.id, orgId);
    if (!conv) {
      toast.error("Couldn't start the conversation.");
      return;
    }
    setItems((prev) => (prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]));
    setActiveId(conv.id);
    if (!loadedConvs.current.has(conv.id)) {
      const msgs = await listMessages(conv.id);
      loadedConvs.current.add(conv.id);
      if (msgs) setItems((prev) => prev.map((c) => (c.id === conv.id ? { ...c, messages: msgs } : c)));
    }
    if (ME.id) markRead(conv.id, ME.id);
  }, [orgId]);

  const handleStartDm = useCallback(async (personOrQuery) => {
    if (!ME.id) {
      toast.error("Database isn't configured.");
      return;
    }
    let person = personOrQuery;
    if (personOrQuery?.query) {
      person = await findProfile(personOrQuery.query);
      if (!person) {
        toast.error("No user found with that email or username.");
        return;
      }
    }
    if (!person?.id || person.id === ME.id) {
      if (person?.id === ME.id) toast.error("That's you.");
      return;
    }
    // Reaching someone outside the current org — confirm before opening the
    // thread so it's clear the conversation leaves the org's circle.
    if (isExternalPerson(person)) {
      setExternalPending(person);
      return;
    }
    await openDmWith(person);
  }, [openDmWith]);

  const confirmExternalDm = useCallback(async () => {
    const person = externalPending;
    setExternalPending(null);
    if (person) await openDmWith(person);
  }, [externalPending, openDmWith]);

  const handleInvite = useCallback(async (profileIds) => {
    const id = activeIdRef.current;
    if (!id || !profileIds?.length) return;
    const ok = await inviteMembers(id, profileIds);
    if (ok) {
      setItems((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, memberIds: [...new Set([...(c.memberIds || []), ...profileIds])] } : c,
        ),
      );
      toast.success(profileIds.length > 1 ? `Added ${profileIds.length} people` : "Added 1 person");
    } else {
      toast.error("Couldn't add people.");
    }
  }, []);

  const handlePin = useCallback(async (conv, pinned) => {
    setItems((prev) => prev.map((c) => (c.id === conv.id ? { ...c, pinned } : c)));
    const ok = await setPinned(conv.id, ME.id, pinned);
    if (!ok) {
      setItems((prev) => prev.map((c) => (c.id === conv.id ? { ...c, pinned: !pinned } : c)));
      toast.error("Couldn't update pin.");
    } else {
      toast.success(pinned ? "Pinned to top" : "Unpinned");
    }
  }, []);

  const handleMarkRead = useCallback(async (conv) => {
    setItems((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)));
    if (ME.id) await markRead(conv.id, ME.id);
  }, []);

  const handleLeave = useCallback(
    async (conv) => {
      setItems((prev) => prev.filter((c) => c.id !== conv.id));
      if (activeIdRef.current === conv.id) setActiveId(null);
      const ok = await leaveConversation(conv.id, ME.id);
      if (!ok) {
        toast.error("Couldn't remove the conversation.");
        refresh();
      } else {
        toast.success(conv.type === "channel" ? "Left channel" : "Conversation removed");
      }
    },
    [refresh],
  );

  // Start a real WebRTC call for a conversation (audio or video).
  const handleCall = useCallback((kind, conversation) => {
    if (!conversation) return;
    const isChannel = conversation.type === "channel";
    const targetIds = isChannel
      ? (conversation.memberIds || []).filter((id) => id !== ME.id)
      : [conversation.participantId].filter(Boolean);
    const title = isChannel ? `#${conversation.name}` : getPerson(conversation.participantId).name;
    callApi.start({ conversationId: conversation.id, kind, title, targetIds, type: conversation.type });
  }, [callApi]);

  const inCall = callApi.status !== "idle";

  return (
    <>
      <TwoPaneChat
        title={title}
        variant={variant}
        items={items}
        loading={loading}
        activeId={activeId}
        onSelect={handleSelect}
        onCloseActive={() => setActiveId(null)}
        people={people}
        onStartDm={handleStartDm}
        onCreateChannel={handleCreateChannel}
        onSendMessage={handleSend}
        onReact={handleReact}
        onInvite={handleInvite}
        onCall={handleCall}
        onPin={handlePin}
        onMarkRead={handleMarkRead}
        onLeave={handleLeave}
      />
      {inCall ? (
        <CallStage
          call={callApi.call}
          status={callApi.status}
          remoteStreams={callApi.remoteStreams}
          localStream={callApi.localStream}
          micOn={callApi.micOn}
          camOn={callApi.camOn}
          onToggleMic={callApi.toggleMic}
          onToggleCam={callApi.toggleCam}
          onHangup={callApi.hangup}
        />
      ) : null}
      {callApi.incoming ? (
        <IncomingCallDialog
          incoming={callApi.incoming}
          onAccept={callApi.accept}
          onDecline={callApi.decline}
        />
      ) : null}
      <ExternalContactDialog
        person={externalPending}
        onConfirm={confirmExternalDm}
        onCancel={() => setExternalPending(null)}
      />
    </>
  );
}
