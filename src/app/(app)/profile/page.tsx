"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [qr, setQr] = useState<any>(null);

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
      });
    fetch("/api/qr")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setQr(d);
      });
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!data) {
    return (
      <div className="px-5 pt-8">
        <div className="h-24 rounded-2xl bg-[var(--surface)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <h1 className="text-xl font-bold mb-6">Profile</h1>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-5 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-2xl font-bold text-[var(--accent-ink)] mx-auto mb-3">
          {(data.displayName || data.username || "?").charAt(0).toUpperCase()}
        </div>
        <p className="text-lg font-semibold">{data.displayName}</p>
        <p className="text-sm text-[var(--accent-ink)]">@{data.username}</p>
        <p className="text-xs text-[var(--text-muted)] mt-2">{data.email}</p>
        <Link
          href={`/u/${data.username}`}
          className="inline-block mt-3 text-xs text-[var(--text-muted)] underline"
        >
          Public profile
        </Link>
      </div>

      {qr && (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-5 text-center">
          <p className="text-sm font-medium mb-3">Your QR identity</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr.qrDataUrl}
            alt="Profile QR"
            className="mx-auto rounded-xl w-48 h-48 bg-white"
          />
          <p className="text-xs text-[var(--text-muted)] mt-3 break-all">{qr.url}</p>
        </div>
      )}

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--border)] mb-6">
        <div className="px-4 py-3 flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Home currency</span>
          <span className="font-medium">{data.homeCurrency}</span>
        </div>
        <div className="px-4 py-3 flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Visibility</span>
          <span className="font-medium capitalize">{data.visibility}</span>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Link
          href="/send"
          className="flex-1 h-11 rounded-xl border border-[var(--border)] text-sm font-medium flex items-center justify-center"
        >
          Send
        </Link>
        <Link
          href="/wallet"
          className="flex-1 h-11 rounded-xl border border-[var(--border)] text-sm font-medium flex items-center justify-center"
        >
          Wallet
        </Link>
      </div>

      <Link
        href="/wallet#statement"
        className="w-full h-11 mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium flex items-center justify-center"
      >
        Statements &amp; receipts
      </Link>

      <button
        onClick={logout}
        className="w-full h-12 rounded-xl border border-[var(--border)] text-[var(--danger)] font-medium"
      >
        Sign out
      </button>
    </div>
  );
}
