/** Receive payment / invoice helpers. The token is the authority; query params are human-readable decoration. */
import { randomBytes } from "crypto";
import type { PaymentRequest } from "@prisma/client";
import { appUrl } from "./mail";
import { brandedQrPng } from "./qr";
import { formatMinor } from "./money";

export function newPaymentToken() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 chars, no look-alikes
  const bytes = randomBytes(14);
  let t = "";
  for (const b of bytes) t += alphabet[b % alphabet.length];
  return t;
}

export function paymentStatus(pr: Pick<PaymentRequest, "status" | "expiresAt">) {
  if (pr.status === "open" && pr.expiresAt && pr.expiresAt < new Date()) return "expired";
  return pr.status;
}

export function payUrl(pr: Pick<PaymentRequest, "token" | "amountMinor" | "note">, payeeUsername: string) {
  const q = new URLSearchParams({ to: payeeUsername, amount: (pr.amountMinor / 100).toFixed(2) });
  if (pr.note) q.set("note", pr.note.slice(0, 80));
  return appUrl(`/pay/${pr.token}?${q.toString()}`);
}

export function serializePaymentRequest(pr: PaymentRequest, payee: { username: string; displayName: string | null }) {
  return {
    id: pr.id,
    token: pr.token,
    amountMinor: pr.amountMinor,
    currency: pr.currency,
    note: pr.note,
    status: paymentStatus(pr),
    expiresAt: pr.expiresAt,
    createdAt: pr.createdAt,
    paidAt: pr.paidAt,
    transactionId: pr.transactionId,
    payee,
    url: payUrl(pr, payee.username),
    qrUrl: `/api/payment-requests/${pr.token}/qr`,
  };
}

export async function paymentRequestQrPng(pr: PaymentRequest, payeeUsername: string) {
  const lines = [] as string[];
  if (pr.note) lines.push(pr.note.length > 42 ? pr.note.slice(0, 41) + "…" : pr.note);
  lines.push(`Pay @${payeeUsername}`);
  return brandedQrPng(payUrl(pr, payeeUsername), { title: formatMinor(pr.amountMinor, pr.currency), lines });
}
