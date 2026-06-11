"use client";

import React, { useRef, useState } from "react";
import { Plus, Smile, Paperclip, AtSign, SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";

// Message input row. Auto-grows up to a few lines and submits on Enter
// (Shift+Enter inserts a newline). Purely client-side.
export function Composer({ placeholder = "Write a message…", onSend, disabled }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onInput = (e) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="px-3 pb-4 pt-1 md:px-6">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface-subtle px-2.5 py-2 transition-colors focus-within:border-border-strong">
        <button
          type="button"
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
          <button type="button" className="hidden h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground sm:flex" title="Attach file">
            <Paperclip className="h-[17px] w-[17px]" />
          </button>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Emoji">
            <Smile className="h-[17px] w-[17px]" />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            className={cn(
              "ml-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              value.trim()
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
