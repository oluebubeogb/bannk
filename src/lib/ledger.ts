/**
 * Bannk double-entry ledger
 * All virtual money movements go through this module.
 * Never update balances outside of a balanced journal transaction.
 * Clean start — creates system issuance account on first use (no seed required).
 */

import { prisma } from "./prisma";

export type JournalType =
  | "transfer"
  | "allowance"
  | "reward"
  | "trade"
  | "adjustment"
  | "issuance";

interface EntryInput {
  ledgerAccountId: string;
  amountMinor: number;
  direction: "debit" | "credit";
}

export async function postJournal(
  type: JournalType,
  entries: EntryInput[],
  opts: {
    idempotencyKey: string;
    reference?: string;
    note?: string;
  }
) {
  if (entries.length < 2) {
    throw new Error("Journal requires at least two entries");
  }
  for (const e of entries) {
    if (e.amountMinor <= 0) throw new Error("Amount must be positive");
  }

  const debitTotal = entries
    .filter((e) => e.direction === "debit")
    .reduce((s, e) => s + e.amountMinor, 0);
  const creditTotal = entries
    .filter((e) => e.direction === "credit")
    .reduce((s, e) => s + e.amountMinor, 0);

  if (debitTotal !== creditTotal) {
    throw new Error(`Unbalanced journal: debit ${debitTotal} != credit ${creditTotal}`);
  }

  const existing = await prisma.journalTransaction.findUnique({
    where: { idempotencyKey: opts.idempotencyKey },
    include: { entries: true },
  });
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    return tx.journalTransaction.create({
      data: {
        type,
        status: "posted",
        idempotencyKey: opts.idempotencyKey,
        reference: opts.reference,
        note: opts.note,
        entries: {
          create: entries.map((e) => ({
            ledgerAccountId: e.ledgerAccountId,
            amountMinor: e.amountMinor,
            direction: e.direction,
          })),
        },
      },
      include: { entries: true },
    });
  });
}

export async function getWalletBalance(walletId: string): Promise<number> {
  const accounts = await prisma.ledgerAccount.findMany({
    where: { walletId, accountType: "available" },
    include: { journalEntries: true },
  });

  let balance = 0;
  for (const acc of accounts) {
    for (const entry of acc.journalEntries) {
      if (entry.direction === "credit") balance += entry.amountMinor;
      else balance -= entry.amountMinor;
    }
  }
  return balance;
}

/**
 * System issuance account — auto-created on first use.
 * Uses a dedicated system user so no seed is required.
 */
async function getOrCreateIssuanceAccount(currencyCode: string) {
  const systemEmail = "system@bannk.internal";
  let systemUser = await prisma.user.findUnique({
    where: { email: systemEmail },
  });

  if (!systemUser) {
    // Create system identity once (not a real login account)
    const bcrypt = await import("bcryptjs");
    const { randomBytes } = await import("crypto");
    systemUser = await prisma.user.create({
      data: {
        email: systemEmail,
        emailNormalized: systemEmail,
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
        emailVerifiedAt: new Date(),
        status: "active",
        profile: {
          create: {
            username: "system",
            displayName: "Bannk System",
            homeCurrency: currencyCode,
            visibility: "private",
          },
        },
      },
    });
  }

  let systemWallet = await prisma.wallet.findFirst({
    where: { ownerUserId: systemUser.id, currencyCode, walletType: "system" },
  });

  if (!systemWallet) {
    systemWallet = await prisma.wallet.create({
      data: {
        ownerUserId: systemUser.id,
        currencyCode,
        walletType: "system",
        status: "active",
        ledgerAccounts: {
          create: { accountType: "issuance", status: "active" },
        },
      },
    });
  }

  let issuance = await prisma.ledgerAccount.findFirst({
    where: { walletId: systemWallet.id, accountType: "issuance" },
  });
  if (!issuance) {
    issuance = await prisma.ledgerAccount.create({
      data: { walletId: systemWallet.id, accountType: "issuance", status: "active" },
    });
  }
  return issuance;
}

export async function ensureWallet(userId: string, currencyCode: string) {
  let wallet = await prisma.wallet.findUnique({
    where: { ownerUserId_currencyCode: { ownerUserId: userId, currencyCode } },
    include: { ledgerAccounts: true },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        ownerUserId: userId,
        currencyCode,
        walletType: "personal",
        status: "active",
        ledgerAccounts: {
          create: { accountType: "available", status: "active" },
        },
      },
      include: { ledgerAccounts: true },
    });
  }

  let available = wallet.ledgerAccounts.find((a) => a.accountType === "available");
  if (!available) {
    available = await prisma.ledgerAccount.create({
      data: { walletId: wallet.id, accountType: "available", status: "active" },
    });
    wallet.ledgerAccounts.push(available);
  }

  return { wallet, availableAccount: available };
}

export async function grantAllowance(
  userId: string,
  currencyCode: string,
  amountMinor: number,
  idempotencyKey: string,
  note?: string
) {
  if (amountMinor <= 0) throw new Error("Allowance amount must be positive");

  const { availableAccount } = await ensureWallet(userId, currencyCode);
  const issuance = await getOrCreateIssuanceAccount(currencyCode);

  return postJournal(
    "allowance",
    [
      { ledgerAccountId: issuance.id, amountMinor, direction: "debit" },
      { ledgerAccountId: availableAccount.id, amountMinor, direction: "credit" },
    ],
    { idempotencyKey, note: note || "Allowance grant" }
  );
}

