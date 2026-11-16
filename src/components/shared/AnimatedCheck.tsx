import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Success mark: circle fills, then the tick draws. */
export function AnimatedCheck({ className, tone = "success" }: { className?: string; tone?: "success" | "danger" }) {
  const isDanger = tone === "danger";
  return (
    <motion.div
      className={cn(
        "grid size-20 place-items-center rounded-full",
        isDanger ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success",
        className,
      )}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
    >
      <svg viewBox="0 0 48 48" className="size-11" fill="none" aria-hidden>
        <motion.circle
          cx="24"
          cy="24"
          r="21"
          stroke="currentColor"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
        />
        {isDanger ? (
          <>
            <motion.path d="M17 17l14 14" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.25 }} />
            <motion.path d="M31 17 17 31" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.55, duration: 0.25 }} />
          </>
        ) : (
          <motion.path
            d="M15 24.5l6 6 12-13"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.4, duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
          />
        )}
      </svg>
    </motion.div>
  );
}
