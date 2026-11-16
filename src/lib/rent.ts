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
