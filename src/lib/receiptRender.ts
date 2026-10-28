/**
 * Premium receipt rendering — PNG (resvg) and PDF (pdfkit).
 * Party-only: callers must load the receipt via getReceiptForUser().
 */
import type { Receipt } from "./receipts";
import { BRAND, dataUri, interFontPath, logoMarkPng } from "./brand";
import { formatDateTime, formatMinor } from "./money";
import { svgToPng, xmlEsc } from "./render";
import { appUrl } from "./mail";

export const RECEIPT_LEGAL =
  "Issued by Bannk. This receipt is confidential and valid only for the parties named above.";

export function receiptTitle(r: Receipt): string {
  switch (r.direction) {
    case "sent":
      return "Money sent";
    case "received":
      return "Money received";
    case "credit":
      return r.type === "reward" ? "Reward credited" : r.type === "allowance" ? "Allowance credited" : "Wallet credited";
    default:
      return r.type === "trade" ? "Exchange purchase" : "Wallet debited";
  }
}

export function isOutflow(r: Receipt) {
  return r.direction === "sent" || r.direction === "debit";
}

function party(p: Receipt["sender"]) {
  if (!p) return "—";
  return p.displayName && p.displayName !== p.username ? `${p.displayName} · @${p.username}` : `@${p.username}`;
}

const TYPE_LABEL: Record<string, string> = {
  transfer: "Transfer",
  allowance: "Allowance",
  reward: "Reward",
  trade: "Exchange trade",
  adjustment: "Account adjustment",
  issuance: "Issuance",
};

export function receiptRows(r: Receipt): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["From", party(r.sender)],
    ["To", party(r.recipient)],
    ["Date", formatDateTime(r.createdAt)],
    ["Type", TYPE_LABEL[r.type] || r.type],
    ["Reference", r.reference],
  ];
  if (r.note) rows.push(["Description", r.note]);
  rows.push(["Status", r.status === "completed" ? "Successful" : r.status]);
  return rows;
}

export function receiptText(r: Receipt): string {
  const sign = isOutflow(r) ? "-" : "+";
  return [
    `Bannk receipt — ${receiptTitle(r)}`,
    `Amount: ${sign}${formatMinor(r.amountMinor, r.currency)}`,
    ...receiptRows(r).map(([k, v]) => `${k}: ${v}`),
    "",
    RECEIPT_LEGAL,
  ].join("\n");
}

export function receiptUrl(id: string) {
  return appUrl(`/receipt/${id}`);
}

function wrap(text: string, max: number, maxLines = 2): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].slice(0, max - 1) + "…";
    return kept;
  }
  return lines;
}

