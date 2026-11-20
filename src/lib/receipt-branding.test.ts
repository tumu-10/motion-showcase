import { beforeEach, describe, expect, it } from "vitest";
import {
  cancelAndReissueReceipt,
  getReceiptBundle,
  issueReceipt,
  type ReceiptContent,
} from "./receipt-branding";

const content: ReceiptContent = {
  kind: "rent",
  issuedAt: "2026-11-20T12:00:00.000Z",
  tenant: "Amina Nakato",
  property: "Kololo Heights",
  unit: "B4",
  periodCovered: "November 2026",
  coveredUntil: "30 November 2026",
  amount: 1_200_000,
  method: "MTN Mobile Money",
  reference: "PTZ-TEST-1",
  balanceAfter: 0,
  efrisStatus: "Pending integration",
};

describe("receipt archive", () => {
  beforeEach(() => localStorage.clear());

  it("keeps issued receipts immutable and reuses the explicit replacement", () => {
    const original = issueReceipt(content);
    const replacement = cancelAndReissueReceipt(
      original.receipt.receiptNumber,
      "Correcting the date",
    );

    expect(getReceiptBundle(original.receipt.receiptNumber)?.receipt.status).toBe("Cancelled");
    expect(issueReceipt(content).receipt.receiptNumber).toBe(replacement.receipt.receiptNumber);
    expect(replacement.receipt.content.issuedAt).not.toBe(content.issuedAt);
  });
});
