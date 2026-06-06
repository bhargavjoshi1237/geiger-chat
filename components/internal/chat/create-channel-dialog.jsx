"use client";

import React, { useState } from "react";
import { Hash, Plus, Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const VISIBILITY = [
  { key: "public", label: "Public", hint: "Anyone can join", icon: Globe },
  { key: "private", label: "Private", hint: "Invite only", icon: Lock },
];

// "Create channel" dialog: name, optional topic, and visibility. Mock-only —
// submitting toasts and closes rather than persisting a channel.
export function CreateChannelDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [visibility, setVisibility] = useState("public");

  const reset = () => {
    setName("");
    setTopic("");
    setVisibility("public");
  };

  const create = () => {
    const clean = name.trim().replace(/^#/, "");
    if (!clean) return;
    setOpen(false);
    reset();
    toast.success(`Created #${clean}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Create channel"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#a3a3a3] transition-colors hover:bg-[#2a2a2a] hover:text-white"
        >
          <Plus className="h-[18px] w-[18px]" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>Channels are where your team communicates around a topic.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#a3a3a3]">Name</label>
            <div className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#202020] px-2.5 transition-colors focus-within:border-[#474747]">
              <Hash className="h-4 w-4 text-[#6b6b6b]" />
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="e.g. marketing"
                className="h-9 flex-1 bg-transparent text-sm text-[#e7e7e7] placeholder:text-[#6b6b6b] focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#a3a3a3]">Topic <span className="text-[#6b6b6b]">(optional)</span></label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What's this channel about?"
              className="h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#202020] px-2.5 text-sm text-[#e7e7e7] placeholder:text-[#6b6b6b] transition-colors focus:border-[#474747] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {VISIBILITY.map((o) => {
              const Icon = o.icon;
              const selected = visibility === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setVisibility(o.key)}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                    selected ? "border-[#474747] bg-[#242424]" : "border-[#2a2a2a] bg-[#202020] hover:border-[#3a3a3a]",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-[#e7e7e7]">
                    <Icon className="h-4 w-4 text-[#a3a3a3]" /> {o.label}
                  </span>
                  <span className="text-xs text-[#737373]">{o.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 items-center rounded-lg border border-[#2a2a2a] bg-[#202020] px-4 text-sm font-medium text-[#a3a3a3] transition-colors hover:border-[#474747] hover:text-[#e7e7e7]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={create}
            disabled={!name.trim()}
            className="inline-flex h-9 items-center rounded-lg bg-[#e7e7e7] px-4 text-sm font-semibold text-[#161616] transition-colors hover:bg-white disabled:opacity-40"
          >
            Create channel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
