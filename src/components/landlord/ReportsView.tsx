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
import { formatUGX, getRentStatus } from "@/lib/rent";
import { downloadCsv } from "@/lib/documents";
import type { LedgerEntry, Unit } from "@/lib/sample-data";

type ReportType = "all" | "overdue" | "vacant" | "collection";

export function ReportsView({ units, ledger }: { units: Unit[]; ledger: LedgerEntry[] }) {
  const [report, setReport] = useState<ReportType>("all");
  const [property, setProperty] = useState("all");
  const [query, setQuery] = useState("");
  const properties = [...new Set(units.map((unit) => unit.property))];

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
            getRentStatus(unit.daysUntilDue, unit.paid) === "overdue") ||
          report === "collection";
        return matchesProperty && matchesQuery && matchesReport;
      }),
    [property, query, report, units],
  );
  const selectedLedger = ledger.filter((entry) => {
    const unit = units.find((item) => item.unit === entry.unit && item.tenant === entry.tenant);
    const matchesProperty = property === "all" || unit?.property === property;
    const matchesQuery = [entry.unit, entry.tenant].some((value) =>
      value.toLowerCase().includes(query.trim().toLowerCase()),
    );
    return matchesProperty && matchesQuery;
  });
  const expected = scopedUnits.reduce((total, unit) => total + unit.rent, 0);
  const rows = report === "collection" ? selectedLedger.length : scopedUnits.length;

  function exportReport() {
    if (report === "collection") {
      downloadCsv("propatiz-rent-collection.csv", [
        ["Date", "Tenant", "Property", "Unit", "Amount (UGX)", "Method", "Reference", "Status"],
        ...selectedLedger.map((entry) => {
          const unit = units.find(
            (item) => item.unit === entry.unit && item.tenant === entry.tenant,
          );
          return [
            entry.date,
            entry.tenant,
            unit?.property ?? "",
            entry.unit,
            entry.amount,
            entry.method,
            entry.reference,
            entry.status,
          ];
        }),
      ]);
    } else {
      downloadCsv(`propatiz-${report}-units.csv`, [
        [
          "Property",
          "Unit",
          "Tenant",
          "Status",
          "Monthly rent (UGX)",
          "Rent due",
          "Occupants",
          "Occupation",
        ],
        ...scopedUnits.map((unit) => [
          unit.property,
          unit.unit,
          unit.tenant ?? "",
          unit.tenant
            ? unit.paid
              ? "Paid"
              : getRentStatus(unit.daysUntilDue, unit.paid)
            : "Vacant",
          unit.rent,
          unit.tenant
            ? unit.daysUntilDue < 0
              ? `${Math.abs(unit.daysUntilDue)} days overdue`
              : `${unit.daysUntilDue} days`
            : "",
          unit.occupants ?? "",
          unit.occupation ?? "",
        ]),
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

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Matching records" value={rows.toLocaleString("en-UG")} />
        <SummaryCard label="Expected rent for selection" value={formatUGX(expected)} />
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
              <th className="px-5 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {report === "collection"
              ? selectedLedger.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-3">
                      {units.find(
                        (unit) => unit.unit === entry.unit && unit.tenant === entry.tenant,
                      )?.property ?? "—"}{" "}
                      · {entry.unit}
                    </td>
                    <td className="px-5 py-3">{entry.tenant}</td>
                    <td className="px-5 py-3">
                      {entry.status} · {entry.method}
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
                      {unit.tenant
                        ? unit.paid
                          ? "Paid"
                          : getRentStatus(unit.daysUntilDue, unit.paid)
                        : "Vacant"}
                    </td>
                    <td className="figure px-5 py-3 text-right font-semibold">
                      {formatUGX(unit.rent)}
                    </td>
                  </tr>
                ))}
            {rows === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
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
