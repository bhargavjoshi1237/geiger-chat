// Registry mapping sidebar tab titles to their screen components. The home
// layout looks up the active tab here. Every screen fills the available height
// and manages its own scrolling (chat screens are full-bleed; document screens
// use ScreenContainer internally), so the host needs no padding of its own.

import { OverviewScreen } from "./overview_screen";
import { MessagesScreen } from "./messages_screen";
import { ChannelsScreen } from "./channels_screen";
import { ContactsScreen } from "./contacts_screen";
import { CallsScreen } from "./calls_screen";
import { FilesScreen } from "./files_screen";
import { InboxScreen } from "./inbox/inbox_screen";
import { SettingsScreen } from "./settings_screen";

export const SCREENS = {
  Overview: OverviewScreen,
  Messages: MessagesScreen,
  Channels: ChannelsScreen,
  Contacts: ContactsScreen,
  Calls: CallsScreen,
  Files: FilesScreen,
  Inbox: InboxScreen,
  Settings: SettingsScreen,
};
