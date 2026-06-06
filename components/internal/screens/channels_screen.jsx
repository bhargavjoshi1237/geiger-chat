"use client";

import React from "react";
import { TwoPaneChat } from "@/components/internal/chat/two-pane-chat";
import { CHANNELS } from "@/lib/mock/chat-data";

export function ChannelsScreen() {
  return <TwoPaneChat title="Channels" items={CHANNELS} variant="channel" />;
}
