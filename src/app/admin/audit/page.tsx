"use client";

import { useState } from "react";
import { Card, Empty, Notice, Skeleton, fmtDate, inputCls, useApi } from "@/components/ui";

export default function AdminAudit() {
  const [action, setAction] = useState("");
  const [query, setQuery] = useState("");
  const { data, error, loading } = useApi<any>(`/api/admin/audit?limit=200${query ? `&action=${encodeURIComponent(query)}` : ""}`);

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Audit log</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(action.trim());
        }}
        className="flex gap-2 mb-4"
      >
        <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter by action prefix, e.g. admin. or community." className={inputCls} />
      </form>
      {error && <Notice kind="error">{error}</Notice>}
      {loading && !data ? (
        <Skeleton />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Actor</th>
                <th className="px-4 py-2.5 font-medium">Target</th>
                <th className="px-4 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data?.events.map((e: any) => (
                <tr key={e.id} className="align-top">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-[var(--text-muted)]">{fmtDate(e.createdAt, true)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-2 text-xs">{e.actor ? `@${e.actor}` : "system"}</td>
                  <td className="px-4 py-2 text-xs text-[var(--text-muted)]">
                    {e.targetType ? `${e.targetType}:${String(e.targetId ?? "").slice(-8)}` : "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-[11px] text-[var(--text-muted)] max-w-md break-all">{e.metadata ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.events.length === 0 && <Empty>No events.</Empty>}
        </Card>
      )}
    </div>
  );
}
