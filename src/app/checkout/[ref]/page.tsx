"use client";

import { use, useRef, useState } from "react";
import { detectBrand } from "@/lib/payments/card";
import { Button, Card, Field, Notice, Skeleton, api, fmt, inputCls, useApi } from "@/components/ui";

const BRAND_UI: Record<string, { label: string; cls: string }> = {
  VISA: { label: "VISA", cls: "bg-[#1a1f71] text-white italic" },
  MASTERCARD: { label: "Mastercard", cls: "bg-black text-white" },
  VERVE: { label: "Verve", cls: "bg-[#00425f] text-white" },
  AMEX: { label: "AMEX", cls: "bg-[#2e77bc] text-white" },
};
function brandOf(n: string) { const d = n.replace(/\D/g, ""); return d.length ? detectBrand(d) : "UNKNOWN"; }
function MastercardDots() { return <span className="inline-flex mr-1"><span className="w-2.5 h-2.5 rounded-full bg-[#eb001b]" /><span className="w-2.5 h-2.5 rounded-full bg-[#f79e1b] -ml-1 opacity-90" /></span>; }
function BrandBadge({ brand }: { brand: string }) {
  const ui = BRAND_UI[brand];
  if (!ui) return null;
  return <span key={brand} className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide shadow-sm transition-all duration-200 animate-[fadeIn_.2s_ease] ${ui.cls}`}>{brand === "MASTERCARD" && <MastercardDots />}{ui.label}</span>;
}

function formatExpiry(raw: string): string {
  let d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length === 1 && d > "1") d = "0" + d; // "4" -> "04"
  if (d.length >= 2) {
    const m = Number(d.slice(0, 2));
    if (m < 1 || m > 12) d = d.slice(0, 1);
  }
  if (d.length < 2) return d;
  return d.slice(0, 2) + " / " + d.slice(2);
}
function expiryValid(v: string): boolean {
  const m = /^(\d{2}) \/ (\d{2})$/.exec(v);
  if (!m) return false;
  const mm = Number(m[1]), yy = 2000 + Number(m[2]);
  const now = new Date();
  return mm >= 1 && mm <= 12 && (yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1));
}

export default function Checkout({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params);
  const { data, error, loading, reload } = useApi<any>(`/api/checkout/${encodeURIComponent(ref)}`);
  const [method, setMethod] = useState<"CARD" | "BANNK_TRANSFER">("CARD");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", pin: "" });
  const [pin, setPin] = useState("");
  const cvvRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);
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
                    <Field label="Card number"><div className="relative"><input inputMode="numeric" autoComplete="cc-number" className={inputCls + " font-mono pr-28"} value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ") })} placeholder="4084 0840 8408 4081" /><BrandBadge brand={brandOf(card.number)} /></div></Field>
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Expiry"><input inputMode="numeric" autoComplete="cc-exp" maxLength={7} className={inputCls + " font-mono tracking-wider" + (card.expiry.length === 7 && !expiryValid(card.expiry) ? " border-red-500" : "")} placeholder="MM / YY" value={card.expiry} onKeyDown={(e) => { if (e.key === "Backspace" && card.expiry.endsWith(" / ")) { e.preventDefault(); setCard({ ...card, expiry: card.expiry.slice(0, 1) }); } }} onChange={(e) => { const v = formatExpiry(e.target.value); setCard({ ...card, expiry: v }); if (v.length === 7 && expiryValid(v)) cvvRef.current?.focus(); }} /></Field>
                      <Field label="CVV"><input ref={cvvRef} inputMode="numeric" autoComplete="cc-csc" pattern="[0-9]*" maxLength={3} type="password" placeholder="•••" className={inputCls + " font-mono tracking-widest"} value={card.cvv} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); setCard({ ...card, cvv: v }); if (v.length === 3) pinRef.current?.focus(); }} /></Field>
                      <Field label="Card PIN"><input ref={pinRef} inputMode="numeric" pattern="[0-9]*" maxLength={4} type="password" placeholder="••••" className={inputCls + " font-mono tracking-widest"} value={card.pin} onChange={(e) => setCard({ ...card, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></Field>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">Sandbox: Visa, Mastercard and Verve accepted, no limit. Card details are never stored.</p>
                  </>
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
