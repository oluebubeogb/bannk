import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";

export const GET = withAdmin(async (req) => {
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") || undefined;
  const q = sp.get("q") || undefined;
  const listings = await prisma.listing.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { business: { select: { id: true, name: true, verificationStatus: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ listings });
});
