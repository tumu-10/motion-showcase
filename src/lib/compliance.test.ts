import { describe, expect, it } from "vitest";
import {
  canIncreaseRent,
  evictionNoticeEarliestDate,
  isDepositValid,
  rentIncreaseNoticeDate,
} from "@/lib/compliance";

describe("rent increase compliance", () => {
  it("requires a full 12 months and caps the increase at 10 percent", () => {
    expect(canIncreaseRent("2025-06-15", 1_000_000, 1_100_000, "2026-06-14")).toBe(false);
    expect(canIncreaseRent("2025-06-15", 1_000_000, 1_100_000, "2026-06-15")).toBe(true);
    expect(canIncreaseRent("2025-06-15", 1_000_000, 1_100_001, "2026-06-15")).toBe(false);
  });

  it("returns the latest notice date allowed before the effective date", () => {
    expect(rentIncreaseNoticeDate("2026-05-01")).toBe("2026-03-02");
  });
});

describe("eviction notice compliance", () => {
  it("requires a reason and returns the earliest permitted date", () => {
    expect(evictionNoticeEarliestDate("2026-01-01", "Non-payment")).toBe("2026-01-31");
    expect(() => evictionNoticeEarliestDate("2026-01-01", "  ")).toThrow(
      "An eviction notice requires a reason.",
    );
  });
});

describe("deposit compliance", () => {
  it("allows deposits up to one month's rent only", () => {
    expect(isDepositValid(1_000_000, 1_000_000)).toBe(true);
    expect(isDepositValid(1_000_001, 1_000_000)).toBe(false);
  });
});
