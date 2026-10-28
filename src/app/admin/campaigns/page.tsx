"use client";

import { useState } from "react";
import {
  Badge, Button, Card, Empty, Field, Notice, Skeleton, api, fmt, fmtDate, inputCls, textareaCls, toMinorInput, useApi,
} from "@/components/ui";
import { MetricsRow } from "@/components/MetricsRow";

const empty = { title: "", description: "", budget: "", listingId: "", startsAt: "", endsAt: "", activate: false };

export default function AdminCampaigns() {
  const [status, setStatus] = useState("");
  const { data, error, loading, reload } = useApi<any>(`/api/admin/campaigns${status ? `?status=${status}` : ""}`);
  const listings = useApi<any>("/api/admin/listings?status=published");
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function setCampaignStatus(id: string, s: string) {
    if (s === "ended" && !confirm("End this campaign? It can't be restarted.")) return;
    setMsg(null);
    setBusy(id);
    try {
      await api(`/api/admin/campaigns/${id}`, { method: "PATCH", json: { status: s } });
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy("new");
    try {
      await api("/api/admin/campaigns", {
        method: "POST",
        json: {
          title: form.title,
          description: form.description || undefined,
          budgetMinor: toMinorInput(form.budget || "0") ?? 0,
          listingId: form.listingId,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          activate: form.activate,
        },
      });
      setForm(empty);
      setShowForm(false);
      setMsg({ kind: "success", text: "Campaign created." });
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Campaigns</h1>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>{showForm ? "Close" : "New campaign"}</Button>
      </div>

      {showForm && (
        <Card className="p-5 mb-5">
          <form onSubmit={create} className="grid md:grid-cols-2 gap-3">
            <Field label="Title">
              <input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Promoted listing (optional)">
              <select value={form.listingId} onChange={(e) => setForm({ ...form, listingId: e.target.value })} className={inputCls}>
                <option value="">None</option>
                {listings.data?.listings.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaCls} />
              </Field>
            </div>
            <Field label="Budget (₦, informational)">
              <input inputMode="decimal" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="0" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts">
                <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Ends">
                <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activate} onChange={(e) => setForm({ ...form, activate: e.target.checked })} />
              Activate immediately
            </label>
            <div className="md:col-span-2">
              <Button type="submit" variant="primary" disabled={busy === "new"}>Create campaign</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex gap-2 mb-4">
        {["", "draft", "active", "paused", "ended"].map((f) => (
          <Button key={f || "all"} size="sm" variant={status === f ? "primary" : "secondary"} onClick={() => setStatus(f)}>
            {f ? f[0].toUpperCase() + f.slice(1) : "All"}
          </Button>
        ))}
      </div>
      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      {error && <Notice kind="error">{error}</Notice>}
      {loading && !data ? (
        <Skeleton />
      ) : data?.campaigns.length === 0 ? (
        <Card><Empty>No campaigns.</Empty></Card>
      ) : (
        <div className="space-y-3">
          {data?.campaigns.map((c: any) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold">{c.title}</h2>
                    <Badge>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    {c.business ? c.business.name : "Bannk"}
                    {c.listing ? ` · promotes “${c.listing.title}”` : ""} · budget {fmt(c.budgetMinor)} ·{" "}
                    {c.startsAt || c.endsAt ? `${fmtDate(c.startsAt)} → ${fmtDate(c.endsAt)}` : "no schedule"}
                  </p>
                  <MetricsRow m={c.metrics} />
                </div>
                <div className="flex gap-1">
                  {(c.status === "draft" || c.status === "paused") && (
                    <Button size="sm" variant="primary" disabled={busy === c.id} onClick={() => setCampaignStatus(c.id, "active")}>
                      Activate
                    </Button>
                  )}
                  {c.status === "active" && (
                    <Button size="sm" disabled={busy === c.id} onClick={() => setCampaignStatus(c.id, "paused")}>Pause</Button>
                  )}
                  {c.status !== "ended" && (
                    <Button size="sm" variant="danger" disabled={busy === c.id} onClick={() => setCampaignStatus(c.id, "ended")}>End</Button>
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
