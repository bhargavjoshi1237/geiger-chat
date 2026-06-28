"use client";

import React, { useState } from "react";
import { Hash, Plus, Lock, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { PeoplePicker } from "./people-picker";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const VISIBILITY = [
  { key: "public", label: "Public", hint: "Anyone can join", icon: Globe },
  { key: "private", label: "Private", hint: "Invite only", icon: Lock },
];

// "Create channel" dialog: name, optional topic, visibility, and an optional set
// of people to add up front. Persists through onCreateChannel(draft).
export function CreateChannelDialog({ people = [], onCreateChannel }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [memberIds, setMemberIds] = useState([]);

  const reset = () => {
    setName("");
    setTopic("");
    setVisibility("public");
    setMemberIds([]);
  };

  const toggle = (id) =>
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = () => {
    const clean = name.trim().replace(/^#/, "");
    if (!clean) return;
    setOpen(false);
    onCreateChannel?.({ name: clean, topic: topic.trim(), visibility, memberIds });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Create channel"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
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
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-card px-2.5 transition-colors focus-within:border-border-strong">
              <Hash className="h-4 w-4 text-text-secondary" />
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="e.g. marketing"
                className="h-9 flex-1 bg-transparent text-sm text-foreground placeholder:text-text-secondary focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Topic <span className="text-text-secondary">(optional)</span></label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What's this channel about?"
              className="h-9 w-full rounded-lg border border-border bg-surface-card px-2.5 text-sm text-foreground placeholder:text-text-secondary transition-colors focus:border-border-strong focus:outline-none"
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
                    selected ? "border-border-strong bg-surface-active" : "border-border bg-surface-card hover:border-border-strong",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon className="h-4 w-4 text-muted-foreground" /> {o.label}
                  </span>
                  <span className="text-xs text-text-secondary">{o.hint}</span>
                </button>
              );
            })}
          </div>
          {people.length ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Add people <span className="text-text-secondary">(optional{memberIds.length ? `, ${memberIds.length} selected` : ""})</span>
              </label>
              <PeoplePicker people={people} selectedIds={memberIds} onToggle={toggle} />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-surface-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={create}
            disabled={!name.trim()}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            Create channel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
