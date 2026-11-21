import {
  MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT,
  MAX_ANNUAL_RENT_INCREASE_PCT,
  MIN_EVICTION_NOTICE_DAYS,
  RENT_INCREASE_NOTICE_DAYS,
} from "@/lib/legal";
import { localDateIso } from "@/lib/rent-accounting";
import type { Unit } from "@/lib/sample-data";

/** Rent status rules shared by every role. */
export type RentStatus = "paid" | "due-soon" | "upcoming" | "overdue";

/** A rent is "due soon" when it falls due within this many days. */
export const DUE_SOON_DAYS = 7;

export function getRentStatus(daysUntilDue: number, paid: boolean): RentStatus {
  if (paid) return "paid";
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= DUE_SOON_DAYS) return "due-soon";
  return "upcoming";
}

export const rentStatusLabel: Record<RentStatus, string> = {
  paid: "Paid",
  "due-soon": "Due soon",
  upcoming: "Upcoming",
  overdue: "Overdue",
};

export type UnitListStatus = RentStatus | "vacant" | "pending";

export function getUnitListStatus(unit: Unit): UnitListStatus {
  if (unit.pendingMoveIn) return "pending";
  return unit.tenant ? getRentStatus(unit.daysUntilDue, unit.paid) : "vacant";
}

export function formatUGX(amount: number) {
  return `UGX ${Math.round(amount).toLocaleString("en-UG")}`;
}

export function formatCompactUGX(amount: number) {
  if (amount >= 1_000_000_000) return `UGX ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `UGX ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `UGX ${Math.round(amount / 1_000)}K`;
  return formatUGX(amount);
}

export type MobileNetwork = "mtn" | "airtel";

/**
 * Ugandan mobile numbers: 07XXXXXXXX, +2567XXXXXXXX or 2567XXXXXXXX.
 * MTN: 076, 077, 078, 079 (039 landline excluded). Airtel: 070, 074, 075.
 */
export function normalizeUgPhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "").replace(/^\+/, "");
  let local: string;
  if (/^2567\d{8}$/.test(digits)) local = "0" + digits.slice(3);
  else if (/^07\d{8}$/.test(digits)) local = digits;
  else return null;
  return local;
}

export function detectNetwork(input: string): MobileNetwork | null {
  const local = normalizeUgPhone(input);
  if (!local) return null;
  const prefix = local.slice(0, 3);
  if (["076", "077", "078", "079"].includes(prefix)) return "mtn";
  if (["070", "074", "075"].includes(prefix)) return "airtel";
  return null;
}

export const networkLabel: Record<MobileNetwork, string> = {
  mtn: "MTN Mobile Money",
  airtel: "Airtel Money",
};

export { MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT } from "@/lib/legal";

export function needsAdvanceAgreement(months: number): boolean {
  return months > MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT;
}

export function getMinimumNoticeDate(today: string, noticeDays: number) {
  const date = new Date(`${today}T00:00:00`);
  if (
    !isIsoDate(today) ||
    Number.isNaN(date.getTime()) ||
    !Number.isInteger(noticeDays) ||
    noticeDays < 0
  ) {
    throw new RangeError("A valid date and non-negative whole number of notice days are required.");
  }
  date.setDate(date.getDate() + noticeDays);
  return localDateIso(date);
}

/** Returns an error message, or null when the notice can be issued. */
export function validateNotice(
  issuedOn: string,
  vacateBy: string,
  reason: string,
  today = localDateIso(),
): string | null {
  if (!reason.trim()) return "Add the reason for the notice.";
  if (!isIsoDate(issuedOn) || !isIsoDate(vacateBy) || !isIsoDate(today))
    return "Choose valid notice dates.";
  if (issuedOn !== today) return "The notice date must be today.";
  const minimumDate = getMinimumNoticeDate(today, MIN_EVICTION_NOTICE_DAYS);
  if (vacateBy < minimumDate)
    return `The move-out date must be at least ${MIN_EVICTION_NOTICE_DAYS} days from today (${minimumDate}).`;
  return null;
}

export function validateRentIncreaseNotice(
  effectiveDate: string,
  increasePct: number,
  today = localDateIso(),
): string | null {
  if (!isIsoDate(effectiveDate) || !isIsoDate(today)) return "Choose a valid effective date.";
  if (!Number.isFinite(increasePct) || increasePct <= 0)
    return "Enter a rent increase greater than 0%.";
  if (increasePct > MAX_ANNUAL_RENT_INCREASE_PCT)
    return `The annual rent increase cannot exceed ${MAX_ANNUAL_RENT_INCREASE_PCT}%.`;
  const minimumDate = getMinimumNoticeDate(today, RENT_INCREASE_NOTICE_DAYS);
  if (effectiveDate < minimumDate)
    return `The effective date must be at least ${RENT_INCREASE_NOTICE_DAYS} days from today (${minimumDate}).`;
  return null;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && localDateIso(date) === value;
}

/** Collision-resistant payment reference, e.g. PTZ-8F3K2Q9A. */
export function makePaymentReference(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  return `PTZ-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}
