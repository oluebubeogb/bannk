"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { IconCircle, Logo, PasswordInput } from "@/components/kit";

const inputCls = "w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resetKey, setResetKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [devKey, setDevKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("email")) setEmail(q.get("email")!);
    if (q.get("dev")) setDevKey(q.get("dev")!);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords don't match");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetKey, newPassword: password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || "Reset failed");
      router.push(`/login?reset=1`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-5 pt-10 pb-8 safe-top safe-bottom max-w-md mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link href="/forgot-password" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          <ArrowLeft size={16} /> Back
        </Link>
        <Logo size={30} />
      </div>
      <IconCircle icon={LockKeyhole} tone="ink" size={52} />
      <h1 className="text-2xl font-bold mt-4 mb-1">Set a new password</h1>
      <p className="text-[var(--text-muted)] text-sm mb-6">
        Enter the reset WordKey from your email (capital letters don&apos;t matter) and choose a new password. You&apos;ll be signed out everywhere.
      </p>
      {devKey && (
        <div className="rounded-xl bg-[var(--surface)] border border-dashed border-[var(--border)] p-3 mb-4 text-xs">
          Dev mode — reset WordKey: <code className="font-mono text-[var(--accent-ink)]">{devKey}</code>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Email</label>
          <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Reset WordKey</label>
          <input
            required
            value={resetKey}
            onChange={(e) => setResetKey(e.target.value)}
            className={`${inputCls} font-mono tracking-wide`}
            placeholder="jollof-kaduna-ikenna-suya"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">New password</label>
          <PasswordInput required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Confirm new password</label>
          <PasswordInput required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
        </div>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="press w-full h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--on-accent)] font-semibold disabled:opacity-60"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
