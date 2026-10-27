"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/business", label: "Profile" },
  { href: "/business/listings", label: "Listings" },
  { href: "/business/campaigns", label: "Campaigns" },
];

export function BusinessNav() {
  const pathname = usePathname();
  return (
    <nav className="max-w-5xl mx-auto px-5 flex gap-1 text-sm">
      {items.map((i) => {
        const active = i.href === "/business" ? pathname === "/business" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`px-3 py-2.5 border-b-2 -mb-px ${
              active
                ? "border-[var(--accent)] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
