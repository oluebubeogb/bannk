import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { HttpError, handleError, requireUser } from "@/lib/api";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(200),
});

/** POST /api/me/password — change password (requires the current one). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { currentPassword, newPassword } = schema.parse(await req.json());
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new HttpError(403, "Current password is incorrect");
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    await prisma.auditEvent.create({
      data: { actorId: user.id, action: "security.password_changed", targetType: "user", targetId: user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
