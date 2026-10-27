import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";

export const GET = withAdmin(async (req) => {
  const status = new URL(req.url).searchParams.get("status") || "open";
  const reports = await prisma.report.findMany({
    where: status === "all" ? {} : { status },
    include: { reporter: { select: { profile: { select: { username: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Resolve a readable label for each target
  const ids = (t: string) => reports.filter((r) => r.targetType === t).map((r) => r.targetId);
  const [listings, campaigns, users] = await Promise.all([
    prisma.listing.findMany({ where: { id: { in: ids("listing") } }, select: { id: true, title: true, status: true } }),
    prisma.campaign.findMany({ where: { id: { in: ids("campaign") } }, select: { id: true, title: true, status: true } }),
    prisma.user.findMany({
      where: { id: { in: ids("user") } },
      select: { id: true, status: true, profile: { select: { username: true } } },
    }),
  ]);
  const label = new Map<string, string>();
  listings.forEach((l) => label.set(`listing:${l.id}`, `${l.title} (${l.status})`));
  campaigns.forEach((c) => label.set(`campaign:${c.id}`, `${c.title} (${c.status})`));
  users.forEach((u) => label.set(`user:${u.id}`, `@${u.profile?.username ?? "?"} (${u.status})`));

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      targetLabel: label.get(`${r.targetType}:${r.targetId}`) ?? "(deleted)",
      reason: r.reason,
      status: r.status,
      reporter: r.reporter.profile?.username ?? null,
      createdAt: r.createdAt,
    })),
  });
});
