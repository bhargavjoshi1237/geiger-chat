"use client";

import React, { useMemo, useState } from "react";
import {
  Search, FileText, FileImage, FileArchive, FileSpreadsheet,
  Presentation, File as FileIcon, Download, MoreHorizontal, Upload,
} from "lucide-react";
import { ScreenContainer, ScreenHeader, btnPrimary } from "./screen-shell";
import { fromNow } from "@/components/internal/chat/chat-utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FILES, getPerson } from "@/lib/mock/chat-data";
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

  const files = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FILES.filter((f) => {
      if (type !== "all" && f.kind !== type) return false;
      if (!q) return true;
      return f.name.toLowerCase().includes(q);
    });
  }, [query, type]);

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Files"
        description="Everything shared across your conversations and channels."
        actions={
          <button className={btnPrimary}>
            <Upload className="h-4 w-4" /> Upload
          </button>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 transition-colors focus-within:border-[#474747]">
            <Search className="h-4 w-4 text-[#6b6b6b]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files"
              className="h-9 flex-1 bg-transparent text-sm text-[#e7e7e7] placeholder:text-[#6b6b6b] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-1">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={cn(
                  "h-7 rounded-md px-3 text-xs font-medium transition-colors",
                  type === t.key ? "bg-[#2a2a2a] text-white" : "text-[#a3a3a3] hover:text-white",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#202020]">
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
              const source = f.source.startsWith("#") || ["engineering", "design", "product", "random", "marketing"].includes(f.source) ? `#${f.source}` : f.source;
              return (
                <TableRow key={f.id} className="group">
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-[#a3a3a3]">
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#e7e7e7]">{f.name}</p>
                        <p className="truncate text-xs text-[#737373]">{owner.firstName} · {fromNow(f.minsAgo)} ago</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-xs text-[#a3a3a3] md:table-cell">{mt.label}</TableCell>
                  <TableCell className="hidden max-w-[160px] truncate text-xs text-[#a3a3a3] md:table-cell">{source}</TableCell>
                  <TableCell className="hidden text-xs text-[#a3a3a3] md:table-cell">{f.size}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="flex h-8 w-8 items-center justify-center rounded-full text-[#a3a3a3] opacity-0 transition-all hover:bg-[#2a2a2a] hover:text-white group-hover:opacity-100" title="Download">
                        <Download className="h-4 w-4" />
                      </button>
                      <button className="flex h-8 w-8 items-center justify-center rounded-full text-[#a3a3a3] transition-colors hover:bg-[#2a2a2a] hover:text-white" title="More">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {files.length === 0 ? <p className="py-14 text-center text-sm text-[#6b6b6b]">No files found.</p> : null}
        </div>
      </div>
    </ScreenContainer>
  );
}
