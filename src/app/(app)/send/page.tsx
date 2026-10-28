"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Banknote, MessageSquareText, Send, ShieldCheck, FileCheck2, Lock } from "lucide-react";
import { fmt, newKey } from "@/components/ui";
import { ConfirmPinModal, IconCircle, SetPinModal } from "@/components/kit";

type PayReq = {
  token: string;
  amountMinor: number;
  currency: string;
  note: string | null;
  status: string;
  payee: { username: string; displayName: string | null };
};

const fieldCls =
  "w-full h-12 pl-11 pr-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] read-only:bg-[var(--surface-2)] read-only:text-[var(--text-muted)]";

export default function SendPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [request, setRequest] = useState<PayReq | null>(null);
  const [setPinOpen, setSetPinOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const keyRef = useRef<string>("");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => {
        if (r.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setHasPin(!!d.hasPin);
        if (!d.hasPin) setSetPinOpen(true); // first transfer: prompt to create a PIN straight away
      })
      .catch(() => setHasPin(false));

    // Prefill from query: ?to=&amount=&note= or ?request=TOKEN (payment request / invoice).
    const q = new URLSearchParams(window.location.search);
    const token = q.get("request");
    if (token) {
      fetch(`/api/payment-requests/${encodeURIComponent(token)}`)
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) return setError(d.error || "Payment request not found");
          const pr: PayReq = d.request;
          if (pr.status !== "open") return setError(`This payment request is ${pr.status}.`);
          setRequest(pr);
          setUsername(pr.payee.username);
          setAmount((pr.amountMinor / 100).toFixed(2));
          setNote(pr.note || "");
        })
        .catch(() => setError("Couldn't load the payment request"));
    } else {
      if (q.get("to")) setUsername(q.get("to")!.replace(/^@/, ""));
      if (q.get("amount")) setAmount(q.get("amount")!);
      if (q.get("note")) setNote(q.get("note")!.slice(0, 200));
    }
  }, [router]);

  const amountMinor = (() => {
    const n = parseFloat(amount);
    return isNaN(n) || n <= 0 ? null : Math.round(n * 100);
  })();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim()) return setError("Enter a recipient");
    if (!amountMinor) return setError("Enter a valid amount");
    keyRef.current = newKey();
    if (!hasPin) setSetPinOpen(true);
    else setConfirmOpen(true);
  }

  async function submitWithPin(pin: string) {
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientUsername: username.trim().replace(/^@/, "").toLowerCase(),
        amountMinor,
        note: note || undefined,
        currency: request?.currency || "NGN",
        idempotencyKey: keyRef.current,
        pin,
        paymentRequestToken: request?.token,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      router.replace("/login?next=/send");
      return;
    }
    if (!res.ok) {
      if (data.code === "PIN_NOT_SET") {
        setConfirmOpen(false);
        setHasPin(false);
        setSetPinOpen(true);
        return;
      }
      if (data.code === "PIN_INVALID" || data.code === "PIN_REQUIRED") throw new Error(data.error || "Incorrect PIN");
      setConfirmOpen(false);
      setError(data.error || "Transfer failed");
      return;
    }
    setConfirmOpen(false);
    router.push(`/receipt/${data.transactionId}?new=1`);
  }

  const locked = !!request;

  return (
    <div className="px-5 pt-8 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <IconCircle icon={Send} tone="lime" size={40} />
        <div>
          <h1 className="text-xl font-bold leading-tight">Send money</h1>
          <p className="text-xs text-[var(--text-muted)]">Instant and final within Bannk</p>
        </div>
      </div>

      {request && (
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-4">
          <IconCircle icon={FileCheck2} tone="sky" size={38} />
          <div className="flex-1 text-sm">
            <p className="font-medium">Paying a request from @{request.payee.username}</p>
            <p className="text-xs text-[var(--text-muted)]">Amount and description are set by the request.</p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Recipient username</label>
          <div className="relative">
            <AtSign size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              required
              readOnly={locked}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={fieldCls}
              placeholder="amara"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Amount</label>
          <div className="relative">
            <Banknote size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              required
              readOnly={locked}
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${fieldCls} pr-16 tabular`}
              placeholder="0.00"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
              {request?.currency || "NGN"}
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1.5">Note (optional)</label>
          <div className="relative">
            <MessageSquareText size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              readOnly={locked}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              className={fieldCls}
              placeholder="Lunch at Mama Put"
            />
          </div>
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <button
          type="submit"
          disabled={hasPin === null}
          className="press w-full h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--on-accent)] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Lock size={16} />
          {amountMinor ? `Send ${fmt(amountMinor, request?.currency || "NGN")}` : "Continue"}
        </button>
      </form>

      <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] mt-6">
        <ShieldCheck size={14} /> Every transfer is approved with your 4-digit PIN.
      </p>

      <SetPinModal
        open={setPinOpen}
        onClose={() => setSetPinOpen(false)}
        onDone={() => {
          setHasPin(true);
          setSetPinOpen(false);
          if (username.trim() && amountMinor) {
            keyRef.current = keyRef.current || newKey();
            setConfirmOpen(true);
          }
        }}
        title="Set a PIN to send money"
      />
      <ConfirmPinModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onSubmit={submitWithPin}
        summary={
          amountMinor ? (
            <>
              Send <b className="text-[var(--text)]">{fmt(amountMinor, request?.currency || "NGN")}</b> to{" "}
              <b className="text-[var(--text)]">@{username.replace(/^@/, "")}</b>
            </>
          ) : null
        }
      />
    </div>
  );
}
