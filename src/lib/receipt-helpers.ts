import { addRentPeriodMonths, formatRentPeriodRange } from "@/lib/rent-accounting";
import { formatUGX } from "@/lib/rent";
import type { DepositLedgerEntry } from "@/lib/tenancy";
import type { LedgerEntry } from "@/lib/sample-data";
import {
  issueReceipt,
  issueTenantReceipt,
  type ReceiptBundle,
  type ReceiptContent,
} from "@/lib/receipt-branding";

export function issueRentReceipt(
  entry: LedgerEntry,
  property: string,
  balanceAfter: number,
): ReceiptBundle {
  return issueReceipt(rentReceiptContent(entry, property, balanceAfter));
}

export function issueTenantRentReceipt(
  entry: LedgerEntry,
  property: string,
  balanceAfter: number,
): ReceiptBundle {
  return issueTenantReceipt(rentReceiptContent(entry, property, balanceAfter));
}

function rentReceiptContent(
  entry: LedgerEntry,
  property: string,
  balanceAfter: number,
): ReceiptContent {
  const endPeriod = addRentPeriodMonths(entry.rentPeriod, entry.monthsCovered);
  const [year, month] = endPeriod.split("-").map(Number);
  const coveredUntil = new Date(year!, month! - 1, 0).toLocaleDateString("en-UG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    kind: "rent",
    issuedAt: entry.receivedAt,
    tenant: entry.tenant,
    property,
    unit: entry.unit,
    periodCovered: formatRentPeriodRange(entry.rentPeriod, entry.monthsCovered),
    coveredUntil,
    amount: entry.amount,
    method: entry.method,
    reference: entry.reference,
    balanceAfter: Math.max(0, balanceAfter),
    efrisStatus: "Pending integration",
  };
}

export function issueDepositReceipt(entry: DepositLedgerEntry, property: string): ReceiptBundle {
  const isRefund =
    (entry.status === "Refunded" || entry.status === "Partly refunded") &&
    entry.refundAmount !== null;
  return issueReceipt({
    kind: isRefund ? "refund" : "security-deposit",
    issuedAt: isRefund ? (entry.resolvedAt ?? entry.receivedAt) : entry.receivedAt,
    tenant: entry.tenant,
    property,
    unit: entry.unit,
    periodCovered: "Not applicable",
    coveredUntil: null,
    amount: isRefund ? entry.refundAmount! : entry.amount,
    method: isRefund ? "Refund" : "Recorded deposit",
    reference: isRefund
      ? `${entry.id}-refund-${entry.resolvedAt ?? entry.refundAmount}`
      : `${entry.id}-deposit-${entry.amount}-${entry.receivedAt}`,
    balanceAfter: isRefund ? 0 : entry.amount,
    efrisStatus: "Not applicable to refundable deposit",
    depositLabel: isRefund ? "Security deposit refund" : "Refundable security deposit",
    notes: isRefund
      ? [
          `Arrears: ${formatUGX(entry.arrearsAtRefund)}`,
          ...entry.deductions.map((item) => `${item.description}: ${formatUGX(item.amount)}`),
        ].join(" · ")
      : "Refundable subject to tenancy terms and any lawful deductions.",
  });
}
