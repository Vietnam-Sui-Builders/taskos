"use client";

import Link from "next/link";
import NavBar from "@/components/NavBar";
import {
  Database,
  Share2,
  Sparkles,
  Trophy,
  ArrowRight,
  Mail,
  Twitter,
  Github,
} from "lucide-react";

const featureItems = [
  {
    title: "Create tasks, store on Walrus",
    description:
      "Every task writes to verifiable Walrus storage so progress is always auditable and recoverable.",
    icon: Database,
  },
  {
    title: "Share tasks instantly",
    description:
      "Invite contributors with a link. Collaborators see the on-chain state in real time.",
    icon: Share2,
  },
  {
    title: "Plan with an AI co-pilot",
    description:
      "Auto-generate checklists, dependencies, and schedules tailored to your team’s flow.",
    icon: Sparkles,
  },
  {
    title: "Prize pools for completion",
    description:
      "Stake incentives and release rewards automatically when tasks are marked done.",
    icon: Trophy,
  },
];

const MoveGlyph = () => (
  <svg
    className="h-10 w-10"
    viewBox="0 0 128 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M64 10L15 38V94L64 122L113 94V38L64 10Z"
      fill="url(#grad)"
      stroke="#161A1E"
      strokeWidth="6"
      strokeLinejoin="round"
    />
    <path
      d="M41 92V48L64 62L87 48V92"
      stroke="white"
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M41 82L61 94"
      stroke="#161A1E"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path
      d="M87 82L67 94"
      stroke="#161A1E"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <defs>
      <linearGradient
        id="grad"
        x1="64"
        y1="10"
        x2="64"
        y2="122"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF8833" />
        <stop offset="1" stopColor="#FF5A00" />
      </linearGradient>
    </defs>
  </svg>
);

const techStack = [
  {
    name: "Walrus",
    description: "Tamper-proof object storage powering our task archive.",
    logo: (
      <img
        src="https://cdn.prod.website-files.com/6864f039b26f4afedada6bc5/6864f039b26f4afedada6c30_about-ilust.svg"
        alt="Walrus logo"
        className="h-12 w-12 rounded-full border border-black/10 bg-white p-1 shadow-sm"
      />
    ),
  },
  {
    name: "Sui",
    description: "High-throughput execution so updates feel instant.",
    logo: (
      <img
        src="https://cdn.prod.website-files.com/6425f546844727ce5fb9e5ab/659d970f53d2997773cf1db1_emblem-sui-d.svg"
        alt="Sui logo"
        className="h-12 w-12 rounded-full border border-black/10 bg-white p-1 shadow-sm"
      />
    ),
  },
  {
    name: "Seal",
    description:
      "Privacy-preserving compliance rails for cross-jurisdiction workflows.",
    logo: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#071311] text-base font-semibold text-[#CAEAE5] shadow-inner shadow-black/20">
        Seal
      </span>
    ),
  },
  {
    name: "Move",
    description: "Safe-by-design smart contracts that enforce task logic.",
    logo: <MoveGlyph />,
  },
  {
    name: "Enoki",
    description: "Account abstraction toolkit powering seamless wallet flows.",
    logo: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#071311] text-lg font-semibold text-[#CAEAE5]">
        E
      </span>
    ),
  },
  {
    name: "Passkeys",
    description: "WebAuthn-native authentication for instant, secure sign-ins.",
    logo: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#071311]/10 bg-white text-lg font-semibold text-[#071311] shadow-inner shadow-black/10">
        PK
      </span>
    ),
  },
];

