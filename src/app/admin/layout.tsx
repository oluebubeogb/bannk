import Link from "next/link";
import { requireAdminPage } from "@/lib/guards";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Bannk" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, allowed } = await requireAdminPage();

  if (!allowed) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-5xl font-bold text-[var(--text-muted)] mb-2">403</p>
          <h1 className="text-lg font-semibold mb-2">You don&apos;t have access to this page</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Signed in as @{user.profile?.username}. This area is restricted.
          </p>
          <Link
            href="/home"
            className="inline-flex h-10 px-5 items-center rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold text-sm"
          >
            Back to Bannk
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/admin" className="font-bold tracking-tight">
            Bannk <span className="text-[var(--text-muted)] font-medium">Console</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[var(--text-muted)] hidden sm:inline">@{user.profile?.username}</span>
            <Link href="/home" className="text-[var(--accent-ink)] font-medium">
              Open app →
            </Link>
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="max-w-6xl mx-auto px-5 py-6">{children}</main>
    </div>
  );
}
