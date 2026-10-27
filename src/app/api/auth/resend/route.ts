import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateWordKey, hashWordKey, normalizeEmail } from "@/lib/auth";
import { sendWordKeyMail } from "@/lib/mail";

const schema = z.object({ email: z.string().email() });

/** POST /api/auth/resend — issue a fresh WordKey (rate limited: 1/min, 5/hour per user). */
export async function POST(req: NextRequest) {
  let email: string;
  try {
    ({ email } = schema.parse(await req.json()));
  } catch {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  const generic = NextResponse.json({
    ok: true,
    message: "If that account needs verification, a new WordKey is on its way.",
  });

  const user = await prisma.user.findUnique({
    where: { emailNormalized: normalizeEmail(email) },
    include: { profile: true },
  });
  if (!user || user.emailVerifiedAt || user.status !== "active") return generic;

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.verificationChallenge.findMany({
    where: { userId: user.id, createdAt: { gt: hourAgo } },
    orderBy: { createdAt: "desc" },
  });
  if (recent.length >= 5 || (recent[0] && Date.now() - recent[0].createdAt.getTime() < 60_000)) {
    return NextResponse.json({ error: "Please wait a minute before requesting another WordKey" }, { status: 429 });
  }

  const wordKey = generateWordKey();
  await prisma.$transaction([
    prisma.verificationChallenge.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.verificationChallenge.create({
      data: {
        userId: user.id,
        verifierHash: hashWordKey(wordKey),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    }),
  ]);

  try {
    await sendWordKeyMail(user.email, user.profile?.username || "there", wordKey);
  } catch (e) {
    console.error("[auth/resend] mail failed", e);
    return NextResponse.json({ error: "Couldn't send the WordKey email. Try again shortly." }, { status: 502 });
  }

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ok: true, message: "New WordKey issued (dev).", devWordKey: wordKey });
  }
  return generic;
}
