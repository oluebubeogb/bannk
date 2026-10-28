/**
 * Server-safe brand primitives (no hooks, no "use client") so they can render in
 * server components with lucide icons passed as props. Re-exported from ./kit.
 */
import type { LucideIcon } from "lucide-react";

export function Logo({ size = 32, withWord = true, className = "" }: { size?: number; withWord?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark.png"
        alt="Bannk"
        width={size}
        height={size}
        className="rounded-[28%] shadow-sm"
        style={{ width: size, height: size }}
      />
      {withWord && <span className="font-bold tracking-tight text-[var(--text)]" style={{ fontSize: size * 0.62 }}>bannk</span>}
    </span>
  );
}

/* ---------------------------------------------------------- Icon circle */

export const TONES = {
  lime: { bg: "linear-gradient(140deg,#e4fb98,#c5f63a)", fg: "#2f4a00" },
  mint: { bg: "linear-gradient(140deg,#d9f5e5,#b7ebcd)", fg: "#145c34" },
  sky: { bg: "linear-gradient(140deg,#e1efff,#c4ddff)", fg: "#1b4f9c" },
  peach: { bg: "linear-gradient(140deg,#ffeadb,#ffd2b0)", fg: "#9a4410" },
  lilac: { bg: "linear-gradient(140deg,#efe6ff,#dacbff)", fg: "#5a2fb0" },
  sun: { bg: "linear-gradient(140deg,#fff4c9,#ffe38a)", fg: "#7d5a00" },
  rose: { bg: "linear-gradient(140deg,#ffe4e8,#ffc7d0)", fg: "#a3263e" },
  ink: { bg: "linear-gradient(140deg,#2a2d35,#16181d)", fg: "#c5f63a" },
} as const;
export type Tone = keyof typeof TONES;

export function IconCircle({
  icon: Icon,
  tone = "lime",
  size = 40,
  className = "",
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: number;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      aria-hidden
      className={`icon-circle inline-flex shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_2px_6px_-2px_rgba(22,24,29,.18)] ${className}`}
      style={{ width: size, height: size, background: t.bg, color: t.fg }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.1} />
    </span>
  );
}

/** Card section title with an icon circle. */
export function SectionTitle({ icon, tone, children, right }: { icon: LucideIcon; tone?: Tone; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2.5">
        <IconCircle icon={icon} tone={tone} size={30} />
        <h2 className="text-sm font-semibold">{children}</h2>
      </div>
      {right}
    </div>
  );
}

