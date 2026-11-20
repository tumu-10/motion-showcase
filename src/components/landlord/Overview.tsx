import {
  ArrowRight,
  BadgeDollarSign,
  BellRing,
  CalendarClock,
  ChartNoAxesCombined,
  Check,
  CircleAlert,
  ShieldCheck,
  UserPlus,
  WalletCards,
  Wrench,
} from "lucide-react";
import { motion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CountUp } from "@/components/shared/CountUp";
import { PageHeading } from "@/components/shared/DashShell";
import { Pill, SampleTag } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DUE_SOON_DAYS, formatCompactUGX, formatUGX } from "@/lib/rent";
import { ease } from "@/lib/motion";
import {
  currentRentPeriod,
  getUnitAdvanceMonths,
  getUnitRentStatus,
  summarizeRentPeriod,
} from "@/lib/rent-accounting";
import {
  monthlyCollection,
  stageLabel,
  type Complaint,
  type LedgerEntry,
  type Unit,
} from "@/lib/sample-data";
import type { DepositLedgerEntry } from "@/lib/tenancy";
import { cn } from "@/lib/utils";

export function Overview({
  units,
  ledger,
  depositLedger,
  requests,
  reminded,
  onRemind,
  onAddTenant,
  onOpenUnits,
  onOpenComplaints,
  onOpenUnit,
}: {
  units: Unit[];
  ledger: LedgerEntry[];
  depositLedger: DepositLedgerEntry[];
  requests: Complaint[];
  reminded: string[];
  onRemind: (id: string) => void;
  onAddTenant: () => void;
  onOpenUnits: () => void;
  onOpenComplaints: () => void;
  onOpenUnit: (u: Unit) => void;
}) {
  const period = currentRentPeriod();
  const summary = summarizeRentPeriod(units, ledger, period);
  const occupied = units.filter((u) => u.tenant);
  const expected = summary.grossExpected;
  const collected = summary.collectedForPeriod;
  const statusFor = (unit: Unit) => getUnitRentStatus(unit, ledger, period);
  const groups = {
    paid: occupied.filter((u) => statusFor(u) === "Paid"),
    advance: occupied.filter((u) => statusFor(u) === "Advance"),
    "due-soon": occupied.filter(
      (u) => ["Due", "Partially paid"].includes(statusFor(u)) && u.daysUntilDue <= DUE_SOON_DAYS,
    ),
    upcoming: occupied.filter(
      (u) => ["Due", "Partially paid"].includes(statusFor(u)) && u.daysUntilDue > DUE_SOON_DAYS,
    ),
    overdue: occupied.filter((u) => statusFor(u) === "Overdue"),
  };
  const sum = (list: Unit[]) => list.reduce((s, u) => s + u.rent, 0);
  const segments = [
    {
      key: "paid",
      label: "Paid",
      cls: "bg-success",
      value: sum(groups.paid),
      count: groups.paid.length,
    },
    {
      key: "advance",
      label: "Advance",
      cls: "bg-primary",
      value: sum(groups.advance),
      count: groups.advance.length,
    },
    {
      key: "due-soon",
      label: "Due soon",
      cls: "bg-warning",
      value: sum(groups["due-soon"]),
      count: groups["due-soon"].length,
    },
    {
      key: "upcoming",
      label: "Upcoming",
      cls: "bg-chart-4",
      value: sum(groups.upcoming),
      count: groups.upcoming.length,
    },
    {
      key: "overdue",
      label: "Overdue",
      cls: "bg-destructive",
      value: sum(groups.overdue),
      count: groups.overdue.length,
    },
  ];
  const overdue = [...groups.overdue].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const openRequests = requests
    .filter((r) => r.stage !== "resolved")
    .sort((a, b) => (a.urgency === "Urgent" ? -1 : b.urgency === "Urgent" ? 1 : 0));
  const chartData = monthlyCollection.map((m) => ({
    ...m,
    expected,
    collected: m.month === "Nov" ? collected : m.collected,
  }));
  const dueWithinThreeDays = occupied
    .filter((u) => {
      const status = statusFor(u);
      return (
        ["Due", "Partially paid"].includes(status) && u.daysUntilDue >= 0 && u.daysUntilDue <= 3
      );
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const advanceRunningOut = occupied
    .filter((u) => {
      const months = getUnitAdvanceMonths(u, ledger, period);
      return months > 0 && months <= 1;
    })
    .sort(
      (a, b) => getUnitAdvanceMonths(a, ledger, period) - getUnitAdvanceMonths(b, ledger, period),
    );
  const urgentRepairs = openRequests.filter((r) => r.urgency === "Urgent");
  const attentionItems = [
    ...overdue.slice(0, 2).map((u) => ({
      id: `overdue-${u.id}`,
      icon: CircleAlert,
      title: `${u.tenant} is overdue`,
      detail: `${formatUGX(u.rent)} · ${Math.abs(u.daysUntilDue)} days late`,
      action: "View balance",
      onAction: () => onOpenUnit(u),
      tone: "overdue" as const,
    })),
    ...dueWithinThreeDays.slice(0, 2).map((u) => ({
      id: `due-${u.id}`,
      icon: CalendarClock,
      title: `${u.tenant}'s rent is due soon`,
      detail: `${formatUGX(u.rent)} · due in ${u.daysUntilDue} ${u.daysUntilDue === 1 ? "day" : "days"}`,
      action: "Send reminder",
      onAction: () => onRemind(u.id),
      tone: "due" as const,
    })),
    ...advanceRunningOut.slice(0, 2).map((u) => ({
      id: `advance-${u.id}`,
      icon: BadgeDollarSign,
      title: `${u.tenant}'s advance is running out`,
      detail: `${u.unit} · ${getUnitAdvanceMonths(u, ledger, period)} month covered`,
      action: "Remind tenant",
      onAction: () => onRemind(u.id),
      tone: "advance" as const,
    })),
    ...urgentRepairs.slice(0, 2).map((r) => ({
      id: `repair-${r.id}`,
      icon: Wrench,
      title: r.title,
      detail: `${r.unit} · ${r.property}`,
      action: "Review repair",
      onAction: onOpenComplaints,
      tone: "repair" as const,
    })),
  ].slice(0, 5);

  return (
    <>
      <PageHeading eyebrow="Monday, 16 November 2026" title="Good afternoon, Patricia">
        <SampleTag className="self-center" />
        <Button onClick={onAddTenant}>
          <UserPlus /> Add tenant
        </Button>
      </PageHeading>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Rent position">
        <OverviewMetric
          icon={WalletCards}
          label="Collected"
          value={summary.collectedForPeriod}
          explanation="Confirmed rent for this period"
          tone="collected"
          tooltip="Payments confirmed against the current rent period. It is not annual income."
        />
        <OverviewMetric
          icon={ChartNoAxesCombined}
          label="Expected"
          value={summary.grossExpected}
          explanation="Rent due across occupied units"
          tone="expected"
          tooltip="Gross monthly rent for occupied units, before part payments and advances."
        />
        <OverviewMetric
          icon={ShieldCheck}
          label="Deposits held"
          value={depositLedger
            .filter((entry) => entry.status !== "Refunded")
            .reduce((sum, entry) => sum + entry.amount, 0)}
          explanation="Held in the separate deposit ledger"
          tone="deposits"
          tooltip="Security deposits are held separately from the rent ledger and are never counted as rental income."
        />
      </section>

      <section className="surface mb-6 overflow-hidden" aria-labelledby="attention-heading">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Today
            </p>
            <h2 id="attention-heading" className="mt-1 font-bold">
              Needs attention
            </h2>
          </div>
          <span className="figure rounded-full bg-destructive-soft px-3 py-1 text-sm font-bold text-destructive-ink">
            {attentionItems.length}
          </span>
        </div>
        {attentionItems.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Check className="mx-auto size-7 text-success-ink" aria-hidden />
            <p className="mt-2 font-semibold">Nothing needs attention today</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Rent, repairs and notices are under control.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {attentionItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: ease.outExpo }}
                  className="flex items-center gap-3 px-5 py-3 sm:px-6"
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full",
                      item.tone === "overdue" && "bg-destructive-soft text-destructive-ink",
                      item.tone === "due" && "bg-warning-soft text-warning-ink",
                      item.tone === "advance" && "bg-[#ccfbf1] text-[#0f766e]",
                      item.tone === "repair" && "bg-[#ffe4e6] text-[#be123c]",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <button onClick={item.onAction} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</p>
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={item.onAction}
                    className="hidden sm:inline-flex"
                  >
                    {item.action}
                  </Button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="surface p-6 sm:p-8">
          <p className="text-sm font-semibold text-muted-foreground">Collected in November</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="figure text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              <CountUp value={collected} format={(n) => formatUGX(n)} />
            </p>
            <p className="figure text-muted-foreground">of {formatUGX(expected)} gross expected</p>
          </div>

          <div
            className="mt-8 flex h-4 w-full gap-1 overflow-hidden rounded-full"
            role="img"
            aria-label="Rent collection by status"
          >
            {segments.map((s, i) =>
              s.value ? (
                <motion.div
                  key={s.key}
                  className={cn("h-full origin-left rounded-full", s.cls)}
                  style={{ flexGrow: s.value }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, ease: ease.outExpo, delay: 0.3 + i * 0.1 }}
                  layout
                />
              ) : null,
            )}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {segments.map((s) => (
              <div key={s.key}>
                <dt className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
                  <span className={cn("size-2.5 rounded-full", s.cls)} aria-hidden />
                  {s.label}
                </dt>
                <dd className="figure mt-1 text-lg font-bold">{formatCompactUGX(s.value)}</dd>
                <dd className="text-xs text-muted-foreground">
                  {s.count} {s.count === 1 ? "unit" : "units"}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="surface min-w-0 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Last six months</p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-primary" aria-hidden />
                Collected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-chart-5" aria-hidden />
                Expected
              </span>
            </div>
          </div>
          <div className="mt-4 h-48 min-w-0 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={-20} barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={34}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickFormatter={(v) => `${v / 1_000_000}M`}
                />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  formatter={(v: number, name) => [
                    formatUGX(v),
                    name === "collected" ? "Collected" : "Expected",
                  ]}
                />
                <Bar
                  dataKey="expected"
                  fill="var(--chart-5)"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                  animationDuration={900}
                />
                <Bar
                  dataKey="collected"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                  animationDuration={1100}
                  animationBegin={200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-bold">Overdue rent</h2>
            <button
              onClick={onOpenUnits}
              className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
            >
              All units <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
          {overdue.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-semibold">No overdue rent</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Every occupied unit is paid or not yet due.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {overdue.map((u, i) => {
                const sent = reminded.includes(u.id);
                return (
                  <motion.li
                    key={u.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.4, ease: ease.outExpo }}
                    className="flex items-center gap-4 px-6 py-4"
                  >
                    <button onClick={() => onOpenUnit(u)} className="min-w-0 flex-1 text-left">
                      <p className="truncate font-semibold hover:text-primary">{u.tenant}</p>
                      <p className="text-sm text-muted-foreground">
                        {u.unit}, {u.property} ·{" "}
                        <span className="font-semibold text-destructive-ink">
                          {Math.abs(u.daysUntilDue)} days late
                        </span>
                      </p>
                    </button>
                    <p className="figure hidden font-bold sm:block">{formatUGX(u.rent)}</p>
                    <Button
                      size="sm"
                      variant={sent ? "secondary" : "outline"}
                      disabled={sent}
                      onClick={() => onRemind(u.id)}
                      className="w-32"
                    >
                      {sent ? (
                        <>
                          <Check /> Sent
                        </>
                      ) : (
                        <>
                          <BellRing /> Remind
                        </>
                      )}
                    </Button>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-bold">Open complaints</h2>
            <button
              onClick={onOpenComplaints}
              className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
            >
              Manage <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
          <ul className="divide-y divide-border">
            {openRequests.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.unit}, {r.property} · {r.reported}
                  </p>
                </div>
                {r.urgency === "Urgent" && <Pill tone="danger" label="Urgent" />}
                <Pill
                  tone={r.stage === "submitted" ? "neutral" : "info"}
                  label={stageLabel[r.stage]}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 surface flex flex-wrap items-center gap-x-10 gap-y-4 px-6 py-5">
        <div>
          <p className="text-sm text-muted-foreground">Occupancy</p>
          <p className="figure text-xl font-bold">
            {occupied.length} of {units.length} units
          </p>
        </div>
        <div className="h-2 min-w-40 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full origin-left rounded-full bg-primary"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: occupied.length / units.length }}
            transition={{ duration: 1, ease: ease.outExpo, delay: 0.4 }}
          />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">
          {units.length - occupied.length} vacant
        </p>
      </section>
    </>
  );
}

function OverviewMetric({
  icon: Icon,
  label,
  value,
  explanation,
  tone,
  tooltip,
}: {
  icon: typeof WalletCards;
  label: string;
  value: number;
  explanation: string;
  tone: "collected" | "expected" | "deposits";
  tooltip: string;
}) {
  const styles = {
    collected: {
      card: "border-transparent bg-[#dbeafe]",
      icon: "bg-white/70 text-[#1d4ed8]",
      number: "text-[#1d4ed8]",
    },
    expected: {
      card: "border-transparent bg-[#e0e7ff]",
      icon: "bg-white/70 text-[#4338ca]",
      number: "text-[#4338ca]",
    },
    deposits: {
      card: "border-transparent bg-[#ede9fe]",
      icon: "bg-white/70 text-[#6d28d9]",
      number: "text-[#6d28d9]",
    },
  }[tone];

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <article
            className={cn(
              "rounded-lg p-4 shadow-soft transition-transform duration-200 hover:-translate-y-0.5",
              styles.card,
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn("grid size-11 shrink-0 place-items-center rounded-full", styles.icon)}
              >
                <Icon className="size-5" strokeWidth={1.8} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className={cn("figure mt-1 truncate text-xl font-bold", styles.number)}>
                  <CountUp value={value} format={(n) => formatUGX(n)} />
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-foreground/75">{explanation}</p>
          </article>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72 bg-primary-deep text-on-deep">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
