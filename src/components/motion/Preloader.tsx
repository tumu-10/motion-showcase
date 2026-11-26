import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ease, PRELOADER_LEAVE_MS, PRELOADER_MS, setRevealAt } from "@/lib/motion";

/** Full-screen brand loader shown once per full page load. */
export function Preloader() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"loading" | "leaving" | "done">("loading");
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    const total = reduce ? 250 : PRELOADER_MS;
    const leaveDuration = reduce ? 200 : PRELOADER_LEAVE_MS;
    if (reduce) setRevealAt(total);
    const counter = animate(0, 100, {
      duration: Math.max(total - leaveDuration, 0) / 1000,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => {
        if (countRef.current) countRef.current.textContent = String(Math.round(v)).padStart(2, "0");
      },
    });
    const leave = window.setTimeout(() => setPhase("leaving"), total - leaveDuration);
    return () => {
      counter.stop();
      window.clearTimeout(leave);
    };
  }, [reduce]);

  if (phase === "done") return null;

  return (
    <motion.div
      role="status"
      aria-label="Loading Propatiz"
      className="deep-panel fixed inset-0 z-[var(--z-preloader)] flex flex-col"
      initial={{ y: 0 }}
      animate={phase === "leaving" ? { y: "-100%" } : { y: 0 }}
      transition={{
        duration: (reduce ? 200 : PRELOADER_LEAVE_MS) / 1000,
        ease: ease.inOutQuart,
      }}
      onAnimationComplete={() => {
        if (phase === "leaving") {
          document.documentElement.style.overflow = "";
          setPhase("done");
        }
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <motion.div
          className="flex items-center justify-center"
          initial={{
            opacity: 0,
            y: 24,
            scale: 0.86,
            clipPath: "inset(45% 45% 45% 45% round 32px)",
          }}
          animate={{ opacity: 1, y: 0, scale: 1, clipPath: "inset(0% 0% 0% 0% round 32px)" }}
          transition={{ duration: 1, delay: 0.15, ease: ease.outExpo }}
        >
          <img
            src="/propatiz-logo-transparent-light-text.svg"
            alt="Propatiz"
            className="size-40 object-contain sm:size-48"
            draggable={false}
          />
        </motion.div>
      </div>
      <div className="flex items-end justify-between px-6 pb-6 text-on-deep-muted sm:px-10 sm:pb-10">
        <motion.p
          className="max-w-[14rem] text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          Property management for landlords and tenants in Uganda
        </motion.p>
        <span className="figure text-5xl font-bold text-on-deep sm:text-7xl">
          <span ref={countRef}>00</span>
          <span className="text-accent">%</span>
        </span>
      </div>
      <motion.div
        className="h-1 origin-left bg-accent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          duration: reduce ? 0 : (PRELOADER_MS - PRELOADER_LEAVE_MS) / 1000,
          ease: [0.65, 0, 0.35, 1],
        }}
      />
    </motion.div>
  );
}
