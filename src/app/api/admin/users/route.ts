import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin, isAdminUsername } from "@/lib/admin";

export const GET = withAdmin(async (req) => {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").trim().replace(/^@/, "");
  const status = sp.get("status") || undefined;
  const users = await prisma.user.findMany({
    where: {
      NOT: { email: "system@bannk.internal" },
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { profile: { username: { contains: q.toLowerCase(), mode: "insensitive" } } },
              { profile: { displayName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { profile: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.profile?.username ?? null,
      displayName: u.profile?.displayName ?? null,
      status: u.status,
      verified: !!u.emailVerifiedAt,
      isAdmin: isAdminUsername(u.profile?.username),
      createdAt: u.createdAt,
    })),
  });
});
