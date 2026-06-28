"use client";

// Polls for scheduled calls that start within the next hour and drops a reminder
// into the owner's Inbox (once per call). This is a client-side reminder — it
// fires while the app is open; there is no server cron. Mounted once in the
// workspace shell.

import { useEffect } from "react";
import { ensureIdentity } from "./identity";
import { setMe, ME } from "./people-store";
import { listDueReminders, markReminded } from "@/lib/supabase/chat_scheduled_calls";
import { createNotification } from "@/lib/supabase/chat_notifications";

const POLL_MS = 60 * 1000;

export function useCallReminders() {
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (!ME.id) {
        const me = await ensureIdentity();
        if (me) setMe(me);
      }
      if (cancelled || !ME.id) return;
      const due = await listDueReminders(ME.id);
      for (const call of due) {
        if (cancelled) return;
        const mins = Math.max(
          0,
          Math.round((new Date(call.scheduledAt).getTime() - Date.now()) / 60000),
        );
        const ok = await createNotification({
          profileId: ME.id,
          type: "Reminder",
          title: `Upcoming call: ${call.title}`,
          description:
            mins <= 1
              ? `Your call “${call.title}” is starting now.`
              : `Your call “${call.title}” starts in about ${mins} min.`,
          icon: "CalendarClock",
          bgColor: "bg-emerald-500/10",
          iconColor: "text-emerald-400",
          extra: { type: "call-reminder", scheduledAt: call.scheduledAt, kind: call.kind },
        });
        if (ok) await markReminded(call.id);
      }
    };

    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
}
