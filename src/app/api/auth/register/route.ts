import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  normalizeEmail,
  normalizeUsername,
  generateWordKey,
  hashWordKey,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers and underscores"),
  homeCurrency: z.string().default("NGN"),
  displayName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const emailNorm = normalizeEmail(data.email);
    const usernameNorm = normalizeUsername(data.username);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { emailNormalized: emailNorm },
          { profile: { username: usernameNorm } },
        ],
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email or username already taken" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);
    const wordKey = generateWordKey();
    const verifierHash = hashWordKey(wordKey);

    const user = await prisma.user.create({
      data: {
        email: data.email.trim(),
        emailNormalized: emailNorm,
        passwordHash,
        status: "active",
        profile: {
          create: {
            username: usernameNorm,
            displayName: data.displayName || usernameNorm,
            homeCurrency: data.homeCurrency,
            visibility: "public",
          },
        },
        verificationChallenges: {
          create: {
            verifierHash,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
          },
        },
      },
      include: { profile: true },
    });

    // In production: send wordKey via email. For MVP we return it in the response
    // (and log it) so the developer can verify easily.
    console.log(`[WordKey for ${user.email}]: ${wordKey}`);

    return NextResponse.json({
      userId: user.id,
      username: user.profile?.username,
      message: "Account created. Verify with the WordKey sent to your email.",
      // DEV ONLY — remove in production
      devWordKey: process.env.NODE_ENV === "development" ? wordKey : undefined,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
