"use client";

import React from "react";
import { LayoutDashboard } from "lucide-react";

export function PlaceholderScreen({ title = "Overview", description, icon: Icon = LayoutDashboard }) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {description || `The ${title} screen lives here. Build it out in components/internal/screens.`}
        </p>
      </div>

      <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-surface-subtle/40 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-card text-muted-foreground">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="text-xs text-text-secondary">Geiger Chat &mdash; placeholder content</span>
        </div>
      </div>
    </div>
  );
}
