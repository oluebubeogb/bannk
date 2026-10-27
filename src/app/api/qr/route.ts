import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { generateProfileQrDataUrl, profileUrl } from "@/lib/qr";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = user.profile.username;
  const dataUrl = await generateProfileQrDataUrl(username);
  const url = profileUrl(username);

  return NextResponse.json({ username, url, qrDataUrl: dataUrl });
}
