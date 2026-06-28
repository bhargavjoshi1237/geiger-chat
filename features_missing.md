# Features Missing vs. Google Chat

A gap analysis of **Geiger Chat (current state)** against **Google Chat**. This
lists capabilities Google Chat ships that Geiger Chat does **not yet** have, so
they can be prioritised. Direction: _Google Chat has it → we don't_.

> Scope note: grounded in the actual codebase as of this writing. Where a feature
> is _partially_ present (UI shell only, demo-only, or no transport) it's listed
> under **Partial** rather than **Missing** so the doc stays honest.

---

## ✅ What Geiger Chat already has (baseline)

So the gaps below are read in context:

- 1:1 **DMs** and **channels** (public/private), auto-join public channels.
- **Realtime messaging** (Supabase postgres_changes), optimistic send.
- **Reactions** (emoji), **reply** (quoted snippet), **message info** dialog.
- **Read receipts** (Seen/Sent), unread counts, mark-as-read.
- **Presence** (online / away / offline) with heartbeat + live propagation.
- **Profile pictures** with initials fallback; **people directory** + live
  search by name/username/email.
- **Pin** conversation, **leave/remove**, **invite members**, **create channel**.
- **File sharing** (Storage-backed) + Files screen; **Calls** log + Inbox /
  notifications screens.
- Responsive **two-pane** layout, conversation search, details sheet w/ roster.

---

## ❌ Missing — Messaging core

| Feature | Google Chat | Geiger Chat | Notes |
|---|---|---|---|
| **Edit message** | ✅ | ❌ | No edit path; `metadata` + merge RPC make this cheap to add. |
| **Delete / unsend message** | ✅ | ❌ | `deleted_at` column already exists; needs UI + soft-delete action. |
| **Threaded replies** | ✅ (in-thread conversations) | ❌ | We have inline *reply quotes* only, not collapsible threads. |
| **Pinned messages** (per conversation) | ✅ | ❌ | We pin *conversations*, not individual messages. |
| **Forward message** | ✅ | ❌ | No forward-to-conversation flow. |
| **Rich text formatting** (bold/italic/lists/code) | ✅ | ❌ | Composer is plain text; messages render as raw text. |
| **Markdown / code blocks** | ✅ | ❌ | No formatting parse/render. |
| **@mentions** (real) | ✅ | ❌ | Composer has a non-functional `@` button; no mention resolon/notify. |
| **Link unfurling / previews** | ✅ | ❌ | URLs render as plain text. |
| **Inline image / media rendering** | ✅ | ❌ | Files list exists, but no inline image bubbles. |
| **Quote-with-formatting / blockquote** | ✅ | ❌ | — |
| **Message search (within/global)** | ✅ | ❌ | Only conversation-title search exists; message bodies aren't searched. |
| **Drafts** (per conversation) | ✅ | ❌ | Composer state is lost on switch. |
| **Scheduled send** | ✅ | ❌ | — |
| **Emoji picker (full) + custom emoji** | ✅ | ⚠️ Partial | Only a 6-emoji quick bar; no full picker / skin tones / custom. |
| **Reaction "who reacted" detail** | ✅ | ⚠️ Partial | We show counts; no hover list of reactors. |

---

## ❌ Missing — Composer & attachments

| Feature | Google Chat | Geiger Chat | Notes |
|---|---|---|---|
| **Attach file from composer** | ✅ | ❌ | Composer `+` / paperclip buttons are decorative; upload lives only on Files screen. |
| **Drag-and-drop / paste upload** | ✅ | ❌ | — |
| **Image/video thumbnails in chat** | ✅ | ❌ | — |
| **GIF picker** | ✅ | ❌ | — |
| **Voice messages** | ✅ (Workspace) | ❌ | — |
| **Typing indicator (real)** | ✅ | ⚠️ Partial | Indicator exists but is **demo/autoReply-only**; not broadcast over realtime. |

---

## ❌ Missing — Calls & meetings

