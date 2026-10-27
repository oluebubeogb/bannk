import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "./auth";

export function jsonError(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** Turn thrown errors into JSON responses (zod → 400, known messages → 400). */
export function handleError(err: unknown) {
  if (err instanceof z.ZodError) {
    const first = err.errors[0];
    return jsonError(first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", 400, {
      issues: err.errors,
    });
  }
  if (err instanceof HttpError) return jsonError(err.message, err.status);
  console.error(err);
  return jsonError("Something went wrong", 500);
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Unauthorized");
  return user;
}

export async function requireVerifiedUser() {
  const user = await requireUser();
  if (!user.emailVerifiedAt) throw new HttpError(403, "Verify your email first");
  return user;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
}

export const optionalUrl = z
  .string()
  .trim()
  .url()
  .max(300)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date" });
      return z.NEVER;
    }
    return d;
  });
