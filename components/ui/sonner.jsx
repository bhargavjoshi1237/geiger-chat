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
            "group toast group-[.toaster]:bg-[#1a1a1a] group-[.toaster]:text-[#e7e7e7] group-[.toaster]:border group-[.toaster]:border-[#2a2a2a] group-[.toaster]:rounded-xl group-[.toaster]:shadow-lg",
          title: "group-[.toast]:text-[#e7e7e7] group-[.toast]:font-medium",
          description: "group-[.toast]:text-[#a3a3a3]",
          icon: "group-[.toast]:text-[#a3a3a3]",
          actionButton:
            "group-[.toast]:bg-[#e7e7e7] group-[.toast]:text-[#161616]",
          cancelButton:
            "group-[.toast]:bg-[#2a2a2a] group-[.toast]:text-[#a3a3a3]",
          closeButton:
            "group-[.toast]:bg-[#202020] group-[.toast]:text-[#a3a3a3] group-[.toast]:border-[#2a2a2a] group-[.toast]:hover:bg-[#2a2a2a] group-[.toast]:hover:text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
