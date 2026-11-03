import { createHmac, randomBytes } from "crypto";
import { prisma } from "../prisma";
import { HttpError } from "../api";
import { executeTransfer, ensureWallet, getOrCreateIssuanceAccount, postJournal } from "../ledger";
import { verifyUserPin } from "../pin";
import { validateCard } from "./card";
import type { Merchant, PaymentProvider, TxView } from "./types";
import type { DevTransaction } from "@prisma/client";

const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const major = (m: number) => (m / 100).toFixed(2);

function txRef() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (const b of randomBytes(10)) s += a[b % a.length];
  return `MNFY|BNK|${new Date().toISOString().slice(0, 10).replace(/-/g, "")}|${s}`;
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

/** Webhook fire-and-forget, Monnify-style payload signed HMAC-SHA512 in `monnify-signature`. */
function fireWebhook(id: string) {
  setTimeout(async () => {
    try {
      const t = await prisma.devTransaction.findUnique({ where: { id }, include: { apiKey: true } });
      if (!t?.apiKey.webhookUrl) return;
      const body = JSON.stringify({ eventType: "SUCCESSFUL_TRANSACTION", eventData: toView(t) });
      const sig = createHmac("sha512", t.apiKey.webhookSecret).update(body).digest("hex");
      let status = "failed";
      try {
        const r = await fetch(t.apiKey.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "monnify-signature": sig }, body, signal: AbortSignal.timeout(10000) });
        status = `http_${r.status}`;
      } catch { /* network */ }
      await prisma.devTransaction.update({ where: { id }, data: { webhookStatus: status } });
    } catch (e: any) { console.error("[devmode] webhook", e?.message); }
  }, 0);
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
      },
    });
    return toView(t);
  },

  async chargeCard(m, ref, card) {
    const t = await load(m, ref);
    if (t.status === "PAID") return toView(t);
    let meta;
    try { meta = validateCard(card); } catch (e: any) { throw new HttpError(400, e.message); }
    // Sandbox: every valid card is limitless and approved. Card data is dropped here.
    const { availableAccount } = await ensureWallet(t.merchantUserId, t.currency);
    const issuance = await getOrCreateIssuanceAccount(t.currency);
    const j = await postJournal(
      "issuance",
      [
        { ledgerAccountId: issuance.id, amountMinor: t.amountMinor, direction: "debit" },
        { ledgerAccountId: availableAccount.id, amountMinor: t.amountMinor, direction: "credit" },
      ],
      { idempotencyKey: `devcard:${t.id}`, note: `Card payment · ${meta.brand} •••• ${meta.last4} · ${t.paymentReference}` }
    );
    const u = await prisma.devTransaction.update({
      where: { id: t.id },
      data: { status: "PAID", paymentMethod: "CARD", cardBrand: meta.brand, cardLast4: meta.last4, journalId: j.id, paidAt: new Date() },
    });
    fireWebhook(u.id);
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
      data: { status: "PAID", paymentMethod: "BANNK_TRANSFER", payerUsername: payerProfile?.username, journalId: j.id, paidAt: new Date() },
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
