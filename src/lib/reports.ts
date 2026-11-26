import {
  calculateRefundableDeposit,
  getAdvanceCoverage,
  getFutureAdvanceAmount,
} from "@/lib/tenancy";
import { formatRentPeriod, getUnitPeriodCredit } from "@/lib/rent-accounting";
import { formatUGX } from "@/lib/rent";
import { INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX, RENTAL_TAX_RATE_INDIVIDUAL } from "@/lib/legal";
import type { Complaint, LedgerEntry, TenantNotification, Unit } from "@/lib/sample-data";
import type { DepositLedgerEntry, Tenancy } from "@/lib/tenancy";
import { efrisStatusLabel, type ReceiptRecord } from "@/lib/receipt-branding";

export const reportChoices = [
  { value: "monthly-collection", label: "Monthly collection" },
  { value: "arrears-ageing", label: "Arrears ageing" },
  { value: "advance-register", label: "Advance register" },
  { value: "security-deposits", label: "Security deposit register" },
  { value: "occupancy", label: "Occupancy and vacancy" },
  { value: "tenant-statement", label: "Tenant statement" },
  { value: "repairs", label: "Repairs and costs" },
  { value: "annual-tax", label: "Annual rental income / URA Tax Pack" },
  { value: "efris", label: "EFRIS reconciliation" },
] as const;

export type ReportKind = (typeof reportChoices)[number]["value"];

export type ReportMetric = { label: string; value: string };
export type ReportRow = { id: string; cells: string[]; warning?: boolean };
export type ReportModel = {
  title: string;
  range: string;
  metrics: [ReportMetric, ReportMetric, ReportMetric];
  summary: [string, string, string];
  headers: string[];
  rows: ReportRow[];
  notes: string[];
};

export type ReportSources = {
  units: Unit[];
  ledger: LedgerEntry[];
  deposits: DepositLedgerEntry[];
  notifications: TenantNotification[];
  complaints: Complaint[];
  tenancies: Tenancy[];
  receipts: ReceiptRecord[];
};

export type ReportFilters = {
  kind: ReportKind;
  fromDate: string;
  toDate: string;
  property: string;
  block: string;
  tenantId: string;
};

export function getArrearsAgeingBucket(daysOverdue: number) {
  if (!Number.isFinite(daysOverdue) || daysOverdue <= 0) return null;
  if (daysOverdue <= 7) return "1–7 days";
  if (daysOverdue <= 30) return "8–30 days";
  return "31+ days";
}

export function estimateRentalTax(annualGrossIncome: number) {
  if (!Number.isFinite(annualGrossIncome) || annualGrossIncome < 0) {
    throw new RangeError("Annual rental income must be a non-negative number.");
  }
  const taxableIncome = Math.max(0, annualGrossIncome - INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX);
  return {
    annualGrossIncome,
    exemptIncome: Math.min(annualGrossIncome, INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX),
    taxableIncome,
    estimatedTax: Math.round(taxableIncome * RENTAL_TAX_RATE_INDIVIDUAL),
  };
}

