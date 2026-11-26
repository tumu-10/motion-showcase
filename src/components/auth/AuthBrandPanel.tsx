import { CircleCheck, Smartphone } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import heroImage from "@/assets/hero-kampala-optimized.jpg";
import { Logo } from "@/components/brand/Logo";
import { authStrings } from "@/lib/auth/strings";
import { ease } from "@/lib/motion";

export function AuthBrandPanel() {
  const reduceMotion = useReducedMotion();

  return (
    <aside className="relative hidden min-h-[42rem] overflow-hidden rounded-[2rem] shadow-lift lg:flex">
      <motion.img
        src={heroImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        initial={false}
        animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.05] }}
        transition={{
          duration: reduceMotion ? 0 : 28,
          ease: "linear",
          repeat: reduceMotion ? 0 : Infinity,
          repeatType: "reverse",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary-deep/95 via-primary-deep/75 to-primary/45" />
      <div className="relative z-10 flex w-full flex-col p-8 text-on-deep xl:p-10">
        <Logo tone="onDeep" />
        <div className="mt-24 max-w-lg">
          <p className="text-eyebrow text-on-deep-muted">{authStrings.welcome.eyebrow}</p>
          <h2 className="mt-4 text-display">{authStrings.welcome.headline}</h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-on-deep-muted">
            {authStrings.welcome.footer}
          </p>
        </div>
        <div className="mt-auto grid gap-3 sm:grid-cols-2">
          <motion.article
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease: ease.outExpo }}
            className="rounded-2xl border border-on-deep/15 bg-on-deep/10 p-4 backdrop-blur-md"
          >
            <span className="grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
              <Smartphone className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-semibold text-on-deep">
              {authStrings.brandPanel.mobileMoneyTitle}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-on-deep-muted">
              {authStrings.brandPanel.mobileMoneyDescription}
            </p>
          </motion.article>
          <motion.article
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25, ease: ease.outExpo }}
            className="rounded-2xl border border-on-deep/15 bg-on-deep/10 p-4 backdrop-blur-md"
          >
            <span className="grid size-10 place-items-center rounded-full bg-success-soft text-success-ink">
              <CircleCheck className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-semibold text-on-deep">
              {authStrings.brandPanel.recordsTitle}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-on-deep-muted">
              {authStrings.brandPanel.recordsDescription}
            </p>
          </motion.article>
        </div>
      </div>
    </aside>
  );
}
