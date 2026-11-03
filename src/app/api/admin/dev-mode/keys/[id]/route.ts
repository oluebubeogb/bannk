import { NextResponse } from "next/server";
import { HttpError } from "@/lib/api";
import { audit, withAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (_r, ctx, admin) => {
  const k = await prisma.devApiKey.findUnique({ where: { id: (await ctx.params).id } });
  if (!k) throw new HttpError(404, "Key not found");
  await prisma.devApiKey.update({ where: { id: k.id }, data: { revokedAt: k.revokedAt ?? new Date() } });
  await audit(admin.id, "admin.devmode.key_revoked", "user", k.userId, { apiKey: k.apiKey });
  return NextResponse.json({ ok: true });
});
