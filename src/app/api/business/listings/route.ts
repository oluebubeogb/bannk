import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, requireVerifiedUser, optionalUrl, optionalDate, HttpError } from "@/lib/api";
import { requireApprovedBusiness } from "@/lib/business";

const schema = z.object({
  listingType: z.enum(["product", "event"]),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  imageUrl: optionalUrl,
  location: z.string().trim().max(120).optional(),
  externalUrl: optionalUrl,
  startsAt: optionalDate,
  endsAt: optionalDate,
});

/** Create a DRAFT listing — an admin publishes it. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser();
    const business = await requireApprovedBusiness(user.id);
    const data = schema.parse(await req.json());
    if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) throw new HttpError(400, "End date is before start date");
    const listing = await prisma.listing.create({
      data: {
        businessId: business.id,
        listingType: data.listingType,
        title: data.title,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        location: data.location || null,
        externalUrl: data.externalUrl || null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status: "draft",
        isSponsored: false,
      },
    });
    await prisma.auditEvent.create({
      data: { actorId: user.id, action: "business.create_listing", targetType: "listing", targetId: listing.id },
    });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
