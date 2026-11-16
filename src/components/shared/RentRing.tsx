import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RentStatus } from "@/lib/rent";
import { ease, entryDelay } from "@/lib/motion";

const strokeTone: Record<RentStatus, string> = {
  paid: "text-success",
  "due-soon": "text-warning",
  upcoming: "text-primary",
  overdue: "text-destructive",
};

/** Countdown ring: the arc shows how much of the rent cycle is left before the due date. */
export function RentRing({
  daysLeft,
  cycleDays = 30,
  status,
  size = 168,
  stroke = 12,
  className,
  trackClassName = "stroke-muted",
  children,
}: {
  trackClassName?: string;
  daysLeft: number;
  cycleDays?: number;
  status: RentStatus;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const [delay] = useState(() => entryDelay());
  const r = (size - stroke) / 2;
  const progress =
    status === "paid" ? 1 : status === "overdue" ? 1 : Math.max(0.02, Math.min(1, daysLeft / cycleDays));
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClassName} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          className={cn("transition-colors duration-500", strokeTone[status])}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: progress }}
          transition={{ duration: 1.2, ease: ease.outExpo, delay }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
