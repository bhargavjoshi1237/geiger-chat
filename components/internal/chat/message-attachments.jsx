"use client";

import React from "react";
import { FileText, FileArchive, FileSpreadsheet, Presentation, Download, Loader2 } from "lucide-react";
import { formatSize } from "@/lib/supabase/chat_storage";
import { cn } from "@/lib/utils";

// Icon per file kind (matches lib/supabase/chat_storage.js fileKind()).
const KIND_ICON = {
  pdf: FileText,
  archive: FileArchive,
  sheet: FileSpreadsheet,
  slides: Presentation,
  doc: FileText,
};

function humanSize(size) {
  if (typeof size === "number") return formatSize(size);
  return size || "";
}

// Renders a message's attachments: images as inline previews, everything else as
// a downloadable file card. `size` may be a byte count (optimistic) or a
// preformatted string (persisted).
export function MessageAttachments({ attachments = [], isMe }) {
  if (!attachments.length) return null;
  const images = attachments.filter((a) => a.kind === "image");
  const docs = attachments.filter((a) => a.kind !== "image");

  return (
    <div className={cn("mt-1 flex w-fit max-w-full flex-col gap-1.5", isMe && "items-end")}>
      {images.length ? (
        <div className={cn("flex flex-wrap gap-1.5", isMe && "justify-end")}>
          {images.map((a, i) => {
            const inner = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.url}
                alt={a.name || "image"}
                className="h-40 w-40 rounded-xl border border-border object-cover"
              />
            );
            return a.url && !a.uploading ? (
              <a
                key={a.id || `${a.name}-${i}`}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                title={a.name}
                className="relative block overflow-hidden rounded-xl transition-opacity hover:opacity-90"
              >
                {inner}
              </a>
            ) : (
              <div key={a.id || `${a.name}-${i}`} className="relative overflow-hidden rounded-xl">
                {a.url ? inner : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-border bg-surface-card" />
                )}
                {a.uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {docs.map((a, i) => {
        const Icon = KIND_ICON[a.kind] || FileText;
        return (
          <a
            key={a.id || `${a.name}-${i}`}
            href={a.uploading ? undefined : a.url}
            target="_blank"
            rel="noopener noreferrer"
            title={a.uploading ? "Uploading…" : a.name}
            className={cn(
              "flex w-64 max-w-full items-center gap-2.5 rounded-xl border border-border bg-surface-card px-3 py-2 transition-colors",
              a.uploading ? "cursor-default opacity-70" : "hover:bg-surface-hover",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-muted-foreground">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{a.name}</span>
              <span className="block text-xs text-text-secondary">{humanSize(a.size)}</span>
            </span>
            {a.uploading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-secondary" />
            ) : (
              <Download className="h-4 w-4 shrink-0 text-text-secondary" />
            )}
          </a>
        );
      })}
    </div>
  );
}
