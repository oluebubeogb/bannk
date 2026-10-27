import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(["active", "paused", "ended", "draft"]) });

export const PATCH = withAdmin<Ctx>(async (req, { params }, admin) => {
  const { id } = await params;
  const { status } = schema.parse(await req.json());
  const campaign = await prisma.campaign.findUnique({ where: { id }, include: { business: true } });
  if (!campaign) throw new HttpError(404, "Campaign not found");
  if (status === "active" && campaign.business && campaign.business.verificationStatus !== "approved") {
    throw new HttpError(400, "Approve the business before activating its campaigns");
  }
  if (campaign.status === "ended" && status !== "ended") throw new HttpError(400, "Ended campaigns can't be restarted");
  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.campaign.update({ where: { id }, data: { status } });
    // Sponsored campaigns light up their listing in Discover
    if (status === "active" && campaign.listingId) {
      await tx.listing.update({ where: { id: campaign.listingId }, data: { isSponsored: true } });
    }
    await tx.auditEvent.create({
      data: {
        actorId: admin.id,
        action: "admin.update_campaign",
        targetType: "campaign",
        targetId: id,
        metadata: JSON.stringify({ from: campaign.status, to: status }),
      },
    });
    return c;
  });
  return NextResponse.json({ campaign: updated });
});
