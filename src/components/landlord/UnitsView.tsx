import { FileBarChart2, Search, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { PageHeading } from "@/components/shared/DashShell";
import { Pill, RentStatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatUGX, getRentStatus, type RentStatus } from "@/lib/rent";
import { ease } from "@/lib/motion";
import { properties, type Unit } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

type Filter = "all" | RentStatus | "vacant";
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "due-soon", label: "Due soon" },
  { id: "overdue", label: "Overdue" },
  { id: "vacant", label: "Vacant" },
];

export function unitStatus(u: Unit): RentStatus | "vacant" {
  return u.tenant ? getRentStatus(u.daysUntilDue, u.paid) : "vacant";
}

export function UnitsView({
  units,
  onOpenUnit,
  onAddTenant,
  onOpenReports,
}: {
  units: Unit[];
  onOpenUnit: (u: Unit) => void;
  onAddTenant: () => void;
  onOpenReports: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [property, setProperty] = useState("all");
  const [q, setQ] = useState("");

  const scoped = units.filter((u) => property === "all" || u.property === property);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: scoped.length };
    for (const u of scoped) c[unitStatus(u)] = (c[unitStatus(u)] ?? 0) + 1;
    return c;
  }, [scoped]);

  const rows = scoped.filter((u) => {
    if (filter !== "all" && unitStatus(u) !== filter) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return [u.unit, u.tenant ?? "", u.property].some((v) => v.toLowerCase().includes(term));
  });

  return (
    <>
      <PageHeading
        eyebrow={`${units.length} units across ${properties.length} properties`}
        title="Units"
      >
        <Button variant="outline" onClick={onOpenReports}>
          <FileBarChart2 /> Generate report
        </Button>
        <Button onClick={onAddTenant}>
          <UserPlus /> Add tenant
        </Button>
      </PageHeading>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex gap-1 overflow-x-auto rounded-full bg-muted p-1"
          role="tablist"
          aria-label="Filter by status"
        >
          {filters.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className="relative flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold"
            >
              {filter === f.id && (
                <motion.span
                  layoutId="unit-filter"
                  className="absolute inset-0 rounded-full bg-card shadow-soft"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{f.label}</span>
              <span className="figure relative text-xs text-muted-foreground">
                {counts[f.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Select value={property} onValueChange={setProperty}>
            <SelectTrigger className="h-12 w-48 rounded-full bg-card" aria-label="Property">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 lg:w-64 lg:flex-none">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tenant or unit"
              className="rounded-full pl-10"
              aria-label="Search units"
            />
          </div>
        </div>
      </div>

      <div className="surface mt-6 overflow-hidden">
        <div className="hidden grid-cols-[6rem_1.4fr_1fr_1fr_8rem] gap-4 border-b border-border px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
          <span>Unit</span>
          <span>Tenant</span>
          <span className="text-right">Monthly rent</span>
          <span>Due</span>
          <span>Status</span>
        </div>
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">No units match</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another filter or clear your search.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setFilter("all");
                setQ("");
                setProperty("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {rows.map((u, i) => {
                const st = unitStatus(u);
                return (
                  <motion.li
                    key={u.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                      duration: 0.3,
                      ease: ease.outExpo,
                      delay: Math.min(i, 8) * 0.025,
                    }}
                  >
                    <button
                      onClick={() => onOpenUnit(u)}
                      className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-6 py-4 text-left transition-colors hover:bg-secondary md:grid-cols-[6rem_1.4fr_1fr_1fr_8rem]"
                    >
                      <span className="font-bold">
                        {u.unit}
                        <span className="block text-xs font-medium text-muted-foreground">
                          {u.property}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "order-3 col-span-2 md:order-none md:col-span-1",
                          !u.tenant && "text-muted-foreground",
                        )}
                      >
                        {u.tenant ?? "No tenant"}
                      </span>
                      <span className="figure hidden text-right font-semibold md:block">
                        {formatUGX(u.rent)}
                      </span>
                      <span className="hidden text-sm text-muted-foreground md:block">
                        {!u.tenant
                          ? "-"
                          : u.paid
                            ? "Paid"
                            : u.daysUntilDue < 0
                              ? `${Math.abs(u.daysUntilDue)} days late`
                              : u.daysUntilDue === 0
                                ? "Today"
                                : `In ${u.daysUntilDue} days`}
                      </span>
                      <span className="justify-self-end md:justify-self-start">
                        {st === "vacant" ? (
                          <Pill tone="neutral" label="Vacant" />
                        ) : (
                          <RentStatusPill status={st} />
                        )}
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </>
  );
}
