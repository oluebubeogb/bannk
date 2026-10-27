"use client";

import Link from "next/link";
import { use, useState } from "react";
import {
  Badge, Button, Card, Field, Notice, Skeleton, api, fmt, fmtDate, inputCls, newKey, textareaCls, toMinorInput, useApi,
} from "@/components/ui";

export default function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, loading, reload } = useApi<any>(`/api/admin/users/${id}`);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusReason, setStatusReason] = useState("");
  const [adj, setAdj] = useState({ direction: "credit", amount: "", reason: "", key: newKey() });

  if (loading && !data) return <Skeleton rows={3} />;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!data) return null;
  const u = data.user;
  const wallet = data.wallets.find((w: any) => w.currencyCode === u.homeCurrency) ?? data.wallets[0];

  async function setStatus(status: "active" | "suspended") {
    setMsg(null);
    if (statusReason.trim().length < 3) return setMsg({ kind: "error", text: "Add a reason (min 3 characters)." });
    setBusy(true);
    try {
      await api(`/api/admin/users/${id}/status`, { method: "POST", json: { status, reason: statusReason } });
      setStatusReason("");
      setMsg({ kind: "success", text: status === "suspended" ? "User suspended and signed out." : "User reactivated." });
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const amountMinor = toMinorInput(adj.amount);
    if (!amountMinor) return setMsg({ kind: "error", text: "Enter an amount greater than zero." });
    if (adj.reason.trim().length < 3) return setMsg({ kind: "error", text: "A reason is required." });
    if (!confirm(`${adj.direction === "credit" ? "Credit" : "Debit"} ${fmt(amountMinor, u.homeCurrency)} ${adj.direction === "credit" ? "to" : "from"} @${u.username}?`)) return;
    setBusy(true);
    try {
      const r = await api<any>(`/api/admin/users/${id}/adjust`, {
        method: "POST",
        json: { direction: adj.direction, amountMinor, reason: adj.reason, currency: u.homeCurrency, idempotencyKey: adj.key },
      });
      setAdj({ direction: adj.direction, amount: "", reason: "", key: newKey() });
      setMsg({ kind: "success", text: `Posted ${r.reference}. New balance ${fmt(r.balanceMinor, u.homeCurrency)}.` });
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-[var(--text-muted)]">← Users</Link>
      <div className="flex flex-wrap items-center gap-3 mt-2 mb-5">
        <h1 className="text-xl font-bold">@{u.username}</h1>
        <Badge>{u.status}</Badge>
        {!u.verified && <Badge tone="pending">unverified</Badge>}
      </div>
      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-[var(--text-muted)]">Balance</p>
          <p className="text-2xl font-bold tabular">{fmt(wallet?.balanceMinor ?? 0, u.homeCurrency)}</p>
        </Card>
        <Card className="p-4 text-sm space-y-1">
          <p><span className="text-[var(--text-muted)]">Email:</span> {u.email}</p>
          <p><span className="text-[var(--text-muted)]">Name:</span> {u.displayName ?? "—"}</p>
          <p><span className="text-[var(--text-muted)]">Joined:</span> {fmtDate(u.createdAt)}</p>
        </Card>
        <Card className="p-4 text-sm space-y-1">
          <p><span className="text-[var(--text-muted)]">Reports against:</span> {data.reportsAgainst}</p>
          <p>
            <span className="text-[var(--text-muted)]">Businesses:</span>{" "}
            {u.businesses.length ? u.businesses.map((b: any) => `${b.name} (${b.verificationStatus})`).join(", ") : "—"}
          </p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Account status</h2>
          <Field label="Reason (required, saved to audit log)">
            <input value={statusReason} onChange={(e) => setStatusReason(e.target.value)} className={inputCls} />
          </Field>
          <div className="mt-3">
            {u.status === "suspended" ? (
              <Button variant="primary" disabled={busy} onClick={() => setStatus("active")}>Unsuspend</Button>
            ) : (
              <Button variant="danger" disabled={busy || u.isAdmin} onClick={() => setStatus("suspended")}>Suspend</Button>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-2">Suspending revokes all active sessions.</p>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-3">Manual balance adjustment</h2>
          <form onSubmit={adjust} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={adj.direction} onChange={(e) => setAdj({ ...adj, direction: e.target.value })} className={inputCls}>
                  <option value="credit">Credit (add)</option>
                  <option value="debit">Debit (remove)</option>
                </select>
              </Field>
              <Field label={`Amount (${u.homeCurrency})`}>
                <input inputMode="decimal" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} placeholder="0.00" className={inputCls} />
              </Field>
            </div>
            <Field label="Reason (required)">
              <textarea required minLength={3} value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} className={textareaCls} />
            </Field>
            <Button type="submit" variant="primary" disabled={busy}>Post adjustment</Button>
            <p className="text-[11px] text-[var(--text-muted)]">Posts a balanced journal against the issuance account and records <code>admin.adjust_balance</code>.</p>
          </form>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold mb-2">Recent ledger activity</h2>
          <Card className="divide-y divide-[var(--border)]">
            {data.history.length === 0 && <p className="p-4 text-sm text-[var(--text-muted)]">No activity.</p>}
            {data.history.map((h: any, i: number) => (
              <div key={h.id + i} className="px-4 py-2.5 flex justify-between text-sm gap-3">
                <div className="min-w-0">
                  <p className="capitalize">{h.type}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{h.note ?? ""} · {fmtDate(h.createdAt, true)}</p>
                </div>
                <span className={`tabular font-medium ${h.direction === "credit" ? "text-[var(--success)]" : ""}`}>
                  {h.direction === "credit" ? "+" : "−"}{fmt(h.amountMinor, h.currency)}
                </span>
              </div>
            ))}
          </Card>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Admin actions on this user</h2>
          <Card className="divide-y divide-[var(--border)]">
            {data.audit.length === 0 && <p className="p-4 text-sm text-[var(--text-muted)]">None.</p>}
            {data.audit.map((a: any) => (
              <div key={a.id} className="px-4 py-2.5 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-xs">{a.action}</span>
                  <span className="text-xs text-[var(--text-muted)]">{fmtDate(a.createdAt, true)}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  by @{a.actor ?? "?"}
                  {a.metadata?.reason ? ` — “${a.metadata.reason}”` : ""}
                  {a.metadata?.amountMinor ? ` · ${a.metadata.direction} ${fmt(a.metadata.amountMinor, a.metadata.currencyCode)}` : ""}
                </p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
