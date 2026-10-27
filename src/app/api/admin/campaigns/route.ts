import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";
import { HttpError, optionalDate } from "@/lib/api";
import { campaignMetrics } from "@/lib/campaign-events";

export const GET = withAdmin(async (req) => {
  const status = new URL(req.url).searchParams.get("status") || undefined;
  const campaigns = await prisma.campaign.findMany({
    where: status ? { status } : {},
    include: {
      business: { select: { id: true, name: true, verificationStatus: true } },
      listing: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const metrics = await campaignMetrics(campaigns.map((c) => c.id));
  return NextResponse.json({ campaigns: campaigns.map((c) => ({ ...c, metrics: metrics[c.id] })) });
});

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
  budgetMinor: z.number().int().min(0).default(0),
  listingId: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  startsAt: optionalDate,
  endsAt: optionalDate,
  activate: z.boolean().optional(),
});

/** Admin-managed campaign (no business owner) */
export const POST = withAdmin(async (req, _ctx, admin) => {
  const data = schema.parse(await req.json());
  let businessId: string | null = null;
  if (data.listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: data.listingId } });
    if (!listing) throw new HttpError(404, "Listing not found");
    businessId = listing.businessId;
  }
  if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) throw new HttpError(400, "End date is before start date");
  const campaign = await prisma.$transaction(async (tx) => {
    const c = await tx.campaign.create({
      data: {
        title: data.title,
        description: data.description || null,
        budgetMinor: data.budgetMinor,
        listingId: data.listingId || null,
        businessId,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status: data.activate ? "active" : "draft",
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: admin.id,
        action: "admin.create_campaign",
        targetType: "campaign",
        targetId: c.id,
        metadata: JSON.stringify({ title: c.title, budgetMinor: c.budgetMinor, status: c.status }),
      },
    });
    return c;
  });
  return NextResponse.json({ campaign }, { status: 201 });
});
