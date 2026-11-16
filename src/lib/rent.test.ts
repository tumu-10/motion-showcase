import { describe, expect, it } from "vitest";
import { detectNetwork, formatUGX, getRentStatus, normalizeUgPhone } from "./rent";

describe("rent status", () => {
  it("is paid when paid, regardless of date", () => {
    expect(getRentStatus(-10, true)).toBe("paid");
  });
  it("is overdue once the due date has passed", () => {
    expect(getRentStatus(-1, false)).toBe("overdue");
  });
  it("is due soon within 7 days, including the due day", () => {
    expect(getRentStatus(7, false)).toBe("due-soon");
    expect(getRentStatus(0, false)).toBe("due-soon");
  });
  it("is upcoming more than 7 days out", () => {
    expect(getRentStatus(8, false)).toBe("upcoming");
  });
});

describe("mobile money numbers", () => {
  it("accepts local and international Ugandan formats", () => {
    expect(normalizeUgPhone("0772 123 456")).toBe("0772123456");
    expect(normalizeUgPhone("+256 752 123456")).toBe("0752123456");
    expect(normalizeUgPhone("12345")).toBeNull();
  });
  it("detects MTN and Airtel prefixes", () => {
    expect(detectNetwork("0772123456")).toBe("mtn");
    expect(detectNetwork("0752123456")).toBe("airtel");
    expect(detectNetwork("0712123456")).toBeNull();
  });
});

describe("currency", () => {
  it("formats Uganda shillings without decimals", () => {
    expect(formatUGX(1200000)).toBe("UGX 1,200,000");
  });
});
