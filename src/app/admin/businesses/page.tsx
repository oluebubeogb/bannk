"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, Notice, Skeleton, api, fmtDate, inputCls, useApi } from "@/components/ui";

const filters = ["pending", "approved", "rejected", ""];

export default function AdminBusinesses() {
  const [status, setStatus] = useState("pending");
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    if (s !== null) setStatus(s);
  }, []);
  const { data, error, loading, reload } = useApi<any>(`/api/admin/businesses${status ? `?status=${status}` : ""}`);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function review(id: string, decision: "approve" | "reject") {
    setMsg(null);
    const reason = (reasons[id] || "").trim();
    if (reason.length < 3) return setMsg({ kind: "error", text: "Add a reason before approving or rejecting." });
    setBusy(id);
    try {
      await api(`/api/admin/businesses/${id}/review`, { method: "POST", json: { decision, reason } });
      setMsg({ kind: "success", text: decision === "approve" ? "Business approved." : "Business rejected; live items paused." });
      setReasons((r) => ({ ...r, [id]: "" }));
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Businesses</h1>
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <Button key={f || "all"} size="sm" variant={status === f ? "primary" : "secondary"} onClick={() => setStatus(f)}>
            {f ? f[0].toUpperCase() + f.slice(1) : "All"}
          </Button>
        ))}
      </div>
      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      {error && <Notice kind="error">{error}</Notice>}
      {loading && !data ? (
        <Skeleton />
      ) : data?.businesses.length === 0 ? (
        <Card><Empty>No businesses here.</Empty></Card>
      ) : (
        <div className="space-y-3">
          {data?.businesses.map((b: any) => (
            <Card key={b.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold">{b.name}</h2>
                    <Badge>{b.verificationStatus}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Owner @{b.owner.username} · {b.owner.email} · submitted {fmtDate(b.createdAt)}
                  </p>
                  {b.description && <p className="text-sm mt-2 max-w-2xl">{b.description}</p>}
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    {b.website && (
                      <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-ink)] mr-3">
                        {b.website}
                      </a>
                    )}
                    {b.contactEmail && <span className="mr-3">{b.contactEmail}</span>}
                    {b.listings} listings · {b.campaigns} campaigns
                  </p>
                  {b.reviewNote && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Last review ({fmtDate(b.reviewedAt)}): “{b.reviewNote}”
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <input
                  value={reasons[b.id] || ""}
                  onChange={(e) => setReasons((r) => ({ ...r, [b.id]: e.target.value }))}
                  placeholder="Reason (required, shown to owner)"
                  className={`${inputCls} flex-1 min-w-[220px]`}
                />
                {b.verificationStatus !== "approved" && (
                  <Button variant="primary" disabled={busy === b.id} onClick={() => review(b.id, "approve")}>Approve</Button>
                )}
                {b.verificationStatus !== "rejected" && (
                  <Button variant="danger" disabled={busy === b.id} onClick={() => review(b.id, "reject")}>Reject</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
