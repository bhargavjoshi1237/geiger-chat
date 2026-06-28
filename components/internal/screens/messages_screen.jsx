"use client";

import React from "react";
import { ChatScreen } from "@/components/internal/chat/chat-screen";

export function MessagesScreen() {
  return <ChatScreen title="Messages" variant="dm" />;
}
