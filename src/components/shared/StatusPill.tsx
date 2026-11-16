import { AlertCircle, CheckCircle2, Clock, CircleDashed, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { RentStatus } from "@/lib/rent";
import { rentStatusLabel } from "@/lib/rent";

export type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const toneClass: Record<Tone, string> = {
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-destructive-soft text-destructive-ink",
  neutral: "bg-muted text-muted-foreground",
  info: "bg-primary-soft text-primary-deep",
};

const toneIcon: Record<Tone, LucideIcon> = {
  success: CheckCircle2,
  warning: Clock,
  danger: AlertCircle,
  neutral: CircleDashed,
  info: CircleDashed,
};

export const rentTone: Record<RentStatus, Tone> = {
  paid: "success",
  "due-soon": "warning",
  upcoming: "neutral",
  overdue: "danger",
};

export function Pill({
  tone,
  label,
  icon,
  className,
}: {
  tone: Tone;
  label: string;
  icon?: LucideIcon;
  className?: string;
}) {
  const Icon = icon ?? toneIcon[tone];
  return (
    <span
      className={cn(
        "relative inline-flex h-7 items-center gap-1.5 overflow-hidden rounded-full px-2.5 text-xs font-semibold",
        toneClass[tone],
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          className="inline-flex items-center gap-1.5"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function RentStatusPill({ status, className }: { status: RentStatus; className?: string }) {
  return <Pill tone={rentTone[status]} label={rentStatusLabel[status]} className={className} />;
}

export function SampleTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-dashed border-input px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      Sample data
    </span>
  );
}
