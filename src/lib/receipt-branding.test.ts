import { beforeEach, describe, expect, it } from "vitest";
import {
  cancelAndReissueReceipt,
  getReceiptBundle,
  issueReceipt,
  issueTenantReceipt,
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

  it("numbers tenant receipts sequentially within their issue month", () => {
    const first = issueTenantReceipt({ ...content, reference: "TENANT-1" });
    const second = issueTenantReceipt({ ...content, reference: "TENANT-2" });
    const nextMonth = issueTenantReceipt({
      ...content,
      issuedAt: "2026-12-01T10:00:00.000Z",
      reference: "TENANT-3",
    });

    expect(first.receipt.receiptNumber).toBe("PRP-202611-0001");
    expect(second.receipt.receiptNumber).toBe("PRP-202611-0002");
    expect(nextMonth.receipt.receiptNumber).toBe("PRP-202612-0001");
    expect(issueTenantReceipt({ ...content, reference: "TENANT-1" }).receipt.receiptNumber).toBe(
      first.receipt.receiptNumber,
    );
  });

  it("keeps tenant receipt numbering when a receipt is cancelled and reissued", () => {
    const original = issueTenantReceipt({ ...content, reference: "TENANT-REISSUE" });
    const replacement = cancelAndReissueReceipt(
      original.receipt.receiptNumber,
      "Correcting a detail",
    );

    expect(replacement.receipt.receiptNumber).toMatch(/^PRP-\d{6}-\d{4}$/);
    expect(replacement.receipt.receiptNumber).not.toBe(original.receipt.receiptNumber);
  });
});
