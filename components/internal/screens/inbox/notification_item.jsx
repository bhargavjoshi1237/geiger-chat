import React from "react";
import * as LucideIcons from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Check, Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}) {
  const IconComponent = LucideIcons[notification.icon] || Bell;

  const formattedTime = React.useMemo(() => {
    try {
      const date = new Date(notification.time);
      return isNaN(date.getTime())
        ? notification.time
        : formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return notification.time;
    }
  }, [notification.time]);

  const extraContent = React.useMemo(() => {
    try {
      if (!notification.extra) return null;
      return typeof notification.extra === "string"
        ? JSON.parse(notification.extra)
        : notification.extra;
    } catch {
      return null;
    }
  }, [notification.extra]);

  const bgColor = notification.bg_color || notification.bgColor || "bg-surface-hover";
  const iconColor = notification.icon_color || notification.iconColor || "text-text-secondary";
  const isUnread = !notification.read;

  return (
    <div
      onClick={() => onClick(notification)}
      className={`
        group relative flex items-start gap-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer
        ${isUnread
          ? "bg-surface-card border-border hover:border-border-strong"
          : "bg-surface-card border-transparent hover:bg-surface-subtle hover:border-border"}
      `}
    >

      <div className={`mt-0.5 flex items-center justify-center w-9 h-9 rounded-lg ${bgColor} border border-border`}>
        <IconComponent className={`w-4 h-4 ${iconColor}`} strokeWidth={1.8} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className={`text-[13px] font-medium truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
            {notification.title}
          </h3>
          <span className="text-[11px] text-text-secondary whitespace-nowrap shrink-0">
            {formattedTime}
          </span>
        </div>

        <p className={`text-[12px] leading-relaxed ${isUnread ? "text-muted-foreground" : "text-text-secondary"} line-clamp-2`}>
          {notification.description}
        </p>

        {extraContent && (
          <div className="mt-3">
            {extraContent.type === "comment" && (
              <div className="bg-surface-subtle border border-border rounded-lg p-3 text-[12px] text-muted-foreground leading-relaxed">
                {extraContent.text}
              </div>
            )}

            {extraContent.type === "file" && extraContent.files?.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 border border-border rounded-lg bg-surface-subtle mt-2"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-7 h-7 rounded flex items-center justify-center bg-surface-card text-text-secondary text-[10px] font-medium">
                    {f.name.split('.').pop().toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] text-muted-foreground truncate">{f.name}</div>
                    <div className="text-[10px] text-text-secondary">{f.size}</div>
                  </div>
                </div>
              </div>
            ))}

            {extraContent.type === "actions" && (
              <div className="flex items-center gap-2 mt-2.5">
                <Button className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-medium text-muted-foreground hover:bg-surface-active hover:text-foreground transition-colors">
                  {extraContent.options?.[0] || "Decline"}
                </Button>
                <Button className="px-3 py-1.5 rounded-lg bg-primary text-[11px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  {extraContent.options?.[1] || "Accept"}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="mt-3">
          <span className="text-[9px] uppercase font-semibold tracking-wider text-text-secondary bg-surface-card px-2 py-1 rounded-md border border-border">
            {notification.type}
          </span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button className="p-1.5 rounded-lg text-text-secondary hover:text-foreground hover:bg-surface-hover transition-colors opacity-0 group-hover:opacity-100">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-[160px] border-border text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          {isUnread && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="cursor-pointer text-[12px]"
            >
              <Check className="w-3.5 h-3.5 mr-2 text-green-400" />
              Mark as read
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="cursor-pointer text-[12px] text-red-400 focus:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
