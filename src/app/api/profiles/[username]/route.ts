import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const profile = await prisma.profile.findUnique({
    where: { username: username.toLowerCase() },
    include: { user: { select: { status: true, createdAt: true } } },
  });

  if (!profile || profile.user.status !== "active" || profile.visibility === "private") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    username: profile.username,
    displayName: profile.displayName,
    homeCurrency: profile.homeCurrency,
    bio: profile.bio,
    memberSince: profile.user.createdAt,
  });
}
