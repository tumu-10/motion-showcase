import {
  ArrowUpRight,
  BadgeDollarSign,
  BellRing,
  CalendarClock,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeading } from "@/components/shared/DashShell";
import { Button } from "@/components/ui/button";
import { formatUGX } from "@/lib/rent";
import { currentRentPeriod } from "@/lib/rent-accounting";
import type { LedgerEntry, Unit } from "@/lib/sample-data";
import { formatCoveredUntil, getAdvanceCoverage, getFutureAdvanceAmount } from "@/lib/tenancy";
import { cn } from "@/lib/utils";

type AdvanceFilter = "all" | 2 | 3 | 6;

const filters: { value: AdvanceFilter; label: string }[] = [
  { value: "all", label: "All advances" },
  { value: 2, label: "2+ months" },
  { value: 3, label: "3+ months" },
  { value: 6, label: "6+ months" },
];

export function AdvanceView({
  units,
  ledger,
  reminded,
  onRemind,
}: {
  units: Unit[];
  ledger: LedgerEntry[];
  reminded: string[];
  onRemind: (unit: Unit, coveredUntil: string) => void;
}) {
  const [filter, setFilter] = useState<AdvanceFilter>("all");
  const period = currentRentPeriod();
  const tenants = useMemo(
    () =>
      units.flatMap((unit) => {
        if (!unit.tenant) return [];
        const coverage = getAdvanceCoverage(unit, ledger, period);
        if (coverage.monthsCovered < 2 || !coverage.coveredUntil) return [];
        const futureMonths = Math.max(0, coverage.monthsCovered - 1);
        return [
          {
            unit,
            monthsCovered: coverage.monthsCovered,
            futureMonths,
            coveredUntil: coverage.coveredUntil,
            futureAmount: getFutureAdvanceAmount(unit, ledger, period),
          },
        ];
      }),
    [ledger, period, units],
  );
  const visible = tenants.filter((tenant) => filter === "all" || tenant.monthsCovered >= filter);
  const runningOut = tenants.filter(
    (tenant) => tenant.futureMonths > 0 && tenant.futureMonths <= 1,
  );
  const futureMonths = tenants.reduce((sum, tenant) => sum + tenant.futureMonths, 0);
  const futureAmount = tenants.reduce((sum, tenant) => sum + tenant.futureAmount, 0);

  return (
    <div className="space-y-7">
      <PageHeading eyebrow="TEAL · RENT PAID AHEAD" title="Advance">
        <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary-deep">
          <BadgeDollarSign className="size-6" aria-hidden />
        </span>
      </PageHeading>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Advance rent summary">
        <SummaryCard
          icon={BadgeDollarSign}
          label="Tenants ahead"
          value={String(tenants.length)}
          detail="With 2+ fully covered months"
        />
        <SummaryCard
          icon={WalletCards}
          label="Advance held"
          value={formatUGX(futureAmount)}
          detail="Future rent received, excluding this month"
        />
        <SummaryCard
          icon={CalendarClock}
          label="Income secured"
          value={`${futureMonths} months`}
          detail="Future rent months fully covered"
        />
      </section>

      <section className="surface overflow-hidden border-l-4 border-l-primary">
        <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-eyebrow text-primary">Running out soon</p>
            <h2 className="mt-1 text-lg font-bold">Only one future month covered</h2>
          </div>
          <span className="figure text-sm font-semibold text-muted-foreground">
            {runningOut.length} {runningOut.length === 1 ? "tenant" : "tenants"}
          </span>
        </div>
        {runningOut.length === 0 ? (
          <p className="border-t border-border px-5 py-5 text-sm text-muted-foreground sm:px-6">
            No advance coverage is due to run out soon.
          </p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {runningOut.map((tenant) => (
              <li
                key={tenant.unit.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div>
                  <p className="font-semibold">{tenant.unit.tenant}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Unit {tenant.unit.unit} · covered through{" "}
                    {formatCoveredUntil(tenant.coveredUntil)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={reminded.includes(tenant.unit.id)}
                  onClick={() => onRemind(tenant.unit, tenant.coveredUntil)}
                >
                  <BellRing />
                  {reminded.includes(tenant.unit.id) ? "Reminder sent" : "Send reminder"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-eyebrow text-primary">Coverage by tenant</p>
            <h2 className="mt-1 text-xl font-bold">Advance rent ledger</h2>
          </div>
          <div
            className="flex gap-1 overflow-x-auto rounded-full bg-muted p-1"
            role="tablist"
            aria-label="Filter advance months"
          >
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={cn(
                  "min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                  filter === item.value
                    ? "bg-card text-primary-deep shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="surface mt-4 overflow-hidden">
          {visible.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-semibold">No tenants match this advance filter</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Advance appears here when at least two rent months are fully covered.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="border-b border-border bg-primary-soft/50 text-left text-xs font-semibold uppercase tracking-wide text-primary-deep">
                    <th className="px-5 py-3">Tenant / unit</th>
                    <th className="px-5 py-3">Months covered</th>
                    <th className="px-5 py-3">Covered until</th>
                    <th className="px-5 py-3 text-right">Future advance</th>
                    <th className="px-5 py-3">Band</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((tenant) => (
                    <tr key={tenant.unit.id} className="transition-colors hover:bg-primary-soft/30">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{tenant.unit.tenant}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Unit {tenant.unit.unit} · {tenant.unit.property}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="figure font-semibold">{tenant.monthsCovered} months</span>
                      </td>
                      <td className="px-5 py-4">{formatCoveredUntil(tenant.coveredUntil)}</td>
                      <td className="figure px-5 py-4 text-right font-semibold">
                        {formatUGX(tenant.futureAmount)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-deep">
                          {tenant.monthsCovered >= 6
                            ? "6+"
                            : tenant.monthsCovered >= 3
                              ? "3+"
                              : "2+"}
                          <ArrowUpRight className="size-3" aria-hidden />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-primary/15 bg-primary-soft/60 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary-deep">
        <Icon className="size-4" aria-hidden />
        {label}
      </div>
      <p className="figure mt-4 text-2xl font-bold text-primary-deep">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}
