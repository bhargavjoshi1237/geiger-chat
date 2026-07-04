import Link from "next/link";
import {
  ArrowRight,
  Search,
  Bell,
  HelpCircle,
  Hash,
  Plus,
  Phone,
  Video,
  Paperclip,
  Smile,
  Send,
} from "lucide-react";
import { projectNav } from "@/components/internal/sidebar/projects/sidebar_data";
import { CHANNELS, DIRECT_CONVERSATIONS, ME, getPerson } from "@/lib/mock/chat-data";

// Static, non-interactive representation of the real Geiger Chat home workspace
// (topbar + sidebar + Messages screen), framed for the landing page the same way
// geiger-flow frames its workspace mockup. Pure static data — no state, no
// backend — so it renders on the server and stays cheap.

// Subtle unread counts on a couple of sidebar tabs for realism, keyed by the
// real projectNav titles so the sidebar stays in sync with the app.
const NAV_BADGES = { Channels: 2, Inbox: 4 };

const PRESENCE_DOT = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  dnd: "bg-red-400",
  offline: "bg-muted-foreground",
};

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtTime(mins) {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

// The active thread shown in the mockup: #general.
const ACTIVE = CHANNELS[0];

// Curated conversation list mixing channels and DMs, mirroring the Messages
// screen. The first row (#general) is the open conversation.
const ROWS = [
  { kind: "channel", conv: CHANNELS[0], active: true },
  { kind: "dm", conv: DIRECT_CONVERSATIONS[0] },
  { kind: "channel", conv: CHANNELS[1] },
  { kind: "dm", conv: DIRECT_CONVERSATIONS[3] },
  { kind: "channel", conv: CHANNELS[2] },
  { kind: "dm", conv: DIRECT_CONVERSATIONS[1] },
];

function Avatar({ person, size = "h-8 w-8", text = "text-[11px]" }) {
  return (
    <span
      className={`relative flex ${size} shrink-0 items-center justify-center rounded-full font-semibold text-white ${text}`}
      style={{ backgroundColor: person.color }}
    >
      {initials(person.name)}
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
          PRESENCE_DOT[person.presence] || PRESENCE_DOT.offline
        }`}
      />
    </span>
  );
}

function ConversationRow({ kind, conv, active }) {
  const person = kind === "dm" ? getPerson(conv.participantId) : null;
  const label = kind === "dm" ? person.name : `#${conv.name}`;
  const last = conv.messages[conv.messages.length - 1];
  const lastAuthor = last.authorId === ME.id ? "You" : getPerson(last.authorId).firstName;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg px-2 py-2 ${
        active ? "bg-surface-active" : ""
      }`}
    >
      {kind === "dm" ? (
        <Avatar person={person} />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-card text-muted-foreground">
          <Hash className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`truncate text-sm ${
              conv.unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"
            }`}
          >
            {label}
          </span>
          <span className="shrink-0 text-[10px] text-text-tertiary">
            {fmtTime(conv.lastActivity)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            <span className="text-text-secondary">{lastAuthor}:</span> {last.text}
          </span>
          {conv.unread ? (
            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {conv.unread}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ThreadMessage({ message }) {
  const isMe = message.authorId === ME.id;
  const person = isMe ? ME : getPerson(message.authorId);
  return (
    <div className="flex gap-3">
      <Avatar person={person} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">{person.name}</span>
          <span className="text-[10px] text-text-tertiary">{fmtTime(message.minsAgo)} ago</span>
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-foreground/90">{message.text}</p>
      </div>
    </div>
  );
}

function HomeWorkspaceMock() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Topbar — mirrors ProjectTopbar */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground">
            G
          </div>
          <span className="text-sm font-semibold text-foreground">Geiger Chat</span>
          <span className="hidden rounded-full bg-surface-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            Playground
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden h-8 w-[200px] items-center gap-2 rounded-md border border-border bg-surface-active px-2.5 text-sm text-muted-foreground md:flex">
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <span className="ml-auto rounded border border-border bg-surface-subtle px-1 text-[10px]">
              ⌘K
            </span>
          </div>
          <HelpCircle className="hidden h-[18px] w-[18px] text-muted-foreground sm:block" />
          <Bell className="hidden h-[18px] w-[18px] text-muted-foreground sm:block" />
          <Avatar person={ME} size="h-7 w-7" text="text-[10px]" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar — mirrors ProjectSidebar / projectNav */}
        <nav className="hidden w-48 shrink-0 flex-col gap-0.5 border-r border-sidebar-border bg-sidebar p-2 sm:flex">
          {projectNav.map(({ title, icon: Icon }, i) => {
            const badge = NAV_BADGES[title];
            const active = i === 0; // Messages
            return (
              <div
                key={title}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{title}</span>
                {badge ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {badge}
                  </span>
                ) : null}
              </div>
            );
          })}
        </nav>

        {/* Conversation list */}
        <div className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface-subtle md:flex">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
            <span className="text-sm font-semibold text-foreground">Messages</span>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-0.5 overflow-hidden p-2">
            {ROWS.map((row) => (
              <ConversationRow key={row.conv.id} {...row} />
            ))}
          </div>
        </div>

        {/* Active thread — #general */}
        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex min-w-0 items-center gap-2">
              <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-semibold text-foreground">
                {ACTIVE.name}
              </span>
              <span className="hidden truncate text-xs text-text-tertiary lg:inline">
                {ACTIVE.topic}
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <Video className="h-4 w-4" />
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-hidden p-4">
            {ACTIVE.messages.map((message) => (
              <ThreadMessage key={message.id} message={message} />
            ))}
          </div>

          {/* Composer */}
          <div className="shrink-0 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-card px-3 py-2.5">
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-text-tertiary">
                Message #{ACTIVE.name}
              </span>
              <Smile className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Send className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Landing showcase: frames the static home-workspace mockup with a heading, copy
// and a CTA, matching the surrounding landing page's aesthetic.
export default function LandingChatShowcase({ ctaHref = "/home", ctaLabel = "Open Chat" }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-subtle p-3 sm:rounded-3xl sm:p-6 md:p-8 xl:p-10">
      <div className="flex flex-col gap-6 sm:gap-10">
        <div className="mx-auto mb-2 mt-2 flex w-[94%] flex-col items-start gap-4 sm:mb-4 sm:mt-4 sm:w-[92%]">
          <h3 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Your whole workspace, right on the page.
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Messages, channels, contacts, calls, files, and your inbox — the full
            Geiger Chat home, all in one place. This is a preview of the interface
            you get the moment you sign in.
          </p>
          <Link
            href={ctaHref}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-100 px-5 font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative rounded-2xl border border-border/80 bg-background/70 p-2 shadow-2xl backdrop-blur-md sm:p-3">
          <div className="h-[520px] overflow-hidden rounded-xl border border-border bg-background sm:h-[560px] lg:h-[620px]">
            <HomeWorkspaceMock />
          </div>
        </div>
      </div>
    </section>
  );
}
