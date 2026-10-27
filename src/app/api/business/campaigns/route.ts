import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, requireVerifiedUser, optionalDate, HttpError } from "@/lib/api";
import { requireApprovedBusiness } from "@/lib/business";

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
  listingId: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  budgetMinor: z.number().int().min(0).max(1_000_000_000_00).default(0),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

/** Create a DRAFT campaign — an admin activates it. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser();
    const business = await requireApprovedBusiness(user.id);
    const data = schema.parse(await req.json());
    if (data.listingId) {
      const own = await prisma.listing.findFirst({ where: { id: data.listingId, businessId: business.id } });
      if (!own) throw new HttpError(404, "Listing not found");
    }
    if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) throw new HttpError(400, "End date is before start date");
    const campaign = await prisma.campaign.create({
      data: {
        businessId: business.id,
        listingId: data.listingId || null,
        title: data.title,
        description: data.description || null,
        budgetMinor: data.budgetMinor,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status: "draft",
      },
    });
    await prisma.auditEvent.create({
      data: { actorId: user.id, action: "business.create_campaign", targetType: "campaign", targetId: campaign.id },
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
