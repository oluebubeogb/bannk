"use client";

import { useEffect, useState } from "react";
import { QrCode, Copy, Check, Download, Share2, X, Clock, FileText } from "lucide-react";
import { api, fmt, fmtDate, inputCls, Badge } from "./ui";
import { IconCircle, SectionTitle } from "./kit";

type Req = {
  token: string;
  amountMinor: number;
  currency: string;
  note: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  url: string;
  qrUrl: string;
  payee: { username: string; displayName: string | null };
};

/** Receive payment: amount + description → sleek invoice with a branded QR and a copyable /pay link. */
export function ReceivePanel() {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [current, setCurrent] = useState<Req | null>(null);
  const [list, setList] = useState<Req[]>([]);
  const [copied, setCopied] = useState(false);

  const loadList = () =>
    api<{ requests: Req[] }>("/api/payment-requests")
      .then((d) => setList(d.requests))
      .catch(() => {});
  useEffect(() => {
    loadList();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const n = parseFloat(amount.replace(/,/g, ""));
    if (!isFinite(n) || n <= 0) return setErr("Enter an amount");
    setBusy(true);
    try {
      const d = await api<{ request: Req }>("/api/payment-requests", {
        method: "POST",
        json: { amountMinor: Math.round(n * 100), note: note.trim() || undefined, expiresInDays: days },
      });
      setCurrent(d.request);
      setAmount("");
      setNote("");
      loadList();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link:", text);
    }
  }

  async function share(r: Req) {
    const text = `Pay ${fmt(r.amountMinor, r.currency)} to @${r.payee.username} on Bannk${r.note ? ` — ${r.note}` : ""}`;
    const nav: any = navigator;
    if (nav.share) {
      try {
        await nav.share({ title: "Bannk payment request", text, url: r.url });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }
    copy(`${text}\n${r.url}`);
  }

  async function cancel(r: Req) {
    if (!confirm("Cancel this payment request?")) return;
    try {
      await api(`/api/payment-requests/${r.token}`, { method: "DELETE" });
      if (current?.token === r.token) setCurrent(null);
      loadList();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <section id="receive" className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-5 scroll-mt-6">
      <SectionTitle icon={QrCode} tone="sky">
        Receive a payment
      </SectionTitle>

      {current ? (
        <div className="pop-in">
          <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--cream)] to-white p-4 text-center">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--text-muted)]">PAYMENT REQUEST</p>
            <p className="text-3xl font-bold tabular mt-1">{fmt(current.amountMinor, current.currency)}</p>
            {current.note && <p className="text-sm text-[var(--text-muted)] mt-1">{current.note}</p>}
            <p className="text-sm font-semibold mt-1">to @{current.payee.username}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.qrUrl} alt="Payment request QR code" className="mx-auto mt-3 w-56 h-auto rounded-2xl" />
            {current.expiresAt && (
              <p className="flex items-center justify-center gap-1 text-xs text-[var(--text-muted)] mt-2">
                <Clock size={12} /> Valid until {fmtDate(current.expiresAt)}
              </p>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 h-10 text-xs">
            <span className="flex-1 truncate font-mono">{current.url}</span>
            <button type="button" onClick={() => copy(current.url)} aria-label="Copy link" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button type="button" onClick={() => share(current)} className="press h-10 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--on-accent)] text-sm font-semibold inline-flex items-center justify-center gap-1.5">
              <Share2 size={15} /> Share
            </button>
            <a href={`${current.qrUrl}?download=1`} download className="press h-10 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-2)] text-sm font-medium inline-flex items-center justify-center gap-1.5">
              <Download size={15} /> QR
            </a>
            <button type="button" onClick={() => setCurrent(null)} className="press h-10 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-2)] text-sm font-medium">
              New
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={create} className="space-y-3">
          <div className="relative">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Amount"
              className={`${inputCls} h-12 text-lg font-semibold tabular pr-14`}
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">NGN</span>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="Description (e.g. Ankara fabric, 2 yards)" className={inputCls} />
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Clock size={13} /> Valid for
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`h-7 px-2.5 rounded-full border text-xs font-medium ${days === d ? "bg-[var(--text)] text-white border-[var(--text)]" : "border-[var(--border)] bg-[var(--surface)]"}`}
              >
                {d === 1 ? "1 day" : `${d} days`}
              </button>
            ))}
          </div>
          {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
          <button disabled={busy} className="press w-full h-11 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--on-accent)] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
            <QrCode size={16} /> {busy ? "Creating…" : "Create QR & link"}
          </button>
        </form>
      )}

      {list.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Recent requests</p>
          <div className="space-y-2">
            {list.slice(0, 5).map((r) => (
              <div key={r.token} className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2">
                <IconCircle icon={FileText} tone={r.status === "paid" ? "mint" : "sun"} size={30} />
                <button type="button" className="flex-1 min-w-0 text-left" onClick={() => r.status === "open" && setCurrent(r)}>
                  <p className="text-sm font-semibold tabular">{fmt(r.amountMinor, r.currency)}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{r.note || fmtDate(r.createdAt)}</p>
                </button>
                <Badge tone={r.status === "paid" ? "completed" : r.status === "open" ? "open" : "ended"}>{r.status}</Badge>
                {r.status === "open" && (
                  <button type="button" onClick={() => cancel(r)} aria-label="Cancel request" className="text-[var(--text-muted)] hover:text-[var(--danger)]">
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