export function receiptSvg(r: Receipt): string {
  const W = 760;
  const pad = 48;
  const rows = receiptRows(r);
  const out = isOutflow(r);
  const amount = `${out ? "−" : "+"}${formatMinor(r.amountMinor, r.currency)}`;
  const logo = dataUri(logoMarkPng());

  // Row layout
  let y = 470;
  let rowsSvg = "";
  for (const [k, v] of rows) {
    const lines = wrap(v, 34, k === "Description" ? 3 : 2);
    rowsSvg += `<text x="${pad + 32}" y="${y}" font-family="Inter" font-size="20" fill="${BRAND.muted}">${xmlEsc(k)}</text>`;
    lines.forEach((l, i) => {
      rowsSvg += `<text x="${W - pad - 32}" y="${y + i * 28}" text-anchor="end" font-family="Inter" font-weight="${k === "Status" ? 700 : 600}" font-size="20" fill="${k === "Status" ? BRAND.credit : BRAND.ink}">${xmlEsc(l)}</text>`;
    });
    y += 28 * lines.length + 26;
    rowsSvg += `<line x1="${pad + 32}" x2="${W - pad - 32}" y1="${y - 26 + 6}" y2="${y - 26 + 6}" stroke="${BRAND.line}" stroke-dasharray="2 6" stroke-linecap="round"/>`;
    y += 14;
  }
  const cardBottom = y + 10;
  const H = cardBottom + 150;
  const legal = wrap(RECEIPT_LEGAL, 62, 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f3fbd9"/><stop offset="0.45" stop-color="${BRAND.cream}"/><stop offset="1" stop-color="#fff0e4"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.85" cy="0.05" r="0.6"><stop offset="0" stop-color="${BRAND.lime}" stop-opacity="0.55"/><stop offset="1" stop-color="${BRAND.lime}" stop-opacity="0"/></radialGradient>
  <filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#16181d" flood-opacity="0.10"/></filter>
  <clipPath id="lc"><rect x="${pad}" y="${pad}" width="56" height="56" rx="16"/></clipPath>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
${logo ? `<image href="${logo}" x="${pad}" y="${pad}" width="56" height="56" clip-path="url(#lc)"/>` : `<rect x="${pad}" y="${pad}" width="56" height="56" rx="16" fill="${BRAND.lime}"/>`}
<text x="${pad + 72}" y="${pad + 37}" font-family="Inter" font-weight="700" font-size="30" fill="${BRAND.ink}" letter-spacing="-0.5">bannk</text>
<text x="${W - pad}" y="${pad + 24}" text-anchor="end" font-family="Inter" font-weight="600" font-size="15" fill="${BRAND.muted}" letter-spacing="2">TRANSACTION RECEIPT</text>
<text x="${W - pad}" y="${pad + 48}" text-anchor="end" font-family="Inter" font-size="15" fill="${BRAND.muted}">${xmlEsc(r.reference)}</text>

<rect x="${pad}" y="150" width="${W - pad * 2}" height="${cardBottom - 150}" rx="32" fill="#ffffff" filter="url(#sh)"/>
<circle cx="${W / 2}" cy="226" r="38" fill="${out ? "#fff0e4" : "#ecfbc4"}"/>
<path d="${out ? `M${W / 2 - 12} ${226 + 12} L${W / 2 + 12} ${226 - 12} M${W / 2 - 6} ${226 - 12} L${W / 2 + 12} ${226 - 12} L${W / 2 + 12} ${226 + 6}` : `M${W / 2 + 12} ${226 - 12} L${W / 2 - 12} ${226 + 12} M${W / 2 + 6} ${226 + 12} L${W / 2 - 12} ${226 + 12} L${W / 2 - 12} ${226 - 6}`}" stroke="${out ? "#c2410c" : BRAND.limeDeep}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<text x="${W / 2}" y="306" text-anchor="middle" font-family="Inter" font-weight="600" font-size="20" fill="${BRAND.muted}">${xmlEsc(receiptTitle(r))}</text>
<text x="${W / 2}" y="368" text-anchor="middle" font-family="Inter" font-weight="700" font-size="50" fill="${BRAND.ink}" letter-spacing="-1">${xmlEsc(amount)}</text>
<rect x="${W / 2 - 72}" y="388" width="144" height="34" rx="17" fill="#ecfbc4"/>
<circle cx="${W / 2 - 46}" cy="405" r="5" fill="${BRAND.credit}"/>
<text x="${W / 2 + 9}" y="411" text-anchor="middle" font-family="Inter" font-weight="600" font-size="16" fill="${BRAND.limeDeep}">Successful</text>
<line x1="${pad + 32}" x2="${W - pad - 32}" y1="440" y2="440" stroke="${BRAND.line}"/>
${rowsSvg}
${legal.map((l, i) => `<text x="${W / 2}" y="${cardBottom + 52 + i * 22}" text-anchor="middle" font-family="Inter" font-size="15" fill="${BRAND.muted}">${xmlEsc(l)}</text>`).join("")}
<text x="${W / 2}" y="${cardBottom + 110}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="15" fill="${BRAND.ink}">bannk · ${xmlEsc(new URL(appUrl()).host)}</text>
</svg>`;
}

export async function receiptPng(r: Receipt): Promise<Buffer> {
  return svgToPng(receiptSvg(r), 1080);
}

export async function receiptPdf(r: Receipt): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: [420, 640], margin: 0, info: { Title: `Bannk receipt ${r.reference}`, Author: "Bannk" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));

  const reg = interFontPath("Regular");
  const semi = interFontPath("SemiBold");
  const bold = interFontPath("Bold");
  if (reg) doc.registerFont("R", reg);
  if (semi) doc.registerFont("S", semi);
  if (bold) doc.registerFont("B", bold);
  const F = (k: "R" | "S" | "B") => (k === "R" ? (reg ? "R" : "Helvetica") : k === "S" ? (semi ? "S" : "Helvetica-Bold") : bold ? "B" : "Helvetica-Bold");

  const W = 420;
  const out = isOutflow(r);
  // Background wash
  const grad = doc.linearGradient(0, 0, W, 640);
  grad.stop(0, "#f3fbd9").stop(0.5, BRAND.cream).stop(1, "#fff0e4");
  doc.rect(0, 0, W, 640).fill(grad);

  const logo = logoMarkPng();
  if (logo) {
    doc.save();
    doc.roundedRect(28, 28, 32, 32, 9).clip();
    doc.image(logo, 28, 28, { width: 32, height: 32 });
    doc.restore();
  } else {
    doc.roundedRect(28, 28, 32, 32, 9).fill(BRAND.lime);
  }
  doc.font(F("B")).fontSize(18).fillColor(BRAND.ink).text("bannk", 68, 34);
  doc.font(F("S")).fontSize(7.5).fillColor(BRAND.muted).text("TRANSACTION RECEIPT", 200, 32, { width: 192, align: "right", characterSpacing: 1.2 });
  doc.font(F("R")).fontSize(8).text(r.reference, 200, 45, { width: 192, align: "right" });

  // Card
  const cardTop = 84;
  const rows = receiptRows(r);
  // Measure rows first so the card hugs its content.
  let measure = cardTop + 182;
  for (const [k, v] of rows) {
    doc.font(F(k === "Status" ? "B" : "S")).fontSize(9.5);
    measure += Math.max(14, doc.heightOfString(v, { width: 200 })) + 18;
  }
  const cardH = measure - cardTop + 8;
  doc.roundedRect(24, cardTop, W - 48, cardH, 18).fill("#ffffff");
  doc.roundedRect(24, cardTop, W - 48, cardH, 18).lineWidth(0.6).stroke(BRAND.line);

  doc.circle(W / 2, cardTop + 42, 20).fill(out ? "#fff0e4" : "#ecfbc4");
  doc.font(F("B")).fontSize(16).fillColor(out ? "#c2410c" : BRAND.limeDeep).text(out ? "↗" : "↙", W / 2 - 10, cardTop + 32, { width: 20, align: "center" });
  doc.font(F("S")).fontSize(10.5).fillColor(BRAND.muted).text(receiptTitle(r), 24, cardTop + 74, { width: W - 48, align: "center" });
  doc.font(F("B")).fontSize(26).fillColor(BRAND.ink).text(`${out ? "-" : "+"}${formatMinor(r.amountMinor, r.currency)}`, 24, cardTop + 92, { width: W - 48, align: "center" });
  doc.roundedRect(W / 2 - 38, cardTop + 130, 76, 18, 9).fill("#ecfbc4");
  doc.font(F("S")).fontSize(8.5).fillColor(BRAND.limeDeep).text("Successful", W / 2 - 38, cardTop + 135, { width: 76, align: "center" });
  doc.moveTo(44, cardTop + 166).lineTo(W - 44, cardTop + 166).lineWidth(0.6).stroke(BRAND.line);

  let y = cardTop + 182;
  for (const [k, v] of rows) {
    doc.font(F("R")).fontSize(9.5).fillColor(BRAND.muted).text(k, 44, y, { width: 110 });
    doc.font(F(k === "Status" ? "B" : "S")).fontSize(9.5).fillColor(k === "Status" ? BRAND.credit : BRAND.ink);
    const h = doc.heightOfString(v, { width: 200 });
    doc.text(v, W - 44 - 200, y, { width: 200, align: "right" });
    y += Math.max(14, h) + 10;
    doc.moveTo(44, y - 4).lineTo(W - 44, y - 4).dash(1, { space: 3 }).lineWidth(0.5).stroke(BRAND.line).undash();
    y += 8;
  }

  const footY = Math.max(cardTop + cardH + 22, 586);
  doc.font(F("R")).fontSize(7.5).fillColor(BRAND.muted).text(RECEIPT_LEGAL, 40, footY, { width: W - 80, align: "center" });
  doc.font(F("S")).fontSize(8).fillColor(BRAND.ink).text(`bannk · ${new URL(appUrl()).host}`, 40, footY + 24, { width: W - 80, align: "center" });
  doc.end();
  return done;
}
