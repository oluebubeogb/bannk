/**
 * Admin access — driven ONLY by the ADMIN_USERNAMES env var
 * (comma-separated usernames, trimmed, case-insensitive). No DB role field.
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "./auth";

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export function parseAdminUsernames(raw = process.env.ADMIN_USERNAMES): Set<string> {
  return new Set(
    (raw || "")
      .split(",")
      .map((s) => s.trim().replace(/^@/, "").toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  return parseAdminUsernames().has(username.trim().toLowerCase());
}

export function isAdminUser(user: SessionUser | null | undefined): boolean {
  return !!user && isAdminUsername(user.profile?.username);
}

type AdminResult =
  | { ok: true; user: SessionUser }
  | { ok: false; status: 401 | 403; response: NextResponse };

/**
 * Guard for /api/admin/*. Pass the session user (or nothing to look it up).
 * Returns 401 when signed out, 403 when not listed in ADMIN_USERNAMES.
 */
export async function requireAdmin(session?: SessionUser | null): Promise<AdminResult> {
  const user = session === undefined ? await getSessionUser() : session;
  if (!user) {
    return {
      ok: false,
      status: 401,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!isAdminUser(user)) {
    return {
      ok: false,
      status: 403,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, user };
}

/** Write an AuditEvent for an admin action. */
export async function audit(
  actorId: string | null,
  action: string,
  targetType: string | null,
  targetId: string | null,
  metadata?: Record<string, unknown>
) {
  const { prisma } = await import("./prisma");
  return prisma.auditEvent.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

/**
 * Wrap an /api/admin route handler: enforces requireAdmin and converts errors.
 */
export function withAdmin<C = unknown>(
  handler: (req: Request, ctx: C, admin: SessionUser) => Promise<Response>
) {
  return async (req: Request, ctx: C) => {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;
    try {
      return await handler(req, ctx, guard.user);
    } catch (err) {
      const { handleError } = await import("./api");
      return handleError(err);
    }
  };
}
