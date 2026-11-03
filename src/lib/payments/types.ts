import type { CardInput } from "./card";

export type InitInput = {
  amountMinor: number;
  currency: string;
  paymentReference: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  redirectUrl?: string;
};

export type TxView = {
  transactionReference: string;
  paymentReference: string;
  amountPaid: string;
  totalPayable: string;
  currencyCode: string;
  paymentStatus: string; // PENDING | PAID | FAILED
  paymentMethod: string | null;
  paymentDescription: string | null;
  paidOn: string | null;
  createdOn: string;
  customer: { name: string | null; email: string | null };
  cardDetails: { cardType: string; last4: string } | null;
  payerUsername: string | null;
  receiptId: string | null;
  checkoutUrl: string;
};

/** Merchant context resolved from API credentials. */
export type Merchant = { apiKeyId: string; userId: string };

/**
 * Swap point: DevMode driver now, live Monnify later (PAYMENT_PROVIDER=monnify).
 * Route handlers only call this interface.
 */
export interface PaymentProvider {
  name: string;
  initTransaction(m: Merchant, input: InitInput): Promise<TxView>;
  chargeCard(m: Merchant | null, transactionReference: string, card: CardInput): Promise<TxView>;
  chargeBannk(m: Merchant | null, transactionReference: string, payer: { userId?: string; username?: string; pin: string }): Promise<TxView>;
  getByTransactionReference(m: Merchant | null, ref: string): Promise<TxView | null>;
  getByPaymentReference(m: Merchant, paymentReference: string): Promise<TxView | null>;
}
