import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col safe-top safe-bottom">
      {/* Hero */}
      <header className="px-5 pt-12 pb-8 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center">
            <span className="text-[var(--bg)] font-bold text-lg">B</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">Bannk</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-4">
          Banking without<br />
          <span className="text-[var(--accent)]">borders.</span>
        </h1>
        <p className="text-[var(--text-muted)] text-base leading-relaxed mb-8 max-w-sm">
          A virtual financial economy. Build identity, send credits, invest in
          simulated companies, and discover real opportunities — no bank account required.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-[var(--accent)] text-[var(--bg)] font-semibold text-base hover:bg-[var(--accent-dim)] transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-[var(--border)] text-[var(--text)] font-medium text-base hover:bg-[var(--surface)] transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Features */}
      <section className="px-5 py-8 max-w-lg mx-auto w-full flex-1">
        <div className="space-y-4">
          {[
            {
              title: "Virtual wallet",
              body: "Weekly allowance in familiar currencies. Send and receive with friends.",
            },
            {
              title: "QR transfers",
              body: "Scan a profile QR and send credits in seconds. Simple and secure.",
            },
            {
              title: "Simulated exchange",
              body: "Trade fictional companies. Learn markets without real-money risk.",
            },
            {
              title: "Real discovery",
              body: "Find products, events and sponsored opportunities in your community.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4"
            >
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-5 py-6 text-center text-xs text-[var(--text-muted)] max-w-lg mx-auto">
        <p className="mb-2">
          All balances are simulated. Bannk does not accept deposits or process real money.
        </p>
        <p>© {new Date().getFullYear()} Bannk</p>
      </footer>
    </div>
  );
}
