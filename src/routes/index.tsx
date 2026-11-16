import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Home,
  ShieldCheck,
  Smartphone,
  Wrench,
} from "lucide-react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";
import heroImg from "@/assets/hero-kampala.jpg";
import { Logo } from "@/components/brand/Logo";
import { TransitionLink, type AppPath } from "@/components/motion/PageTransition";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { SiteHeader } from "@/components/site/SiteHeader";
import { RentRing } from "@/components/shared/RentRing";
import { RentStatusPill, SampleTag } from "@/components/shared/StatusPill";
import { buttonVariants } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DUE_SOON_DAYS, formatUGX, getRentStatus } from "@/lib/rent";
import { ease, entryDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Propatiz | Rent, repairs and records in one place" },
      {
        name: "description",
        content:
          "Propatiz helps landlords in Uganda collect rent by mobile money, track every unit and respond to repairs. Tenants pay and report problems from their phone.",
      },
      { property: "og:title", content: "Propatiz | Rent, repairs and records in one place" },
      {
        property: "og:description",
        content: "Mobile money rent collection, maintenance tracking and tenant records for East African landlords.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Roles />
        <RentFlow />
        <StatusRule />
        <Practicalities />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}

/* ---------------------------------- Hero ---------------------------------- */

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const [delay] = useState(() => entryDelay());

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-28 lg:pt-16">
        <div className="relative z-10">
          <Reveal delay={0.05}>
            <span className="text-eyebrow inline-flex items-center gap-2 text-primary">
              <span className="h-px w-8 bg-accent" aria-hidden />
              Property management for Uganda
            </span>
          </Reveal>
          <SplitHeading
            text="Rent, repairs and records. Handled in one place."
            className="text-display mt-6 max-w-[14ch] text-primary-deep"
            delay={0.1}
          />
          <Reveal delay={0.45}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Propatiz helps landlords collect rent through mobile money, keep track of every unit and respond to
              maintenance requests. Tenants pay, report problems and find their next home from their phone.
            </p>
          </Reveal>
          <Reveal delay={0.55} className="mt-9 flex flex-wrap gap-3">
            <TransitionLink to="/tenant" className={buttonVariants({ size: "lg" })}>
              Try the tenant app
              <ArrowRight />
            </TransitionLink>
            <TransitionLink to="/landlord" className={buttonVariants({ size: "lg", variant: "outline" })}>
              See the landlord dashboard
            </TransitionLink>
          </Reveal>
          <Reveal delay={0.65}>
            <p className="mt-6 text-sm text-muted-foreground">
              Interactive demo with sample data. No account needed.
            </p>
          </Reveal>
        </div>

        <div className="relative">
          <motion.div
            className="relative aspect-[4/5] overflow-hidden rounded-2xl sm:aspect-[5/4] lg:aspect-[4/5]"
            initial={{ clipPath: "inset(18% 12% 18% 12% round 24px)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0% round 24px)" }}
            transition={{ duration: 1.3, ease: ease.outExpo, delay: delay + 0.15 }}
          >
            <motion.img
              src={heroImg}
              alt="Modern apartment building on a Kampala hillside at sunset"
              width={1600}
              height={1104}
              style={{ y: imgY }}
              initial={{ scale: 1.25 }}
              animate={{ scale: 1.08 }}
              transition={{ duration: 1.8, ease: ease.outExpo, delay: delay + 0.15 }}
              className="h-full w-full object-cover"
            />
          </motion.div>

          {/* Product moments layered over the photo */}
          <motion.div
            className="surface absolute -bottom-8 left-4 w-[17rem] p-4 sm:-left-8 sm:w-[19rem]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: ease.outExpo, delay: delay + 0.9 }}
          >
            <div className="flex items-center gap-4">
              <RentRing daysLeft={5} status="due-soon" size={76} stroke={8}>
                <span className="figure text-xl font-bold leading-none">5</span>
              </RentRing>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">November rent, Unit B4</p>
                <p className="figure mt-0.5 text-lg font-bold">{formatUGX(1_200_000)}</p>
                <RentStatusPill status="due-soon" className="mt-1.5" />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="surface absolute -top-4 right-4 flex w-[16rem] items-start gap-3 p-3.5 sm:-right-6"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: ease.outExpo, delay: delay + 1.25 }}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success-ink">
              <CheckCircle2 className="size-5" aria-hidden />
            </span>
            <div className="text-sm">
              <p className="font-semibold">Payment received</p>
              <p className="text-muted-foreground">
                Unit C2 paid <span className="figure font-semibold text-foreground">{formatUGX(850_000)}</span> by
                Airtel Money
              </p>
            </div>
          </motion.div>
          <div className="absolute bottom-4 right-4">
            <SampleTag className="bg-card" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Roles --------------------------------- */

