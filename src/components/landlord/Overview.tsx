import { ArrowRight, Bell, Check, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CountUp } from "@/components/shared/CountUp";
import { PageHeading } from "@/components/shared/DashShell";
import { Pill, SampleTag } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { formatCompactUGX, formatUGX, getRentStatus } from "@/lib/rent";
import { ease } from "@/lib/motion";
import { monthlyCollection, stageLabel, type Complaint, type Unit } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export function Overview({
  units,
  requests,
  reminded,
  onRemind,
  onAddTenant,
  onOpenUnits,
  onOpenComplaints,
  onOpenUnit,
}: {
  units: Unit[];
  requests: Complaint[];
  reminded: string[];
  onRemind: (id: string) => void;
  onAddTenant: () => void;
  onOpenUnits: () => void;
  onOpenComplaints: () => void;
  onOpenUnit: (u: Unit) => void;
}) {
  const occupied = units.filter((u) => u.tenant);
  const expected = units.reduce((s, u) => s + u.rent, 0);
  const collected = occupied.filter((u) => u.paid).reduce((s, u) => s + u.rent, 0);
  const groups = {
    paid: occupied.filter((u) => getRentStatus(u.daysUntilDue, u.paid) === "paid"),
    "due-soon": occupied.filter((u) => getRentStatus(u.daysUntilDue, u.paid) === "due-soon"),
    upcoming: occupied.filter((u) => getRentStatus(u.daysUntilDue, u.paid) === "upcoming"),
    overdue: occupied.filter((u) => getRentStatus(u.daysUntilDue, u.paid) === "overdue"),
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

  return (
    <>
      <PageHeading eyebrow="Monday, 16 November 2026" title="Good afternoon, Patricia">
        <SampleTag className="self-center" />
        <Button onClick={onAddTenant}>
          <UserPlus /> Add tenant
        </Button>
      </PageHeading>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="surface p-6 sm:p-8">
          <p className="text-sm font-semibold text-muted-foreground">Collected in November</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="figure text-4xl font-bold tracking-tight text-primary-deep sm:text-5xl">
              <CountUp value={collected} format={(n) => formatUGX(n)} />
            </p>
            <p className="figure text-muted-foreground">of {formatUGX(expected)}</p>
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
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {segments.map((s) => (
              <div key={s.key}>
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
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
                <Tooltip
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
                          <Bell /> Remind
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
