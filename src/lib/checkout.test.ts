import { afterEach, describe, expect, it, vi } from "vitest";
import { createCheckout, isCheckoutConfigured } from "./checkout";

afterEach(() => vi.unstubAllEnvs());

describe("hosted tenant checkout", () => {
  it("adds invoice and method to the configured HTTPS checkout URL", () => {
    vi.stubEnv("VITE_CARD_CHECKOUT_URL", "https://checkout.example/pay?source=propatiz");

    expect(createCheckout("unit-u3-2026-11", "visa")).toBe(
      "https://checkout.example/pay?source=propatiz&invoice_id=unit-u3-2026-11&method=visa",
    );
    expect(isCheckoutConfigured("visa")).toBe(true);
  });

  it("rejects unconfigured, empty, and insecure checkout URLs", () => {
    vi.stubEnv("VITE_CARD_CHECKOUT_URL", "");
    expect(isCheckoutConfigured("mastercard")).toBe(false);
    expect(() => createCheckout("invoice-1", "mastercard")).toThrow(/not configured/i);
    expect(() => createCheckout("", "bank")).toThrow(/invoice is required/i);

    vi.stubEnv("VITE_BANK_CHECKOUT_URL", "http://checkout.example/pay");
    expect(() => createCheckout("invoice-1", "bank")).toThrow(/HTTPS/i);
  });
});
