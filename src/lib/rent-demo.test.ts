import { describe, expect, it } from "vitest";
import {
  getInitialRentDemoState,
  readRentDemoState,
  writeRentDemoState,
} from "@/lib/rent-demo";

const initialRentDemoState = getInitialRentDemoState();

describe("saved rent demo state", () => {
  it("migrates saved state without service settings or payment audit logs", () => {
    const {
      homeServiceRequests: _homeServiceRequests,
      propertyHomeServiceSettings: _propertyHomeServiceSettings,
      auditLog: _auditLog,
      ...legacyState
    } = initialRentDemoState;
    localStorage.setItem("propatiz-demo-rent-state", JSON.stringify(legacyState));

    const result = readRentDemoState();

    expect(result.error).toBeUndefined();
    expect(result.state.homeServiceRequests).toEqual([]);
    expect(result.state.propertyHomeServiceSettings).toEqual([]);
    expect(result.state.auditLog).toEqual([]);
  });

  it("persists tenant service requests and property service-charge settings", () => {
    const request = {
      id: "home-service-1",
      property: "Kololo Heights",
      unitId: "u1",
      unit: "A1",
      tenant: "Daniel Ssempijja",
      serviceId: "plumber" as const,
      serviceLabel: "Plumber",
      providerId: "plumber-kira",
      providerName: "Kira PipeCare",
      details: "The kitchen tap is leaking.",
      requestedAt: "2026-11-21T12:00:00.000Z",
      status: "Confirmed" as const,
    };
    const settings = {
      property: "Kololo Heights",
      preferredProviderIds: ["plumber-kira"],
      monthlyServiceCharge: {
        label: "Garbage collection",
        amount: 25_000,
        enabled: true,
      },
    };
    writeRentDemoState({
      ...initialRentDemoState,
      homeServiceRequests: [request],
      propertyHomeServiceSettings: [settings],
    });

    const result = readRentDemoState();

    expect(result.error).toBeUndefined();
    expect(result.state.homeServiceRequests).toEqual([request]);
    expect(result.state.propertyHomeServiceSettings).toEqual([settings]);
  });

  it("persists payment audit records", () => {
    const auditEntry = {
      id: "audit-payment-1",
      unitId: "u1",
      actor: "Landlord demo account",
      createdAt: "2026-11-21T12:00:00.000Z",
      action: "Rent payment recorded",
      changes: "UGX 1,500,000 recorded via Cash; reference CASH-1.",
    };
    writeRentDemoState({ ...initialRentDemoState, auditLog: [auditEntry] });

    const result = readRentDemoState();

    expect(result.error).toBeUndefined();
    expect(result.state.auditLog).toEqual([auditEntry]);
  });

  it("restores block labels for saved sample units created before blocks were tracked", () => {
    const { units, ...state } = initialRentDemoState;
    localStorage.setItem(
      "propatiz-demo-rent-state",
      JSON.stringify({
        ...state,
        units: units.map(({ block: _block, ...unit }) => unit),
      }),
    );

    const result = readRentDemoState();

    expect(result.state.units.find((unit) => unit.id === "u1")?.block).toBe("Block A");
    expect(result.state.units.find((unit) => unit.id === "u3")?.block).toBe("Block B");
  });
});
