"use client";

import Link from "next/link";

export default function NavBar() {
  return (
    <div className="flex w-full max-w-6xl items-center justify-between rounded-4xl border border-white/20 bg-[#071311]/95 px-6 py-3 text-[#CAEAE5] shadow-xl backdrop-blur">
      <Link
        href="#home"
        className="px-3 text-xl font-semibold tracking-tight text-[#CAEAE5] transition hover:text-white"
      >
        TaskOS
      </Link>

      <div className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-[0.25em] md:flex">
        <Link href="#home" className="transition hover:text-white">
          Home
        </Link>
        <Link href="#features" className="transition hover:text-white">
          Features
        </Link>
        <Link href="#tech" className="transition hover:text-white">
          Tech
        </Link>
        <Link href="#contact" className="transition hover:text-white">
          Contact
        </Link>
      </div>

      <div className="px-3">
        <Link
          href="/dashboard"
          className="rounded-full bg-[#CAEAE5] px-4 py-2 text-sm font-semibold text-[#071311] transition hover:bg-[#0b201c] hover:text-[#CAEAE5]"
        >
          Launch App
        </Link>
      </div>
    </div>
  );
}
