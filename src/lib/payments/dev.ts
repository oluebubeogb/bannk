import { createHmac, randomBytes } from "crypto";
import { prisma } from "../prisma";
import { HttpError } from "../api";
import { executeTransfer, ensureWallet, getOrCreateIssuanceAccount, postJournal } from "../ledger";
import { verifyUserPin } from "../pin";
import { CARD_MESSAGES, CardError, evaluateSandboxCard, type CardMessageFlavor } from "./card";
import { openSecret } from "../devmode";
import type { Merchant, PaymentProvider, TxView } from "./types";
import type { DevTransaction as PrismaDevTransaction } from "@prisma/client";
import { cardExpiry, isExpired, newAuthorizationCode, toPaystackTransaction } from "./paystack";
type DevTransaction = Omit<PrismaDevTransaction, "amountMinor"> & { amountMinor: number };

const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const major = (m: number) => (m / 100).toFixed(2);

function txRef() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (const b of randomBytes(10)) s += a[b % a.length];
  return `MNFY|BNK|${new Date().toISOString().slice(0, 10).replace(/-/g, "")}|${s}`;
}

function newAccessCode() {
  return randomBytes(16).toString("hex");
}

export function toView(t: DevTransaction): TxView {
  return {
    transactionReference: t.transactionReference,
    paymentReference: t.paymentReference,
    amountPaid: t.status === "PAID" ? major(t.amountMinor) : "0.00",
    totalPayable: major(t.amountMinor),
    currencyCode: t.currency,
    paymentStatus: t.status,
    paymentMethod: t.paymentMethod,
    paymentDescription: t.description,
    paidOn: t.paidAt?.toISOString() ?? null,
    createdOn: t.createdAt.toISOString(),
    customer: { name: t.customerName, email: t.customerEmail },
    cardDetails: t.cardBrand ? { cardType: t.cardBrand, last4: t.cardLast4 || "" } : null,
    payerUsername: t.payerUsername,
    receiptId: t.journalId,
    checkoutUrl: `${appUrl()}/checkout/${encodeURIComponent(t.transactionReference)}`,
  };
}

async function load(m: Merchant | null, ref: string) {
  const t = await prisma.devTransaction.findUnique({ where: { transactionReference: ref }, include: { apiKey: true } });
  if (!t || (m && t.merchantUserId !== m.userId)) throw new HttpError(404, "Transaction not found");
  if (t.apiKey.revokedAt) throw new HttpError(400, "Merchant API key revoked");
  return t;
}

/** Fire-and-forget webhook. Format follows the API that created the transaction. */
function fireWebhook(id: string) {
  setTimeout(async () => {
    try {
      const t = await prisma.devTransaction.findUnique({ where: { id }, include: { apiKey: true } });
      if (!t?.apiKey.webhookUrl) return;
      const sk = openSecret(t.apiKey.signingSecretEnc);
      let body: string;
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      if (t.apiFlavor === "paystack") {
        body = JSON.stringify({ event: "charge.success", data: toPaystackTransaction(t) });
        const sig = createHmac("sha512", sk || t.apiKey.webhookSecret).update(body).digest("hex");
        headers["x-paystack-signature"] = sig;
      } else {
        body = JSON.stringify({ eventType: "SUCCESSFUL_TRANSACTION", eventData: toView(t) });
        // Monnify semantics: monnify-signature = HMAC-SHA512(rawBody, API secret key).
        const sig = createHmac("sha512", sk || t.apiKey.webhookSecret).update(body).digest("hex");
        const whSig = createHmac("sha512", t.apiKey.webhookSecret).update(body).digest("hex");
        headers["monnify-signature"] = sig;
        headers["bannk-webhook-signature"] = whSig;
      }
      let status = "failed";
      try {
        const r = await fetch(t.apiKey.webhookUrl, { method: "POST", headers, body, signal: AbortSignal.timeout(10000) });
        status = `http_${r.status}`;
      } catch { /* network */ }
      await prisma.devTransaction.update({ where: { id }, data: { webhookStatus: status } });
    } catch (e: any) { console.error("[devmode] webhook", e?.message); }
  }, 0);
}

