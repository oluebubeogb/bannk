"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, LineChart, Plus, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { IconCircle } from "@/components/kit";
import { ReceivePanel } from "@/components/ReceivePanel";

function fmt(minor: number, currency = "NGN") {
  const v = minor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

export default function ExchangePage() {
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [qty, setQty] = useState("1");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [trading, setTrading] = useState(false);

  // Asset listing form
  const [boot, setBoot] = useState({ symbol: "", name: "", price: "" });
  const [showBoot, setShowBoot] = useState(false);

  function load() {
    Promise.all([
      fetch("/api/exchange/assets").then((r) => r.json()),
      fetch("/api/exchange/portfolio").then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        return r.json();
      }),
    ]).then(([a, p]) => {
      setAssets(a.assets || []);
      if (p) setPortfolio(p);
      if (!(a.assets || []).length) setShowBoot(true);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [router]);

  async function createAsset(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const priceMinor = Math.round(parseFloat(boot.price) * 100);
    if (!boot.symbol || !boot.name || !priceMinor) {
      setErr("Fill symbol, name and price");
      return;
    }
    const res = await fetch("/api/exchange/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: boot.symbol,
        name: boot.name,
        initialPriceMinor: priceMinor,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Failed");
      return;
    }
    setBoot({ symbol: "", name: "", price: "" });
    setShowBoot(false);
    load();
  }

  async function trade() {
    if (!selected) return;
    setErr("");
    setMsg("");
    setTrading(true);
    const quantity = parseInt(qty, 10);
    if (!quantity || quantity < 1) {
      setErr("Invalid quantity");
      setTrading(false);
      return;
    }
    const res = await fetch("/api/exchange/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: selected.id,
        side,
        quantity,
      }),
    });
    const data = await res.json();
    setTrading(false);
    if (!res.ok) {
      setErr(data.error || "Trade failed");
      return;
    }
    setMsg(`${side.toUpperCase()} filled`);
    setSelected(null);
    load();
  }

  if (loading) {
    return (
      <div className="px-5 pt-8">
        <div className="h-8 w-32 bg-[var(--surface)] rounded animate-pulse mb-4" />
        <div className="h-24 bg-[var(--surface)] rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <IconCircle icon={ArrowLeftRight} tone="peach" size={40} />
        <div>
          <h1 className="text-xl font-bold leading-tight">Exchange</h1>
          <p className="text-xs text-[var(--text-muted)]">Receive payments and trade listed assets</p>
        </div>
      </div>

      <ReceivePanel />

      {portfolio && portfolio.holdings?.length > 0 && (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <IconCircle icon={PieChart} tone="lilac" size={28} />
            <p className="text-sm text-[var(--text-muted)]">Portfolio value</p>
          </div>
          <p className="text-xl font-bold tabular">
            {fmt(portfolio.summary.totalMarketMinor)}
          </p>
          <p
            className={`text-sm tabular ${
              portfolio.summary.totalPnlMinor >= 0
                ? "text-[var(--success)]"
                : "text-[var(--danger)]"
            }`}
          >
            {portfolio.summary.totalPnlMinor >= 0 ? <TrendingUp size={14} className="inline mr-1" /> : <TrendingDown size={14} className="inline mr-1" />}
            {portfolio.summary.totalPnlMinor >= 0 ? "+" : ""}
            {fmt(portfolio.summary.totalPnlMinor)} unrealized
          </p>
        </div>
      )}

      {showBoot && (
        <form
          onSubmit={createAsset}
          className="rounded-2xl border border-dashed border-[var(--border)] p-4 mb-5 space-y-3"
        >
          <p className="text-sm font-medium">List an asset</p>
          <input
            placeholder="Symbol (e.g. LAGOS)"
            value={boot.symbol}
            onChange={(e) => setBoot({ ...boot, symbol: e.target.value })}
            className="w-full h-11 px-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
          />
          <input
            placeholder="Name"
            value={boot.name}
            onChange={(e) => setBoot({ ...boot, name: e.target.value })}
            className="w-full h-11 px-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
          />
          <input
            placeholder="Price (e.g. 125.00)"
            type="number"
            step="0.01"
            value={boot.price}
            onChange={(e) => setBoot({ ...boot, price: e.target.value })}
            className="w-full h-11 px-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
          />
          {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
          >
            Create asset
          </button>
        </form>
      )}

      {!showBoot && (
        <button
          onClick={() => setShowBoot(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-ink)] mb-4"
        >
          <Plus size={14} /> Add asset
        </button>
      )}

      <div className="space-y-2 mb-6">
        {assets.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setSelected(a);
              setErr("");
              setMsg("");
            }}
            className={`tile w-full text-left rounded-2xl border px-4 py-3 flex gap-3 items-center shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] ${
              selected?.id === a.id
                ? "border-[var(--accent-ink)] bg-[var(--surface)]"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
          >
            <IconCircle icon={LineChart} tone="sun" size={36} />
            <div className="flex-1">
              <p className="font-semibold">{a.symbol}</p>
              <p className="text-xs text-[var(--text-muted)]">{a.name}</p>
            </div>
            <p className="tabular font-medium">
              {a.lastPriceMinor != null ? fmt(a.lastPriceMinor, a.currency) : "—"}
            </p>
          </button>
        ))}
        {assets.length === 0 && !showBoot && (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            No assets yet
          </p>
        )}
      </div>

      {selected && (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-3">
          <p className="font-semibold">
            {selected.symbol} · {fmt(selected.lastPriceMinor ?? 0)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={`flex-1 h-10 rounded-lg text-sm font-medium ${
                side === "buy"
                  ? "bg-[var(--accent)] text-[var(--on-accent)]"
                  : "border border-[var(--border)]"
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={`flex-1 h-10 rounded-lg text-sm font-medium ${
                side === "sell"
                  ? "bg-[var(--accent)] text-[var(--on-accent)]"
                  : "border border-[var(--border)]"
              }`}
            >
              Sell
            </button>
          </div>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] tabular"
            placeholder="Quantity"
          />
          {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
          {msg && <p className="text-sm text-[var(--success)]">{msg}</p>}
          <button
            onClick={trade}
            disabled={trading}
            className="w-full h-11 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold disabled:opacity-60"
          >
            {trading ? "Executing…" : `Confirm ${side}`}
          </button>
        </div>
      )}
    </div>
  );
}
