"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/home", label: "Home", icon: "⌂" },
  { href: "/wallet", label: "Wallet", icon: "◎" },
  { href: "/exchange", label: "Exchange", icon: "↗" },
  { href: "/discover", label: "Discover", icon: "◈" },
  { href: "/profile", label: "Profile", icon: "●" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur safe-bottom">
      <div className="max-w-lg mx-auto flex items-stretch h-16">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs ${
                active ? "text-[var(--accent-ink)]" : "text-[var(--text-muted)]"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
