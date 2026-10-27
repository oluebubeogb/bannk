/**
 * Weekly allowance engine
 * Periods are fixed 7-day windows aligned to server timezone.
 */

import { prisma } from "./prisma";
import { grantAllowance, ensureWallet } from "./ledger";

const PERIOD_DAYS = Number(process.env.ALLOWANCE_PERIOD_DAYS || 7);
const WEEKLY_MINOR = Number(process.env.WEEKLY_ALLOWANCE_MINOR || 250000);
/** Opening balance: ₦1,000,050.00 = 100005000 kobo (2 decimal minor units). */
export const DEFAULT_INITIAL_ALLOWANCE_MINOR = 100005000;
const INITIAL_MINOR = Number(process.env.INITIAL_ALLOWANCE_MINOR || DEFAULT_INITIAL_ALLOWANCE_MINOR);

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
  await grantAllowance(userId, currencyCode, INITIAL_MINOR, key, "Opening balance");
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

  // The opening balance covers the signup week — weekly grants start next period.
  const opening = await prisma.journalTransaction.findUnique({
    where: { idempotencyKey: `initial-allowance:${userId}` },
    select: { createdAt: true },
  });
  if (opening && opening.createdAt >= period.periodStart) {
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

/**
 * Scheduled job: grant weekly allowance to every verified, active user who is due.
 * Idempotent per user+period (journal idempotency key), safe to run repeatedly.
 */
export async function grantWeeklyAllowancesForAll(opts: { batchSize?: number } = {}) {
  const batchSize = opts.batchSize ?? 200;
  let cursor: string | undefined;
  let scanned = 0;
  let granted = 0;
  const errors: Array<{ userId: string; error: string }> = [];

  for (;;) {
    const users = await prisma.user.findMany({
      where: {
        status: "active",
        emailVerifiedAt: { not: null },
        email: { not: "system@bannk.internal" },
      },
      select: { id: true, profile: { select: { homeCurrency: true } } },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (users.length === 0) break;

    for (const u of users) {
      scanned++;
      try {
        const r = await grantWeeklyAllowanceIfDue(u.id, u.profile?.homeCurrency || "NGN");
        if (r.granted) granted++;
      } catch (e: any) {
        errors.push({ userId: u.id, error: String(e?.message || e) });
      }
    }
    cursor = users[users.length - 1].id;
    if (users.length < batchSize) break;
  }

  return { scanned, granted, errors };
}
