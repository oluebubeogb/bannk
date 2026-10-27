"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Card, Empty, Notice, Skeleton, fmtDate, inputCls, useApi } from "@/components/ui";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  const { data, error, loading } = useApi<any>(`/api/admin/users?${params}`);

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Users</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
        className="flex gap-2 mb-4"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username or email…" className={inputCls} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} max-w-[160px]`}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </form>
      {error && <Notice kind="error">{error}</Notice>}
      {loading && !data ? (
        <Skeleton />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data?.users.map((u: any) => (
                <tr key={u.id} className="hover:bg-[var(--bg)]">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                      @{u.username ?? "—"}
                    </Link>
                    {u.displayName && <span className="text-[var(--text-muted)]"> · {u.displayName}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)]">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Badge>{u.status}</Badge>
                      {!u.verified && <Badge tone="pending">unverified</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)]">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.users.length === 0 && <Empty>No users match.</Empty>}
        </Card>
      )}
    </div>
  );
}
