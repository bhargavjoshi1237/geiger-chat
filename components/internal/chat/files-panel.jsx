"use client";

import React, { useMemo } from "react";
import {
  X, Paperclip, FileText, FileArchive, FileSpreadsheet, Presentation, Download, Loader2,
} from "lucide-react";
import { fromNow } from "./chat-utils";
import { getPerson } from "@/lib/chat/people-store";

const KIND_ICON = {
  pdf: FileText,
  archive: FileArchive,
  sheet: FileSpreadsheet,
  slides: Presentation,
  doc: FileText,
};

// Right sidebar listing every file shared in the conversation: images as a
// thumbnail grid, other files as download rows. Newest first. Presentational —
// the screen owns the data (conversation.files).
export function FilesPanel({ files = [], loading = false, onClose }) {
  const images = useMemo(() => files.filter((f) => f.kind === "image" && f.url), [files]);
  const docs = useMemo(() => files.filter((f) => f.kind !== "image" || !f.url), [files]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background md:w-[360px] md:border-l md:border-border">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Paperclip className="ml-1 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
          <h3 className="truncate text-sm font-semibold text-foreground">Files</h3>
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

      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-subtle">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-card text-muted-foreground">
              <Paperclip className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <p className="text-sm text-text-secondary">
              No files yet. Attach one from the message box to share it here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {images.length ? (
              <div>
                <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                  Images
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {images.map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={f.name}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.url}
                        alt={f.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {docs.length ? (
              <div>
                <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                  Documents
                </p>
                <div className="space-y-1">
                  {docs.map((f) => {
                    const Icon = KIND_ICON[f.kind] || FileText;
                    const owner = f.ownerId ? getPerson(f.ownerId) : null;
                    return (
                      <a
                        key={f.id}
                        href={f.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={f.name}
                        className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-card px-3 py-2 transition-colors hover:bg-surface-hover"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-muted-foreground">
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{f.name}</span>
                          <span className="block truncate text-xs text-text-secondary">
                            {f.size}{owner ? ` · ${owner.firstName}` : ""} · {fromNow(f.minsAgo)}
                          </span>
                        </span>
                        <Download className="h-4 w-4 shrink-0 text-text-secondary" />
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
