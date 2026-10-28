/**
 * Credit / debit alert emails — one per affected personal wallet on every posted journal
 * (transfers in/out, opening balance, weekly allowance, rewards, admin adjustments, trades).
 *
 * Always called fire-and-forget AFTER the ledger commit (see queueJournalAlerts in ledger.ts):
 * a mail failure can never roll back or block a balance movement.
 * Set ALERT_EMAILS=false to disable.
 */
import { prisma } from "./prisma";
import { getReceiptForUser } from "./receipts";
import { formatDateTime, formatMinor, maskedBalance } from "./money";
import { receiptPng, receiptUrl } from "./receiptRender";
import { sendTransactionAlertMail, type MailAttachment } from "./mail";

function partyLabel(p: { username: string; displayName: string | null } | null) {
  if (!p) return "Bannk";
  return p.displayName && p.displayName !== p.username ? `${p.displayName} (@${p.username})` : `@${p.username}`;
}

export async function sendJournalAlerts(journalId: string) {
  if ((process.env.ALERT_EMAILS || "true").toLowerCase() === "false") return;

  const journal = await prisma.journalTransaction.findUnique({
    where: { id: journalId },
    include: {
      entries: {
        include: {
          ledgerAccount: { include: { wallet: { include: { owner: { include: { profile: true } } } } } },
        },
      },
    },
  });
  if (!journal) return;

  for (const entry of journal.entries) {
    const acc = entry.ledgerAccount;
    const owner = acc.wallet.owner;
    if (acc.accountType !== "available" || acc.wallet.walletType !== "personal") continue;
    if (owner.status !== "active" || !owner.emailVerifiedAt || owner.email.endsWith("@bannk.internal")) continue;

    try {
      const loaded = await getReceiptForUser(journal.id, owner.id);
      if (!("receipt" in loaded)) continue;
      const r = loaded.receipt;

      // Balance right after this journal (entries up to and including it).
      const sums = await prisma.journalEntry.groupBy({
        by: ["direction"],
        where: { ledgerAccountId: acc.id, transaction: { createdAt: { lte: journal.createdAt } } },
        _sum: { amountMinor: true },
      });
      let bal = 0;
      for (const s of sums) bal += (s.direction === "credit" ? 1 : -1) * (s._sum.amountMinor ?? 0);

      const kind = entry.direction === "credit" ? "credit" : "debit";
      const attachments: MailAttachment[] = [];
      try {
        attachments.push({
          filename: `bannk-receipt-${r.reference}.png`,
          content: await receiptPng(r),
          contentType: "image/png",
        });
      } catch (e: any) {
        console.error("[bannk] receipt image render failed:", e?.message || e);
      }

      await sendTransactionAlertMail({
        to: owner.email,
        username: owner.profile?.username || "there",
        kind,
        amount: formatMinor(entry.amountMinor, acc.wallet.currencyCode),
        counterparty: kind === "credit" ? partyLabel(r.sender) : partyLabel(r.recipient),
        reference: r.reference,
        description: r.note,
        maskedBalance: maskedBalance(bal, acc.wallet.currencyCode),
        when: formatDateTime(journal.createdAt),
        receiptUrl: receiptUrl(journal.id),
        attachments,
      });
    } catch (e: any) {
      // Fail soft — never surface to the ledger caller.
      console.error(`[bannk] alert mail to user ${owner.id} failed:`, e?.message || e);
    }
  }
}
