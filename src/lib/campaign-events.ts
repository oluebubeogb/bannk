/**
 * Campaign event recording with dedupe keys so impressions/clicks can't be spammed.
 *  - impression / click: once per user per campaign per UTC day
 *  - join / complete: once per user per campaign
 */
import { prisma } from "./prisma";

export type CampaignEventType = "impression" | "click" | "join" | "complete";

export function dedupeKeyFor(eventType: CampaignEventType, campaignId: string, userId: string, now = new Date()) {
  if (eventType === "impression" || eventType === "click") {
    return `${eventType}:${campaignId}:${userId}:${now.toISOString().slice(0, 10)}`;
  }
  return `${eventType}:${campaignId}:${userId}`;
}

export async function recordCampaignEvent(params: {
  campaignId: string;
  userId: string;
  eventType: CampaignEventType;
  metadata?: Record<string, unknown>;
}) {
  const dedupeKey = dedupeKeyFor(params.eventType, params.campaignId, params.userId);
  try {
    await prisma.campaignEvent.create({
      data: {
        campaignId: params.campaignId,
        userId: params.userId,
        eventType: params.eventType,
        dedupeKey,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
    return { recorded: true };
  } catch (err: any) {
    if (err?.code === "P2002") return { recorded: false, duplicate: true };
    throw err;
  }
}

export async function campaignMetrics(campaignIds: string[]) {
  const out: Record<string, { impression: number; click: number; join: number; complete: number; uniqueUsers: number }> = {};
  for (const id of campaignIds) out[id] = { impression: 0, click: 0, join: 0, complete: 0, uniqueUsers: 0 };
  if (campaignIds.length === 0) return out;

  const grouped = await prisma.campaignEvent.groupBy({
    by: ["campaignId", "eventType"],
    where: { campaignId: { in: campaignIds } },
    _count: { _all: true },
  });
  for (const g of grouped) {
    const bucket = out[g.campaignId];
    if (bucket && g.eventType in bucket) (bucket as any)[g.eventType] = g._count._all;
  }
  const uniques = await prisma.campaignEvent.groupBy({
    by: ["campaignId", "userId"],
    where: { campaignId: { in: campaignIds } },
  });
  for (const u of uniques) if (out[u.campaignId]) out[u.campaignId].uniqueUsers += 1;
  return out;
}
