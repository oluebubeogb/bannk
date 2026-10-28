import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getReceiptForUser } from "@/lib/receipts";
import { receiptPdf } from "@/lib/receiptRender";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/transfers/[id]/pdf — premium receipt (pdf). Party-only. ?download=1 forces a download. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await getReceiptForUser(id, user.id);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error === 404 ? "Receipt not found" : "You are not a party to this transaction" },
      { status: result.error }
    );
  }
  try {
    const buf = await receiptPdf(result.receipt);
    const filename = `bannk-receipt-${result.receipt.reference}.pdf`;
    const disp = req.nextUrl.searchParams.get("download") ? "attachment" : "inline";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disp}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e: any) {
    console.error("[receipt/pdf] render failed:", e?.message || e);
    return NextResponse.json({ error: "Couldn't render the receipt" }, { status: 500 });
  }
}
