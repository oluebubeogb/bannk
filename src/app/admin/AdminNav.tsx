"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/businesses", label: "Businesses" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/challenges", label: "Challenges" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="max-w-6xl mx-auto px-5 flex gap-1 overflow-x-auto text-sm">
      {items.map((i) => {
        const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`px-3 py-2.5 whitespace-nowrap border-b-2 -mb-px ${
              active
                ? "border-[var(--accent)] text-[var(--text)] font-semibold"
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
