"use client";

import { use, useEffect, useState } from "react";
import { CardForm, splitExpiry, type CardFormValue } from "@/components/CardForm";
import { Button, Card, Field, Notice, Skeleton, api, fmt, inputCls, useApi } from "@/components/ui";

const emptyCard: CardFormValue = { number: "", expiry: "", cvv: "", pin: "" };

export default function Checkout({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params);
  const { data, error, loading, reload } = useApi<any>(`/api/checkout/${encodeURIComponent(ref)}`);
  const [method, setMethod] = useState<"CARD" | "BANNK_TRANSFER">("CARD");
  const [card, setCard] = useState<CardFormValue>(emptyCard);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data?.status !== "PAID") return;
    const payload = { type: "bannk:paystack", event: "success", reference: data.paymentReference, transactionReference: data.transactionReference };
    try { window.parent?.postMessage(payload, "*"); } catch { /* ignore */ }
    try { window.opener?.postMessage(payload, "*"); } catch { /* ignore */ }
  }, [data?.status, data?.paymentReference, data?.transactionReference]);

  async function pay(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const { expiryMonth, expiryYear } = splitExpiry(card.expiry);
      const body = method === "CARD"
        ? { method, card: { number: card.number, expiryMonth, expiryYear, cvv: card.cvv, pin: card.pin } }
        : { method, pin };
      await api(`/api/checkout/${encodeURIComponent(ref)}`, { method: "POST", json: body });
      setCard(emptyCard); setPin("");
      await reload();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center"><span className="font-wordmark text-3xl" style={{ fontFamily: "var(--font-brand), 'Righteous Local', sans-serif" }}>bannk</span><div className="text-xs text-[var(--text-muted)]">Dev Mode checkout · sandbox</div></div>
        {error && <Notice kind="error">{error}</Notice>}
        {loading && !data ? <Skeleton /> : data && (
          <Card className="p-5 space-y-4">
            <div>
              <div className="text-xs text-[var(--text-muted)]">Pay @{data.merchant.username}</div>
              <div className="text-3xl font-bold">{fmt(data.amountMinor, data.currency)}</div>
              {data.description && <div className="text-sm">{data.description}</div>}
              <div className="text-[11px] font-mono text-[var(--text-muted)] break-all">{data.transactionReference}</div>
            </div>
            {data.status === "PAID" ? (
              <div className="space-y-3">
                <Notice kind="success">Payment successful via {data.paymentMethod === "CARD" ? "card" : "Bannk"}.</Notice>
                {data.redirectUrl && <a className="block" href={`${data.redirectUrl}${data.redirectUrl.includes("?") ? "&" : "?"}paymentReference=${encodeURIComponent(data.paymentReference)}&trxref=${encodeURIComponent(data.paymentReference)}&reference=${encodeURIComponent(data.paymentReference)}`}><Button variant="primary" className="w-full">Return to merchant</Button></a>}
              </div>
            ) : (
              <form onSubmit={pay} className="space-y-3" autoComplete="off">
                <div className="grid grid-cols-2 gap-2">
                  {(["CARD", "BANNK_TRANSFER"] as const).map((m) => (
                    <button type="button" key={m} onClick={() => setMethod(m)} className={`h-10 rounded-xl border text-sm ${method === m ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent font-semibold" : "border-[var(--border)]"}`}>{m === "CARD" ? "Card" : "Bannk balance"}</button>
                  ))}
                </div>
                {method === "CARD" ? (
                  <CardForm value={card} onChange={setCard} />
                ) : (
                  <>
                    <Field label="Your Bannk transaction PIN" hint="You must be signed in to Bannk."><input inputMode="numeric" type="password" className={inputCls} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} placeholder="••••" /></Field>
                    <a className="text-xs underline" href={`/login?next=${encodeURIComponent(`/checkout/${encodeURIComponent(ref)}`)}`}>Sign in to Bannk</a>
                  </>
                )}
                {err && <Notice kind="error">{err}</Notice>}
                <Button variant="primary" className="w-full" disabled={busy}>{busy ? "Processing…" : `Pay ${fmt(data.amountMinor, data.currency)}`}</Button>
              </form>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
