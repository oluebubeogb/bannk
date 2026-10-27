import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { grantWeeklyAllowancesForAll } from "@/lib/allowance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = req.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : req.headers.get("x-cron-secret") || "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/cron/allowance
 * Authorization: Bearer $CRON_SECRET
 * Grants the weekly allowance to every verified user who hasn't received it this period.
 */
export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  const result = await grantWeeklyAllowancesForAll();
  console.log(`[cron/allowance] scanned=${result.scanned} granted=${result.granted} errors=${result.errors.length}`);
  return NextResponse.json({
    ok: result.errors.length === 0,
    scanned: result.scanned,
    granted: result.granted,
    errors: result.errors.slice(0, 20),
    durationMs: Date.now() - started,
  });
}
