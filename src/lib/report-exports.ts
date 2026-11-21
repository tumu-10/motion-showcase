import type { ReportModel } from "@/lib/reports";

type ExportRow = { cells: string[]; style?: "title" | "section" | "warning" };

export function getReportExportRows(model: ReportModel): ExportRow[] {
  const rows: ExportRow[] = [
    { cells: [model.title], style: "title" },
    { cells: ["Date range", model.range] },
    { cells: [] },
    { cells: ["What matters"], style: "section" },
    ...model.metrics.map((metric) => ({ cells: [metric.label, metric.value] })),
    ...model.summary.map((sentence) => ({ cells: [sentence] })),
    { cells: [] },
    { cells: ["Report details"], style: "section" },
    ...(model.headers.length ? [{ cells: model.headers, style: "section" as const }] : []),
    ...model.rows.map((row) => ({
      cells: row.cells,
      style: row.warning ? ("warning" as const) : undefined,
    })),
    { cells: [] },
    { cells: ["Notes"], style: "section" },
    ...model.notes.map((note) => ({ cells: [note] })),
  ];
  return rows;
}

export function downloadExcelReport(model: ReportModel, filename: string) {
  const rows = getReportExportRows(model);
  const xmlRows = rows
    .map(
      (row) =>
        `<Row>${row.cells
          .map(
            (cell) =>
              `<Cell${row.style ? ` ss:StyleID="${row.style}"` : ""}><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`,
          )
          .join("")}</Row>`,
    )
    .join("");
  const workbook = `<?xml version="1.0"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:html="http://www.w3.org/TR/REC-html40">
      <Styles>
        <Style ss:ID="title"><Font ss:Bold="1" ss:Size="16" ss:Color="#1F3D30"/></Style>
        <Style ss:ID="section"><Font ss:Bold="1" ss:Color="#1F3D30"/></Style>
        <Style ss:ID="warning"><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/><Font ss:Color="#B91C1C"/></Style>
      </Styles>
      <Worksheet ss:Name="Propatiz Report"><Table>${xmlRows}</Table></Worksheet>
    </Workbook>`;
  downloadBlob(new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" }), filename);
}

export function downloadReportBlob(blob: Blob, filename: string) {
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character] ?? character;
  });
}
