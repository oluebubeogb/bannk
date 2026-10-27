"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DiscoverPage() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    listingType: "event",
    title: "",
    description: "",
    location: "",
    externalUrl: "",
  });
  const [err, setErr] = useState("");

  function load(query?: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    fetch(`/api/discover?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setListings(d.listings || []);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetch("/api/me").then((r) => {
      if (r.status === 401) router.replace("/login");
    });
    load();
  }, [router]);

  async function createListing(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, publish: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Failed");
      return;
    }
    setShowCreate(false);
    setForm({ listingType: "event", title: "", description: "", location: "", externalUrl: "" });
    load(q);
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Discover</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Products, events & sponsored ·{" "}
            <Link href="/community" className="text-[var(--accent-ink)]">Community</Link>
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-sm text-[var(--accent-ink)] font-medium"
        >
          {showCreate ? "Cancel" : "+ Add"}
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && load(q)}
        placeholder="Search…"
        className="w-full h-11 px-4 mb-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm"
      />

      {showCreate && (
        <form
          onSubmit={createListing}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-5 space-y-3"
        >
          <select
            value={form.listingType}
            onChange={(e) => setForm({ ...form, listingType: e.target.value })}
            className="w-full h-11 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
          >
            <option value="event">Event</option>
            <option value="product">Product</option>
          </select>
          <input
            required
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full h-11 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full min-h-[80px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm"
          />
          <input
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full h-11 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
          />
          <input
            placeholder="External URL (tickets / shop)"
            value={form.externalUrl}
            onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
            className="w-full h-11 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
          />
          {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
          >
            Publish listing
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {listings.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] text-center py-12">
              No listings yet. Add the first product or event.
            </p>
          )}
          {listings.map((l) => (
            <ListingCard key={l.id} l={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function track(campaignId: string, eventType: "impression" | "click" | "join") {
  return fetch(`/api/campaigns/${campaignId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType }),
    keepalive: true,
  }).catch(() => null);
}

function ListingCard({ l }: { l: any }) {
  const campaigns: any[] = l.campaigns || [];
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  // Impressions are deduped server-side (once per user per campaign per day)
  useEffect(() => {
    campaigns.forEach((c) => track(c.id, "impression"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l.id]);

  async function join(id: string) {
    const r = await track(id, "join");
    if (r && r.ok) setJoined((j) => ({ ...j, [id]: true }));
  }

  async function report(e: React.FormEvent) {
    e.preventDefault();
    setNote("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "listing", targetId: l.id, reason }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setNote(typeof d.error === "string" ? d.error : "Couldn't send report");
    setReporting(false);
    setReason("");
    setNote("Thanks — our team will review it.");
  }

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold leading-snug">{l.title}</h3>
        {(l.isSponsored || campaigns.length > 0) && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent-ink)]">
            Sponsored
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)] capitalize mb-2">
        {l.listingType}
        {l.business?.name ? ` · ${l.business.name}` : ""}
        {l.location ? ` · ${l.location}` : ""}
      </p>
      {l.description && <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-2">{l.description}</p>}
      {campaigns.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] px-3 py-2 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{c.title}</p>
            {c.description && <p className="text-xs text-[var(--text-muted)] line-clamp-1">{c.description}</p>}
          </div>
          <button
            onClick={() => join(c.id)}
            disabled={joined[c.id]}
            className="shrink-0 h-8 px-3 rounded-lg bg-[var(--accent)] text-[var(--on-accent)] text-xs font-semibold disabled:opacity-60"
          >
            {joined[c.id] ? "Joined" : "Join"}
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        {l.externalUrl ? (
          <a
            href={l.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => campaigns.forEach((c) => track(c.id, "click"))}
            className="text-sm text-[var(--accent-ink)]"
          >
            Open link →
          </a>
        ) : (
          <span />
        )}
        <button onClick={() => setReporting((r) => !r)} className="text-xs text-[var(--text-muted)]">
          {reporting ? "Cancel" : "Report"}
        </button>
      </div>
      {reporting && (
        <form onSubmit={report} className="mt-3 flex gap-2">
          <input
            required
            minLength={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What's wrong with this listing?"
            className="flex-1 h-9 px-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm"
          />
          <button type="submit" className="h-9 px-3 rounded-lg border border-[var(--border)] text-sm">Send</button>
        </form>
      )}
      {note && <p className="text-xs text-[var(--text-muted)] mt-2">{note}</p>}
    </div>
  );
}
