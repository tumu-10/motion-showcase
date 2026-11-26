import { dataSource, isDemoMode } from "@/lib/data-source";
import type { LedgerEntry, TenantNotification, Unit } from "@/lib/sample-data";
import type { DepositLedgerEntry, MoveInPaymentRequest, Tenancy } from "@/lib/tenancy";
import type { HomeServiceRequest, PropertyHomeServiceSettings } from "@/lib/home-services";
import { homeServiceCategories } from "@/lib/home-service-categories";

const storageKey = "propatiz-demo-rent-state";

export type RentDemoState = {
  units: Unit[];
  ledger: LedgerEntry[];
  notifications: TenantNotification[];
  tenancies: Tenancy[];
  depositLedger: DepositLedgerEntry[];
  moveInRequests: MoveInPaymentRequest[];
  homeServiceRequests: HomeServiceRequest[];
  propertyHomeServiceSettings: PropertyHomeServiceSettings[];
  auditLog: RentAuditLogEntry[];
};

export type RentAuditLogEntry = {
  id: string;
  unitId: string;
  actor: string;
  createdAt: string;
  action: string;
  changes: string;
};

type StoredRentDemoState = Pick<RentDemoState, "units" | "ledger" | "notifications"> &
  Partial<
    Pick<
      RentDemoState,
      | "tenancies"
      | "depositLedger"
      | "moveInRequests"
      | "homeServiceRequests"
      | "propertyHomeServiceSettings"
      | "auditLog"
    >
  >;

export function getInitialRentDemoState(units?: Unit[]): RentDemoState {
  return dataSource.getInitialRentDemoState(units);
}

export function readRentDemoState(): { state: RentDemoState; error?: Error | undefined } {
  if (!isDemoMode) return { state: dataSource.getInitialRentDemoState() };
  const initialRentDemoState = getInitialRentDemoState();
  const initialUnits = dataSource.units;
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return { state: initialRentDemoState };
    const value: unknown = JSON.parse(saved);
    if (!isRentDemoState(value)) throw new Error("Saved rent demo data has an invalid shape.");
    const savedUnits = value.units.map((unit) => ({
      ...unit,
      dueDay: unit.dueDay ?? initialUnits.find((sample) => sample.id === unit.id)?.dueDay,
      block: unit.block ?? initialUnits.find((sample) => sample.id === unit.id)?.block,
      vacantSince:
        unit.vacantSince ?? initialUnits.find((sample) => sample.id === unit.id)?.vacantSince,
    }));
    return {
      state: {
        ...value,
        units: savedUnits,
        tenancies: value.tenancies ?? [],
        depositLedger:
          value.depositLedger ?? dataSource.getInitialRentDemoState(savedUnits).depositLedger,
        moveInRequests: value.moveInRequests ?? [],
        homeServiceRequests: value.homeServiceRequests ?? [],
        propertyHomeServiceSettings: value.propertyHomeServiceSettings ?? [],
        auditLog: value.auditLog ?? [],
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
  if (!isDemoMode) throw new Error("Not connected yet");
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
      (Array.isArray(state["moveInRequests"]) && state["moveInRequests"].every(isMoveInRequest))) &&
    (state["homeServiceRequests"] === undefined ||
      (Array.isArray(state["homeServiceRequests"]) &&
        state["homeServiceRequests"].every(isHomeServiceRequest))) &&
    (state["propertyHomeServiceSettings"] === undefined ||
      (Array.isArray(state["propertyHomeServiceSettings"]) &&
        state["propertyHomeServiceSettings"].every(isPropertyHomeServiceSettings))) &&
    (state["auditLog"] === undefined ||
      (Array.isArray(state["auditLog"]) && state["auditLog"].every(isRentAuditLogEntry)))
  );
}

