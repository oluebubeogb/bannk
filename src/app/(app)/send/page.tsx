"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SendPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const amountMajor = parseFloat(amount);
    if (isNaN(amountMajor) || amountMajor <= 0) {
      setError("Enter a valid amount");
      setLoading(false);
      return;
    }
    const amountMinor = Math.round(amountMajor * 100);

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUsername: username.trim().toLowerCase(),
          amountMinor,
          note: note || undefined,
          currency: "NGN",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Transfer failed");
        return;
      }
      setSuccess("Sent. Opening your receipt…");
      router.push(`/receipt/${data.transactionId}?new=1`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <h1 className="text-xl font-bold mb-6">Send credits</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">
            Recipient username
          </label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
            placeholder="amara"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Amount</label>
          <div className="relative">
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-12 px-4 pr-16 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] tabular"
              placeholder="0.00"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
              NGN
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">
            Note (optional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            className="w-full h-12 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
            placeholder="For the community challenge"
          />
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {success && <p className="text-sm text-[var(--success)]">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </form>

      <p className="text-xs text-center text-[var(--text-muted)] mt-6">
        Virtual credits only. Transfers are instant and final within Bannk.
      </p>
    </div>
  );
}
