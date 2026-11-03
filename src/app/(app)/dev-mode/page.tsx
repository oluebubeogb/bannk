"use client";

import { useState } from "react";
import { Badge, Button, Card, Empty, Field, Notice, Skeleton, api, fmt, fmtDate, inputCls, useApi } from "@/components/ui";
import { Modal } from "@/components/kit";

function Code({ children }: { children: string }) {
  return <pre className="text-[11px] leading-relaxed bg-[#16181d] text-[#e4fb98] rounded-xl p-3 overflow-x-auto whitespace-pre">{children}</pre>;
}

export default function DevModePage() {
  const { data, error, loading, reload } = useApi<any>("/api/dev-mode") as any;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState<any>(null);
  const [tab, setTab] = useState<"keys" | "activity" | "docs">("keys");
  const refresh = () => (reload ? reload() : location.reload());

  async function run(fn: () => Promise<any>) {
    setBusy(true); setMsg(null);
    try { await fn(); refresh(); } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  const base = (data?.appUrl || (typeof window !== "undefined" ? location.origin : "")).replace(/\/+$/, "");

  return (
    <div className="px-5 pt-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Dev Mode</h1>
        <p className="text-sm text-[var(--text-muted)]">Monnify-style sandbox. Test payments land as real Bannk balance — with receipts.</p>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {msg && <Notice kind="error">{msg}</Notice>}
      {loading && !data ? <Skeleton /> : data && (
        <>
          <Card className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{data.enabled ? "Dev Mode is on" : "Dev Mode is off"}</div>
              <div className="text-xs text-[var(--text-muted)]">Provider: {data.provider} · {data.enabled ? `since ${fmtDate(data.enabledAt)}` : "turn on to issue API keys"}</div>
            </div>
            <Button variant={data.enabled ? "danger" : "primary"} disabled={busy} onClick={() => run(() => api("/api/dev-mode", { method: "POST", json: { enabled: !data.enabled } }))}>
              {data.enabled ? "Turn off" : "Enable"}
            </Button>
          </Card>

          <div className="flex gap-2 text-sm">
            {(["keys", "activity", "docs"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 h-8 rounded-full border ${tab === t ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent font-semibold" : "border-[var(--border)]"}`}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>

          {tab === "keys" && (
            <div className="space-y-3">
              {data.enabled && (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await api("/api/dev-mode/keys", { method: "POST", json: { label: label || undefined } }); setFresh(r.key); setLabel(""); }); }}>
                  <input className={inputCls} placeholder="Key label (e.g. My shop)" value={label} onChange={(e) => setLabel(e.target.value)} />
                  <Button variant="primary" disabled={busy}>Create key</Button>
                </form>
              )}
              {data.keys.length === 0 ? <Empty>No API keys yet.</Empty> : data.keys.map((k: any) => (
                <Card key={k.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{k.label}</div>
                    <Badge tone={k.revokedAt ? "rejected" : "active"}>{k.revokedAt ? "revoked" : "active"}</Badge>
                  </div>
                  <div className="text-xs font-mono break-all">API key: {k.apiKey}</div>
                  <div className="text-xs font-mono">Secret: {k.secretHint} · Contract: {k.contractCode}</div>
                  <div className="text-xs font-mono break-all">Webhook secret: {k.webhookSecret}</div>
                  <div className="text-xs text-[var(--text-muted)]">Created {fmtDate(k.createdAt, true)} · last used {k.lastUsedAt ? fmtDate(k.lastUsedAt, true) : "never"}</div>
                  {!k.revokedAt && (
                    <div className="flex gap-2">
                      <input className={inputCls} defaultValue={k.webhookUrl || ""} placeholder="Webhook URL (https://…)" id={`wh-${k.id}`} />
                      <Button size="sm" disabled={busy} onClick={() => run(() => api(`/api/dev-mode/keys/${k.id}`, { method: "PATCH", json: { webhookUrl: (document.getElementById(`wh-${k.id}`) as HTMLInputElement).value } }))}>Save</Button>
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => confirm("Revoke this key? Integrations using it stop immediately.") && run(() => api(`/api/dev-mode/keys/${k.id}`, { method: "DELETE" }))}>Revoke</Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {tab === "activity" && (
            <div className="space-y-3">
              <h2 className="font-semibold text-sm">Charges</h2>
              {data.transactions.length === 0 ? <Empty>No charges yet.</Empty> : data.transactions.map((t: any) => (
                <Card key={t.id} className="p-3 text-sm flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] truncate">{t.transactionReference}</div>
                    <div className="text-xs text-[var(--text-muted)]">{t.paymentReference} · {t.paymentMethod === "CARD" ? `${t.cardBrand} ••${t.cardLast4}` : t.payerUsername ? `@${t.payerUsername}` : "—"} · {fmtDate(t.createdAt, true)}</div>
                    {t.journalId && <a className="text-xs underline" href={`/receipt/${t.journalId}`}>Receipt</a>}
                  </div>
                  <div className="text-right"><div className="font-semibold">{fmt(t.amountMinor, t.currency)}</div><Badge tone={t.status === "PAID" ? "completed" : "pending"}>{t.status}</Badge></div>
                </Card>
              ))}
              <h2 className="font-semibold text-sm pt-2">API calls</h2>
              {data.logs.length === 0 ? <Empty>No API calls yet.</Empty> : (
                <Card className="divide-y divide-[var(--border)]">
                  {data.logs.map((l: any) => (
                    <div key={l.id} className="px-3 py-2 text-xs flex justify-between gap-2"><span className="font-mono truncate">{l.method} {l.path}</span><span className={l.statusCode < 400 ? "text-[var(--success)]" : "text-[var(--danger)]"}>{l.statusCode}</span><span className="text-[var(--text-muted)] whitespace-nowrap">{fmtDate(l.createdAt, true)}</span></div>
                  ))}
                </Card>
              )}
            </div>
          )}

          {tab === "docs" && (
            <div className="space-y-3 text-sm">
              <p>Same shapes as Monnify. Amounts are in naira (major units). All responses use <code>{"{requestSuccessful, responseMessage, responseCode, responseBody}"}</code>.</p>
              <p className="font-semibold">1 · Authenticate</p>
              <Code>{`curl -X POST ${base}/api/v1/auth/login \\
  -u "MK_TEST_xxx:SK_TEST_xxx"
→ responseBody.accessToken (1h) — send as Authorization: Bearer <token>`}</Code>
              <p className="font-semibold">2 · Initiate a charge</p>
              <Code>{`POST ${base}/api/v1/merchant/transactions/init-transaction
{ "amount": 2500, "paymentReference": "order-1001",
  "customerName": "Ada", "customerEmail": "ada@x.com",
  "paymentDescription": "Jollof combo", "currencyCode": "NGN",
  "contractCode": "<yours>", "redirectUrl": "https://shop.test/done" }
→ transactionReference, checkoutUrl (hosted page: card or Bannk)`}</Code>
              <p className="font-semibold">3a · Charge a card (Visa / Mastercard / Verve)</p>
              <Code>{`POST ${base}/api/v1/merchant/cards/charge
{ "transactionReference": "MNFY|BNK|…",
  "card": { "number": "4084084084084081", "expiryMonth": "12",
            "expiryYear": "2030", "cvv": "123", "pin": "1234" } }
→ status SUCCESS. Sandbox: any Luhn-valid card is approved, no limit.
Card number, CVV and PIN are never stored.`}</Code>
              <p className="font-semibold">3b · In-app Bannk transfer</p>
              <Code>{`POST ${base}/api/v1/merchant/bannk/charge
{ "transactionReference": "MNFY|BNK|…", "payerUsername": "tolu", "pin": "4831" }
→ debits payer's real Bannk balance, credits you, both get receipts`}</Code>
              <p className="font-semibold">4 · Verify</p>
              <Code>{`GET ${base}/api/v2/transactions/{urlencoded transactionReference}
GET ${base}/api/v2/merchant/transactions/query?paymentReference=order-1001
→ paymentStatus PENDING | PAID`}</Code>
              <p className="font-semibold">5 · Webhook</p>
              <Code>{`POST <your webhook URL>
header monnify-signature: HMAC-SHA512(rawBody, webhookSecret)
{ "eventType": "SUCCESSFUL_TRANSACTION", "eventData": { …transaction } }`}</Code>
              <p className="text-xs text-[var(--text-muted)]">Going live: set PAYMENT_PROVIDER=monnify + MONNIFY_* env vars; endpoint shapes stay the same.</p>
            </div>
          )}
        </>
      )}

      <Modal open={!!fresh} onClose={() => setFresh(null)} title="Copy your secret now">
        {fresh && (
          <div className="space-y-3 text-sm">
            <Notice kind="info">This secret key is shown once. Bannk stores only a hash.</Notice>
            <Field label="API key"><input readOnly className={inputCls + " font-mono"} value={fresh.apiKey} /></Field>
            <Field label="Secret key"><input readOnly className={inputCls + " font-mono"} value={fresh.secretKey} onFocus={(e) => e.target.select()} /></Field>
            <Field label="Contract code"><input readOnly className={inputCls + " font-mono"} value={fresh.contractCode} /></Field>
            <Button variant="primary" className="w-full" onClick={() => { navigator.clipboard?.writeText(`${fresh.apiKey}:${fresh.secretKey}`); }}>Copy key:secret</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