function isHomeServiceRequest(value: unknown): value is HomeServiceRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Record<string, unknown>;
  return (
    typeof request["id"] === "string" &&
    typeof request["property"] === "string" &&
    typeof request["unitId"] === "string" &&
    typeof request["unit"] === "string" &&
    typeof request["tenant"] === "string" &&
    homeServiceCategories.some((service) => service.id === request["serviceId"]) &&
    typeof request["serviceLabel"] === "string" &&
    typeof request["providerId"] === "string" &&
    typeof request["providerName"] === "string" &&
    (request["details"] === undefined || typeof request["details"] === "string") &&
    typeof request["requestedAt"] === "string" &&
    ["Requested", "Confirmed", "Done"].includes(String(request["status"]))
  );
}

function isPropertyHomeServiceSettings(value: unknown): value is PropertyHomeServiceSettings {
  if (typeof value !== "object" || value === null) return false;
  const settings = value as Record<string, unknown>;
  const monthlyChargeValue = settings["monthlyServiceCharge"];
  const monthlyCharge =
    typeof monthlyChargeValue === "object" && monthlyChargeValue !== null
      ? (monthlyChargeValue as Record<string, unknown>)
      : undefined;
  return (
    typeof settings["property"] === "string" &&
    Array.isArray(settings["preferredProviderIds"]) &&
    settings["preferredProviderIds"].every((providerId) => typeof providerId === "string") &&
    (monthlyChargeValue === undefined ||
      (monthlyCharge !== undefined &&
        typeof monthlyCharge["label"] === "string" &&
        typeof monthlyCharge["amount"] === "number" &&
        Number.isInteger(monthlyCharge["amount"]) &&
        monthlyCharge["amount"] >= 0 &&
        typeof monthlyCharge["enabled"] === "boolean"))
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
    (unit["dueDay"] === undefined ||
      (typeof unit["dueDay"] === "number" &&
        Number.isInteger(unit["dueDay"]) &&
        unit["dueDay"] >= 1 &&
        unit["dueDay"] <= 31)) &&
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
    [
      "MTN Mobile Money",
      "Airtel Money",
      "Mobile money",
      "Cash",
      "Bank transfer",
      "Visa",
      "Mastercard",
    ].includes(String(entry["method"])) &&
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
          entry["amount"])) &&
    (entry["bankProofDataUrl"] === undefined || typeof entry["bankProofDataUrl"] === "string") &&
    (entry["receiptPhotoDataUrl"] === undefined || typeof entry["receiptPhotoDataUrl"] === "string")
  );
}

function isRentAuditLogEntry(value: unknown): value is RentAuditLogEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry["id"] === "string" &&
    typeof entry["unitId"] === "string" &&
    typeof entry["actor"] === "string" &&
    typeof entry["createdAt"] === "string" &&
    typeof entry["action"] === "string" &&
    typeof entry["changes"] === "string"
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
    typeof notification["read"] === "boolean" &&
    (notification["unitId"] === undefined || typeof notification["unitId"] === "string") &&
    (notification["audience"] === undefined ||
      ["landlord", "tenant"].includes(String(notification["audience"]))) &&
    (notification["eventType"] === undefined ||
      dataSource.notificationEventTypes.includes(
        notification["eventType"] as (typeof dataSource.notificationEventTypes)[number],
      )) &&
    (notification["dedupeKey"] === undefined || typeof notification["dedupeKey"] === "string") &&
    (notification["delivery"] === undefined ||
      (Array.isArray(notification["delivery"]) &&
        notification["delivery"].every(isNotificationDelivery)))
  );
}

function isNotificationDelivery(value: unknown) {
  if (typeof value !== "object" || value === null) return false;
  const delivery = value as Record<string, unknown>;
  return (
    ["in-app", "sms", "whatsapp"].includes(String(delivery["channel"])) &&
    ["mocked", "disabled"].includes(String(delivery["status"])) &&
    typeof delivery["note"] === "string"
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
    ["Held", "Refund pending", "Partly refunded", "Refunded", "Disputed"].includes(
      String(entry["status"]),
    ) &&
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
