import { prisma } from "./prisma";

export type Receipt = {
  id: string;
  reference: string;
  type: string;
  status: string;
  amountMinor: number;
  currency: string;
  note: string | null;
  createdAt: string;
  sender: { username: string; displayName: string | null } | null;
  recipient: { username: string; displayName: string | null } | null;
  direction: "sent" | "received" | "credit" | "debit";
};

/**
 * Load a receipt for a journal transaction the viewer is party to.
 * Returns { error: 404 | 403 } when not found / not a party.
 */
export async function getReceiptForUser(
  transactionId: string,
  viewerUserId: string
): Promise<{ receipt: Receipt } | { error: 403 | 404 }> {
  const tx = await prisma.journalTransaction.findUnique({
    where: { id: transactionId },
    include: {
      entries: { include: { ledgerAccount: { include: { wallet: true } } } },
      transfer: {
        include: {
          senderWallet: { include: { owner: { include: { profile: true } } } },
          recipientWallet: { include: { owner: { include: { profile: true } } } },
        },
      },
    },
  });
  if (!tx) return { error: 404 };

  const viewerEntry = tx.entries.find(
    (e) => e.ledgerAccount.wallet.ownerUserId === viewerUserId
  );
  if (!viewerEntry) return { error: 403 };

  const amountMinor = viewerEntry.amountMinor;
  const currency = viewerEntry.ledgerAccount.wallet.currencyCode;

  let sender: Receipt["sender"] = null;
  let recipient: Receipt["recipient"] = null;
  let direction: Receipt["direction"] = viewerEntry.direction === "credit" ? "credit" : "debit";

  if (tx.transfer) {
    const sp = tx.transfer.senderWallet.owner.profile;
    const rp = tx.transfer.recipientWallet.owner.profile;
    sender = sp ? { username: sp.username, displayName: sp.displayName } : null;
    recipient = rp ? { username: rp.username, displayName: rp.displayName } : null;
    direction = tx.transfer.senderWallet.ownerUserId === viewerUserId ? "sent" : "received";
  } else {
    const me = await prisma.profile.findUnique({ where: { userId: viewerUserId } });
    const bannk = { username: "bannk", displayName: "Bannk" };
    const mine = me ? { username: me.username, displayName: me.displayName } : null;
    if (viewerEntry.direction === "credit") {
      sender = bannk;
      recipient = mine;
    } else {
      sender = mine;
      recipient = { username: tx.type === "trade" ? "exchange" : "bannk", displayName: tx.type === "trade" ? "Bannk Exchange" : "Bannk" };
    }
  }

  return {
    receipt: {
      id: tx.id,
      reference: tx.reference || tx.id,
      type: tx.type,
      status: tx.transfer?.status || (tx.status === "posted" ? "completed" : tx.status),
      amountMinor,
      currency,
      note: tx.note,
      createdAt: tx.createdAt.toISOString(),
      sender,
      recipient,
      direction,
    },
  };
}
