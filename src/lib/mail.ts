/**
 * Bannk mail helper — WordKey, password reset, statements, credit/debit alerts.
 *
 * MAIL_PROVIDER = smtp | resend | console (default: auto-detect)
 *   smtp   → SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
 *   resend → RESEND_API_KEY
 *   console→ logs to server output (dev fallback)
 * MAIL_FROM = "Bannk <no-reply@your-domain>"
 */

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
};

export type MailProvider = "smtp" | "resend" | "console";

export function getMailProvider(): MailProvider {
  const explicit = (process.env.MAIL_PROVIDER || "").toLowerCase().trim();
  if (explicit === "smtp" || explicit === "resend" || explicit === "console") return explicit;
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "console";
}

/** True when a real provider (not console) is configured. */
export function isMailConfigured(): boolean {
  const p = getMailProvider();
  if (p === "resend") return !!process.env.RESEND_API_KEY;
  if (p === "smtp") return !!process.env.SMTP_HOST;
  return false;
}

function mailFrom() {
  return process.env.MAIL_FROM || "Bannk <no-reply@bannk.app>";
}

export class MailNotConfiguredError extends Error {
  constructor() {
    super("Email is not configured on this server");
  }
}

export async function sendMail(msg: MailMessage): Promise<{ provider: MailProvider; id?: string }> {
  const provider = getMailProvider();

  if (provider === "resend") {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new MailNotConfiguredError();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: mailFrom(),
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        attachments: msg.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString("base64"),
        })),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { provider, id: data.id };
  }

  if (provider === "smtp") {
    if (!process.env.SMTP_HOST) throw new MailNotConfiguredError();
    const nodemailer = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT || 587);
    const secure =
      process.env.SMTP_SECURE != null ? process.env.SMTP_SECURE === "true" : port === 465;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
        : undefined,
    });
    const info = await transport.sendMail({
      from: mailFrom(),
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      attachments: msg.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    return { provider, id: info.messageId };
  }

  // console fallback
  console.log(
    `[mail:console] to=${msg.to} subject="${msg.subject}"` +
      (msg.attachments?.length ? ` attachments=${msg.attachments.map((a) => a.filename).join(",")}` : "") +
      `\n${msg.text}`
  );
  return { provider };
}

export function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function appUrl(path = "") {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return base + path;
}

export function layout(title: string, inner: string) {
  const logo = appUrl("/brand/logo-mark.png");
  const brandFont = appUrl("/fonts/Righteous-Regular.ttf");
  return `<!doctype html><html><head><meta charset="utf-8"/><style>@font-face{font-family:'Righteous';font-style:normal;font-weight:400;src:url('${brandFont}') format('truetype');}</style></head><body style="margin:0;background:#f6f5f1;font-family:Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16181d">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:linear-gradient(135deg,#f1fbd2,#fbf7ea 55%,#fff0e4)"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e7e5dd;border-radius:20px;padding:28px;box-shadow:0 8px 28px rgba(22,24,29,.06)">
<tr><td>
<div style="font-size:22px;margin-bottom:22px;line-height:30px"><img src="${esc(logo)}" width="30" height="30" alt="" style="vertical-align:middle;border-radius:9px;margin-right:8px;background:#c5f63a"/><span style="font-family:Righteous,'Arial Rounded MT Bold','Trebuchet MS',Inter,Arial,sans-serif;font-weight:400;vertical-align:middle;letter-spacing:.2px">bannk</span></div>
<h1 style="font-size:18px;margin:0 0 12px">${esc(title)}</h1>
${inner}
<p style="font-size:12px;color:#6b6f78;margin-top:28px;border-top:1px solid #efede6;padding-top:14px">Bannk will never ask for your password, PIN or WordKey. If this wasn't you, reset your password and contact support.</p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function sendWordKeyMail(to: string, username: string, wordKey: string) {
  const verifyUrl = appUrl(`/verify?email=${encodeURIComponent(to)}`);
  return sendMail({
    to,
    subject: "Your Bannk WordKey",
    text: `Hi @${username},\n\nYour Bannk WordKey is:\n\n  ${wordKey}\n\nEnter it at ${verifyUrl} within 30 minutes.\n\nIf you didn't sign up, ignore this email.`,
    html: layout(
      "Verify your email",
      `<p style="font-size:14px;line-height:1.5">Hi @${esc(username)}, enter this WordKey to verify your account. It expires in 30 minutes.</p>
<div style="font-family:ui-monospace,Menlo,monospace;font-size:20px;font-weight:700;background:#f6f5f1;border:1px solid #e3e1d9;border-radius:12px;padding:16px;text-align:center;letter-spacing:.5px">${esc(wordKey)}</div>
<p style="margin-top:20px"><a href="${esc(verifyUrl)}" style="display:inline-block;background:#c2ea3f;color:#16181d;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px">Verify now</a></p>
<p style="font-size:12px;color:#6b6f78">If you didn't sign up, ignore this email.</p>`
    ),
  });
}

