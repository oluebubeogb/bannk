import { NextResponse } from "next/server";
import { z } from "zod";
import { handleError, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { keyView } from "@/lib/devmode";
import { getPaymentProvider } from "@/lib/payments";

/** Any signed-in user: Dev Mode state, own keys, recent charges and API calls. */
export async function GET() {
  try {
    const user = await requireUser();
    const [u, keys, txns, logs] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { devModeEnabledAt: true } }),
      prisma.devApiKey.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      prisma.devTransaction.findMany({ where: { merchantUserId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.devApiLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    return NextResponse.json({ enabled: !!u?.devModeEnabledAt, enabledAt: u?.devModeEnabledAt, provider: getPaymentProvider().name, appUrl: process.env.APP_URL || "", keys: keys.map(keyView), transactions: txns, logs });
  } catch (e) { return handleError(e); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { enabled } = z.object({ enabled: z.boolean() }).parse(await req.json());
    await prisma.user.update({ where: { id: user.id }, data: { devModeEnabledAt: enabled ? new Date() : null } });
    return NextResponse.json({ ok: true, enabled });
  } catch (e) { return handleError(e); }
}
