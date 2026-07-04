"use client";

import React, { useState } from "react";
import { ProjectSidebar } from "@/components/internal/sidebar/projects/project_sidebar";
import { ProjectTopbar } from "@/components/internal/topbar/projects/topbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PlaceholderScreen } from "@/components/internal/screens/placeholder_screen";
import { SCREENS } from "@/components/internal/screens";
import { projectNav } from "@/components/internal/sidebar/projects/sidebar_data";
import { OrgProvider } from "@/lib/chat/org-context";
import { enablePlaygroundMode } from "@/lib/chat/playground";

// Self-contained, interactive copy of the Chat workspace for embedding as a
// landing-page demo. Mirrors app/home/page.js — the real ProjectTopbar,
// ProjectSidebar and screen registry — but drives navigation through local state
// (no routing / auth gate) and fills its parent box (h-full) instead of the full
// viewport, so it can live inside a framed showcase.
//
// Playground data mode (see lib/chat/playground.js): the real data layer serves
// the frontend-only sample data instead of hitting Supabase, so every screen
// renders populated without a signed-in user. `ChatPlayground` turns the flag on
// during render — synchronously, before any child screen's fetch effect — and
// the real /home turns it back off in its own render, so /home is never affected
// even after visiting the landing page in the same session.
function PlaygroundWorkspace() {
  const [currentTab, setCurrentTab] = useState(projectNav[0].title);

  const activeItem =
    projectNav.find((item) => item.title === currentTab) || projectNav[0];
  const ActiveScreen = SCREENS[activeItem.title];

  return (
    <div className="flex-col h-full w-full bg-background text-foreground font-sans overflow-hidden selection:bg-surface-strong flex">
      <SidebarProvider
        className="flex-col !flex h-full min-w-0"
        style={{ flexDirection: "column" }}
      >
        <ProjectTopbar name="Chat" />
        <div className="flex flex-1 overflow-hidden relative">
          <ProjectSidebar activeTab={currentTab} onTabChange={setCurrentTab} />
          <SidebarInset className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative border-none">
            <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-white/[0.02] blur-[120px] pointer-events-none rounded-full" />
            <main className="flex-1 relative z-10 w-full min-w-0 overflow-hidden">
              {ActiveScreen ? (
                <ActiveScreen onNavigate={setCurrentTab} />
              ) : (
                <div className="h-full overflow-y-auto p-4 md:p-8">
                  <PlaceholderScreen title={activeItem.title} icon={activeItem.icon} />
                </div>
              )}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}

export function ChatPlayground() {
  // Turn playground data mode on during render, before OrgProvider / the screens
  // mount and fetch. It stays on for the whole landing page; /home flips it back
  // off in its own render. (This component only ever mounts on the landing page,
  // loaded client-side via dynamic import.)
  enablePlaygroundMode();

  return (
    <OrgProvider>
      <PlaygroundWorkspace />
    </OrgProvider>
  );
}

export default ChatPlayground;