| Feature | Google Chat | Geiger Chat | Notes |
|---|---|---|---|
| **Real audio/video calls (WebRTC)** | ✅ (Meet) | ✅ Done | P2P mesh signaled over Supabase broadcast; 1:1 DM + small channels, audio & video, ring/accept/decline. TURN optional (`NEXT_PUBLIC_TURN_*`). |
| **Screen share** | ✅ | ❌ | `getDisplayMedia` track-replace on the existing peer connections. |
| **Group calls at scale (SFU)** | ✅ | ⚠️ Partial | Mesh is fine to ~4; large channels need an SFU (managed SDK). |
| **Join via link / lobby** | ✅ | ❌ | — |
| **Huddles / quick calls** | ✅ | ❌ | — |
| **In-call chat & reactions** | ✅ | ❌ | — |

---

## ❌ Missing — Notifications & status

| Feature | Google Chat | Geiger Chat | Notes |
|---|---|---|---|
| **Per-conversation notification settings** | ✅ | ❌ | No mute-duration / mention-only modes. |
| **Mute with duration** | ✅ | ⚠️ Partial | `muted` column exists on members; no UI/logic. |
| **Do Not Disturb scheduling** | ✅ | ❌ | `dnd` presence value exists but isn't schedulable. |
| **Custom status / status message** | ✅ | ❌ | Presence is a fixed enum; no free-text status / emoji. |
| **Out-of-office** | ✅ | ❌ | — |
| **Desktop / push / email notifications** | ✅ | ❌ | In-app Inbox only; no web push or email. |
| **Unread badges across app** | ✅ | ⚠️ Partial | Unread shows in list; no global/cross-screen badge. |
| **Mark all as read / snooze** | ✅ | ❌ | — |

---

## ❌ Missing — Organization & navigation

| Feature | Google Chat | Geiger Chat | Notes |
|---|---|---|---|
| **Spaces** (org grouping above channels) | ✅ | ❌ | Flat channel list only. |
| **Starred / favorites & sections** | ✅ | ⚠️ Partial | We have Pinned only; no custom sections/folders. |
| **Conversation archive** | ✅ | ❌ | Soft-delete = leave; no archive/restore. |
| **Roles & admin (space manager)** | ✅ | ⚠️ Partial | `role` (admin/member) stored; no management UI / enforcement. |
| **Guest / external members** | ✅ | ❌ | — |
| **Member roster mgmt (remove/promote)** | ✅ | ⚠️ Partial | Invite only; no remove/role-change UI. |

---

## ❌ Missing — Platform & power features

| Feature | Google Chat | Geiger Chat | Notes |
|---|---|---|---|
| **Bots / apps / webhooks** | ✅ | ❌ | No integration surface. |
| **Slash commands** | ✅ | ❌ | — |
| **Smart reply / smart compose** | ✅ | ❌ | — |
| **Message translation** | ✅ | ❌ | — |
| **Tasks / assignments from chat** | ✅ (Workspace) | ❌ | Could bridge to Geiger Flow. |
| **Read-by list (group/channel)** | ✅ | ⚠️ Partial | Receipts are DM-only; no per-member read state in channels. |
| **Message retention / compliance / export** | ✅ (admin) | ❌ | — |
| **Accessibility: keyboard nav / shortcuts** | ✅ | ❌ | No documented shortcut map. |

---

## Suggested priority (high-value, low-lift first)

Most of these reuse infrastructure already in place (`metadata` bag + merge RPC,
soft-delete column, realtime channels):

1. **Edit & delete message** — `deleted_at` exists; merge RPC handles edits. ⭐
2. **Attach file from composer** — Storage + Files data layer already exist. ⭐
3. **Real typing indicator** — broadcast over a Supabase `presence`/broadcast channel. ⭐
4. **@mentions + mention notifications** — wire the `@` button to the directory + Inbox.
5. **Message search** — query `flow_chat_messages.text` (add a trigram index).
6. **Pinned messages** + **forward** — both are `metadata`/insert-only additions.
7. **Per-conversation mute** (column exists) and **custom status**.
8. **Full emoji picker** + **who-reacted** detail.
9. **Inline image rendering / link unfurl**.
10. ~~**Real WebRTC calls**~~ ✅ shipped (P2P mesh + Supabase signaling). Next:
    **screen share**, **TURN** for strict NATs, and an **SFU** for large channels.

---

_Last reviewed against the codebase on this branch. Update as features land._
