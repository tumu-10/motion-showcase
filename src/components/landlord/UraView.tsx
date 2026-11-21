import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeading } from "@/components/shared/DashShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatUGX } from "@/lib/rent";
import { INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX, RENTAL_TAX_RATE_INDIVIDUAL } from "@/lib/legal";
import { estimateRentalTax } from "@/lib/reports";
import type { Unit } from "@/lib/sample-data";

const checklistKey = "propatiz-demo-ura-checklist";
const checklistItems = [
  {
    id: "tin",
    title: "Get a TIN",
    detail: "Confirm the correct landlord entity and tax identification details.",
  },
  {
    id: "rental-tax",
    title: "Register for rental tax",
    detail: "Confirm the applicable tax registration with URA or a qualified adviser.",
  },
  {
    id: "efris",
    title: "Complete EFRIS enrolment",
    detail: "Check whether your entity is required to enrol and issue fiscal documents.",
  },
  {
    id: "instalments",
    title: "Track quarterly instalments",
    detail: "Confirm instalment amounts and due dates with URA; these are not calculated here.",
  },
] as const;

type ChecklistState = Record<(typeof checklistItems)[number]["id"], boolean>;

const emptyChecklist: ChecklistState = {
  tin: false,
  "rental-tax": false,
  efris: false,
  instalments: false,
};

export function UraView({
  units,
  onOpenTaxPack,
  onOpenEfris,
}: {
  units: Unit[];
  onOpenTaxPack: () => void;
  onOpenEfris: () => void;
}) {
  const [checklist, setChecklist] = useState<ChecklistState>(emptyChecklist);
  const occupiedUnits = useMemo(() => units.filter((unit) => unit.tenant), [units]);
  const annualGross = occupiedUnits.reduce((sum, unit) => sum + unit.rent * 12, 0);
  const estimate = estimateRentalTax(annualGross);
  const completedCount = Object.values(checklist).filter(Boolean).length;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(checklistKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          checklistItems.every(
            (item) => typeof (parsed as Record<string, unknown>)[item.id] === "boolean",
          )
        ) {
          setChecklist(parsed as ChecklistState);
        } else {
          throw new Error("The saved URA checklist has an invalid shape.");
        }
      }
    } catch (error) {
      console.error("Could not load URA checklist.", error);
      toast.error("Saved URA checklist could not be loaded.");
    }
  }, []);

  const toggleChecklistItem = (id: keyof ChecklistState, checked: boolean) => {
    const updated = { ...checklist, [id]: checked };
    try {
      localStorage.setItem(checklistKey, JSON.stringify(updated));
      setChecklist(updated);
    } catch (error) {
      console.error("Could not save URA checklist.", error);
      toast.error("URA checklist progress could not be saved.");
    }
  };

  return (
    <section className="space-y-6">
      <PageHeading eyebrow="Uganda Revenue Authority" title="URA tax pack">
        <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={onOpenEfris}>
          EFRIS setup <ArrowRight className="size-4" aria-hidden />
        </Button>
      </PageHeading>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Annualized gross rent" value={formatUGX(estimate.annualGrossIncome)} />
        <MetricCard label="Exemption applied" value={formatUGX(estimate.exemptIncome)} />
        <MetricCard label="Taxable above exemption" value={formatUGX(estimate.taxableIncome)} />
        <MetricCard label="Estimated tax · estimate" value={formatUGX(estimate.estimatedTax)} />
      </div>

      <section className="surface grid gap-5 p-5 sm:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)] sm:p-6">
        <div>
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <FileText className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-bold text-primary-deep">Rental income estimate</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The demo estimates individual rental tax as {RENTAL_TAX_RATE_INDIVIDUAL * 100}% of
                annual rental income above the {formatUGX(INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX)}{" "}
                exemption. Refundable security deposits are excluded.
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-muted/40 p-4">
            <p className="font-semibold">Calculation</p>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              max(0, {formatUGX(annualGross)} − {formatUGX(INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX)}) ×{" "}
              {RENTAL_TAX_RATE_INDIVIDUAL * 100}%
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Based on current occupied-unit rent annualized for 12 months. It does not reconstruct
              historical occupancy or rent changes and is not a tax filing or professional advice.
              Company tax treatment may differ.
            </p>
          </div>
          <Button className="mt-4 min-h-11 w-full sm:w-auto" onClick={onOpenTaxPack}>
            Open annual income report <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
        <aside className="rounded-xl border border-primary/15 bg-primary-soft/50 p-4">
          <p className="text-sm font-bold text-primary-deep">Income included</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {occupiedUnits.length} occupied {occupiedUnits.length === 1 ? "unit" : "units"} ·{" "}
            {formatUGX(occupiedUnits.reduce((sum, unit) => sum + unit.rent, 0))} monthly
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Vacant units and refundable deposits are not counted as rental income in this estimate.
            Confirm the applicable tax rules and filing position with URA or an accountant.
          </p>
        </aside>
      </section>

      <section className="surface space-y-4 p-5 sm:p-6" aria-labelledby="ura-checklist-title">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-success-soft text-success-ink">
            <CalendarCheck className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="ura-checklist-title" className="text-lg font-bold text-primary-deep">
              Landlord compliance checklist
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {completedCount} of {checklistItems.length} steps marked complete. Confirm
              requirements and deadlines with URA.
            </p>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {checklistItems.map((item) => (
            <li key={item.id} className="rounded-xl border border-border">
              <label
                htmlFor={`ura-check-${item.id}`}
                className="flex min-h-20 cursor-pointer items-start gap-3 p-4"
              >
                <Checkbox
                  id={`ura-check-${item.id}`}
                  checked={checklist[item.id]}
                  onCheckedChange={(checked) => toggleChecklistItem(item.id, checked === true)}
                  className="mt-0.5 size-6 shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-semibold">{item.title}</span>
                  <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </label>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Checklist progress is a local reminder only; it does not register you, submit returns, or
          make payments.
        </p>
      </section>

      <p className="rounded-xl border border-warning/25 bg-warning-soft p-4 text-sm leading-relaxed text-warning-ink">
        Guidance only. This estimate and checklist are not legal or tax advice. Confirm your tax
        treatment, registration status, instalment requirements, and EFRIS obligations with URA or
        an accountant.
      </p>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="surface min-w-0 p-4 sm:p-5">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-xl font-bold text-primary-deep sm:text-2xl">{value}</p>
    </article>
  );
}
