import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, requireVerifiedUser, HttpError } from "@/lib/api";
import { requireApprovedBusiness } from "@/lib/business";

const schema = z.object({ status: z.enum(["paused", "archived"]) });

/** Owner can pause a published listing or archive their own listing. Publishing is admin-only. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireVerifiedUser();
    const business = await requireApprovedBusiness(user.id);
    const { id } = await params;
    const { status } = schema.parse(await req.json());
    const listing = await prisma.listing.findFirst({ where: { id, businessId: business.id } });
    if (!listing) throw new HttpError(404, "Listing not found");
    if (status === "paused" && listing.status !== "published") throw new HttpError(400, "Only published listings can be paused");
    const updated = await prisma.listing.update({ where: { id }, data: { status } });
    await prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: `business.${status === "paused" ? "pause" : "archive"}_listing`,
        targetType: "listing",
        targetId: id,
      },
    });
    return NextResponse.json({ listing: updated });
  } catch (err) {
    return handleError(err);
  }
}
