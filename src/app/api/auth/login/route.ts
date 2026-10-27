import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  normalizeEmail,
  createSession,
  setSessionCookie,
} from "@/lib/auth";
import { grantWeeklyAllowanceIfDue } from "@/lib/allowance";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = schema.parse(body);
    const emailNorm = normalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: { emailNormalized: emailNorm },
      include: { profile: true },
    });

    if (!user || user.status !== "active") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Email not verified", needsVerification: true },
        { status: 403 }
      );
    }

    // Grant weekly allowance if due
    const currency = user.profile?.homeCurrency || "NGN";
    await grantWeeklyAllowanceIfDue(user.id, currency);

    const jwt = await createSession(user.id);
    await setSessionCookie(jwt);

    return NextResponse.json({
      ok: true,
      username: user.profile?.username,
      displayName: user.profile?.displayName,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