const socialLinks = [
  {
    label: "Email",
    href: "mailto:hello@taskos.io",
    icon: Mail,
    meta: "hello@taskos.io",
  },
  {
    label: "Twitter / X",
    href: "https://x.com/",
    icon: Twitter,
    meta: "@taskos.io",
  },
  {
    label: "GitHub",
    href: "https://github.com/",
    icon: Github,
    meta: "taskos.io",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#CAEAE5] text-[#071311]">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.55), transparent 50%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.4), transparent 45%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at center, transparent 0, transparent 18px, rgba(255,255,255,0.4) 19px)",
        }}
      />

      <div className="relative flex min-h-screen flex-col">
        <nav className="flex justify-center px-4 pt-6">
          <NavBar />
        </nav>

        <section
          id="home"
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-16 px-6 pb-24 pt-20 text-center md:flex-row md:items-end md:justify-between md:text-left"
        >
          <div className="flex max-w-2xl flex-col items-center gap-6 md:items-start">
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl">
              All-in-one on-chain task management
            </h1>
            <p className="max-w-xl text-base text-[#071311]/80 md:text-lg">
              Draft tasks, sync contributors, and release rewards in a single
              workflow. Powered by Walrus decentralized storage, Sui speed, and
              Move smart contracts.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row md:items-start">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-[#071311] px-8 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#CAEAE5] transition hover:bg-[#0c2622] cursor-pointer"
              >
                Launch App
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-[#071311] px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] transition hover:bg-[#071311] hover:text-[#CAEAE5] cursor-pointer"
              >
                Explore Features
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex w-full flex-col gap-4 rounded-3xl border border-white/50 bg-white/70 p-6 text-left shadow-lg backdrop-blur-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#071311]/70">
                  Total tasks planned
                </p>
                <p className="text-2xl font-semibold">10,888 tasks</p>
              </div>
              <div className="h-px w-full bg-[#071311]/10 md:h-12 md:w-px" />
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#071311]/70">
                  Teams shipped with TaskOS
                </p>
                <p className="text-2xl font-semibold">88 active teams</p>
              </div>
            </div>
          </div>
          <div className="relative hidden max-w-sm flex-1 items-end justify-end md:flex">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full border border-[#071311]/10 bg-white/60 blur-0" />
            <div className="relative w-full rounded-4xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.3em] text-[#071311]/60">
                  Upcoming sprint
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#071311]">
                  Sui Mainnet Launch
                </h2>
              </div>
              <ul className="space-y-4 text-left">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#071311]" />
                  <div>
                    <p className="font-semibold text-[#071311]">
                      Publish contracts to Walrus
                    </p>
                    <p className="text-sm text-[#071311]/70">
                      Autogenerated checklist locked with Move guard rails.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#071311]" />
                  <div>
                    <p className="font-semibold text-[#071311]">
                      Sync community prize pool
                    </p>
                    <p className="text-sm text-[#071311]/70">
                      2,500 SUI staked and ready to unlock on completion.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#071311]" />
                  <div>
                    <p className="font-semibold text-[#071311]">
                      Share rollout brief
                    </p>
                    <p className="text-sm text-[#071311]/70">
                      AI summary auto-shared with 42 contributors.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mt-4 text-3xl font-semibold text-[#071311] md:text-4xl">
              Ship faster with a workflow that understands teams
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {featureItems.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="group rounded-3xl border border-white/70 bg-white/80 p-6 text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#071311] text-[#CAEAE5] shadow-inner shadow-black/20">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-[#071311]">
                  {title}
                </h3>
                <p className="mt-3 text-sm text-[#071311]/75 md:text-base">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="tech"
          className="mx-auto w-full max-w-6xl px-6 pb-24 text-center md:text-left"
        >
          <div className="mx-auto max-w-3xl text-center md:text-left">
            <h2 className="mt-4 text-3xl font-semibold text-[#071311] md:text-4xl">
              Built natively on Sui Stack, secured by Move
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {techStack.map(({ name, description, logo }) => (
              <div
                key={name}
                className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#071311]/10 bg-white shadow-inner shadow-black/10">
                    {logo}
                  </div>
                  <h3 className="text-lg font-semibold text-[#071311]">
                    {name}
                  </h3>
                </div>
                <p className="text-sm text-[#071311]/75 md:text-base">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="contact"
          className="mx-auto w-full max-w-6xl px-6 pb-28 md:pb-32"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mt-4 text-3xl font-semibold text-[#071311] md:text-4xl">
              Subscribe and connect with the builders
            </h2>
          </div>

          <div className="mt-12 flex flex-col gap-8 rounded-4xl border border-white/70 bg-white/85 p-8 shadow-xl backdrop-blur md:flex-row md:gap-10 md:p-10">
            <div className="flex basis-1/2 flex-col gap-6">
              <div>
                <h3 className="text-lg font-semibold text-[#071311]">
                  Join the newsletter
                </h3>
                <p className="mt-2 text-sm text-[#071311]/75 md:text-base">
                  Product changelogs, feature previews, and governance proposals
                  delivered every Thursday.
                </p>
              </div>
              <form className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="h-12 flex-1 rounded-full border border-[#071311]/15 bg-white px-5 text-sm text-[#071311] outline-none transition focus:border-[#071311]/40 focus:ring-2 focus:ring-[#071311]/20"
                />
                <button
                  type="submit"
                  className="h-12 rounded-full bg-[#071311] px-6 text-sm font-semibold uppercase tracking-[0.25em] text-[#CAEAE5] transition hover:bg-[#0c2622] cursor-pointer"
                >
                  Notify me
                </button>
              </form>
              <p className="text-xs text-[#071311]/60">
                No spam—just the updates TaskOS teams ask for. Unsubscribe
                anytime.
              </p>
            </div>

            <div className="basis-1/2 space-y-4">
              <h3 className="text-lg font-semibold text-[#071311]">
                Connect with the team
              </h3>
              <div className="space-y-3">
                {socialLinks.map(({ label, href, icon: Icon, meta }) => (
                  <Link
                    key={label}
                    href={href}
                    className="group flex items-center justify-between rounded-3xl border border-[#071311]/10 bg-white px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-[#071311]/30 hover:shadow-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#071311] text-[#CAEAE5] shadow-inner shadow-black/20">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-[#071311]">{label}</p>
                        <p className="text-xs text-[#071311]/60">{meta}</p>
                      </div>
                    </div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#071311]/40 group-hover:text-[#071311]/70">
                      Reach out
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
