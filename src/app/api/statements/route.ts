import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  buildStatement,
  parsePeriod,
  statementFilename,
  statementToCsv,
  statementToPdf,
} from "@/lib/statements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/statements?from=YYYY-MM-DD&to=YYYY-MM-DD&format=pdf|csv|json */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const format = (sp.get("format") || "pdf").toLowerCase();
  let period;
  try {
    period = parsePeriod(sp.get("from"), sp.get("to"));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const statement = await buildStatement({ userId: user.id, ...period });

  if (format === "json") {
    return NextResponse.json({ statement });
  }
  if (format === "csv") {
    return new NextResponse(statementToCsv(statement), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${statementFilename(statement, "csv")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  if (format !== "pdf") {
    return NextResponse.json({ error: "format must be pdf, csv or json" }, { status: 400 });
  }
  const pdf = await statementToPdf(statement);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${statementFilename(statement, "pdf")}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
