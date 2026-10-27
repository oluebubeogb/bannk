import { NextRequest, NextResponse } from "next/server";
import { listListings } from "@/lib/discover";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || undefined;
  const q = searchParams.get("q") || undefined;
  const sponsored = searchParams.get("sponsored") === "1";

  const listings = await listListings({
    type,
    q,
    sponsoredOnly: sponsored || undefined,
  });

  return NextResponse.json({ listings });
}
