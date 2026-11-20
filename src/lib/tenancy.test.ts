import { describe, expect, it } from "vitest";
import { MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT, MAX_DEPOSIT_MONTHS } from "@/lib/legal";
import type { LedgerEntry, Unit } from "@/lib/sample-data";
import {
  getAdvanceCoverage,
  getAdvanceAgreementError,
  getFutureAdvanceAmount,
  isDepositAboveLegalLimit,
  calculateMoveInTotal,
  recordMoveInPayment,
  type MoveInPaymentRequest,
  type Tenancy,
} from "@/lib/tenancy";
import { summarizeRentPeriod } from "@/lib/rent-accounting";

const unit: Unit = {
  id: "move-in-unit",
  unit: "A1",
  property: "Example Court",
  tenant: "Sam Tenant",
  phone: "0772123456",
  rent: 1_000_000,
  daysUntilDue: 5,
  paid: false,
  leaseEnds: "-",
};

const tenancy: Tenancy = {
  id: "tenancy-1",
  unitId: unit.id,
  tenantName: "Sam Tenant",
  phone: unit.phone,
  email: "",
  monthlyRent: 1_000_000,
  startDate: "2026-11-01",
  dueDay: 1,
  advanceMonths: 2,
  depositMonths: 1,
  advanceAgreedByBoth: false,
  advanceAgreementNote: "",
  status: "Pending move-in",
  agreementFile: null,
  tenantIdType: "National ID",
  tenantIdNumber: "CM123456",
  copyGivenToTenantAt: null,
};

function request(amountDue = 3_000_000): MoveInPaymentRequest {
  return {
    id: "request-1",
    tenancyId: tenancy.id,
    unitId: unit.id,
    tenantName: tenancy.tenantName,
    amountDue,
    amountPaid: 0,
    rentPaid: 0,
    depositPaid: 0,
    status: "Pending",
    createdAt: "2026-11-01T00:00:00.000Z",
  };
}

function rentPayment(monthsCovered: number, amount: number): LedgerEntry {
  return {
    id: "advance-payment",
    date: "10 Nov",
    receivedAt: "2026-11-10",
    tenant: unit.tenant ?? "Sam Tenant",
    unitId: unit.id,
    unit: unit.unit,
    amount,
    method: "Cash",
    reference: "MOVE-ADVANCE",
    status: "Confirmed",
    rentPeriod: "2026-11",
    monthsCovered,
    coverageAmounts: Array.from({ length: monthsCovered }, () => unit.rent),
  };
}

describe("Uganda tenancy move-in and deposit rules", () => {
  it("calculates advance rent and deposit totals independently", () => {
    expect(calculateMoveInTotal(1_200_000, 3, 1)).toBe(4_800_000);
    expect(calculateMoveInTotal(1_200_000, 3, 0)).toBe(3_600_000);
  });

  it("requires a mutual written agreement only above the advance limit", () => {
    expect(getAdvanceAgreementError(MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT, false, "")).toBeNull();
    expect(getAdvanceAgreementError(MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT + 1, false, "")).toMatch(
      /both parties/i,
    );
    expect(getAdvanceAgreementError(MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT + 1, true, "")).toMatch(
      /note/i,
    );
    expect(
      getAdvanceAgreementError(MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT + 1, true, "Written terms"),
    ).toBeNull();
  });

  it("warns when the security deposit exceeds the legal guidance limit", () => {
    expect(isDepositAboveLegalLimit(MAX_DEPOSIT_MONTHS)).toBe(false);
    expect(isDepositAboveLegalLimit(MAX_DEPOSIT_MONTHS + 1)).toBe(true);
  });

  it("reports fully covered months and the last coverage period", () => {
    const ledger = [rentPayment(3, 3_000_000)];
    expect(getAdvanceCoverage(unit, ledger, "2026-11")).toEqual({
      monthsCovered: 3,
      coveredUntil: "2027-01",
    });
    expect(getFutureAdvanceAmount(unit, ledger, "2026-11")).toBe(2_000_000);
  });

  it("keeps the security deposit out of rent income while allowing part payments", () => {
    const first = recordMoveInPayment({
      tenancy,
      request: request(),
      amount: 1_500_000,
      units: [unit],
      rentLedger: [],
      depositLedger: [],
      receivedAt: "2026-11-10",
      id: "part-1",
    });
    expect(first.tenancy.status).toBe("Pending move-in");
    expect(first.request.rentPaid).toBe(1_500_000);
    expect(first.request.depositPaid).toBe(0);

    const complete = recordMoveInPayment({
      tenancy: first.tenancy,
      request: first.request,
      amount: 1_500_000,
      units: first.units,
      rentLedger: first.rentLedger,
      depositLedger: first.depositLedger,
      receivedAt: "2026-11-12",
      id: "part-2",
    });
    expect(complete.tenancy.status).toBe("Active");
    expect(complete.request.depositPaid).toBe(1_000_000);
    expect(complete.depositLedger).toHaveLength(1);
    expect(complete.depositLedger[0]?.amount).toBe(1_000_000);
    expect(
      summarizeRentPeriod(complete.units, complete.rentLedger, "2026-11").collectedThisMonth,
    ).toBe(2_000_000);
  });
});
