"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Badge, Button, Card, Empty, Field, Notice, Skeleton, api, fmt, fmtDate, inputCls, textareaCls, toMinorInput, useApi,
} from "@/components/ui";
import { MetricsRow } from "@/components/MetricsRow";

const blank = { title: "", description: "", listingId: "", budget: "", startsAt: "", endsAt: "" };

export default function BusinessCampaigns() {
  const { data, error, loading, reload } = useApi<any>("/api/business");
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading && !data) return <Skeleton />;
  if (error) return <Notice kind="error">{error}</Notice>;
  const approved = data?.business?.verificationStatus === "approved";

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy("new");
    try {
      await api("/api/business/campaigns", {
        method: "POST",
        json: {
          title: form.title,
          description: form.description || undefined,
          listingId: form.listingId,
          budgetMinor: toMinorInput(form.budget || "0") ?? 0,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
        },
      });
      setForm(blank);
      setOpen(false);
      setMsg({ kind: "success", text: "Draft campaign saved. Bannk will review and activate it." });
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  async function pause(id: string) {
    setMsg(null);
    setBusy(id);
    try {
      await api(`/api/business/campaigns/${id}`, { method: "PATCH", json: { status: "paused" } });
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
        {approved && <Button variant="primary" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "New campaign"}</Button>}
      </div>
      {!approved && (
        <div className="mb-4">
          <Notice>
            {data?.business ? "Campaigns unlock once your business is approved." : "Submit your business profile first."}{" "}
            <Link href="/business" className="underline">Go to profile</Link>
          </Notice>
        </div>
      )}
      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}

      {open && approved && (
        <Card className="p-5 mb-5">
          <form onSubmit={create} className="grid md:grid-cols-2 gap-3">
            <Field label="Title">
              <input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Promote listing (optional)">
              <select value={form.listingId} onChange={(e) => setForm({ ...form, listingId: e.target.value })} className={inputCls}>
                <option value="">None</option>
                {data?.listings
                  .filter((l: any) => l.status !== "archived")
                  .map((l: any) => (
                    <option key={l.id} value={l.id}>{l.title} ({l.status})</option>
                  ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaCls} />
              </Field>
            </div>
            <Field label="Budget (₦)" hint="Informational only — nothing is charged.">
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
            <div className="md:col-span-2">
              <Button type="submit" variant="primary" disabled={busy === "new"}>Save draft</Button>
            </div>
          </form>
        </Card>
      )}

      {data?.campaigns.length === 0 ? (
        <Card><Empty>No campaigns yet.</Empty></Card>
      ) : (
        <div className="space-y-3">
          {data?.campaigns.map((c: any) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{c.title}</p>
                    <Badge>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    {c.listing ? `Promotes “${c.listing.title}” · ` : ""}budget {fmt(c.budgetMinor)} ·{" "}
                    {c.startsAt || c.endsAt ? `${fmtDate(c.startsAt)} → ${fmtDate(c.endsAt)}` : "no schedule"}
                    {c.status === "draft" ? " · awaiting review" : ""}
                  </p>
                  <MetricsRow m={c.metrics} />
                </div>
                {c.status === "active" && (
                  <Button size="sm" disabled={busy === c.id} onClick={() => pause(c.id)}>Pause</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
