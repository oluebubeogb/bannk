import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { isMailConfigured, sendStatementMail } from "@/lib/mail";
import {
  buildStatement,
  parsePeriod,
  periodLabel,
  statementFilename,
  statementToCsv,
  statementToPdf,
} from "@/lib/statements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  includeCsv: z.boolean().optional(),
});

/** POST /api/statements/email — emails the PDF statement to the user's verified email. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.emailVerifiedAt) {
    return NextResponse.json({ error: "Verify your email before requesting statements" }, { status: 403 });
  }
  if (!isMailConfigured() && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Email isn't set up on this server yet. You can still download the PDF.", code: "MAIL_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  let body: z.infer<typeof schema> = {};
  try {
    body = schema.parse(await req.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let period;
  try {
    period = parsePeriod(body.from, body.to);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  try {
    const statement = await buildStatement({ userId: user.id, ...period });
    const pdf = await statementToPdf(statement);
    const result = await sendStatementMail({
      to: user.email,
      username: statement.username,
      periodLabel: periodLabel(statement.from, statement.to),
      pdf,
      filename: statementFilename(statement, "pdf"),
      ...(body.includeCsv
        ? { csv: Buffer.from(statementToCsv(statement), "utf8"), csvFilename: statementFilename(statement, "csv") }
        : {}),
    });
    const masked = user.email.replace(/^(.{2})[^@]*(@.*)$/, "$1•••$2");
    return NextResponse.json({
      ok: true,
      sentTo: masked,
      provider: result.provider,
      message:
        result.provider === "console"
          ? "Mail is not configured — statement logged on the server (dev mode)."
          : `Statement sent to ${masked}`,
    });
  } catch (e: any) {
    console.error("[statements/email]", e);
    return NextResponse.json(
      { error: "Couldn't send the email right now. You can still download the PDF." },
      { status: 502 }
    );
  }
}
