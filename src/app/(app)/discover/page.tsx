"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
          <p className="text-xs text-[var(--text-muted)]">Products, events & sponsored</p>
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
            <div
              key={l.id}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold leading-snug">{l.title}</h3>
                {l.isSponsored && (
                  <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent-ink)]">
                    Sponsored
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] capitalize mb-2">
                {l.listingType}
                {l.location ? ` · ${l.location}` : ""}
              </p>
              {l.description && (
                <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-2">
                  {l.description}
                </p>
              )}
              {l.externalUrl && (
                <a
                  href={l.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--accent-ink)]"
                >
                  Open link →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