const roles: {
  id: string;
  label: string;
  who: string;
  to: AppPath;
  cta: string;
  icon: typeof Home;
  tasks: { icon: typeof Home; title: string; body: string }[];
}[] = [
  {
    id: "tenant",
    label: "Tenants",
    who: "For people renting a home",
    to: "/tenant",
    cta: "Open the tenant app",
    icon: Home,
    tasks: [
      { icon: Smartphone, title: "Pay rent in three taps", body: "Pay with MTN Mobile Money or Airtel Money and get a receipt straight away." },
      { icon: Wrench, title: "Report a problem", body: "Pick a category, add a photo and follow the repair from submitted to resolved." },
      { icon: Home, title: "Find your next home", body: "Swipe through available units and ask for a viewing without phone tag." },
    ],
  },
  {
    id: "landlord",
    label: "Landlords and managers",
    who: "For owners and property managers",
    to: "/landlord",
    cta: "Open the landlord dashboard",
    icon: Building2,
    tasks: [
      { icon: ClipboardList, title: "See who has paid", body: "Every unit shows paid, due soon or overdue, with the amount outstanding." },
      { icon: Bell, title: "Send reminders", body: "Remind tenants before rent is due and follow up on overdue balances." },
      { icon: FileText, title: "Keep clean records", body: "Payments, leases and repairs are recorded and can be exported for your accountant." },
    ],
  },
  {
    id: "admin",
    label: "Platform administrators",
    who: "For the Propatiz operations team",
    to: "/admin",
    cta: "Open the admin console",
    icon: ShieldCheck,
    tasks: [
      { icon: ShieldCheck, title: "Verify landlords", body: "Review new landlord accounts before they can collect rent." },
      { icon: Smartphone, title: "Match payments", body: "Link mobile money transactions that arrive without a clear reference." },
      { icon: ClipboardList, title: "Watch platform health", body: "Check payment provider status and open issues across all accounts." },
    ],
  },
];

