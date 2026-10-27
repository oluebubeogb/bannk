/**
 * Weekly allowance engine
 * Periods are fixed 7-day windows aligned to server timezone.
 */

import { prisma } from "./prisma";
import { grantAllowance, ensureWallet } from "./ledger";

const PERIOD_DAYS = Number(process.env.ALLOWANCE_PERIOD_DAYS || 7);
const WEEKLY_MINOR = Number(process.env.WEEKLY_ALLOWANCE_MINOR || 250000);
const INITIAL_MINOR = Number(process.env.INITIAL_ALLOWANCE_MINOR || 500000);

/** Get the start of the current weekly period (aligned to a fixed epoch Monday-style). */
export function getCurrentPeriodBounds(now = new Date()) {
  // Simple fixed windows from a known epoch (Unix week style).
  // For production use a proper timezone library (e.g. luxon) with Africa/Lagos.
  const msPerDay = 24 * 60 * 60 * 1000;
  const periodMs = PERIOD_DAYS * msPerDay;
  const epoch = Date.UTC(2025, 0, 6); // a known Monday
  const elapsed = now.getTime() - epoch;
  const periodIndex = Math.floor(elapsed / periodMs);
  const periodStart = new Date(epoch + periodIndex * periodMs);
  const periodEnd = new Date(periodStart.getTime() + periodMs - 1);
  return { periodStart, periodEnd };
}

export async function ensureCurrentAllowancePeriod(userId: string) {
  const { periodStart, periodEnd } = getCurrentPeriodBounds();

  let period = await prisma.allowancePeriod.findUnique({
    where: {
      userId_periodStart: { userId, periodStart },
    },
  });

  if (!period) {
    period = await prisma.allowancePeriod.create({
      data: {
        userId,
        periodStart,
        periodEnd,
        capMinor: WEEKLY_MINOR,
        usedMinor: 0,
      },
    });
  }
  return period;
}

/**
 * Grant the initial allowance once (onboarding).
 */
export async function grantInitialAllowance(userId: string, currencyCode: string) {
  const key = `initial-allowance:${userId}`;
  await ensureWallet(userId, currencyCode);
  await grantAllowance(userId, currencyCode, INITIAL_MINOR, key, "Initial welcome allowance");
  await ensureCurrentAllowancePeriod(userId);
  return { amountMinor: INITIAL_MINOR, currencyCode };
}

/**
 * Grant the weekly allowance if not already granted for the current period.
 */
export async function grantWeeklyAllowanceIfDue(userId: string, currencyCode: string) {
  const period = await ensureCurrentAllowancePeriod(userId);
  const key = `weekly-allowance:${userId}:${period.periodStart.toISOString()}`;

  // Check if already granted via reward_grants or journal
  const existing = await prisma.journalTransaction.findUnique({
    where: { idempotencyKey: key },
  });
  if (existing) {
    return { granted: false, amountMinor: 0, period };
  }

  await grantAllowance(
    userId,
    currencyCode,
    WEEKLY_MINOR,
    key,
    `Weekly allowance ${period.periodStart.toISOString().slice(0, 10)}`
  );

  return { granted: true, amountMinor: WEEKLY_MINOR, period };
}

export async function getAllowanceStatus(userId: string) {
  const period = await ensureCurrentAllowancePeriod(userId);
  return {
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    capMinor: period.capMinor,
    usedMinor: period.usedMinor,
    remainingMinor: Math.max(0, period.capMinor - period.usedMinor),
  };
}
