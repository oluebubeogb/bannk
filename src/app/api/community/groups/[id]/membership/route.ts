import { NextRequest, NextResponse } from "next/server";
import { handleError, requireVerifiedUser } from "@/lib/api";
import { joinGroup, leaveGroup } from "@/lib/community";

type Ctx = { params: Promise<{ id: string }> };

/** Join a public group */
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireVerifiedUser();
    const { id } = await params;
    return NextResponse.json(await joinGroup(user.id, id));
  } catch (err) {
    return handleError(err);
  }
}

/** Leave a group */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireVerifiedUser();
    const { id } = await params;
    return NextResponse.json(await leaveGroup(user.id, id));
  } catch (err) {
    return handleError(err);
  }
}
