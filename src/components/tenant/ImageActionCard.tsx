import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ImageActionCardProps = {
  icon: LucideIcon;
  image: string;
  label: string;
  meta?: string | undefined;
  onClick: () => void;
  className?: string;
  delay?: number | undefined;
};

export function ImageActionCard({
  icon: Icon,
  image,
  label,
  meta,
  onClick,
  className,
  delay = 0,
}: ImageActionCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      {...(!reduceMotion ? { whileHover: { y: -3 }, whileTap: { scale: 0.985 } } : {})}
      transition={{ duration: 0.42, ease: ease.outExpo, delay }}
      className={cn("image-action-card group", className)}
    >
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className="image-action-card__image"
        loading="lazy"
        draggable={false}
      />
      <span className="image-action-card__scrim" aria-hidden="true" />
      <span className="image-action-card__topline">
        <span className="image-action-card__icon">
          <Icon className="size-4" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <ArrowUpRight className="image-action-card__arrow size-4" aria-hidden="true" />
      </span>
      <span className="image-action-card__copy">
        <span className="block text-sm font-bold leading-snug text-on-deep">{label}</span>
        {meta && <span className="mt-1 block text-xs font-medium text-on-deep-muted">{meta}</span>}
      </span>
      <span className="image-action-card__trace" aria-hidden="true" />
    </motion.button>
  );
}

type ServiceImageBannerProps = {
  icon: LucideIcon;
  image: string;
  label: string;
  providerCount: number;
  className?: string;
  delay?: number;
};

export function ServiceImageBanner({
  icon: Icon,
  image,
  label,
  providerCount,
  className,
  delay = 0,
}: ServiceImageBannerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      {...(!reduceMotion ? { whileHover: { y: -2 } } : {})}
      transition={{ duration: 0.48, ease: ease.outExpo, delay }}
      className={cn("image-action-card group min-h-36", className)}
    >
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className="image-action-card__image"
        loading="lazy"
        draggable={false}
      />
      <span className="image-action-card__scrim" aria-hidden="true" />
      <span className="image-action-card__topline">
        <span className="image-action-card__icon">
          <Icon className="size-4" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span className="rounded-full bg-primary-deep px-2.5 py-1 text-[0.6875rem] font-semibold text-on-deep">
          {providerCount} demo {providerCount === 1 ? "provider" : "providers"}
        </span>
      </span>
      <div className="image-action-card__copy">
        <h2 className="text-lg font-bold leading-snug text-on-deep">{label}</h2>
        <p className="mt-1 text-xs font-medium text-on-deep-muted">
          Compare prices and request a quote
        </p>
      </div>
      <span className="image-action-card__trace" aria-hidden="true" />
    </motion.div>
  );
}
