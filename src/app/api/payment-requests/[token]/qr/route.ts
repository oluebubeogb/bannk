import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentRequestQrPng } from "@/lib/paymentRequests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/payment-requests/[token]/qr — branded invoice QR (amount, description, @payee). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pr = await prisma.paymentRequest.findUnique({ where: { token }, include: { payee: { include: { profile: true } } } });
  if (!pr || !pr.payee.profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const png = await paymentRequestQrPng(pr, pr.payee.profile.username);
  const disp = req.nextUrl.searchParams.get("download") ? "attachment" : "inline";
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${disp}; filename="bannk-request-${pr.token}.png"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
