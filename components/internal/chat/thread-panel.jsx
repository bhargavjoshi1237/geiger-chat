"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  X, ChevronLeft, MessagesSquare, MoreHorizontal, Pencil, Trash2, Loader2, Check,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageGroup } from "./message-group";
import { Composer } from "./composer";
import { fromNow } from "./chat-utils";
import {
  listMessages, sendMessage, subscribeMessages, normalizeMessage, setMessageReactions,
} from "@/lib/supabase/chat_messages";
import { buildOptimisticAttachments, uploadAttachments, revokeOptimistic } from "@/lib/chat/attachments";
import { ME, getPerson } from "@/lib/chat/people-store";

const PAGE = 25;

// Same consecutive-author grouping as the main thread.
function groupMessages(messages) {
  const groups = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.authorId === msg.authorId) last.items.push(msg);
    else groups.push({ authorId: msg.authorId, items: [msg] });
  }
  return groups;
}

// The messages of one open thread, with its own composer. Fetches a page on
// mount (keyed by thread id), auto-loads older on scroll-to-top, and subscribes
// to realtime inserts/updates for this thread only.
function ThreadView({ conversation, thread, onActivity }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const scrollRef = useRef(null);
  const topRef = useRef(null);
  const messagesRef = useRef([]);
  const pendingScroll = useRef(null); // { prevHeight } while prepending older
  const stick = useRef(true); // keep pinned to bottom on new messages

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Initial page. ThreadView is keyed on thread.id (remounted per thread), so
  // `loading` starts true and this runs once per mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await listMessages(conversation.id, { threadId: thread.id, limit: PAGE });
      if (cancelled) return;
      setMessages(rows ?? []);
      setHasMore((rows?.length ?? 0) === PAGE);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [conversation.id, thread.id]);

  // Realtime for this thread.
  useEffect(() => {
    const unsub = subscribeMessages((row, eventType) => {
      if (row?.thread_id !== thread.id) return;
      const msg = normalizeMessage(row);
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === row.id);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = msg;
          return next;
        }
        if (eventType === "UPDATE") return prev;
        return [...prev, msg];
      });
    });
    return unsub;
  }, [thread.id]);

  // Stick to bottom for new messages; restore position when prepending older.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (pendingScroll.current) {
      el.scrollTop = el.scrollHeight - pendingScroll.current.prevHeight;
      pendingScroll.current = null;
      return;
    }
    if (stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const loadOlder = useCallback(async () => {
    const el = scrollRef.current;
    const current = messagesRef.current;
    if (!el || loadingOlder || !hasMore || current.length === 0) return;
    setLoadingOlder(true);
    pendingScroll.current = { prevHeight: el.scrollHeight };
    const older = await listMessages(conversation.id, {
      threadId: thread.id, before: current[0].createdAt, limit: PAGE,
    });
    stick.current = false;
    setMessages((prev) => [...(older ?? []), ...prev]);
    setHasMore((older?.length ?? 0) === PAGE);
    setLoadingOlder(false);
  }, [conversation.id, thread.id, hasMore, loadingOlder]);

  // Auto-load when the top sentinel scrolls into view.
  useEffect(() => {
    const node = topRef.current;
    if (!node || !hasMore) return undefined;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadOlder(); },
      { root: scrollRef.current, rootMargin: "120px 0px 0px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, loadOlder]);

  const handleSend = useCallback(async (text, files = []) => {
    const clean = (text || "").trim();
    if ((!clean && files.length === 0) || !ME.id) return;
    stick.current = true;
    const msgId = crypto.randomUUID();
    const optAtts = buildOptimisticAttachments(files);
    const optimistic = {
      id: msgId, authorId: ME.id, minsAgo: 0, text: clean,
      createdAt: new Date().toISOString(), reactions: {}, replyTo: replyTo || null,
      attachments: optAtts,
    };
    setMessages((prev) => [...prev, optimistic]);
    setReplyTo(null);
    const atts = files.length
      ? await uploadAttachments(files, { conversationId: conversation.id, messageId: msgId, ownerId: ME.id, optimistic: optAtts })
      : [];
    if (files.length && atts.length < files.length) toast.error("Some files couldn't be uploaded.");
    const saved = await sendMessage({
      id: msgId, conversationId: conversation.id, authorId: ME.id,
      text: clean, replyTo, threadId: thread.id, attachments: atts,
    });
    if (!saved) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast.error("Couldn't send the message.");
    } else {
      setMessages((prev) => prev.map((m) => (m.id === msgId ? saved : m)));
      onActivity?.();
    }
    setTimeout(() => revokeOptimistic(optAtts), 10000);
  }, [conversation.id, thread.id, replyTo, onActivity]);

  const handleReact = useCallback(async (msg, emoji) => {
    if (!ME.id || !msg?.id || !emoji) return;
    const reactions = { ...(msg.reactions || {}) };
    const users = new Set(reactions[emoji] || []);
    if (users.has(ME.id)) users.delete(ME.id);
    else users.add(ME.id);
    if (users.size) reactions[emoji] = [...users];
    else delete reactions[emoji];
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, reactions } : m)));
    const ok = await setMessageReactions(msg.id, reactions);
    if (!ok) toast.error("Couldn't update reaction.");
  }, []);

  const groups = useMemo(() => groupMessages(messages), [messages]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4 scrollbar-subtle">
        <div ref={topRef} />
        {loadingOlder ? (
          <div className="flex justify-center py-1">
            <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
          </div>
        ) : null}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <MessagesSquare className="h-6 w-6 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-sm text-text-secondary">No replies yet. Start the thread.</p>
          </div>
        ) : (
          groups.map((group, i) => (
            <MessageGroup
              key={`${group.authorId}-${i}`}
              group={group}
              onReact={handleReact}
              onReply={(m) => setReplyTo({ id: m.id, authorId: m.authorId, text: m.text })}
            />
          ))
        )}
      </div>
      <Composer
        allowAttachments
        placeholder="Reply in thread…"
        onSend={handleSend}
        replyingTo={
          replyTo
            ? { name: replyTo.authorId === ME.id ? "yourself" : getPerson(replyTo.authorId).firstName, text: replyTo.text }
            : null
        }
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}

