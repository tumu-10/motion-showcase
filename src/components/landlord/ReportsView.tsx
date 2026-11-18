import { Download, FileBarChart2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeading } from "@/components/shared/DashShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatUGX } from "@/lib/rent";
import { downloadCsv } from "@/lib/documents";
import {
  currentRentPeriod,
  addRentPeriodMonths,
  formatRentPeriod,
  formatRentPeriodRange,
  getUnitAdvanceMonths,
  getUnitPeriodCredit,
  getUnitRentStatus,
  summarizeRentPeriod,
} from "@/lib/rent-accounting";
import type { LedgerEntry, Unit } from "@/lib/sample-data";
import type { RentCollectionSummary } from "@/lib/rent-accounting";

type ReportType = "all" | "overdue" | "vacant" | "collection" | "advance";

export function ReportsView({ units, ledger }: { units: Unit[]; ledger: LedgerEntry[] }) {
  const [report, setReport] = useState<ReportType>("all");
  const [property, setProperty] = useState("all");
  const [query, setQuery] = useState("");
  const properties = [...new Set(units.map((unit) => unit.property))];
  const period = currentRentPeriod();

  const scopedUnits = useMemo(
    () =>
      units.filter((unit) => {
        const matchesProperty = property === "all" || unit.property === property;
        const matchesQuery = [unit.unit, unit.tenant ?? "", unit.property].some((value) =>
          value.toLowerCase().includes(query.trim().toLowerCase()),
        );
        const matchesReport =
          report === "all" ||
          (report === "vacant" && !unit.tenant) ||
          (report === "overdue" &&
            !!unit.tenant &&
            getUnitRentStatus(unit, ledger, period) === "Overdue") ||
          (report === "advance" && getUnitRentStatus(unit, ledger, period) === "Advance") ||
          report === "collection";
        return matchesProperty && matchesQuery && matchesReport;
      }),
    [ledger, period, property, query, report, units],
  );
  const selectedLedger = ledger.filter((entry) => {
    const unit = units.find((item) => item.id === entry.unitId && item.tenant === entry.tenant);
    const matchesProperty = property === "all" || unit?.property === property;
    const matchesQuery = [entry.unit, entry.tenant].some((value) =>
      value.toLowerCase().includes(query.trim().toLowerCase()),
    );
    return matchesProperty && matchesQuery;
  });
  const summaryLedger = selectedLedger.filter((entry) =>
    scopedUnits.some((unit) => unit.id === entry.unitId && unit.tenant === entry.tenant),
  );
  const summary = summarizeRentPeriod(scopedUnits, summaryLedger, period);
  const rows = report === "collection" ? selectedLedger.length : scopedUnits.length;

  function exportReport() {
    if (report === "collection") {
      downloadCsv("propatiz-rent-collection.csv", [
        [
          "Date",
          "Tenant",
          "Property",
          "Unit",
          "Amount (UGX)",
          "Rent period",
          "Months covered",
          "Method",
          "Reference",
          "Status",
        ],
        ...selectedLedger.map((entry) => {
          const unit = units.find((item) => item.id === entry.unitId);
          return [
            entry.date,
            entry.tenant,
            unit?.property ?? "",
            entry.unit,
            entry.amount,
            entry.rentPeriod,
            entry.monthsCovered,
            entry.method,
            entry.reference,
            entry.status,
          ];
        }),
        ...reportSummaryRows(summary, period),
      ]);
    } else {
      downloadCsv(`propatiz-${report}-units.csv`, [
        [
          "Property",
          "Unit",
          "Tenant",
          "Status",
          "Monthly rent (UGX)",
          "Rent paid through",
          "Rent due",
          "Occupants",
          "Occupation",
        ],
        ...scopedUnits.map((unit) => [
          unit.property,
          unit.unit,
          unit.tenant ?? "",
          unit.tenant ? getUnitRentStatus(unit, ledger, period) : "Vacant",
          unit.rent,
          unit.tenant && getUnitPeriodCredit(unit, ledger, period) >= unit.rent
            ? formatRentPeriod(
                addRentPeriodMonths(period, getUnitAdvanceMonths(unit, ledger, period)),
              )
            : "",
          rentDueLabel(unit, ledger, period),
          unit.occupants ?? "",
          unit.occupation ?? "",
        ]),
        ...reportSummaryRows(summary, period),
      ]);
    }
    toast.success("Report downloaded", {
      description: `${rows} records included in the CSV file.`,
    });
  }

  return (
    <>
      <PageHeading eyebrow="Filter by portfolio and download only what you need" title="Reports">
        <Button onClick={exportReport} disabled={rows === 0}>
          <Download /> Download CSV
        </Button>
      </PageHeading>

      <section className="surface grid gap-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <FileBarChart2 className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-bold">Build a property report</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a report, filter by property or unit, then export a CSV for your records.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select value={report} onValueChange={(value) => setReport(value as ReportType)}>
            <SelectTrigger aria-label="Report type" className="h-12 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All units</SelectItem>
              <SelectItem value="overdue">Tenants overdue</SelectItem>
              <SelectItem value="vacant">Vacant units</SelectItem>
              <SelectItem value="collection">Rent collection</SelectItem>
              <SelectItem value="advance">Tenants in advance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={property} onValueChange={setProperty}>
            <SelectTrigger aria-label="Filter by property" className="h-12 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {properties.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by unit or tenant"
            aria-label="Filter by unit or tenant"
          />
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Matching records" value={rows.toLocaleString("en-UG")} />
        <SummaryCard label="Collected rent so far" value={formatUGX(summary.collectedForPeriod)} />
        <SummaryCard
          label="Cash received this month"
          value={formatUGX(summary.collectedThisMonth)}
        />
        <SummaryCard
          label="Expected rent · all occupied units"
          value={formatUGX(summary.grossExpected)}
        />
        <SummaryCard label="Advance-covered rent" value={formatUGX(summary.advanceCovered)} />
        <SummaryCard
          label="Future advance received"
          value={formatUGX(summary.futureAdvanceReceived)}
        />
        <SummaryCard
          label="Expected after advances"
          value={formatUGX(summary.expectedAfterAdvances)}
        />
        <SummaryCard label="Remaining balance" value={formatUGX(summary.balanceRemaining)} />
        <SummaryCard
          label="Tenants expected to pay this month"
          value={summary.expectedTenants.toLocaleString("en-UG")}
        />
        <SummaryCard
          label="Tenants in advance · excluded above"
          value={summary.advanceTenants.toLocaleString("en-UG")}
        />
        <SummaryCard
          label="Overdue tenants"
          value={summary.overdueTenants.toLocaleString("en-UG")}
        />
        <SummaryCard
          label="Vacant units"
          value={scopedUnits.filter((unit) => !unit.tenant).length.toString()}
        />
      </section>

      <div className="surface mt-5 overflow-x-auto">
        <table className="w-full min-w-[42rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3">Property / unit</th>
              <th className="px-5 py-3">Tenant</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Rent coverage</th>
              <th className="px-5 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {report === "collection"
              ? selectedLedger.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-3">
                      {units.find((unit) => unit.id === entry.unitId)?.property ?? "—"} ·{" "}
                      {entry.unit}
                    </td>
                    <td className="px-5 py-3">{entry.tenant}</td>
                    <td className="px-5 py-3">
                      {entry.status} · {entry.method}
                    </td>
                    <td className="px-5 py-3">
                      {formatRentPeriodRange(entry.rentPeriod, entry.monthsCovered)}
                    </td>
                    <td className="figure px-5 py-3 text-right font-semibold">
                      {formatUGX(entry.amount)}
                    </td>
                  </tr>
                ))
              : scopedUnits.map((unit) => (
                  <tr key={unit.id}>
                    <td className="px-5 py-3">
                      {unit.property} · {unit.unit}
                    </td>
                    <td className="px-5 py-3">{unit.tenant ?? "—"}</td>
                    <td className="px-5 py-3">
                      {getUnitRentStatus(unit, ledger, period)}
                      {getUnitAdvanceMonths(unit, ledger, period) > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {getUnitAdvanceMonths(unit, ledger, period)} months ahead
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {getUnitRentStatus(unit, ledger, period) === "Advance"
                        ? getUnitAdvanceMonths(unit, ledger, period) > 0
                          ? `Through ${formatRentPeriod(
                              addRentPeriodMonths(
                                period,
                                getUnitAdvanceMonths(unit, ledger, period),
                              ),
                            )}`
                          : `Paid early for ${formatRentPeriod(period)}`
                        : "—"}
                    </td>
                    <td className="figure px-5 py-3 text-right font-semibold">
                      {formatUGX(unit.rent)}
                    </td>
                  </tr>
                ))}
            {rows === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  No records match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="figure mt-2 text-xl font-bold text-primary-deep">{value}</p>
    </div>
  );
}

