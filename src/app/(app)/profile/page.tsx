"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Send,
  WalletCards,
  ScrollText,
  Users,
  Briefcase,
  ShieldHalf,
  LogOut,
  Download,
  QrCode,
  Coins,
  Eye,
  KeyRound,
  LockKeyhole,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { api, fmtDate, inputCls, Field } from "@/components/ui";
import { IconCircle, Modal, PasswordInput, SetPinModal, SectionTitle } from "@/components/kit";

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [qr, setQr] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const load = () =>
    fetch("/api/me")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      });

  useEffect(() => {
    load();
    fetch("/api/qr")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setQr(d);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!data) {
    return (
      <div className="px-5 pt-8">
        <div className="h-24 rounded-2xl bg-[var(--surface)] animate-pulse" />
      </div>
    );
  }

  const links = [
    { href: "/send", label: "Send money", icon: Send, tone: "lime" as const },
    { href: "/wallet", label: "Wallet", icon: WalletCards, tone: "sky" as const },
    { href: "/wallet#statement", label: "Statements & receipts", icon: ScrollText, tone: "peach" as const },
    { href: "/community", label: "Community", icon: Users, tone: "mint" as const },
    { href: "/business", label: "Business console", icon: Briefcase, tone: "sun" as const },
    ...(data.isAdmin ? [{ href: "/admin", label: "Admin console", icon: ShieldHalf, tone: "ink" as const }] : []),
  ];

  return (
    <div className="px-5 pt-8 pb-6">
      <h1 className="text-xl font-bold mb-6">Profile</h1>

      <div className="relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-5 text-center">
        <div className="absolute inset-x-0 top-0 h-16 hero-gradient opacity-70" aria-hidden />
        <div className="relative w-16 h-16 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-[var(--accent-ink)] mx-auto mb-3 mt-4">
          {(data.displayName || data.username || "?").charAt(0).toUpperCase()}
        </div>
        <p className="text-lg font-semibold">{data.displayName}</p>
        <p className="text-sm font-semibold text-[var(--accent-ink)]">@{data.username}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">{data.email}</p>
        <Link href={`/u/${data.username}`} className="inline-flex items-center gap-1 mt-3 text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
          <ExternalLink size={12} /> Public profile
        </Link>
      </div>

      {qr && (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-5">
          <SectionTitle icon={QrCode} tone="sky">
            Your QR code
          </SectionTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.qrDataUrl} alt={`Bannk QR code for @${qr.username}`} className="mx-auto rounded-2xl w-60 h-auto" />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <a
              href={qr.downloadUrl || "/api/qr/image?download=1"}
              download
              className="press h-10 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--on-accent)] text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Download size={15} /> Download PNG
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(qr.url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* ignore */
                }
              }}
              className="press h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-sm font-medium inline-flex items-center justify-center gap-1.5"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--border)] mb-5">
        <div className="px-4 py-3 flex items-center gap-3 text-sm">
          <IconCircle icon={Coins} tone="sun" size={30} />
          <span className="text-[var(--text-muted)] flex-1">Home currency</span>
          <span className="font-medium">{data.homeCurrency}</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-3 text-sm">
          <IconCircle icon={Eye} tone="lilac" size={30} />
          <span className="text-[var(--text-muted)] flex-1">Visibility</span>
          <span className="font-medium capitalize">{data.visibility}</span>
        </div>
      </div>

      <SecuritySection hasPin={!!data.hasPin} pinSetAt={data.pinSetAt} onChanged={load} />

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--border)] mb-5 overflow-hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="tile px-4 py-3 flex items-center gap-3 text-sm hover:bg-[var(--surface-2)]/60 transition">
            <IconCircle icon={l.icon} tone={l.tone} size={32} />
            <span className="font-medium flex-1">{l.label}</span>
            <ChevronRight size={16} className="text-[var(--text-muted)]" />
          </Link>
        ))}
      </div>

      <button
        onClick={logout}
        className="press w-full h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--danger)] font-medium inline-flex items-center justify-center gap-2 hover:bg-[#fbeceb]"
      >
        <LogOut size={17} /> Sign out
      </button>
    </div>
  );
}

/* ----------------------------------------------------------- Security */

