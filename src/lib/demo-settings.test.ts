import { afterEach, describe, expect, it } from "vitest";
import {
  defaultAdminDemoSettings,
  defaultLandlordDemoSettings,
  defaultTenantDemoSettings,
  readAdminDemoSettings,
  readLandlordDemoSettings,
  readLandlordPaymentDetails,
  readTenantDemoSettings,
  saveAdminDemoSettings,
  saveLandlordDemoSettings,
  saveLandlordPaymentDetails,
  saveTenantDemoSettings,
  validateLandlordPaymentDetails,
} from "./demo-settings";

afterEach(() => localStorage.clear());

describe("role demo settings", () => {
  it("uses safe defaults until preferences are saved", () => {
    expect(readTenantDemoSettings()).toEqual(defaultTenantDemoSettings);
    expect(readLandlordDemoSettings()).toEqual(defaultLandlordDemoSettings);
    expect(readAdminDemoSettings()).toEqual(defaultAdminDemoSettings);
  });

  it("persists preferences independently for each role", () => {
    const tenant = { preferredPaymentMethod: "visa" as const };
    const landlord = { defaultRentDueDay: 12 };
    const admin = {
      requireLandlordReview: false,
      defaultSubscriptionPlan: "quarterly" as const,
    };

    saveTenantDemoSettings(tenant);
    saveLandlordDemoSettings(landlord);
    saveAdminDemoSettings(admin);

    expect(readTenantDemoSettings()).toEqual(tenant);
    expect(readLandlordDemoSettings()).toEqual(landlord);
    expect(readAdminDemoSettings()).toEqual(admin);
  });

  it("saves landlord mobile-money and bank receiving details for tenant payment instructions", () => {
    const details = {
      mobileMoneyEnabled: true,
      mobileMoneyName: "Kampala Homes",
      mobileMoneyNumber: "+256 772 123 456",
      bankEnabled: true,
      bankName: "Stanbic Bank",
      bankAccountName: "Kampala Homes Ltd",
      bankAccountNumber: "9030012345678",
    };

    expect(saveLandlordPaymentDetails(details)).toEqual(details);
    expect(readLandlordPaymentDetails()).toEqual(details);
  });

  it("rejects invalid recipient numbers and incomplete enabled bank details", () => {
    expect(() =>
      validateLandlordPaymentDetails({
        mobileMoneyEnabled: true,
        mobileMoneyNumber: "0123",
        bankEnabled: false,
      }),
    ).toThrow("Enter a valid MTN or Airtel number");
    expect(() =>
      validateLandlordPaymentDetails({
        mobileMoneyEnabled: false,
        bankEnabled: true,
        bankName: "Stanbic Bank",
        bankAccountNumber: "9030012345678",
      }),
    ).toThrow("Complete the bank name, account name, and account number.");
  });

  it("rejects invalid saved values instead of using them", () => {
    localStorage.setItem("propatiz-demo-landlord-settings", '{"defaultRentDueDay":32}');

    expect(() => readLandlordDemoSettings()).toThrow("between 1 and 31");
    expect(() => saveLandlordDemoSettings({ defaultRentDueDay: 0 })).toThrow("from 1 to 31");
  });
});
