import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { HttpError, handleError, jsonError, requireUser } from "@/lib/api";
import { PinError, assertStrongPin, hashPin, verifyUserPin } from "@/lib/pin";

/** GET /api/me/pin — { hasPin, pinSetAt } */
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ hasPin: !!user.pinHash, pinSetAt: user.pinSetAt });
  } catch (e) {
    return handleError(e);
  }
}

const setSchema = z.object({
  pin: z.string(),
  /** Required when changing an existing PIN: one of these. */
  currentPin: z.string().optional(),
  currentPassword: z.string().optional(),
});

/**
 * POST /api/me/pin — set (first time) or change the transaction PIN.
 * Changing requires the current PIN or the account password.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = setSchema.parse(await req.json());
    assertStrongPin(body.pin);

    if (user.pinHash) {
      if (body.currentPassword) {
        if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
          throw new HttpError(403, "Current password is incorrect");
        }
      } else if (body.currentPin) {
        await verifyUserPin(user.id, body.currentPin);
      } else {
        throw new HttpError(400, "Enter your current PIN or password to change it");
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: await hashPin(body.pin), pinSetAt: new Date(), pinFailedCount: 0, pinLockedUntil: null },
    });
    await prisma.auditEvent.create({
      data: { actorId: user.id, action: user.pinHash ? "security.pin_changed" : "security.pin_set", targetType: "user", targetId: user.id },
    });
    return NextResponse.json({ ok: true, hasPin: true });
  } catch (e) {
    if (e instanceof PinError) return jsonError(e.message, e.status, { code: e.code });
    return handleError(e);
  }
}

const clearSchema = z.object({ currentPassword: z.string().min(1) });

/** DELETE /api/me/pin — remove the PIN (requires password). Sending money then needs a new PIN. */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const { currentPassword } = clearSchema.parse(await req.json());
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new HttpError(403, "Current password is incorrect");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: null, pinSetAt: null, pinFailedCount: 0, pinLockedUntil: null },
    });
    await prisma.auditEvent.create({
      data: { actorId: user.id, action: "security.pin_cleared", targetType: "user", targetId: user.id },
    });
    return NextResponse.json({ ok: true, hasPin: false });
  } catch (e) {
    return handleError(e);
  }
}
