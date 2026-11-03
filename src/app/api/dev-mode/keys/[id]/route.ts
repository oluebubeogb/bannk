import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleError, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

async function own(userId: string, id: string) {
  const k = await prisma.devApiKey.findUnique({ where: { id } });
  if (!k || k.userId !== userId) throw new HttpError(404, "Key not found");
  return k;
}

/** Revoke */
export async function DELETE(_r: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const k = await own(user.id, (await ctx.params).id);
    await prisma.devApiKey.update({ where: { id: k.id }, data: { revokedAt: k.revokedAt ?? new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleError(e); }
}

/** Set webhook URL */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const k = await own(user.id, (await ctx.params).id);
    const { webhookUrl } = z.object({ webhookUrl: z.string().url().max(300).or(z.literal("")) }).parse(await req.json());
    await prisma.devApiKey.update({ where: { id: k.id }, data: { webhookUrl: webhookUrl || null } });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleError(e); }
}
