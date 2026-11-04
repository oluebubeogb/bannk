import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/api";
import { audit, withAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createApiKey, keyView } from "@/lib/devmode";

async function userByUsername(raw: string) {
  const p = await prisma.profile.findUnique({ where: { username: raw.trim().replace(/^@/, "").toLowerCase() }, include: { user: true } });
  if (!p) throw new HttpError(404, "No account with that username");
  return p;
}

/** GET ?username= → that account's keys, charges, transfers, API calls. No username → platform-wide recent activity. */
export const GET = withAdmin(async (req) => {
  const u = new URL(req.url);
  const username = u.searchParams.get("username");
  const take = Math.min(Number(u.searchParams.get("limit") || 100), 500);
  if (!username) {
    const [txns, logs, keyCount, enabledCount, paid] = await Promise.all([
      prisma.devTransaction.findMany({ orderBy: { createdAt: "desc" }, take, include: { merchant: { include: { profile: true } } } }),
      prisma.devApiLog.findMany({ orderBy: { createdAt: "desc" }, take }),
      prisma.devApiKey.count({ where: { revokedAt: null } }),
      prisma.user.count({ where: { devModeEnabledAt: { not: null } } }),
      prisma.devTransaction.aggregate({ where: { status: "PAID" }, _sum: { amountMinor: true }, _count: true }),
    ]);
    const ids = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const profs = await prisma.profile.findMany({ where: { userId: { in: ids } } });
    const name = new Map(profs.map((p) => [p.userId, p.username]));
    return NextResponse.json({
      scope: "all", stats: { activeKeys: keyCount, devModeUsers: enabledCount, paidCount: paid._count, paidMinor: Number(paid._sum.amountMinor || 0) },
      transactions: txns.map(({ merchant, ...t }) => ({ ...t, merchantUsername: merchant.profile?.username })),
      logs: logs.map((l) => ({ ...l, username: l.userId ? name.get(l.userId) : null })),
    });
  }
  const p = await userByUsername(username);
  const [keys, txns, logs] = await Promise.all([
    prisma.devApiKey.findMany({ where: { userId: p.userId }, orderBy: { createdAt: "desc" } }),
    prisma.devTransaction.findMany({ where: { OR: [{ merchantUserId: p.userId }, { payerUsername: p.username }] }, orderBy: { createdAt: "desc" }, take }),
    prisma.devApiLog.findMany({ where: { userId: p.userId }, orderBy: { createdAt: "desc" }, take }),
  ]);
  return NextResponse.json({
    scope: "user", account: { username: p.username, displayName: p.displayName, status: p.user.status, devModeEnabledAt: p.user.devModeEnabledAt },
    keys: keys.map(keyView), transactions: txns, logs,
  });
});

/** POST {username, label?, enableDevMode?} → create a key for that account (secret returned once). */
export const POST = withAdmin(async (req, _c, admin) => {
  const d = z.object({ username: z.string().min(2), label: z.string().max(40).optional(), enableDevMode: z.boolean().default(true) }).parse(await req.json());
  const p = await userByUsername(d.username);
  if (!p.user.devModeEnabledAt) {
    if (!d.enableDevMode) throw new HttpError(400, "Dev Mode is off for this account");
    await prisma.user.update({ where: { id: p.userId }, data: { devModeEnabledAt: new Date() } });
  }
  const key = await createApiKey(p.userId, d.label || "Issued by admin", admin.id);
  await audit(admin.id, "admin.devmode.key_created", "user", p.userId, { username: p.username, apiKey: key.apiKey });
  return NextResponse.json({ ok: true, key });
});
