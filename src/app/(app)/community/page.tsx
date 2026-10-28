"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trophy, UsersRound, Medal, Sprout } from "lucide-react";
import { IconCircle } from "@/components/kit";
import { Badge, Button, Card, Empty, Field, Notice, Skeleton, api, fmt, fmtDate, inputCls, textareaCls, useApi } from "@/components/ui";

type Tab = "challenges" | "groups" | "leaderboard";

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>("challenges");
  const me = useApi<any>("/api/me");
  const currency = me.data?.homeCurrency || "NGN";

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "groups" || t === "leaderboard" || t === "challenges") setTab(t);
  }, []);

  return (
    <div className="px-5 pt-8 pb-6">
      <div className="flex items-center justify-between mb-1">
        <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[11px] font-semibold text-[var(--accent-ink)]">
          Community
        </span>
      </div>
      <div className="flex items-center gap-3 mt-2 mb-5">
        <IconCircle icon={Sprout} tone="mint" size={40} />
        <div>
          <h1 className="text-xl font-bold leading-tight">Grow together</h1>
          <p className="text-sm text-[var(--text-muted)]">Challenges, groups and leaderboards.</p>
        </div>
      </div>

      <div className="flex p-1 rounded-xl bg-[var(--surface-2)] mb-5">
        {(["challenges", "groups", "leaderboard"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 h-9 rounded-lg text-sm font-medium capitalize transition inline-flex items-center justify-center gap-1.5 ${
              tab === t ? "bg-[var(--surface)] shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            {t === "challenges" ? <Trophy size={14} /> : t === "groups" ? <UsersRound size={14} /> : <Medal size={14} />}
            {t}
          </button>
        ))}
      </div>

      {me.data && me.data.emailVerified === false && (
        <div className="mb-4">
          <Notice>
            <Link href="/verify" className="underline">Verify your email</Link> to earn rewards and create groups.
          </Notice>
        </div>
      )}

      {tab === "challenges" && <Challenges currency={currency} />}
      {tab === "groups" && <Groups />}
      {tab === "leaderboard" && <Leaderboard />}
    </div>
  );
}

