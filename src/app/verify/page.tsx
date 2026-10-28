"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/kit";

export default function VerifyPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wordKey, setWordKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("email");
    const pending = fromUrl || sessionStorage.getItem("bannk_pending_email");
    if (pending) setEmail(pending);
  }, []);

  async function resend() {
    setError("");
    setInfo("");
    if (!email) {
      setError("Enter your email first");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Couldn't resend");
      else setInfo(data.devWordKey ? `Dev WordKey: ${data.devWordKey}` : data.message);
    } catch {
      setError("Network error");
    } finally {
      setResending(false);
    }
  }

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
      <div className="flex items-center justify-between mb-8">
        <Link href="/register" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          <ArrowLeft size={16} /> Back
        </Link>
        <Logo size={30} />
      </div>
      <h1 className="text-2xl font-bold mb-1">Verify with WordKey</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">
        Enter the four-word Nigerian-flavoured WordKey we emailed you. Capital letters don&apos;t matter.
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
            placeholder="jollof-kaduna-ikenna-suya"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {info && <p className="text-sm text-[var(--success)]">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify & enter Bannk"}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={resending}
          className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium disabled:opacity-60"
        >
          {resending ? "Sending…" : "Resend WordKey"}
        </button>
      </form>
    </div>
  );
}
