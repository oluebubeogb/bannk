/**
 * Server-side brand assets (logos + Inter fonts) resolved from disk.
 * Works in dev, `next start`, and the Docker runtime image (assets/ is copied).
 */
import fs from "fs";
import path from "path";

function resolveAsset(...parts: string[]): string | null {
  const candidates = [
    path.join(process.cwd(), "assets", ...parts),
    path.join(process.cwd(), "public", ...parts.slice(parts[0] === "brand" ? 0 : 1)),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

const cache = new Map<string, Buffer | null>();
function readCached(key: string, ...parts: string[]): Buffer | null {
  if (cache.has(key)) return cache.get(key)!;
  const p = resolveAsset(...parts);
  const buf = p ? fs.readFileSync(p) : null;
  cache.set(key, buf);
  return buf;
}

/** Black "b" mark on lime, square — used in QR centres, receipts, PDFs. */
export function logoMarkPng(): Buffer | null {
  return readCached("mark", "brand", "logo-mark.png");
}

/** Ink "b" mark on transparent background. */
export function logoMarkInkPng(): Buffer | null {
  return readCached("mark-ink", "brand", "logo-mark-ink.png");
}

export function dataUri(buf: Buffer | null, mime = "image/png"): string | null {
  return buf ? `data:${mime};base64,${buf.toString("base64")}` : null;
}

export function interFontFiles(): string[] {
  return (["Regular", "SemiBold", "Bold"] as const)
    .map((w) => resolveAsset("fonts", `Inter-${w}.ttf`))
    .filter((p): p is string => !!p);
}

export function interFontPath(weight: "Regular" | "SemiBold" | "Bold"): string | null {
  return resolveAsset("fonts", `Inter-${weight}.ttf`);
}

export const BRAND = {
  ink: "#16181d",
  muted: "#6b6f78",
  line: "#e7e5dd",
  soft: "#f6f5f1",
  lime: "#c5f63a",
  limeDeep: "#4f7a06",
  credit: "#1f8a4c",
  peach: "#ffe3cf",
  cream: "#fbf7ea",
};
