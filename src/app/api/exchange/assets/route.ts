import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { listAssets, createAsset } from "@/lib/exchange";

export async function GET() {
  const assets = await listAssets();
  return NextResponse.json({
    assets: assets.map((a) => ({
      id: a.id,
      symbol: a.symbol,
      name: a.name,
      description: a.description,
      category: a.category,
      lastPriceMinor: a.prices[0]?.priceMinor ?? null,
      currency: a.prices[0]?.currencyCode ?? "NGN",
    })),
  });
}

/** Create asset — open in MVP for bootstrap; lock down to admin later */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const schema = z.object({
      symbol: z.string().min(1).max(12),
      name: z.string().min(1).max(80),
      description: z.string().optional(),
      category: z.string().optional(),
      initialPriceMinor: z.number().int().positive(),
      currencyCode: z.string().default("NGN"),
    });
    const data = schema.parse(body);
    const asset = await createAsset(data);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Symbol already exists" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}
