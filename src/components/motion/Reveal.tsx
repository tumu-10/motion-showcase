import { motion, useInView, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { useRef } from "react";
import { ease, entryDelay } from "@/lib/motion";

type RevealProps = HTMLMotionProps<"div"> & { delay?: number; y?: number };

/**
 * Fades content up when it scrolls into view. The wait for the preloader or page wipe is
 * measured at the moment the element becomes visible, so content further down is not delayed.
 */
export function Reveal({ delay = 0, y = 18, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: ease.outExpo, delay: inView ? entryDelay() + delay : 0 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Splits a heading into words that rise from a mask, staggered. */
export function SplitHeading({
  text,
  className,
  delay = 0,
  as = "h1",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3";
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const Tag = as;
  const words = text.split(" ");
  const start = inView ? entryDelay() + delay : 0;
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={reduce ? false : { y: "110%" }}
            animate={inView ? { y: "0%" } : {}}
            transition={{ duration: 0.85, ease: ease.outExpo, delay: start + i * 0.06 }}
          >
            {w}
            {i < words.length - 1 ? "\u00a0" : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