function reportSummaryRows(summary: RentCollectionSummary, period: string) {
  return [
    [],
    ["Report summary", formatRentPeriod(period)],
    ["Expected rent · all occupied units", summary.grossExpected],
    ["Advance-covered rent", summary.advanceCovered],
    ["Expected rent after advances", summary.expectedAfterAdvances],
    ["Collected rent for this period", summary.collectedForPeriod],
    ["Cash received this month", summary.collectedThisMonth],
    ["Future advance received", summary.futureAdvanceReceived],
    ["Remaining balance", summary.balanceRemaining],
    ["Tenants expected to pay this month", summary.expectedTenants],
    ["Tenants in advance · excluded from expected tenants", summary.advanceTenants],
    ["Overdue tenants", summary.overdueTenants],
  ];
}

function rentDueLabel(unit: Unit, ledger: LedgerEntry[], period: string) {
  if (!unit.tenant) return "";
  const status = getUnitRentStatus(unit, ledger, period);
  if (status === "Advance") {
    const advanceMonths = getUnitAdvanceMonths(unit, ledger, period);
    return advanceMonths > 0
      ? `Paid through ${formatRentPeriod(addRentPeriodMonths(period, advanceMonths))}`
      : `Paid early for ${formatRentPeriod(period)}`;
  }
  if (status === "Paid") return `Paid for ${formatRentPeriod(period)}`;
  if (status === "Overdue") {
    const remaining = unit.rent - getUnitPeriodCredit(unit, ledger, period);
    return `${Math.abs(unit.daysUntilDue)} days overdue${
      remaining < unit.rent ? ` · ${formatUGX(remaining)} remaining` : ""
    }`;
  }
  if (status === "Partially paid")
    return `${formatUGX(unit.rent - getUnitPeriodCredit(unit, ledger, period))} remaining`;
  return `Due in ${unit.daysUntilDue} days`;
}
