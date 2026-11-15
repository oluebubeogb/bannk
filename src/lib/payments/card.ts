/** Card validation for the sandbox. PAN/PIN/CVV are validated in memory only — never stored or logged. */
export type CardBrand = "VISA" | "MASTERCARD" | "VERVE" | "AMEX" | "UNKNOWN";

export type CardErrorCode = "INVALID_CARD" | "EXPIRED_CARD" | "INSUFFICIENT_FUNDS" | "WRONG_DETAILS";
export type CardMessageFlavor = "bannk" | "paystack";

export class CardError extends Error {
  constructor(public code: CardErrorCode, message: string) {
    super(message);
    this.name = "CardError";
  }
}

export const CARD_MESSAGES: Record<CardMessageFlavor, Record<Exclude<CardErrorCode, "INVALID_CARD">, string>> = {
  bannk: {
    EXPIRED_CARD: "Card has expired",
    INSUFFICIENT_FUNDS: "Insufficient balance",
    WRONG_DETAILS: "Wrong card details",
  },
  paystack: {
    EXPIRED_CARD: "Expired Card",
    INSUFFICIENT_FUNDS: "Insufficient Funds",
    WRONG_DETAILS: "Invalid card details",
  },
};

export function luhnOk(pan: string) {
  let sum = 0, alt = false;
  for (let i = pan.length - 1; i >= 0; i--) {
    let d = pan.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}

export function detectBrand(pan: string): CardBrand {
  const n6 = Number(pan.slice(0, 6));
  const n4 = Number(pan.slice(0, 4));
  const n2 = Number(pan.slice(0, 2));
  // Verve first — its 5061/650x ranges overlap Mastercard-like prefixes
  if ((n6 >= 506099 && n6 <= 506198) || (n6 >= 650002 && n6 <= 650027) || (n6 >= 507865 && n6 <= 507964)) return "VERVE";
  if (pan[0] === "4") return "VISA";
  if ((n2 >= 51 && n2 <= 55) || (n4 >= 2221 && n4 <= 2720)) return "MASTERCARD";
  if (n2 === 34 || n2 === 37) return "AMEX";
  return "UNKNOWN";
}

export type CardInput = { number: string; expiryMonth: string | number; expiryYear: string | number; cvv: string; pin?: string };

/** Throws Error(message) on invalid input. Returns safe metadata only. */
export function validateCard(c: CardInput, opts?: { pinRequired?: boolean }): { brand: CardBrand; last4: string } {
  const pan = String(c.number || "").replace(/[\s-]/g, "");
  if (!/^\d{12,19}$/.test(pan)) throw new Error("Invalid card number");
  if (!luhnOk(pan)) throw new Error("Invalid card number (checksum failed)");
  const brand = detectBrand(pan);
  if (brand === "UNKNOWN" || brand === "AMEX") throw new Error("Only Visa, Mastercard and Verve cards are supported");
  if (brand === "VERVE" ? !(pan.length >= 16 && pan.length <= 19) : !(pan.length === 16 || (brand === "VISA" && (pan.length === 13 || pan.length === 19))))
    throw new Error("Card number length is invalid for " + brand);
  const mm = Number(c.expiryMonth);
  let yy = Number(c.expiryYear);
  if (!Number.isInteger(mm) || mm < 1 || mm > 12) throw new Error("Invalid expiry month");
  if (!Number.isInteger(yy)) throw new Error("Invalid expiry year");
  if (yy < 100) yy += 2000;
  const now = new Date();
  if (yy < now.getFullYear() || (yy === now.getFullYear() && mm < now.getMonth() + 1)) throw new Error("Card has expired");
  if (!/^\d{3}$/.test(String(c.cvv || ""))) throw new Error("Invalid CVV");
  if (opts?.pinRequired !== false && !/^\d{4}$/.test(String(c.pin || ""))) throw new Error("Card PIN must be 4 digits");
  return { brand, last4: pan.slice(-4) };
}

/**
 * Full sandbox card check: format + expiry + PIN outcomes.
 * PIN 0000 → insufficient funds; PIN 1111 → wrong details; any other valid 4-digit PIN succeeds.
 * Never persists or logs PAN/PIN/CVV.
 */
export function evaluateSandboxCard(c: CardInput, flavor: CardMessageFlavor = "bannk"): { brand: CardBrand; last4: string } {
  let meta: { brand: CardBrand; last4: string };
  try {
    meta = validateCard(c, { pinRequired: true });
  } catch (e: any) {
    const msg = String(e?.message || "Invalid card");
    if (msg === "Card has expired") throw new CardError("EXPIRED_CARD", CARD_MESSAGES[flavor].EXPIRED_CARD);
    throw new CardError("INVALID_CARD", msg);
  }
  const pin = String(c.pin || "");
  if (pin === "0000") throw new CardError("INSUFFICIENT_FUNDS", CARD_MESSAGES[flavor].INSUFFICIENT_FUNDS);
  if (pin === "1111") throw new CardError("WRONG_DETAILS", CARD_MESSAGES[flavor].WRONG_DETAILS);
  return meta;
}
