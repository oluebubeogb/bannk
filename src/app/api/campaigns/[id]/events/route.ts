import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, requireUser, HttpError } from "@/lib/api";
import { recordCampaignEvent } from "@/lib/campaign-events";

const schema = z.object({ eventType: z.enum(["impression", "click", "join"]) });

/** Discover hook: impression/click once per user/day, join once per user. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { eventType } = schema.parse(await req.json());
    const campaign = await prisma.campaign.findFirst({ where: { id, status: "active" }, select: { id: true } });
    if (!campaign) throw new HttpError(404, "Campaign not available");
    const res = await recordCampaignEvent({ campaignId: id, userId: user.id, eventType });
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    return handleError(err);
  }
}
