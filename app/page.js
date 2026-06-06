import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageSquare, Hash, Users, Phone, Paperclip, Bell } from "lucide-react";
import { SiteHeader } from "@/components/landing/site-header";
import LandingChatShowcase from "@/components/landing/landing-chat-showcase";

const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata = {
  title: "Chat - Geiger Studio",
  description: "Team communication, simplified.",
};

const features = [
  { title: "Direct Messaging", description: "Send messages to individuals and groups in real time without friction.", icon: MessageSquare },
  { title: "Channels", description: "Organize team conversations into topic-based channels for focused discussion.", icon: Hash },
  { title: "Contacts", description: "Manage your team directory and stay connected with everyone in one place.", icon: Users },
  { title: "Voice & Video Calls", description: "Start calls directly from any conversation without leaving the workspace.", icon: Phone },
  { title: "File Sharing", description: "Share documents, images, and files inline within any chat thread.", icon: Paperclip },
  { title: "Notifications", description: "Stay on top of mentions, replies, and important messages with smart alerts.", icon: Bell },
];

const faqs = [
  { question: "What is Geiger Chat?", answer: "Geiger Chat is a team communication workspace for messaging, channels, file sharing, and calls." },
  { question: "Where is the workspace?", answer: "The full Chat workspace lives at /home once you're signed in." },
  { question: "Can I use channels for different teams?", answer: "Yes. You can create as many channels as needed and manage membership per channel." },
  { question: "Is it part of Geiger Studio?", answer: "Yes. Chat is one product in the Geiger Studio suite, sharing authentication with other tools." },
];

function FaqItem({ question, answer }) {
  return (
    <details className="group border-b border-zinc-800 py-4">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-medium text-zinc-200 transition-colors hover:text-white">
        {question}
        <span className="mt-0.5 text-zinc-500 transition-transform group-open:rotate-45">+</span>
      </summary>
      <p className="pt-3 text-sm leading-6 text-zinc-400">{answer}</p>
    </details>
  );
}

function Footer() {
  return (
    <footer className="relative z-30 border-t border-zinc-800/50 bg-zinc-950 px-6 pb-8 pt-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Image src={`${assetPrefix}/logo1.svg`} alt="Logo" width={20} height={20} />
              <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-base font-bold tracking-tight text-transparent">
                Geiger Studios
              </span>
            </div>
            <p className="max-w-sm text-sm text-zinc-500">Built to Manage. Designed to Create.</p>
          </div>
          <div>
            <h4 className="mb-4 font-bold text-zinc-100">Product</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li><Link href="/home" className="transition-colors hover:text-zinc-100">Workspace</Link></li>
              <li><Link href="#features" className="transition-colors hover:text-zinc-100">Features</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-bold text-zinc-100">Company</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li><Link href="#" className="transition-colors hover:text-zinc-100">About</Link></li>
              <li><Link href="#" className="transition-colors hover:text-zinc-100">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-zinc-800/50 pt-8 text-sm text-zinc-500 md:flex-row">
          <p>&copy; {new Date().getFullYear()} Geiger Studios. All rights reserved.</p>
        </div>
      </div>
      <div className="relative z-0 mt-10 flex justify-center">
        <h1 className="pointer-events-none select-none text-[13vw] font-bold leading-none tracking-tight text-zinc-100/5">
          GEIGER STUDIO
        </h1>
      </div>
    </footer>
  );
}

export default function ChatLandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-zinc-950 font-sans text-zinc-100 selection:bg-indigo-500/30">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808030_1px,transparent_1px),linear-gradient(to_bottom,#80808030_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <SiteHeader productName="Chat" />

      <main className="relative z-10 flex flex-1 flex-col pt-16 sm:pt-20">
        <section className="mx-auto mb-10 mt-10 flex w-full max-w-6xl items-start justify-start px-4 sm:mt-16 sm:px-6">
          <div className="max-w-3xl">
            <h1 className="mb-4 text-2xl font-semibold text-white sm:text-3xl">
              Team communication, simplified.
            </h1>
            <p className="mb-6 max-w-xl text-sm text-zinc-400 sm:text-base">
              Geiger Chat brings messaging, channels, file sharing, and calls into one workspace so your team stays connected without the noise.
            </p>
            <Link
              href="/home"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-100 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-white sm:text-base"
            >
              Continue to Chat
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <div className="mx-auto my-10 w-[94%] sm:my-16 md:w-[88%] lg:w-[82%]">
          <LandingChatShowcase ctaHref="/home" ctaLabel="Open Chat" />
        </div>

        <section id="features" className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-sm border border-zinc-800 bg-[#191919] p-5">
              <Icon className="mb-3 h-5 w-5 text-zinc-300" />
              <h2 className="font-medium text-zinc-100">{title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{description}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-16 flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row">
          <div className="md:w-[35%]">
            <h2 className="text-3xl font-semibold text-white">Questions & Answers</h2>
          </div>
          <div className="md:w-[65%]">
            {faqs.map((faq) => <FaqItem key={faq.question} {...faq} />)}
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
            <h2 className="mb-8 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              TRY GEIGER NOW
            </h2>
            <Link
              href="/home"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-100 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
            >
              Open Chat
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
