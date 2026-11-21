import { Download, FileBarChart2, FileSpreadsheet, FileText } from "lucide-react";
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
import { downloadCsv } from "@/lib/documents";
import { buildReportPdf } from "@/lib/report-pdf";
import { downloadExcelReport, downloadReportBlob, getReportExportRows } from "@/lib/report-exports";
import { getReceiptBranding } from "@/lib/receipt-branding";
import {
  buildReportModel,
  reportChoices,
  type ReportKind,
  type ReportSources,
} from "@/lib/reports";
import { localDateIso } from "@/lib/rent-accounting";

function currentYearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

function reportSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ReportsView({
  initialReport,
  ...sources
}: ReportSources & { initialReport?: ReportKind }) {
  const [report, setReport] = useState<ReportKind>(initialReport ?? "monthly-collection");
  const [fromDate, setFromDate] = useState(currentYearStart);
  const [toDate, setToDate] = useState(localDateIso);
  const [property, setProperty] = useState("all");
  const [block, setBlock] = useState("all");
  const [tenantId, setTenantId] = useState("all");
  const [pdfBusy, setPdfBusy] = useState(false);
  const properties = [...new Set(sources.units.map((unit) => unit.property))];
  const blocks = [
    ...new Set(
      sources.units
        .filter((unit) => property === "all" || unit.property === property)
        .map((unit) => unit.block)
        .filter((name): name is string => !!name),
    ),
  ];
  const tenants = sources.units.filter(
    (unit) =>
      unit.tenant &&
      (property === "all" || unit.property === property) &&
      (block === "all" || unit.block === block),
  );
  const model = useMemo(
    () =>
      buildReportModel(sources, {
        kind: report,
        fromDate,
        toDate,
        property,
        block,
        tenantId,
      }),
    [sources, report, fromDate, toDate, property, block, tenantId],
  );
  const exportRows = getReportExportRows(model);
  const canExport = model.headers.length > 0;
  const filename = `propatiz-${reportSlug(model.title)}`;

  function exportCsv() {
    downloadCsv(
      `${filename}.csv`,
      exportRows.map((row) => row.cells),
    );
    toast.success("CSV report downloaded");
  }

  function exportExcel() {
    downloadExcelReport(model, `${filename}.xls`);
    toast.success("Excel report downloaded");
  }

  async function exportPdf() {
    setPdfBusy(true);
    try {
      const bytes = await buildReportPdf(model, getReceiptBranding());
      downloadReportBlob(
        new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }),
        `${filename}.pdf`,
      );
      toast.success("PDF report downloaded");
    } catch (error) {
      toast.error("Could not create the PDF report", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <>
      <PageHeading eyebrow="Portfolio reporting and records" title="Reports">
        <Button variant="outline" onClick={exportCsv} disabled={!canExport}>
          <Download /> CSV
        </Button>
        <Button variant="outline" onClick={exportExcel} disabled={!canExport}>
          <FileSpreadsheet /> Excel
        </Button>
        <Button onClick={() => void exportPdf()} disabled={!canExport || pdfBusy}>
          <FileText /> {pdfBusy ? "Preparing…" : "Premium PDF"}
        </Button>
      </PageHeading>

      <section className="surface grid gap-4 p-4 sm:p-5" aria-label="Report filters">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <FileBarChart2 className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-bold">Choose a report</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter the portfolio and date range before reviewing or exporting.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Select value={report} onValueChange={(value) => setReport(value as ReportKind)}>
            <SelectTrigger aria-label="Report type" className="h-12 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reportChoices.map((choice) => (
                <SelectItem key={choice.value} value={choice.value}>
                  {choice.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            From date
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              aria-label="Report from date"
              className="h-12"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            To date
            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              aria-label="Report to date"
              className="h-12"
            />
          </label>
          <Select
            value={property}
            onValueChange={(value) => {
              setProperty(value);
              setBlock("all");
              setTenantId("all");
            }}
          >
            <SelectTrigger aria-label="Filter reports by property" className="h-12 bg-card">
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
          <Select
            value={block}
            onValueChange={(value) => {
              setBlock(value);
              setTenantId("all");
            }}
          >
            <SelectTrigger aria-label="Filter reports by block" className="h-12 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All blocks</SelectItem>
              {blocks.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {report === "tenant-statement" && (
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger aria-label="Filter statement by tenant" className="h-12 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tenants</SelectItem>
                {tenants.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.tenant} · {unit.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </section>

      <section className="mt-5 space-y-4" aria-labelledby="what-matters-heading">
        <div>
          <p className="text-eyebrow text-primary">Report · {model.range}</p>
          <h2 id="what-matters-heading" className="mt-1 text-xl font-bold text-primary-deep">
            What matters
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {model.metrics.map((metric) => (
            <article key={metric.label} className="surface min-w-0 p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="figure mt-2 break-words text-xl font-bold text-primary-deep">
                {metric.value}
              </p>
            </article>
          ))}
        </div>
        <div className="surface space-y-2 p-4 sm:p-5">
          {model.summary.map((sentence, index) => (
            <p key={index} className="text-sm leading-6 text-muted-foreground">
              {sentence}
            </p>
          ))}
        </div>
      </section>

      <section className="surface mt-5 overflow-hidden" aria-labelledby="report-details-heading">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 id="report-details-heading" className="font-bold">
            {model.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {model.rows.length.toLocaleString("en-UG")} matching{" "}
            {model.rows.length === 1 ? "record" : "records"}
          </p>
        </div>
        {model.rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No records match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {model.headers.map((header) => (
                    <th key={header} className="whitespace-nowrap px-4 py-3">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {model.rows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.warning
                        ? "bg-destructive-soft/60 text-destructive-ink"
                        : "transition-colors hover:bg-secondary/60"
                    }
                  >
                    {model.headers.map((header, index) => (
                      <td key={`${row.id}-${header}`} className="max-w-72 px-4 py-3 align-top">
                        {row.cells[index] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface mt-5 p-4 sm:p-5" aria-labelledby="report-notes-heading">
        <h2 id="report-notes-heading" className="font-bold">
          Notes
        </h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          {model.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
