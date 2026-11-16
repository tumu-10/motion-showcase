import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { entryDelay } from "@/lib/motion";

export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString("en-UG"),
  duration = 1.2,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const from = prev.current ?? 0;
    const controls = animate(from, value, {
      duration,
      delay: prev.current === null ? entryDelay() : 0,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDisplay,
    });
    prev.current = value;
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}
