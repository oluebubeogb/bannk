"use client";

import { useState } from "react";
import { Badge, Button, Card, Empty, Notice, Skeleton, api, fmtDate, inputCls, useApi } from "@/components/ui";

export default function AdminListings() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (query) params.set("q", query);
  const { data, error, loading, reload } = useApi<any>(`/api/admin/listings?${params}`);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function update(id: string, body: Record<string, unknown>) {
    setMsg(null);
    setBusy(id);
    try {
      await api(`/api/admin/listings/${id}`, { method: "PATCH", json: body });
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Listings</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
        className="flex gap-2 mb-4"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title…" className={inputCls} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} max-w-[160px]`}>
          <option value="">All statuses</option>
          {["draft", "published", "paused", "archived"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </form>
      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      {error && <Notice kind="error">{error}</Notice>}
      {loading && !data ? (
        <Skeleton />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Listing</th>
                <th className="px-4 py-2.5 font-medium">Business</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Updated</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data?.listings.map((l: any) => (
                <tr key={l.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{l.title}</p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">
                      {l.listingType}
                      {l.location ? ` · ${l.location}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)]">
                    {l.business ? (
                      <span>
                        {l.business.name}{" "}
                        {l.business.verificationStatus !== "approved" && <Badge>{l.business.verificationStatus}</Badge>}
                      </span>
                    ) : (
                      "Community"
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Badge>{l.status}</Badge>
                      {l.isSponsored && <Badge tone="pending">sponsored</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)] whitespace-nowrap">{fmtDate(l.updatedAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      {l.status !== "published" && (
                        <Button size="sm" variant="primary" disabled={busy === l.id} onClick={() => update(l.id, { status: "published" })}>
                          Publish
                        </Button>
                      )}
                      {l.status === "published" && (
                        <Button size="sm" disabled={busy === l.id} onClick={() => update(l.id, { status: "paused" })}>
                          Pause
                        </Button>
                      )}
                      {l.status !== "archived" && (
                        <Button size="sm" variant="danger" disabled={busy === l.id} onClick={() => update(l.id, { status: "archived" })}>
                          Archive
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={busy === l.id} onClick={() => update(l.id, { isSponsored: !l.isSponsored })}>
                        {l.isSponsored ? "Unsponsor" : "Sponsor"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.listings.length === 0 && <Empty>No listings.</Empty>}
        </Card>
      )}
    </div>
  );
}
