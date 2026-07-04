"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ProjectSidebar } from "@/components/internal/sidebar/projects/project_sidebar";
import { ProjectTopbar } from "@/components/internal/topbar/projects/topbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PlaceholderScreen } from "@/components/internal/screens/placeholder_screen";
import { SCREENS } from "@/components/internal/screens";
import { projectNav } from "@/components/internal/sidebar/projects/sidebar_data";
import { useCallReminders } from "@/lib/chat/use-call-reminders";
import { getUser } from "@/lib/supabase/user";
import { OrgProvider } from "@/lib/chat/org-context";

// geiger-dash login route. The dash app proxies /chat -> geiger-chat in
// production, so a relative /login resolves on the dash host. Override via env
// when the apps live on separate origins.
const LOGIN_URL = process.env.NEXT_PUBLIC_DASH_LOGIN_URL || "/login?next=/chat/home";

function HomeLayoutContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState("checking"); // 'checking' | 'ok' | 'unauth'

  // Auth gate: /home requires a real Supabase auth session. Without one we send
  // the user to the geiger-dash login (shared Supabase project) and back here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getUser().catch(() => null);
      if (cancelled) return;
      if (user?.id) {
        setAuthState("ok");
      } else {
        // Preserve any active tab so returning lands back where they were.
        const ret = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
        const sep = LOGIN_URL.includes("?") ? "&" : "?";
        router.replace(`${LOGIN_URL}${sep}next=${encodeURIComponent(ret)}`);
        setAuthState("unauth");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, pathname, searchParams]);

  // Drop scheduled-call reminders into the Inbox within the hour before.
  useCallReminders();

  const screenParamKeys = [];
  searchParams.forEach((_, key) => { screenParamKeys.push(key); });
  const currentTab = screenParamKeys[0] || projectNav[0].title;

  const setCurrentTab = useCallback(
    (tab) => {
      if (tab === projectNav[0].title) {
        router.push(pathname, { scroll: false });
      } else {
        router.push(`${pathname}?${encodeURIComponent(tab)}`, { scroll: false });
      }
    },
    [router, pathname],
  );

  const activeItem =
    projectNav.find((item) => item.title === currentTab) || projectNav[0];

  const ActiveScreen = SCREENS[activeItem.title];

  if (authState === "checking") {
    return (
      <div className="flex flex-col h-[100dvh] w-full bg-background items-center justify-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-border-strong border-t-[#e7e7e7] animate-spin" />
        <span className="text-text-tertiary text-sm">Loading...</span>
      </div>
    );
  }
  // While unauthed we briefly keep the spinner; the redirect is in flight.
  if (authState === "unauth") return null;

  return (
    <div className="flex-col h-[100dvh] w-full bg-background text-foreground font-sans overflow-hidden selection:bg-surface-strong flex">
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

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-[100dvh] w-full bg-background items-center justify-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-border-strong border-t-[#e7e7e7] animate-spin" />
          <span className="text-text-tertiary text-sm">Loading...</span>
        </div>
      }
    >
      <OrgProvider>
        <HomeLayoutContent />
      </OrgProvider>
    </Suspense>
  );
}
