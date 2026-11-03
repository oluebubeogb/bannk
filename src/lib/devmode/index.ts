import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { prisma } from "../prisma";
import { HttpError } from "../api";
import { PinError } from "../pin";
import type { Merchant } from "../payments/types";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const rand = (n: number) => randomBytes(n).toString("hex").toUpperCase();
const jwtKey = () => new TextEncoder().encode((process.env.SESSION_SECRET || "dev-secret") + ":devmode");

/** Create a key pair. Secret is returned ONCE; only its hash is stored. */
export async function createApiKey(userId: string, label: string | undefined, createdById: string) {
  const apiKey = `MK_TEST_${rand(10)}`;
  const secret = `SK_TEST_${rand(16)}`;
  const webhookSecret = `WH_${rand(16)}`;
  const k = await prisma.devApiKey.create({
    data: { userId, label: label || "Default", apiKey, secretHash: sha(secret), secretHint: secret.slice(-4), contractCode: String(Date.now()).slice(-10) + rand(1), webhookSecret, createdById },
  });
  return { id: k.id, label: k.label, apiKey, secretKey: secret, contractCode: k.contractCode, webhookSecret, createdAt: k.createdAt };
}

async function keyFromCreds(apiKey: string, secret: string) {
  const k = await prisma.devApiKey.findUnique({ where: { apiKey } });
  if (!k || k.revokedAt) return null;
  const a = Buffer.from(sha(secret)), b = Buffer.from(k.secretHash);
  return a.length === b.length && timingSafeEqual(a, b) ? k : null;
}

export async function loginWithBasic(req: Request) {
  const h = req.headers.get("authorization") || "";
  if (!h.startsWith("Basic ")) throw new HttpError(401, "Basic auth with apiKey:secretKey required");
  const [apiKey, secret] = Buffer.from(h.slice(6), "base64").toString().split(":");
  const k = await keyFromCreds(apiKey || "", secret || "");
  if (!k) throw new HttpError(401, "Invalid API credentials");
  const user = await prisma.user.findUnique({ where: { id: k.userId } });
  if (!user?.devModeEnabledAt || user.status !== "active") throw new HttpError(403, "Dev Mode is not enabled for this account");
  const expiresIn = 3600;
  const accessToken = await new SignJWT({ k: k.id }).setProtectedHeader({ alg: "HS256" }).setSubject(k.userId).setExpirationTime(`${expiresIn}s`).sign(jwtKey());
  return { key: k, accessToken, expiresIn };
}

/** Bearer token (from /api/v1/auth/login) or Basic creds directly. */
export async function authMerchant(req: Request): Promise<Merchant> {
  const h = req.headers.get("authorization") || "";
  let keyId: string | null = null;
  if (h.startsWith("Bearer ")) {
    try { keyId = String((await jwtVerify(h.slice(7), jwtKey())).payload.k); } catch { throw new HttpError(401, "Invalid or expired access token"); }
  } else if (h.startsWith("Basic ")) {
    keyId = (await loginWithBasic(req)).key.id;
  } else throw new HttpError(401, "Authorization required");
  const k = await prisma.devApiKey.findUnique({ where: { id: keyId }, include: { user: true } });
  if (!k || k.revokedAt) throw new HttpError(401, "API key revoked");
  if (!k.user.devModeEnabledAt) throw new HttpError(403, "Dev Mode is not enabled for this account");
  await prisma.devApiKey.update({ where: { id: k.id }, data: { lastUsedAt: new Date() } });
  return { apiKeyId: k.id, userId: k.userId };
}

export function ok(body: unknown) {
  return NextResponse.json({ requestSuccessful: true, responseMessage: "success", responseCode: "0", responseBody: body });
}

function fail(status: number, message: string, code = "99") {
  return NextResponse.json({ requestSuccessful: false, responseMessage: message, responseCode: code }, { status });
}

/** Wrap a public API handler: Monnify envelope errors + audit log row per call. */
export function devApi<C = unknown>(handler: (req: Request, ctx: C, log: { merchant?: Merchant; summary?: string }) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    const log: { merchant?: Merchant; summary?: string; apiKeyId?: string } = {};
    let res: Response;
    try {
      res = await handler(req, ctx, log);
    } catch (err: any) {
      if (err instanceof z.ZodError) res = fail(400, `${err.errors[0]?.path.join(".")}: ${err.errors[0]?.message}`);
      else if (err instanceof PinError) res = fail(err.status, err.message, err.code);
      else if (err instanceof HttpError) res = fail(err.status, err.message);
      else { console.error("[devmode]", err); res = fail(500, "Something went wrong"); }
    }
    const url = new URL(req.url);
    prisma.devApiLog
      .create({ data: { userId: log.merchant?.userId, apiKeyId: log.merchant?.apiKeyId ?? log.apiKeyId, method: req.method, path: url.pathname, statusCode: res.status, ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null, summary: log.summary?.slice(0, 300) } })
      .catch(() => {});
    return res;
  };
}

/** Accept Monnify-style major amounts ("1500.50" / 1500.5) → minor units. */
export const amountSchema = z.union([z.number(), z.string()]).transform((v, ctx) => {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid amount" }); return z.NEVER; }
  return Math.round(n * 100);
});

export function keyView(k: any) {
  return { id: k.id, label: k.label, apiKey: k.apiKey, secretHint: `••••${k.secretHint}`, contractCode: k.contractCode, webhookUrl: k.webhookUrl, webhookSecret: k.webhookSecret, revokedAt: k.revokedAt, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt, createdById: k.createdById };
}