export function buildReportModel(sources: ReportSources, filters: ReportFilters): ReportModel {
  const choice = reportChoices.find((item) => item.value === filters.kind);
  const title = choice?.label ?? "Property report";
  const range = `${formatDate(filters.fromDate)} – ${formatDate(filters.toDate)}`;
  if (
    !isValidDate(filters.fromDate) ||
    !isValidDate(filters.toDate) ||
    filters.fromDate > filters.toDate
  ) {
    return {
      title,
      range,
      metrics: [
        { label: "Report status", value: "Date range" },
        { label: "From date", value: filters.fromDate || "Not set" },
        { label: "To date", value: filters.toDate || "Not set" },
      ],
      summary: [
        "Choose a valid date range to view this report.",
        "The start date must be on or before the end date.",
        "No records are included until the date range is valid.",
      ],
      headers: [],
      rows: [],
      notes: ["Dates are interpreted in the landlord's local calendar."],
    };
  }

  const units = sources.units.filter(
    (unit) =>
      (filters.property === "all" || unit.property === filters.property) &&
      (filters.block === "all" || unit.block === filters.block) &&
      (filters.kind !== "tenant-statement" ||
        filters.tenantId === "all" ||
        unit.id === filters.tenantId),
  );
  const unitIds = new Set(units.map((unit) => unit.id));
  const inRange = (date: string) => date >= filters.fromDate && date <= filters.toDate;
  const payments = sources.ledger.filter(
    (entry) => unitIds.has(entry.unitId) && inRange(entry.receivedAt),
  );
  const period = filters.toDate.slice(0, 7);
  const occupied = units.filter((unit) => unit.tenant);

  switch (filters.kind) {
    case "monthly-collection":
      return monthlyCollectionReport(units, payments, filters, range);
    case "arrears-ageing":
      return arrearsReport(sources, units, filters, range, period);
    case "advance-register":
      return advanceReport(units, sources.ledger, range, period);
    case "security-deposits":
      return depositReport(sources, units, filters, range, period);
    case "occupancy":
      return occupancyReport(units, range, filters.toDate);
    case "tenant-statement":
      return statementReport(sources.tenancies, units, payments, filters, range);
    case "repairs":
      return repairsReport(sources.complaints, units, filters, range);
    case "annual-tax":
      return annualTaxReport(occupied, range, filters.toDate);
    case "efris":
      return efrisReport(sources, units, payments, range);
  }
}

function monthlyCollectionReport(
  units: Unit[],
  payments: LedgerEntry[],
  filters: ReportFilters,
  range: string,
): ReportModel {
  const periods = monthsBetween(filters.fromDate, filters.toDate);
  const rows = periods.flatMap((month) =>
    units
      .filter((unit) => unit.tenant)
      .map((unit) => {
        const collected = payments
          .filter(
            (entry) =>
              entry.unitId === unit.id &&
              entry.status === "Confirmed" &&
              entry.receivedAt.slice(0, 7) === month,
          )
          .reduce((sum, entry) => sum + entry.amount, 0);
        return {
          id: `${month}-${unit.id}`,
          cells: [
            formatRentPeriod(month),
            unit.property,
            unit.block ?? "—",
            unit.unit,
            unit.tenant ?? "—",
            formatUGX(unit.rent),
            formatUGX(collected),
            unit.rent > 0 ? `${Math.round((collected / unit.rent) * 100)}%` : "—",
          ],
        };
      }),
  );
  const expected = units
    .filter((unit) => unit.tenant)
    .reduce((sum, unit) => sum + unit.rent * periods.length, 0);
  const collected = payments
    .filter((entry) => entry.status === "Confirmed")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const collectionRate = expected > 0 ? `${Math.round((collected / expected) * 100)}%` : "—";
  return {
    title: "Monthly collection",
    range,
    metrics: [
      { label: "Expected rent", value: formatUGX(expected) },
      { label: "Cash collected", value: formatUGX(collected) },
      { label: "Collection rate", value: collectionRate },
    ],
    summary: [
      `${formatUGX(expected)} was expected across ${units.filter((unit) => unit.tenant).length} occupied units for ${periods.length} rent ${periods.length === 1 ? "period" : "periods"}.`,
      `Confirmed payments received in this date range total ${formatUGX(collected)}, a cash collection rate of ${collectionRate}.`,
      "Cash collected includes advance payments; the rate can exceed 100% when tenants pay ahead.",
    ],
    headers: [
      "Rent period",
      "Property",
      "Block",
      "Unit",
      "Tenant",
      "Expected",
      "Cash collected",
      "Rate",
    ],
    rows,
    notes: [
      "Expected rent uses each currently occupied unit's monthly rent for every calendar month in the selected range.",
      "The table compares expected and confirmed cash received by rent period, property, and unit; deposits are excluded.",
      "Historic occupancy and rent changes are not currently stored in the demo data.",
    ],
  };
}

