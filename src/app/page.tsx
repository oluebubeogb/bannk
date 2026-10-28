import Link from "next/link";
import { redirect } from "next/navigation";
import { AtSign, QrCode, ShieldCheck, ReceiptText, ArrowLeftRight, Compass, ArrowRight, BellRing } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { IconCircle, Logo } from "@/components/brand-ui";

export const dynamic = "force-dynamic";

const features = [
  { title: "Send with a @username", body: "No account numbers to copy. Type a username, confirm with your PIN, done.", icon: AtSign, tone: "lime" as const },
  { title: "QR payments & invoices", body: "Share your branded QR, or create a request for an exact amount and description.", icon: QrCode, tone: "sky" as const },
  { title: "PIN-protected transfers", body: "Every transfer is approved with your 4-digit PIN. Balances stay hidden until you tap.", icon: ShieldCheck, tone: "ink" as const },
  { title: "Instant alerts", body: "Credit and debit emails with your receipt attached, the moment money moves.", icon: BellRing, tone: "peach" as const },
  { title: "Premium receipts & statements", body: "Share receipts as image, PDF, text or a private link. Statements in PDF or CSV.", icon: ReceiptText, tone: "sun" as const },
  { title: "Exchange & discover", body: "Trade listed assets and find products, events and offers in your community.", icon: Compass, tone: "lilac" as const },
];

export default async function LandingPage() {
  // Signed-in visitors go straight to the app — server-side, so the landing never flashes.
  const user = await getSessionUser();
  if (user) redirect("/home");

  return (
    <div className="min-h-dvh flex flex-col safe-top safe-bottom">
      <nav className="px-5 pt-6 max-w-5xl mx-auto w-full flex items-center justify-between">
        <Logo size={36} />
        <div className="flex items-center gap-2">
          <Link href="/login" className="h-10 px-4 inline-flex items-center rounded-xl text-sm font-medium text-[var(--text)] hover:bg-white/70 transition">
            Sign in
          </Link>
          <Link
            href="/register"
            className="press h-10 px-4 inline-flex items-center rounded-xl bg-[var(--text)] text-white text-sm font-semibold hover:bg-[#2a2d35] transition"
          >
            Open account
          </Link>
        </div>
      </nav>

      <header className="px-5 pt-12 sm:pt-20 pb-10 max-w-5xl mx-auto w-full grid gap-10 sm:grid-cols-[1.15fr_1fr] items-center">
        <div>
          <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-white/70 border border-[var(--border)] text-xs font-medium text-[var(--accent-ink)] shadow-sm mb-6">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_0_3px_rgba(197,246,58,.35)]" />
            Piloting in Nigeria
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight mb-5">
            Money that moves
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">at your speed.</span>
              <span className="absolute inset-x-0 bottom-1 h-3 sm:h-4 bg-[var(--accent)] rounded-full -z-0 opacity-80" aria-hidden />
            </span>
          </h1>
          <p className="text-[var(--text-muted)] text-base sm:text-lg leading-relaxed mb-8 max-w-md">
            Send, receive and request money with just a @username or a QR code. Every transfer is PIN-protected,
            receipted and alerted to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="press group inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold text-base hover:bg-[var(--accent-dim)] transition shadow-[0_14px_30px_-14px_rgba(79,122,6,.8)]"
            >
              Get started
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="press inline-flex items-center justify-center h-12 px-6 rounded-xl border border-[var(--border)] bg-white/70 backdrop-blur text-[var(--text)] font-medium text-base hover:bg-white transition"
            >
              I already have an account
            </Link>
          </div>
        </div>

        {/* Hero visual: logo + a floating balance card */}
        <div className="relative mx-auto w-full max-w-[340px] aspect-square">
          <div className="absolute inset-6 rounded-[36px] hero-gradient shadow-[0_30px_60px_-30px_rgba(79,122,6,.6)]" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-lime.png"
            alt="Bannk"
            className="absolute inset-10 w-[calc(100%-5rem)] h-[calc(100%-5rem)] rounded-[30px] object-cover shadow-xl"
          />
          <div className="absolute -left-2 bottom-6 rounded-2xl bg-white/90 backdrop-blur border border-white shadow-[var(--shadow-lift)] px-4 py-3 flex items-center gap-3">
            <IconCircle icon={ArrowLeftRight} tone="mint" size={36} />
            <div>
              <p className="text-[11px] text-[var(--text-muted)]">Transfer received</p>
              <p className="text-sm font-bold tabular">+ NGN ******</p>
            </div>
          </div>
          <div className="absolute -right-2 top-6 rounded-2xl bg-white/90 backdrop-blur border border-white shadow-[var(--shadow-lift)] px-3 py-2.5 flex items-center gap-2">
            <IconCircle icon={ShieldCheck} tone="ink" size={30} />
            <p className="text-xs font-semibold">PIN approved</p>
          </div>
        </div>
      </header>

      <section className="px-5 py-10 max-w-5xl mx-auto w-full flex-1">
        <h2 className="text-sm font-semibold tracking-[0.16em] text-[var(--text-muted)] mb-5">WHAT YOU GET</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="tile rounded-2xl bg-white/85 backdrop-blur border border-[var(--border)] p-5">
              <IconCircle icon={f.icon} tone={f.tone} size={44} />
              <h3 className="font-semibold mt-4 mb-1">{f.title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-[var(--text)] text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 overflow-hidden relative">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" aria-hidden />
          <div className="relative">
            <p className="text-xl font-bold">Claim your @username today.</p>
            <p className="text-sm text-white/70 mt-1">It takes under a minute to open an account.</p>
          </div>
          <Link
            href="/register"
            className="press relative inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold hover:bg-[var(--accent-dim)] transition"
          >
            Create account <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="px-5 py-8 max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-dark.png" alt="" width={22} height={22} className="rounded-md" />
          © {new Date().getFullYear()} Bannk
        </span>
        <span className="flex gap-4">
          <Link href="/login" className="hover:text-[var(--text)]">Sign in</Link>
          <Link href="/register" className="hover:text-[var(--text)]">Open account</Link>
        </span>
      </footer>
    </div>
  );
}
