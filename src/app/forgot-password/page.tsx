"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, KeyRound } from "lucide-react";
import { IconCircle, Logo } from "@/components/kit";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("email");
    if (e) setEmail(e);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || "Something went wrong");
      if (d.devResetKey) {
        router.push(`/reset-password?email=${encodeURIComponent(email)}&dev=${encodeURIComponent(d.devResetKey)}`);
        return;
      }
      setInfo(d.message || "Check your inbox for a reset WordKey.");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-5 pt-10 pb-8 safe-top safe-bottom max-w-md mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link href="/login" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          <ArrowLeft size={16} /> Sign in
        </Link>
        <Logo size={30} />
      </div>
      <IconCircle icon={KeyRound} tone="sun" size={52} />
      <h1 className="text-2xl font-bold mt-4 mb-1">Forgot password?</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">
        Enter your email and we&apos;ll send a Nigerian-flavoured WordKey to reset it. It expires in 30 minutes.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Email</label>
          <div className="relative">
            <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
              placeholder="you@example.com"
            />
          </div>
        </div>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {info && <p className="text-sm text-[var(--success)]">{info}</p>}
        <button
          type="submit"
          disabled={loading}
          className="press w-full h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--on-accent)] font-semibold disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send reset WordKey"}
        </button>
      </form>
      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        Already have a key?{" "}
        <Link href={`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-[var(--accent-ink)]">
          Reset now
        </Link>
      </p>
    </div>
  );
}
