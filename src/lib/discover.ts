/**
 * Discover — first-party commercial listings & campaigns
 */

import { prisma } from "./prisma";

export async function listListings(opts?: {
  type?: string;
  q?: string;
  sponsoredOnly?: boolean;
  limit?: number;
}) {
  const where: any = { status: "published" };
  if (opts?.type) where.listingType = opts.type;
  if (opts?.sponsoredOnly) where.isSponsored = true;
  if (opts?.q) {
    where.OR = [
      { title: { contains: opts.q, mode: "insensitive" } },
      { description: { contains: opts.q, mode: "insensitive" } },
      { location: { contains: opts.q, mode: "insensitive" } },
    ];
  }

  return prisma.listing.findMany({
    where,
    include: {
      business: { select: { name: true, verificationStatus: true } },
      campaigns: {
        where: {
          status: "active",
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
          ],
        },
        select: { id: true, title: true, description: true },
        take: 3,
      },
    },
    orderBy: [{ isSponsored: "desc" }, { createdAt: "desc" }],
    take: opts?.limit ?? 40,
  });
}

export async function getListing(id: string) {
  return prisma.listing.findFirst({
    where: { id, status: "published" },
    include: {
      business: { select: { name: true, verificationStatus: true } },
      campaigns: {
        where: { status: "active" },
        take: 5,
      },
    },
  });
}

export async function createListing(params: {
  businessId?: string;
  listingType: "product" | "event";
  title: string;
  description?: string;
  imageUrl?: string;
  location?: string;
  externalUrl?: string;
  isSponsored?: boolean;
  startsAt?: Date;
  endsAt?: Date;
  publish?: boolean;
}) {
  return prisma.listing.create({
    data: {
      businessId: params.businessId,
      listingType: params.listingType,
      title: params.title,
      description: params.description,
      imageUrl: params.imageUrl,
      location: params.location,
      externalUrl: params.externalUrl,
      isSponsored: params.isSponsored ?? false,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      status: params.publish ? "published" : "draft",
    },
  });
}

export async function toggleBookmark(userId: string, listingId: string) {
  const existing = await prisma.bookmark.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.bookmark.create({ data: { userId, listingId } });
  return { bookmarked: true };
}

export async function joinCampaign(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, status: "active" },
  });
  if (!campaign) throw new Error("Campaign not available");
  const { recordCampaignEvent } = await import("./campaign-events");
  const res = await recordCampaignEvent({ campaignId, userId, eventType: "join" });
  return { ok: true, campaignId, alreadyJoined: !res.recorded };
}
