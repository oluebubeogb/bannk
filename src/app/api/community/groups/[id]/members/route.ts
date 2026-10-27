import { NextRequest, NextResponse } from "next/server";
import { handleError, requireUser } from "@/lib/api";
import { getGroupMembers } from "@/lib/community";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json({ members: await getGroupMembers(id, user.id) });
  } catch (err) {
    return handleError(err);
  }
}
