import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { ease, PRELOADER_MS, setRevealAt } from "@/lib/motion";

const WORD = "Propatiz".split("");

/** Full-screen brand loader shown once per full page load. */
export function Preloader() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"loading" | "leaving" | "done">("loading");
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    const total = reduce ? 250 : PRELOADER_MS;
    if (reduce) setRevealAt(total);
    const counter = animate(0, 100, {
      duration: (total - 350) / 1000,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => {
        if (countRef.current) countRef.current.textContent = String(Math.round(v)).padStart(2, "0");
      },
    });
    const leave = window.setTimeout(() => setPhase("leaving"), total - 350);
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
      className="deep-panel fixed inset-0 z-[100] flex flex-col"
      initial={{ y: 0 }}
      animate={phase === "leaving" ? { y: "-100%" } : { y: 0 }}
      transition={{ duration: reduce ? 0.2 : 0.8, ease: ease.inOutQuart }}
      onAnimationComplete={() => {
        if (phase === "leaving") {
          document.documentElement.style.overflow = "";
          setPhase("done");
        }
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <LogoMark animate className="size-16 text-on-deep" />
        <div className="flex overflow-hidden text-3xl font-bold tracking-tight text-on-deep" aria-hidden>
          {WORD.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ y: "105%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.7, delay: 0.35 + i * 0.04, ease: ease.outExpo }}
            >
              {ch}
            </motion.span>
          ))}
        </div>
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
        transition={{ duration: (PRELOADER_MS - 350) / 1000, ease: [0.65, 0, 0.35, 1] }}
      />
    </motion.div>
  );
}
