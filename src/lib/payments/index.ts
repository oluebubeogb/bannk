import { devProvider } from "./dev";
import { monnifyProvider } from "./monnify";
import type { PaymentProvider } from "./types";

export function getPaymentProvider(): PaymentProvider {
  return (process.env.PAYMENT_PROVIDER || "dev").toLowerCase() === "monnify" ? monnifyProvider : devProvider;
}
export type { PaymentProvider } from "./types";
