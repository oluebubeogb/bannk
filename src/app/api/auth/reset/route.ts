import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, normalizeEmail, normalizeWordKey, verifyWordKey } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  resetKey: z.string().min(3).max(200),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(200),
});

const INVALID = "That reset WordKey is invalid or has expired";

/**
 * POST /api/auth/reset — set a new password with the emailed reset WordKey.
 * 5 attempts per key; on success every session is revoked.
 */
export async function POST(req: NextRequest) {
  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(await req.json());
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.errors[0]?.message : "Invalid input";
    return NextResponse.json({ error: msg || "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { emailNormalized: normalizeEmail(data.email) } });
  if (!user || user.status !== "active") return NextResponse.json({ error: INVALID }, { status: 400 });

  const challenge = await prisma.passwordResetChallenge.findFirst({
    where: { userId: user.id, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge || challenge.attemptCount >= 5) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  await prisma.passwordResetChallenge.update({
    where: { id: challenge.id },
    data: { attemptCount: { increment: 1 } },
  });

  if (!verifyWordKey(`reset:${normalizeWordKey(data.resetKey)}`, challenge.tokenHash)) {
    const left = 4 - challenge.attemptCount;
    return NextResponse.json(
      { error: left > 0 ? `Incorrect reset WordKey. ${left} attempt${left === 1 ? "" : "s"} left.` : INVALID },
      { status: 400 }
    );
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(data.newPassword) },
    }),
    prisma.passwordResetChallenge.update({ where: { id: challenge.id }, data: { consumedAt: now } }),
    prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } }),
    prisma.auditEvent.create({
      data: { actorId: user.id, action: "security.password_reset", targetType: "user", targetId: user.id },
    }),
  ]);

  return NextResponse.json({ ok: true, message: "Password updated. Sign in with your new password." });
}
