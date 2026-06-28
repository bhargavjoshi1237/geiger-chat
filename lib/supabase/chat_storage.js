"use client";

// Storage helpers for chat file sharing. Binaries live in the public "chat"
// bucket under files/<ownerId>/; the public URL is persisted on the file row.
// Helpers return null/false like the data layer.

import { createClient } from "./client";
import { isSupabaseConfigured } from "./config";

const BUCKET = "chat";

const EXT_KIND = {
  pdf: "pdf",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
  csv: "sheet", xlsx: "sheet", xls: "sheet",
  key: "slides", ppt: "slides", pptx: "slides",
};

// Map a filename to one of the icon kinds the Files screen understands.
export function fileKind(name = "") {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return EXT_KIND[ext] || "doc";
}

// Human-readable byte size, e.g. "2.4 MB".
export function formatSize(bytes = 0) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

// Upload a File to storage; returns its public URL (or null).
export async function uploadChatFile(file, ownerId) {
  if (!file || !ownerId || !isSupabaseConfigured()) return null;
  try {
    const sb = createClient();
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `files/${ownerId}/${Date.now()}-${safe}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      console.error("[chat_storage.upload]", error.message);
      return null;
    }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (e) {
    console.error("[chat_storage.upload]", e);
    return null;
  }
}
