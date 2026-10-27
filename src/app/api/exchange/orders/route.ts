import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { executeTrade } from "@/lib/exchange";

const schema = z.object({
  assetId: z.string(),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().int().positive(),
  currency: z.string().default("NGN"),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const order = await executeTrade({
      userId: user.id,
      assetId: data.assetId,
      side: data.side,
      quantity: data.quantity,
      currencyCode: data.currency,
      idempotencyKey: data.idempotencyKey,
    });
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      status: order.status,
      trade: order.trade,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const msg = err.message || "Trade failed";
    const status =
      msg.includes("Insufficient") || msg.includes("not found") || msg.includes("not tradeable")
        ? 400
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
