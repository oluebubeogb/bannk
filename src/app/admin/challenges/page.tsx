"use client";

import { useState } from "react";
import {
  Badge, Button, Card, Empty, Field, Notice, Skeleton, api, fmt, fmtDate, inputCls, textareaCls, toMinorInput, useApi,
} from "@/components/ui";

type Form = {
  id?: string;
  title: string;
  description: string;
  kind: string;
  status: string;
  reward: string;
  startsAt: string;
  endsAt: string;
  campaignId: string;
};
const blank: Form = { title: "", description: "", kind: "community", status: "draft", reward: "", startsAt: "", endsAt: "", campaignId: "" };
const dateInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function AdminChallenges() {
  const { data, error, loading, reload } = useApi<any>("/api/admin/challenges");
  const campaigns = useApi<any>("/api/admin/campaigns");
  const [form, setForm] = useState<Form | null>(null);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setMsg(null);
    const rewardMinor = toMinorInput(form.reward || "0");
    if (rewardMinor === null) return setMsg({ kind: "error", text: "Reward must be a number." });
    const body = {
      title: form.title,
      description: form.description || null,
      kind: form.kind,
      status: form.status,
      rewardMinor,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      campaignId: form.campaignId || null,
    };
    setBusy(true);
    try {
      if (form.id) await api(`/api/admin/challenges/${form.id}`, { method: "PATCH", json: body });
      else await api("/api/admin/challenges", { method: "POST", json: body });
      setMsg({ kind: "success", text: form.id ? "Challenge updated." : "Challenge created." });
      setForm(null);
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    setMsg(null);
    try {
      await api(`/api/admin/challenges/${id}`, { method: "PATCH", json: { status } });
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Challenges</h1>
        <Button variant="primary" onClick={() => setForm(form ? null : { ...blank })}>{form ? "Close" : "New challenge"}</Button>
      </div>
      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}

      {form && (
        <Card className="p-5 mb-5">
          <h2 className="font-semibold mb-3">{form.id ? "Edit challenge" : "New challenge"}</h2>
          <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
            <Field label="Title">
              <input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={inputCls}>
                  <option value="community">Community</option>
                  <option value="learning">Learning</option>
                  <option value="sponsored">Sponsored</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                </select>
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Description / what members need to do">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaCls} />
              </Field>
            </div>
            <Field label="Reward (member's home currency)" hint="Locked once anyone has completed it.">
              <input inputMode="decimal" value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} placeholder="0" className={inputCls} />
            </Field>
            <Field label={`Linked campaign${form.kind === "sponsored" ? " (required)" : " (optional)"}`}>
              <select value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })} className={inputCls}>
                <option value="">None</option>
                {campaigns.data?.campaigns.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title} ({c.status})</option>
                ))}
              </select>
            </Field>
            <Field label="Starts">
              <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Ends">
              <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputCls} />
            </Field>
            <div className="md:col-span-2">
              <Button type="submit" variant="primary" disabled={busy}>{form.id ? "Save changes" : "Create challenge"}</Button>
            </div>
          </form>
        </Card>
      )}

      {error && <Notice kind="error">{error}</Notice>}
      {loading && !data ? (
        <Skeleton />
      ) : data?.challenges.length === 0 ? (
        <Card><Empty>No challenges yet.</Empty></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Challenge</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Reward</th>
                <th className="px-4 py-2.5 font-medium">Completions</th>
                <th className="px-4 py-2.5 font-medium">Window</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data?.challenges.map((c: any) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">
                      {c.kind}
                      {c.campaign ? ` · ${c.campaign.title}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-2.5"><Badge>{c.status}</Badge></td>
                  <td className="px-4 py-2.5 tabular">{fmt(c.rewardMinor)}</td>
                  <td className="px-4 py-2.5 tabular">{c._count.completions}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {c.startsAt || c.endsAt ? `${fmtDate(c.startsAt)} → ${fmtDate(c.endsAt)}` : "Always"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        onClick={() =>
                          setForm({
                            id: c.id,
                            title: c.title,
                            description: c.description ?? "",
                            kind: c.kind,
                            status: c.status,
                            reward: String(c.rewardMinor / 100),
                            startsAt: dateInput(c.startsAt),
                            endsAt: dateInput(c.endsAt),
                            campaignId: c.campaignId ?? "",
                          })
                        }
                      >
                        Edit
                      </Button>
                      {c.status !== "active" && (
                        <Button size="sm" variant="primary" onClick={() => setStatus(c.id, "active")}>Activate</Button>
                      )}
                      {c.status === "active" && (
                        <Button size="sm" variant="danger" onClick={() => setStatus(c.id, "ended")}>End</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
