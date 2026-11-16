/**
 * Paystack-shaped mapping, public-key lookup, and a short-lived in-memory
 * cache for /charge → /charge/submit_pin. Card data is never written to the DB.
 */
import { createHash, randomBytes } from "crypto";
import { prisma } from "../prisma";
import { HttpError } from "../api";
import type { Merchant } from "./types";
import type { CardInput } from "./card";

const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

export function paystackReference() {
  return `bnk_${randomBytes(12).toString("hex")}`;
}

export function toPaystackId(id: string) {
  return parseInt(createHash("sha256").update(id).digest("hex").slice(0, 12), 16);
}

type TxLike = {
  id: string;
  status: string;
  paymentReference: string;
  amountMinor: number | bigint;
  currency: string;
  lastFailureCode?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
  paymentMethod?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  cardLast4?: string | null;
  cardBrand?: string | null;
  accessCode?: string | null;
  description?: string | null;
  metadata?: string | null;
  authorizationCode?: string | null;
  cardExpMonth?: number | null;
  cardExpYear?: number | null;
};

function parseMeta(v?: string | null): unknown {
  if (!v) return {};
  try { return JSON.parse(v); } catch { return v; }
}

export function toPaystackTransaction(t: TxLike) {
  const amount = Number(t.amountMinor);
  const success = t.status === "PAID";
  const failed = t.status === "FAILED";
  const gateway = success
    ? "Successful"
    : t.lastFailureCode === "EXPIRED_CARD" ? "Expired Card"
    : t.lastFailureCode === "INSUFFICIENT_FUNDS" ? "Insufficient Funds"
    : t.lastFailureCode === "WRONG_DETAILS" ? "Invalid card details"
    : t.lastFailureCode === "INVALID_CARD" ? "Invalid card details"
    : "The transaction was not completed";
  const [first, ...rest] = String(t.customerName || "").trim().split(/\s+/);
  return {
    id: toPaystackId(t.id),
    domain: "test",
    status: success ? "success" : failed ? "failed" : "abandoned",
    reference: t.paymentReference,
    amount,
    currency: t.currency || "NGN",
    gateway_response: gateway,
    paid_at: t.paidAt ? t.paidAt.toISOString() : null,
    created_at: t.createdAt.toISOString(),
    channel: t.paymentMethod === "BANNK_TRANSFER" ? "bannk" : "card",
    ip_address: null,
    metadata: parseMeta(t.metadata),
    fees: 0,
    customer: {
      email: t.customerEmail || "",
      first_name: first || null,
      last_name: rest.join(" ") || null,
      customer_code: t.customerEmail ? `CUS_${createHash("sha256").update(String(t.customerEmail)).digest("hex").slice(0, 10)}` : null,
    },
    authorization: t.cardLast4 ? {
      authorization_code: t.authorizationCode || `AUTH_${createHash("sha256").update(t.id).digest("hex").slice(0, 10)}`,
      bin: "000000",
      last4: t.cardLast4,
      exp_month: t.cardExpMonth ? String(t.cardExpMonth).padStart(2, "0") : null,
      exp_year: t.cardExpYear ? String(t.cardExpYear) : null,
      channel: "card",
      card_type: (t.cardBrand || "").toLowerCase(),
      bank: "Bannk Sandbox",
      country_code: "NG",
      brand: (t.cardBrand || "").toLowerCase(),
      reusable: !!t.authorizationCode,
      signature: t.authorizationCode ? `SIG_${createHash("sha256").update(t.authorizationCode).digest("hex").slice(0, 16)}` : null,
      account_name: null,
    } : null,
    access_code: t.accessCode || null,
    requested_amount: amount,
  };
}

/** New reusable authorization token (opaque, random; maps to non-sensitive card facts only). */
export function newAuthorizationCode() {
  return `AUTH_${randomBytes(6).toString("hex")}`;
}

/** Normalised expiry from card input (month 1-12, four-digit year). Not sensitive. */
export function cardExpiry(card: Pick<CardInput, "expiryMonth" | "expiryYear">) {
  const month = Number(card.expiryMonth);
  let year = Number(card.expiryYear);
  if (year < 100) year += 2000;
  return { month, year };
}

export function isExpired(month: number, year: number, now = new Date()) {
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
}

export function paystackInitData(t: { transactionReference: string; paymentReference: string; accessCode?: string | null }) {
  return {
    authorization_url: `${appUrl()}/checkout/${encodeURIComponent(t.transactionReference)}`,
    access_code: t.accessCode || "",
    reference: t.paymentReference,
  };
}

export async function merchantFromPublicKey(publicKey: string): Promise<Merchant & { webhookUrl: string | null }> {
  const k = await prisma.devApiKey.findUnique({ where: { apiKey: publicKey }, include: { user: true } });
  if (!k || k.revokedAt) throw new HttpError(401, "Invalid public key");
  if (!k.user.devModeEnabledAt || k.user.status !== "active") throw new HttpError(403, "Dev Mode is not enabled for this account");
  await prisma.devApiKey.update({ where: { id: k.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { apiKeyId: k.id, userId: k.userId, webhookUrl: k.webhookUrl };
}

type PendingCharge = { card: CardInput; merchant: Merchant; transactionReference: string; expires: number };
const pendingCharges = new Map<string, PendingCharge>();

export function stashPendingCard(reference: string, data: Omit<PendingCharge, "expires">) {
  pendingCharges.set(reference, { ...data, expires: Date.now() + 10 * 60 * 1000 });
}

export function takePendingCard(reference: string): Omit<PendingCharge, "expires"> | null {
  const p = pendingCharges.get(reference);
  if (!p) return null;
  if (p.expires < Date.now()) { pendingCharges.delete(reference); return null; }
  pendingCharges.delete(reference);
  return p;
}

export { appUrl };
