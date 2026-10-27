import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMailProvider } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let db: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }
  const body = {
    status: db === "ok" ? "ok" : "degraded",
    db,
    mail: getMailProvider(),
    uptimeSec: Math.round(process.uptime()),
    latencyMs: Date.now() - started,
    time: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: db === "ok" ? 200 : 503 });
}
