"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Field, Notice, Skeleton, api, fmtDate, inputCls, textareaCls, useApi } from "@/components/ui";

const steps = [
  { key: "submit", label: "Submit your business" },
  { key: "review", label: "Bannk reviews it" },
  { key: "create", label: "Create draft listings & campaigns" },
  { key: "publish", label: "Bannk publishes them" },
];

export default function BusinessHome() {
  const { data, error, loading, reload } = useApi<any>("/api/business");
  const [form, setForm] = useState({ name: "", description: "", website: "", contactEmail: "" });
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const b = data?.business;

  useEffect(() => {
    if (b)
      setForm({
        name: b.name ?? "",
        description: b.description ?? "",
        website: b.website ?? "",
        contactEmail: b.contactEmail ?? "",
      });
  }, [b]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await api("/api/business", { method: "POST", json: form });
      setMsg({ kind: "success", text: b ? "Profile saved." : "Submitted — we'll review it shortly." });
      reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <Skeleton rows={2} />;
  if (error) return <Notice kind="error">{error}</Notice>;

  const stepIndex = !b ? 0 : b.verificationStatus === "approved" ? 2 : 1;
  const live = {
    listings: data?.listings.filter((l: any) => l.status === "published").length ?? 0,
    campaigns: data?.campaigns.filter((c: any) => c.status === "active").length ?? 0,
  };

  return (
    <div className="grid md:grid-cols-[1fr_300px] gap-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold">{b ? b.name : "Set up your business"}</h1>
          {b && <Badge>{b.verificationStatus}</Badge>}
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-5">
          Promote products and events to the Bannk community. Everything is reviewed before it goes live.
        </p>

        {b?.verificationStatus === "pending" && (
          <div className="mb-4"><Notice>Your business is in review. You&apos;ll get a notification when it&apos;s approved.</Notice></div>
        )}
        {b?.verificationStatus === "rejected" && (
          <div className="mb-4">
            <Notice kind="error">
              Not approved{b.reviewNote ? `: “${b.reviewNote}”` : "."} Update your details and save to resubmit.
            </Notice>
          </div>
        )}
        {b?.verificationStatus === "approved" && (
          <div className="mb-4">
            <Notice kind="success">
              Approved {fmtDate(b.reviewedAt)}. <Link href="/business/listings" className="underline">Create a listing</Link> or{" "}
              <Link href="/business/campaigns" className="underline">a campaign</Link>.
            </Notice>
          </div>
        )}
        {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}

        <Card className="p-5">
          <form onSubmit={submit} className="space-y-3">
            <Field label="Business name">
              <input
                required
                minLength={2}
                value={form.name}
                disabled={b?.verificationStatus === "approved"}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="What you do">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaCls} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Website">
                <input type="url" placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Contact email">
                <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Button type="submit" variant="primary" disabled={busy}>
              {!b ? "Submit for review" : b.verificationStatus === "rejected" ? "Resubmit" : "Save"}
            </Button>
          </form>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <h2 className="font-semibold text-sm mb-3">How it works</h2>
          <ol className="space-y-2.5">
            {steps.map((s, i) => (
              <li key={s.key} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    i < stepIndex
                      ? "bg-[var(--accent)] text-[var(--on-accent)]"
                      : i === stepIndex
                        ? "border-2 border-[var(--accent)]"
                        : "border border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  {i < stepIndex ? "✓" : i + 1}
                </span>
                <span className={i > stepIndex ? "text-[var(--text-muted)]" : ""}>{s.label}</span>
              </li>
            ))}
          </ol>
        </Card>
        {b && (
          <Card className="p-5 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Live listings</span><b>{live.listings}</b></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Active campaigns</span><b>{live.campaigns}</b></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Total listings</span><b>{data.listings.length}</b></div>
          </Card>
        )}
      </aside>
    </div>
  );
}
