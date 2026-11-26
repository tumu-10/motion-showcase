import {
  DEFAULT_ADVANCE_MONTHS,
  DEFAULT_DEPOSIT_MONTHS,
  MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT,
  MAX_DEPOSIT_MONTHS,
} from "@/lib/legal";
import type { LedgerEntry, Unit } from "@/lib/sample-data";
import {
  addRentPeriodMonths,
  getUnitPeriodCredit,
  rentPeriodDifference,
} from "@/lib/rent-accounting";

export type TenancyStatus = "Pending move-in" | "Active" | "Ending" | "Ended";

export type Tenancy = {
  id: string;
  unitId: string;
  tenantName: string;
  phone: string;
  email: string;
  monthlyRent: number;
  startDate: string;
  dueDay: number;
  advanceMonths: number;
  depositMonths: number;
  advanceAgreedByBoth: boolean;
  advanceAgreementNote: string;
  status: TenancyStatus;
  agreementFile: string | null;
  tenantIdType: string;
  tenantIdNumber: string;
  copyGivenToTenantAt: string | null;
};

export type DepositStatus = "Held" | "Refund pending" | "Partly refunded" | "Refunded" | "Disputed";

export type DepositDeduction = {
  description: string;
  amount: number;
};

export type DepositLedgerEntry = {
  id: string;
  tenancyId: string | null;
  unitId: string;
  tenant: string;
  unit: string;
  amount: number;
  receivedAt: string;
  status: DepositStatus;
  deductions: DepositDeduction[];
  arrearsAtRefund: number;
  refundAmount: number | null;
  refundRequestedAt: string | null;
  resolvedAt: string | null;
};

export type MoveInPaymentRequest = {
  id: string;
  tenancyId: string;
  unitId: string;
  tenantName: string;
  amountDue: number;
  amountPaid: number;
  rentPaid: number;
  depositPaid: number;
  status: "Pending" | "Paid";
  createdAt: string;
};

export type MoveInInput = Omit<Tenancy, "id" | "status" | "copyGivenToTenantAt"> & {
  copyGivenToTenantAt: string | null;
};

export function calculateMoveInTotal(
  monthlyRent: number,
  advanceMonths = DEFAULT_ADVANCE_MONTHS,
  depositMonths = DEFAULT_DEPOSIT_MONTHS,
) {
  if (!Number.isFinite(monthlyRent) || monthlyRent < 0) {
    throw new RangeError("Monthly rent must be a non-negative number.");
  }
  if (!Number.isInteger(advanceMonths) || advanceMonths < 0) {
    throw new RangeError("Advance months must be a non-negative integer.");
  }
  if (!Number.isInteger(depositMonths) || depositMonths < 0) {
    throw new RangeError("Deposit months must be a non-negative integer.");
  }
  return monthlyRent * (advanceMonths + depositMonths);
}

export function calculateRefundableDeposit(
  depositHeld: number,
  arrears: number,
  loggedDeductions: number,
) {
  return Math.max(0, depositHeld - Math.max(0, arrears) - Math.max(0, loggedDeductions));
}

export function getAdvanceAgreementError(
  advanceMonths: number,
  agreedByBoth: boolean,
  note: string,
) {
  if (advanceMonths > MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT && !agreedByBoth) {
    return `Both parties must agree in writing to advance rent above ${MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT} months.`;
  }
  if (advanceMonths > MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT && !note.trim()) {
    return "Add a note describing the written advance agreement.";
  }
  return null;
}

export function isDepositAboveLegalLimit(depositMonths: number) {
  return depositMonths > MAX_DEPOSIT_MONTHS;
}

export function getTenancyUnit(units: Unit[], tenancy: Tenancy) {
  return units.find((unit) => unit.id === tenancy.unitId) ?? null;
}

