import { getReceiptBundle, getReceiptRecords, updateReceiptEfris } from "@/lib/receipt-branding";
import {
  mockEfrisProvider,
  type EfrisProvider,
  type EfrisReceiptState,
  type EfrisSubmitOptions,
} from "@/lib/efris";

export function getEfrisRetryQueue() {
  return getReceiptRecords().filter(
    (receipt) =>
      receipt.status === "Valid" &&
      (receipt.efris.status === "pending" || receipt.efris.status === "failed"),
  );
}

export async function submitEfrisReceipt(
  receiptNumber: string,
  options: EfrisSubmitOptions = {},
  provider: EfrisProvider = mockEfrisProvider,
) {
  const bundle = getReceiptBundle(receiptNumber);
  if (!bundle) throw new Error("The receipt could not be found in the local archive.");
  if (bundle.receipt.status !== "Valid") throw new Error("Cancelled receipts cannot be submitted.");
  if (bundle.receipt.efris.status === "not-required") {
    throw new Error("This receipt is not required to have an EFRIS document.");
  }
  if (bundle.receipt.efris.status === "cancelled") {
    throw new Error("The EFRIS document for this receipt was cancelled.");
  }

  const lastAttemptAt = new Date().toISOString();
  const attemptCount = bundle.receipt.efris.attemptCount + 1;
  let result;
  try {
    result = await provider.submitReceipt(bundle.receipt, bundle.branding, options);
  } catch (error) {
    result = {
      status: "failed" as const,
      fiscalDocumentNumber: null,
      qrPayload: null,
      issuedAt: null,
      errorMessage:
        error instanceof Error
          ? error.message
          : "The mock provider could not process this receipt.",
      accountantNote: null,
    };
  }
  const state: EfrisReceiptState = {
    ...bundle.receipt.efris,
    ...result,
    attemptCount,
    lastAttemptAt,
  };
  return updateReceiptEfris(receiptNumber, state);
}

export async function refreshEfrisReceiptStatus(
  receiptNumber: string,
  options: EfrisSubmitOptions = {},
  provider: EfrisProvider = mockEfrisProvider,
) {
  const bundle = getReceiptBundle(receiptNumber);
  if (!bundle) throw new Error("The receipt could not be found in the local archive.");
  if (bundle.receipt.efris.status === "pending" || bundle.receipt.efris.status === "failed") {
    return submitEfrisReceipt(receiptNumber, options, provider);
  }
  const result = await provider.getStatus(bundle.receipt, bundle.branding, options);
  return updateReceiptEfris(receiptNumber, {
    ...bundle.receipt.efris,
    ...result,
    lastAttemptAt: new Date().toISOString(),
  });
}

export async function cancelEfrisReceipt(
  receiptNumber: string,
  reason: string,
  provider: EfrisProvider = mockEfrisProvider,
) {
  const bundle = getReceiptBundle(receiptNumber);
  if (!bundle) throw new Error("The receipt could not be found in the local archive.");
  const cancelled = await provider.cancelReceipt(bundle.receipt, reason);
  return updateReceiptEfris(receiptNumber, cancelled);
}
