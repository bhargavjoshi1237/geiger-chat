"use client";

import React, { useMemo, useRef, useState } from "react";
import { Plus, Smile, Paperclip, AtSign, SendHorizonal, Reply, X, Phone, Video, FileText, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { fileKind, formatSize } from "@/lib/supabase/chat_storage";
import { cn } from "@/lib/utils";

// Attachments over this size are rejected client-side (matches the design's cap).
const MAX_FILE_BYTES = 25 * 1024 * 1024;

// Slash commands surfaced when the input starts with "/". `action` commands fire
// onCommand(id) (e.g. start a call); `insert` commands drop text into the box.
const SLASH_COMMANDS = [
  { id: "call", label: "/call", hint: "Start an audio call", icon: Phone, type: "action" },
  { id: "video", label: "/video", hint: "Start a video call", icon: Video, type: "action" },
  { id: "shrug", label: "/shrug", hint: "Append ¯\\_(ツ)_/¯", icon: Smile, type: "insert", insert: "¯\\_(ツ)_/¯" },
  { id: "tableflip", label: "/tableflip", hint: "Append (╯°□°）╯︵ ┻━┻", icon: Smile, type: "insert", insert: "(╯°□°）╯︵ ┻━┻" },
];

// Message input row. Auto-grows up to a few lines and submits on Enter
// (Shift+Enter inserts a newline). Typing "/" opens a command menu. When
// `replyingTo` is set, a preview bar sits above the input until sent/cancelled.
export function Composer({ placeholder = "Write a message…", onSend, onCommand, disabled, replyingTo, onCancelReply, allowAttachments = false }) {
  const [value, setValue] = useState("");
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [files, setFiles] = useState([]); // pending File[] to send with the message
  const ref = useRef(null);
  const fileRef = useRef(null);

  // The slash menu shows while the text is just "/word" (no space yet).
  const matches = useMemo(() => {
    if (dismissed || !/^\/\w*$/.test(value)) return [];
    const q = value.slice(1).toLowerCase();
    return SLASH_COMMANDS.filter((c) => c.id.startsWith(q));
  }, [value, dismissed]);
  const menuOpen = matches.length > 0;

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const pickFiles = () => fileRef.current?.click();

  const onFilesPicked = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-selecting the same file later
    const accepted = [];
    for (const f of picked) {
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} is over 25 MB.`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed && files.length === 0) return;
    onSend?.(trimmed, files);
    setValue("");
    setFiles([]);
    if (ref.current) ref.current.style.height = "auto";
  };

  const runCommand = (cmd) => {
    if (!cmd) return;
    if (cmd.type === "action") {
      onCommand?.(cmd.id);
      setValue("");
      if (ref.current) ref.current.style.height = "auto";
    } else {
      setValue(cmd.insert);
      requestAnimationFrame(() => {
        ref.current?.focus();
        resize();
      });
    }
    setDismissed(true);
  };

  const onKeyDown = (e) => {
    if (menuOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        runCommand(matches[Math.min(active, matches.length - 1)]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissed(true);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onInput = (e) => {
    setValue(e.target.value);
    setDismissed(false);
    setActive(0);
    resize();
  };

  return (
    <div className="relative px-3 pb-4 pt-1 md:px-6">
      {menuOpen ? (
        <div className="absolute bottom-full left-3 right-3 z-20 mb-2 overflow-hidden rounded-xl border border-border bg-surface-dialog p-1 shadow-2xl shadow-black/40 md:left-6 md:right-6">
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Commands</p>
          {matches.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => runCommand(cmd)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                  i === active ? "bg-surface-hover" : "hover:bg-surface-hover",
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-card text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{cmd.label}</span>
                  <span className="block truncate text-xs text-text-secondary">{cmd.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {replyingTo ? (
        <div className="mx-1 mb-1.5 flex items-center gap-2 rounded-lg border-l-2 border-primary/60 border-y border-r border-y-border border-r-border bg-surface-card px-2.5 py-1.5">
          <Reply className="h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">
              Replying to {replyingTo.name}
            </p>
            <p className="truncate text-xs text-text-secondary">{replyingTo.text}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {allowAttachments && files.length ? (
        <div className="mx-1 mb-1.5 flex flex-wrap gap-2">
          {files.map((f, i) => {
            const isImage = fileKind(f.name) === "image";
            const Icon = isImage ? ImageIcon : FileText;
            return (
              <div
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-card py-1.5 pl-2 pr-1.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-hover text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 max-w-[160px]">
                  <span className="block truncate text-xs font-medium text-foreground">{f.name}</span>
                  <span className="block text-[11px] text-text-secondary">{formatSize(f.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${f.name}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface-subtle px-2.5 py-2 transition-colors focus-within:border-border-strong">
        {allowAttachments ? (
          <input
            ref={fileRef}
            type="file"
            multiple
            onChange={onFilesPicked}
            className="hidden"
          />
        ) : null}
        <button
          type="button"
          onClick={allowAttachments ? pickFiles : undefined}
          className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          title="Add attachment"
        >
          <Plus className="h-[18px] w-[18px]" />
        </button>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={onInput}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 text-foreground placeholder:text-text-secondary focus:outline-none scrollbar-subtle"
        />
        <div className="mb-0.5 flex items-center gap-0.5">
          <button type="button" className="hidden h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground sm:flex" title="Mention">
            <AtSign className="h-[17px] w-[17px]" />
          </button>
          <button
            type="button"
            onClick={allowAttachments ? pickFiles : undefined}
            className="hidden h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground sm:flex"
            title="Attach file"
          >
            <Paperclip className="h-[17px] w-[17px]" />
          </button>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Emoji">
            <Smile className="h-[17px] w-[17px]" />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() && files.length === 0}
            className={cn(
              "ml-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              value.trim() || files.length
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-surface-hover text-text-secondary",
            )}
            title="Send"
          >
            <SendHorizonal className="h-[17px] w-[17px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
