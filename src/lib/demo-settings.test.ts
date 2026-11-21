import { afterEach, describe, expect, it } from "vitest";
import {
  defaultAdminDemoSettings,
  defaultLandlordDemoSettings,
  defaultTenantDemoSettings,
  readAdminDemoSettings,
  readLandlordDemoSettings,
  readTenantDemoSettings,
  saveAdminDemoSettings,
  saveLandlordDemoSettings,
  saveTenantDemoSettings,
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

  it("rejects invalid saved values instead of using them", () => {
    localStorage.setItem("propatiz-demo-landlord-settings", '{"defaultRentDueDay":32}');

    expect(() => readLandlordDemoSettings()).toThrow("between 1 and 31");
    expect(() => saveLandlordDemoSettings({ defaultRentDueDay: 0 })).toThrow("from 1 to 31");
  });
});
