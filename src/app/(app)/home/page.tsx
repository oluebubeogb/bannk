"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, History, QrCode, Users, ArrowLeftRight, Compass, Gauge, ChevronRight, ShieldCheck } from "lucide-react";
import { fmt, fmtDate } from "@/components/ui";
import { EyeToggle, IconCircle, InfoTip, Logo, maskMoney, useBalanceVisible } from "@/components/kit";

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { visible, toggle } = useBalanceVisible();

  useEffect(() => {
    fetch("/api/me")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="px-5 pt-8">
        <div className="h-8 w-32 rounded bg-[var(--surface)] animate-pulse mb-6" />
        <div className="h-40 rounded-3xl bg-[var(--surface)] animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const allowance = data.allowance;
  const remainingPct =
    allowance?.capMinor > 0 ? Math.max(0, Math.round(((allowance.capMinor - allowance.usedMinor) / allowance.capMinor) * 100)) : 100;
  const name = data.displayName || data.username;

  const actions = [
    { href: "/send", label: "Send", icon: Send, tone: "lime" as const },
    { href: "/exchange#receive", label: "Receive", icon: QrCode, tone: "sky" as const },
    { href: "/wallet", label: "History", icon: History, tone: "peach" as const },
    { href: "/exchange", label: "Exchange", icon: ArrowLeftRight, tone: "lilac" as const },
  ];

  return (
    <div className="px-5 pt-6 pb-6">
      <header className="flex items-center justify-between mb-6">
        <Logo size={34} />
        <Link
          href="/profile"
          aria-label="Profile"
          className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-sm flex items-center justify-center text-sm font-semibold text-[var(--accent-ink)] hover:scale-105 transition"
        >
          {(name || "?").charAt(0).toUpperCase()}
        </Link>
      </header>

      <p className="text-sm text-[var(--text-muted)]">Welcome back</p>
      <h1 className="text-xl font-bold mb-4">{name}</h1>

      {/* Balance card */}
      <div className="hero-gradient relative overflow-hidden rounded-3xl p-5 mb-4 shadow-[0_18px_40px_-18px_rgba(79,122,6,.55)]">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/30 blur-2xl" aria-hidden />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-[#2f4a00]/80 font-medium">Available balance</p>
            <EyeToggle visible={visible} onToggle={toggle} />
          </div>
          <p className="text-[34px] leading-tight font-bold tabular tracking-tight text-[var(--text)] mb-5" aria-live="polite">
            {maskMoney(data.balanceMinor ?? 0, data.homeCurrency, visible)}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {actions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="tile press flex flex-col items-center gap-1.5 rounded-2xl bg-white/60 hover:bg-white/85 backdrop-blur py-2.5 text-xs font-medium transition"
              >
                <IconCircle icon={a.icon} tone={a.tone} size={36} />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly allowance */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <IconCircle icon={Gauge} tone="sun" size={32} />
            <p className="text-sm font-medium">This week&apos;s allowance</p>
            <InfoTip label="Allowance details">
              Cap {fmt(allowance?.capMinor ?? 0, data.homeCurrency)} · Resets weekly
              {allowance?.periodEnd ? ` (next: ${fmtDate(allowance.periodEnd)})` : ""}
            </InfoTip>
          </div>
          <span className="text-xs font-semibold text-[var(--accent-ink)]">{remainingPct}% left</span>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#a6d81f] to-[var(--accent)] transition-all"
            style={{ width: `${remainingPct}%` }}
          />
        </div>
      </div>

      {!data.hasPin && (
        <Link
          href="/profile#security"
          className="tile flex items-center gap-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-4"
        >
          <IconCircle icon={ShieldCheck} tone="rose" size={38} />
          <div className="flex-1">
            <p className="text-sm font-medium">Set your transaction PIN</p>
            <p className="text-xs text-[var(--text-muted)]">You&apos;ll need a 4-digit PIN before your first transfer.</p>
          </div>
          <ChevronRight size={18} className="text-[var(--text-muted)]" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/community" className="tile rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
          <IconCircle icon={Users} tone="mint" size={38} />
          <p className="text-sm font-medium mt-3">Community</p>
          <p className="text-xs text-[var(--text-muted)]">Challenges, groups &amp; leaderboards</p>
        </Link>
        <Link href="/discover" className="tile rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
          <IconCircle icon={Compass} tone="lilac" size={38} />
          <p className="text-sm font-medium mt-3">Discover</p>
          <p className="text-xs text-[var(--text-muted)]">Businesses &amp; campaigns</p>
        </Link>
      </div>
    </div>
  );
}
