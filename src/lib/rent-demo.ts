import {
  ledger as initialLedger,
  tenantNotifications as initialNotifications,
  units as initialUnits,
  type LedgerEntry,
  type TenantNotification,
  type Unit,
} from "@/lib/sample-data";
import { DEFAULT_DEPOSIT_MONTHS } from "@/lib/legal";
import type { DepositLedgerEntry, MoveInPaymentRequest, Tenancy } from "@/lib/tenancy";

const storageKey = "propatiz-demo-rent-state";

export type RentDemoState = {
  units: Unit[];
  ledger: LedgerEntry[];
  notifications: TenantNotification[];
  tenancies: Tenancy[];
  depositLedger: DepositLedgerEntry[];
  moveInRequests: MoveInPaymentRequest[];
};

type StoredRentDemoState = Pick<RentDemoState, "units" | "ledger" | "notifications"> &
  Partial<Pick<RentDemoState, "tenancies" | "depositLedger" | "moveInRequests">>;

export function createSampleDepositLedger(units: Unit[]): DepositLedgerEntry[] {
  const receivedAt = "2026-01-01";
  return units.flatMap((unit) => {
    if (!unit.tenant) return [];
    return [
      {
        id: `sample-deposit-${unit.id}`,
        tenancyId: null,
        unitId: unit.id,
        tenant: unit.tenant,
        unit: unit.unit,
        amount: unit.rent * DEFAULT_DEPOSIT_MONTHS,
        receivedAt,
        status: "Held" as const,
        deductions: [],
        arrearsAtRefund: 0,
        refundAmount: null,
        refundRequestedAt: null,
        resolvedAt: null,
      },
    ];
  });
}

export const initialRentDemoState: RentDemoState = {
  units: initialUnits,
  ledger: initialLedger,
  notifications: initialNotifications,
  tenancies: [],
  depositLedger: createSampleDepositLedger(initialUnits),
  moveInRequests: [],
};

export function readRentDemoState(): { state: RentDemoState; error?: Error | undefined } {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return { state: initialRentDemoState };
    const value: unknown = JSON.parse(saved);
    if (!isRentDemoState(value)) throw new Error("Saved rent demo data has an invalid shape.");
    return {
      state: {
        ...value,
        tenancies: value.tenancies ?? [],
        depositLedger: value.depositLedger ?? createSampleDepositLedger(value.units),
        moveInRequests: value.moveInRequests ?? [],
      },
    };
  } catch (error) {
    return {
      state: initialRentDemoState,
      error: error instanceof Error ? error : new Error("Could not read saved rent demo data."),
    };
  }
}

export function writeRentDemoState(state: RentDemoState) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

export function isRentDemoState(value: unknown): value is StoredRentDemoState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    Array.isArray(state["units"]) &&
    state["units"].every(isUnit) &&
    Array.isArray(state["ledger"]) &&
    state["ledger"].every(isLedgerEntry) &&
    Array.isArray(state["notifications"]) &&
    state["notifications"].every(isTenantNotification) &&
    (state["tenancies"] === undefined ||
      (Array.isArray(state["tenancies"]) && state["tenancies"].every(isTenancy))) &&
    (state["depositLedger"] === undefined ||
      (Array.isArray(state["depositLedger"]) && state["depositLedger"].every(isDepositEntry))) &&
    (state["moveInRequests"] === undefined ||
      (Array.isArray(state["moveInRequests"]) && state["moveInRequests"].every(isMoveInRequest)))
  );
}

function isUnit(value: unknown): value is Unit {
  if (typeof value !== "object" || value === null) return false;
  const unit = value as Record<string, unknown>;
  return (
    typeof unit["id"] === "string" &&
    typeof unit["unit"] === "string" &&
    typeof unit["property"] === "string" &&
    (typeof unit["tenant"] === "string" || unit["tenant"] === null) &&
    typeof unit["phone"] === "string" &&
    typeof unit["rent"] === "number" &&
    typeof unit["daysUntilDue"] === "number" &&
    typeof unit["paid"] === "boolean" &&
    typeof unit["leaseEnds"] === "string"
  );
}

