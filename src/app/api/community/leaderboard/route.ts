import { NextResponse } from "next/server";
import { handleError, requireUser } from "@/lib/api";
import { getLeaderboard } from "@/lib/community";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await getLeaderboard(user.profile?.homeCurrency || "NGN"));
  } catch (err) {
    return handleError(err);
  }
}
