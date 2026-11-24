import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  animate?: boolean;
  delay?: number;
  tone?: "default" | "onDeep";
};

export function LogoMark({
  className,
  animate = false,
  delay = 0,
  tone = "default",
}: LogoMarkProps) {
  const image = (
    <img
      src={tone === "onDeep" ? "/propatiz-mark-on-navy.svg" : "/propatiz-mark.svg"}
      alt=""
      className="size-full object-contain"
      draggable={false}
    />
  );

  if (!animate) {
    return (
      <span
        className={cn("inline-block size-8 shrink-0 overflow-hidden rounded-[24%]", className)}
        aria-hidden
      >
        {image}
      </span>
    );
  }

  return (
    <motion.span
      className={cn("inline-block size-8 shrink-0 overflow-hidden rounded-[24%]", className)}
      initial={{ opacity: 0, scale: 0.72, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden
    >
      {image}
    </motion.span>
  );
}

export function Logo({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "onDeep";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight",
        tone === "onDeep" ? "text-on-deep" : "text-primary-deep",
        className,
      )}
    >
      <LogoMark className="size-8" tone={tone} />
      Propatiz
    </span>
  );
}
