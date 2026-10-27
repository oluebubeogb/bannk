import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, requireVerifiedUser, HttpError } from "@/lib/api";

const schema = z.object({
  targetType: z.enum(["listing", "user", "campaign"]),
  targetId: z.string().trim().min(1).max(64),
  reason: z.string().trim().min(3).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser();
    const data = schema.parse(await req.json());

    let targetId = data.targetId;
    if (data.targetType === "listing") {
      if (!(await prisma.listing.findUnique({ where: { id: targetId }, select: { id: true } })))
        throw new HttpError(404, "Listing not found");
    } else if (data.targetType === "campaign") {
      if (!(await prisma.campaign.findUnique({ where: { id: targetId }, select: { id: true } })))
        throw new HttpError(404, "Campaign not found");
    } else {
      // user: accept a user id or a username
      const profile = await prisma.profile.findFirst({
        where: { OR: [{ userId: targetId }, { username: targetId.replace(/^@/, "").toLowerCase() }] },
        select: { userId: true },
      });
      if (!profile) throw new HttpError(404, "User not found");
      if (profile.userId === user.id) throw new HttpError(400, "You can't report yourself");
      targetId = profile.userId;
    }

    // One open report per reporter per target
    const existing = await prisma.report.findFirst({
      where: { reporterId: user.id, targetType: data.targetType, targetId, status: "open" },
    });
    if (existing) return NextResponse.json({ ok: true, report: { id: existing.id }, duplicate: true });

    const recent = await prisma.report.count({
      where: { reporterId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= 10) throw new HttpError(429, "Too many reports — try again later");

    const report = await prisma.report.create({
      data: { reporterId: user.id, targetType: data.targetType, targetId, reason: data.reason },
    });
    return NextResponse.json({ ok: true, report: { id: report.id } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
