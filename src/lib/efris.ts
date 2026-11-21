import { INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX } from "@/lib/legal";
import { formatUGX } from "@/lib/rent";
import type { ReceiptBranding, ReceiptContent, ReceiptRecord } from "@/lib/receipt-branding";

export type LandlordEntityType = "individual" | "company";
export type EfrisEnrollmentStatus = "not-enrolled" | "pending" | "enrolled";
export type EfrisStatus = "not-required" | "pending" | "issued" | "failed" | "cancelled";
export type EfrisDocumentType = "rental-income" | "security-deposit" | "deposit-refund";

export type EfrisProfile = {
  landlordType: LandlordEntityType;
  vatRegistered: boolean;
  efrisEnrollmentStatus: EfrisEnrollmentStatus;
  annualRentalIncomeUGX: number | null;
};

export type EfrisReceiptState = {
  status: EfrisStatus;
  documentType: EfrisDocumentType;
  fiscalDocumentNumber: string | null;
  qrPayload: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  issuedAt: string | null;
  errorMessage: string | null;
  accountantNote: string | null;
};

export type EfrisSubmissionResult = Pick<
  EfrisReceiptState,
  "status" | "fiscalDocumentNumber" | "qrPayload" | "issuedAt" | "errorMessage" | "accountantNote"
>;

export type EfrisSubmitOptions = { offline?: boolean };

export interface EfrisProvider {
  submitReceipt(
    receipt: ReceiptRecord,
    landlord: ReceiptBranding,
    options?: EfrisSubmitOptions,
  ): Promise<EfrisSubmissionResult>;
  getStatus(
    receipt: ReceiptRecord,
    landlord: ReceiptBranding,
    options?: EfrisSubmitOptions,
  ): Promise<EfrisSubmissionResult>;
  cancelReceipt(receipt: ReceiptRecord, reason: string): Promise<EfrisReceiptState>;
}

export function getEfrisEligibility(
  profile: EfrisProfile,
  annualRentalIncomeUGX = profile.annualRentalIncomeUGX,
) {
  const known = annualRentalIncomeUGX !== null;
  const reason =
    profile.landlordType === "company"
      ? "Company rental income is likely within EFRIS scope."
      : profile.vatRegistered
        ? "VAT registration is an EFRIS indicator; confirm your obligations with URA."
        : annualRentalIncomeUGX === null
          ? "Add current annual rental income to complete this estimate."
          : annualRentalIncomeUGX < INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX
            ? `Individual rental income below the annual ${formatUGX(INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX)} threshold is likely not required to issue EFRIS receipts.`
            : `Individual rental income at or above the annual ${formatUGX(INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX)} threshold is likely required to use EFRIS.`;
  return {
    likelyRequired:
      profile.landlordType === "company" ||
      profile.vatRegistered ||
      annualRentalIncomeUGX === null ||
      annualRentalIncomeUGX >= INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX,
    known,
    annualRentalIncomeUGX,
    label:
      profile.landlordType === "individual" &&
      !profile.vatRegistered &&
      annualRentalIncomeUGX !== null &&
      annualRentalIncomeUGX < INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX
        ? "Likely not required"
        : "Likely required",
    reason,
  } as const;
}

export function createInitialEfrisState(
  content: ReceiptContent,
  profile: EfrisProfile,
): EfrisReceiptState {
  if (content.kind === "security-deposit" || content.kind === "refund") {
    return {
      status: "not-required",
      documentType: content.kind === "refund" ? "deposit-refund" : "security-deposit",
      fiscalDocumentNumber: null,
      qrPayload: null,
      attemptCount: 0,
      lastAttemptAt: null,
      issuedAt: null,
      errorMessage: null,
      accountantNote: "Confirm EFRIS treatment with your accountant.",
    };
  }
  return {
    status: getEfrisEligibility(profile).likelyRequired ? "pending" : "not-required",
    documentType: "rental-income",
    fiscalDocumentNumber: null,
    qrPayload: null,
    attemptCount: 0,
    lastAttemptAt: null,
    issuedAt: null,
    errorMessage: null,
    accountantNote: null,
  };
}

export const mockEfrisProvider: EfrisProvider = {
  async submitReceipt(receipt, landlord, options = {}) {
    if (receipt.content.kind !== "rent") {
      return {
        status: "not-required",
        fiscalDocumentNumber: null,
        qrPayload: null,
        issuedAt: null,
        errorMessage: null,
        accountantNote: "Confirm EFRIS treatment with your accountant.",
      };
    }

    const eligibility = getEfrisEligibility(landlord);
    if (!eligibility.likelyRequired) {
      return {
        status: "not-required",
        fiscalDocumentNumber: null,
        qrPayload: null,
        issuedAt: null,
        errorMessage: null,
        accountantNote: null,
      };
    }
    if (options.offline) return failedResult("Offline: retry when you are connected.");
    if (!landlord.landlordTin.trim()) return failedResult("Add the landlord entity's TIN first.");
    if (landlord.efrisEnrollmentStatus !== "enrolled") {
      return failedResult("Complete EFRIS enrolment before attempting a submission.");
    }
    if (!Number.isSafeInteger(receipt.content.amount) || receipt.content.amount <= 0) {
      return failedResult("The actual payment amount must be a positive whole UGX amount.");
    }

    const fiscalDocumentNumber = `MOCK-${new Date().getFullYear()}-${receipt.receiptNumber.slice(-6)}`;
    const issuedAt = new Date().toISOString();
    const qrPayload = JSON.stringify({
      demo: true,
      fiscalDocumentNumber,
      landlordName: landlord.landlordName,
      landlordTin: landlord.landlordTin,
      landlordType: landlord.landlordType,
      tenant: receipt.content.tenant,
      property: receipt.content.property,
      unit: receipt.content.unit,
      period: receipt.content.periodCovered,
      actualAmountPaidUGX: receipt.content.amount,
      paymentReference: receipt.content.reference,
    });
    return {
      status: "issued",
      fiscalDocumentNumber,
      qrPayload,
      issuedAt,
      errorMessage: null,
      accountantNote: null,
    };
  },

  async getStatus(receipt, landlord, options = {}) {
    if (receipt.efris.status === "issued" || receipt.efris.status === "cancelled") {
      return {
        status: receipt.efris.status,
        fiscalDocumentNumber: receipt.efris.fiscalDocumentNumber,
        qrPayload: receipt.efris.qrPayload,
        issuedAt: receipt.efris.issuedAt,
        errorMessage: receipt.efris.errorMessage,
        accountantNote: receipt.efris.accountantNote,
      };
    }
    return mockEfrisProvider.submitReceipt(receipt, landlord, options);
  },

  async cancelReceipt(receipt, reason) {
    if (!reason.trim()) throw new Error("Provide a reason for cancelling the EFRIS document.");
    if (receipt.efris.status !== "issued") {
      throw new Error("Only an issued EFRIS document can be cancelled.");
    }
    return {
      ...receipt.efris,
      status: "cancelled",
      qrPayload: null,
      lastAttemptAt: new Date().toISOString(),
      errorMessage: `Cancelled in mock EFRIS: ${reason.trim()}`,
    };
  },
};

function failedResult(errorMessage: string): EfrisSubmissionResult {
  return {
    status: "failed",
    fiscalDocumentNumber: null,
    qrPayload: null,
    issuedAt: null,
    errorMessage,
    accountantNote: null,
  };
}
