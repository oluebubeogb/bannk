"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Share2,
  ImageIcon,
  FileText,
  AlignLeft,
  Link2,
  Lock,
  Loader2,
  ReceiptText,
} from "lucide-react";
import { IconCircle, Logo, Modal } from "@/components/kit";

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

function Row({ label, children, mono, last }: { label: string; children: React.ReactNode; mono?: boolean; last?: boolean }) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-3.5 text-sm ${
        last ? "" : "border-b border-dotted border-[#d9d6cc]"
      }`}
    >
      <span className="text-[var(--text-muted)] shrink-0">{label}</span>
      <span className={`text-right font-semibold text-[var(--text)] break-all min-w-0 ${mono ? "font-mono text-xs font-medium tracking-wide pt-0.5" : ""}`}>
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
  const [shareText, setShareText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState<string>("");

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
        setShareText(d.shareText || "");
      })
      .catch(() => setError({ status: 0, message: "Network error" }));
  }, [id, router]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function summary(r: Receipt) {
    if (shareText) return shareText;
    const who =
      r.direction === "sent" ? `to @${r.recipient?.username}` : r.direction === "received" ? `from @${r.sender?.username}` : "";
    return (
      `Bannk receipt — ${title(r)} ${formatMoney(r.amountMinor, r.currency)} ${who}`.trim() +
      `\nRef: ${r.reference}\n${new Date(r.createdAt).toLocaleString()}` +
      (r.note ? `\nNote: ${r.note}` : "")
    );
  }

  /** Share a rendered file (PNG/PDF) via the native share sheet when supported, else download it. */
  async function shareFile(kind: "image" | "pdf") {
    if (!receipt) return;
    setBusy(kind);
    try {
      const res = await fetch(`/api/transfers/${encodeURIComponent(receipt.id)}/${kind}`);
      if (!res.ok) throw new Error("render");
      const blob = await res.blob();
      const ext = kind === "image" ? "png" : "pdf";
      const name = `bannk-receipt-${receipt.reference}.${ext}`;
      const file = new File([blob], name, { type: blob.type });
      const nav: any = typeof navigator !== "undefined" ? navigator : null;
      if (nav?.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "Bannk receipt" });
          setMenuOpen(false);
          return;
        } catch (e: any) {
          if (e?.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setMenuOpen(false);
      flash(kind === "image" ? "Receipt image saved" : "Receipt PDF saved");
    } catch {
      flash("Couldn't prepare the receipt");
    } finally {
      setBusy("");
    }
  }

  async function shareTextOnly() {
    if (!receipt) return;
    const text = summary(receipt);
    const nav: any = typeof navigator !== "undefined" ? navigator : null;
    if (nav?.share) {
      try {
        await nav.share({ title: "Bannk receipt", text });
        setMenuOpen(false);
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }
    await copy(text, "Receipt text copied");
    setMenuOpen(false);
  }

  async function shareLink() {
    await copy(shareUrl, "Private link copied");
    setMenuOpen(false);
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
        <div className="flex justify-center mb-4">
          <IconCircle icon={error.status === 403 ? Lock : ReceiptText} tone={error.status === 403 ? "rose" : "peach"} size={56} />
        </div>
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

  const options = [
    { key: "image", label: "Image", sub: "PNG receipt", icon: ImageIcon, tone: "sky" as const, run: () => shareFile("image") },
    { key: "pdf", label: "PDF", sub: "Printable document", icon: FileText, tone: "peach" as const, run: () => shareFile("pdf") },
    { key: "text", label: "Text", sub: "Plain-text summary", icon: AlignLeft, tone: "sun" as const, run: shareTextOnly },
    { key: "link", label: "Private link", sub: "Only people on this transaction can open it", icon: Link2, tone: "lilac" as const, run: shareLink },
  ];

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center justify-between mb-5">
        <Link href="/wallet" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          <ArrowLeft size={16} /> Wallet
        </Link>
      </div>

      <div className="receipt-sheet relative rounded-[28px] overflow-hidden border border-[var(--border)] shadow-[0_18px_40px_-24px_rgba(22,24,29,.35)] mb-5 no-lift">
        {/* Brand wash — same palette as the shared PNG/PDF */}
        <div className="absolute inset-0 bg-[linear-gradient(140deg,#f3fbd9_0%,#fbf7ea_48%,#fff0e4_100%)]" aria-hidden />
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(197,246,58,.55),rgba(197,246,58,0)_70%)]" aria-hidden />

        <div className="relative px-4 sm:px-5 pt-5 pb-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <Logo size={30} />
            <div className="text-right min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[var(--text-muted)]">TRANSACTION RECEIPT</p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono truncate">{receipt.reference}</p>
            </div>
          </div>

          <div className="rounded-3xl bg-white shadow-[0_12px_30px_-14px_rgba(22,24,29,.22)] overflow-hidden">
            <div className="px-5 pt-7 pb-6 text-center">
              <div className="flex justify-center mb-4">
                <span
                  aria-hidden
                  className="inline-flex h-[60px] w-[60px] items-center justify-center rounded-full"
                  style={{ background: incoming ? "#ecfbc4" : "#fff0e4", color: incoming ? "#4f7a06" : "#c2410c" }}
                >
                  {incoming ? <ArrowDownLeft size={28} strokeWidth={2.4} /> : <ArrowUpRight size={28} strokeWidth={2.4} />}
                </span>
              </div>
              <p className="text-sm font-medium text-[var(--text-muted)] mb-1">
                {isNew && receipt.direction === "sent" ? "Sent successfully" : title(receipt)}
              </p>
              <p
                className={`text-[32px] sm:text-[36px] leading-tight font-bold tabular tracking-tight break-words ${
                  incoming ? "text-[var(--success)]" : "text-[var(--text)]"
                }`}
              >
                {incoming ? "+" : "−"}
                {formatMoney(receipt.amountMinor, receipt.currency)}
              </p>
              <span className="inline-flex mt-3 items-center gap-1.5 rounded-full bg-[#ecfbc4] text-[#4f7a06] px-3.5 py-1 text-xs font-semibold capitalize">
                <CheckCircle2 size={13} />
                {receipt.status === "completed" ? "Successful" : receipt.status}
              </span>
            </div>

            <div className="mx-5 border-t border-[var(--border)]" />

            <div className="px-5 pb-2">
              <Row label="From">
                {receipt.sender ? (
                  <>
                    {receipt.sender.displayName && receipt.sender.displayName !== receipt.sender.username && (
                      <span className="block font-semibold">{receipt.sender.displayName}</span>
                    )}
                    <span className={receipt.sender.displayName && receipt.sender.displayName !== receipt.sender.username ? "text-[var(--text-muted)] font-normal" : "font-semibold"}>
                      @{receipt.sender.username}
                    </span>
                  </>
                ) : (
                  "Bannk"
                )}
              </Row>
              <Row label="To">
                {receipt.recipient ? (
                  <>
                    {receipt.recipient.displayName && receipt.recipient.displayName !== receipt.recipient.username && (
                      <span className="block font-semibold">{receipt.recipient.displayName}</span>
                    )}
                    <span className={receipt.recipient.displayName && receipt.recipient.displayName !== receipt.recipient.username ? "text-[var(--text-muted)] font-normal" : "font-semibold"}>
                      @{receipt.recipient.username}
                    </span>
                  </>
                ) : (
                  "—"
                )}
              </Row>
              {receipt.note && <Row label="Note">{receipt.note}</Row>}
              <Row label="Date">
                {d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })},{" "}
                {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </Row>
              <Row label="Type"><span className="capitalize">{receipt.type.replace(/_/g, " ")}</span></Row>
              <Row label="Reference" mono>{receipt.reference}</Row>
              <Row label="Transaction ID" mono last>{receipt.id}</Row>
            </div>
          </div>

          <p className="mt-4 px-4 text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
            Issued by Bannk. This receipt is confidential and valid only for the parties named above.
          </p>
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-[var(--text)]">
            <span className="font-brand text-[13px]">bannk</span>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="font-medium">{(() => { try { return new URL(shareUrl).host; } catch { return ""; } })()}</span>
          </p>
        </div>
      </div>

      <button
        onClick={() => setMenuOpen(true)}
        className="press w-full h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--on-accent)] font-semibold inline-flex items-center justify-center gap-2 shadow-[0_10px_24px_-12px_rgba(79,122,6,.7)] mb-5"
      >
        <Share2 size={18} /> Share receipt
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-center text-[var(--text-muted)]">
        <Lock size={12} /> Only the people on this transaction can open this receipt.
      </p>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Share receipt">
        <h3 className="font-semibold mb-4 pr-10">Share receipt</h3>
        <div className="space-y-2">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              disabled={!!busy}
              onClick={o.run}
              className="tile press w-full flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] px-3 py-3 text-left disabled:opacity-60"
            >
              <IconCircle icon={busy === o.key ? Loader2 : o.icon} tone={o.tone} size={38} className={busy === o.key ? "[&>svg]:animate-spin" : ""} />
              <span className="flex-1">
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-xs text-[var(--text-muted)]">{o.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {toast && (
        <div role="status" className="fixed bottom-28 inset-x-0 flex justify-center pointer-events-none z-[70]">
          <span className="rounded-full bg-[var(--text)] text-[var(--surface)] text-sm px-4 py-2 shadow-lg">{toast}</span>
        </div>
      )}
    </div>
  );
}
