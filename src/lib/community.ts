/**
 * Community — challenges, groups, leaderboard (real data only).
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { completeChallengeWithReward } from "./ledger";
import { recordCampaignEvent } from "./campaign-events";
import { HttpError } from "./api";

export function challengeIsOpen(c: { status: string; startsAt: Date | null; endsAt: Date | null }, now = new Date()) {
  if (c.status !== "active") return false;
  if (c.startsAt && c.startsAt > now) return false;
  if (c.endsAt && c.endsAt < now) return false;
  return true;
}

export async function listActiveChallenges(userId: string) {
  const now = new Date();
  const challenges = await prisma.challenge.findMany({
    where: {
      status: "active",
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    include: {
      _count: { select: { completions: true } },
      completions: { where: { userId }, select: { id: true, createdAt: true } },
      campaign: { select: { id: true, title: true, business: { select: { name: true } } } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 50,
  });
  return challenges.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    kind: c.kind,
    rewardMinor: c.rewardMinor,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    upcoming: !!(c.startsAt && c.startsAt > now),
    completions: c._count.completions,
    completedAt: c.completions[0]?.createdAt ?? null,
    sponsor: c.campaign ? c.campaign.business?.name ?? c.campaign.title : null,
  }));
}

export async function completeChallenge(userId: string, challengeId: string, currencyCode: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new HttpError(404, "Challenge not found");
  if (!challengeIsOpen(challenge)) throw new HttpError(400, "Challenge is not open");

  const result = await completeChallengeWithReward({
    userId,
    challengeId,
    rewardMinor: challenge.rewardMinor,
    currencyCode,
    campaignId: challenge.campaignId,
    title: challenge.title,
  });

  if (!result.alreadyCompleted && challenge.campaignId) {
    await recordCampaignEvent({ campaignId: challenge.campaignId, userId, eventType: "complete" }).catch(
      () => undefined
    );
  }
  return {
    alreadyCompleted: result.alreadyCompleted,
    rewardMinor: result.alreadyCompleted ? 0 : challenge.rewardMinor,
    reference: result.journal?.reference ?? null,
  };
}

// ─── Groups ────────────────────────────────────────────────

export async function listGroups(userId: string, q?: string) {
  const where: Prisma.CommunityGroupWhereInput = {
    OR: [{ visibility: "public" }, { members: { some: { userId } } }],
  };
  if (q) {
    where.AND = [
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }
  const groups = await prisma.communityGroup.findMany({
    where,
    include: {
      _count: { select: { members: true } },
      members: { where: { userId }, select: { role: true } },
      createdBy: { select: { profile: { select: { username: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    description: g.description,
    visibility: g.visibility,
    memberCount: g._count.members,
    myRole: g.members[0]?.role ?? null,
    createdBy: g.createdBy.profile?.username ?? null,
    createdAt: g.createdAt,
  }));
}

export async function createGroup(
  userId: string,
  input: { name: string; description?: string; visibility: "public" | "private"; slug: string }
) {
  let slug = input.slug || "group";
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.communityGroup.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${input.slug}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return prisma.$transaction(async (tx) => {
    const group = await tx.communityGroup.create({
      data: {
        name: input.name,
        slug,
        description: input.description || null,
        visibility: input.visibility,
        createdByUserId: userId,
        members: { create: { userId, role: "mod" } },
      },
    });
    await tx.auditEvent.create({
      data: { actorId: userId, action: "community.group_create", targetType: "group", targetId: group.id },
    });
    return group;
  });
}

export async function joinGroup(userId: string, groupId: string) {
  const group = await prisma.communityGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new HttpError(404, "Group not found");
  if (group.visibility !== "public") throw new HttpError(403, "This group is private");
  await prisma.communityGroupMember.upsert({
    where: { groupId_userId: { groupId, userId } },
    create: { groupId, userId, role: "member" },
    update: {},
  });
  return { joined: true };
}

export async function leaveGroup(userId: string, groupId: string) {
  const membership = await prisma.communityGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) return { left: true };
  if (membership.role === "mod") {
    const otherMods = await prisma.communityGroupMember.count({
      where: { groupId, role: "mod", userId: { not: userId } },
    });
    const others = await prisma.communityGroupMember.count({ where: { groupId, userId: { not: userId } } });
    if (otherMods === 0 && others > 0) {
      // Hand moderation to the longest-standing member
      const next = await prisma.communityGroupMember.findFirst({
        where: { groupId, userId: { not: userId } },
        orderBy: { joinedAt: "asc" },
      });
      if (next) await prisma.communityGroupMember.update({ where: { id: next.id }, data: { role: "mod" } });
    }
  }
  await prisma.communityGroupMember.delete({ where: { id: membership.id } });
  return { left: true };
}

export async function getGroupMembers(groupId: string, userId: string) {
  const group = await prisma.communityGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new HttpError(404, "Group not found");
  if (group.visibility !== "public") {
    const m = await prisma.communityGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (!m) throw new HttpError(403, "This group is private");
  }
  const members = await prisma.communityGroupMember.findMany({
    where: { groupId },
    include: { user: { select: { profile: { select: { username: true, displayName: true } } } } },
    orderBy: { joinedAt: "asc" },
    take: 200,
  });
  return members.map((m) => ({
    username: m.user.profile?.username ?? null,
    displayName: m.user.profile?.displayName ?? null,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}

// ─── Leaderboard ───────────────────────────────────────────

type BalRow = { username: string; displayName: string | null; value: bigint | number | null };

export async function getLeaderboard(currencyCode = "NGN", limit = 10) {
  const balances = await prisma.$queryRaw<BalRow[]>`
    SELECT p."username", p."displayName",
           SUM(CASE WHEN je."direction" = 'credit' THEN je."amountMinor" ELSE -je."amountMinor" END) AS value
    FROM "JournalEntry" je
    JOIN "LedgerAccount" la ON la."id" = je."ledgerAccountId"
    JOIN "Wallet" w ON w."id" = la."walletId"
    JOIN "User" u ON u."id" = w."ownerUserId"
    JOIN "Profile" p ON p."userId" = u."id"
    WHERE la."accountType" = 'available'
      AND w."walletType" = 'personal'
      AND w."currencyCode" = ${currencyCode}
      AND u."status" = 'active'
      AND u."emailVerifiedAt" IS NOT NULL
      AND p."visibility" = 'public'
    GROUP BY p."username", p."displayName"
    ORDER BY value DESC
    LIMIT ${limit}`;

  const portfolios = await prisma.$queryRaw<BalRow[]>`
    SELECT p."username", p."displayName",
           SUM(h."quantityUnits"::bigint * COALESCE(lp."priceMinor", h."averageCostMinor")) AS value
    FROM "Holding" h
    JOIN "User" u ON u."id" = h."userId"
    JOIN "Profile" p ON p."userId" = u."id"
    LEFT JOIN LATERAL (
      SELECT mp."priceMinor" FROM "MarketPrice" mp
      WHERE mp."assetId" = h."assetId"
      ORDER BY mp."effectiveAt" DESC LIMIT 1
    ) lp ON TRUE
    WHERE h."quantityUnits" > 0
      AND u."status" = 'active'
      AND p."visibility" = 'public'
    GROUP BY p."username", p."displayName"
    ORDER BY value DESC
    LIMIT ${limit}`;

  const challengers = await prisma.$queryRaw<BalRow[]>`
    SELECT p."username", p."displayName", COUNT(cc."id") AS value
    FROM "ChallengeCompletion" cc
    JOIN "User" u ON u."id" = cc."userId"
    JOIN "Profile" p ON p."userId" = u."id"
    WHERE u."status" = 'active' AND p."visibility" = 'public'
    GROUP BY p."username", p."displayName"
    ORDER BY value DESC
    LIMIT ${limit}`;

  const map = (rows: BalRow[]) =>
    rows.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      displayName: r.displayName,
      value: Number(r.value ?? 0),
    }));

  return {
    currencyCode,
    balances: map(balances),
    portfolios: map(portfolios),
    challenges: map(challengers),
    note: "Public profiles only.",
  };
}
