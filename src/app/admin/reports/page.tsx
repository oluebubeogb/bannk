"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, Empty, Notice, Skeleton, api, fmtDate, useApi } from "@/components/ui";

export default function AdminReports() {
  const [status, setStatus] = useState("open");
  const { data, error, loading, reload } = useApi<any>(`/api/admin/reports?status=${status}`);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function resolve(id: string, s: string) {
    setMsg(null);
    const note = s === "open" ? undefined : prompt("Optional note for the audit log") ?? undefined;
    setBusy(id);
    try {
      await api(`/api/admin/reports/${id}`, { method: "PATCH", json: { status: s, note: note || undefined } });
      reload();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  }

  const targetHref = (r: any) =>
    r.targetType === "user" ? `/admin/users/${r.targetId}` : r.targetType === "listing" ? `/admin/listings` : `/admin/campaigns`;

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Reports</h1>
      <div className="flex gap-2 mb-4">
        {["open", "reviewed", "actioned", "dismissed", "all"].map((f) => (
          <Button key={f} size="sm" variant={status === f ? "primary" : "secondary"} onClick={() => setStatus(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>
      {msg && <div className="mb-4"><Notice kind="error">{msg}</Notice></div>}
      {error && <Notice kind="error">{error}</Notice>}
      {loading && !data ? (
        <Skeleton />
      ) : data?.reports.length === 0 ? (
        <Card><Empty>No reports in this queue.</Empty></Card>
      ) : (
        <div className="space-y-3">
          {data?.reports.map((r: any) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone="draft">{r.targetType}</Badge>
                    <Link href={targetHref(r)} className="font-medium hover:underline">{r.targetLabel}</Link>
                    <Badge>{r.status}</Badge>
                  </div>
                  <p className="text-sm">“{r.reason}”</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Reported by @{r.reporter ?? "?"} · {fmtDate(r.createdAt, true)}
                  </p>
                </div>
                <div className="flex gap-1 items-start">
                  {r.status === "open" ? (
                    <>
                      <Button size="sm" variant="primary" disabled={busy === r.id} onClick={() => resolve(r.id, "actioned")}>Actioned</Button>
                      <Button size="sm" disabled={busy === r.id} onClick={() => resolve(r.id, "reviewed")}>Reviewed</Button>
                      <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => resolve(r.id, "dismissed")}>Dismiss</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => resolve(r.id, "open")}>Reopen</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
