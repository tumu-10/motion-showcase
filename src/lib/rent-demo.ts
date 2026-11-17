import {
  ledger as initialLedger,
  tenantNotifications as initialNotifications,
  units as initialUnits,
  type LedgerEntry,
  type TenantNotification,
  type Unit,
} from "@/lib/sample-data";

const storageKey = "propatiz-demo-rent-state";

export type RentDemoState = {
  units: Unit[];
  ledger: LedgerEntry[];
  notifications: TenantNotification[];
};

export const initialRentDemoState: RentDemoState = {
  units: initialUnits,
  ledger: initialLedger,
  notifications: initialNotifications,
};

export function readRentDemoState(): { state: RentDemoState; error?: Error | undefined } {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return { state: initialRentDemoState };
    const value: unknown = JSON.parse(saved);
    if (!isRentDemoState(value)) throw new Error("Saved rent demo data has an invalid shape.");
    return { state: value };
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

export function isRentDemoState(value: unknown): value is RentDemoState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    Array.isArray(state.units) &&
    state.units.every(isUnit) &&
    Array.isArray(state.ledger) &&
    state.ledger.every(isLedgerEntry) &&
    Array.isArray(state.notifications) &&
    state.notifications.every(isTenantNotification)
  );
}

function isUnit(value: unknown): value is Unit {
  if (typeof value !== "object" || value === null) return false;
  const unit = value as Record<string, unknown>;
  return (
    typeof unit.id === "string" &&
    typeof unit.unit === "string" &&
    typeof unit.property === "string" &&
    (typeof unit.tenant === "string" || unit.tenant === null) &&
    typeof unit.phone === "string" &&
    typeof unit.rent === "number" &&
    typeof unit.daysUntilDue === "number" &&
    typeof unit.paid === "boolean" &&
    typeof unit.leaseEnds === "string"
  );
}

function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.date === "string" &&
    typeof entry.receivedAt === "string" &&
    typeof entry.tenant === "string" &&
    typeof entry.unitId === "string" &&
    typeof entry.unit === "string" &&
    typeof entry.amount === "number" &&
    ["MTN Mobile Money", "Airtel Money", "Cash", "Bank transfer", "Visa", "Mastercard"].includes(
      String(entry.method),
    ) &&
    typeof entry.reference === "string" &&
    ["Confirmed", "Pending", "Failed"].includes(String(entry.status)) &&
    isRentPeriod(entry.rentPeriod) &&
    Number.isInteger(entry.monthsCovered) &&
    Number(entry.monthsCovered) > 0 &&
    (entry.coverageAmounts === undefined ||
      (Array.isArray(entry.coverageAmounts) &&
        entry.coverageAmounts.length === entry.monthsCovered &&
        entry.coverageAmounts.every(
          (amount) => typeof amount === "number" && Number.isFinite(amount) && amount >= 0,
        ) &&
        entry.coverageAmounts.reduce((sum, amount) => sum + Number(amount), 0) === entry.amount))
  );
}

function isTenantNotification(value: unknown): value is TenantNotification {
  if (typeof value !== "object" || value === null) return false;
  const notification = value as Record<string, unknown>;
  return (
    typeof notification.id === "string" &&
    typeof notification.unit === "string" &&
    ["rent", "payment", "advance", "update"].includes(String(notification.kind)) &&
    typeof notification.title === "string" &&
    typeof notification.message === "string" &&
    typeof notification.createdAt === "string" &&
    typeof notification.read === "boolean"
  );
}

function isRentPeriod(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
