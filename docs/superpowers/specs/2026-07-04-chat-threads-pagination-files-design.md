# Chat: Message Pagination, Threads, and File Upload — Design

Date: 2026-07-04
Area: `components/internal/chat`, `lib/supabase/chat_*`, `supabase/sqls`

Three additions to the existing chat surface (Messages + Channels screens driven
by `ChatScreenInner` → `TwoPaneChat` → `ChatThread`):

1. **Message pagination** — load the newest 25 messages, auto-load older on
   scroll-to-top.
2. **Threads** — create a thread from any message; a right sidebar lists a
   conversation's threads (rename / delete); opening one shows its own replies +
   composer. Available in channels and DMs; thread replies stay inside the thread.
3. **File upload** — wire the composer attachment button (images inline + file
   cards, ~25 MB cap). A second right-sidebar panel (Files icon in the header)
   lists all files shared in the conversation, image thumbnails included. Uploads
   also register in the workspace Files screen (`chat.files`).

The landing playground (`autoReply` mode) is untouched.

---

## 1. Data model / SQL — `supabase/sqls/chat_20_threads.sql` (new, idempotent)

- **`chat.threads`**: `id`, `conversation_id → chat.conversations`,
  `root_message_id → chat.messages (set null)`, `title text default 'Thread'`,
  `created_by → chat.profiles`, `last_activity_at`, `metadata jsonb`,
  `created_at`, `updated_at`, `deleted_at`. Index on `(conversation_id)` where
  `deleted_at is null`. `touch_updated_at` trigger.
- **`chat.messages`**: `add column thread_id uuid references chat.threads(id) on
  delete cascade`. Index `(thread_id, created_at)` where `deleted_at is null`.
  Main-timeline messages have `thread_id = null`; thread replies set it.
- **`chat.files`**: `add column conversation_id`, `message_id`, `content_type`.
  Index `(conversation_id, created_at desc)`.
- Trigger `chat.bump_thread_activity` on `messages insert when thread_id is not
  null` → updates `chat.threads.last_activity_at`.
- RLS demo-open on `chat.threads` (mirrors siblings). Add `chat.threads` to the
  `supabase_realtime` publication.

Run via `npm run db:push`.

## 2. Data layer

- **`lib/supabase/chat_messages.js`**
  - `listMessages(conversationId, { threadId = null, before = null, limit = 25 })`
    — filters `thread_id` (null for main timeline, `= threadId` for a thread),
    optional `.lt("created_at", before)` cursor, `order desc limit`, then
    `reverse()` to ascending. Screen infers "has more" from `length === limit`.
  - `normalizeMessage` surfaces `attachments` (from `metadata.attachments`) and
    `threadId` (`row.thread_id`).
  - `sendMessage({ …, threadId, attachments })` writes `thread_id` and
    `metadata.attachments`.
- **`lib/supabase/chat_conversations.js`** — `listConversations` message query
  adds `.is("thread_id", null)` so thread replies don't skew last-preview/unread.
- **`lib/supabase/chat_threads.js`** (new) — `normalizeThread`,
  `listThreads(conversationId)` (returns threads + `replyCount` + `lastActivity`),
  `createThread({ id, conversationId, rootMessageId, title, createdBy })`,
  `renameThread(id, title)`, `softDeleteThread(id)`,
  `subscribeThreads(conversationId, handler)`. Pure; null/[]/false contract.
- **`lib/supabase/chat_files.js`** — `normalizeFile` gains
  `conversationId/messageId/contentType`; `createFile` accepts them;
  `listFilesByConversation(conversationId)` for the Files panel. Global
  `listFiles()` unchanged.

## 3. UI

- **`composer.jsx`** — hidden `<input type=file multiple>`, Paperclip/Plus open
  it; ≤25 MB validation; pending attachment chips (with remove) above the input;
  `submit` allows send when text **or** attachments present; calls
  `onSend(text, files)`.
- **`chat-thread.jsx`** — `handleSend(text, files)` → `onSendMessage(text,
  replyTo, files)`. Scroll-to-top `IntersectionObserver` sentinel calls
  `onLoadOlder`; preserves scroll position on prepend; top spinner while loading.
  Owns which right panel is open (`null | 'threads' | 'files'`) and renders
  `ThreadPanel` / `FilesPanel`. Passes `onStartThread`, `threadsByRoot`,
  `onOpenThread` down to `MessageGroup`.
- **`thread-header.jsx`** — Threads (`MessagesSquare`) + Files (`Paperclip`)
  buttons with count badges, wired to `onToggleThreads` / `onToggleFiles`.
- **`message-actions.jsx`** — "Start thread" action (`MessagesSquare`).
- **`message-group.jsx`** — renders `MessageAttachments`; shows a "💬 N replies"
  pill under a rooted message that opens its thread.
- **`message-attachments.jsx`** (new) — images as rounded inline previews
  (click → open); other files as download cards (`fileKind` icon, name,
  `formatSize`).
- **`thread-panel.jsx`** (new) — right sidebar. List view: threads (title, root
  snippet, reply count, last activity) with inline rename + delete (confirm).
  Thread view: header (title + back), messages via `MessageGroup`, a `Composer`
  scoped to the thread. Self-contained (fetch via data layer, optimistic local
  state, scoped realtime); calls `onThreadsChanged` after mutations.
- **`files-panel.jsx`** (new) — right sidebar grid: image thumbnails + file
  cards, newest first, from `listFilesByConversation`.
- **`chat-screen.jsx`** — per-conversation pagination cursor + `hasMore`;
  `handleLoadOlder` (prepend); load `conv.threads` on select for indicators;
  thread CRUD + refresh handlers; `handleSend` uploads files
  (`uploadChatFile` + `createFile`), attaches `metadata.attachments`; realtime
  `onIncoming` early-returns for `thread_id` rows (thread panel owns thread
  realtime). Thread send path mirrors `handleSend`.
- **`two-pane-chat.jsx`** — forwards the new props to `ChatThread`.

## Non-goals

No message edit/delete changes. Threads inherit demo-open RLS. Requires
`npm run db:push` for the new columns/table.
