import { NextRequest, NextResponse } from "next/server";
import { handleError, requireVerifiedUser } from "@/lib/api";
import { completeChallenge } from "@/lib/community";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireVerifiedUser();
    const { id } = await params;
    const result = await completeChallenge(user.id, id, user.profile?.homeCurrency || "NGN");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return handleError(err);
  }
}
