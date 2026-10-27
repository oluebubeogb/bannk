import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, requireVerifiedUser, optionalUrl, HttpError } from "@/lib/api";
import { getOwnBusiness } from "@/lib/business";
import { campaignMetrics } from "@/lib/campaign-events";

export async function GET() {
  try {
    const user = await requireVerifiedUser();
    const business = await getOwnBusiness(user.id);
    if (!business) return NextResponse.json({ business: null, listings: [], campaigns: [] });

    const [listings, campaigns] = await Promise.all([
      prisma.listing.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } }),
      prisma.campaign.findMany({
        where: { businessId: business.id },
        include: { listing: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const metrics = await campaignMetrics(campaigns.map((c) => c.id));
    return NextResponse.json({
      business,
      listings,
      campaigns: campaigns.map((c) => ({ ...c, metrics: metrics[c.id] })),
    });
  } catch (err) {
    return handleError(err);
  }
}

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional(),
  website: optionalUrl,
  contactEmail: z
    .string()
    .trim()
    .email()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/** Submit (or resubmit after rejection / edit) the business profile. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser();
    const data = schema.parse(await req.json());
    const existing = await getOwnBusiness(user.id);

    const fields = {
      name: data.name,
      description: data.description || null,
      website: data.website || null,
      contactEmail: data.contactEmail || null,
    };

    let business;
    if (!existing) {
      business = await prisma.business.create({
        data: { ...fields, ownerUserId: user.id, verificationStatus: "pending" },
      });
    } else {
      if (existing.verificationStatus === "approved" && existing.name !== data.name) {
        throw new HttpError(400, "Approved businesses can't be renamed here — contact support");
      }
      business = await prisma.business.update({
        where: { id: existing.id },
        data: {
          ...fields,
          // Rejected → back into the review queue on resubmit
          ...(existing.verificationStatus === "rejected" ? { verificationStatus: "pending", reviewNote: null } : {}),
        },
      });
    }
    await prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: existing ? "business.update_profile" : "business.submit",
        targetType: "business",
        targetId: business.id,
        metadata: JSON.stringify({ status: business.verificationStatus }),
      },
    });
    return NextResponse.json({ business }, { status: existing ? 200 : 201 });
  } catch (err) {
    return handleError(err);
  }
}
