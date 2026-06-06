import {
  MessageSquare,
  Hash,
  Users,
  Phone,
  Paperclip,
  Inbox,
  Settings,
} from "lucide-react";

// Messages is first, so it is the default screen (the home layout treats
// projectNav[0] as the no-query-param default). Overview is intentionally not
// listed here — its screen + registry entry still exist, it just isn't a tab.
export const projectNav = [
  { title: "Messages", icon: MessageSquare },
  { title: "Channels", icon: Hash },
  { title: "Contacts", icon: Users },
  { title: "Calls", icon: Phone },
  { title: "Files", icon: Paperclip },
  { title: "Inbox", icon: Inbox },
  { title: "Settings", icon: Settings },
];

export const settingsNav = [];
