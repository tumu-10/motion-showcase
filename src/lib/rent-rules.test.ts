import { describe, expect, it } from "vitest";
import {
  getMinimumNoticeDate,
  makePaymentReference,
  needsAdvanceAgreement,
  validateNotice,
  validateRentIncreaseNotice,
} from "./rent";
import {
  MAX_ANNUAL_RENT_INCREASE_PCT,
  MIN_EVICTION_NOTICE_DAYS,
  RENT_INCREASE_NOTICE_DAYS,
} from "./legal";

describe("legal and payment rules", () => {
  it("allows up to 3 advance months without written agreement", () => {
    expect(needsAdvanceAgreement(3)).toBe(false);
    expect(needsAdvanceAgreement(4)).toBe(true);
  });
  it("rejects eviction notices with no reason", () => {
    const today = "2026-11-21";
    const vacateBy = getMinimumNoticeDate(today, MIN_EVICTION_NOTICE_DAYS);
    expect(validateNotice(today, vacateBy, "  ", today)).not.toBeNull();
  });
  it("rejects a 20-day eviction notice and accepts the legal minimum", () => {
    const today = "2026-11-21";
    expect(
      validateNotice(today, getMinimumNoticeDate(today, 20), "Non-payment", today),
    ).not.toBeNull();
    expect(
      validateNotice(
        today,
        getMinimumNoticeDate(today, MIN_EVICTION_NOTICE_DAYS),
        "Non-payment",
        today,
      ),
    ).toBeNull();
  });
  it("blocks rent increases before the notice minimum or above the annual cap", () => {
    const today = "2026-11-21";
    expect(
      validateRentIncreaseNotice(
        getMinimumNoticeDate(today, RENT_INCREASE_NOTICE_DAYS - 1),
        5,
        today,
      ),
    ).not.toBeNull();
    expect(
      validateRentIncreaseNotice(
        getMinimumNoticeDate(today, RENT_INCREASE_NOTICE_DAYS),
        MAX_ANNUAL_RENT_INCREASE_PCT + 1,
        today,
      ),
    ).not.toBeNull();
    expect(
      validateRentIncreaseNotice(
        getMinimumNoticeDate(today, RENT_INCREASE_NOTICE_DAYS),
        MAX_ANNUAL_RENT_INCREASE_PCT,
        today,
      ),
    ).toBeNull();
  });
  it("generates unique payment references", () => {
    const refs = new Set(Array.from({ length: 2000 }, makePaymentReference));
    expect(refs.size).toBe(2000);
  });
});
