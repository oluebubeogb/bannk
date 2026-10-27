import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";

export const GET = withAdmin(async (req) => {
  const status = new URL(req.url).searchParams.get("status") || undefined;
  const businesses = await prisma.business.findMany({
    where: status ? { verificationStatus: status } : {},
    include: {
      owner: { select: { email: true, profile: { select: { username: true } } } },
      _count: { select: { listings: true, campaigns: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({
    businesses: businesses.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      website: b.website,
      contactEmail: b.contactEmail,
      verificationStatus: b.verificationStatus,
      reviewNote: b.reviewNote,
      reviewedAt: b.reviewedAt,
      createdAt: b.createdAt,
      owner: { username: b.owner.profile?.username ?? null, email: b.owner.email },
      listings: b._count.listings,
      campaigns: b._count.campaigns,
    })),
  });
});
