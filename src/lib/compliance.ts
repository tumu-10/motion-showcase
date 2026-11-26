import {
  MAX_ANNUAL_RENT_INCREASE_PCT,
  MAX_DEPOSIT_MONTHS,
  MIN_EVICTION_NOTICE_DAYS,
  RENT_INCREASE_INTERVAL_MONTHS,
  RENT_INCREASE_NOTICE_DAYS,
} from "@/lib/legal";

// Confirm each rule with a Ugandan lawyer before launch.

export function canIncreaseRent(
  lastIncreaseDate: string,
  oldRent: number,
  newRent: number,
  asOfDate = new Date().toISOString().slice(0, 10),
) {
  if (
    !isValidDate(lastIncreaseDate) ||
    !isValidDate(asOfDate) ||
    !Number.isSafeInteger(oldRent) ||
    !Number.isSafeInteger(newRent) ||
    oldRent <= 0 ||
    newRent <= oldRent ||
    newRent > oldRent * (1 + MAX_ANNUAL_RENT_INCREASE_PCT / 100)
  ) {
    return false;
  }
  return asOfDate >= addMonths(lastIncreaseDate, RENT_INCREASE_INTERVAL_MONTHS);
}

export function rentIncreaseNoticeDate(effectiveDate: string) {
  if (!isValidDate(effectiveDate)) throw new RangeError("Choose a valid rent effective date.");
  return addDays(effectiveDate, -RENT_INCREASE_NOTICE_DAYS);
}

export function evictionNoticeEarliestDate(noticeDate: string, reason: string) {
  if (!reason.trim()) throw new RangeError("An eviction notice requires a reason.");
  if (!isValidDate(noticeDate)) throw new RangeError("Choose a valid notice date.");
  return addDays(noticeDate, MIN_EVICTION_NOTICE_DAYS);
}

export function isDepositValid(deposit: number, monthlyRent: number) {
  return (
    Number.isSafeInteger(deposit) &&
    Number.isSafeInteger(monthlyRent) &&
    deposit >= 0 &&
    monthlyRent > 0 &&
    deposit <= monthlyRent * MAX_DEPOSIT_MONTHS
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(value: string, months: number) {
  const [year, month, day] = value.split("-").map(Number);
  const targetMonth = month! - 1 + months;
  const targetYear = year! + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day!, lastDay)))
    .toISOString()
    .slice(0, 10);
}
