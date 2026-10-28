"use client";

/**
 * Shared UI kit: brand logo, icon circles, password field with eye toggle,
 * info tooltip (hover + tap), balance privacy mask, and the 4-digit PIN pad / modals.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Eye, EyeOff, Info, LockKeyhole, ShieldCheck, X, Delete } from "lucide-react";
import { api, fmt } from "./ui";

/* ---------------------------------------------------------------- Brand */

export { Logo, TONES, IconCircle, SectionTitle } from "./brand-ui";
export type { Tone } from "./brand-ui";
import { IconCircle } from "./brand-ui";

/* ------------------------------------------------------- Password input */

export function PasswordInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-9 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- Tooltip */

/** Info tooltip that opens on hover (desktop) and on tap (mobile); closes on outside tap / Escape. */
export function InfoTip({ children, label = "More info", className = "" }: { children: React.ReactNode; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <span
      ref={ref}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/5"
      >
        <Info size={15} />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="pop-in absolute right-0 top-full mt-1.5 z-40 w-max max-w-[240px] rounded-xl bg-[var(--text)] text-white text-xs leading-relaxed px-3 py-2 shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------ Balance privacy */

const BAL_KEY = "bannk.balanceVisible";
const BAL_EVENT = "bannk:balance-visibility";

/** Balances are hidden by default; choice persists in localStorage and syncs across components/tabs. */
export function useBalanceVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const read = () => setVisible(localStorage.getItem(BAL_KEY) === "1");
    read();
    window.addEventListener(BAL_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(BAL_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  const toggle = useCallback(() => {
    const next = localStorage.getItem(BAL_KEY) !== "1";
    localStorage.setItem(BAL_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(BAL_EVENT));
  }, []);
  return { visible, toggle };
}

export function maskMoney(minor: number | null | undefined, currency = "NGN", visible: boolean) {
  if (visible) return fmt(minor, currency);
  return `${currency} ******`;
}

export function EyeToggle({ visible, onToggle, className = "" }: { visible: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Hide balance" : "Show balance"}
      aria-pressed={visible}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-[var(--text)] transition ${className}`}
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

/* --------------------------------------------------------------- PIN UI */

/** Four dots + numeric keypad. Calls onComplete when 4 digits are entered. */
export function PinPad({
  onComplete,
  disabled,
  error,
  resetSignal,
}: {
  onComplete: (pin: string) => void;
  disabled?: boolean;
  error?: string | null;
  resetSignal?: number;
}) {
  const [pin, setPin] = useState("");
  useEffect(() => setPin(""), [resetSignal]);
  const push = (d: string) => {
    if (disabled) return;
    setPin((p) => {
      if (p.length >= 4) return p;
      const n = p + d;
      if (n.length === 4) setTimeout(() => onComplete(n), 60);
      return n;
    });
  };
  const pop = () => !disabled && setPin((p) => p.slice(0, -1));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) push(e.key);
      else if (e.key === "Backspace") pop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);
  return (
    <div>
      <div className={`flex justify-center gap-3 my-4 ${error ? "shake" : ""}`} key={error || "ok"}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition ${
              i < pin.length ? "bg-[var(--text)] border-[var(--text)] scale-110" : "border-[var(--border)] bg-white"
            }`}
          />
        ))}
      </div>
      {error && <p className="text-center text-xs text-[var(--danger)] mb-2">{error}</p>}
      <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeyBtn key={d} onClick={() => push(d)} disabled={disabled}>
            {d}
          </KeyBtn>
        ))}
        <span />
        <KeyBtn onClick={() => push("0")} disabled={disabled}>
          0
        </KeyBtn>
        <KeyBtn onClick={pop} disabled={disabled} label="Delete">
          <Delete size={18} />
        </KeyBtn>
      </div>
    </div>
  );
}

function KeyBtn({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="press h-12 rounded-2xl bg-[var(--surface-2)] hover:bg-[#e6e4dc] text-lg font-semibold tabular inline-flex items-center justify-center disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pop-in relative w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--surface)] px-5 pt-5 shadow-2xl"
        style={{ paddingBottom: "calc(1.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

/** Two-step "create PIN → confirm PIN" flow. Calls onDone after the server saves it. */
export function SetPinModal({ open, onClose, onDone, title = "Create your transaction PIN" }: { open: boolean; onClose: () => void; onDone: () => void; title?: string }) {
  const [first, setFirst] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(0);
  useEffect(() => {
    if (open) {
      setFirst(null);
      setErr(null);
      setReset((r) => r + 1);
    }
  }, [open]);
  const onComplete = async (pin: string) => {
    if (!first) {
      setFirst(pin);
      setErr(null);
      setReset((r) => r + 1);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setErr("PINs didn't match — start again");
      setReset((r) => r + 1);
      return;
    }
    setBusy(true);
    try {
      await api("/api/me/pin", { method: "POST", json: { pin } });
      onDone();
    } catch (e: any) {
      setFirst(null);
      setErr(e.message);
      setReset((r) => r + 1);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center pt-2">
        <IconCircle icon={ShieldCheck} tone="lime" size={52} />
        <h3 className="mt-3 font-semibold">{title}</h3>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[260px]">
          {first ? "Enter the same 4 digits again to confirm." : "You'll use this 4-digit PIN to approve every transfer. Avoid obvious ones like 1234."}
        </p>
      </div>
      <PinPad onComplete={onComplete} disabled={busy} error={err} resetSignal={reset} />
    </Modal>
  );
}

/** Ask for the PIN to approve an action. onSubmit should throw (with message) on a wrong PIN. */
export function ConfirmPinModal({
  open,
  onClose,
  onSubmit,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  summary?: React.ReactNode;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(0);
  useEffect(() => {
    if (open) {
      setErr(null);
      setReset((r) => r + 1);
    }
  }, [open]);
  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Enter PIN">
      <div className="flex flex-col items-center text-center pt-2">
        <IconCircle icon={LockKeyhole} tone="ink" size={52} />
        <h3 className="mt-3 font-semibold">Enter your PIN</h3>
        {summary && <div className="text-xs text-[var(--text-muted)] mt-1">{summary}</div>}
      </div>
      <PinPad
        disabled={busy}
        error={err}
        resetSignal={reset}
        onComplete={async (pin) => {
          setBusy(true);
          setErr(null);
          try {
            await onSubmit(pin);
          } catch (e: any) {
            setErr(e.message || "Incorrect PIN");
            setReset((r) => r + 1);
          } finally {
            setBusy(false);
          }
        }}
      />
    </Modal>
  );
}
