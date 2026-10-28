import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { generateProfileQrPng } from "@/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/qr/image — profile QR as PNG. ?download=1 → attachment. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !user.profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const png = await generateProfileQrPng(user.profile.username);
  const disp = req.nextUrl.searchParams.get("download") ? "attachment" : "inline";
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${disp}; filename="bannk-${user.profile.username}-qr.png"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
