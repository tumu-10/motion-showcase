import { detectNetwork, normalizeUgPhone } from "@/lib/rent";
import {
  tenantProfile,
  type LandlordPaymentDetails,
  type SubscriptionPlan,
} from "@/lib/sample-data";

export type TenantPaymentPreference = "mobile" | "bank" | "visa";

export type TenantDemoSettings = {
  preferredPaymentMethod: TenantPaymentPreference;
};

export type LandlordDemoSettings = {
  defaultRentDueDay: number;
};

export type AdminDemoSettings = {
  requireLandlordReview: boolean;
  defaultSubscriptionPlan: SubscriptionPlan;
};

export const defaultTenantDemoSettings: TenantDemoSettings = {
  preferredPaymentMethod: "mobile",
};

export const defaultLandlordDemoSettings: LandlordDemoSettings = {
  defaultRentDueDay: 1,
};

export const defaultAdminDemoSettings: AdminDemoSettings = {
  requireLandlordReview: true,
  defaultSubscriptionPlan: "monthly",
};

const storageKeys = {
  tenant: "propatiz-demo-tenant-settings",
  landlord: "propatiz-demo-landlord-settings",
  landlordPayments: "propatiz-demo-landlord-payment-details",
  admin: "propatiz-demo-admin-settings",
} as const;

export const defaultLandlordPaymentDetails: LandlordPaymentDetails = {
  ...tenantProfile.paymentDetails,
};

function readStoredSettings<T>(key: string, fallback: T): unknown {
  if (typeof localStorage === "undefined") return fallback;
  const saved = localStorage.getItem(key);
  if (saved === null) return fallback;
  try {
    return JSON.parse(saved) as unknown;
  } catch {
    throw new Error("Saved demo settings could not be read. Clear the damaged setting and retry.");
  }
}

function saveStoredSettings<T>(key: string, settings: T): T {
  if (typeof localStorage === "undefined") {
    throw new Error("Settings can only be saved in the browser demo.");
  }
  localStorage.setItem(key, JSON.stringify(settings));
  return settings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readTenantDemoSettings(): TenantDemoSettings {
  const saved = readStoredSettings(storageKeys.tenant, defaultTenantDemoSettings);
  if (!isRecord(saved)) throw new Error("Saved tenant settings have an invalid shape.");
  const method = saved["preferredPaymentMethod"];
  if (method !== "mobile" && method !== "bank" && method !== "visa") {
    throw new Error("Saved tenant payment preference is invalid.");
  }
  return { preferredPaymentMethod: method };
}

export function saveTenantDemoSettings(settings: TenantDemoSettings): TenantDemoSettings {
  if (!["mobile", "bank", "visa"].includes(settings.preferredPaymentMethod)) {
    throw new Error("Choose a valid preferred payment method.");
  }
  return saveStoredSettings(storageKeys.tenant, settings);
}

export function readLandlordDemoSettings(): LandlordDemoSettings {
  const saved = readStoredSettings(storageKeys.landlord, defaultLandlordDemoSettings);
  if (!isRecord(saved)) throw new Error("Saved landlord settings have an invalid shape.");
  const day = saved["defaultRentDueDay"];
  if (typeof day !== "number" || !Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error("Saved default rent due day must be between 1 and 31.");
  }
  return { defaultRentDueDay: day };
}

export function saveLandlordDemoSettings(settings: LandlordDemoSettings): LandlordDemoSettings {
  const day = settings.defaultRentDueDay;
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error("Choose a rent due day from 1 to 31.");
  }
  return saveStoredSettings(storageKeys.landlord, settings);
}

