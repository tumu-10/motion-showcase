import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultReceiptBranding,
  issueReceipt,
  saveReceiptBranding,
  type ReceiptContent,
} from "@/lib/receipt-branding";
import { INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX } from "@/lib/legal";
import { createInitialEfrisState, getEfrisEligibility, mockEfrisProvider } from "@/lib/efris";
import { getEfrisRetryQueue, submitEfrisReceipt } from "@/lib/efris-service";

const rentReceipt: ReceiptContent = {
  kind: "rent",
  issuedAt: "2026-11-20T12:00:00.000Z",
  tenant: "Amina Nakato",
  property: "Kololo Heights",
  unit: "B4",
  periodCovered: "November 2026",
  coveredUntil: "30 November 2026",
  amount: 1_200_000,
  method: "MTN Mobile Money",
  reference: "EFRIS-TEST-1",
  balanceAfter: 0,
  efrisStatus: "Pending",
};

function configureEnrolledLandlord() {
  return saveReceiptBranding({
    ...defaultReceiptBranding,
    landlordTin: "TIN-TEST-123",
    landlordType: "individual",
    vatRegistered: false,
    efrisEnrollmentStatus: "enrolled",
    annualRentalIncomeUGX: INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX,
  });
}

describe("EFRIS eligibility and receipt handling", () => {
  beforeEach(() => localStorage.clear());

  it("uses the individual threshold as the boundary for likely eligibility", () => {
    const profile = {
      landlordType: "individual" as const,
      vatRegistered: false,
      efrisEnrollmentStatus: "not-enrolled" as const,
      annualRentalIncomeUGX: INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX - 1,
    };

    expect(getEfrisEligibility(profile).label).toBe("Likely not required");
    expect(getEfrisEligibility(profile, INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX).label).toBe(
      "Likely required",
    );
    expect(getEfrisEligibility({ ...profile, landlordType: "company" }).label).toBe(
      "Likely required",
    );
  });

  it("keeps refundable deposits separate with an accountant note", () => {
    const state = createInitialEfrisState(
      { ...rentReceipt, kind: "security-deposit" },
      defaultReceiptBranding,
    );

    expect(state).toMatchObject({
      status: "not-required",
      documentType: "security-deposit",
      accountantNote: "Confirm EFRIS treatment with your accountant.",
    });
  });

  it("queues an actual rent receipt and issues a mock document without sending to URA", async () => {
    const landlord = configureEnrolledLandlord();
    const receipt = issueReceipt(rentReceipt).receipt;

    expect(getEfrisRetryQueue()).toContainEqual(
      expect.objectContaining({ receiptNumber: receipt.receiptNumber }),
    );
    const result = await submitEfrisReceipt(receipt.receiptNumber);
    const fiscalData = JSON.parse(result.receipt.efris.qrPayload ?? "{}");

    expect(result.receipt.efris).toMatchObject({
      status: "issued",
      fiscalDocumentNumber: expect.stringMatching(/^MOCK-/),
      attemptCount: 1,
    });
    expect(fiscalData).toMatchObject({
      demo: true,
      landlordTin: landlord.landlordTin,
      actualAmountPaidUGX: rentReceipt.amount,
    });
    expect(getEfrisRetryQueue()).toHaveLength(0);
  });

  it("records offline attempts as failed and allows the receipt to be retried", async () => {
    configureEnrolledLandlord();
    const receipt = issueReceipt({ ...rentReceipt, reference: "EFRIS-OFFLINE-1" }).receipt;

    const failed = await submitEfrisReceipt(receipt.receiptNumber, { offline: true });
    expect(failed.receipt.efris.status).toBe("failed");
    expect(getEfrisRetryQueue()).toHaveLength(1);

    const retried = await submitEfrisReceipt(receipt.receiptNumber);
    expect(retried.receipt.efris).toMatchObject({ status: "issued", attemptCount: 2 });
  });

  it("does not issue when the landlord has no TIN or EFRIS enrolment", async () => {
    const receipt = issueReceipt(rentReceipt).receipt;
    const result = await mockEfrisProvider.submitReceipt(receipt, defaultReceiptBranding);

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("TIN");
  });
});
