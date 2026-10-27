import { NextResponse } from "next/server";
import { handleError, requireUser } from "@/lib/api";
import { listActiveChallenges } from "@/lib/community";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ challenges: await listActiveChallenges(user.id) });
  } catch (err) {
    return handleError(err);
  }
}