export function readLandlordPaymentDetails(): LandlordPaymentDetails {
  const saved = readStoredSettings(storageKeys.landlordPayments, defaultLandlordPaymentDetails);
  if (!isRecord(saved)) throw new Error("Saved landlord payment details have an invalid shape.");
  if (
    typeof saved["mobileMoneyEnabled"] !== "boolean" ||
    typeof saved["bankEnabled"] !== "boolean"
  ) {
    throw new Error("Saved landlord payment method settings are invalid.");
  }
  const fields = [
    "mobileMoneyName",
    "mobileMoneyNumber",
    "bankName",
    "bankAccountName",
    "bankAccountNumber",
  ];
  if (fields.some((field) => saved[field] !== undefined && typeof saved[field] !== "string")) {
    throw new Error("Saved landlord payment details contain an invalid value.");
  }
  const details: LandlordPaymentDetails = {
    mobileMoneyEnabled: saved["mobileMoneyEnabled"],
    ...(typeof saved["mobileMoneyName"] === "string"
      ? { mobileMoneyName: saved["mobileMoneyName"] }
      : {}),
    ...(typeof saved["mobileMoneyNumber"] === "string"
      ? { mobileMoneyNumber: saved["mobileMoneyNumber"] }
      : {}),
    bankEnabled: saved["bankEnabled"],
    ...(typeof saved["bankName"] === "string" ? { bankName: saved["bankName"] } : {}),
    ...(typeof saved["bankAccountName"] === "string"
      ? { bankAccountName: saved["bankAccountName"] }
      : {}),
    ...(typeof saved["bankAccountNumber"] === "string"
      ? { bankAccountNumber: saved["bankAccountNumber"] }
      : {}),
  };
  validateLandlordPaymentDetails(details);
  return details;
}

export function validateLandlordPaymentDetails(details: LandlordPaymentDetails) {
  if (!details.mobileMoneyEnabled && !details.bankEnabled) {
    throw new Error("Enable at least one rent collection method.");
  }
  if (details.mobileMoneyEnabled) {
    const number = details.mobileMoneyNumber?.trim() ?? "";
    if (!number) throw new Error("Enter the mobile money number tenants should pay.");
    if (!normalizeUgPhone(number) || !detectNetwork(number)) {
      throw new Error("Enter a valid MTN or Airtel number, such as 0772 123 456.");
    }
  }
  if (
    details.bankEnabled &&
    (!details.bankName?.trim() ||
      !details.bankAccountName?.trim() ||
      !details.bankAccountNumber?.trim())
  ) {
    throw new Error("Complete the bank name, account name, and account number.");
  }
}

export function saveLandlordPaymentDetails(
  details: LandlordPaymentDetails,
): LandlordPaymentDetails {
  validateLandlordPaymentDetails(details);
  const saved: LandlordPaymentDetails = {
    mobileMoneyEnabled: details.mobileMoneyEnabled,
    ...(details.mobileMoneyName?.trim() ? { mobileMoneyName: details.mobileMoneyName.trim() } : {}),
    ...(details.mobileMoneyNumber?.trim()
      ? { mobileMoneyNumber: details.mobileMoneyNumber.trim() }
      : {}),
    bankEnabled: details.bankEnabled,
    ...(details.bankName?.trim() ? { bankName: details.bankName.trim() } : {}),
    ...(details.bankAccountName?.trim() ? { bankAccountName: details.bankAccountName.trim() } : {}),
    ...(details.bankAccountNumber?.trim()
      ? { bankAccountNumber: details.bankAccountNumber.trim() }
      : {}),
  };
  return saveStoredSettings(storageKeys.landlordPayments, saved);
}

export function readAdminDemoSettings(): AdminDemoSettings {
  const saved = readStoredSettings(storageKeys.admin, defaultAdminDemoSettings);
  if (!isRecord(saved)) throw new Error("Saved admin settings have an invalid shape.");
  const requireLandlordReview = saved["requireLandlordReview"];
  const defaultSubscriptionPlan = saved["defaultSubscriptionPlan"];
  if (typeof requireLandlordReview !== "boolean") {
    throw new Error("Saved landlord review preference is invalid.");
  }
  if (
    defaultSubscriptionPlan !== "monthly" &&
    defaultSubscriptionPlan !== "quarterly" &&
    defaultSubscriptionPlan !== "yearly"
  ) {
    throw new Error("Saved default subscription plan is invalid.");
  }
  return { requireLandlordReview, defaultSubscriptionPlan };
}

export function saveAdminDemoSettings(settings: AdminDemoSettings): AdminDemoSettings {
  if (typeof settings.requireLandlordReview !== "boolean") {
    throw new Error("Choose whether new landlord accounts require review.");
  }
  if (
    settings.defaultSubscriptionPlan !== "monthly" &&
    settings.defaultSubscriptionPlan !== "quarterly" &&
    settings.defaultSubscriptionPlan !== "yearly"
  ) {
    throw new Error("Choose a valid default subscription plan.");
  }
  return saveStoredSettings(storageKeys.admin, settings);
}
