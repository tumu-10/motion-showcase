import { describe, expect, it } from "vitest";
import { estimateRentalTax, getArrearsAgeingBucket } from "@/lib/reports";
import { INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX } from "@/lib/legal";

describe("rental tax estimate", () => {
  it("applies no tax below the exemption and taxes only the excess", () => {
    expect(estimateRentalTax(INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX - 1)).toMatchObject({
      taxableIncome: 0,
      estimatedTax: 0,
    });
    expect(estimateRentalTax(INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX + 1_000_000)).toMatchObject({
      taxableIncome: 1_000_000,
      estimatedTax: 120_000,
    });
  });

  it("rejects negative income rather than generating a misleading estimate", () => {
    expect(() => estimateRentalTax(-1)).toThrow(RangeError);
  });
});

describe("arrears ageing buckets", () => {
  it.each([
    [0, null],
    [1, "1–7 days"],
    [7, "1–7 days"],
    [8, "8–30 days"],
    [30, "8–30 days"],
    [31, "31+ days"],
    [90, "31+ days"],
    [-1, null],
  ])("assigns %i overdue days to %s", (days, expected) => {
    expect(getArrearsAgeingBucket(days)).toBe(expected);
  });
});
