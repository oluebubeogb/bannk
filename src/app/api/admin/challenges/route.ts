import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/api";
import { challengeSchema } from "@/lib/schemas";

export const GET = withAdmin(async () => {
  const challenges = await prisma.challenge.findMany({
    include: {
      _count: { select: { completions: true } },
      campaign: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ challenges });
});


export const POST = withAdmin(async (req, _ctx, admin) => {
  const data = challengeSchema.parse(await req.json());
  if (data.campaignId && !(await prisma.campaign.findUnique({ where: { id: data.campaignId } })))
    throw new HttpError(404, "Campaign not found");
  if (data.kind === "sponsored" && !data.campaignId) throw new HttpError(400, "Sponsored challenges need a campaign");
  const challenge = await prisma.$transaction(async (tx) => {
    const c = await tx.challenge.create({
      data: {
        title: data.title,
        description: data.description || null,
        kind: data.kind,
        status: data.status,
        rewardMinor: data.rewardMinor,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        campaignId: data.campaignId || null,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: admin.id,
        action: "admin.create_challenge",
        targetType: "challenge",
        targetId: c.id,
        metadata: JSON.stringify({ title: c.title, rewardMinor: c.rewardMinor, status: c.status }),
      },
    });
    return c;
  });
  return NextResponse.json({ challenge }, { status: 201 });
});
