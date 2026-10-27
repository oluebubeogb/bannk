"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
    homeCurrency: "NGN",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devKey, setDevKey] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Registration failed");
        return;
      }
      if (data.devWordKey) setDevKey(data.devWordKey);
      // Store email for verify step
      sessionStorage.setItem("bannk_pending_email", form.email);
      if (!data.devWordKey) {
        router.push("/verify");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (devKey) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-5 safe-top safe-bottom">
        <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6">
          <h1 className="text-xl font-bold mb-2">Check your WordKey</h1>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            In development the WordKey is shown here. In production it is emailed.
          </p>
          <div className="rounded-xl bg-[var(--bg)] border border-[var(--border)] p-4 mb-6 text-center">
            <code className="text-[var(--accent-ink)] text-lg font-mono tracking-wide">{devKey}</code>
          </div>
          <button
            onClick={() => router.push("/verify")}
            className="w-full h-12 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
          >
            Continue to verify
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col px-5 pt-10 pb-8 safe-top safe-bottom max-w-md mx-auto">
      <Link href="/" className="text-sm text-[var(--text-muted)] mb-8">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold mb-1">Create account</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">
        Join the virtual economy. No real money involved.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 flex-1">
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Username</label>
          <input
            required
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_]+"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
            placeholder="amara"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Password</label>
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Home currency</label>
          <select
            value={form.homeCurrency}
            onChange={(e) => setForm({ ...form, homeCurrency: e.target.value })}
            className="w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
          >
            <option value="NGN">NGN — Nigerian Naira</option>
            <option value="GHS">GHS — Ghanaian Cedi</option>
            <option value="KES">KES — Kenyan Shilling</option>
            <option value="ZAR">ZAR — South African Rand</option>
            <option value="USD">USD — US Dollar</option>
          </select>
        </div>

        {error && (
          <p className="text-sm text-[var(--danger)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold disabled:opacity-60 mt-2"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent-ink)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
