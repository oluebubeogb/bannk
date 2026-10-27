"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, Empty, Field, Notice, Skeleton, api, fmtDate, inputCls, textareaCls, useApi } from "@/components/ui";

const blank = { listingType: "product", title: "", description: "", imageUrl: "", location: "", externalUrl: "", startsAt: "", endsAt: "" };

export default function BusinessListings() {
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
      await api("/api/business/listings", {
        method: "POST",
        json: { ...form, startsAt: form.startsAt || null, endsAt: form.endsAt || null },
      });
      setForm(blank);
      setOpen(false);
      setMsg({ kind: "success", text: "Draft saved. Bannk will review and publish it." });
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(id: string, status: "paused" | "archived") {
    if (status === "archived" && !confirm("Archive this listing?")) return;
    setMsg(null);
    setBusy(id);
    try {
      await api(`/api/business/listings/${id}`, { method: "PATCH", json: { status } });
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
        <h1 className="text-xl font-bold">Listings</h1>
        {approved && <Button variant="primary" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "New listing"}</Button>}
      </div>
      {!approved && (
        <div className="mb-4">
          <Notice>
            {data?.business ? "Listings unlock once your business is approved." : "Submit your business profile first."}{" "}
            <Link href="/business" className="underline">Go to profile</Link>
          </Notice>
        </div>
      )}
      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}

      {open && approved && (
        <Card className="p-5 mb-5">
          <form onSubmit={create} className="grid md:grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.listingType} onChange={(e) => setForm({ ...form, listingType: e.target.value })} className={inputCls}>
                <option value="product">Product</option>
                <option value="event">Event</option>
              </select>
            </Field>
            <Field label="Title">
              <input required minLength={2} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaCls} />
              </Field>
            </div>
            <Field label="Image URL">
              <input type="url" placeholder="https://" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Link (shop / tickets)">
              <input type="url" placeholder="https://" value={form.externalUrl} onChange={(e) => setForm({ ...form, externalUrl: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Location">
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} />
            </Field>
            {form.listingType === "event" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts">
                  <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Ends">
                  <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputCls} />
                </Field>
              </div>
            ) : (
              <div />
            )}
            <div className="md:col-span-2">
              <Button type="submit" variant="primary" disabled={busy === "new"}>Save draft</Button>
            </div>
          </form>
        </Card>
      )}

      {data?.listings.length === 0 ? (
        <Card><Empty>No listings yet.</Empty></Card>
      ) : (
        <Card className="divide-y divide-[var(--border)]">
          {data?.listings.map((l: any) => (
            <div key={l.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{l.title}</p>
                  <Badge>{l.status}</Badge>
                  {l.isSponsored && <Badge tone="pending">sponsored</Badge>}
                </div>
                <p className="text-xs text-[var(--text-muted)] capitalize">
                  {l.listingType} · created {fmtDate(l.createdAt)}
                  {l.status === "draft" ? " · awaiting review" : ""}
                </p>
              </div>
              <div className="flex gap-1">
                {l.status === "published" && (
                  <Button size="sm" disabled={busy === l.id} onClick={() => setStatus(l.id, "paused")}>Pause</Button>
                )}
                {l.status !== "archived" && (
                  <Button size="sm" variant="danger" disabled={busy === l.id} onClick={() => setStatus(l.id, "archived")}>Archive</Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
      <p className="text-xs text-[var(--text-muted)] mt-3">Paused listings are republished by Bannk on request.</p>
    </div>
  );
}
