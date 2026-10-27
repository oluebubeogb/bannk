"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function formatMoney(minor: number, currency: string) {
  const value = minor / 100;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        <div className="h-28 rounded-2xl bg-[var(--surface)] animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const allowance = data.allowance;
  const remainingPct =
    allowance?.capMinor > 0
      ? Math.round(((allowance.capMinor - allowance.usedMinor) / allowance.capMinor) * 100)
      : 100;

  return (
    <div className="px-5 pt-8 pb-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-[var(--text-muted)]">Welcome back</p>
          <h1 className="text-xl font-bold">{data.displayName || data.username}</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-sm font-semibold text-[var(--accent-ink)]">
          {(data.displayName || data.username || "?").charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Balance card */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-4">
        <p className="text-sm text-[var(--text-muted)] mb-1">Available balance</p>
        <p className="text-3xl font-bold tabular tracking-tight mb-4">
          {formatMoney(data.balanceMinor ?? 0, data.homeCurrency)}
        </p>
        <div className="flex gap-3">
          <Link
            href="/send"
            className="flex-1 h-11 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold text-sm flex items-center justify-center"
          >
            Send
          </Link>
          <Link
            href="/wallet"
            className="flex-1 h-11 rounded-xl border border-[var(--border)] text-sm font-medium flex items-center justify-center"
          >
            History
          </Link>
        </div>
      </div>

      {/* Weekly allowance */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">This week&apos;s allowance</p>
          <span className="text-xs text-[var(--text-muted)]">
            {remainingPct}% left
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--bg)] overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${remainingPct}%` }}
          />
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Cap {formatMoney(allowance?.capMinor ?? 0, data.homeCurrency)} · Resets weekly
        </p>
      </div>

      {/* Community */}
      <Link
        href="/community"
        className="flex items-center justify-between rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-6"
      >
        <div>
          <p className="text-sm font-medium">Community</p>
          <p className="text-xs text-[var(--text-muted)]">Challenges, groups &amp; leaderboards</p>
        </div>
        <span className="text-[var(--accent-ink)] text-sm font-medium">Open →</span>
      </Link>

      <p className="text-xs text-center text-[var(--text-muted)]">
        All balances are simulated virtual credits.
      </p>
    </div>
  );
}
