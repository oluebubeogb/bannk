"use client";

import { useMemo, useState } from "react";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

type Preset = "30d" | "month" | "lastMonth" | "custom";

function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (p === "month") {
    return { from: iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), to: iso(today) };
  }
  if (p === "lastMonth") {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
    return { from: iso(start), to: iso(end) };
  }
  return { from: iso(new Date(today.getTime() - 29 * 86400000)), to: iso(today) };
}

export function StatementPanel() {
  const [preset, setPreset] = useState<Preset>("30d");
  const [custom, setCustom] = useState(presetRange("30d"));
  const [busy, setBusy] = useState<"" | "pdf" | "csv" | "email">("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const range = useMemo(() => (preset === "custom" ? custom : presetRange(preset)), [preset, custom]);

  async function download(format: "pdf" | "csv") {
    setMsg(null);
    setBusy(format);
    try {
      const res = await fetch(`/api/statements?from=${range.from}&to=${range.to}&format=${format}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMsg({ kind: "err", text: d.error || "Couldn't generate statement" });
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const name = /filename="([^"]+)"/.exec(cd)?.[1] || `bannk-statement.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      setMsg({ kind: "err", text: "Network error" });
    } finally {
      setBusy("");
    }
  }

  async function email() {
    setMsg(null);
    setBusy("email");
    try {
      const res = await fetch("/api/statements/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: range.from, to: range.to }),
      });
      const d = await res.json().catch(() => ({}));
      setMsg(res.ok ? { kind: "ok", text: d.message || "Statement sent" } : { kind: "err", text: d.error || "Couldn't send" });
    } catch {
      setMsg({ kind: "err", text: "Network error" });
    } finally {
      setBusy("");
    }
  }

  const chip = (p: Preset, label: string) => (
    <button
      type="button"
      onClick={() => setPreset(p)}
      className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
        preset === p
          ? "bg-[var(--text)] text-[var(--surface)] border-[var(--text)]"
          : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section id="statement" className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-6 scroll-mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Statement</h2>
        <span className="text-xs text-[var(--text-muted)] tabular">
          {range.from} → {range.to}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {chip("30d", "Last 30 days")}
        {chip("month", "This month")}
        {chip("lastMonth", "Last month")}
        {chip("custom", "Custom")}
      </div>

      {preset === "custom" && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="text-xs text-[var(--text-muted)]">
            From
            <input
              type="date"
              value={custom.from}
              max={custom.to}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)]"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            To
            <input
              type="date"
              value={custom.to}
              min={custom.from}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)]"
            />
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => download("pdf")}
          disabled={!!busy}
          className="h-11 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] text-sm font-semibold disabled:opacity-60"
        >
          {busy === "pdf" ? "Preparing…" : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={email}
          disabled={!!busy}
          className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium disabled:opacity-60"
        >
          {busy === "email" ? "Sending…" : "Email me this statement"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => download("csv")}
        disabled={!!busy}
        className="mt-2 w-full h-9 text-xs text-[var(--text-muted)] underline-offset-2 hover:underline disabled:opacity-60"
      >
        {busy === "csv" ? "Preparing CSV…" : "Download as CSV instead"}
      </button>

      {msg && (
        <p className={`mt-2 text-sm ${msg.kind === "ok" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{msg.text}</p>
      )}
    </section>
  );
}