export function recordMoveInPayment({
  tenancy,
  request,
  amount,
  units,
  rentLedger,
  depositLedger,
  receivedAt,
  id,
}: {
  tenancy: Tenancy;
  request: MoveInPaymentRequest;
  amount: number;
  units: Unit[];
  rentLedger: LedgerEntry[];
  depositLedger: DepositLedgerEntry[];
  receivedAt: string;
  id: string;
}) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > request.amountDue - request.amountPaid) {
    throw new RangeError(
      "Payment must be greater than zero and no more than the remaining balance.",
    );
  }

  const rentDue = tenancy.monthlyRent * tenancy.advanceMonths;
  const rentPortion = Math.min(amount, Math.max(0, rentDue - request.rentPaid));
  const depositPortion = amount - rentPortion;
  const unit = getTenancyUnit(units, tenancy);
  if (!unit) throw new Error("The tenancy unit could not be found.");

  const nextRentLedger = [...rentLedger];
  if (rentPortion > 0) {
    let remainingRent = rentPortion;
    const coverageAmounts = Array.from({ length: tenancy.advanceMonths }, (_, index) => {
      const alreadyAllocated = Math.max(0, request.rentPaid - index * tenancy.monthlyRent);
      const allocated = Math.min(
        Math.max(0, tenancy.monthlyRent - alreadyAllocated),
        remainingRent,
      );
      remainingRent -= allocated;
      return allocated;
    });
    const rentPeriod = tenancy.startDate.slice(0, 7);
    const date = new Date(`${receivedAt}T00:00:00`);
    nextRentLedger.unshift({
      id,
      date: new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short" }).format(date),
      receivedAt,
      tenant: tenancy.tenantName,
      unitId: unit.id,
      unit: unit.unit,
      amount: rentPortion,
      method: "Cash",
      reference: `MOVE-${id}`,
      status: "Confirmed",
      rentPeriod,
      monthsCovered: tenancy.advanceMonths,
      coverageAmounts,
    });
  }

  let nextDepositLedger = depositLedger;
  if (depositPortion > 0) {
    const existing = depositLedger.find(
      (entry) => entry.tenancyId === tenancy.id && entry.status === "Held",
    );
    nextDepositLedger = existing
      ? depositLedger.map((entry) =>
          entry.id === existing.id ? { ...entry, amount: entry.amount + depositPortion } : entry,
        )
      : [
          {
            id: `deposit-${id}`,
            tenancyId: tenancy.id,
            unitId: unit.id,
            tenant: tenancy.tenantName,
            unit: unit.unit,
            amount: depositPortion,
            receivedAt,
            status: "Held",
            deductions: [],
            arrearsAtRefund: 0,
            refundAmount: null,
            refundRequestedAt: null,
            resolvedAt: null,
          },
          ...depositLedger,
        ];
  }

  const nextRequest: MoveInPaymentRequest = {
    ...request,
    amountPaid: request.amountPaid + amount,
    rentPaid: request.rentPaid + rentPortion,
    depositPaid: request.depositPaid + depositPortion,
    status: request.amountPaid + amount >= request.amountDue ? "Paid" : "Pending",
  };
  const nextTenancy: Tenancy = {
    ...tenancy,
    status: nextRequest.status === "Paid" ? "Active" : "Pending move-in",
  };
  const nextUnits =
    nextTenancy.status === "Active"
      ? units.map((item) =>
          item.id === unit.id
            ? {
                ...item,
                tenant: tenancy.tenantName,
                phone: tenancy.phone,
                email: tenancy.email || undefined,
                rent: tenancy.monthlyRent,
                dueDay: tenancy.dueDay,
                paid: true,
                leaseEnds: new Intl.DateTimeFormat("en-UG", {
                  month: "short",
                  year: "numeric",
                }).format(
                  new Date(
                    `${addRentPeriodMonths(tenancy.startDate.slice(0, 7), 12)}-01T00:00:00Z`,
                  ),
                ),
                pendingMoveIn: false,
                pendingTenant: undefined,
                vacantSince: undefined,
              }
            : item,
        )
      : units;

  return {
    tenancy: nextTenancy,
    request: nextRequest,
    rentLedger: nextRentLedger,
    depositLedger: nextDepositLedger,
    units: nextUnits,
  };
}

export function getAdvanceCoverage(unit: Unit, ledger: LedgerEntry[], period: string) {
  const lastPaidPeriod = ledger.reduce((latest, entry) => {
    if (entry.unitId !== unit.id || entry.tenant !== unit.tenant || entry.status !== "Confirmed")
      return latest;
    const end = addRentPeriodMonths(entry.rentPeriod, entry.monthsCovered - 1);
    return rentPeriodDifference(period, end) > rentPeriodDifference(period, latest) ? end : latest;
  }, period);

  let candidate = period;
  let monthsCovered = 0;
  let coveredUntil: string | null = null;
  while (rentPeriodDifference(period, candidate) <= rentPeriodDifference(period, lastPaidPeriod)) {
    if (getUnitPeriodCredit(unit, ledger, candidate) < unit.rent) break;
    monthsCovered += 1;
    coveredUntil = candidate;
    candidate = addRentPeriodMonths(candidate, 1);
  }
  return { monthsCovered, coveredUntil };
}

export function getFutureAdvanceAmount(unit: Unit, ledger: LedgerEntry[], period: string) {
  const { coveredUntil } = getAdvanceCoverage(unit, ledger, period);
  if (!coveredUntil || coveredUntil === period) return 0;
  let candidate = addRentPeriodMonths(period, 1);
  let amount = 0;
  while (rentPeriodDifference(period, candidate) <= rentPeriodDifference(period, coveredUntil)) {
    amount += Math.min(unit.rent, getUnitPeriodCredit(unit, ledger, candidate));
    candidate = addRentPeriodMonths(candidate, 1);
  }
  return amount;
}

export function formatCoveredUntil(period: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, month ?? 1, 0));
  return new Intl.DateTimeFormat("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