function arrearsReport(
  sources: ReportSources,
  units: Unit[],
  filters: ReportFilters,
  range: string,
  period: string,
): ReportModel {
  const rows = units.flatMap((unit) => {
    if (!unit.tenant || unit.daysUntilDue >= 0) return [];
    const balance = Math.max(0, unit.rent - getUnitPeriodCredit(unit, sources.ledger, period));
    const bucket = getArrearsAgeingBucket(Math.abs(unit.daysUntilDue));
    if (balance <= 0 || !bucket) return [];
    const lastReminder = sources.notifications
      .filter(
        (notification) =>
          notification.kind === "rent" &&
          notification.unit === unit.unit &&
          notification.createdAt.slice(0, 10) <= filters.toDate,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return [
      {
        id: unit.id,
        cells: [
          unit.property,
          unit.block ?? "—",
          unit.unit,
          unit.tenant,
          formatUGX(balance),
          String(Math.abs(unit.daysUntilDue)),
          bucket,
          lastReminder ? formatDate(lastReminder.createdAt.slice(0, 10)) : "Not recorded",
        ],
      },
    ];
  });
  const total = rows.reduce((sum, row) => sum + parseUGX(row.cells[4] ?? ""), 0);
  const oldest = rows.reduce((max, row) => Math.max(max, Number(row.cells[5] ?? 0)), 0);
  const bucket31 = rows.filter((row) => row.cells[6] === "31+ days").length;
  return {
    title: "Arrears ageing",
    range,
    metrics: [
      { label: "Overdue balance", value: formatUGX(total) },
      { label: "Tenants overdue", value: String(rows.length) },
      { label: "31+ days overdue", value: String(bucket31) },
    ],
    summary: [
      `${rows.length} tenants have a current overdue balance of ${formatUGX(total)}.`,
      `${bucket31} ${bucket31 === 1 ? "tenant is" : "tenants are"} more than 30 days overdue; the oldest balance is ${oldest} days late.`,
      "The last reminder is the latest rent notification recorded on or before the report end date.",
    ],
    headers: [
      "Property",
      "Block",
      "Unit",
      "Tenant",
      "Balance",
      "Days late",
      "Ageing",
      "Last reminder",
    ],
    rows,
    notes: [
      `Balances are measured against ${formatRentPeriod(period)} rent and confirmed credits.`,
      "Ageing uses the unit's current days-until-due value; historical ageing snapshots are not stored.",
      "A missing reminder means no matching rent notification is recorded.",
    ],
  };
}

function advanceReport(
  units: Unit[],
  ledger: LedgerEntry[],
  range: string,
  period: string,
): ReportModel {
  const rows = units.flatMap((unit) => {
    if (!unit.tenant) return [];
    const coverage = getAdvanceCoverage(unit, ledger, period);
    if (coverage.monthsCovered < 2 || !coverage.coveredUntil) return [];
    return [
      {
        id: unit.id,
        cells: [
          unit.property,
          unit.block ?? "—",
          unit.unit,
          unit.tenant,
          String(coverage.monthsCovered),
          formatRentPeriod(coverage.coveredUntil),
          formatUGX(getFutureAdvanceAmount(unit, ledger, period)),
        ],
      },
    ];
  });
  const future = rows.reduce((sum, row) => sum + parseUGX(row.cells[6] ?? ""), 0);
  const coveredMonths = rows.reduce((sum, row) => sum + Number(row.cells[4] ?? 0), 0);
  return {
    title: "Advance register",
    range,
    metrics: [
      { label: "Tenants 2+ months ahead", value: String(rows.length) },
      { label: "Future rent received", value: formatUGX(future) },
      { label: "Covered months", value: String(coveredMonths) },
    ],
    summary: [
      `${rows.length} tenants have at least two fully covered rent months as of ${formatRentPeriod(period)}.`,
      `${formatUGX(future)} is allocated to future rent periods across ${coveredMonths} covered months.`,
      "Only confirmed payments count toward coverage.",
    ],
    headers: [
      "Property",
      "Block",
      "Unit",
      "Tenant",
      "Months covered",
      "Covered through",
      "Future advance",
    ],
    rows,
    notes: [
      "Coverage is calculated from confirmed payments and their rent periods.",
      "Security deposits are excluded from advance rent.",
    ],
  };
}

function depositReport(
  sources: ReportSources,
  units: Unit[],
  filters: ReportFilters,
  range: string,
  period: string,
): ReportModel {
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const records = sources.deposits.filter(
    (entry) =>
      unitById.has(entry.unitId) &&
      entry.receivedAt >= filters.fromDate &&
      entry.receivedAt <= filters.toDate,
  );
  const rows = records.map((entry) => {
    const unit = unitById.get(entry.unitId);
    const resolved = entry.status === "Refunded" || entry.status === "Partly refunded";
    const held = resolved ? 0 : entry.amount;
    const arrears =
      !resolved && unit?.tenant && unit.daysUntilDue < 0
        ? Math.max(0, unit.rent - getUnitPeriodCredit(unit, sources.ledger, period))
        : entry.arrearsAtRefund;
    const deductions = entry.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
    const pendingDeductions =
      entry.status === "Refund pending" || entry.status === "Disputed" ? deductions : 0;
    return {
      id: entry.id,
      cells: [
        unit?.property ?? "—",
        unit?.block ?? "—",
        entry.unit,
        entry.tenant,
        formatUGX(held),
        formatUGX(calculateRefundableDeposit(held, arrears, deductions)),
        formatUGX(pendingDeductions),
        entry.status,
      ],
    };
  });
  const held = records.reduce(
    (sum, entry) =>
      sum + (entry.status === "Refunded" || entry.status === "Partly refunded" ? 0 : entry.amount),
    0,
  );
  const refundable = rows.reduce((sum, row) => sum + parseUGX(row.cells[5] ?? ""), 0);
  const pending = rows.reduce((sum, row) => sum + parseUGX(row.cells[6] ?? ""), 0);
  return {
    title: "Security deposit register",
    range,
    metrics: [
      { label: "Deposits held", value: formatUGX(held) },
      { label: "Refundable if leaving today", value: formatUGX(refundable) },
      { label: "Deductions pending", value: formatUGX(pending) },
    ],
    summary: [
      `${formatUGX(held)} is currently held in refundable security deposits.`,
      `After current arrears and logged deductions, ${formatUGX(refundable)} is refundable if tenants leave today.`,
      `${formatUGX(pending)} in deductions is awaiting a tenant response.`,
    ],
    headers: [
      "Property",
      "Block",
      "Unit",
      "Tenant",
      "Held",
      "Refundable today",
      "Deductions pending",
      "Status",
    ],
    rows,
    notes: [
      "Deposits are held in a separate ledger and are excluded from rental income.",
      "Refundable amounts account for current arrears and recorded deductions.",
    ],
  };
}

function occupancyReport(units: Unit[], range: string, asOfDate: string): ReportModel {
  const occupied = units.filter((unit) => unit.tenant);
  const vacant = units.filter((unit) => !unit.tenant);
  const rows = vacant.map((unit) => {
    const days = unit.vacantSince ? daysBetween(unit.vacantSince, asOfDate) : null;
    return {
      id: unit.id,
      cells: [
        unit.property,
        unit.block ?? "—",
        unit.unit,
        days === null ? "Not recorded" : String(days),
        days === null ? "Not available" : formatUGX((unit.rent * days) / 30),
      ],
    };
  });
  const knownLostIncome = vacant.reduce((sum, unit) => {
    if (!unit.vacantSince) return sum;
    return sum + (unit.rent * daysBetween(unit.vacantSince, asOfDate)) / 30;
  }, 0);
  const occupancyRate =
    units.length > 0 ? `${Math.round((occupied.length / units.length) * 100)}%` : "—";
  const unknownDates = vacant.filter((unit) => !unit.vacantSince).length;
  return {
    title: "Occupancy and vacancy",
    range,
    metrics: [
      { label: "Occupancy rate", value: occupancyRate },
      { label: "Vacant units", value: String(vacant.length) },
      { label: "Estimated lost rent", value: formatUGX(knownLostIncome) },
    ],
    summary: [
      `${occupied.length} of ${units.length} units are occupied, for an occupancy rate of ${occupancyRate}.`,
      `${vacant.length} ${vacant.length === 1 ? "unit is" : "units are"} vacant; known vacancy dates imply ${formatUGX(knownLostIncome)} in estimated lost rent.`,
      unknownDates > 0
        ? `${unknownDates} vacant ${unknownDates === 1 ? "unit has" : "units have"} no recorded vacancy start date.`
        : "All vacant units have a recorded vacancy start date.",
    ],
    headers: ["Property", "Block", "Unit", "Days vacant", "Estimated lost rent"],
    rows,
    notes: [
      `Occupancy is a current snapshot, not an historical snapshot for ${range}.`,
      "Lost rent is a simple 30-day monthly-rent estimate based on recorded vacancy dates.",
      "Missing vacancy dates are not estimated or counted in the lost-rent total.",
    ],
  };
}

function statementReport(
  tenancies: Tenancy[],
  units: Unit[],
  payments: LedgerEntry[],
  filters: ReportFilters,
  range: string,
): ReportModel {
  const events: {
    id: string;
    date: string;
    unitId: string;
    tenant: string;
    debit: number;
    credit: number;
    cells: string[];
  }[] = [];
  const periods = monthsBetween(filters.fromDate, filters.toDate);

  for (const unit of units) {
    if (!unit.tenant) continue;
    const tenancy = tenancies
      .filter(
        (item) =>
          item.unitId === unit.id && item.tenantName === unit.tenant && item.status !== "Ended",
      )
      .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
    const monthlyRent = tenancy?.monthlyRent ?? unit.rent;
    for (const period of periods) {
      if (tenancy?.startDate && period < tenancy.startDate.slice(0, 7)) continue;
      events.push({
        id: `charge-${unit.id}-${period}`,
        date: `${period}-01`,
        unitId: unit.id,
        tenant: unit.tenant,
        debit: monthlyRent,
        credit: 0,
        cells: [
          formatDate(`${period}-01`),
          unit.tenant,
          unit.property,
          `${unit.block ? `${unit.block} · ` : ""}${unit.unit}`,
          `Rent charge · ${period}`,
          formatUGX(monthlyRent),
          "—",
          "Scheduled rent",
        ],
      });
    }
  }

  for (const entry of payments) {
    const unit = units.find((item) => item.id === entry.unitId);
    const confirmedCredit = entry.status === "Confirmed" ? entry.amount : 0;
    events.push({
      id: entry.id,
      date: entry.receivedAt,
      unitId: entry.unitId,
      tenant: entry.tenant,
      debit: 0,
      credit: confirmedCredit,
      cells: [
        formatDate(entry.receivedAt),
        entry.tenant,
        unit?.property ?? "—",
        `${unit?.block ? `${unit.block} · ` : ""}${entry.unit}`,
        `Payment · ${entry.rentPeriod}`,
        "—",
        confirmedCredit ? formatUGX(confirmedCredit) : "—",
        `${entry.status} · ${formatUGX(entry.amount)} · ${entry.method} · ${entry.reference}`,
      ],
    });
  }

  events.sort(
    (a, b) =>
      a.unitId.localeCompare(b.unitId) ||
      a.date.localeCompare(b.date) ||
      Number(b.debit > 0) - Number(a.debit > 0),
  );
  const balances = new Map<string, number>();
  const statementRows = events.map((event) => {
    const key = `${event.unitId}:${event.tenant}`;
    const balance = (balances.get(key) ?? 0) + event.debit - event.credit;
    balances.set(key, balance);
    return {
      id: event.id,
      cells: [...event.cells.slice(0, 7), formatUGX(balance), event.cells[7] ?? ""],
    };
  });
  const confirmed = events.reduce((sum, event) => sum + event.credit, 0);
  const pending = payments
    .filter((entry) => entry.status === "Pending")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const paymentCount = payments.length;
  return {
    title: "Tenant statement",
    range,
    metrics: [
      { label: "Ledger entries", value: String(statementRows.length) },
      { label: "Confirmed credits", value: formatUGX(confirmed) },
      { label: "Pending payments", value: formatUGX(pending) },
    ],
    summary: [
      `${statementRows.length} rent-charge and payment entries are included for the selected properties, tenants, and dates.`,
      `${formatUGX(confirmed)} in confirmed credits are recorded; ${formatUGX(pending)} remains pending.`,
      `${paymentCount} payment records are included; pending and failed payments remain visible but do not reduce balances.`,
    ],
    headers: [
      "Date",
      "Tenant",
      "Property",
      "Unit / block",
      "Entry",
      "Debit",
      "Credit",
      "Balance",
      "Reference / status",
    ],
    rows: statementRows.map(({ id, cells }) => ({ id, cells })),
    notes: [
      "Rent-charge entries are generated from each unit's current monthly rent for calendar months overlapping the selected range.",
      "Opening balances and historic rent changes are not stored; the running balance starts at zero at the beginning of this report.",
      "Deposits are maintained separately and are not included in tenant rent statements.",
    ],
  };
}

function repairsReport(
  complaints: Complaint[],
  units: Unit[],
  filters: ReportFilters,
  range: string,
): ReportModel {
  const properties = new Set(units.map((unit) => unit.property));
  const tickets = complaints.filter(
    (complaint) =>
      properties.has(complaint.property) &&
      (filters.block === "all" ||
        units.some(
          (unit) =>
            unit.unit === complaint.unit &&
            unit.property === complaint.property &&
            unit.block === filters.block,
        )) &&
      (!complaint.reportedAt ||
        (complaint.reportedAt >= filters.fromDate && complaint.reportedAt <= filters.toDate)),
  );
  const costTotal = tickets.reduce((sum, complaint) => sum + (complaint.cost ?? 0), 0);
  const openCount = tickets.filter((complaint) => complaint.stage !== "resolved").length;
  const rows = tickets.map((complaint) => ({
    id: complaint.id,
    cells: [
      complaint.reportedAt ? formatDate(complaint.reportedAt) : complaint.reported,
      complaint.property,
      complaint.unit,
      complaint.tenant,
      complaint.category,
      complaint.title,
      complaint.stage,
      complaint.cost === undefined ? "Not recorded" : formatUGX(complaint.cost),
    ],
  }));
  const unmatchedUnits = tickets.filter(
    (complaint) =>
      !units.some((unit) => unit.property === complaint.property && unit.unit === complaint.unit),
  ).length;
  return {
    title: "Repairs and costs",
    range,
    metrics: [
      { label: "Repair reports", value: String(tickets.length) },
      { label: "Open repairs", value: String(openCount) },
      { label: "Recorded costs", value: formatUGX(costTotal) },
    ],
    summary: [
      `${tickets.length} repair reports match the selected property and date filters.`,
      `${openCount} reports remain open; recorded repair costs total ${formatUGX(costTotal)}.`,
      unmatchedUnits > 0
        ? `${unmatchedUnits} report${unmatchedUnits === 1 ? " refers" : "s refer"} to a property area not mapped to a unit.`
        : "Repair reports are linked to units in the selected portfolio.",
    ],
    headers: [
      "Reported",
      "Property",
      "Unit / area",
      "Tenant",
      "Category",
      "Issue",
      "Status",
      "Cost",
    ],
    rows,
    notes: [
      "Repair costs are not currently captured by the complaint workflow; unrecorded costs are shown explicitly.",
      "Unmapped property areas such as a compound are retained when the property is in scope.",
    ],
  };
}

function annualTaxReport(units: Unit[], range: string, asOfDate: string): ReportModel {
  const year = asOfDate.slice(0, 4);
  const occupiedUnits = units.filter((unit) => unit.tenant);
  const monthlyRent = occupiedUnits.reduce((sum, unit) => sum + unit.rent, 0);
  const tax = estimateRentalTax(monthlyRent * 12);
  const rows = occupiedUnits.map((unit) => ({
    id: unit.id,
    cells: [
      unit.property,
      unit.block ?? "—",
      unit.unit,
      unit.tenant ?? "Vacant",
      formatUGX(unit.rent),
      formatUGX(unit.rent * 12),
    ],
  }));
  return {
    title: "Annual rental income / URA Tax Pack",
    range,
    metrics: [
      { label: "Annualized gross rent", value: formatUGX(tax.annualGrossIncome) },
      { label: "Exemption applied", value: formatUGX(tax.exemptIncome) },
      { label: "Estimated tax · estimate", value: formatUGX(tax.estimatedTax) },
    ],
    summary: [
      `Current occupied monthly rent annualizes to ${formatUGX(tax.annualGrossIncome)} for ${year}.`,
      `${formatUGX(tax.exemptIncome)} is exempt; the estimate applies a 12% rate to ${formatUGX(tax.taxableIncome)} above the exemption.`,
      "This is an estimate, not a tax filing or professional advice; refundable deposits are excluded.",
    ],
    headers: ["Property", "Block", "Unit", "Tenant", "Monthly rent", "Annualized rent"],
    rows,
    notes: [
      `The tax year is based on the report end date, ${year}; current rent is annualized for that year.`,
      `Estimate formula: max(0, annual gross rent − ${formatUGX(INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX)}) × 12%.`,
      "The estimate annualizes current occupied-unit rent and does not reconstruct historical occupancy or rent changes.",
      `Suggested quarterly review reminders for ${year}: March 31, June 30, September 30, and December 31. These are planning reminders, not statutory filing deadlines.`,
      "Deposits are excluded from rental income.",
      "A property filter limits this estimate to that property; a complete landlord tax estimate should include all properties.",
    ],
  };
}

function efrisReport(
  sources: ReportSources,
  units: Unit[],
  payments: LedgerEntry[],
  range: string,
): ReportModel {
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const confirmedPayments = payments.filter((entry) => entry.status === "Confirmed");
  const receipts = new Map(
    sources.receipts
      .filter((receipt) => receipt.content.kind === "rent" && receipt.status === "Valid")
      .map((receipt) => [receipt.content.reference, receipt]),
  );
  const declaredIncomeConnected = false;
  const rows = confirmedPayments.map((entry) => {
    const receipt = receipts.get(entry.reference);
    const efrisStatus = receipt ? efrisStatusLabel(receipt.efris.status) : "Receipt not found";
    const efrisMatched =
      !!receipt && receipt.efris.status === "issued" && !!receipt.efris.fiscalDocumentNumber;
    return {
      id: entry.id,
      warning: !efrisMatched || !declaredIncomeConnected,
      efrisMatched,
      cells: [
        formatDate(entry.receivedAt),
        unitById.get(entry.unitId)?.property ?? "—",
        entry.unit,
        entry.tenant,
        entry.reference,
        formatUGX(entry.amount),
        receipt?.receiptNumber ?? "No receipt",
        efrisStatus,
        "Not connected",
        efrisMatched ? "Needs declared income" : "Mismatch · review",
      ],
    };
  });
  const paymentsTotal = confirmedPayments.reduce((sum, entry) => sum + entry.amount, 0);
  const receiptCount = rows.filter((row) => row.efrisMatched).length;
  const mismatches = rows.length - receiptCount;
  const reportRows = rows.map((row) => ({
    id: row.id,
    warning: row.warning,
    cells: row.cells,
  }));
  return {
    title: "EFRIS reconciliation",
    range,
    metrics: [
      { label: "Confirmed payments", value: formatUGX(paymentsTotal) },
      { label: "EFRIS receipts matched", value: String(receiptCount) },
      { label: "Items needing review", value: String(mismatches + receiptCount) },
    ],
    summary: [
      `${formatUGX(paymentsTotal)} in confirmed rent payments fall within the selected date range.`,
      `${mismatches} payments do not have a matched EFRIS-issued receipt in the local receipt archive.`,
      "Declared income is not connected in this demo, so every payment needs declaration reconciliation before filing.",
    ],
    headers: [
      "Date",
      "Property",
      "Unit",
      "Tenant",
      "Payment reference",
      "Payment",
      "Receipt no.",
      "EFRIS status",
      "Declared income",
      "Reconciliation",
    ],
    rows: reportRows,
    notes: [
      "EFRIS and declared-income integrations are mock-only; nothing is sent to URA.",
      "Only receipts with a local mock fiscal document number are marked EFRIS Issued.",
      "Red rows indicate a missing or unverified receipt, or an unconnected declared-income value.",
      "Security deposits are excluded from rental payments.",
    ],
  };
}

function monthsBetween(fromDate: string, toDate: string) {
  const [fromYear, fromMonth] = fromDate.slice(0, 7).split("-").map(Number);
  const [toYear, toMonth] = toDate.slice(0, 7).split("-").map(Number);
  const months: string[] = [];
  let year = fromYear ?? 0;
  let month = fromMonth ?? 1;
  while (year < (toYear ?? year) || (year === toYear && month <= (toMonth ?? month))) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      year += 1;
      month = 1;
    }
  }
  return months;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function formatDate(value: string) {
  if (!isValidDate(value)) return value || "Not set";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)));
}

function daysBetween(start: string, end: string) {
  return Math.max(
    0,
    Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000),
  );
}

function parseUGX(value: string) {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}
