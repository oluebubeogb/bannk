/**
 * Bannk money utilities — always use integer minor units.
 * Never use floating point for money.
 */

export const CURRENCY_EXPONENTS: Record<string, number> = {
  NGN: 2, // kobo
  USD: 2,
  GHS: 2,
  KES: 2,
  ZAR: 2,
  EUR: 2,
  GBP: 2,
};

export function toMinor(amount: number, currency: string): number {
  const exp = CURRENCY_EXPONENTS[currency] ?? 2;
  return Math.round(amount * Math.pow(10, exp));
}

export function fromMinor(minor: number, currency: string): number {
  const exp = CURRENCY_EXPONENTS[currency] ?? 2;
  return minor / Math.pow(10, exp);
}

export function formatMoney(minor: number, currency: string, locale = "en"): string {
  const value = fromMinor(minor, currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: CURRENCY_EXPONENTS[currency] ?? 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatMinor(minor: number, currency: string): string {
  return formatMoney(minor, currency);
}

/**
 * Partially masked balance for alert emails, e.g. `NGN ******050.00`.
 * Shows only the last three whole-unit digits and the decimals.
 */
export function maskedBalance(minor: number, currency = "NGN"): string {
  const abs = Math.abs(minor);
  const whole = String(Math.floor(abs / 100));
  const cents = String(abs % 100).padStart(2, "0");
  const tail = whole.slice(-3).padStart(3, "0");
  return `${minor < 0 ? "-" : ""}${currency} ******${tail}.${cents}`;
}

export function formatDateTime(d: Date | string, tz = process.env.ALLOWANCE_TIMEZONE || "Africa/Lagos"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date) + " WAT";
  } catch {
    return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  }
}
