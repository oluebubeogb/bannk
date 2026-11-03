"use client";

import { use, useState } from "react";
import { Button, Card, Field, Notice, Skeleton, api, fmt, inputCls, useApi } from "@/components/ui";

function brandOf(n: string) {
  const d = n.replace(/\D/g, "");
  const n6 = Number(d.slice(0, 6));
  if ((n6 >= 506099 && n6 <= 506198) || (n6 >= 650002 && n6 <= 650027) || (n6 >= 507865 && n6 <= 507964)) return "Verve";
  if (d.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(d) || (Number(d.slice(0, 4)) >= 2221 && Number(d.slice(0, 4)) <= 2720)) return "Mastercard";
  return "";
}

export default function Checkout({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params);
  const { data, error, loading, reload } = useApi<any>(`/api/checkout/${encodeURIComponent(ref)}`);
  const [method, setMethod] = useState<"CARD" | "BANNK_TRANSFER">("CARD");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", pin: "" });
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pay(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const [mm, yy] = card.expiry.split("/").map((s) => s.trim());
      const body = method === "CARD" ? { method, card: { number: card.number, expiryMonth: mm || "", expiryYear: yy || "", cvv: card.cvv, pin: card.pin } } : { method, pin };
      await api(`/api/checkout/${encodeURIComponent(ref)}`, { method: "POST", json: body });
      setCard({ number: "", expiry: "", cvv: "", pin: "" }); setPin("");
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
                {data.redirectUrl && <a className="block" href={`${data.redirectUrl}${data.redirectUrl.includes("?") ? "&" : "?"}paymentReference=${encodeURIComponent(data.paymentReference)}`}><Button variant="primary" className="w-full">Return to merchant</Button></a>}
              </div>
            ) : (
              <form onSubmit={pay} className="space-y-3" autoComplete="off">
                <div className="grid grid-cols-2 gap-2">
                  {(["CARD", "BANNK_TRANSFER"] as const).map((m) => (
                    <button type="button" key={m} onClick={() => setMethod(m)} className={`h-10 rounded-xl border text-sm ${method === m ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent font-semibold" : "border-[var(--border)]"}`}>{m === "CARD" ? "Card" : "Bannk balance"}</button>
                  ))}
                </div>
                {method === "CARD" ? (
                  <>
                    <Field label={`Card number ${brandOf(card.number) ? "· " + brandOf(card.number) : ""}`}><input inputMode="numeric" className={inputCls + " font-mono"} value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, "").slice(0, 23) })} placeholder="4084 0840 8408 4081" /></Field>
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Expiry"><input className={inputCls} placeholder="MM/YY" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value.slice(0, 7) })} /></Field>
                      <Field label="CVV"><input inputMode="numeric" type="password" className={inputCls} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 3) })} /></Field>
                      <Field label="Card PIN"><input inputMode="numeric" type="password" className={inputCls} value={card.pin} onChange={(e) => setCard({ ...card, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></Field>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">Sandbox: Visa, Mastercard and Verve accepted, no limit. Card details are never stored.</p>
                  </>
                ) : (
                  <>
                    <Field label="Your Bannk transaction PIN" hint="You must be signed in to Bannk."><input inputMode="numeric" type="password" className={inputCls} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} /></Field>
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
