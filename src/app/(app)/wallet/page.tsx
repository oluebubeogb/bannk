"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatementPanel } from "@/components/StatementPanel";

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

export default function WalletPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallets")
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
        <div className="h-8 w-40 rounded bg-[var(--surface)] animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const wallet = data.wallets?.[0];

  return (
    <div className="px-5 pt-8 pb-6">
      <h1 className="text-xl font-bold mb-6">Wallet</h1>

      {wallet && (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-6">
          <p className="text-sm text-[var(--text-muted)] mb-1">{wallet.currencyCode}</p>
          <p className="text-2xl font-bold tabular">
            {formatMoney(wallet.balanceMinor, wallet.currencyCode)}
          </p>
        </div>
      )}

      <StatementPanel />

      <h2 className="text-sm font-medium text-[var(--text-muted)] mb-3">Recent activity</h2>
      <div className="space-y-2">
        {(data.transactions || []).length === 0 && (
          <p className="text-sm text-[var(--text-muted)] py-8 text-center">
            No transactions yet
          </p>
        )}
        {(data.transactions || []).map((tx: any) => (
          <Link
            href={`/receipt/${tx.id}`}
            key={tx.id + tx.direction}
            className="flex items-center justify-between rounded-xl bg-[var(--surface)] border border-[var(--border)] px-4 py-3 hover:border-[var(--text-muted)] transition-colors"
          >
            <div>
              <p className="text-sm font-medium capitalize">{tx.type}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {new Date(tx.createdAt).toLocaleString()}
              </p>
              {tx.note && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{tx.note}</p>
              )}
            </div>
            <p
              className={`text-sm font-semibold tabular ${
                tx.direction === "credit" ? "text-[var(--success)]" : "text-[var(--text)]"
              }`}
            >
              {tx.direction === "credit" ? "+" : "−"}
              {formatMoney(tx.amountMinor, tx.currency)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
