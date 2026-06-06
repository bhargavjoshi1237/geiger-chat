import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChatPlayground } from "@/components/internal/chat/chat-playground";

// Shared Geiger showcase backdrops (same set used by geiger-forms' landing).
const showcaseBackgroundImages = [
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-00a586c62c8782e65c0a.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/internal-brand-023-3291bb4c.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-0ec1f3ba625f482c9dc3.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-85923e7fafe00c9c0d1f.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-8e2e88cff7f33224ddd7.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-0a66efa21dd4b7e6c526.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-cc24ca462279ca23250c.jpg",
];

function getRandomBackground() {
  return showcaseBackgroundImages[Math.floor(Math.random() * showcaseBackgroundImages.length)];
}

// Landing showcase: frames the live ChatPlayground the same way Geiger Notes
// frames its board canvas. The playground runs entirely on the page — send
// messages, switch channels, and start a meeting with no save and no load.
export default function LandingChatShowcase({ ctaHref = "/home", ctaLabel = "Open Chat" }) {
  const bg = getRandomBackground();

  return (
    <section
      className="overflow-hidden rounded-2xl border border-zinc-800 bg-cover bg-center p-3 sm:rounded-3xl sm:p-6 md:p-8 xl:p-10"
      style={{ backgroundImage: `url('${bg}')` }}
    >
      <div className="flex flex-col gap-6 sm:gap-10">
        <div className="mx-auto mb-2 mt-2 flex w-[94%] flex-col items-start gap-4 sm:mb-4 sm:mt-4 sm:w-[92%]">
          <h3 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">
            Experience the full Geiger Chat interface in real time.
          </h3>
          <p className="max-w-md text-sm text-zinc-300/90">
            This playground runs locally on the page with real channels, messaging,
            presence, and a video meeting stage. Send a message, switch channels, or
            start a call. No save and no load, just pure exploration.
          </p>
          <Link
            href={ctaHref}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-100 px-5 font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative rounded-2xl border border-zinc-700/80 bg-[#191919]/70 p-2 shadow-2xl backdrop-blur-md sm:p-3">
          <div className="h-[600px] overflow-hidden rounded-xl border border-zinc-800 bg-[#161616] sm:h-[680px] lg:h-[760px]">
            <ChatPlayground />
          </div>
        </div>
      </div>
    </section>
  );
}
