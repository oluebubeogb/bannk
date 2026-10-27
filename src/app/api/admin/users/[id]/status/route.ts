import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  status: z.enum(["active", "suspended"]),
  reason: z.string().trim().min(3, "A reason is required").max(500),
});

export const POST = withAdmin<Ctx>(async (req, { params }, admin) => {
  const { id } = await params;
  const { status, reason } = schema.parse(await req.json());
  if (id === admin.id) throw new HttpError(400, "You can't change your own status");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.email === "system@bannk.internal") throw new HttpError(404, "User not found");
  if (user.status === "deleted") throw new HttpError(400, "User is deleted");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { status } });
    if (status === "suspended") {
      await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await tx.auditEvent.create({
      data: {
        actorId: admin.id,
        action: status === "suspended" ? "admin.suspend_user" : "admin.unsuspend_user",
        targetType: "user",
        targetId: id,
        metadata: JSON.stringify({ reason, previousStatus: user.status }),
      },
    });
  });
  return NextResponse.json({ ok: true, status });
});
