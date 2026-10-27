"use client";

import Link from "next/link";
import { Card, Skeleton, Notice, fmtDate, useApi } from "@/components/ui";

export default function AdminOverview() {
  const { data, error, loading } = useApi<any>("/api/admin/overview");
  if (loading && !data) return <Skeleton rows={2} />;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!data) return null;

  const stats = [
    { label: "Users", value: data.users, sub: `${data.verifiedUsers} verified · ${data.suspendedUsers} suspended`, href: "/admin/users" },
    { label: "Open reports", value: data.openReports, href: "/admin/reports" },
    { label: "Pending businesses", value: data.pendingBusinesses, href: "/admin/businesses?status=pending" },
    { label: "Active campaigns", value: data.activeCampaigns, href: "/admin/campaigns" },
    { label: "Active challenges", value: data.activeChallenges, href: "/admin/challenges" },
    { label: "Published listings", value: data.publishedListings, href: "/admin/listings" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-4 hover:border-[var(--accent-dim)] transition">
              <p className="text-xs text-[var(--text-muted)] mb-1">{s.label}</p>
              <p className="text-2xl font-bold tabular">{s.value}</p>
              {s.sub && <p className="text-[11px] text-[var(--text-muted)] mt-1">{s.sub}</p>}
            </Card>
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Recent activity</h2>
        <Link href="/admin/audit" className="text-sm text-[var(--accent-ink)]">
          Full audit log →
        </Link>
      </div>
      <Card className="divide-y divide-[var(--border)]">
        {data.recentAudit.length === 0 && <p className="p-4 text-sm text-[var(--text-muted)]">No activity yet.</p>}
        {data.recentAudit.map((a: any) => (
          <div key={a.id} className="px-4 py-2.5 flex items-center justify-between text-sm gap-3">
            <span className="font-mono text-xs">{a.action}</span>
            <span className="text-[var(--text-muted)] truncate">
              {a.actor ? `@${a.actor}` : "system"} · {a.targetType ?? ""}
            </span>
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{fmtDate(a.createdAt, true)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
