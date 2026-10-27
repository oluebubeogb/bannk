import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPortfolio } from "@/lib/exchange";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const holdings = await getPortfolio(user.id);
  const totalMarketMinor = holdings.reduce((s, h) => s + h.marketValueMinor, 0);
  const totalPnlMinor = holdings.reduce((s, h) => s + h.unrealizedPnlMinor, 0);

  return NextResponse.json({
    holdings,
    summary: { totalMarketMinor, totalPnlMinor },
  });
}
