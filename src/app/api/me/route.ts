import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureWallet, getWalletBalance } from "@/lib/ledger";
import { getAllowanceStatus } from "@/lib/allowance";
import { isAdminUser } from "@/lib/admin";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currency = user.profile?.homeCurrency || "NGN";
  const { wallet } = await ensureWallet(user.id, currency);
  const balanceMinor = await getWalletBalance(wallet.id);
  const allowance = await getAllowanceStatus(user.id);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    username: user.profile?.username,
    displayName: user.profile?.displayName,
    homeCurrency: currency,
    visibility: user.profile?.visibility,
    balanceMinor,
    allowance,
    emailVerified: !!user.emailVerifiedAt,
    isAdmin: isAdminUser(user),
  });
}
