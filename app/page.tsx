"use client";

import Link from "next/link";
import NavBar from "@/components/NavBar";
import { motion } from "framer-motion";
import {
  Database,
  Share2,
  Sparkles,
  Trophy,
  ArrowRight,
  Mail,
  Twitter,
  Github,
  Shield,
  Cpu,
  Globe,
  Lock,
  RefreshCw,
  TrendingUp,
  Layers,
  FileText,
} from "lucide-react";

const featureItems = [
  {
    title: "Decentralized Task Distribution",
    description:
      "Create private, team-only, or public tasks with built-in reward escrow and approval flows.",
    icon: Globe,
  },
  {
    title: "Experience Data Assets",
    description:
      "Completed tasks become standardized, ownable data objects with rich metadata and quality scores.",
    icon: Database,
  },
  {
    title: "Secure Data Economy",
    description:
      "Encrypted storage with programmable access control (private, allowlist, subscription).",
    icon: Shield,
  },
  {
    title: "AI Composability",
    description:
      "Plug experience datasets directly into AI pipelines, knowledge bases, and benchmarking tools.",
    icon: Cpu,
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
    name: "Sui",
    description: "High-throughput ownership layer for experience assets.",
    logo: (
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-500/50 bg-blue-950/50 p-2 shadow-[0_0_15px_rgba(77,162,255,0.3)]">
        <img
          src="https://cdn.prod.website-files.com/6425f546844727ce5fb9e5ab/659d970f061dbfe7ca0e47c0_emblem-sui-w.svg"
          alt="Sui logo"
          className="h-full w-full object-contain"
        />
      </div>
    ),
  },
  {
    name: "Walrus",
    description: "Decentralized blob storage for encrypted task artifacts.",
    logo: (
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#97F0E5]/50 bg-[#97F0E5]/10 p-2 shadow-[0_0_15px_rgba(151,240,229,0.3)]">
        <img
          src="/logo/walrus.svg"
          alt="Walrus logo"
          className="h-full w-full object-contain"
        />
      </div>
    ),
  },
  {
    name: "Seal",
    description:
      "TEE-based encryption ensuring data privacy and access control.",
    logo: (
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#eaff7e]/50 bg-[#eaff7e]/10 p-2 shadow-[0_0_15px_rgba(234,255,126,0.3)]">
        <img
          src="https://cdn.prod.website-files.com/687615731a76518b8c27cf39/68761ce22a49c0f7365165e8_Group%202147263312%20(1).svg"
          alt="Seal logo"
          className="h-full w-full object-contain"
        />
      </div>
    ),
  },
  {
    name: "Enoki",
    description: "Account abstraction toolkit powering seamless wallet flows.",
    logo: (
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-purple-500/50 bg-purple-950/50 p-2 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
        <img
          src="https://framerusercontent.com/images/ArsS2u2lgqTlvUIhoRhdx3N37fs.png?width=1440&height=1016"
          alt="Enoki logo"
          className="h-full w-full object-contain"
        />
      </div>
    ),
  },
  {
    name: "Passkeys",
    description: "WebAuthn-native authentication for instant, secure sign-ins.",
    logo: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-green-500/50 bg-green-950/50 text-xs font-bold text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)]">
        PK
      </span>
    ),
  },
  {
    name: "Move",
    description: "Safe smart contracts enforcing asset ownership logic.",
    logo: (
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/50 bg-orange-950/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
        <MoveGlyph />
      </div>
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
    <main className="relative min-h-screen overflow-hidden cyber-bg text-white selection:bg-cyan-500/30 selection:text-cyan-100">
      <div className="scanline" />
      
      {/* Ambient Glows */}
      <div className="pointer-events-none absolute left-0 top-0 h-[500px] w-[500px] bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[500px] w-[500px] bg-purple-600/10 blur-[120px]" />

      <div className="relative flex min-h-screen flex-col">
        <nav className="sticky top-0 z-50 flex justify-center px-4 pt-6 pb-4">
          <NavBar />
        </nav>

        <section
          id="home"
          className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center gap-16 px-6 pb-24 pt-20 text-center md:flex-row md:items-end md:justify-between md:text-left"
        >
          <motion.div
            className="flex max-w-2xl flex-col items-center gap-8 md:items-start"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-4 py-1.5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
              </span>
              <span className="text-xs font-medium uppercase tracking-widest text-cyan-400">
                System Online
              </span>
            </div>

            <h1 className="glitch-text text-5xl font-bold leading-tight tracking-tight md:text-7xl" data-text="Turn Completed Tasks into Ownable Experience Assets">
              Turn Completed Tasks into Ownable Experience Assets
            </h1>
            
            <p className="max-w-xl text-lg text-gray-400 md:text-xl border-l-2 border-cyan-500/30 pl-6">
              Don't just get work done. <span className="text-cyan-400">Capture</span> execution knowledge, <span className="text-purple-400">encrypt</span> it, and <span className="text-cyan-400">trade</span> it in the decentralized experience economy.
            </p>
            <motion.div
              className="flex flex-col items-center gap-6 sm:flex-row md:items-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-none bg-cyan-500 px-8 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black transition-all hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer clip-path-polygon-[0_0,100%_0,95%_100%,0%_100%]"
                style={{ clipPath: "polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)" }}
              >
                <span className="relative z-10">Launch App</span>
              </Link>
              
              <Link
                href="#features"
                className="tech-border group inline-flex items-center gap-2 bg-black/50 px-8 py-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 backdrop-blur-sm transition-all hover:bg-cyan-950/30 cursor-pointer"
                style={{ clipPath: "polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)" }}
              >
                Explore Features
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
            <motion.div
              className="cyber-glass-card flex w-full flex-col gap-6 p-6 text-left md:flex-row md:items-center md:justify-between"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            >
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-500/70 mb-1">
                  // ASSETS_CREATED
                </p>
                <p className="text-3xl font-bold font-mono text-white">10,888</p>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-900 to-transparent md:h-12 md:w-px md:bg-gradient-to-b" />
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-500/70 mb-1">
                  // VALUE_TRADED
                </p>
                <p className="text-3xl font-bold font-mono text-white">$1.2M+</p>
              </div>
            </motion.div>
          </motion.div>
          
          <div className="relative hidden max-w-md flex-1 items-end justify-end md:flex">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-cyan-500/20 bg-cyan-500/5 blur-xl" />
            <div className="cyber-glass-card relative w-full p-8">
              {/* Decorative corner markers */}
              <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-cyan-500"></div>
              <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-cyan-500"></div>
              <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-cyan-500"></div>
              <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-cyan-500"></div>

              <div className="mb-8 border-b border-white/10 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-500">
                    Next Sprint Cycle
                  </p>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                </div>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Sui Mainnet Launch
                </h2>
              </div>
              <ul className="space-y-6 text-left">
                <li className="flex items-start gap-4 group">
                  <span className="mt-1.5 flex h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
                  <div>
                    <p className="font-mono text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      [CONTRACT_DEPLOY]
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Autogenerated checklist locked with Move guard rails.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4 group">
                  <span className="mt-1.5 flex h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]" />
                  <div>
                    <p className="font-mono text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                      [PRIZE_POOL_SYNC]
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      2,500 SUI staked and ready to unlock on completion.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4 group">
                  <span className="mt-1.5 flex h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
                  <div>
                    <p className="font-mono text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      [ROLLOUT_BRIEF]
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      AI summary auto-shared with 42 contributors.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* The Shift Section */}
        <section className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="grid gap-8 md:grid-cols-2">
            <motion.div 
              className="cyber-glass-card p-8 border-red-500/20"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"/>
                THE OLD WAY
              </h3>
              <p className="text-2xl font-mono text-gray-400">
                "Work done, money paid, <span className="text-white border-b-2 border-red-500/50">knowledge lost</span>."
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Execution data is trapped in private silos. No way to verify, reuse, or monetize experience.
              </p>
            </motion.div>

            <motion.div 
              className="cyber-glass-card p-8 border-cyan-500/20 bg-cyan-950/10"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"/>
                THE TASKOS WAY
              </h3>
              <p className="text-2xl font-mono text-white">
                "Work done, asset minted, <span className="text-cyan-400 border-b-2 border-cyan-500/50">knowledge monetized</span>."
              </p>
              <p className="mt-4 text-sm text-gray-400">
                Completed tasks become ownable data assets. Tradeable, verifiable, and reusable forever.
              </p>
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="mx-auto w-full max-w-7xl px-6 pb-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              From Task to <span className="text-cyan-400">Asset</span>
            </h2>
          </div>

          <div className="relative grid gap-8 md:grid-cols-4">
            {/* Connecting Line */}
            <div className="absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent hidden md:block" />

            {[
              { 
                title: "Create & Escrow", 
                desc: "Define task, lock rewards in smart contract.",
                icon: FileText,
                color: "text-gray-400"
              },
              { 
                title: "Capture & Mint", 
                desc: "Execution metadata packaged into NFT asset.",
                icon: Layers,
                color: "text-cyan-400"
              },
              { 
                title: "Encrypt & Store", 
                desc: "Raw data on Walrus, references on-chain.",
                icon: Lock,
                color: "text-purple-400"
              },
              { 
                title: "Trade & Access", 
                desc: "Buy access, decrypt, and reuse knowledge.",
                icon: RefreshCw,
                color: "text-green-400"
              }
            ].map((step, i) => (
              <motion.div 
                key={i}
                className="relative flex flex-col items-center text-center z-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
              >
                <div className={`h-24 w-24 rounded-full cyber-glass-card flex items-center justify-center mb-6 border-2 border-white/5 ${i === 1 ? 'border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)]' : ''}`}>
                  <step.icon className={`h-10 w-10 ${step.color}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 max-w-[200px]">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="h-px w-8 bg-cyan-500/50"></span>
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-500">
                System Capabilities
              </span>
              <span className="h-px w-8 bg-cyan-500/50"></span>
            </div>
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Ship faster with a workflow that <span className="text-cyan-400">understands teams</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {featureItems.map(({ title, description, icon: Icon }, index) => (
              <motion.div
                key={title}
                className="cyber-glass-card group p-8 transition-all hover:bg-white/5"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  ease: "easeOut",
                }}
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 group-hover:text-cyan-300 group-hover:border-cyan-400 transition-colors">
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="font-mono text-xs text-gray-600 group-hover:text-cyan-500/50 transition-colors">
                    0{index + 1}
                  </span>
                </div>
                
                <h3 className="mb-3 text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400 group-hover:text-gray-300">
                  {description}
                </p>
                
                {/* Decorative corner accents */}
                <div className="absolute top-0 right-0 h-0 w-0 border-t-[20px] border-r-[20px] border-t-transparent border-r-cyan-500/20 group-hover:border-r-cyan-500 transition-colors"></div>
              </motion.div>
            ))}
          </div>
        </section>

        <section
          id="tech"
          className="mx-auto w-full max-w-6xl px-6 pb-24 text-center md:text-left"
        >
          <div className="mx-auto max-w-3xl text-center md:text-left mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="h-px w-8 bg-purple-500/50"></span>
              <span className="text-xs font-mono uppercase tracking-widest text-purple-500">
                Infrastructure
              </span>
              <span className="h-px w-8 bg-purple-500/50"></span>
            </div>
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Built natively on <span className="text-[#4DA2FF]">SUI stack</span>, storage by <span className="text-[#97F0E5]">Walrus</span>, secured by <span className="text-[#eaff7e]">Seal</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {techStack.map(({ name, description, logo }, index) => (
              <motion.div
                key={name}
                className="tech-border bg-black/40 p-6 backdrop-blur-sm transition-all hover:bg-cyan-950/10"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  ease: "easeOut",
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center">
                    {logo}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-mono">
                      {name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section
          id="contact"
          className="mx-auto w-full max-w-6xl px-6 pb-28 md:pb-32"
        >
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              <span className="text-cyan-400">&lt;</span> Connect with the builders <span className="text-cyan-400">/&gt;</span>
            </h2>
          </div>

          <div className="mt-12 flex flex-col gap-8 rounded-none border border-white/10 bg-black/40 p-8 backdrop-blur-md md:flex-row md:gap-10 md:p-10 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 h-32 w-32 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 h-32 w-32 bg-purple-500/5 blur-3xl rounded-full pointer-events-none"></div>
            
            <div className="flex basis-1/2 flex-col gap-6 relative z-10">
              <div>
                <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider">
                  // NEWSLETTER_SUB
                </h3>
                <p className="mt-2 text-sm text-gray-400 md:text-base">
                  Product changelogs, feature previews, and governance proposals
                  delivered every Thursday.
                </p>
              </div>
              <form className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500 font-mono text-xs">&gt;</span>
                  <input
                    type="email"
                    required
                    placeholder="enter_email_address..."
                    className="h-12 w-full rounded-none border border-white/20 bg-black/60 pl-8 pr-5 text-sm font-mono text-white placeholder-gray-600 outline-none transition-all focus:border-cyan-500 focus:bg-black/80 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 rounded-none bg-cyan-950/50 border border-cyan-500/50 px-6 text-sm font-bold uppercase tracking-[0.25em] text-cyan-400 transition-all hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
                >
                  Notify
                </button>
              </form>
              <p className="text-[10px] font-mono text-gray-500">
                NO_SPAM_PROTOCOL_INITIATED. UNSUBSCRIBE_AVAILABLE.
              </p>
            </div>

            <div className="basis-1/2 space-y-6 relative z-10">
              <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider">
                // SOCIAL_UPLINK
              </h3>
              <div className="space-y-3">
                {socialLinks.map(({ label, href, icon: Icon, meta }) => (
                  <Link
                    key={label}
                    href={href}
                    className="group flex items-center justify-between border border-white/10 bg-black/40 px-5 py-4 text-left transition-all hover:border-cyan-500/50 hover:bg-cyan-950/10 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-10 w-10 items-center justify-center bg-black border border-white/20 text-gray-400 shadow-lg transition-all group-hover:border-cyan-500 group-hover:text-cyan-400 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-bold text-white group-hover:text-cyan-400 transition-colors">{label}</p>
                        <p className="text-xs font-mono text-gray-500 group-hover:text-cyan-500/50">{meta}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-600 group-hover:text-cyan-500 transition-colors">
                      Connect &gt;&gt;
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