function Roles() {
  const [active, setActive] = useState(0);
  const role = roles[active];
  return (
    <section id="roles" className="scroll-mt-20 border-t border-border bg-card py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <span className="text-eyebrow text-primary">One product, three views</span>
          <h2 className="text-title mt-4 text-primary-deep">Everyone sees the same rent record, from their side.</h2>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <div role="tablist" aria-label="Choose a role" className="flex gap-2 overflow-x-auto lg:flex-col">
            {roles.map((r, i) => {
              const Icon = r.icon;
              const selected = i === active;
              return (
                <button
                  key={r.id}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`role-panel-${r.id}`}
                  onClick={() => setActive(i)}
                  className={cn(
                    "relative flex min-h-14 shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                    selected ? "text-primary-foreground" : "text-foreground hover:bg-secondary",
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="role-indicator"
                      className="absolute inset-0 rounded-lg bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  )}
                  <Icon className="relative size-5 shrink-0" aria-hidden />
                  <span className="relative">
                    <span className="block font-semibold">{r.label}</span>
                    <span className={cn("hidden text-sm lg:block", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {r.who}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div id={`role-panel-${role.id}`} role="tabpanel" className="min-h-[22rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: ease.outExpo }}
              >
                <ol className="divide-y divide-border border-y border-border">
                  {role.tasks.map((t, i) => {
                    const Icon = t.icon;
                    return (
                      <motion.li
                        key={t.title}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease: ease.outExpo, delay: 0.06 * i }}
                        className="grid grid-cols-[2.5rem_1fr] gap-4 py-6 sm:grid-cols-[3rem_14rem_1fr] sm:items-baseline"
                      >
                        <span className="figure text-sm font-semibold text-muted-foreground">0{i + 1}</span>
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                          <Icon className="size-5 text-primary" aria-hidden />
                          {t.title}
                        </h3>
                        <p className="col-start-2 text-muted-foreground sm:col-start-3">{t.body}</p>
                      </motion.li>
                    );
                  })}
                </ol>
                <TransitionLink to={role.to} className={cn(buttonVariants(), "mt-8")}>
                  {role.cta}
                  <ArrowRight />
                </TransitionLink>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Rent flow ------------------------------- */

const flow = [
  { when: "7 days before", title: "Reminder goes out", body: "The tenant gets an SMS and an in-app reminder with the amount due." },
  { when: "Due date", title: "Tenant pays by mobile money", body: "They approve the payment on their phone. No bank visit, no cash handover." },
  { when: "Seconds later", title: "Both sides get a receipt", body: "The landlord sees the payment against the unit and the tenant keeps a receipt." },
  { when: "Month end", title: "Records are ready", body: "Collection reports and statements are up to date without manual entry." },
];

function RentFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section id="payments" className="deep-panel scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <span className="text-eyebrow text-accent">How rent moves</span>
          <h2 className="text-title mt-4 max-w-md text-on-deep">From reminder to receipt, without chasing anyone.</h2>
          <p className="mt-5 max-w-md text-on-deep-muted">
            Each step updates the same record, so tenants and landlords never argue about whether a payment went
            through.
          </p>
        </Reveal>

        <div ref={ref} className="relative pl-10">
          <div className="absolute bottom-2 left-[0.6875rem] top-2 w-0.5 bg-on-deep/15" aria-hidden />
          <motion.div
            className="absolute left-[0.6875rem] top-2 w-0.5 origin-top bg-accent"
            style={{ scaleY: fill, bottom: "0.5rem" }}
            aria-hidden
          />
          <ol className="space-y-14">
            {flow.map((s, i) => (
              <li key={s.title}>
              <Reveal delay={0.05 * i} className="relative">
                  <span className="absolute -left-10 top-1 grid size-6 place-items-center rounded-full border-2 border-accent bg-primary-deep">
                    <span className="size-2 rounded-full bg-accent" />
                  </span>
                  <p className="text-eyebrow text-on-deep-muted">{s.when}</p>
                  <h3 className="mt-2 text-xl font-semibold text-on-deep sm:text-2xl">{s.title}</h3>
                  <p className="mt-2 max-w-md text-on-deep-muted">{s.body}</p>
              </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Status rule ------------------------------ */

function StatusRule() {
  const [days, setDays] = useState(5);
  const [paid, setPaid] = useState(false);
  const status = getRentStatus(days, paid);
  const caption = paid
    ? "Paid. Nothing to do until next month."
    : days < 0
      ? `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} late. The landlord sees this unit at the top of their list.`
      : days === 0
        ? "Due today. The tenant gets a final reminder in the morning."
        : days <= DUE_SOON_DAYS
          ? `Due in ${days} ${days === 1 ? "day" : "days"}. Reminders have started.`
          : `Due in ${days} days. No action needed yet.`;

  return (
    <section id="status" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <span className="text-eyebrow text-primary">Rent status</span>
          <h2 className="text-title mt-4 max-w-lg text-primary-deep">Three colours, always with a label.</h2>
          <p className="mt-5 max-w-lg text-muted-foreground">
            Green means paid, amber means due within {DUE_SOON_DAYS} days and red means overdue. Every status also
            has a word and an icon, so it reads clearly in bright sunlight and for colour-blind users. Move the slider
            to see how a unit changes.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            <li><RentStatusPill status="paid" /></li>
            <li><RentStatusPill status="due-soon" /></li>
            <li><RentStatusPill status="overdue" /></li>
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="surface p-6 sm:p-10">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
            <RentRing daysLeft={Math.max(days, 0)} status={status} size={184} stroke={14}>
              <div>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={paid ? "paid" : days}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    transition={{ duration: 0.25, ease: ease.outExpo }}
                    className="figure block text-5xl font-bold"
                  >
                    {paid ? <CheckCircle2 className="mx-auto size-12 text-success" aria-label="Paid" /> : Math.abs(days)}
                  </motion.span>
                </AnimatePresence>
                {!paid && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {days < 0 ? "days late" : "days left"}
                  </span>
                )}
              </div>
            </RentRing>
            <div className="w-full flex-1">
              <RentStatusPill status={status} />
              <p className="mt-3 min-h-12 text-base font-medium" aria-live="polite">{caption}</p>
              <label htmlFor="days" className="mt-6 block text-sm font-medium text-muted-foreground">
                Days until rent is due
              </label>
              <Slider
                id="days"
                className="mt-4"
                min={-10}
                max={20}
                step={1}
                value={[days]}
                disabled={paid}
                onValueChange={([v]) => setDays(v)}
                aria-label="Days until rent is due"
              />
              <div className="figure mt-2 flex justify-between text-xs text-muted-foreground">
                <span>10 late</span>
                <span>20 left</span>
              </div>
              <button
                onClick={() => setPaid((p) => !p)}
                className={cn(buttonVariants({ variant: paid ? "outline" : "default", size: "sm" }), "mt-6")}
              >
                {paid ? "Undo payment" : "Mark as paid"}
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ Practicalities ---------------------------- */

const practical = [
  {
    icon: Smartphone,
    title: "Made for the phones people use",
    body: "Light pages, large tap targets and text that stays readable outdoors on affordable Android phones.",
  },
  {
    icon: Bell,
    title: "Works on patchy connections",
    body: "Requests you make offline are saved and sent once you reconnect, with a clear message while you wait.",
  },
  {
    icon: ShieldCheck,
    title: "Payments matched to units",
    body: "Each mobile money payment is linked to a unit and tenant, so nothing gets lost between phones and ledgers.",
  },
];

function Practicalities() {
  return (
    <section className="border-t border-border bg-card py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {practical.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={0.08 * i} className="bg-card p-8">
                <Icon className="size-6 text-primary" aria-hidden />
                <h3 className="mt-6 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-muted-foreground">{p.body}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Closing -------------------------------- */

function ClosingCta() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <Reveal className="deep-panel mx-auto max-w-7xl overflow-hidden rounded-2xl px-6 py-16 sm:px-14 sm:py-20">
        <div className="grid items-end gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-title max-w-xl text-on-deep">See how your properties would look on Propatiz.</h2>
            <p className="mt-4 max-w-lg text-on-deep-muted">
              Explore each view with sample data. Pay rent as a tenant, then switch to the landlord dashboard to see
              how it is recorded.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <TransitionLink to="/tenant" className={buttonVariants({ variant: "onDeep", size: "lg" })}>
              Tenant app
            </TransitionLink>
            <TransitionLink to="/landlord" className={buttonVariants({ variant: "onDeepOutline", size: "lg" })}>
              Landlord dashboard
            </TransitionLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted-foreground">A LandVille Ventures product.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium" aria-label="Demos">
          <TransitionLink to="/tenant" className="hover:text-primary">Tenant app</TransitionLink>
          <TransitionLink to="/landlord" className="hover:text-primary">Landlord dashboard</TransitionLink>
          <TransitionLink to="/admin" className="hover:text-primary">Platform admin</TransitionLink>
        </nav>
        <p className="text-sm text-muted-foreground">© 2026 LandVille Ventures</p>
      </div>
    </footer>
  );
}
