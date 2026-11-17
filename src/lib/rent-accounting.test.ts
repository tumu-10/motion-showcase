import { describe, expect, it } from "vitest";
import type { LedgerEntry, Unit } from "@/lib/sample-data";
import {
  getNextUncoveredRentPeriod,
  getUnitAdvanceMonths,
  getUnitPeriodCredit,
  getUnitRentChargeForMonths,
  summarizeRentPeriod,
} from "@/lib/rent-accounting";

const unit: Unit = {
  id: "unit-1",
  unit: "A1",
  property: "Example Court",
  tenant: "Sam Tenant",
  phone: "0772123456",
  rent: 1_000_000,
  daysUntilDue: 5,
  paid: false,
  leaseEnds: "-",
};

function payment({
  id,
  amount,
  rentPeriod = "2026-11",
  monthsCovered = 1,
  status = "Confirmed",
  receivedAt = "2026-11-10",
  coverageAmounts,
}: {
  id: string;
  amount: number;
  rentPeriod?: string;
  monthsCovered?: number;
  status?: LedgerEntry["status"];
  receivedAt?: string;
  coverageAmounts?: number[];
}): LedgerEntry {
  return {
    id,
    date: "10 Nov",
    receivedAt,
    tenant: "Sam Tenant",
    unitId: unit.id,
    unit: unit.unit,
    amount,
    method: "Cash",
    reference: id,
    status,
    rentPeriod,
    monthsCovered,
    coverageAmounts,
  };
}

describe("rent period accounting", () => {
  it("excludes confirmed advance coverage from this month's expected rent", () => {
    const advance = payment({ id: "advance", amount: 2_000_000, monthsCovered: 2 });
    const summary = summarizeRentPeriod([unit], [advance], "2026-11");

    expect(summary.grossExpected).toBe(1_000_000);
    expect(summary.advanceCovered).toBe(1_000_000);
    expect(summary.expectedAfterAdvances).toBe(0);
    expect(summary.advanceTenants).toBe(1);
    expect(summary.futureAdvanceReceived).toBe(1_000_000);
    expect(getUnitAdvanceMonths(unit, [advance], "2026-11")).toBe(1);
    expect(getNextUncoveredRentPeriod(unit, [advance], "2026-11")).toBe("2027-01");
  });

  it("counts a rent period prepaid in the prior month as advance coverage", () => {
    const prepaid = payment({
      id: "prepaid",
      amount: 1_000_000,
      receivedAt: "2026-10-28",
    });
    const summary = summarizeRentPeriod([unit], [prepaid], "2026-11");

    expect(summary.advanceCovered).toBe(1_000_000);
    expect(summary.expectedAfterAdvances).toBe(0);
    expect(summary.advanceTenants).toBe(1);
  });

  it("keeps partial and unconfirmed payments out of advance coverage", () => {
    const partial = payment({ id: "partial", amount: 400_000 });
    const pendingAdvance = payment({
      id: "pending",
      amount: 2_000_000,
      monthsCovered: 2,
      status: "Pending",
    });
    const failedAdvance = payment({
      id: "failed",
      amount: 2_000_000,
      monthsCovered: 2,
      status: "Failed",
    });
    const summary = summarizeRentPeriod(
      [unit],
      [partial, pendingAdvance, failedAdvance],
      "2026-11",
    );

    expect(summary.advanceCovered).toBe(0);
    expect(summary.expectedAfterAdvances).toBe(1_000_000);
    expect(summary.collectedForPeriod).toBe(400_000);
    expect(summary.balanceRemaining).toBe(600_000);
    expect(summary.advanceTenants).toBe(0);
    expect(getNextUncoveredRentPeriod(unit, [partial], "2026-11")).toBe("2026-11");
  });

  it("applies a partial first-month balance before charging future months", () => {
    const partial = payment({ id: "partial", amount: 400_000 });
    expect(getUnitRentChargeForMonths(unit, [partial], "2026-11", 2)).toBe(1_600_000);

    const remaining = payment({
      id: "remaining",
      amount: 1_600_000,
      monthsCovered: 2,
      coverageAmounts: [600_000, 1_000_000],
    });
    const ledger = [partial, remaining];

    expect(getUnitPeriodCredit(unit, ledger, "2026-11")).toBe(1_000_000);
    expect(getUnitPeriodCredit(unit, ledger, "2026-12")).toBe(1_000_000);
    expect(getNextUncoveredRentPeriod(unit, ledger, "2026-11")).toBe("2027-01");
  });
});
