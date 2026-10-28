"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Logo, PasswordInput } from "@/components/kit";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "1") setNotice("Password updated — sign in with your new password.");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsVerification) {
          sessionStorage.setItem("bannk_pending_email", email);
          router.push("/verify");
          return;
        }
        setError(data.error || "Login failed");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/home");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-5 pt-10 pb-8 safe-top safe-bottom max-w-md mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          <ArrowLeft size={16} /> Back
        </Link>
        <Logo size={30} />
      </div>
      <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">Sign in to your Bannk account</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm text-[var(--text-muted)]">Password</label>
            <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-xs font-medium text-[var(--accent-ink)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
          />
        </div>

        {notice && <p className="text-sm text-[var(--success)]">{notice}</p>}
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="press w-full h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--on-accent)] font-semibold disabled:opacity-60 shadow-[0_10px_24px_-12px_rgba(79,122,6,.7)]"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        No account?{" "}
        <Link href="/register" className="text-[var(--accent-ink)]">
          Create one
        </Link>
      </p>
    </div>
  );
}
