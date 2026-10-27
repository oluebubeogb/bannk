/**
 * Bannk mail helper — WordKey + statements.
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

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function appUrl(path = "") {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return base + path;
}

function layout(title: string, inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f5f1;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16181d">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e3e1d9;border-radius:16px;padding:28px">
<tr><td>
<div style="font-weight:700;font-size:20px;margin-bottom:20px"><span style="display:inline-block;background:#c2ea3f;border-radius:8px;width:28px;height:28px;text-align:center;line-height:28px;margin-right:8px">B</span>Bannk</div>
<h1 style="font-size:18px;margin:0 0 12px">${esc(title)}</h1>
${inner}
<p style="font-size:12px;color:#6b6f78;margin-top:28px">Bannk uses virtual credits only. Credits have no cash value and cannot be withdrawn.</p>
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
    text: `Hi @${params.username},\n\nYour Bannk account statement for ${params.periodLabel} is attached (PDF).\n\nBannk uses virtual credits only.`,
    html: layout(
      "Your account statement",
      `<p style="font-size:14px;line-height:1.5">Hi @${esc(params.username)}, your statement for <strong>${esc(params.periodLabel)}</strong> is attached as a PDF.</p>`
    ),
    attachments,
  });
}
