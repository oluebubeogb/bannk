import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";

export const GET = withAdmin(async () => {
  const notSystem = { NOT: { email: "system@bannk.internal" } };
  const [users, verifiedUsers, suspendedUsers, openReports, pendingBusinesses, activeCampaigns, activeChallenges, publishedListings, recentAudit] =
    await Promise.all([
      prisma.user.count({ where: notSystem }),
      prisma.user.count({ where: { ...notSystem, emailVerifiedAt: { not: null } } }),
      prisma.user.count({ where: { ...notSystem, status: "suspended" } }),
      prisma.report.count({ where: { status: "open" } }),
      prisma.business.count({ where: { verificationStatus: "pending" } }),
      prisma.campaign.count({ where: { status: "active" } }),
      prisma.challenge.count({ where: { status: "active" } }),
      prisma.listing.count({ where: { status: "published" } }),
      prisma.auditEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: { select: { profile: { select: { username: true } } } } },
      }),
    ]);
  return NextResponse.json({
    users,
    verifiedUsers,
    suspendedUsers,
    openReports,
    pendingBusinesses,
    activeCampaigns,
    activeChallenges,
    publishedListings,
    recentAudit: recentAudit.map((a) => ({
      id: a.id,
      action: a.action,
      actor: a.actor?.profile?.username ?? null,
      targetType: a.targetType,
      targetId: a.targetId,
      createdAt: a.createdAt,
    })),
  });
});
