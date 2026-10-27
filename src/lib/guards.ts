import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";
import { isAdminUser } from "./admin";

async function currentPath(fallback: string) {
  const h = await headers();
  const p = h.get("x-pathname");
  return p && p.startsWith("/") && !p.startsWith("//") ? p : fallback;
}

/** Server-side page guard: redirect to /login?next=… when signed out. */
export async function requirePageUser(fallbackPath: string) {
  const user = await getSessionUser();
  if (!user) {
    const next = await currentPath(fallbackPath);
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return user;
}

/** Server-side admin guard. Returns { user, allowed }. Unsigned → login redirect. */
export async function requireAdminPage() {
  const user = await requirePageUser("/admin");
  return { user, allowed: isAdminUser(user) };
}