function SecuritySection({ hasPin, pinSetAt, onChanged }: { hasPin: boolean; pinSetAt?: string | null; onChanged: () => void }) {
  const [setOpen, setSetOpen] = useState(false);
  const [mode, setMode] = useState<null | "change" | "remove" | "password">(null);
  const [flash, setFlash] = useState<string | null>(null);

  const done = (msg: string) => {
    setMode(null);
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
    onChanged();
  };

  return (
    <section id="security" className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-5 scroll-mt-6">
      <SectionTitle icon={LockKeyhole} tone="ink">
        Security
      </SectionTitle>

      <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-2)]/70 px-3 py-3 mb-3">
        <div className="flex-1">
          <p className="text-sm font-medium">Transaction PIN</p>
          <p className="text-xs text-[var(--text-muted)]">
            {hasPin ? `4-digit PIN set${pinSetAt ? ` · ${fmtDate(pinSetAt)}` : ""}` : "Required before you can send money"}
          </p>
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide px-2 h-5 inline-flex items-center rounded-full ${
            hasPin ? "bg-[#e6f4ec] text-[var(--success)]" : "bg-[#fdf3dc] text-[#8a5a00]"
          }`}
        >
          {hasPin ? "On" : "Not set"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {!hasPin ? (
          <button
            type="button"
            onClick={() => setSetOpen(true)}
            className="press h-10 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--on-accent)] text-sm font-semibold"
          >
            Set PIN
          </button>
        ) : (
          <>
            <button type="button" onClick={() => setMode("change")} className="press h-10 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-sm font-medium">
              Change PIN
            </button>
            <button type="button" onClick={() => setMode("remove")} className="press h-10 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[#fbeceb] text-[var(--danger)] text-sm font-medium">
              Remove PIN
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setMode("password")}
          className="press h-10 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-sm font-medium inline-flex items-center gap-1.5"
        >
          <KeyRound size={15} /> Change password
        </button>
      </div>
      {flash && <p className="text-sm text-[var(--success)] mt-3">{flash}</p>}

      <SetPinModal open={setOpen} onClose={() => setSetOpen(false)} onDone={() => { setSetOpen(false); done("PIN set"); }} />
      <Modal open={mode === "change"} onClose={() => setMode(null)} title="Change PIN">
        <ChangePinForm onDone={() => done("PIN changed")} />
      </Modal>
      <Modal open={mode === "remove"} onClose={() => setMode(null)} title="Remove PIN">
        <RemovePinForm onDone={() => done("PIN removed — you'll need a new one before sending")} />
      </Modal>
      <Modal open={mode === "password"} onClose={() => setMode(null)} title="Change password">
        <ChangePasswordForm onDone={() => done("Password updated")} />
      </Modal>
    </section>
  );
}

const pinInput = `${inputCls} tracking-[0.6em] text-center tabular`;
const digitsOnly = (v: string) => v.replace(/\D/g, "").slice(0, 4);

function ChangePinForm({ onDone }: { onDone: () => void }) {
  const [via, setVia] = useState<"pin" | "password">("pin");
  const [current, setCurrent] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3 pt-1"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        if (!/^\d{4}$/.test(pin)) return setErr("New PIN must be 4 digits");
        if (pin !== confirm) return setErr("New PINs don't match");
        setBusy(true);
        try {
          await api("/api/me/pin", {
            method: "POST",
            json: via === "pin" ? { pin, currentPin: current } : { pin, currentPassword: current },
          });
          onDone();
        } catch (e: any) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-semibold">Change PIN</h3>
      <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 text-xs font-medium">
        {(["pin", "password"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => { setVia(v); setCurrent(""); }}
            className={`flex-1 h-8 rounded-lg transition ${via === v ? "bg-white shadow-sm" : "text-[var(--text-muted)]"}`}
          >
            Verify with current {v === "pin" ? "PIN" : "password"}
          </button>
        ))}
      </div>
      <Field label={via === "pin" ? "Current PIN" : "Current password"}>
        {via === "pin" ? (
          <PasswordInput value={current} onChange={(e) => setCurrent(digitsOnly(e.target.value))} inputMode="numeric" autoComplete="off" className={pinInput} required />
        ) : (
          <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={inputCls} required />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="New PIN">
          <PasswordInput value={pin} onChange={(e) => setPin(digitsOnly(e.target.value))} inputMode="numeric" autoComplete="off" className={pinInput} required />
        </Field>
        <Field label="Confirm">
          <PasswordInput value={confirm} onChange={(e) => setConfirm(digitsOnly(e.target.value))} inputMode="numeric" autoComplete="off" className={pinInput} required />
        </Field>
      </div>
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
      <button disabled={busy} className="press w-full h-11 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold disabled:opacity-60">
        {busy ? "Saving…" : "Save new PIN"}
      </button>
    </form>
  );
}

function RemovePinForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3 pt-1"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await api("/api/me/pin", { method: "DELETE", json: { currentPassword: password } });
          onDone();
        } catch (e: any) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-semibold">Remove PIN</h3>
      <p className="text-xs text-[var(--text-muted)]">You won&apos;t be able to send money until you set a new PIN.</p>
      <Field label="Password">
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={inputCls} required />
      </Field>
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
      <button disabled={busy} className="press w-full h-11 rounded-xl border border-[var(--border)] text-[var(--danger)] font-semibold disabled:opacity-60">
        {busy ? "Removing…" : "Remove PIN"}
      </button>
    </form>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3 pt-1"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await api("/api/me/password", { method: "POST", json: { currentPassword: current, newPassword: next } });
          onDone();
        } catch (e: any) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-semibold">Change password</h3>
      <Field label="Current password">
        <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={inputCls} required />
      </Field>
      <Field label="New password" hint="At least 8 characters">
        <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={8} className={inputCls} required />
      </Field>
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
      <button disabled={busy} className="press w-full h-11 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold disabled:opacity-60">
        {busy ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
