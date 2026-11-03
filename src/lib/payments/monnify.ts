/**
 * Live Monnify driver (PAYMENT_PROVIDER=monnify). Same interface as the dev driver,
 * so route handlers don't change. Uses MONNIFY_BASE_URL / MONNIFY_API_KEY / MONNIFY_SECRET_KEY / MONNIFY_CONTRACT_CODE.
 * Settlement to Bannk balances in live mode should be driven by Monnify webhooks.
 */
import { HttpError } from "../api";
import type { PaymentProvider, TxView } from "./types";

const base = () => (process.env.MONNIFY_BASE_URL || "https://sandbox.monnify.com").replace(/\/+$/, "");
let cached: { token: string; exp: number } | null = null;

async function token() {
  if (cached && cached.exp > Date.now()) return cached.token;
  const basic = Buffer.from(`${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`).toString("base64");
  const r = await fetch(`${base()}/api/v1/auth/login`, { method: "POST", headers: { Authorization: `Basic ${basic}` } });
  const d = await r.json();
  if (!d.requestSuccessful) throw new HttpError(502, d.responseMessage || "Monnify auth failed");
  cached = { token: d.responseBody.accessToken, exp: Date.now() + (d.responseBody.expiresIn - 60) * 1000 };
  return cached.token;
}

async function call(path: string, init?: RequestInit) {
  const r = await fetch(`${base()}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}`, ...(init?.headers || {}) } });
  const d = await r.json();
  if (!d.requestSuccessful) throw new HttpError(r.status >= 400 ? r.status : 400, d.responseMessage || "Monnify error");
  return d.responseBody;
}

function view(b: any): TxView {
  return {
    transactionReference: b.transactionReference, paymentReference: b.paymentReference,
    amountPaid: String(b.amountPaid ?? "0.00"), totalPayable: String(b.totalPayable ?? b.amount ?? ""),
    currencyCode: b.currencyCode || "NGN", paymentStatus: b.paymentStatus || b.status || "PENDING",
    paymentMethod: b.paymentMethod ?? null, paymentDescription: b.paymentDescription ?? null,
    paidOn: b.paidOn ?? null, createdOn: b.createdOn ?? new Date().toISOString(),
    customer: { name: b.customer?.name ?? null, email: b.customer?.email ?? null },
    cardDetails: b.cardDetails ? { cardType: b.cardDetails.cardType, last4: b.cardDetails.last4 } : null,
    payerUsername: null, receiptId: null, checkoutUrl: b.checkoutUrl || "",
  };
}

export const monnifyProvider: PaymentProvider = {
  name: "monnify",
  async initTransaction(_m, i) {
    return view(await call("/api/v1/merchant/transactions/init-transaction", {
      method: "POST",
      body: JSON.stringify({
        amount: i.amountMinor / 100, customerName: i.customerName, customerEmail: i.customerEmail,
        paymentReference: i.paymentReference, paymentDescription: i.description, currencyCode: i.currency,
        contractCode: process.env.MONNIFY_CONTRACT_CODE, redirectUrl: i.redirectUrl, paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
      }),
    }));
  },
  async chargeCard(_m, ref, card) {
    return view(await call("/api/v1/merchant/cards/charge", { method: "POST", body: JSON.stringify({ transactionReference: ref, collectionChannel: "API_NOTIFICATION", card }) }));
  },
  async chargeBannk() {
    throw new HttpError(400, "Bannk transfers are only available in Dev Mode");
  },
  async getByTransactionReference(_m, ref) {
    return view(await call(`/api/v2/transactions/${encodeURIComponent(ref)}`));
  },
  async getByPaymentReference(_m, pr) {
    return view(await call(`/api/v2/merchant/transactions/query?paymentReference=${encodeURIComponent(pr)}`));
  },
};
