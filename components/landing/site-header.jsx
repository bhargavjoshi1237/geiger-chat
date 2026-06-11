"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getUser } from "@/lib/supabase/user";
import { ProfileDropdown } from "@/components/internal/topbar/dialogue/profile_dropdown";

const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function SiteHeader({ productName = "Chat", ctaHref = "/home" }) {
  const [user, setUser] = useState(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;
    getUser()
      .then((u) => active && setUser(u))
      .finally(() => active && setResolved(true));
    return () => { active = false; };
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background md:border-border/50 md:bg-background/85 md:backdrop-blur-md">
      <div className="relative mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center">
            <Image src={`${assetPrefix}/logo1.svg`} alt="Logo" width={20} height={20} />
          </div>
          <span className="truncate bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-sm font-bold tracking-tight text-transparent sm:text-base">
            Geiger {productName}
          </span>
        </Link>

        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <ProfileDropdown />
          ) : resolved ? (
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
          ) : (
            <div className="h-8 w-8 rounded-full border border-border bg-surface-subtle" />
          )}
          <Link
            href={ctaHref}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-zinc-100 px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            Open app
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