export async function executeTransfer(params: {
  senderUserId: string;
  recipientUsername: string;
  currencyCode: string;
  amountMinor: number;
  note?: string;
  idempotencyKey: string;
}) {
  const { senderUserId, recipientUsername, currencyCode, amountMinor, note, idempotencyKey } =
    params;

  if (amountMinor <= 0) throw new Error("Transfer amount must be positive");

  const recipientProfile = await prisma.profile.findUnique({
    where: { username: recipientUsername.toLowerCase() },
    include: { user: true },
  });
  if (!recipientProfile || recipientProfile.user.status !== "active") {
    throw new Error("Recipient not found");
  }
  if (recipientProfile.userId === senderUserId) {
    throw new Error("Cannot transfer to yourself");
  }

  const { wallet: senderWallet, availableAccount: senderAvailable } = await ensureWallet(
    senderUserId,
    currencyCode
  );
  const { availableAccount: recipientAvailable } = await ensureWallet(
    recipientProfile.userId,
    currencyCode
  );

  // Weekly spending limit
  const { ensureCurrentAllowancePeriod } = await import("./allowance");
  const period = await ensureCurrentAllowancePeriod(senderUserId);
  if (period.usedMinor + amountMinor > period.capMinor) {
    throw new Error("Weekly allowance limit exceeded");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.journalTransaction.findUnique({
      where: { idempotencyKey },
      include: { entries: true, transfer: true },
    });
    if (existing) return existing;

    const senderEntries = await tx.journalEntry.findMany({
      where: { ledgerAccountId: senderAvailable.id },
    });
    let balance = 0;
    for (const e of senderEntries) {
      balance += e.direction === "credit" ? e.amountMinor : -e.amountMinor;
    }
    if (balance < amountMinor) {
      throw new Error("Insufficient balance");
    }

    const recipientWallet = await tx.wallet.findUnique({
      where: {
        ownerUserId_currencyCode: {
          ownerUserId: recipientProfile.userId,
          currencyCode,
        },
      },
    });
    if (!recipientWallet) throw new Error("Recipient wallet missing");

    const journal = await tx.journalTransaction.create({
      data: {
        type: "transfer",
        status: "posted",
        idempotencyKey,
        note,
        entries: {
          create: [
            { ledgerAccountId: senderAvailable.id, amountMinor, direction: "debit" },
            { ledgerAccountId: recipientAvailable.id, amountMinor, direction: "credit" },
          ],
        },
        transfer: {
          create: {
            senderWalletId: senderWallet.id,
            recipientWalletId: recipientWallet.id,
            status: "completed",
            note,
          },
        },
      },
      include: { entries: true, transfer: true },
    });

    // Consume weekly allowance
    await tx.allowancePeriod.update({
      where: { id: period.id },
      data: { usedMinor: { increment: amountMinor } },
    });

    return journal;
  });
}

export async function getTransactionHistory(userId: string, limit = 50) {
  const wallets = await prisma.wallet.findMany({
    where: { ownerUserId: userId, walletType: "personal" },
    include: {
      ledgerAccounts: {
        include: {
          journalEntries: {
            include: {
              transaction: true,
            },
            orderBy: { transaction: { createdAt: "desc" } },
            take: limit,
          },
        },
      },
    },
  });

  const items: Array<{
    id: string;
    type: string;
    amountMinor: number;
    direction: string;
    currency: string;
    note: string | null;
    createdAt: Date;
  }> = [];

  for (const w of wallets) {
    for (const acc of w.ledgerAccounts) {
      for (const entry of acc.journalEntries) {
        items.push({
          id: entry.transaction.id,
          type: entry.transaction.type,
          amountMinor: entry.amountMinor,
          direction: entry.direction,
          currency: w.currencyCode,
          note: entry.transaction.note,
          createdAt: entry.transaction.createdAt,
        });
      }
    }
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items.slice(0, limit);
}

/**
 * Trade cash leg: debit/credit available balance for buy/sell.
 */
export async function postTradeCash(params: {
  userId: string;
  currencyCode: string;
  amountMinor: number;
  side: "buy" | "sell";
  idempotencyKey: string;
  note?: string;
}) {
  const { userId, currencyCode, amountMinor, side, idempotencyKey, note } = params;
  const { availableAccount } = await ensureWallet(userId, currencyCode);
  const issuance = await getOrCreateIssuanceAccount(currencyCode);

  if (side === "buy") {
    // User pays cash → debit available, credit issuance (or a clearing account)
    const balance = await getWalletBalance(
      (await ensureWallet(userId, currencyCode)).wallet.id
    );
    if (balance < amountMinor) throw new Error("Insufficient balance for trade");

    return postJournal(
      "trade",
      [
        { ledgerAccountId: availableAccount.id, amountMinor, direction: "debit" },
        { ledgerAccountId: issuance.id, amountMinor, direction: "credit" },
      ],
      { idempotencyKey, note: note || "Buy trade" }
    );
  } else {
    // Sell: credit available
    return postJournal(
      "trade",
      [
        { ledgerAccountId: issuance.id, amountMinor, direction: "debit" },
        { ledgerAccountId: availableAccount.id, amountMinor, direction: "credit" },
      ],
      { idempotencyKey, note: note || "Sell trade" }
    );
  }
}
