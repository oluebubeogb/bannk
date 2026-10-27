import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  status: z.enum(["published", "paused", "archived", "draft"]).optional(),
  isSponsored: z.boolean().optional(),
  reason: z.string().trim().max(500).optional(),
});

export const PATCH = withAdmin<Ctx>(async (req, { params }, admin) => {
  const { id } = await params;
  const data = schema.parse(await req.json());
  const listing = await prisma.listing.findUnique({ where: { id }, include: { business: true } });
  if (!listing) throw new HttpError(404, "Listing not found");
  if (data.status === "published" && listing.business && listing.business.verificationStatus !== "approved") {
    throw new HttpError(400, "Approve the business before publishing its listings");
  }
  const updated = await prisma.$transaction(async (tx) => {
    const l = await tx.listing.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.isSponsored !== undefined ? { isSponsored: data.isSponsored } : {}),
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: admin.id,
        action: "admin.update_listing",
        targetType: "listing",
        targetId: id,
        metadata: JSON.stringify({ from: listing.status, ...data }),
      },
    });
    return l;
  });
  return NextResponse.json({ listing: updated });
});