// Inline-editable thread row in the list.
function ThreadRow({ thread, onOpen, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(thread.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = async () => {
    const clean = value.trim();
    setEditing(false);
    if (!clean || clean === thread.title) { setValue(thread.title); return; }
    const ok = await onRename(thread.id, clean);
    if (!ok) { setValue(thread.title); toast.error("Couldn't rename the thread."); }
  };

  return (
    <div className="group flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-surface-card">
      {editing ? (
        <div className="flex flex-1 items-center gap-1.5">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setEditing(false); setValue(thread.title); }
            }}
            className="h-8 flex-1 rounded-lg border border-border-strong bg-surface-card px-2 text-sm text-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={commit}
            aria-label="Save"
            className="flex h-7 w-7 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-hover"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onOpen(thread)}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-card text-muted-foreground">
              <MessagesSquare className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{thread.title}</span>
              <span className="block truncate text-xs text-text-secondary">
                {thread.replyCount || 0} {(thread.replyCount || 0) === 1 ? "reply" : "replies"} · {fromNow(thread.lastActivity)}
              </span>
            </span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Thread options"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-secondary opacity-0 transition-opacity hover:bg-surface-hover hover:text-foreground group-hover:opacity-100 focus:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border bg-surface-dialog">
              <DropdownMenuItem onSelect={() => setEditing(true)} className="cursor-pointer focus:bg-surface-hover">
                <Pencil className="mr-2 h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onDelete(thread)}
                className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

// Right sidebar: the conversation's threads (list) or one open thread. Controlled
// by the parent (openThreadId / onOpenThread); data ops delegate to the screen so
// the reply-count indicators stay in sync.
export function ThreadPanel({
  conversation, threads = [], openThreadId, onOpenThread,
  onRename, onDelete, onRefresh, onClose,
}) {
  const openThread = openThreadId ? threads.find((t) => t.id === openThreadId) : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background md:w-[360px] md:border-l md:border-border">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-2">
          {openThread ? (
            <button
              type="button"
              onClick={() => onOpenThread(null)}
              aria-label="Back to threads"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <MessagesSquare className="ml-1 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
          )}
          <h3 className="truncate text-sm font-semibold text-foreground">
            {openThread ? openThread.title : "Threads"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </header>

      {openThread ? (
        <ThreadView
          key={openThread.id}
          conversation={conversation}
          thread={openThread}
          onActivity={onRefresh}
        />
      ) : (
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2 scrollbar-subtle">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-card text-muted-foreground">
                <MessagesSquare className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <p className="text-sm text-text-secondary">
                No threads yet. Hover a message and choose <span className="text-foreground">Start thread</span>.
              </p>
            </div>
          ) : (
            threads.map((t) => (
              <ThreadRow
                key={t.id}
                thread={t}
                onOpen={onOpenThread}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
