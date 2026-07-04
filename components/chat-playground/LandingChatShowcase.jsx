"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const ChatPlayground = dynamic(
  () =>
    import("@/components/chat-playground/ChatPlayground").then(
      (mod) => mod.ChatPlayground,
    ),
  { ssr: false },
);

// Painterly backdrops shared across the suite (geiger-dash blob assets). One is
// chosen per visit so the showcase feels alive without shipping its own art.
const BG_IMAGES = [
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-00a586c62c8782e65c0a.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-0a66efa21dd4b7e6c526.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-0ec1f3ba625f482c9dc3.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-85923e7fafe00c9c0d1f.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-8e2e88cff7f33224ddd7.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-cc24ca462279ca23250c.jpg",
];

// Framed, interactive product preview for the landing page. Mirrors the suite's
// landing showcase (geiger-campaign components/campaign-playground): a
// background-image section holding the intro copy + CTA, with the live workspace
// running below in its own bordered, fixed-height card.
export default function LandingChatShowcase({
  ctaHref = "/home",
  ctaLabel = "Open the workspace",
}) {
  // First paint uses a stable image (index 0) so SSR and hydration match; a
  // random backdrop is swapped in on the client after mount by mutating the DOM
  // directly (no state, so no hydration mismatch on the style attribute).
  const sectionRef = useRef(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const pick = BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)];
    el.style.backgroundImage = `url('${pick}')`;
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden rounded-2xl border border-border bg-surface-subtle bg-cover bg-center p-3 sm:rounded-3xl sm:p-6 md:p-8 xl:p-10"
      style={{ backgroundImage: `url('${BG_IMAGES[0]}')` }}
    >
      {/* Scrim: keeps the intro copy legible over bright or busy backdrops. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-transparent" />

      <div className="relative flex flex-col gap-6 sm:gap-10">
        <div className="mx-auto mb-2 mt-2 flex w-[94%] flex-col items-start gap-4 sm:mb-4 sm:mt-4 sm:w-[92%]">
          <h3 className="text-2xl font-semibold leading-tight text-white drop-shadow-sm sm:text-3xl">
            Try the full Chat workspace in real time.
          </h3>
          <p className="max-w-lg text-sm text-white/80 drop-shadow-sm">
            This playground runs live on the page with the complete workspace —
            sidebar navigation, messages, channels, contacts, calls, files, and
            your inbox. No sign-in and nothing to save, just pure exploration.
          </p>
          <Link
            href={ctaHref}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-100 px-5 font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="h-[560px] overflow-hidden rounded-lg border border-border bg-background shadow-2xl sm:h-[640px] lg:h-[760px]">
          <ChatPlayground />
        </div>
      </div>
    </section>
  );
}