/** Credit the merchant wallet for an approved card payment, mark it PAID and fire the webhook. */
async function settleCardPayment(
  t: { id: string; merchantUserId: string; currency: string; amountMinor: number | bigint; paymentReference: string },
  card: { brand: string; last4: string; expMonth: number; expYear: number; authorizationCode: string | null }
) {
  const { availableAccount } = await ensureWallet(t.merchantUserId, t.currency);
  const issuance = await getOrCreateIssuanceAccount(t.currency);
  const amountMinor = Number(t.amountMinor);
  const j = await postJournal(
    "issuance",
    [
      { ledgerAccountId: issuance.id, amountMinor, direction: "debit" },
      { ledgerAccountId: availableAccount.id, amountMinor, direction: "credit" },
    ],
    { idempotencyKey: `devcard:${t.id}`, note: `Card payment · ${card.brand} •••• ${card.last4} · ${t.paymentReference}` }
  );
  const u = await prisma.devTransaction.update({
    where: { id: t.id },
    data: {
      status: "PAID", paymentMethod: "CARD", cardBrand: card.brand, cardLast4: card.last4, cardExpMonth: card.expMonth, cardExpYear: card.expYear,
      authorizationCode: card.authorizationCode, journalId: j.id, paidAt: new Date(), lastFailureCode: null,
    },
  });
  fireWebhook(u.id);
  return u;
}

export type ChargeAuthorizationInput = {
  email: string;
  amountMinor: number;
  currency: string;
  authorizationCode: string;
  reference: string;
  metadata?: unknown;
  sandboxPin?: string; // Bannk-only: 0000 / 1111 simulate declines on a saved card
};

/**
 * Paystack POST /transaction/charge_authorization against a saved token.
 * Same decline rules as a fresh card: expired card, sandbox PIN 0000 (insufficient funds), 1111 (wrong details).
 */
export async function chargeAuthorization(m: Merchant, input: ChargeAuthorizationInput) {
  const auth = await prisma.devCardAuthorization.findUnique({ where: { code: input.authorizationCode } });
  if (!auth || auth.merchantUserId !== m.userId || !auth.active) throw new HttpError(400, "Invalid Authorization code", "INVALID_AUTHORIZATION");
  if (auth.customerEmail !== input.email.trim().toLowerCase()) throw new HttpError(400, "Email does not match Authorization code", "EMAIL_MISMATCH");
  const existing = await prisma.devTransaction.findUnique({ where: { apiKeyId_paymentReference: { apiKeyId: m.apiKeyId, paymentReference: input.reference } } });
  if (existing) {
    if (existing.status === "PAID" && existing.authorizationCode === auth.code) return { tx: existing, declined: null as null | { code: string; message: string } };
    throw new HttpError(400, "Duplicate Transaction Reference", "DUPLICATE_REFERENCE");
  }
  await devProvider.initTransaction(m, {
    amountMinor: input.amountMinor, currency: input.currency, paymentReference: input.reference, customerEmail: auth.customerEmail, apiFlavor: "paystack", metadata: input.metadata,
  });
  const t = await prisma.devTransaction.findUniqueOrThrow({ where: { apiKeyId_paymentReference: { apiKeyId: m.apiKeyId, paymentReference: input.reference } } });
  await prisma.devCardAuthorization.update({ where: { id: auth.id }, data: { lastUsedAt: new Date() } });
  const code = isExpired(auth.expMonth, auth.expYear) ? "EXPIRED_CARD" : input.sandboxPin === "0000" ? "INSUFFICIENT_FUNDS" : input.sandboxPin === "1111" ? "WRONG_DETAILS" : null;
  const card = { brand: auth.cardBrand, last4: auth.last4, expMonth: auth.expMonth, expYear: auth.expYear, authorizationCode: auth.code };
  if (code) {
    const failed = await prisma.devTransaction.update({
      where: { id: t.id },
      data: { status: "FAILED", lastFailureCode: code, paymentMethod: "CARD", cardBrand: card.brand, cardLast4: card.last4, cardExpMonth: card.expMonth, cardExpYear: card.expYear, authorizationCode: card.authorizationCode },
    });
    return { tx: failed, declined: { code, message: CARD_MESSAGES.paystack[code as keyof typeof CARD_MESSAGES.paystack] } };
  }
  return { tx: await settleCardPayment(t, card), declined: null };
}

/** Paystack POST /customer/deactivate_authorization. */
export async function deactivateAuthorization(m: Merchant, code: string) {
  const auth = await prisma.devCardAuthorization.findUnique({ where: { code } });
  if (!auth || auth.merchantUserId !== m.userId) throw new HttpError(404, "Authorization code not found", "NOT_FOUND");
  await prisma.devCardAuthorization.update({ where: { id: auth.id }, data: { active: false } });
}