function Challenges({ currency }: { currency: string }) {
  const { data, error, loading, reload } = useApi<any>("/api/community/challenges");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function complete(id: string) {
    setMsg(null);
    setBusy(id);
    try {
      const r = await api<any>(`/api/community/challenges/${id}/complete`, { method: "POST" });
      setMsg(
        r.alreadyCompleted
          ? { kind: "success", text: "You've already completed this one." }
          : { kind: "success", text: r.rewardMinor ? `Nice! ${fmt(r.rewardMinor, currency)} added to your wallet.` : "Challenge completed!" }
      );
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) return <Skeleton />;
  if (error) return <Notice kind="error">{error}</Notice>;
  return (
    <div className="space-y-3">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {data?.challenges.length === 0 && <Card><Empty>No active challenges right now. Check back soon.</Empty></Card>}
      {data?.challenges.map((c: any) => (
        <Card key={c.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <IconCircle icon={Trophy} tone="sun" size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge tone="draft">{c.kind}</Badge>
                {c.sponsor && <span className="text-[11px] text-[var(--text-muted)]">by {c.sponsor}</span>}
              </div>
              <p className="font-semibold">{c.title}</p>
              {c.description && <p className="text-sm text-[var(--text-muted)] mt-1">{c.description}</p>}
              <p className="text-xs text-[var(--text-muted)] mt-2">
                {c.completions} completed{c.endsAt ? ` · ends ${fmtDate(c.endsAt)}` : ""}
                {c.upcoming ? ` · opens ${fmtDate(c.startsAt)}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              {c.rewardMinor > 0 && <p className="text-sm font-bold text-[var(--accent-ink)] tabular mb-2">+{fmt(c.rewardMinor, currency)}</p>}
              {c.completedAt ? (
                <Badge tone="completed">Done</Badge>
              ) : (
                <Button size="sm" variant="primary" disabled={busy === c.id || c.upcoming} onClick={() => complete(c.id)}>
                  Complete
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Groups() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useApi<any>(`/api/community/groups${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", visibility: "public" });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy("new");
    try {
      await api("/api/community/groups", { method: "POST", json: form });
      setForm({ name: "", description: "", visibility: "public" });
      setCreating(false);
      setMsg({ kind: "success", text: "Group created." });
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  async function membership(id: string, join: boolean) {
    setMsg(null);
    setBusy(id);
    try {
      await api(`/api/community/groups/${id}/membership`, { method: join ? "POST" : "DELETE" });
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q.trim());
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups…" className={inputCls} />
        </form>
        <Button variant={creating ? "secondary" : "primary"} onClick={() => setCreating((c) => !c)}>
          {creating ? "Cancel" : "New"}
        </Button>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {creating && (
        <Card className="p-4">
          <form onSubmit={create} className="space-y-3">
            <Field label="Group name">
              <input required minLength={3} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="About">
              <textarea maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaCls} />
            </Field>
            <Field label="Visibility">
              <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className={inputCls}>
                <option value="public">Public — anyone can find and join</option>
                <option value="private">Private — hidden from browse</option>
              </select>
            </Field>
            <Button type="submit" variant="primary" disabled={busy === "new"}>Create group</Button>
          </form>
        </Card>
      )}
      {loading && !data ? (
        <Skeleton />
      ) : error ? (
        <Notice kind="error">{error}</Notice>
      ) : data?.groups.length === 0 ? (
        <Card><Empty>No groups yet — start the first one.</Empty></Card>
      ) : (
        data?.groups.map((g: any) => (
          <Card key={g.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <IconCircle icon={UsersRound} tone="sky" size={36} />
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpenGroup(openGroup === g.id ? null : g.id)}>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{g.name}</p>
                  {g.visibility === "private" && <Badge tone="draft">private</Badge>}
                </div>
                {g.description && <p className="text-sm text-[var(--text-muted)] mt-0.5">{g.description}</p>}
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                  {g.createdBy ? ` · started by @${g.createdBy}` : ""}
                </p>
              </button>
              {g.myRole ? (
                <Button size="sm" variant="ghost" disabled={busy === g.id} onClick={() => membership(g.id, false)}>Leave</Button>
              ) : (
                <Button size="sm" variant="primary" disabled={busy === g.id} onClick={() => membership(g.id, true)}>Join</Button>
              )}
            </div>
            {openGroup === g.id && <Members groupId={g.id} />}
          </Card>
        ))
      )}
    </div>
  );
}

function Members({ groupId }: { groupId: string }) {
  const { data, error, loading } = useApi<any>(`/api/community/groups/${groupId}/members`);
  if (loading && !data) return <p className="text-xs text-[var(--text-muted)] mt-3">Loading members…</p>;
  if (error) return <p className="text-xs text-[var(--danger)] mt-3">{error}</p>;
  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-wrap gap-2">
      {data?.members.map((m: any) => (
        <Link
          key={m.username}
          href={`/u/${m.username}`}
          className="text-xs px-2 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)]"
        >
          @{m.username}
          {m.role === "mod" ? " · mod" : ""}
        </Link>
      ))}
    </div>
  );
}

function Leaderboard() {
  const { data, error, loading } = useApi<any>("/api/community/leaderboard");
  const [board, setBoard] = useState<"balances" | "portfolios" | "challenges">("balances");
  if (loading && !data) return <Skeleton />;
  if (error) return <Notice kind="error">{error}</Notice>;
  const rows = data?.[board] ?? [];
  const labels = { balances: "Wallet", portfolios: "Portfolio", challenges: "Challenges" };
  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
          <Button key={k} size="sm" variant={board === k ? "primary" : "secondary"} onClick={() => setBoard(k)}>
            {labels[k]}
          </Button>
        ))}
      </div>
      <Card className="divide-y divide-[var(--border)]">
        {rows.length === 0 && <Empty>No one on this board yet.</Empty>}
        {rows.map((r: any) => (
          <Link key={r.username} href={`/u/${r.username}`} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                r.rank <= 3 ? "bg-[var(--accent)] text-[var(--on-accent)]" : "bg-[var(--surface-2)] text-[var(--text-muted)]"
              }`}
            >
              {r.rank}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{r.displayName || r.username}</p>
              <p className="text-xs text-[var(--text-muted)]">@{r.username}</p>
            </div>
            <span className="text-sm font-semibold tabular">
              {board === "challenges" ? `${r.value} done` : fmt(r.value, data.currencyCode)}
            </span>
          </Link>
        ))}
      </Card>
      <p className="text-[11px] text-[var(--text-muted)] mt-3 text-center">{data?.note}</p>
    </div>
  );
}
