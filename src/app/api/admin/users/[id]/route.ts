import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin, isAdminUsername } from "@/lib/admin";
import { HttpError } from "@/lib/api";
import { getTransactionHistory, getWalletBalance } from "@/lib/ledger";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAdmin<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      wallets: { where: { walletType: "personal" } },
      businesses: { select: { id: true, name: true, verificationStatus: true } },
    },
  });
  if (!user || user.email === "system@bannk.internal") throw new HttpError(404, "User not found");

  const wallets = await Promise.all(
    user.wallets.map(async (w) => ({ id: w.id, currencyCode: w.currencyCode, balanceMinor: await getWalletBalance(w.id) }))
  );
  const [history, audit, reportsAgainst] = await Promise.all([
    getTransactionHistory(user.id, 20),
    prisma.auditEvent.findMany({
      where: { targetType: "user", targetId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { profile: { select: { username: true } } } } },
    }),
    prisma.report.count({ where: { targetType: "user", targetId: user.id } }),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.profile?.username ?? null,
      displayName: user.profile?.displayName ?? null,
      homeCurrency: user.profile?.homeCurrency ?? "NGN",
      status: user.status,
      verified: !!user.emailVerifiedAt,
      isAdmin: isAdminUsername(user.profile?.username),
      createdAt: user.createdAt,
      businesses: user.businesses,
    },
    wallets,
    history,
    reportsAgainst,
    audit: audit.map((a) => ({
      id: a.id,
      action: a.action,
      actor: a.actor?.profile?.username ?? null,
      metadata: a.metadata ? JSON.parse(a.metadata) : null,
      createdAt: a.createdAt,
    })),
  });
});
