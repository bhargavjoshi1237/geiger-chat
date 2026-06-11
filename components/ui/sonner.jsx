"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          // Match the app's dark palette (see /pallet) instead of sonner's
          // default per-type colors — neutral surfaces, monochrome icons.
          toast:
            "group toast group-[.toaster]:bg-surface-subtle group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:rounded-xl group-[.toaster]:shadow-lg",
          title: "group-[.toast]:text-foreground group-[.toast]:font-medium",
          description: "group-[.toast]:text-muted-foreground",
          icon: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-[#e7e7e7] group-[.toast]:text-[#161616]",
          cancelButton:
            "group-[.toast]:bg-surface-hover group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:bg-surface-card group-[.toast]:text-muted-foreground group-[.toast]:border-border group-[.toast]:hover:bg-surface-hover group-[.toast]:hover:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
