/**
 * 4-digit transaction PIN. Only a bcrypt hash is stored (User.pinHash).
 * The PIN itself is never logged, returned, or emailed.
 * 5 wrong attempts lock PIN use for 15 minutes.
 */
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./prisma";
import { HttpError } from "./api";

export const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

/** Trivially guessable PINs are refused. */
const WEAK = new Set(["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "4321", "0123", "1212"]);

export function assertStrongPin(pin: string) {
  pinSchema.parse(pin);
  if (WEAK.has(pin)) throw new HttpError(400, "Choose a less predictable PIN");
}

export async function hashPin(pin: string) {
  return bcrypt.hash(pin, 10);
}

export class PinError extends HttpError {
  constructor(status: number, message: string, public code: "PIN_NOT_SET" | "PIN_REQUIRED" | "PIN_INVALID" | "PIN_LOCKED") {
    super(status, message);
  }
}

/**
 * Verify a user's PIN with lockout. Throws PinError on failure.
 */
export async function verifyUserPin(userId: string, pin: string | undefined | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinHash: true, pinFailedCount: true, pinLockedUntil: true },
  });
  if (!user?.pinHash) throw new PinError(428, "Set a transaction PIN first", "PIN_NOT_SET");
  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    throw new PinError(423, "Too many wrong PIN attempts. Try again in a few minutes.", "PIN_LOCKED");
  }
  if (!pin) throw new PinError(400, "Enter your 4-digit PIN", "PIN_REQUIRED");
  if (!/^\d{4}$/.test(pin)) throw new PinError(400, "PIN must be exactly 4 digits", "PIN_INVALID");

  const ok = await bcrypt.compare(pin, user.pinHash);
  if (!ok) {
    const fails = user.pinFailedCount + 1;
    await prisma.user.update({
      where: { id: userId },
      data: fails >= MAX_FAILS ? { pinFailedCount: 0, pinLockedUntil: new Date(Date.now() + LOCK_MS) } : { pinFailedCount: fails },
    });
    const left = MAX_FAILS - fails;
    throw new PinError(
      403,
      left > 0 ? `Incorrect PIN. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong PIN attempts. PIN locked for 15 minutes.",
      fails >= MAX_FAILS ? "PIN_LOCKED" : "PIN_INVALID"
    );
  }
  if (user.pinFailedCount || user.pinLockedUntil) {
    await prisma.user.update({ where: { id: userId }, data: { pinFailedCount: 0, pinLockedUntil: null } });
  }
}
