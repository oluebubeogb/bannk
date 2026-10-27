import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";

export const GET = withAdmin(async (req) => {
  const sp = new URL(req.url).searchParams;
  const action = sp.get("action") || undefined;
  const limit = Math.min(Number(sp.get("limit")) || 100, 500);
  const events = await prisma.auditEvent.findMany({
    where: action ? { action: { startsWith: action } } : {},
    include: { actor: { select: { profile: { select: { username: true } } } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      action: e.action,
      actor: e.actor?.profile?.username ?? null,
      targetType: e.targetType,
      targetId: e.targetId,
      metadata: e.metadata,
      createdAt: e.createdAt,
    })),
  });
});
