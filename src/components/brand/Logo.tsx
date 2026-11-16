import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type LogoMarkProps = { className?: string; animate?: boolean; delay?: number };

export function LogoMark({ className, animate = false, delay = 0 }: LogoMarkProps) {
  const draw = (d: number) =>
    animate
      ? {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { duration: 0.9, delay: delay + d, ease: [0.65, 0, 0.35, 1] as const },
        }
      : {};
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("size-8", className)} aria-hidden>
      <motion.path
        d="M5 19.5 20 7.5l15 12"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(0)}
      />
      <motion.path
        d="M10 17v15.5h20V17"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(0.15)}
      />
      <motion.path
        d="M17 32.5v-8.5h4.5a3.25 3.25 0 0 1 0 6.5H17"
        className="text-accent"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(0.35)}
      />
    </svg>
  );
}

export function Logo({ className, tone = "default" }: { className?: string; tone?: "default" | "onDeep" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight",
        tone === "onDeep" ? "text-on-deep" : "text-primary-deep",
        className,
      )}
    >
      <LogoMark className="size-7" />
      Propatiz
    </span>
  );
}
