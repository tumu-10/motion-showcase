import { afterEach, describe, expect, it } from "vitest";
import { createHomeServiceProvider, readHomeServiceProviders } from "@/lib/home-service-providers";
import { demoHomeServiceProviders } from "@/lib/home-services";

afterEach(() => localStorage.clear());

describe("saved home-service providers", () => {
  it("lists a newly created provider alongside the sample directory", () => {
    const provider = createHomeServiceProvider({
      serviceId: "plumber",
      name: "Kampala Pipe Works",
      area: "Ntinda",
      minimumPrice: 25_000,
      maximumPrice: 80_000,
      priceUnit: "per visit",
    });

    expect(provider.ratingCount).toBe(0);
    expect(readHomeServiceProviders()).toEqual([...demoHomeServiceProviders, provider]);
  });

  it("rejects duplicate provider listings and invalid UGX ranges", () => {
    const input = {
      serviceId: "plumber" as const,
      name: "Kampala Pipe Works",
      area: "Ntinda",
      minimumPrice: 25_000,
      maximumPrice: 80_000,
      priceUnit: "per visit",
    };
    createHomeServiceProvider(input);

    expect(() => createHomeServiceProvider(input)).toThrow(
      "A provider with this name and service area is already listed.",
    );
    expect(() =>
      createHomeServiceProvider({ ...input, name: "Bad price", minimumPrice: 90_000 }),
    ).toThrow("Enter valid whole-UGX prices with the maximum at least the minimum.");
  });

  it("rejects malformed saved provider data", () => {
    localStorage.setItem("propatiz-demo-home-service-providers", JSON.stringify([{ name: "Bad" }]));
    expect(() => readHomeServiceProviders()).toThrow(
      "Saved service providers have an invalid shape.",
    );
  });
});
