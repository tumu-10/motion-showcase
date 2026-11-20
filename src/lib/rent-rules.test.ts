import { describe, expect, it } from "vitest";
import { makePaymentReference, needsAdvanceAgreement, validateNotice } from "./rent";

describe("legal and payment rules", () => {
  it("allows up to 3 advance months without written agreement", () => {
    expect(needsAdvanceAgreement(3)).toBe(false);
    expect(needsAdvanceAgreement(4)).toBe(true);
  });
  it("requires a reason for a notice", () => {
    expect(validateNotice("2026-11-17", "2026-12-17", "  ")).not.toBeNull();
  });
  it("requires at least 30 days notice", () => {
    expect(validateNotice("2026-11-17", "2026-12-16", "Arrears")).not.toBeNull();
    expect(validateNotice("2026-11-17", "2026-12-17", "Arrears")).toBeNull();
  });
  it("generates unique payment references", () => {
    const refs = new Set(Array.from({ length: 2000 }, makePaymentReference));
    expect(refs.size).toBe(2000);
  });
});
