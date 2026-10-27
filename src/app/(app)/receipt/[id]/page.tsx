"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Party = { username: string; displayName: string | null } | null;
type Receipt = {
  id: string;
  reference: string;
  type: string;
  status: string;
  amountMinor: number;
  currency: string;
  note: string | null;
  createdAt: string;
  sender: Party;
  recipient: Party;
  direction: "sent" | "received" | "credit" | "debit";
};

function formatMoney(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

function title(r: Receipt) {
  if (r.direction === "sent") return "Transfer sent";
  if (r.direction === "received") return "Transfer received";
  if (r.type === "allowance") return "Allowance credited";
  if (r.type === "trade") return r.direction === "credit" ? "Exchange sale" : "Exchange purchase";
  return r.direction === "credit" ? "Credit" : "Debit";
}

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-[var(--text-muted)] shrink-0">{label}</span>
      <span className={`text-right font-medium break-all ${mono ? "font-mono text-xs tracking-wide pt-0.5" : ""}`}>
        {children}
      </span>
    </div>
  );
}

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [toast, setToast] = useState("");
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    setIsNew(new URLSearchParams(window.location.search).get("new") === "1");
    fetch(`/api/transfers/${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (r.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(`/receipt/${id}`)}`);
          return;
        }
        const d = await r.json();
        if (!r.ok) {
          setError({ status: r.status, message: d.error || "Couldn't load receipt" });
          return;
        }
        setReceipt(d.receipt);
        setShareUrl(d.shareUrl || window.location.origin + `/receipt/${id}`);
      })
      .catch(() => setError({ status: 0, message: "Network error" }));
  }, [id, router]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function summary(r: Receipt) {
    const who =
      r.direction === "sent"
        ? `to @${r.recipient?.username}`
        : r.direction === "received"
          ? `from @${r.sender?.username}`
          : "";
    return `Bannk receipt — ${title(r)} ${formatMoney(r.amountMinor, r.currency)} ${who}`.trim() +
      `\nRef: ${r.reference}\n${new Date(r.createdAt).toLocaleString()}` +
      (r.note ? `\nNote: ${r.note}` : "") +
      `\nVirtual credits only — no cash value.`;
  }

  async function share() {
    if (!receipt) return;
    const text = summary(receipt);
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Bannk receipt", text, url: shareUrl });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }
    await copy(`${text}\n${shareUrl}`, "Receipt copied");
  }

  async function copy(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(msg);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  if (error) {
    return (
      <div className="px-5 pt-16 pb-6 text-center">
        <p className="text-4xl mb-4">{error.status === 403 ? "🔒" : "🧾"}</p>
        <h1 className="text-lg font-bold mb-2">
          {error.status === 403 ? "This receipt isn't yours" : "Receipt unavailable"}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">{error.message}</p>
        <Link href="/wallet" className="inline-flex h-11 px-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium items-center">
          Back to wallet
        </Link>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="px-5 pt-8">
        <div className="h-48 rounded-2xl bg-[var(--surface)] animate-pulse mb-4" />
        <div className="h-64 rounded-2xl bg-[var(--surface)] animate-pulse" />
      </div>
    );
  }

  const incoming = receipt.direction === "received" || receipt.direction === "credit";
  const d = new Date(receipt.createdAt);

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center justify-between mb-5">
        <Link href="/wallet" className="text-sm text-[var(--text-muted)]">← Wallet</Link>
        <span className="text-xs font-medium text-[var(--text-muted)]">Receipt</span>
      </div>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden mb-4">
        <div className="px-5 pt-7 pb-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--accent)] text-[var(--on-accent)] flex items-center justify-center mx-auto mb-4 text-2xl font-bold" aria-hidden>
            ✓
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-1">
            {isNew && receipt.direction === "sent" ? "Sent successfully" : title(receipt)}
          </p>
          <p className={`text-3xl font-bold tabular tracking-tight ${incoming ? "text-[var(--success)]" : ""}`}>
            {incoming ? "+" : "−"}
            {formatMoney(receipt.amountMinor, receipt.currency)}
          </p>
          <span className="inline-flex mt-3 items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
            {receipt.status}
          </span>
        </div>

        <div className="border-t border-dashed border-[var(--border)] divide-y divide-[var(--border)]">
          <Row label="From">
            {receipt.sender ? (
              <>
                {receipt.sender.displayName && <span className="block">{receipt.sender.displayName}</span>}
                <span className="text-[var(--text-muted)] font-normal">@{receipt.sender.username}</span>
              </>
            ) : "—"}
          </Row>
          <Row label="To">
            {receipt.recipient ? (
              <>
                {receipt.recipient.displayName && <span className="block">{receipt.recipient.displayName}</span>}
                <span className="text-[var(--text-muted)] font-normal">@{receipt.recipient.username}</span>
              </>
            ) : "—"}
          </Row>
          {receipt.note && <Row label="Note">{receipt.note}</Row>}
          <Row label="Date">
            {d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })},{" "}
            {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </Row>
          <Row label="Type"><span className="capitalize">{receipt.type}</span></Row>
          <Row label="Reference" mono>{receipt.reference}</Row>
          <Row label="Transaction ID" mono>{receipt.id}</Row>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={share}
          className="h-12 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
        >
          Share receipt
        </button>
        <button
          onClick={() => copy(shareUrl, "Link copied")}
          className="h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-medium text-sm"
        >
          Copy link
        </button>
      </div>
      <button
        onClick={() => copy(summary(receipt), "Summary copied")}
        className="w-full h-11 rounded-xl text-sm text-[var(--text-muted)] mb-6"
      >
        Copy summary text
      </button>

      <p className="text-xs text-center text-[var(--text-muted)] leading-relaxed">
        Bannk uses virtual credits only. Credits have no cash value and can't be withdrawn.
        Only the people on this transaction can open this receipt.
      </p>

      {toast && (
        <div role="status" className="fixed bottom-24 inset-x-0 flex justify-center pointer-events-none">
          <span className="rounded-full bg-[var(--text)] text-[var(--surface)] text-sm px-4 py-2 shadow-lg">{toast}</span>
        </div>
      )}
    </div>
  );
}
