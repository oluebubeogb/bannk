import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Clock, FileText, Lock, ShieldCheck, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { formatMinor } from "@/lib/money";
import { paymentStatus } from "@/lib/paymentRequests";
import { IconCircle, Logo } from "@/components/brand-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment request · Bannk", robots: { index: false } };

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pr = await prisma.paymentRequest.findUnique({
    where: { token },
    include: { payee: { include: { profile: true } } },
  });
  if (!pr || !pr.payee.profile || pr.payee.status !== "active") notFound();

  const viewer = await getSessionUser();
  const status = paymentStatus(pr);
  const username = pr.payee.profile.username;
  const name = pr.payee.profile.displayName || `@${username}`;
  const sendHref = `/send?request=${encodeURIComponent(pr.token)}`;
  const isMine = viewer?.id === pr.payeeUserId;

  return (
    <div className="min-h-dvh flex flex-col items-center px-5 pt-8 pb-10 safe-top safe-bottom">
      <div className="w-full max-w-sm flex items-center justify-between mb-6">
        <Link href="/">
          <Logo size={32} />
        </Link>
        <span className="text-xs font-medium text-[var(--text-muted)] inline-flex items-center gap-1">
          <Lock size={12} /> Secure payment request
        </span>
      </div>

      <div className="w-full max-w-sm rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden no-lift">
        <div className="relative px-6 pt-7 pb-6 text-center">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#e9fbb0] via-[#f4fdd8] to-transparent" aria-hidden />
          <div className="relative">
            <div className="flex justify-center mb-3">
              <IconCircle icon={FileText} tone="sky" size={52} />
            </div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--text-muted)]">PAYMENT REQUEST</p>
            <p className="text-4xl font-bold tabular tracking-tight mt-2">{formatMinor(pr.amountMinor, pr.currency)}</p>
            {pr.note && <p className="text-sm text-[var(--text-muted)] mt-2">{pr.note}</p>}
          </div>
        </div>

        <div className="border-t border-dashed border-[var(--border)] divide-y divide-[var(--border)] text-sm">
          <div className="flex justify-between px-5 py-3">
            <span className="text-[var(--text-muted)]">Pay to</span>
            <span className="text-right font-medium">
              {pr.payee.profile.displayName && pr.payee.profile.displayName !== username && <span className="block">{pr.payee.profile.displayName}</span>}
              <span className="font-bold">@{username}</span>
            </span>
          </div>
          {pr.note && (
            <div className="flex justify-between gap-4 px-5 py-3">
              <span className="text-[var(--text-muted)]">Description</span>
              <span className="text-right font-medium">{pr.note}</span>
            </div>
          )}
          {pr.expiresAt && (
            <div className="flex justify-between px-5 py-3">
              <span className="text-[var(--text-muted)]">Valid until</span>
              <span className="font-medium">
                {pr.expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" })}
              </span>
            </div>
          )}
          <div className="flex justify-between px-5 py-3">
            <span className="text-[var(--text-muted)]">Status</span>
            <span className="font-semibold capitalize">{status}</span>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        {status === "open" && <img src={`/api/payment-requests/${pr.token}/qr`} alt="Payment QR" className="mx-auto w-52 h-auto my-5 rounded-2xl" />}

        <div className="px-5 pb-6 pt-1">
          {status === "open" ? (
            isMine ? (
              <p className="text-center text-sm text-[var(--text-muted)]">This is your request — share the link or QR with whoever is paying you.</p>
            ) : (
              <Link
                href={viewer ? sendHref : `/login?next=${encodeURIComponent(sendHref)}`}
                className="press w-full h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--on-accent)] font-semibold inline-flex items-center justify-center gap-2 shadow-[0_10px_24px_-12px_rgba(79,122,6,.7)]"
              >
                <ShieldCheck size={18} /> Pay {formatMinor(pr.amountMinor, pr.currency)} to {name}
              </Link>
            )
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--text-muted)]">
              {status === "paid" ? <CheckCircle2 size={18} className="text-[var(--success)]" /> : status === "expired" ? <Clock size={18} /> : <XCircle size={18} />}
              This request has been {status === "paid" ? "paid" : status}.
            </div>
          )}
        </div>
      </div>

      {!viewer && status === "open" && (
        <p className="text-sm text-[var(--text-muted)] mt-6 text-center">
          New to Bannk?{" "}
          <Link href="/register" className="text-[var(--accent-ink)] font-medium">
            Open an account
          </Link>{" "}
          to pay.
        </p>
      )}
      <p className="text-xs text-[var(--text-muted)] mt-4 text-center max-w-xs">You&apos;ll confirm the payment with your 4-digit PIN.</p>
    </div>
  );
}
