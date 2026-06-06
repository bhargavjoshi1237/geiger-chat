"use client";

import React from "react";
import { TwoPaneChat } from "@/components/internal/chat/two-pane-chat";
import { DIRECT_CONVERSATIONS } from "@/lib/mock/chat-data";

export function MessagesScreen() {
  return <TwoPaneChat title="Messages" items={DIRECT_CONVERSATIONS} variant="dm" />;
}