export const devProvider: PaymentProvider = {
  name: "dev",

  async initTransaction(m, input) {
    if (input.amountMinor <= 0) throw new HttpError(400, "Amount must be positive");
    const existing = await prisma.devTransaction.findUnique({ where: { apiKeyId_paymentReference: { apiKeyId: m.apiKeyId, paymentReference: input.paymentReference } } });
    if (existing) return toView(existing);
    const t = await prisma.devTransaction.create({
      data: {
        merchantUserId: m.userId, apiKeyId: m.apiKeyId, transactionReference: txRef(),
        paymentReference: input.paymentReference, amountMinor: input.amountMinor, currency: input.currency,
        description: input.description, customerName: input.customerName, customerEmail: input.customerEmail, redirectUrl: input.redirectUrl,
        accessCode: newAccessCode(), apiFlavor: input.apiFlavor || "monnify",
        metadata: input.metadata === undefined ? null : (typeof input.metadata === "string" ? input.metadata : JSON.stringify(input.metadata)),
      },
    });
    return toView(t);
  },

  async chargeCard(m, ref, card, opts) {
    const t = await load(m, ref);
    if (t.status === "PAID") return toView(t);
    const flavor: CardMessageFlavor = opts?.messageFlavor || "bannk";
    let meta;
    try {
      meta = evaluateSandboxCard(card, flavor);
    } catch (e: any) {
      const code = e instanceof CardError ? e.code : "INVALID_CARD";
      await prisma.devTransaction.update({ where: { id: t.id }, data: { lastFailureCode: code } }).catch(() => {});
      throw e instanceof HttpError ? e : new HttpError(400, e.message, code);
    }
    // Sandbox: valid cards (except PIN 0000 / 1111 and expired) are approved. Card data is dropped here;
    // Paystack-flavoured payments keep only a reusable token mapped to brand, last4 and expiry.
    const exp = cardExpiry(card);
    let authorizationCode: string | null = null;
    if (t.apiFlavor === "paystack" && t.customerEmail) {
      authorizationCode = newAuthorizationCode();
      await prisma.devCardAuthorization.create({
        data: { code: authorizationCode, merchantUserId: t.merchantUserId, apiKeyId: t.apiKeyId, customerEmail: t.customerEmail.toLowerCase(), cardBrand: meta.brand, last4: meta.last4, expMonth: exp.month, expYear: exp.year },
      });
    }
    const u = await settleCardPayment(t, { brand: meta.brand, last4: meta.last4, expMonth: exp.month, expYear: exp.year, authorizationCode });
    return toView(u);
  },

  async chargeBannk(m, ref, payer) {
    const t = await load(m, ref);
    if (t.status === "PAID") return toView(t);
    let userId = payer.userId;
    if (!userId) {
      const p = await prisma.profile.findUnique({ where: { username: String(payer.username || "").replace(/^@/, "").toLowerCase() } });
      if (!p) throw new HttpError(404, "Payer not found");
      userId = p.userId;
    }
    await verifyUserPin(userId, payer.pin);
    const merchant = await prisma.profile.findUnique({ where: { userId: t.merchantUserId } });
    if (!merchant) throw new HttpError(400, "Merchant missing");
    let j;
    try {
      j = await executeTransfer({
        senderUserId: userId, recipientUsername: merchant.username, currencyCode: t.currency,
        amountMinor: t.amountMinor, note: `Bannk checkout · ${t.paymentReference}`, idempotencyKey: `devbannk:${t.id}`,
      });
    } catch (e: any) { throw new HttpError(400, e.message || "Transfer failed"); }
    const payerProfile = await prisma.profile.findUnique({ where: { userId } });
    const u = await prisma.devTransaction.update({
      where: { id: t.id },
      data: { status: "PAID", paymentMethod: "BANNK_TRANSFER", payerUsername: payerProfile?.username, journalId: j.id, paidAt: new Date(), lastFailureCode: null },
    });
    fireWebhook(u.id);
    return toView(u);
  },

  async getByTransactionReference(m, ref) {
    const t = await prisma.devTransaction.findUnique({ where: { transactionReference: ref } });
    if (!t || (m && t.merchantUserId !== m.userId)) return null;
    return toView(t);
  },

  async getByPaymentReference(m, pr) {
    const t = await prisma.devTransaction.findUnique({ where: { apiKeyId_paymentReference: { apiKeyId: m.apiKeyId, paymentReference: pr } } });
    return t ? toView(t) : null;
  },
};

export { fireWebhook, newAccessCode, load as loadDevTransaction };
