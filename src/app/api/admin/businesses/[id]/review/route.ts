import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().min(3, "A reason is required").max(500),
});

export const POST = withAdmin<Ctx>(async (req, { params }, admin) => {
  const { id } = await params;
  const { decision, reason } = schema.parse(await req.json());
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) throw new HttpError(404, "Business not found");
  const status = decision === "approve" ? "approved" : "rejected";

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id },
      data: { verificationStatus: status, reviewNote: reason, reviewedAt: new Date() },
    });
    if (status === "rejected") {
      // Rejected businesses can't keep anything live
      await tx.listing.updateMany({ where: { businessId: id, status: "published" }, data: { status: "paused" } });
      await tx.campaign.updateMany({ where: { businessId: id, status: "active" }, data: { status: "paused" } });
    }
    await tx.notification.create({
      data: {
        userId: business.ownerUserId,
        type: "business.review",
        title: status === "approved" ? `${business.name} was approved` : `${business.name} was not approved`,
        body: reason,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: admin.id,
        action: status === "approved" ? "admin.approve_business" : "admin.reject_business",
        targetType: "business",
        targetId: id,
        metadata: JSON.stringify({ reason, previousStatus: business.verificationStatus }),
      },
    });
  });
  return NextResponse.json({ ok: true, status });
});
