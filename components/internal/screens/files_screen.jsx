"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, FileText, FileImage, FileArchive, FileSpreadsheet,
  Presentation, File as FileIcon, Download, MoreHorizontal, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { ScreenContainer, ScreenHeader, btnPrimary } from "./screen-shell";
import { fromNow } from "@/components/internal/chat/chat-utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ensureIdentity } from "@/lib/chat/identity";
import { getPerson, hydratePeople, setMe, ME } from "@/lib/chat/people-store";
import { listProfiles } from "@/lib/supabase/chat_profiles";
import { listFiles, createFile } from "@/lib/supabase/chat_files";
import { uploadChatFile, fileKind, formatSize } from "@/lib/supabase/chat_storage";
import { cn } from "@/lib/utils";

const KIND_META = {
  pdf: { icon: FileText, label: "PDF" },
  image: { icon: FileImage, label: "Image" },
  archive: { icon: FileArchive, label: "Archive" },
  sheet: { icon: FileSpreadsheet, label: "Spreadsheet" },
  slides: { icon: Presentation, label: "Slides" },
  doc: { icon: FileText, label: "Document" },
};

const TYPES = [
  { key: "all", label: "All" },
  { key: "pdf", label: "PDFs" },
  { key: "image", label: "Images" },
  { key: "doc", label: "Docs" },
];

function meta(kind) {
  return KIND_META[kind] || { icon: FileIcon, label: "File" };
}

export function FilesScreen() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await ensureIdentity();
      if (me) setMe(me);
      const profiles = await listProfiles();
      if (profiles) hydratePeople(profiles);
      const data = await listFiles();
      if (!cancelled) {
        setRows(data ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const files = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((f) => {
      if (type !== "all" && f.kind !== type) return false;
      if (!q) return true;
      return f.name.toLowerCase().includes(q);
    });
  }, [rows, query, type]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ME.id) {
      toast.error("Database isn't configured.");
      return;
    }
    setUploading(true);
    const url = await uploadChatFile(file, ME.id);
    const created = await createFile({
      name: file.name,
      kind: fileKind(file.name),
      size: formatSize(file.size),
      source: "Direct upload",
      url,
      ownerId: ME.id,
    });
    setUploading(false);
    if (created) {
      setRows((prev) => [created, ...prev]);
      toast.success("File uploaded");
    } else {
      toast.error("Couldn't upload the file.");
    }
  };

  return (
    <ScreenContainer>
      <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
      <ScreenHeader
        title="Files"
        description="Everything shared across your conversations and channels."
        actions={
          <button className={btnPrimary} onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
          </button>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-surface-subtle px-2.5 transition-colors focus-within:border-border-strong">
            <Search className="h-4 w-4 text-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files"
              className="h-9 flex-1 bg-transparent text-sm text-foreground placeholder:text-text-secondary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-subtle p-1">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={cn(
                  "h-7 rounded-md px-3 text-xs font-medium transition-colors",
                  type === t.key ? "bg-surface-hover text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell">Shared in</TableHead>
              <TableHead className="hidden md:table-cell">Size</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((f) => {
              const mt = meta(f.kind);
              const Icon = mt.icon;
              const owner = getPerson(f.ownerId);
              const src = f.source || "";
              const source = src.startsWith("#") || ["engineering", "design", "product", "random", "marketing"].includes(src) ? `#${src}` : src;
              return (
                <TableRow key={f.id} className="group">
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle text-muted-foreground">
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                        <p className="truncate text-xs text-text-secondary">{owner.firstName} · {fromNow(f.minsAgo)} ago</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{mt.label}</TableCell>
                  <TableCell className="hidden max-w-[160px] truncate text-xs text-muted-foreground md:table-cell">{source}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{f.size}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={f.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-surface-hover hover:text-foreground group-hover:opacity-100",
                          !f.url && "pointer-events-none opacity-30",
                        )}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="More">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {loading ? (
          <p className="py-14 text-center text-sm text-text-secondary">Loading files…</p>
        ) : files.length === 0 ? (
          <p className="py-14 text-center text-sm text-text-secondary">
            {rows.length === 0 ? "No files yet. Upload one to get started." : "No files found."}
          </p>
        ) : null}
        </div>
      </div>
    </ScreenContainer>
  );
}
