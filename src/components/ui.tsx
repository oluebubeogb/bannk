"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";

export const fmt = (minor: number | null | undefined, currency = "NGN") => formatMoney(minor ?? 0, currency);

export function fmtDate(d: string | Date | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** JSON fetch helper that throws the API's error message. */
export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init || {};
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers || {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  if (!res.ok) {
    const err = new Error(typeof data?.error === "string" ? data.error : `Request failed (${res.status})`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export function useApi<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      setData(await api<T>(url));
      setError(null);
    } catch (e: any) {
      if (e?.status === 401 && typeof window !== "undefined") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-[var(--surface)] border border-[var(--border)] ${className}`}>{children}</div>;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ variant = "secondary", size = "md", className = "", ...props }: BtnProps) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm";
  const variants = {
    primary: "bg-[var(--accent)] text-[var(--on-accent)] font-semibold hover:bg-[var(--accent-dim)]",
    secondary: "border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
    ghost: "text-[var(--text-muted)] hover:text-[var(--text)]",
    danger: "border border-[var(--border)] bg-[var(--surface)] text-[var(--danger)] hover:bg-[#fbeceb]",
  }[variant];
  return <button className={`${base} ${sizes} ${variants} ${className}`} {...props} />;
}

const tones: Record<string, string> = {
  active: "bg-[#e6f4ec] text-[var(--success)]",
  approved: "bg-[#e6f4ec] text-[var(--success)]",
  published: "bg-[#e6f4ec] text-[var(--success)]",
  completed: "bg-[#e6f4ec] text-[var(--success)]",
  actioned: "bg-[#e6f4ec] text-[var(--success)]",
  pending: "bg-[#fdf3dc] text-[#8a5a00]",
  open: "bg-[#fdf3dc] text-[#8a5a00]",
  draft: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  paused: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  reviewed: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  ended: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  archived: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  dismissed: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  rejected: "bg-[#fbeceb] text-[var(--danger)]",
  suspended: "bg-[#fbeceb] text-[var(--danger)]",
};

export function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const key = tone ?? String(children).toLowerCase();
  return (
    <span
      className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${
        tones[key] ?? "bg-[var(--surface-2)] text-[var(--text-muted)]"
      }`}
    >
      {children}
    </span>
  );
}

export const inputCls =
  "w-full h-10 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:bg-[var(--surface)]";
export const textareaCls =
  "w-full min-h-[80px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:bg-[var(--surface)]";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--text-muted)] mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-[var(--text-muted)] mt-1">{hint}</span>}
    </label>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "success"; children: React.ReactNode }) {
  const cls =
    kind === "error"
      ? "bg-[#fbeceb] text-[var(--danger)] border-[#f3d3d0]"
      : kind === "success"
        ? "bg-[#e6f4ec] text-[var(--success)] border-[#cfe9da]"
        : "bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)]";
  return <div className={`rounded-xl border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--text-muted)] text-center py-10">{children}</p>;
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
      ))}
    </div>
  );
}

/** Parse "1,250.50" naira into integer minor units (kobo). */
export function toMinorInput(v: string): number | null {
  const n = Number(String(v).replace(/[,\s₦]/g, ""));
  if (!isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
