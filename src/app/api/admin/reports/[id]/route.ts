import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  status: z.enum(["reviewed", "actioned", "dismissed", "open"]),
  note: z.string().trim().max(500).optional(),
});

export const PATCH = withAdmin<Ctx>(async (req, { params }, admin) => {
  const { id } = await params;
  const { status, note } = schema.parse(await req.json());
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) throw new HttpError(404, "Report not found");
  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.report.update({ where: { id }, data: { status } });
    await tx.auditEvent.create({
      data: {
        actorId: admin.id,
        action: "admin.review_report",
        targetType: "report",
        targetId: id,
        metadata: JSON.stringify({ from: report.status, to: status, note: note || null, target: `${report.targetType}:${report.targetId}` }),
      },
    });
    return r;
  });
  return NextResponse.json({ report: updated });
});
