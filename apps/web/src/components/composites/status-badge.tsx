import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  CircleX,
  Clock,
  LoaderCircle,
  Lock,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Every status NIARVA can show. A status is always an icon plus readable text;
 * colour alone never carries the meaning.
 */
export type StatusKind =
  | "PASS"
  | "FAIL"
  | "UNKNOWN"
  | "VERIFIED"
  | "FAILED"
  | "UNVERIFIED"
  | "QUEUED"
  | "RUNNING"
  | "CANCELED"
  | "STALE"
  | "BLOCKED"
  | "DRAFT"
  | "NEEDS_REVIEW"
  | "PUBLISHED"
  | "STATIC_PASS"
  | "SAMPLE";

type Tone = "pass" | "fail" | "warn" | "unknown" | "running" | "neutral";

const config: Record<StatusKind, { label: string; tone: Tone; icon: LucideIcon; spin?: boolean }> = {
  PASS: { label: "Pass", tone: "pass", icon: CircleCheck },
  FAIL: { label: "Fail", tone: "fail", icon: CircleX },
  UNKNOWN: { label: "Unknown", tone: "unknown", icon: CircleHelp },
  VERIFIED: { label: "Verified", tone: "pass", icon: ShieldCheck },
  FAILED: { label: "Failed", tone: "fail", icon: CircleX },
  UNVERIFIED: { label: "Unverified", tone: "unknown", icon: CircleDashed },
  QUEUED: { label: "Queued", tone: "running", icon: Clock },
  RUNNING: { label: "Running", tone: "running", icon: LoaderCircle, spin: true },
  CANCELED: { label: "Canceled", tone: "unknown", icon: Ban },
  STALE: { label: "Stale", tone: "warn", icon: ShieldAlert },
  BLOCKED: { label: "Blocked", tone: "warn", icon: Lock },
  DRAFT: { label: "Draft", tone: "neutral", icon: CircleDashed },
  NEEDS_REVIEW: { label: "Needs review", tone: "warn", icon: ShieldAlert },
  PUBLISHED: { label: "Published", tone: "pass", icon: ShieldCheck },
  // Static analysis passing is not browser proof, so it is deliberately not green.
  STATIC_PASS: { label: "Static checks passed", tone: "neutral", icon: CircleCheck },
  SAMPLE: { label: "Sample", tone: "neutral", icon: CircleDashed },
};

const tones: Record<Tone, string> = {
  pass: "border-pass/40 bg-pass/10 text-pass",
  fail: "border-fail/40 bg-fail/10 text-fail",
  warn: "border-warn/40 bg-warn/10 text-warn",
  unknown: "border-unknown/40 bg-unknown/10 text-unknown",
  running: "border-sapphire/50 bg-sapphire/10 text-lavender",
  neutral: "border-line-strong bg-elevated text-ink-muted",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StatusKind;
  /** Overrides the default text, e.g. "Sample VERIFIED". */
  label?: string;
  className?: string;
}) {
  const entry = config[status];
  const Icon = entry.icon;
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        tones[entry.tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", entry.spin && "animate-spin")} />
      <span>{label ?? entry.label}</span>
    </span>
  );
}
