"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wordKey, setWordKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pending = sessionStorage.getItem("bannk_pending_email");
    if (pending) setEmail(pending);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, wordKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }
      sessionStorage.removeItem("bannk_pending_email");
      router.push("/home");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-5 pt-10 pb-8 safe-top safe-bottom max-w-md mx-auto">
      <Link href="/register" className="text-sm text-[var(--text-muted)] mb-8">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold mb-1">Verify with WordKey</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">
        Enter the four-word African-origin phrase we sent you.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">WordKey</label>
          <input
            required
            value={wordKey}
            onChange={(e) => setWordKey(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-mono tracking-wide"
            placeholder="ubuntu-sankofa-harambee-asante"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-[var(--accent)] text-[var(--bg)] font-semibold disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify & enter Bannk"}
        </button>
      </form>
    </div>
  );
}
