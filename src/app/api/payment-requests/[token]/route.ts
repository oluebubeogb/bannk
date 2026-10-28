import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { serializePaymentRequest } from "@/lib/paymentRequests";

export const dynamic = "force-dynamic";

async function load(token: string) {
  return prisma.paymentRequest.findUnique({
    where: { token },
    include: { payee: { include: { profile: true } } },
  });
}

/** GET /api/payment-requests/[token] — invoice view (anyone with the link). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pr = await load(token);
  if (!pr || !pr.payee.profile || pr.payee.status !== "active") return jsonError("Payment request not found", 404);
  const viewer = await getSessionUser();
  const out = serializePaymentRequest(pr, { username: pr.payee.profile.username, displayName: pr.payee.profile.displayName });
  return NextResponse.json({
    request: { ...out, transactionId: viewer && (viewer.id === pr.payeeUserId || viewer.id === pr.paidByUserId) ? out.transactionId : null },
    isMine: viewer?.id === pr.payeeUserId,
    signedIn: !!viewer,
  });
}

/** DELETE /api/payment-requests/[token] — payee cancels an open request. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const user = await requireUser();
    const { token } = await params;
    const res = await prisma.paymentRequest.updateMany({
      where: { token, payeeUserId: user.id, status: "open" },
      data: { status: "cancelled" },
    });
    if (res.count !== 1) return jsonError("Request not found or no longer open", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
