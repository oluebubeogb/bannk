"use client";

export function MetricsRow({ m }: { m?: { impression: number; click: number; join: number; complete: number; uniqueUsers: number } }) {
  if (!m) return null;
  const ctr = m.impression ? ((m.click / m.impression) * 100).toFixed(1) + "%" : "—";
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] tabular">
      <span><b className="text-[var(--text)]">{m.impression}</b> impressions</span>
      <span><b className="text-[var(--text)]">{m.click}</b> clicks</span>
      <span>CTR <b className="text-[var(--text)]">{ctr}</b></span>
      <span><b className="text-[var(--text)]">{m.join}</b> joins</span>
      <span><b className="text-[var(--text)]">{m.complete}</b> completions</span>
      <span><b className="text-[var(--text)]">{m.uniqueUsers}</b> unique users</span>
    </div>
  );
}
