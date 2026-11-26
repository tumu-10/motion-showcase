import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("./demo-data-source");
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("data source selection", () => {
  it("uses the sample-data demo by default in production builds", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_DEMO_MODE", undefined);

    const { dataSource, isDemoMode } = await import("./data-source");

    expect(isDemoMode).toBe(true);
    expect(dataSource.tenantProfile.name).toBe("Amina Nakato");
  });

  it("uses throwing API stubs without loading demo data when demo mode is off", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "false");
    vi.doMock("./demo-data-source", () => {
      throw new Error("Demo data source must not be loaded.");
    });

    const { dataSource, isDemoMode } = await import("./data-source");

    expect(isDemoMode).toBe(false);
    expect(() => dataSource.tenantProfile).toThrowError("Not connected yet");
    expect(() => dataSource.getInitialRentDemoState()).toThrowError("Not connected yet");
  });

  it("does not read browser demo state when demo mode is off", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "false");
    const { readRentDemoState } = await import("./rent-demo");
    const getItem = vi.spyOn(localStorage, "getItem");

    expect(() => readRentDemoState()).toThrowError("Not connected yet");
    expect(getItem).not.toHaveBeenCalled();
  });

  it("uses sample data in demo mode", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");

    const { dataSource, isDemoMode } = await import("./data-source");

    expect(isDemoMode).toBe(true);
    expect(dataSource.tenantProfile.name).toBe("Amina Nakato");
    expect(dataSource.getInitialRentDemoState().units.length).toBeGreaterThan(0);
  });
});
