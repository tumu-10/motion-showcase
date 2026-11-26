import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PageHeading } from "@/components/shared/DashShell";
import { Pill, type Tone } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { ease } from "@/lib/motion";
import { dataSource } from "@/lib/data-source";
import type { Complaint, ComplaintStage } from "@/lib/sample-data";

const stageTone: Record<ComplaintStage, Tone> = {
  submitted: "neutral",
  assigned: "info",
  "in-progress": "warning",
  resolved: "success",
};

const nextAction: Record<ComplaintStage, string> = {
  submitted: "Review complaint",
  assigned: "Send response",
  "in-progress": "Mark resolved",
  resolved: "",
};

const filterStyles: Record<"open" | ComplaintStage, string> = {
  open: "border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-300 hover:bg-rose-100",
  submitted: "border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-300 hover:bg-sky-100",
  assigned:
    "border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-300 hover:bg-violet-100",
  "in-progress":
    "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 hover:bg-amber-100",
  resolved:
    "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100",
};

const categoryStyles: Record<string, string> = {
  Plumbing: "bg-sky-100 text-sky-800",
  Electrical: "bg-amber-100 text-amber-900",
  Security: "bg-violet-100 text-violet-900",
  Water: "bg-cyan-100 text-cyan-900",
  Other: "bg-slate-100 text-slate-700",
};

export function ComplaintsView({
  requests,
  onAdvance,
}: {
  requests: Complaint[];
  onAdvance: (id: string) => void;
}) {
  const { stageLabel, stageOrder } = dataSource;
  const [filter, setFilter] = useState<"open" | ComplaintStage>("open");
  const rows = requests.filter((r) =>
    filter === "open" ? r.stage !== "resolved" : r.stage === filter,
  );
  const count = (s: "open" | ComplaintStage) =>
    requests.filter((r) => (s === "open" ? r.stage !== "resolved" : r.stage === s)).length;

  return (
    <>
      <PageHeading eyebrow="Reports from tenants" title="Complaints" />

      <div className="grid gap-3 sm:grid-cols-5" role="tablist" aria-label="Filter complaints">
        {(["open", ...stageOrder] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={filter === s}
            onClick={() => setFilter(s)}
            className={`press relative flex min-h-16 items-center justify-between rounded-lg border px-4 text-left shadow-sm transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md motion-reduce:transform-none ${
              filterStyles[s]
            } ${filter === s ? "ring-2 ring-primary ring-offset-2" : ""}`}
          >
            {filter === s && (
              <motion.span
                layoutId="complaint-filter"
                className="absolute inset-0 rounded-lg border-2 border-primary"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="text-sm font-semibold">
              {s === "open" ? "All open" : stageLabel[s]}
            </span>
            <span className="figure text-2xl font-bold text-primary-deep">{count(s)}</span>
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {rows.map((r) => (
            <motion.li
              key={r.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
              transition={{ duration: 0.4, ease: ease.outExpo }}
              className="surface flex flex-col gap-4 p-5 md:flex-row md:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{r.title}</h3>
                  {r.urgency === "Urgent" && <Pill tone="danger" label="Urgent" />}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${
                      categoryStyles[r.category] ?? "bg-primary-soft text-primary-deep"
                    }`}
                  >
                    {r.category}
                  </span>
                  <span>
                    {r.unit}, {r.property} · {r.tenant} · Reported {r.reported}
                  </span>
                </div>
                <p className="mt-2 text-sm">{r.description}</p>
              </div>
              <div className="flex items-center gap-3 md:w-80 md:justify-end">
                <Pill tone={stageTone[r.stage]} label={stageLabel[r.stage]} />
                {r.stage !== "resolved" ? (
                  <Button size="sm" variant="outline" onClick={() => onAdvance(r.id)}>
                    {nextAction[r.stage]} <ArrowRight />
                  </Button>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-success-ink">
                    <CheckCircle2 className="size-4" aria-hidden /> Tenant notified
                  </span>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {rows.length === 0 && (
        <div className="surface px-6 py-16 text-center">
          <p className="font-semibold">Nothing here</p>
          <p className="mt-1 text-sm text-muted-foreground">No complaints are at this stage.</p>
        </div>
      )}
    </>
  );
}
