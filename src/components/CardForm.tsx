"use client";

import { useRef } from "react";
import { detectBrand, luhnOk } from "@/lib/payments/card";
import { Field, inputCls } from "@/components/ui";
import { InfoTip } from "@/components/kit";

const BRAND_UI: Record<string, { label: string; cls: string }> = {
  VISA: { label: "VISA", cls: "bg-[#1a1f71] text-white italic" },
  MASTERCARD: { label: "Mastercard", cls: "bg-black text-white" },
  VERVE: { label: "Verve", cls: "bg-[#00425f] text-white" },
  AMEX: { label: "AMEX", cls: "bg-[#2e77bc] text-white" },
};
const BRAND_MAX: Record<string, number> = { MASTERCARD: 16, VISA: 19, VERVE: 19 };

function panComplete(d: string) {
  const b = detectBrand(d); const max = BRAND_MAX[b]; if (!max) return false;
  if (d.length >= max) return true;
  return d.length === 16 && luhnOk(d);
}
function brandOf(n: string) { const d = n.replace(/\D/g, ""); return d.length ? detectBrand(d) : "UNKNOWN"; }
function MastercardDots() { return <span className="inline-flex mr-1"><span className="w-2.5 h-2.5 rounded-full bg-[#eb001b]" /><span className="w-2.5 h-2.5 rounded-full bg-[#f79e1b] -ml-1 opacity-90" /></span>; }
function BrandBadge({ brand }: { brand: string }) {
  const ui = BRAND_UI[brand];
  if (!ui) return null;
  return <span key={brand} className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide shadow-sm transition-all duration-200 animate-[fadeIn_.2s_ease] ${ui.cls}`}>{brand === "MASTERCARD" && <MastercardDots />}{ui.label}</span>;
}

export function formatExpiry(raw: string): string {
  let d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length === 1 && d > "1") d = "0" + d;
  if (d.length >= 2) {
    const m = Number(d.slice(0, 2));
    if (m < 1 || m > 12) d = d.slice(0, 1);
  }
  if (d.length < 2) return d;
  return d.slice(0, 2) + " / " + d.slice(2);
}

export function expiryValid(v: string): boolean {
  const m = /^(\d{2}) \/ (\d{2})$/.exec(v);
  if (!m) return false;
  const mm = Number(m[1]), yy = 2000 + Number(m[2]);
  const now = new Date();
  return mm >= 1 && mm <= 12 && (yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1));
}

export type CardFormValue = { number: string; expiry: string; cvv: string; pin: string };

export function splitExpiry(expiry: string): { expiryMonth: string; expiryYear: string } {
  const [mm, yy] = expiry.split("/").map((s) => s.trim());
  return { expiryMonth: mm || "", expiryYear: yy || "" };
}

export const SANDBOX_CARD_HINT =
  "Sandbox: Visa, Mastercard and Verve. Any 4-digit PIN succeeds, except 0000 (insufficient balance) and 1111 (wrong card details). A past expiry date is declined. Card details are never stored.";

export function CardForm({ value, onChange }: { value: CardFormValue; onChange: (v: CardFormValue) => void }) {
  const cvvRef = useRef<HTMLInputElement>(null);
  const expRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);
  const card = value;
  const setCard = (next: CardFormValue) => onChange(next);

  return (
    <>
      <Field label="Card number"><div className="relative"><input inputMode="numeric" autoComplete="cc-number" className={inputCls + " font-mono pr-28"} value={card.number} onChange={(e) => { let d = e.target.value.replace(/\D/g, "").slice(0, 19); const mx = BRAND_MAX[detectBrand(d)]; if (mx) d = d.slice(0, mx); const prev = card.number.replace(/\D/g, ""); setCard({ ...card, number: d.replace(/(\d{4})(?=\d)/g, "$1 ") }); if (d.length > prev.length && panComplete(d)) expRef.current?.focus(); }} placeholder="4084 0840 8408 4081" /><BrandBadge brand={brandOf(card.number)} /></div></Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Expiry"><input ref={expRef} inputMode="numeric" autoComplete="cc-exp" maxLength={7} className={inputCls + " font-mono tracking-wider" + (card.expiry.length === 7 && !expiryValid(card.expiry) ? " border-red-500" : "")} placeholder="MM / YY" value={card.expiry} onKeyDown={(e) => { if (e.key === "Backspace" && card.expiry.endsWith(" / ")) { e.preventDefault(); setCard({ ...card, expiry: card.expiry.slice(0, 1) }); } }} onChange={(e) => { const v = formatExpiry(e.target.value); setCard({ ...card, expiry: v }); if (v.length === 7 && expiryValid(v)) cvvRef.current?.focus(); }} /></Field>
        <Field label="CVV"><input ref={cvvRef} inputMode="numeric" autoComplete="cc-csc" pattern="[0-9]*" maxLength={3} type="password" placeholder="•••" className={inputCls + " font-mono tracking-widest"} value={card.cvv} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); setCard({ ...card, cvv: v }); if (v.length === 3) pinRef.current?.focus(); }} /></Field>
        <Field label={<>Card PIN<InfoTip label="Sandbox card rules" align="left" className="-my-1">{SANDBOX_CARD_HINT}</InfoTip></>}><input ref={pinRef} inputMode="numeric" pattern="[0-9]*" maxLength={4} type="password" placeholder="••••" className={inputCls + " font-mono tracking-widest"} value={card.pin} onChange={(e) => setCard({ ...card, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></Field>
      </div>
    </>
  );
}
