/**
 * Bannk exchange (listed assets)
 * Game economy only — deterministic price model, separate from wallet ledger cash leg.
 */

import { prisma } from "./prisma";
import { postTradeCash, ensureWallet, getWalletBalance } from "./ledger";
import { v4 as uuidv4 } from "uuid";

export async function listAssets() {
  return prisma.exchangeAsset.findMany({
    where: { status: "active" },
    include: {
      prices: {
        orderBy: { effectiveAt: "desc" },
        take: 1,
      },
    },
    orderBy: { symbol: "asc" },
  });
}

export async function getAsset(symbolOrId: string) {
  const asset = await prisma.exchangeAsset.findFirst({
    where: {
      OR: [{ id: symbolOrId }, { symbol: symbolOrId.toUpperCase() }],
      status: "active",
    },
    include: {
      prices: {
        orderBy: { effectiveAt: "desc" },
        take: 30,
      },
    },
  });
  return asset;
}

export async function getLatestPrice(assetId: string) {
  return prisma.marketPrice.findFirst({
    where: { assetId },
    orderBy: { effectiveAt: "desc" },
  });
}

export async function getPortfolio(userId: string) {
  const holdings = await prisma.holding.findMany({
    where: { userId, quantityUnits: { gt: 0 } },
    include: {
      asset: {
        include: {
          prices: { orderBy: { effectiveAt: "desc" }, take: 1 },
        },
      },
    },
  });

  return holdings.map((h) => {
    const lastPrice = h.asset.prices[0]?.priceMinor ?? h.averageCostMinor;
    const marketValue = lastPrice * h.quantityUnits;
    const costBasis = h.averageCostMinor * h.quantityUnits;
    return {
      assetId: h.assetId,
      symbol: h.asset.symbol,
      name: h.asset.name,
      quantityUnits: h.quantityUnits,
      averageCostMinor: h.averageCostMinor,
      lastPriceMinor: lastPrice,
      marketValueMinor: marketValue,
      unrealizedPnlMinor: marketValue - costBasis,
    };
  });
}

/**
 * Execute a market buy or sell.
 * Cash leg via ledger; holdings updated atomically.
 */
export async function executeTrade(params: {
  userId: string;
  assetId: string;
  side: "buy" | "sell";
  quantity: number;
  currencyCode: string;
  idempotencyKey?: string;
}) {
  const { userId, assetId, side, quantity, currencyCode } = params;
  if (quantity <= 0) throw new Error("Quantity must be positive");

  const asset = await prisma.exchangeAsset.findFirst({
    where: { id: assetId, status: "active" },
  });
  if (!asset) throw new Error("Asset not found or not tradeable");

  const price = await getLatestPrice(assetId);
  if (!price) throw new Error("No market price available");

  const totalMinor = price.priceMinor * quantity;
  const key = params.idempotencyKey || `trade:${userId}:${assetId}:${side}:${uuidv4()}`;

  // Existing order with same key?
  const existing = await prisma.tradeOrder.findUnique({
    where: { idempotencyKey: key },
    include: { trade: true },
  });
  if (existing) return existing;

  if (side === "buy") {
    const { wallet } = await ensureWallet(userId, currencyCode);
    const balance = await getWalletBalance(wallet.id);
    if (balance < totalMinor) throw new Error("Insufficient balance");
  } else {
    const holding = await prisma.holding.findUnique({
      where: { userId_assetId: { userId, assetId } },
    });
    if (!holding || holding.quantityUnits < quantity) {
      throw new Error("Insufficient holdings");
    }
  }

  return prisma.$transaction(async (tx) => {
    // Cash leg
    await postTradeCash({
      userId,
      currencyCode,
      amountMinor: totalMinor,
      side,
      idempotencyKey: `${key}:cash`,
      note: `${side.toUpperCase()} ${quantity} ${asset.symbol} @ ${price.priceMinor}`,
    });

    // Order + trade records
    const order = await tx.tradeOrder.create({
      data: {
        userId,
        assetId,
        side,
        quantity,
        priceMinor: price.priceMinor,
        status: "filled",
        idempotencyKey: key,
        filledAt: new Date(),
        trade: {
          create: {
            priceMinor: price.priceMinor,
            quantity,
            totalMinor,
          },
        },
      },
      include: { trade: true },
    });

    // Holdings
    const existingHolding = await tx.holding.findUnique({
      where: { userId_assetId: { userId, assetId } },
    });

    if (side === "buy") {
      if (existingHolding) {
        const newQty = existingHolding.quantityUnits + quantity;
        const newAvg = Math.round(
          (existingHolding.averageCostMinor * existingHolding.quantityUnits +
            price.priceMinor * quantity) /
            newQty
        );
        await tx.holding.update({
          where: { id: existingHolding.id },
          data: { quantityUnits: newQty, averageCostMinor: newAvg },
        });
      } else {
        await tx.holding.create({
          data: {
            userId,
            assetId,
            quantityUnits: quantity,
            averageCostMinor: price.priceMinor,
          },
        });
      }
    } else {
      // sell
      const newQty = (existingHolding?.quantityUnits ?? 0) - quantity;
      if (newQty <= 0) {
        if (existingHolding) {
          await tx.holding.delete({ where: { id: existingHolding.id } });
        }
      } else if (existingHolding) {
        await tx.holding.update({
          where: { id: existingHolding.id },
          data: { quantityUnits: newQty },
        });
      }
    }

    return order;
  });
}

/**
 * Admin/helper: create a listed asset with an initial price.
 * Used by API when an admin adds assets (or first-time setup via API).
 */
export async function createAsset(params: {
  symbol: string;
  name: string;
  description?: string;
  category?: string;
  initialPriceMinor: number;
  currencyCode?: string;
}) {
  const symbol = params.symbol.toUpperCase();
  return prisma.exchangeAsset.create({
    data: {
      symbol,
      name: params.name,
      description: params.description,
      category: params.category,
      status: "active",
      prices: {
        create: {
          priceMinor: params.initialPriceMinor,
          currencyCode: params.currencyCode || "NGN",
          effectiveAt: new Date(),
          modelVersion: "v1",
        },
      },
    },
    include: { prices: true },
  });
}

/**
 * Simple deterministic price tick (can be called by worker).
 */
export async function tickPrice(assetId: string, volatilityBps = 50) {
  const last = await getLatestPrice(assetId);
  if (!last) return null;

  // ±volatilityBps random walk
  const delta =
    Math.floor((Math.random() * 2 - 1) * ((last.priceMinor * volatilityBps) / 10000));
  const newPrice = Math.max(1, last.priceMinor + delta);

  return prisma.marketPrice.create({
    data: {
      assetId,
      priceMinor: newPrice,
      currencyCode: last.currencyCode,
      effectiveAt: new Date(),
      modelVersion: "v1-walk",
    },
  });
}