export async function sendStatementMail(params: {
  to: string;
  username: string;
  periodLabel: string;
  pdf: Buffer;
  filename: string;
  csv?: Buffer;
  csvFilename?: string;
}) {
  const attachments: MailAttachment[] = [
    { filename: params.filename, content: params.pdf, contentType: "application/pdf" },
  ];
  if (params.csv && params.csvFilename) {
    attachments.push({ filename: params.csvFilename, content: params.csv, contentType: "text/csv" });
  }
  return sendMail({
    to: params.to,
    subject: `Your Bannk statement · ${params.periodLabel}`,
    text: `Hi @${params.username},\n\nYour Bannk account statement for ${params.periodLabel} is attached (PDF).\n\n— Bannk`,
    html: layout(
      "Your account statement",
      `<p style="font-size:14px;line-height:1.5">Hi @${esc(params.username)}, your statement for <strong>${esc(params.periodLabel)}</strong> is attached as a PDF.</p>`
    ),
    attachments,
  });
}

export async function sendPasswordResetMail(to: string, username: string, resetKey: string) {
  const resetUrl = appUrl(`/reset-password?email=${encodeURIComponent(to)}`);
  return sendMail({
    to,
    subject: "Reset your Bannk password",
    text: `Hi @${username},\n\nUse this reset WordKey to choose a new password:\n\n  ${resetKey}\n\nEnter it at ${resetUrl} within 30 minutes.\n\nIf you didn't ask for this, you can ignore this email — your password stays the same.`,
    html: layout(
      "Reset your password",
      `<p style="font-size:14px;line-height:1.5">Hi @${esc(username)}, use this Nigerian-flavoured WordKey to set a new password. It expires in 30 minutes.</p>
<div style="font-family:ui-monospace,Menlo,monospace;font-size:20px;font-weight:700;background:#f6f5f1;border:1px solid #e7e5dd;border-radius:12px;padding:16px;text-align:center;letter-spacing:.5px">${esc(resetKey)}</div>
<p style="margin-top:20px"><a href="${esc(resetUrl)}" style="display:inline-block;background:#c5f63a;color:#16181d;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px">Choose a new password</a></p>
<p style="font-size:12px;color:#6b6f78">Didn't ask for this? Ignore this email — your password stays the same.</p>`
    ),
  });
}

export async function sendTransactionAlertMail(params: {
  to: string;
  username: string;
  kind: "credit" | "debit";
  amount: string;
  counterparty: string;
  reference: string;
  description?: string | null;
  maskedBalance: string;
  when: string;
  receiptUrl: string;
  attachments?: MailAttachment[];
}) {
  const p = params;
  const credit = p.kind === "credit";
  const title = credit ? "Bannk credit" : "Bannk debit";
  const rows: Array<[string, string]> = [
    ["Amount", `${credit ? "+" : "−"}${p.amount}`],
    [credit ? "From" : "To", p.counterparty],
    ["Reference", p.reference],
    ...(p.description ? ([["Description", p.description]] as Array<[string, string]>) : []),
    ["Available balance", p.maskedBalance],
    ["Date", p.when],
  ];
  const text = [
    `Hi @${p.username},`,
    "",
    `${title} alert`,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `View receipt: ${p.receiptUrl}`,
  ].join("\n");
  const html = layout(
    title,
    `<p style="font-size:14px;line-height:1.5;margin:0 0 16px">Hi @${esc(p.username)}, ${credit ? "money just landed in" : "money just left"} your Bannk wallet.</p>
<div style="border-radius:16px;padding:18px;background:${credit ? "#f1fbd2" : "#fff3ea"};text-align:center;margin-bottom:16px">
<div style="font-size:12px;color:#6b6f78;text-transform:uppercase;letter-spacing:1px">${credit ? "Credit" : "Debit"}</div>
<div style="font-size:26px;font-weight:700;margin-top:4px;color:${credit ? "#1f8a4c" : "#16181d"}">${esc(rows[0][1])}</div>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">
${rows
  .slice(1)
  .map(
    ([k, v]) =>
      `<tr><td style="padding:8px 0;color:#6b6f78;border-bottom:1px dashed #e7e5dd">${esc(k)}</td><td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px dashed #e7e5dd">${esc(v)}</td></tr>`
  )
  .join("")}
</table>
<p style="margin-top:20px"><a href="${esc(p.receiptUrl)}" style="display:inline-block;background:#c5f63a;color:#16181d;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px">View receipt</a></p>`
  );
  return sendMail({ to: p.to, subject: title, text, html, attachments: p.attachments });
}
