"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MainScreenWrapper, SecondaryScreenWrapper } from "@/components/internal/shared/screen_wrappers";

// Scrollable host for a screen. The home layout gives screens a fixed-height,
// overflow-hidden slot, so each "document" screen owns its own vertical scroll.
// The `p-8` mirrors geiger-flow's <main> padding (dashboard/page.js) — the gap
// between the topbar and the content frame. Chat screens render full-bleed and
// deliberately bypass this host.
export function ScreenScroll({ children }) {
  return <div className="h-full overflow-y-auto scrollbar-subtle p-8">{children}</div>;
}

// Standard screen body: the suite's MainScreenWrapper sizing with the shared
// column rhythm and foreground text. The gap-7 spacing below the header line
// matches the Contacts screen (the previous gap-10 read as too airy).
// `fill` makes the body at least the full height of the scroll area so a
// flex-1 child can stretch to consume leftover space (keeping bottom padding
// even with the top instead of leaving a void on light pages).
export function ScreenContainer({ children, className, secondary = false, fill = false }) {
  const Wrapper = secondary ? SecondaryScreenWrapper : MainScreenWrapper;
  return (
    <ScreenScroll>
      <Wrapper className={cn("flex flex-col gap-7 space-y-0 text-[#e7e7e7]", fill && "min-h-full", className)}>
        {children}
      </Wrapper>
    </ScreenScroll>
  );
}

// The suite-standard screen header: title + description on the left, actions on
// the right, separated from content by a bottom border.
export function ScreenHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#2a2a2a] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#e7e7e7]">{title}</h1>
        {description ? <p className="text-[#a3a3a3] text-sm mt-1">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-medium text-[#e7e7e7]">{children}</h3>
      {action}
    </div>
  );
}

// Shared button class strings so screens stay on-palette without repetition.
// Primary is white (suite primary token); secondary is a bordered dark surface.
export const btnPrimary =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-[#e7e7e7] px-4 text-sm font-semibold text-[#161616] transition-colors hover:bg-white disabled:opacity-40";
export const btnSecondary =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#202020] px-4 text-sm font-medium text-[#a3a3a3] transition-colors hover:border-[#474747] hover:text-[#e7e7e7] disabled:opacity-40";
