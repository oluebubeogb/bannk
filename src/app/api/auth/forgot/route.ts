import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateWordKey, hashWordKey, normalizeEmail } from "@/lib/auth";
import { sendPasswordResetMail } from "@/lib/mail";

const schema = z.object({ email: z.string().email() });

/**
 * POST /api/auth/forgot — email a password-reset WordKey.
 * Always answers generically (no account enumeration). Rate limited: 1/min, 5/hour per account.
 * Only a peppered hash of the key is stored; it expires after 30 minutes.
 */
export async function POST(req: NextRequest) {
  let email: string;
  try {
    ({ email } = schema.parse(await req.json()));
  } catch {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  const generic = NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a reset WordKey is on its way.",
  });

  const user = await prisma.user.findUnique({
    where: { emailNormalized: normalizeEmail(email) },
    include: { profile: true },
  });
  if (!user || user.status !== "active" || user.email.endsWith("@bannk.internal")) return generic;

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.passwordResetChallenge.findMany({
    where: { userId: user.id, createdAt: { gt: hourAgo } },
    orderBy: { createdAt: "desc" },
  });
  if (recent.length >= 5 || (recent[0] && Date.now() - recent[0].createdAt.getTime() < 60_000)) {
    return NextResponse.json({ error: "Please wait a minute before requesting another reset" }, { status: 429 });
  }

  const resetKey = generateWordKey();
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
  await prisma.$transaction([
    prisma.passwordResetChallenge.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.passwordResetChallenge.create({
      data: {
        userId: user.id,
        tokenHash: hashWordKey(`reset:${resetKey}`),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        requestIp: ip,
      },
    }),
  ]);

  try {
    await sendPasswordResetMail(user.email, user.profile?.username || "there", resetKey);
  } catch (e: any) {
    console.error("[auth/forgot] mail failed:", e?.message || e);
  }

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ok: true, message: "Reset WordKey issued (dev).", devResetKey: resetKey });
  }
  return generic;
}
