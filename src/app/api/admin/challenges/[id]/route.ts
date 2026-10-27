import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/api";
import { challengeSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };
const patchSchema = challengeSchema.partial();

export const PATCH = withAdmin<Ctx>(async (req, { params }, admin) => {
  const { id } = await params;
  const raw = await req.json();
  const data = patchSchema.parse(raw);
  const existing = await prisma.challenge.findUnique({ where: { id }, include: { _count: { select: { completions: true } } } });
  if (!existing) throw new HttpError(404, "Challenge not found");
  if (data.rewardMinor !== undefined && data.rewardMinor !== existing.rewardMinor && existing._count.completions > 0) {
    throw new HttpError(400, "Reward can't change after people have completed it — end it and create a new one");
  }
  const update: Record<string, unknown> = {};
  for (const k of Object.keys(raw)) {
    if (k in data) update[k] = (data as Record<string, unknown>)[k];
  }
  if ("description" in update) update.description = update.description || null;
  if ("campaignId" in update) update.campaignId = update.campaignId || null;

  const challenge = await prisma.$transaction(async (tx) => {
    const c = await tx.challenge.update({ where: { id }, data: update });
    await tx.auditEvent.create({
      data: {
        actorId: admin.id,
        action: "admin.update_challenge",
        targetType: "challenge",
        targetId: id,
        metadata: JSON.stringify({ changes: update }),
      },
    });
    return c;
  });
  return NextResponse.json({ challenge });
});
