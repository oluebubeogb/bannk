import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getReceiptForUser } from "@/lib/receipts";
import { appUrl } from "@/lib/mail";
import { receiptText } from "@/lib/receiptRender";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  return NextResponse.json({
    receipt: result.receipt,
    shareUrl: appUrl(`/receipt/${result.receipt.id}`),
    shareText: receiptText(result.receipt),
  });
}
