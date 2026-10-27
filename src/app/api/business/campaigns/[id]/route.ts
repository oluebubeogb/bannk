import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, requireVerifiedUser, HttpError } from "@/lib/api";
import { requireApprovedBusiness } from "@/lib/business";

const schema = z.object({ status: z.enum(["paused"]) });

/** Owner can pause their own active campaign. Activation is admin-only. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireVerifiedUser();
    const business = await requireApprovedBusiness(user.id);
    const { id } = await params;
    const { status } = schema.parse(await req.json());
    const campaign = await prisma.campaign.findFirst({ where: { id, businessId: business.id } });
    if (!campaign) throw new HttpError(404, "Campaign not found");
    if (campaign.status !== "active") throw new HttpError(400, "Only active campaigns can be paused");
    const updated = await prisma.campaign.update({ where: { id }, data: { status } });
    await prisma.auditEvent.create({
      data: { actorId: user.id, action: "business.pause_campaign", targetType: "campaign", targetId: id },
    });
    return NextResponse.json({ campaign: updated });
  } catch (err) {
    return handleError(err);
  }
}
