"use client";

import { useState } from "react";
import { Badge, Button, Card, Empty, Notice, Skeleton, api, fmt, fmtDate, inputCls, useApi } from "@/components/ui";

export default function AdminDevMode() {
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const { data, error, loading, reload } = useApi<any>(`/api/admin/dev-mode${username ? `?username=${encodeURIComponent(username)}` : ""}`);
  const [msg, setMsg] = useState<string | null>(null);
  const [fresh, setFresh] = useState<any>(null);

  async function createKey() {
    setMsg(null);
    try { const r = await api("/api/admin/dev-mode", { method: "POST", json: { username } }); setFresh(r.key); reload(); } catch (e: any) { setMsg(e.message); }
  }
  async function revoke(id: string) {
    if (!confirm("Revoke key?")) return;
    try { await api(`/api/admin/dev-mode/keys/${id}`, { method: "DELETE" }); reload(); } catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Dev Mode monitor</h1>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setFresh(null); setUsername(input.trim().replace(/^@/, "")); }}>
        <input className={inputCls} placeholder="Account username (blank = all activity)" value={input} onChange={(e) => setInput(e.target.value)} />
        <Button variant="primary">Look up</Button>
      </form>
      {(error || msg) && <Notice kind="error">{error || msg}</Notice>}
      {fresh && <Notice kind="success">Key for @{username}: <span className="font-mono break-all">{fresh.apiKey}</span> · secret (shown once): <span className="font-mono break-all">{fresh.secretKey}</span> · contract {fresh.contractCode}</Notice>}
      {loading && !data ? <Skeleton /> : data && (
        <>
          {data.scope === "all" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[["Dev Mode users", data.stats.devModeUsers], ["Active keys", data.stats.activeKeys], ["Paid charges", data.stats.paidCount], ["Volume", fmt(data.stats.paidMinor)]].map(([l, v]) => (
                <Card key={String(l)} className="p-4"><div className="text-xs text-[var(--text-muted)]">{l}</div><div className="text-lg font-bold">{v}</div></Card>
              ))}
            </div>
          ) : (
            <Card className="p-4 flex items-center justify-between gap-3">
              <div><div className="font-semibold">@{data.account.username} {data.account.displayName ? `· ${data.account.displayName}` : ""}</div><div className="text-xs text-[var(--text-muted)]">Dev Mode {data.account.devModeEnabledAt ? `on since ${fmtDate(data.account.devModeEnabledAt)}` : "off"} · {data.account.status}</div></div>
              <Button variant="primary" onClick={createKey}>Create API key</Button>
            </Card>
          )}
          {data.keys && (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm"><thead className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border)]"><tr><th className="px-4 py-2">Label</th><th className="px-4 py-2">API key</th><th className="px-4 py-2">Last used</th><th className="px-4 py-2">Status</th><th /></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">{data.keys.length === 0 ? <tr><td className="px-4 py-3 text-xs" colSpan={5}>No keys</td></tr> : data.keys.map((k: any) => (
                  <tr key={k.id}><td className="px-4 py-2">{k.label}</td><td className="px-4 py-2 font-mono text-xs">{k.apiKey}</td><td className="px-4 py-2 text-xs">{k.lastUsedAt ? fmtDate(k.lastUsedAt, true) : "never"}</td><td className="px-4 py-2"><Badge tone={k.revokedAt ? "rejected" : "active"}>{k.revokedAt ? "revoked" : "active"}</Badge></td><td className="px-4 py-2">{!k.revokedAt && <Button size="sm" variant="danger" onClick={() => revoke(k.id)}>Revoke</Button>}</td></tr>
                ))}</tbody></table>
            </Card>
          )}
          <h2 className="font-semibold">Charges & transfers</h2>
          {data.transactions.length === 0 ? <Empty>No charges.</Empty> : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm"><thead className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border)]"><tr><th className="px-4 py-2">When</th>{data.scope === "all" && <th className="px-4 py-2">Merchant</th>}<th className="px-4 py-2">Reference</th><th className="px-4 py-2">Method</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Status</th></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">{data.transactions.map((t: any) => (
                  <tr key={t.id}><td className="px-4 py-2 text-xs whitespace-nowrap">{fmtDate(t.createdAt, true)}</td>{data.scope === "all" && <td className="px-4 py-2 text-xs"><button className="underline" onClick={() => { setInput(t.merchantUsername); setUsername(t.merchantUsername); }}>@{t.merchantUsername}</button></td>}<td className="px-4 py-2 font-mono text-[11px]">{t.paymentReference}<br />{t.transactionReference}</td><td className="px-4 py-2 text-xs">{t.paymentMethod === "CARD" ? `${t.cardBrand} ••${t.cardLast4}` : t.paymentMethod === "BANNK_TRANSFER" ? `Bannk @${t.payerUsername}` : "—"}</td><td className="px-4 py-2">{fmt(t.amountMinor, t.currency)}</td><td className="px-4 py-2"><Badge tone={t.status === "PAID" ? "completed" : "pending"}>{t.status}</Badge></td></tr>
                ))}</tbody></table>
            </Card>
          )}
          <h2 className="font-semibold">API audit log</h2>
          {data.logs.length === 0 ? <Empty>No API calls.</Empty> : (
            <Card className="overflow-x-auto">
              <table className="w-full text-xs"><thead className="text-left text-[var(--text-muted)] border-b border-[var(--border)]"><tr><th className="px-4 py-2">When</th>{data.scope === "all" && <th className="px-4 py-2">User</th>}<th className="px-4 py-2">Call</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">IP</th><th className="px-4 py-2">Summary</th></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">{data.logs.map((l: any) => (
                  <tr key={l.id}><td className="px-4 py-2 whitespace-nowrap">{fmtDate(l.createdAt, true)}</td>{data.scope === "all" && <td className="px-4 py-2">{l.username ? `@${l.username}` : "—"}</td>}<td className="px-4 py-2 font-mono">{l.method} {l.path}</td><td className={`px-4 py-2 ${l.statusCode < 400 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{l.statusCode}</td><td className="px-4 py-2">{l.ip || "—"}</td><td className="px-4 py-2 font-mono text-[11px]">{l.summary || ""}</td></tr>
                ))}</tbody></table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
