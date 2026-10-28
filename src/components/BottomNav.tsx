"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, WalletCards, ArrowLeftRight, Compass, CircleUserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const items: { href: string; label: string; icon: LucideIcon; bg: string; fg: string }[] = [
  { href: "/home", label: "Home", icon: House, bg: "linear-gradient(140deg,#e4fb98,#c5f63a)", fg: "#2f4a00" },
  { href: "/wallet", label: "Wallet", icon: WalletCards, bg: "linear-gradient(140deg,#e1efff,#c4ddff)", fg: "#1b4f9c" },
  { href: "/exchange", label: "Exchange", icon: ArrowLeftRight, bg: "linear-gradient(140deg,#ffeadb,#ffd2b0)", fg: "#9a4410" },
  { href: "/discover", label: "Discover", icon: Compass, bg: "linear-gradient(140deg,#efe6ff,#dacbff)", fg: "#5a2fb0" },
  { href: "/profile", label: "Profile", icon: CircleUserRound, bg: "linear-gradient(140deg,#d9f5e5,#b7ebcd)", fg: "#145c34" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 safe-bottom pointer-events-none">
      <div className="max-w-lg mx-auto px-3 pb-2 pointer-events-auto">
        <div className="flex items-stretch h-[68px] rounded-[26px] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_10px_30px_-12px_rgba(22,24,29,.25)]">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="group flex-1 flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px]"
              >
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 ${
                    active ? "shadow-[0_4px_12px_-4px_rgba(22,24,29,.35)] ring-2 ring-white" : "opacity-80 saturate-[.85] group-hover:opacity-100 group-hover:saturate-100"
                  }`}
                  style={{ background: item.bg, color: item.fg }}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className={active ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]"}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
