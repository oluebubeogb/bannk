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
