import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureWallet, getWalletBalance, getTransactionHistory } from "@/lib/ledger";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currency = user.profile?.homeCurrency || "NGN";
  const { wallet } = await ensureWallet(user.id, currency);
  const balanceMinor = await getWalletBalance(wallet.id);
  const history = await getTransactionHistory(user.id, 30);

  return NextResponse.json({
    wallets: [
      {
        id: wallet.id,
        currencyCode: wallet.currencyCode,
        balanceMinor,
        status: wallet.status,
      },
    ],
    transactions: history,
  });
}
