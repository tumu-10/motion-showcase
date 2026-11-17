import type { LedgerEntry, Unit } from "@/lib/sample-data";

export type RentCollectionSummary = {
  occupiedUnits: number;
  grossExpected: number;
  advanceCovered: number;
  expectedAfterAdvances: number;
  collectedForPeriod: number;
  collectedThisMonth: number;
  futureAdvanceReceived: number;
  balanceRemaining: number;
  advanceTenants: number;
  overdueTenants: number;
};

export function currentRentPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function localDateIso(date = new Date()) {
  return `${currentRentPeriod(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addRentPeriodMonths(period: string, months: number) {
  const [year, month] = parseRentPeriod(period);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function rentPeriodDifference(from: string, to: string) {
  const [fromYear, fromMonth] = parseRentPeriod(from);
  const [toYear, toMonth] = parseRentPeriod(to);
  return (toYear - fromYear) * 12 + toMonth - fromMonth;
}

export function formatRentPeriod(period: string) {
  const [year, month] = parseRentPeriod(period);
  return new Intl.DateTimeFormat("en-UG", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

export function formatRentPeriodRange(start: string, monthsCovered: number) {
  const end = addRentPeriodMonths(start, monthsCovered - 1);
  return start === end
    ? formatRentPeriod(start)
    : `${formatRentPeriod(start)} – ${formatRentPeriod(end)}`;
}

export function getUnitPeriodCredit(unit: Unit, ledger: LedgerEntry[], period: string) {
  const total = ledger.reduce((sum, entry) => {
    if (entry.unitId !== unit.id || entry.tenant !== unit.tenant || entry.status !== "Confirmed")
      return sum;
    const offset = rentPeriodDifference(entry.rentPeriod, period);
    if (offset < 0 || offset >= entry.monthsCovered) return sum;
    return (
      sum + (entry.coverageAmounts?.[offset] ?? Math.floor(entry.amount / entry.monthsCovered))
    );
  }, 0);
  return Math.min(unit.rent, total);
}

export function getUnitAdvanceMonths(unit: Unit, ledger: LedgerEntry[], period: string) {
  const coveredThrough = ledger.reduce((latest, entry) => {
    if (entry.unitId !== unit.id || entry.tenant !== unit.tenant || entry.status !== "Confirmed")
      return latest;
    const end = addRentPeriodMonths(entry.rentPeriod, entry.monthsCovered - 1);
    return rentPeriodDifference(period, end) > rentPeriodDifference(period, latest) ? end : latest;
  }, period);
  return Math.max(0, rentPeriodDifference(period, coveredThrough));
}

export function getNextUncoveredRentPeriod(unit: Unit, ledger: LedgerEntry[], period: string) {
  const lastCoveredPeriod = ledger.reduce((latest, entry) => {
    if (entry.unitId !== unit.id || entry.tenant !== unit.tenant || entry.status !== "Confirmed")
      return latest;
    const end = addRentPeriodMonths(entry.rentPeriod, entry.monthsCovered - 1);
    return rentPeriodDifference(period, end) > rentPeriodDifference(period, latest) ? end : latest;
  }, period);
  let candidate = period;
  while (
    rentPeriodDifference(period, candidate) <= rentPeriodDifference(period, lastCoveredPeriod)
  ) {
    if (getUnitPeriodCredit(unit, ledger, candidate) < unit.rent) return candidate;
    candidate = addRentPeriodMonths(candidate, 1);
  }
  return candidate;
}

export function getUnitRentChargeForMonths(
  unit: Unit,
  ledger: LedgerEntry[],
  period: string,
  months: number,
) {
  const firstPeriod = getNextUncoveredRentPeriod(unit, ledger, period);
  return Array.from({ length: months }, (_, index) => {
    const month = addRentPeriodMonths(firstPeriod, index);
    return Math.max(0, unit.rent - getUnitPeriodCredit(unit, ledger, month));
  }).reduce((sum, amount) => sum + amount, 0);
}

export function isUnitPrepaidForPeriod(unit: Unit, ledger: LedgerEntry[], period: string) {
  if (getUnitPeriodCredit(unit, ledger, period) < unit.rent) return false;
  const receivedBeforePeriod = ledger.some(
    (entry) =>
      entry.unitId === unit.id &&
      entry.tenant === unit.tenant &&
      entry.status === "Confirmed" &&
      entry.receivedAt.slice(0, 7) < period &&
      rentPeriodDifference(entry.rentPeriod, period) >= 0 &&
      rentPeriodDifference(entry.rentPeriod, period) < entry.monthsCovered,
  );
  return receivedBeforePeriod || getUnitAdvanceMonths(unit, ledger, period) > 0;
}

export function getUnitRentStatus(unit: Unit, ledger: LedgerEntry[], period: string) {
  if (!unit.tenant) return "Vacant";
  if (isUnitPrepaidForPeriod(unit, ledger, period)) return "Advance";
  const credit = getUnitPeriodCredit(unit, ledger, period);
  if (credit >= unit.rent) return "Paid";
  if (unit.daysUntilDue < 0) return "Overdue";
  if (credit > 0) return "Partially paid";
  return "Due";
}

export function summarizeRentPeriod(
  units: Unit[],
  ledger: LedgerEntry[],
  period: string,
): RentCollectionSummary {
  const occupied = units.filter((unit) => unit.tenant);
  const grossExpected = occupied.reduce((sum, unit) => sum + unit.rent, 0);
  const advanceCovered = occupied.reduce(
    (sum, unit) => sum + (isUnitPrepaidForPeriod(unit, ledger, period) ? unit.rent : 0),
    0,
  );
  const collectedForPeriod = occupied.reduce(
    (sum, unit) => sum + getUnitPeriodCredit(unit, ledger, period),
    0,
  );
  const collectedThisMonth = ledger
    .filter((entry) => entry.status === "Confirmed" && entry.receivedAt.slice(0, 7) === period)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const futureAdvanceReceived = ledger.reduce((sum, entry) => {
    if (entry.status !== "Confirmed" || entry.receivedAt.slice(0, 7) !== period) return sum;
    let futureAmount = 0;
    for (let month = 0; month < entry.monthsCovered; month += 1) {
      if (rentPeriodDifference(period, addRentPeriodMonths(entry.rentPeriod, month)) > 0)
        futureAmount +=
          entry.coverageAmounts?.[month] ?? Math.floor(entry.amount / entry.monthsCovered);
    }
    return sum + futureAmount;
  }, 0);
  const balanceRemaining = occupied.reduce(
    (sum, unit) => sum + Math.max(0, unit.rent - getUnitPeriodCredit(unit, ledger, period)),
    0,
  );

  return {
    occupiedUnits: occupied.length,
    grossExpected,
    advanceCovered,
    expectedAfterAdvances: grossExpected - advanceCovered,
    collectedForPeriod,
    collectedThisMonth,
    futureAdvanceReceived,
    balanceRemaining,
    advanceTenants: occupied.filter((unit) => isUnitPrepaidForPeriod(unit, ledger, period)).length,
    overdueTenants: occupied.filter((unit) => getUnitRentStatus(unit, ledger, period) === "Overdue")
      .length,
  };
}

function parseRentPeriod(period: string): [number, number] {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  if (!match || month < 1 || month > 12) {
    throw new Error(`Invalid rent period: ${period}`);
  }
  return [year, month];
}
