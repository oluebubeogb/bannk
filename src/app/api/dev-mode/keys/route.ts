import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleError, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createApiKey } from "@/lib/devmode";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const u = await prisma.user.findUnique({ where: { id: user.id } });
    if (!u?.devModeEnabledAt) throw new HttpError(400, "Enable Dev Mode first");
    const active = await prisma.devApiKey.count({ where: { userId: user.id, revokedAt: null } });
    if (active >= 10) throw new HttpError(400, "Max 10 active keys — revoke one first");
    const { label } = z.object({ label: z.string().max(40).optional() }).parse(await req.json().catch(() => ({})));
    const key = await createApiKey(user.id, label, user.id);
    return NextResponse.json({ ok: true, key });
  } catch (e) { return handleError(e); }
}
