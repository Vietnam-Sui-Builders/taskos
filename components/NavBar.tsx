"use client";

import Link from "next/link";

export default function NavBar() {
  return (
    <div className="flex w-full max-w-6xl items-center justify-between rounded-full border border-white/10 bg-black/60 px-6 py-3 text-gray-300 shadow-xl backdrop-blur-md transition-all hover:border-cyan-500/30 hover:bg-black/80">
      <Link
        href="#home"
        className="px-3 text-xl font-bold tracking-tight text-white transition hover:text-cyan-400 cursor-pointer font-mono"
      >
        TaskOS
      </Link>

      <div className="hidden items-center gap-8 text-xs font-bold uppercase tracking-[0.25em] md:flex">
        <Link href="#home" className="transition hover:text-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.4)] cursor-pointer">
          Home
        </Link>
        <Link href="#features" className="transition hover:text-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.4)] cursor-pointer">
          Features
        </Link>
        <Link href="#tech" className="transition hover:text-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.4)] cursor-pointer">
          Tech
        </Link>
        <Link href="#contact" className="transition hover:text-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.4)] cursor-pointer">
          Contact
        </Link>
      </div>

      <div className="px-3">
        <Link
          href="/dashboard"
          className="rounded-full border border-cyan-500/50 bg-cyan-950/30 px-6 py-2 text-sm font-bold text-cyan-400 transition hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] cursor-pointer"
        >
          Launch App
        </Link>
      </div>
    </div>
  );
}
