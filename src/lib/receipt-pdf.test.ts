import { describe, expect, it } from "vitest";
import { amountInWords } from "./receipt-pdf";

describe("receipt amounts in words", () => {
  it("writes UGX amounts across thousands and millions", () => {
    expect(amountInWords(0)).toBe("Zero Ugandan shillings only");
    expect(amountInWords(1_234_567)).toBe(
      "one million two hundred thirty four thousand five hundred sixty seven Ugandan shillings only",
    );
  });

  it("rejects amounts that cannot be represented as whole UGX", () => {
    expect(() => amountInWords(-1)).toThrow(RangeError);
    expect(() => amountInWords(1.5)).toThrow(RangeError);
    expect(() => amountInWords(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});