function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry["id"] === "string" &&
    typeof entry["date"] === "string" &&
    typeof entry["receivedAt"] === "string" &&
    typeof entry["tenant"] === "string" &&
    typeof entry["unitId"] === "string" &&
    typeof entry["unit"] === "string" &&
    typeof entry["amount"] === "number" &&
    ["MTN Mobile Money", "Airtel Money", "Cash", "Bank transfer", "Visa", "Mastercard"].includes(
      String(entry["method"]),
    ) &&
    typeof entry["reference"] === "string" &&
    ["Confirmed", "Pending", "Failed"].includes(String(entry["status"])) &&
    isRentPeriod(entry["rentPeriod"]) &&
    Number.isInteger(entry["monthsCovered"]) &&
    Number(entry["monthsCovered"]) > 0 &&
    (entry["coverageAmounts"] === undefined ||
      (Array.isArray(entry["coverageAmounts"]) &&
        entry["coverageAmounts"].length === entry["monthsCovered"] &&
        entry["coverageAmounts"].every(
          (amount) => typeof amount === "number" && Number.isFinite(amount) && amount >= 0,
        ) &&
        entry["coverageAmounts"].reduce((sum, amount) => sum + Number(amount), 0) ===
          entry["amount"]))
  );
}

function isTenantNotification(value: unknown): value is TenantNotification {
  if (typeof value !== "object" || value === null) return false;
  const notification = value as Record<string, unknown>;
  return (
    typeof notification["id"] === "string" &&
    typeof notification["unit"] === "string" &&
    ["rent", "payment", "advance", "update"].includes(String(notification["kind"])) &&
    typeof notification["title"] === "string" &&
    typeof notification["message"] === "string" &&
    typeof notification["createdAt"] === "string" &&
    typeof notification["read"] === "boolean"
  );
}

function isTenancy(value: unknown): value is Tenancy {
  if (typeof value !== "object" || value === null) return false;
  const tenancy = value as Record<string, unknown>;
  return (
    typeof tenancy["id"] === "string" &&
    typeof tenancy["unitId"] === "string" &&
    typeof tenancy["tenantName"] === "string" &&
    typeof tenancy["phone"] === "string" &&
    typeof tenancy["email"] === "string" &&
    typeof tenancy["monthlyRent"] === "number" &&
    typeof tenancy["startDate"] === "string" &&
    typeof tenancy["dueDay"] === "number" &&
    typeof tenancy["advanceMonths"] === "number" &&
    typeof tenancy["depositMonths"] === "number" &&
    typeof tenancy["advanceAgreedByBoth"] === "boolean" &&
    typeof tenancy["advanceAgreementNote"] === "string" &&
    ["Pending move-in", "Active", "Ending", "Ended"].includes(String(tenancy["status"])) &&
    (typeof tenancy["agreementFile"] === "string" || tenancy["agreementFile"] === null) &&
    typeof tenancy["tenantIdType"] === "string" &&
    typeof tenancy["tenantIdNumber"] === "string" &&
    (typeof tenancy["copyGivenToTenantAt"] === "string" || tenancy["copyGivenToTenantAt"] === null)
  );
}

function isDepositEntry(value: unknown): value is DepositLedgerEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry["id"] === "string" &&
    (typeof entry["tenancyId"] === "string" || entry["tenancyId"] === null) &&
    typeof entry["unitId"] === "string" &&
    typeof entry["tenant"] === "string" &&
    typeof entry["unit"] === "string" &&
    typeof entry["amount"] === "number" &&
    typeof entry["receivedAt"] === "string" &&
    ["Held", "Refund pending", "Refunded", "Disputed"].includes(String(entry["status"])) &&
    Array.isArray(entry["deductions"]) &&
    entry["deductions"].every(
      (deduction) =>
        typeof deduction === "object" &&
        deduction !== null &&
        typeof (deduction as Record<string, unknown>)["description"] === "string" &&
        typeof (deduction as Record<string, unknown>)["amount"] === "number",
    ) &&
    typeof entry["arrearsAtRefund"] === "number" &&
    (typeof entry["refundAmount"] === "number" || entry["refundAmount"] === null) &&
    (typeof entry["refundRequestedAt"] === "string" || entry["refundRequestedAt"] === null) &&
    (typeof entry["resolvedAt"] === "string" || entry["resolvedAt"] === null)
  );
}

function isMoveInRequest(value: unknown): value is MoveInPaymentRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Record<string, unknown>;
  return (
    typeof request["id"] === "string" &&
    typeof request["tenancyId"] === "string" &&
    typeof request["unitId"] === "string" &&
    typeof request["tenantName"] === "string" &&
    typeof request["amountDue"] === "number" &&
    typeof request["amountPaid"] === "number" &&
    typeof request["rentPaid"] === "number" &&
    typeof request["depositPaid"] === "number" &&
    ["Pending", "Paid"].includes(String(request["status"])) &&
    typeof request["createdAt"] === "string"
  );
}

function isRentPeriod(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
