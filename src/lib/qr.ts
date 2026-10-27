/**
 * QR identity helpers
 * QR contains only a public HTTPS profile URL or opaque id — never secrets.
 */

import QRCode from "qrcode";

export function profileUrl(username: string, appUrl?: string): string {
  const base = appUrl || process.env.APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/u/${username}`;
}

export async function generateProfileQrDataUrl(username: string): Promise<string> {
  const url = profileUrl(username);
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: { dark: "#0c0f14", light: "#ffffff" },
  });
}
