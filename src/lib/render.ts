/** SVG → PNG rendering with resvg (prebuilt native binary; works on Debian slim). */
import { interFontFiles } from "./brand";

export async function svgToPng(svg: string, width?: number): Promise<Buffer> {
  const { Resvg } = await import("@resvg/resvg-js");
  const resvg = new Resvg(svg, {
    fitTo: width ? { mode: "width", value: width } : { mode: "original" },
    font: {
      fontFiles: interFontFiles(),
      loadSystemFonts: false,
      defaultFontFamily: "Inter",
      sansSerifFamily: "Inter",
    },
    background: "rgba(0,0,0,0)",
  });
  return Buffer.from(resvg.render().asPng());
}

export function xmlEsc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
}
