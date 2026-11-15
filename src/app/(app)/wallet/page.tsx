"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Send, QrCode, WalletCards, Receipt, Plus } from "lucide-react";
import { StatementPanel } from "@/components/StatementPanel";
import { CardForm, splitExpiry, type CardFormValue } from "@/components/CardForm";
import { Button, Field, Notice, api, fmt, inputCls } from "@/components/ui";
import { EyeToggle, IconCircle, Modal, maskMoney, useBalanceVisible } from "@/components/kit";

const emptyCard: CardFormValue = { number: "", expiry: "", cvv: "", pin: "" };

export default function WalletPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { visible, toggle } = useBalanceVisible();
  const [fundOpen, setFundOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [card, setCard] = useState<CardFormValue>(emptyCard);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function load() {
    return fetch("/api/wallets")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      });
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const openIfHash = () => { if (location.hash === "#fund") setFundOpen(true); };
    openIfHash();
    window.addEventListener("hashchange", openIfHash);
    return () => window.removeEventListener("hashchange", openIfHash);
  }, []);

  function closeFund() {
    setFundOpen(false);
    setErr(null);
    if (location.hash === "#fund") history.replaceState(null, "", location.pathname);
  }

  async function fund(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(null);
    try {
      const { expiryMonth, expiryYear } = splitExpiry(card.expiry);
      const r = await api<any>("/api/wallets/fund", {
        method: "POST",
        json: {
          amount: Number(amount),
          card: { number: card.number, expiryMonth, expiryYear, cvv: card.cvv, pin: card.pin },
        },
      });
      setCard(emptyCard);
      setAmount("");
      setOk("Wallet funded.");
      await load();
      closeFund();
      if (r.transactionId) router.push(`/receipt/${r.transactionId}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="px-5 pt-8">
        <div className="h-8 w-40 rounded bg-[var(--surface)] animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const wallet = data.wallets?.[0];
  const txs: any[] = data.transactions || [];

  return (
    <div className="px-5 pt-8 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <IconCircle icon={WalletCards} tone="sky" size={40} />
        <h1 className="text-xl font-bold">Wallet</h1>
      </div>

      {ok && <Notice kind="success">{ok}</Notice>}

      {wallet && (
        <div className="hero-gradient relative overflow-hidden rounded-3xl p-5 mb-6 shadow-[0_18px_40px_-18px_rgba(79,122,6,.55)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#2f4a00]/80">{wallet.currencyCode} wallet</p>
            <EyeToggle visible={visible} onToggle={toggle} />
          </div>
          <p className="text-3xl font-bold tabular tracking-tight mt-1 mb-4">
            {maskMoney(wallet.balanceMinor, wallet.currencyCode, visible)}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFundOpen(true)} className="press flex-1 h-10 rounded-xl bg-white/70 hover:bg-white text-sm font-semibold inline-flex items-center justify-center gap-1.5">
              <Plus size={15} /> Fund
            </button>
            <Link href="/send" className="press flex-1 h-10 rounded-xl bg-[var(--text)] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5">
              <Send size={15} /> Send
            </Link>
            <Link href="/exchange#receive" className="press flex-1 h-10 rounded-xl bg-white/70 hover:bg-white text-sm font-semibold inline-flex items-center justify-center gap-1.5">
              <QrCode size={15} /> Receive
            </Link>
          </div>
        </div>
      )}

      <StatementPanel />

      <div className="flex items-center gap-2 mb-3">
        <Receipt size={15} className="text-[var(--text-muted)]" />
        <h2 className="text-sm font-medium text-[var(--text-muted)]">Recent activity</h2>
      </div>
      <div className="space-y-2">
        {txs.length === 0 && <p className="text-sm text-[var(--text-muted)] py-8 text-center">No transactions yet</p>}
        {txs.map((tx: any) => {
          const credit = tx.direction === "credit";
          return (
            <Link
              href={`/receipt/${tx.id}`}
              key={tx.id + tx.direction}
              className="tile flex items-center gap-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-4 py-3"
            >
              <IconCircle icon={credit ? ArrowDownLeft : ArrowUpRight} tone={credit ? "mint" : "peach"} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize">{String(tx.type).replace(/_/g, " ")}</p>
                <p className="text-xs text-[var(--text-muted)]">{new Date(tx.createdAt).toLocaleString()}</p>
                {tx.note && <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{tx.note}</p>}
              </div>
              <p className={`text-sm font-semibold tabular ${credit ? "text-[var(--success)]" : "text-[var(--text)]"}`}>
                {credit ? "+" : "−"}
                {fmt(tx.amountMinor, tx.currency)}
              </p>
            </Link>
          );
        })}
      </div>

      <Modal open={fundOpen} onClose={closeFund} title="Fund from card">
        <form onSubmit={fund} className="space-y-3" autoComplete="off">
          <h2 className="text-lg font-bold pr-8">Fund from card</h2>
          <p className="text-xs text-[var(--text-muted)]">Adds sandbox money to your {wallet?.currencyCode || "NGN"} wallet. Email must be verified.</p>
          <Field label={`Amount (${wallet?.currencyCode || "NGN"})`}>
            <input inputMode="decimal" className={inputCls + " font-mono"} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="5000" required />
          </Field>
          <CardForm value={card} onChange={setCard} />
          {err && <Notice kind="error">{err}</Notice>}
          <Button variant="primary" className="w-full" disabled={busy}>{busy ? "Funding…" : "Fund wallet"}</Button>
        </form>
      </Modal>
    </div>
  );
}
