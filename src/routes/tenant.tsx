import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, CircleUserRound } from "lucide-react";
import { TransitionLink } from "@/components/motion/PageTransition";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Reveal } from "@/components/motion/Reveal";
import { DemoSwitcher } from "@/components/shared/DemoSwitcher";
import { SampleTag } from "@/components/shared/StatusPill";
import { TenantApp, type TenantTask } from "@/components/tenant/TenantApp";
import { duration, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/auth/route-guards";
import { authService } from "@/lib/auth/auth-service";
import { authStrings } from "@/lib/auth/strings";

export const Route = createFileRoute("/tenant")({
  beforeLoad: () => requireRole("tenant", { allowDemo: true }),
  head: () => ({
    meta: [
      { title: "Tenant app | Propatiz" },
      {
        name: "description",
        content:
          "Pay rent by mobile money or Visa, send a complaint, review receipts and find a new home. Try the Propatiz tenant app with sample data.",
      },
      { property: "og:title", content: "Propatiz tenant app" },
      {
        property: "og:description",
        content: "Pay rent, report a problem and request a viewing in three taps or fewer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TenantPage,
});

const tasks: { id: TenantTask; title: string; hint: string }[] = [
  {
    id: "pay",
    title: "Pay your rent",
    hint: "Tap Pay rent, then confirm. Try a part payment or a wrong network to see the checks.",
  },
  {
    id: "report",
    title: "Report a problem",
    hint: "Choose a category, describe it and send. Add a photo if you like.",
  },
  {
    id: "home",
    title: "Request a viewing",
    hint: "In Find a home, swipe right on a place you like, then request a viewing.",
  },
];

function TenantPage() {
  const [done, setDone] = useState<TenantTask[]>([]);
  const reduceMotion = useReducedMotion();
  const signedIn = !!authService.getSession();
  const onTaskDone = useCallback(
    (t: TenantTask) => setDone((d) => (d.includes(t) ? d : [...d, t])),
    [],
  );

  return (
    <div className="min-h-dvh bg-secondary">
      {/* On phones the app fills the screen; on desktop it sits in a device frame with guidance. */}
      <div className="lg:mx-auto lg:grid lg:min-h-dvh lg:max-w-7xl lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-12 lg:px-8 lg:py-10">
        <aside className="hidden self-stretch py-4 lg:block">
          <Reveal>
            <Logo />
          </Reveal>
          <Reveal delay={0.05} className="mt-8">
            <DemoSwitcher current="/tenant" className="max-w-xs" />
          </Reveal>
          <Reveal delay={0.1} className="mt-12">
            <span className="text-eyebrow text-primary">Tenant app</span>
            <h1 className="text-title mt-3 max-w-sm text-primary-deep">
              Everything a tenant needs, within three taps.
            </h1>
            <p className="mt-4 max-w-sm text-muted-foreground">
              Designed for phones first, with a modern phone frame on larger screens.
            </p>
          </Reveal>
        </aside>

        <motion.div
          className="relative flex h-dvh w-full flex-col overflow-hidden bg-foreground lg:h-[min(860px,calc(100dvh-5rem))] lg:w-[min(400px,calc(46dvh-2.3rem))] lg:rounded-[3rem] lg:border-[8px] lg:border-[#1b2b30] lg:shadow-device lg:ring-1 lg:ring-inset lg:ring-white/10"
          initial={reduceMotion ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : duration.page,
            ease: ease.outExpo,
            delay: reduceMotion ? 0 : 0.25,
          }}
        >
          <span
            className="pointer-events-none absolute left-0 top-[24%] z-10 hidden h-10 w-[5px] rounded-l-sm bg-[#526166] shadow-[inset_1px_0_1px_#aab4b6] lg:block"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute left-0 top-[32%] z-10 hidden h-8 w-[5px] rounded-l-sm bg-[#526166] shadow-[inset_1px_0_1px_#aab4b6] lg:block"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute right-0 top-[28%] z-10 hidden h-14 w-[5px] rounded-r-sm bg-[#526166] shadow-[inset_-1px_0_1px_#aab4b6] lg:block"
            aria-hidden="true"
          />
          <div
            className="hidden h-8 shrink-0 items-center justify-center bg-foreground lg:flex"
            aria-hidden="true"
          >
            <div className="flex h-6 w-28 items-center justify-center gap-2 rounded-full bg-[#07090c] px-3 shadow-[inset_0_1px_2px_#000]">
              <span className="h-1 w-7 rounded-full bg-[#252b31]" />
              <span className="size-2 rounded-full bg-[#263849] shadow-[inset_0_0_0_1px_#101318,0_0_4px_#17354c]" />
            </div>
          </div>
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 bg-primary-deep px-4 lg:hidden">
            <TransitionLink
              to="/"
              className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-on-deep"
            >
              <ArrowLeft className="size-4" aria-hidden /> Overview
            </TransitionLink>
            <div className="flex gap-1 text-xs font-semibold">
              <TransitionLink
                to="/landlord"
                className="flex min-h-11 items-center px-2 text-on-deep-muted hover:text-on-deep"
              >
                Landlord view
              </TransitionLink>
              <TransitionLink
                to="/admin"
                className="flex min-h-11 items-center px-2 text-on-deep-muted hover:text-on-deep"
              >
                Admin view
              </TransitionLink>
              {signedIn && (
                <Link
                  to="/account/settings"
                  aria-label={authStrings.settings.title}
                  title={authStrings.settings.title}
                  className="flex min-h-11 w-10 items-center justify-center text-on-deep-muted hover:text-on-deep"
                >
                  <CircleUserRound className="size-5" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden lg:rounded-[2.45rem]">
            <TenantApp onTaskDone={onTaskDone} />
          </div>
        </motion.div>

        <aside className="hidden py-4 lg:block">
          <Reveal delay={0.2}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Things to try</h2>
              <span className="figure text-sm font-semibold text-muted-foreground">
                {done.length}/{tasks.length}
              </span>
            </div>
            <ol className="mt-5 space-y-3">
              {tasks.map((t, i) => {
                const isDone = done.includes(t.id);
                return (
                  <li
                    key={t.id}
                    className={cn(
                      "surface flex gap-4 p-4 transition-colors",
                      isDone && "bg-success-soft",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors",
                        isDone
                          ? "bg-success text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {isDone ? (
                          <motion.span
                            key="c"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          >
                            <Check className="size-4" aria-label="Done" />
                          </motion.span>
                        ) : (
                          <motion.span key="n" className="figure" exit={{ scale: 0 }}>
                            {i + 1}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <div>
                      <p className="font-semibold">{t.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t.hint}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <SampleTag className="mt-6" />
          </Reveal>
        </aside>
      </div>
    </div>
  );
}
