/**
 * QR identity helpers — sleek branded QR codes with the Bannk mark in the centre.
 * QR contains only a public HTTPS URL or opaque token — never secrets.
 */

import QRCode from "qrcode";
import { BRAND, dataUri, logoMarkPng } from "./brand";
import { svgToPng, xmlEsc } from "./render";

export function profileUrl(username: string, appUrl?: string): string {
  const base = appUrl || process.env.APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/u/${username}`;
}

type QrCaption = {
  /** Bold primary line, e.g. "@amara" or "NGN 2,500.00". */
  title: string;
  /** Optional secondary lines (muted). */
  lines?: string[];
};

/**
 * Build a branded QR as SVG: rounded modules, soft finder eyes,
 * the Bannk mark centred (ECC "H" keeps it scannable), caption below.
 */
export function brandedQrSvg(text: string, caption?: QrCaption): { svg: string; width: number; height: number } {
  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const cell = 10;
  const quiet = 3;
  const qrPx = (n + quiet * 2) * cell;
  const pad = 28;
  const width = qrPx + pad * 2;
  const captionLines = caption ? 1 + (caption.lines?.length || 0) : 0;
  const captionH = caption ? 30 + 34 + (caption.lines?.length || 0) * 24 + 8 : 0;
  const height = qrPx + pad * 2 + captionH;
  const ox = pad + quiet * cell;
  const oy = pad + quiet * cell;

  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

  // Clear a centred square for the logo (≈ 22% of modules).
  const logoMods = Math.max(7, Math.round(n * 0.22) | 1);
  const lo = Math.floor((n - logoMods) / 2);
  const hi = lo + logoMods;
  const inLogo = (r: number, c: number) => r >= lo - 1 && r < hi + 1 && c >= lo - 1 && c < hi + 1;

  let dots = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.modules.get(r, c) || isFinder(r, c) || inLogo(r, c)) continue;
      const x = ox + c * cell + 0.6;
      const y = oy + r * cell + 0.6;
      dots += `<rect x="${x}" y="${y}" width="${cell - 1.2}" height="${cell - 1.2}" rx="3.2"/>`;
    }
  }

  const eye = (r: number, c: number) => {
    const x = ox + c * cell;
    const y = oy + r * cell;
    const R = 2; // subtle rounding — heavier radii hurt scanner compatibility
    return `<rect x="${x}" y="${y}" width="${cell * 7}" height="${cell * 7}" rx="${R * 1.6}" fill="${BRAND.ink}"/>
<rect x="${x + cell}" y="${y + cell}" width="${cell * 5}" height="${cell * 5}" rx="${R}" fill="#ffffff"/>
<rect x="${x + cell * 2}" y="${y + cell * 2}" width="${cell * 3}" height="${cell * 3}" rx="${R}" fill="${BRAND.ink}"/>`;
  };

  const logo = dataUri(logoMarkPng());
  const lx = ox + lo * cell;
  const ly = oy + lo * cell;
  const ls = logoMods * cell;
  const logoSvg = logo
    ? `<rect x="${lx - 4}" y="${ly - 4}" width="${ls + 8}" height="${ls + 8}" rx="${ls * 0.28}" fill="#ffffff"/>
<clipPath id="lc"><rect x="${lx}" y="${ly}" width="${ls}" height="${ls}" rx="${ls * 0.24}"/></clipPath>
<image href="${logo}" x="${lx}" y="${ly}" width="${ls}" height="${ls}" clip-path="url(#lc)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="${lx}" y="${ly}" width="${ls}" height="${ls}" rx="${ls * 0.24}" fill="${BRAND.lime}"/>
<text x="${lx + ls / 2}" y="${ly + ls * 0.68}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="${ls * 0.6}" fill="${BRAND.ink}">b</text>`;

  let captionSvg = "";
  if (caption) {
    const cy = pad + qrPx + 30;
    captionSvg += `<text x="${width / 2}" y="${cy}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="${BRAND.ink}">${xmlEsc(caption.title)}</text>`;
    (caption.lines || []).forEach((l, i) => {
      captionSvg += `<text x="${width / 2}" y="${cy + 30 + i * 24}" text-anchor="middle" font-family="Inter" font-weight="400" font-size="17" fill="${BRAND.muted}">${xmlEsc(l)}</text>`;
    });
  }
  void captionLines;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#fbfaf5"/></linearGradient></defs>
<rect x="0" y="0" width="${width}" height="${height}" rx="36" fill="url(#bg)"/>
<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="36" fill="none" stroke="${BRAND.line}"/>
<rect x="${pad}" y="${pad}" width="${qrPx}" height="${qrPx}" rx="26" fill="#ffffff"/>
<g fill="${BRAND.ink}">${dots}</g>
${eye(0, 0)}${eye(0, n - 7)}${eye(n - 7, 0)}
${logoSvg}
${captionSvg}
</svg>`;
  return { svg, width, height };
}

export async function brandedQrPng(text: string, caption?: QrCaption, outWidth = 720): Promise<Buffer> {
  const { svg } = brandedQrSvg(text, caption);
  return svgToPng(svg, outWidth);
}

export async function generateProfileQrPng(username: string): Promise<Buffer> {
  return brandedQrPng(profileUrl(username), { title: `@${username}` });
}

export async function generateProfileQrDataUrl(username: string): Promise<string> {
  const png = await generateProfileQrPng(username);
  return `data:image/png;base64,${png.toString("base64")}`;
}
