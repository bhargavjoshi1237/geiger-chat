"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  MailOpen,
  Inbox,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationItem } from "./notification_item";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { SegmentedTabs } from "@/components/internal/shared/segmented_tabs";
import { Button } from "@/components/ui/button";
import { INBOX_NOTIFICATIONS } from "@/lib/mock/chat-data";

const INBOX_TABS = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
];

export function InboxScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Frontend-only: hydrate from local mock and turn `minsAgo` into a live ISO
  // timestamp on mount (client side) so relative times stay accurate without a
  // backend. Mirrors the suite's fetch-in-effect pattern.
  useEffect(() => {
    const now = Date.now();
    setNotifications(
      INBOX_NOTIFICATIONS.map((n) => ({
        ...n,
        time: new Date(now - n.minsAgo * 60000).toISOString(),
      })),
    );
    setLoading(false);
  }, []);

  const handleMarkAsRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (selectedNotification?.id === id) {
      setSelectedNotification({ ...selectedNotification, read: true });
    }
  };

  const handleMarkAllAsRead = () => {
    const unreadNotifications = notifications.filter((n) => !n.read);
    if (unreadNotifications.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (selectedNotification && !selectedNotification.read) {
      setSelectedNotification({ ...selectedNotification, read: true });
    }
  };

  const handleDelete = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (selectedNotification?.id === id) {
      setIsSheetOpen(false);
      setTimeout(() => setSelectedNotification(null), 300);
    }
  };

  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    setIsSheetOpen(true);
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      activeTab === "all" ? true : activeTab === "unread" ? !n.read : true;
    return matchesSearch && matchesTab;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasFilters = search.trim().length > 0 || activeTab !== "all";
  const emptyTitle = hasFilters
    ? activeTab === "unread"
      ? "No unread notifications"
      : "No matching notifications"
    : "No notifications yet";
  const emptyDescription = hasFilters
    ? "Try clearing your search or switching filters."
    : "Workspace notifications and alerts will appear here once there is activity.";

  const DetailIconComponent =
    selectedNotification?.icon && LucideIcons[selectedNotification.icon]
      ? LucideIcons[selectedNotification.icon]
      : LucideIcons.Bell;

  let formattedDetailDate = "";
  let fullDateStr = "";
  try {
    if (selectedNotification?.time) {
      const d = new Date(selectedNotification.time);
      if (!isNaN(d.getTime())) {
        formattedDetailDate = new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }).format(d);
        fullDateStr = d.toISOString();
      }
    }
  } catch (e) {}

  return (
    <div className="h-full overflow-hidden p-8">
      <MainScreenWrapper className="relative flex h-full min-h-0 flex-col gap-10 space-y-0 overflow-hidden text-[#e7e7e7]">
      <div className="flex flex-col gap-4 border-b border-[#2a2a2a] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#e7e7e7] tracking-tight flex items-center gap-3">
            Inbox
          </h1>
          <p className="text-[#a3a3a3] text-sm mt-1.5 font-medium">
            Stay updated with all notifications and alerts across your
            workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || loading}
            className="text-sm font-medium text-[#a3a3a3] hover:text-[#e7e7e7] bg-[#202020] hover:bg-[#2a2a2a] border border-[#2a2a2a] px-3.5 py-2 rounded-lg transition-all disabled:opacity-50 disabled:hover:bg-[#202020] disabled:cursor-not-allowed flex items-center gap-2"
          >
            <MailOpen className="w-4 h-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between shrink-0 z-10 sticky top-0 pb-2">
        <SegmentedTabs
          tabs={INBOX_TABS.map((tab) => ({
            ...tab,
            label: tab.value === "unread" && unreadCount > 0 ? `Unread (${unreadCount})` : tab.label,
          }))}
          value={activeTab}
          onChange={setActiveTab}
          className="self-start"
        />

        <div className="flex items-center gap-2 w-full md:w-auto md:flex-1 md:justify-end">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
            <Input
              type="text"
              placeholder="Filter notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full !pl-9 !pr-4 !py-[7px] bg-[#1a1a1a] border border-[#2a2a2a] text-[#e7e7e7] text-sm rounded-lg focus:outline-none focus:border-[#474747] transition-all focus:ring-1 focus:ring-[#474747] placeholder:text-[#525252]"
            />
          </div>
          <Button className="flex items-center justify-center p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] hover:text-[#e7e7e7] hover:bg-[#202020] transition-colors shrink-0">
            <Filter className="w-[18px] h-[18px]" />
          </Button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto min-h-0 pr-1 pb-10 flex flex-col gap-3 [&::-webkit-scrollbar]:hidden [&]:-ms-overflow-style:none [&]:scrollbar-width:none"
        style={{ scrollbarWidth: "none", scrollbarColor: "transparent transparent" }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-[200px] text-[#737373]">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-[#737373] border border-dashed border-[#2a2a2a] rounded-2xl bg-[#1a1a1a]/50">
            <Inbox
              className="w-12 h-12 mb-4 text-[#404040]"
              strokeWidth={1.5}
            />
            <p className="text-lg font-medium text-[#e7e7e7]">{emptyTitle}</p>
            <p className="text-sm mt-1.5 text-[#a3a3a3]">
              {emptyDescription}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              onClick={handleNotificationClick}
            />
          ))
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-[#141414] border-l border-[#1f1f1f] text-[#e7e7e7] p-0 w-full max-w-md shadow-2xl flex flex-col [&>button]:right-5 [&>button]:top-5 [&>button]:text-[#555555] hover:[&>button]:text-white">
          {selectedNotification && (
            <>
              <div className="px-6 pt-12 pb-5 border-b border-[#1f1f1f] shrink-0 bg-[#171717]">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                      selectedNotification.bg_color ||
                      selectedNotification.bgColor ||
                      "bg-[#1f1f1f]"
                    } border border-white/[0.06]`}
                  >
                    <DetailIconComponent
                      className={`w-5 h-5 ${
                        selectedNotification.icon_color ||
                        selectedNotification.iconColor ||
                        "text-[#666666]"
                      }`}
                      strokeWidth={1.8}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-[#666666] bg-[#1f1f1f] px-2 py-1 rounded-md border border-[#252525]">
                        {selectedNotification.type}
                      </span>
                      <span className="text-[11px] text-[#555555] shrink-0">
                        {formattedDetailDate || "Just now"}
                      </span>
                    </div>
                  </div>
                </div>
                <SheetTitle className="text-lg font-semibold text-white leading-tight pr-6">
                  {selectedNotification.title}
                </SheetTitle>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#141414]">
                <div className="space-y-5">
                  <p className="text-[14px] text-[#909090] leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.description}
                  </p>

                  {(() => {
                    let extraContent = null;
                    try {
                      if (selectedNotification.extra) {
                        extraContent = typeof selectedNotification.extra === "string"
                          ? JSON.parse(selectedNotification.extra)
                          : selectedNotification.extra;
                      }
                    } catch {}

                    if (!extraContent) return null;

                    if (extraContent.type === "comment") {
                      return (
                        <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg p-4">
                          <p className="text-[13px] text-[#888888] leading-relaxed">
                            {extraContent.text}
                          </p>
                        </div>
                      );
                    }

                    if (extraContent.type === "file" && extraContent.files?.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-[11px] uppercase font-semibold text-[#555555] tracking-wider">
                            Attachments
                          </p>
                          {extraContent.files.map((f, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 border border-[#1f1f1f] rounded-lg bg-[#1a1a1a] hover:border-[#2a2a2a] transition-colors"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded flex items-center justify-center bg-[#1f1f1f] text-[10px] font-semibold text-[#666666]">
                                  {f.name.split('.').pop().toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[13px] text-[#c0c0c0] truncate">{f.name}</div>
                                  <div className="text-[11px] text-[#555555]">{f.size}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    if (extraContent.type === "actions") {
                      return (
                        <div className="flex items-center gap-2 pt-2">
                          <Button className="flex-1 py-2 rounded-lg border border-[#2a2a2a] text-[13px] font-medium text-[#888888] hover:bg-[#1f1f1f] hover:text-white transition-colors">
                            {extraContent.options?.[0] || "Decline"}
                          </Button>
                          <Button className="flex-1 py-2 rounded-lg bg-white text-[13px] font-medium text-black hover:bg-gray-200 transition-colors">
                            {extraContent.options?.[1] || "Accept"}
                          </Button>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  <div className="bg-[#1a1a1a] rounded-lg border border-[#1f1f1f] p-4">
                    <div className="grid grid-cols-2 gap-y-3 text-[12px]">
                      <div className="text-[#555555]">Received</div>
                      <div className="text-[#909090] text-right">
                        {formattedDetailDate || "Unknown"}
                      </div>
                      <div className="text-[#555555]">Status</div>
                      <div className="flex items-center justify-end gap-2 text-[#909090]">
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedNotification.read ? "bg-[#555555]" : "bg-blue-500"}`} />
                        {selectedNotification.read ? "Read" : "Unread"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#1f1f1f] bg-[#171717] flex gap-2 shrink-0">
                {!selectedNotification.read && (
                  <Button
                    onClick={() => {
                      handleMarkAsRead(selectedNotification.id);
                      setIsSheetOpen(false);
                    }}
                    className="flex-1 bg-white hover:bg-gray-100 text-black font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-[13px]"
                  >
                    <MailOpen className="w-4 h-4" />
                    Mark as Read
                  </Button>
                )}
                <Button
                  onClick={() => handleDelete(selectedNotification.id)}
                  className="w-10 h-10 border border-[#1f1f1f] text-[#666666] hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/5 rounded-lg flex items-center justify-center transition-colors"
                  title="Delete"
                >
                  <LucideIcons.Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      </MainScreenWrapper>
    </div>
  );
}
