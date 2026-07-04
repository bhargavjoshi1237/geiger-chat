// Shared attachment helpers for sending files with a message. Used by the main
// composer send path (chat-screen) and thread replies (thread-panel) so the
// upload + chat.files registration logic lives in one place.

import { uploadChatFile, fileKind, formatSize } from "@/lib/supabase/chat_storage";
import { createFile } from "@/lib/supabase/chat_files";

// Local, pre-upload attachment descriptors for the optimistic bubble. Images get
// a temporary object URL so the preview shows instantly; all are flagged
// `uploading` until the real URLs land.
export function buildOptimisticAttachments(files = []) {
  return files.map((f) => {
    const kind = fileKind(f.name);
    return {
      id: crypto.randomUUID(),
      name: f.name,
      kind,
      size: f.size,
      contentType: f.type || "",
      url: kind === "image" ? URL.createObjectURL(f) : "",
      uploading: true,
    };
  });
}

// Upload each file to storage and register a chat.files row (so it also shows in
// the Files panel / Files screen). Returns persisted attachment descriptors
// ({ id, name, url, kind, size, contentType }) to store on the message metadata.
// Reuses the optimistic ids so the optimistic bubble and the persisted metadata
// line up.
export async function uploadAttachments(files = [], { conversationId, messageId, ownerId, optimistic = [] } = {}) {
  const out = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const url = await uploadChatFile(f, ownerId);
    if (!url) continue;
    const kind = fileKind(f.name);
    const id = optimistic[i]?.id || crypto.randomUUID();
    out.push({ id, name: f.name, url, kind, size: f.size, contentType: f.type || "" });
    await createFile({
      id,
      name: f.name,
      kind,
      size: formatSize(f.size),
      url,
      ownerId,
      conversationId,
      messageId,
      contentType: f.type || "",
    });
  }
  return out;
}

// Revoke any object URLs minted for optimistic image previews.
export function revokeOptimistic(optimistic = []) {
  for (const a of optimistic) {
    if (a?.url && a.kind === "image") {
      try {
        URL.revokeObjectURL(a.url);
      } catch {
        /* ignore */
      }
    }
  }
}
