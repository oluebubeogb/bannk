"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      router.push("/home");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-5 pt-10 pb-8 safe-top safe-bottom max-w-md mx-auto">
      <Link href="/" className="text-sm text-[var(--text-muted)] mb-8">
        ← Back
      </Link>
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
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Password</label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
          />
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-[var(--accent)] text-[var(--bg)] font-semibold disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        No account?{" "}
        <Link href="/register" className="text-[var(--accent)]">
          Create one
        </Link>
      </p>
    </div>
  );
}
