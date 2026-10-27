import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { BusinessNav } from "./BusinessNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business console · Bannk" };

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("/business");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/business" className="font-bold tracking-tight">
            Bannk <span className="text-[var(--text-muted)] font-medium">Business</span>
          </Link>
          <Link href="/profile" className="text-sm text-[var(--accent-ink)] font-medium">
            ← Back to app
          </Link>
        </div>
        {user.emailVerifiedAt && <BusinessNav />}
      </header>
      <main className="max-w-5xl mx-auto px-5 py-6">
        {user.emailVerifiedAt ? (
          children
        ) : (
          <div className="max-w-md mx-auto text-center py-16">
            <h1 className="text-lg font-semibold mb-2">Verify your email first</h1>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              The business console is open to every verified Bannk member. Confirm your email to continue.
            </p>
            <Link
              href="/verify"
              className="inline-flex h-10 px-5 items-center rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold text-sm"
            >
              Verify email
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
