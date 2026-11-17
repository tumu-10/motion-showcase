import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PageHeading } from "@/components/shared/DashShell";
import { Pill, type Tone } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { ease } from "@/lib/motion";
import { stageLabel, stageOrder, type Complaint, type ComplaintStage } from "@/lib/sample-data";

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

export function ComplaintsView({
  requests,
  onAdvance,
}: {
  requests: Complaint[];
  onAdvance: (id: string) => void;
}) {
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
            className="press relative flex min-h-16 items-center justify-between rounded-lg border border-border bg-card px-4 text-left"
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
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.category} · {r.unit}, {r.property} · {r.tenant} · Reported {r.reported}
                </p>
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
