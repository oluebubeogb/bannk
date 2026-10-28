/**
 * Account statements — data, CSV, and PDF.
 */
import path from "path";
import { logoMarkPng, righteousFontPath } from "./brand";
import fs from "fs";
import { prisma } from "./prisma";
import { formatMoney } from "./money";

export type StatementRow = {
  date: Date;
  type: string;
  reference: string;
  transactionId: string;
  counterparty: string;
  note: string;
  direction: "credit" | "debit";
  amountMinor: number; // signed: + credit, − debit
  balanceAfterMinor: number;
};

export type Statement = {
  username: string;
  displayName: string | null;
  email: string;
  currency: string;
  from: Date; // inclusive
  to: Date; // inclusive (end of day)
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  totalInMinor: number;
  totalOutMinor: number;
  rows: StatementRow[];
  generatedAt: Date;
};

const DAY = 24 * 60 * 60 * 1000;

function parseDay(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD (UTC days). Default: last 30 days incl. today. Max 366 days. */
export function parsePeriod(fromStr?: string | null, toStr?: string | null) {
  const today = new Date();
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  let to = parseDay(toStr) || todayStart;
  let from = parseDay(fromStr) || new Date(to.getTime() - 29 * DAY);
  if (from > to) [from, to] = [to, from];
  if (to.getTime() - from.getTime() > 366 * DAY) {
    throw new Error("Statement period cannot exceed 366 days");
  }
  const toEnd = new Date(to.getTime() + DAY - 1);
  return { from, to: toEnd };
}

export function dayString(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function periodLabel(from: Date, to: Date) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${fmt(from)} – ${fmt(to)}`;
}

function typeLabel(type: string, direction: string, isTransfer: boolean) {
  if (isTransfer) return direction === "credit" ? "Transfer in" : "Transfer out";
  if (type === "allowance") return "Allowance";
  if (type === "trade") return direction === "credit" ? "Exchange sell" : "Exchange buy";
  if (type === "reward") return "Reward";
  if (type === "adjustment") return "Adjustment";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export async function buildStatement(params: {
  userId: string;
  from: Date;
  to: Date;
  currency?: string;
}): Promise<Statement> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: { profile: true },
  });
  if (!user) throw new Error("User not found");
  const currency = params.currency || user.profile?.homeCurrency || "NGN";

  const wallet = await prisma.wallet.findUnique({
    where: { ownerUserId_currencyCode: { ownerUserId: user.id, currencyCode: currency } },
    include: { ledgerAccounts: { where: { accountType: "available" } } },
  });
  const accountIds = wallet?.ledgerAccounts.map((a) => a.id) || [];

  let opening = 0;
  if (accountIds.length) {
    const before = await prisma.journalEntry.findMany({
      where: { ledgerAccountId: { in: accountIds }, transaction: { createdAt: { lt: params.from } } },
      select: { amountMinor: true, direction: true },
    });
    for (const e of before) opening += e.direction === "credit" ? e.amountMinor : -e.amountMinor;
  }

  const entries = accountIds.length
    ? await prisma.journalEntry.findMany({
        where: {
          ledgerAccountId: { in: accountIds },
          transaction: { createdAt: { gte: params.from, lte: params.to } },
        },
        include: {
          transaction: {
            include: {
              transfer: {
                include: {
                  senderWallet: { include: { owner: { include: { profile: true } } } },
                  recipientWallet: { include: { owner: { include: { profile: true } } } },
                },
              },
            },
          },
        },
        orderBy: [{ transaction: { createdAt: "asc" } }, { id: "asc" }],
      })
    : [];

  let running = opening;
  let totalIn = 0;
  let totalOut = 0;
  const rows: StatementRow[] = entries.map((e) => {
    const t = e.transaction;
    const credit = e.direction === "credit";
    const signed = credit ? e.amountMinor : -e.amountMinor;
    running += signed;
    if (credit) totalIn += e.amountMinor;
    else totalOut += e.amountMinor;

    let counterparty = "Bannk";
    if (t.transfer) {
      const other = credit ? t.transfer.senderWallet : t.transfer.recipientWallet;
      counterparty = other.owner.profile ? `@${other.owner.profile.username}` : "Unknown";
    } else if (t.type === "trade") {
      counterparty = "Bannk Exchange";
    }

    return {
      date: t.createdAt,
      type: typeLabel(t.type, e.direction, !!t.transfer),
      reference: t.reference || t.id,
      transactionId: t.id,
      counterparty,
      note: t.note || "",
      direction: credit ? "credit" : "debit",
      amountMinor: signed,
      balanceAfterMinor: running,
    };
  });

  return {
    username: user.profile?.username || "",
    displayName: user.profile?.displayName || null,
    email: user.email,
    currency,
    from: params.from,
    to: params.to,
    openingBalanceMinor: opening,
    closingBalanceMinor: running,
    totalInMinor: totalIn,
    totalOutMinor: totalOut,
    rows,
    generatedAt: new Date(),
  };
}

export function statementFilename(s: Statement, ext: "pdf" | "csv") {
  return `bannk-statement-${s.username}-${dayString(s.from)}_to_${dayString(s.to)}.${ext}`;
}

// ─── CSV ────────────────────────────────────────────────────

/** Quote a CSV cell. `text` cells (free-form user input) are guarded against formula injection. */
function csvCell(v: string | number, text = false) {
  let s = String(v);
  if (text && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function minorToDecimal(minor: number) {
  const neg = minor < 0;
  const abs = Math.abs(minor);
  return `${neg ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function statementToCsv(s: Statement): string {
  const header = ["date", "type", "ref", "counterparty", "note", "amount", "balance_after", "currency"];
  const lines = [header.join(",")];
  lines.push(
    [dayString(s.from) + "T00:00:00.000Z", "Opening balance", "", "", "", "", minorToDecimal(s.openingBalanceMinor), s.currency]
      .map((c) => csvCell(c))
      .join(",")
  );
  for (const r of s.rows) {
    lines.push(
      [
        csvCell(r.date.toISOString()),
        csvCell(r.type),
        csvCell(r.reference),
        csvCell(r.counterparty.replace(/^@/, ""), true),
        csvCell(r.note, true),
        csvCell(minorToDecimal(r.amountMinor)),
        csvCell(minorToDecimal(r.balanceAfterMinor)),
        csvCell(s.currency),
      ].join(",")
    );
  }
  lines.push(
    [s.to.toISOString(), "Closing balance", "", "", "", "", minorToDecimal(s.closingBalanceMinor), s.currency]
      .map((c) => csvCell(c))
      .join(",")
  );
  return lines.join("\r\n") + "\r\n";
}

// ─── PDF ────────────────────────────────────────────────────

/** ₦1,000,050.00 style (narrow symbol), falling back to ISO code. */
function moneySymbol(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return formatMoney(minor, currency);
  }
}

function fontPath(name: "Regular" | "SemiBold" | "Bold") {
  const candidates = [
    path.join(process.cwd(), "assets", "fonts", `Inter-${name}.ttf`),
    path.join(__dirname, "..", "..", "assets", "fonts", `Inter-${name}.ttf`),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

const C = {
  ink: "#16181d",
  muted: "#6b6f78",
  line: "#e3e1d9",
  soft: "#f6f5f1",
  lime: "#c2ea3f",
  limeInk: "#4f7a06",
  credit: "#1f8a4c",
  debit: "#16181d",
};

export async function statementToPdf(s: Statement): Promise<Buffer> {
  const { default: PDFDocument } = await import("pdfkit");
  const regular = fontPath("Regular");
  const semibold = fontPath("SemiBold");
  const bold = fontPath("Bold");
  const hasFonts = !!(regular && semibold && bold);

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 48, bottom: 56, left: 44, right: 44 },
    info: {
      Title: `Bannk statement ${dayString(s.from)} to ${dayString(s.to)}`,
      Author: "Bannk",
      Subject: `Account statement for @${s.username}`,
    },
    bufferPages: true,
    ...(hasFonts ? { font: regular! } : {}),
  });

  const F = {
    regular: hasFonts ? "Inter" : "Helvetica",
    semibold: hasFonts ? "InterSemi" : "Helvetica-Bold",
    bold: hasFonts ? "InterBold" : "Helvetica-Bold",
  };
  if (hasFonts) {
    doc.registerFont("Inter", regular!);
    doc.registerFont("InterSemi", semibold!);
    doc.registerFont("InterBold", bold!);
  }
  const brandFontFile = righteousFontPath();
  if (brandFontFile) doc.registerFont("Brand", brandFontFile);
  // Helvetica lacks ₦ — fall back to ISO code in that case.
  const money = (minor: number, signed = false) => {
    const abs = Math.abs(minor);
    let str = hasFonts ? moneySymbol(abs, s.currency) : `${s.currency} ${minorToDecimal(abs)}`;
    if (minor < 0) str = `−${str}`;
    else if (signed && minor > 0) str = `+${str}`;
    return str;
  };

  /** Draw text on one line, shrinking the font (down to 6.5pt) until it fits `width`. */
  const fit = (
    text: string,
    x: number,
    y: number,
    width: number,
    opts: { font: string; size: number; color: string; align?: "left" | "right" | "center"; spacing?: number }
  ) => {
    let size = opts.size;
    doc.font(opts.font).fontSize(size);
    while (size > 6.5 && doc.widthOfString(text, { characterSpacing: opts.spacing || 0 }) > width) {
      size -= 0.25;
      doc.fontSize(size);
    }
    let t = text;
    while (t.length > 1 && doc.widthOfString(t) > width) t = t.slice(0, -2) + "…";
    doc.fillColor(opts.color).text(t, x, y + (opts.size - size) * 0.6, {
      width,
      align: opts.align || "left",
      lineBreak: false,
      characterSpacing: opts.spacing || 0,
    });
  };

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const L = doc.page.margins.left;
  const R = doc.page.width - doc.page.margins.right;
  const W = R - L;

  // Header: brand
  // Soft lime wash across the top of the first page
  const wash = doc.linearGradient(0, 0, doc.page.width, 0);
  wash.stop(0, "#f1fbd2").stop(0.55, "#fbf7ea").stop(1, "#fff0e4");
  doc.rect(0, 0, doc.page.width, 30).fill(wash);
  const mark = logoMarkPng();
  if (mark) {
    doc.save();
    doc.roundedRect(L, 42, 28, 28, 8).clip();
    doc.image(mark, L, 42, { width: 28, height: 28 });
    doc.restore();
  } else {
    doc.roundedRect(L, 42, 28, 28, 8).fill(C.lime);
  }
  doc.font(brandFontFile ? "Brand" : F.bold).fontSize(18).fillColor(C.ink).text("bannk", L + 36, 44);
  doc.font(F.regular).fontSize(9).fillColor(C.muted).text("Banking without borders", L + 36, 64);

  doc.font(F.semibold).fontSize(9).fillColor(C.muted).text("ACCOUNT STATEMENT", L, 48, { width: W, align: "right", characterSpacing: 0.8 });
  doc.font(F.semibold).fontSize(12).fillColor(C.ink).text(periodLabel(s.from, s.to), L, 62, { width: W, align: "right", lineBreak: false });

  doc.moveTo(L, 92).lineTo(R, 92).lineWidth(0.75).strokeColor(C.line).stroke();

  // Account block
  let y = 108;
  const col = W / 3;
  const field = (label: string, value: string, x: number, yy: number, w: number) => {
    doc.font(F.regular).fontSize(8).fillColor(C.muted).text(label.toUpperCase(), x, yy, { width: w, characterSpacing: 0.5 });
    fit(value, x, yy + 12, w, { font: F.semibold, size: 10.5, color: C.ink });
  };
  field("Account holder", s.displayName || `@${s.username}`, L, y, col - 10);
  field("Username", `@${s.username}`, L + col, y, col - 10);
  field("Currency", s.currency, L + col * 2, y, col);
  y += 38;
  field("Email", s.email, L, y, col * 2 - 10);
  field("Generated", s.generatedAt.toISOString().replace("T", " ").slice(0, 16) + " UTC", L + col * 2, y, col);
  y += 46;

  // Summary cards
  const cardW = (W - 3 * 10) / 4;
  const cards: Array<[string, string, string]> = [
    ["Opening balance", money(s.openingBalanceMinor), C.ink],
    ["Money in", money(s.totalInMinor), C.credit],
    ["Money out", money(s.totalOutMinor), C.ink],
    ["Closing balance", money(s.closingBalanceMinor), C.ink],
  ];
  cards.forEach(([label, value, color], i) => {
    const x = L + i * (cardW + 10);
    const isClosing = i === 3;
    doc.roundedRect(x, y, cardW, 54, 8).fill(isClosing ? C.lime : C.soft);
    doc.font(F.regular).fontSize(8).fillColor(isClosing ? C.ink : C.muted).text(label.toUpperCase(), x + 10, y + 11, { width: cardW - 20, characterSpacing: 0.4 });
    fit(value, x + 10, y + 27, cardW - 20, { font: F.bold, size: 12, color });
  });
  y += 76;

  // Table
  const cols = [
    { key: "date", label: "Date", w: 54, align: "left" as const },
    { key: "desc", label: "Description", w: 150, align: "left" as const },
    { key: "ref", label: "Reference", w: 118, align: "left" as const },
    { key: "amount", label: "Amount", w: 92, align: "right" as const },
    { key: "balance", label: "Balance", w: W - 54 - 150 - 118 - 92, align: "right" as const },
  ];
  const drawHeader = (yy: number) => {
    doc.rect(L, yy, W, 22).fill(C.soft);
    let x = L;
    for (const c of cols) {
      doc.font(F.semibold).fontSize(8).fillColor(C.muted).text(c.label.toUpperCase(), x + 6, yy + 7, { width: c.w - 12, align: c.align, characterSpacing: 0.4 });
      x += c.w;
    }
    return yy + 22;
  };
  y = drawHeader(y);

  const bottom = doc.page.height - doc.page.margins.bottom - 30;
  const row = (cells: Record<string, { text: string; sub?: string; color?: string; font?: string }>, yy: number) => {
    const h = 34;
    let x = L;
    for (const c of cols) {
      const cell = cells[c.key];
      if (cell) {
        fit(cell.text, x + 6, yy + 8, c.w - 12, {
          font: cell.font || F.regular,
          size: c.key === "ref" ? 8 : 9,
          color: cell.color || C.ink,
          align: c.align,
        });
        if (cell.sub) {
          fit(cell.sub, x + 6, yy + 20, c.w - 12, { font: F.regular, size: 7.5, color: C.muted, align: c.align });
        }
      }
      x += c.w;
    }
    doc.moveTo(L, yy + h).lineTo(R, yy + h).lineWidth(0.5).strokeColor(C.line).stroke();
    return yy + h;
  };

  const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
  const fmtTime = (d: Date) => d.toISOString().slice(11, 16);

  y = row(
    {
      date: { text: fmtDate(s.from) },
      desc: { text: "Opening balance", font: F.semibold },
      balance: { text: money(s.openingBalanceMinor), font: F.semibold },
    },
    y
  );

  if (s.rows.length === 0) {
    doc.font(F.regular).fontSize(9.5).fillColor(C.muted).text("No transactions in this period.", L, y + 16, { width: W, align: "center" });
    y += 44;
  }

  for (const r of s.rows) {
    if (y + 34 > bottom) {
      doc.addPage();
      y = drawHeader(doc.page.margins.top);
    }
    const desc = r.counterparty && r.counterparty !== "Bannk" ? `${r.type} · ${r.counterparty}` : r.type;
    y = row(
      {
        date: { text: fmtDate(r.date), sub: fmtTime(r.date) },
        desc: { text: desc, sub: r.note || undefined },
        ref: { text: r.reference, color: C.muted },
        amount: { text: money(r.amountMinor, true), color: r.amountMinor > 0 ? C.credit : C.debit, font: F.semibold },
        balance: { text: money(r.balanceAfterMinor) },
      },
      y
    );
  }

  if (y + 34 > bottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  y = row(
    {
      date: { text: fmtDate(s.to) },
      desc: { text: "Closing balance", font: F.bold },
      balance: { text: money(s.closingBalanceMinor), font: F.bold },
    },
    y
  );

  // Footer on every page
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const fy = doc.page.height - 44;
    const oldBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.moveTo(L, fy - 8).lineTo(R, fy - 8).lineWidth(0.5).strokeColor(C.line).stroke();
    doc.font(F.regular).fontSize(7.5).fillColor(C.muted).text(
      "Issued by Bannk for the account holder named above. This statement is confidential; please review it and report any discrepancy promptly.",
      L, fy, { width: W - 70, lineBreak: true }
    );
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, R - 70, fy, { width: 70, align: "right" });
    doc.page.margins.bottom = oldBottom;
  }

  doc.end();
  return done;
}
