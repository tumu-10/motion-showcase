import { describe, expect, it } from "vitest";
import { initialRentDemoState, readRentDemoState, writeRentDemoState } from "@/lib/rent-demo";

describe("saved rent demo state", () => {
  it("migrates saved state that predates home-service requests and property settings", () => {
    const {
      homeServiceRequests: _homeServiceRequests,
      propertyHomeServiceSettings: _propertyHomeServiceSettings,
      ...legacyState
    } = initialRentDemoState;
    localStorage.setItem("propatiz-demo-rent-state", JSON.stringify(legacyState));

    const result = readRentDemoState();

    expect(result.error).toBeUndefined();
    expect(result.state.homeServiceRequests).toEqual([]);
    expect(result.state.propertyHomeServiceSettings).toEqual([]);
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
