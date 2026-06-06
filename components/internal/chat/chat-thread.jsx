"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ThreadHeader } from "./thread-header";
import { MessageGroup } from "./message-group";
import { TypingIndicator } from "./typing-indicator";
import { Composer } from "./composer";
import { ME, getPerson } from "@/lib/mock/chat-data";
import { TooltipProvider } from "@/components/ui/tooltip";

// Group consecutive messages from the same author so the avatar + name only
// render once per run, the way most chat clients display threads.
function groupMessages(messages) {
  const groups = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.authorId === msg.authorId) {
      last.items.push(msg);
    } else {
      groups.push({ authorId: msg.authorId, items: [msg] });
    }
  }
  return groups;
}

// Reusable conversation surface used by both Messages and Channels screens, and
// (in trimmed form) by the landing playground. Holds its own message list so
// sending feels live without any backend.
export function ChatThread({ conversation, onStartCall, autoReply, onBack, onClose }) {
  const [messages, setMessages] = useState(conversation.messages);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);
  const timers = useRef([]);

  // Reset the thread whenever the active conversation changes.
  useEffect(() => {
    setMessages(conversation.messages);
    setTyping(false);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, [conversation.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const groups = useMemo(() => groupMessages(messages), [messages]);

  const handleSend = (text) => {
    const id = `m-${messages.length}-${text.length}-${text.charCodeAt(0)}`;
    setMessages((prev) => [...prev, { id, authorId: ME.id, minsAgo: 0, text }]);

    if (!autoReply) return;
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
        setMessages((prev) => [
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

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <ThreadHeader conversation={conversation} onStartCall={onStartCall} onBack={onBack} onClose={onClose} />
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto py-5 scrollbar-subtle">
          {groups.map((group, i) => (
            <MessageGroup key={`${group.authorId}-${i}`} group={group} />
          ))}
          {typing ? <TypingIndicator person={replier} /> : null}
        </div>
        <Composer
          placeholder={
            conversation.type === "channel"
              ? `Message #${conversation.name}`
              : `Message ${replier.firstName}`
          }
          onSend={handleSend}
        />
      </div>
    </TooltipProvider>
  );
}
