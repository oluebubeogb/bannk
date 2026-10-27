import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyWordKey, createSession, setSessionCookie } from "@/lib/auth";
import { grantInitialAllowance } from "@/lib/allowance";

const schema = z.object({
  email: z.string().email(),
  wordKey: z.string().min(5),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, wordKey } = schema.parse(body);
    const emailNorm = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { emailNormalized: emailNorm },
      include: {
        profile: true,
        verificationChallenges: {
          where: { consumedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid verification" }, { status: 400 });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ error: "Already verified" }, { status: 400 });
    }

    const challenge = user.verificationChallenges[0];
    if (!challenge) {
      return NextResponse.json({ error: "No active challenge or expired" }, { status: 400 });
    }

    if (challenge.attemptCount >= 5) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    await prisma.verificationChallenge.update({
      where: { id: challenge.id },
      data: { attemptCount: { increment: 1 } },
    });

    if (!verifyWordKey(wordKey, challenge.verifierHash)) {
      return NextResponse.json({ error: "Invalid WordKey" }, { status: 400 });
    }

    // Success — mark verified and consume challenge
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    // Grant initial weekly/welcome allowance
    const currency = user.profile?.homeCurrency || "NGN";
    await grantInitialAllowance(user.id, currency);

    const jwt = await createSession(user.id);
    await setSessionCookie(jwt);

    return NextResponse.json({
      ok: true,
      username: user.profile?.username,
      message: "Verified. Welcome to Bannk.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
