import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { TransitionLink } from "@/components/motion/PageTransition";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Reveal } from "@/components/motion/Reveal";
import { DemoSwitcher } from "@/components/shared/DemoSwitcher";
import { SampleTag } from "@/components/shared/StatusPill";
import { TenantApp, type TenantTask } from "@/components/tenant/TenantApp";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tenant")({
  head: () => ({
    meta: [
      { title: "Tenant app | Propatiz" },
      {
        name: "description",
        content: "Pay rent by mobile money, report repairs and find a new home. Try the Propatiz tenant app with sample data.",
      },
      { property: "og:title", content: "Propatiz tenant app" },
      { property: "og:description", content: "Pay rent, report a problem and request a viewing in three taps or fewer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TenantPage,
});

const tasks: { id: TenantTask; title: string; hint: string }[] = [
  { id: "pay", title: "Pay your rent", hint: "Tap Pay rent, then confirm. Try a part payment or a wrong network to see the checks." },
  { id: "report", title: "Report a problem", hint: "Choose a category, describe it and send. Add a photo if you like." },
  { id: "home", title: "Request a viewing", hint: "In Find a home, swipe right on a place you like, then request a viewing." },
];

function TenantPage() {
  const [done, setDone] = useState<TenantTask[]>([]);
  const onTaskDone = useCallback((t: TenantTask) => setDone((d) => (d.includes(t) ? d : [...d, t])), []);

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
            <h1 className="text-title mt-3 max-w-sm text-primary-deep">Everything a tenant needs, within three taps.</h1>
            <p className="mt-4 max-w-sm text-muted-foreground">
              Designed for phones first. On a phone, this view fills the screen.
            </p>
          </Reveal>
        </aside>

        <motion.div
          className="relative h-dvh w-full overflow-hidden lg:h-[min(860px,calc(100dvh-5rem))] lg:w-[400px] lg:rounded-[2.75rem] lg:border-[10px] lg:border-foreground lg:bg-foreground lg:shadow-device"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: ease.outExpo, delay: 0.25 }}
        >
          <div className="flex h-12 items-center justify-between gap-3 bg-primary-deep px-4 lg:hidden">
            <TransitionLink to="/" className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-on-deep">
              <ArrowLeft className="size-4" aria-hidden /> Overview
            </TransitionLink>
            <div className="flex gap-1 text-xs font-semibold">
              <TransitionLink to="/landlord" className="flex min-h-11 items-center px-2 text-on-deep-muted hover:text-on-deep">
                Landlord view
              </TransitionLink>
              <TransitionLink to="/admin" className="flex min-h-11 items-center px-2 text-on-deep-muted hover:text-on-deep">
                Admin view
              </TransitionLink>
            </div>
          </div>
          <div className="h-[calc(100%-3rem)] overflow-hidden lg:h-full lg:rounded-[2.1rem]">
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
                  <li key={t.id} className={cn("surface flex gap-4 p-4 transition-colors", isDone && "bg-success-soft")}>
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors",
                        isDone ? "bg-success text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {isDone ? (
                          <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
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
