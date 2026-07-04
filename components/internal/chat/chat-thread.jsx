"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, Globe, Loader2 } from "lucide-react";
import { ThreadHeader } from "./thread-header";
import { MessageGroup } from "./message-group";
import { CallEventCard } from "./call-event-card";
import { MessageInfoDialog } from "./message-info-dialog";
import { TypingIndicator } from "./typing-indicator";
import { Composer } from "./composer";
import { ThreadPanel } from "./thread-panel";
import { FilesPanel } from "./files-panel";
import { ME, getPerson, isExternalPerson } from "@/lib/chat/people-store";
import { useOrg } from "@/lib/chat/org-context";
import { cn } from "@/lib/utils";

// Group consecutive messages from the same author so the avatar + name only
// render once per run, the way most chat clients display threads.
function groupMessages(messages) {
  const groups = [];
  for (const msg of messages) {
    // Call-event cards stand alone — never folded into an author's bubble run.
    if (msg.call) {
      groups.push({ call: msg });
      continue;
    }
    const last = groups[groups.length - 1];
    if (last && !last.call && last.authorId === msg.authorId) {
      last.items.push(msg);
    } else {
      groups.push({ authorId: msg.authorId, items: [msg] });
    }
  }
  return groups;
}

// Conversation surface used by the Messages and Channels screens, and (in
// autoReply mode) by the landing playground. When autoReply is absent the thread
// is CONTROLLED: it renders conversation.messages and reports sends through
// onSendMessage so the screen owns persistence + realtime. In autoReply mode it
// keeps its own local message list so the demo feels live without a backend.
export function ChatThread({
  conversation, onStartCall, autoReply, onSendMessage, onReact, onInvite, people = [], onBack, onClose,
  onLoadOlder, hasMore = false, loadingOlder = false,
  threads = [], onCreateThread, onRenameThread, onDeleteThread, onRefreshThreads,
  files = [], filesLoading = false, onLoadFiles,
}) {
  const controlled = !autoReply;
  const [localMessages, setLocalMessages] = useState(conversation.messages || []);
  const [typing, setTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, authorId, text }
  const [infoMsg, setInfoMsg] = useState(null);
  const [panel, setPanel] = useState(null); // null | "threads" | "files"
  const [openThreadId, setOpenThreadId] = useState(null);
  const scrollRef = useRef(null);
  const topRef = useRef(null);
  const timers = useRef([]);
  const pendingOlder = useRef(null); // { prevHeight } while older messages prepend

  // ChatThread is remounted per conversation (keyed on conversation.id by the
  // parent), so local state initializes fresh — no reset effect needed.
  const messages = useMemo(
    () => (controlled ? conversation.messages || [] : localMessages),
    [controlled, conversation.messages, localMessages],
  );

  // Stick to the bottom for new messages; restore scroll position when older
  // messages are prepended (infinite scroll) so the viewport doesn't jump.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (pendingOlder.current) {
      el.scrollTop = el.scrollHeight - pendingOlder.current.prevHeight;
      pendingOlder.current = null;
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Auto-load older history when the top sentinel scrolls into view.
  const requestOlder = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !controlled || !hasMore || loadingOlder || !onLoadOlder) return;
    pendingOlder.current = { prevHeight: el.scrollHeight };
    onLoadOlder(conversation.id);
  }, [controlled, hasMore, loadingOlder, onLoadOlder, conversation.id]);

  useEffect(() => {
    const node = topRef.current;
    if (!node || !controlled || !hasMore) return undefined;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) requestOlder(); },
      { root: scrollRef.current, rootMargin: "140px 0px 0px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [controlled, hasMore, requestOlder]);

  const groups = useMemo(() => groupMessages(messages), [messages]);

  // rootMessageId -> thread, so a message with a thread shows a "N replies" pill.
  const threadsByRoot = useMemo(() => {
    const map = {};
    for (const t of threads) if (t.rootMessageId) map[t.rootMessageId] = t;
    return map;
  }, [threads]);

  // Read receipt for the last message in a DM, but only when it's mine: "Seen"
  // once the other person's read marker has passed it, otherwise "Sent".
  const receipt = useMemo(() => {
    if (!controlled || conversation.type !== "dm") return null;
    const last = messages[messages.length - 1];
    if (!last || last.authorId !== ME.id) return null;
    const otherRead = conversation.reads?.[conversation.participantId];
    const seen =
      !!otherRead && !!last.createdAt &&
      new Date(otherRead).getTime() >= new Date(last.createdAt).getTime();
    return { seen };
  }, [controlled, conversation.type, conversation.reads, conversation.participantId, messages]);

  // Per-message actions wired down to MessageGroup/MessageActions.
  const handleReply = (msg) =>
    setReplyTo({ id: msg.id, authorId: msg.authorId, text: msg.text });
  const handleReact = (msg, emoji) => onReact?.(msg, emoji);
  const handleInfo = (msg) => setInfoMsg(msg);

  // Start a thread rooted on a message, then open it in the right panel.
  const handleStartThread = useCallback(async (msg) => {
    if (!onCreateThread) return;
    const thread = await onCreateThread(msg);
    if (thread) {
      setPanel("threads");
      setOpenThreadId(thread.id);
    }
  }, [onCreateThread]);

  const openThread = useCallback((thread) => {
    setPanel("threads");
    setOpenThreadId(thread?.id ?? null);
  }, []);

  const toggleThreads = useCallback(() => {
    setPanel((p) => (p === "threads" ? null : "threads"));
    setOpenThreadId(null);
  }, []);

  const toggleFiles = useCallback(() => {
    setPanel((p) => {
      if (p === "files") return null;
      onLoadFiles?.(conversation.id);
      return "files";
    });
  }, [onLoadFiles, conversation.id]);

  const handleSend = (text, attachments = []) => {
    if (controlled) {
      onSendMessage?.(text, replyTo, attachments);
      setReplyTo(null);
      return;
    }
    // Legacy autoReply path (landing playground).
    const id = `m-${localMessages.length}-${text.length}-${text.charCodeAt(0)}`;
    setLocalMessages((prev) => [...prev, { id, authorId: ME.id, minsAgo: 0, text }]);
    const replier = getPerson(
      conversation.type === "channel"
        ? (conversation.memberIds || []).find((mid) => mid !== ME.id)
        : conversation.participantId,
    );
    const t1 = setTimeout(() => setTyping(true), 500);
    const t2 = setTimeout(() => {
      setTyping(false);
      const reply = autoReply(text, conversation);
      if (reply) {
        setLocalMessages((prev) => [
          ...prev,
          { id: `r-${prev.length}-${reply.length}`, authorId: replier.id, minsAgo: 0, text: reply },
        ]);
      }
    }, 1700);
    timers.current.push(t1, t2);
  };

  const replier =
    conversation.type === "channel"
      ? getPerson((conversation.memberIds || []).find((mid) => mid !== ME.id))
      : getPerson(conversation.participantId);

  const { currentOrg } = useOrg();
  const externalPerson =
    conversation.type === "dm" && isExternalPerson(getPerson(conversation.participantId))
      ? getPerson(conversation.participantId)
      : null;

  const panelOpen = controlled && panel !== null;

  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className={cn("flex h-full min-w-0 flex-1 flex-col", panelOpen && "hidden md:flex")}>
        <ThreadHeader
          conversation={conversation}
          onStartCall={onStartCall}
          onBack={onBack}
          onClose={onClose}
          people={people}
          onInvite={onInvite}
          onToggleThreads={controlled ? toggleThreads : undefined}
          onToggleFiles={controlled ? toggleFiles : undefined}
          activePanel={panel}
          threadCount={threads.length}
          fileCount={files.length}
        />
        {externalPerson ? (
          <div className="flex items-center gap-2 border-b border-amber-500/15 bg-amber-500/[0.06] px-4 py-2 text-xs text-amber-500/90 md:px-6">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0">
              <span className="font-medium">{externalPerson.firstName}</span> is outside{" "}
              {currentOrg?.name || "your organization"} — this is an external conversation.
            </span>
          </div>
        ) : null}
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto py-5 scrollbar-subtle">
          {controlled && hasMore ? <div ref={topRef} /> : null}
          {loadingOlder ? (
            <div className="flex justify-center py-1">
              <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
            </div>
          ) : null}
          {groups.map((group, i) =>
            group.call ? (
              <CallEventCard
                key={group.call.id || `call-${i}`}
                message={group.call}
                onCallBack={(kind) => onStartCall?.(kind)}
              />
            ) : (
              <MessageGroup
                key={`${group.authorId}-${i}`}
                group={group}
                onReact={controlled ? handleReact : undefined}
                onReply={controlled ? handleReply : undefined}
                onInfo={controlled ? handleInfo : undefined}
                onStartThread={controlled ? handleStartThread : undefined}
                threadsByRoot={controlled ? threadsByRoot : undefined}
                onOpenThread={controlled ? openThread : undefined}
              />
            ),
          )}
          {receipt && !typing ? (
            <div className="flex items-center justify-end gap-1 px-3 text-[11px] text-text-secondary md:px-6">
              {receipt.seen ? (
                <>
                  <CheckCheck className="h-3.5 w-3.5 text-primary" />
                  Seen
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Sent
                </>
              )}
            </div>
          ) : null}
          {typing ? <TypingIndicator person={replier} /> : null}
        </div>
        <Composer
          allowAttachments={controlled}
          placeholder={
            conversation.type === "channel"
              ? `Message #${conversation.name}`
              : `Message ${replier.firstName}`
          }
          onSend={handleSend}
          onCommand={(id) => {
            if (id === "call") onStartCall?.("audio");
            else if (id === "video") onStartCall?.("video");
          }}
          replyingTo={
            replyTo
              ? {
                  name: replyTo.authorId === ME.id ? "yourself" : getPerson(replyTo.authorId).firstName,
                  text: replyTo.text,
                }
              : null
          }
          onCancelReply={() => setReplyTo(null)}
        />

        <MessageInfoDialog
          message={infoMsg}
          conversation={conversation}
          open={!!infoMsg}
          onOpenChange={(v) => !v && setInfoMsg(null)}
        />
      </div>

      {panelOpen && panel === "threads" ? (
        <ThreadPanel
          conversation={conversation}
          threads={threads}
          openThreadId={openThreadId}
          onOpenThread={(t) => setOpenThreadId(t?.id ?? null)}
          onRename={onRenameThread}
          onDelete={onDeleteThread}
          onRefresh={onRefreshThreads}
          onClose={() => { setPanel(null); setOpenThreadId(null); }}
        />
      ) : null}

      {panelOpen && panel === "files" ? (
        <FilesPanel
          files={files}
          loading={filesLoading}
          onClose={() => setPanel(null)}
        />
      ) : null}
    </div>
  );
}
