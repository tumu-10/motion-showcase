import { afterEach, describe, expect, it, vi } from "vitest";
import { mockPaymentProviders } from "./payment-provider";

describe("mock payment providers", () => {
  afterEach(() => vi.useRealTimers());

  it("simulates success and failure for mobile and card payments", async () => {
    vi.useFakeTimers();
    const success = mockPaymentProviders.mobile.process({
      amount: 100_000,
      reference: "PTZ-1",
      method: "mobile",
    });
    await vi.advanceTimersByTimeAsync(350);
    await expect(success).resolves.toMatchObject({ status: "success", reference: "PTZ-1" });

    const failure = mockPaymentProviders.card.process({
      amount: 100_000,
      reference: "PTZ-2",
      method: "card",
      simulateFailure: true,
    });
    await vi.advanceTimersByTimeAsync(350);
    await expect(failure).resolves.toMatchObject({ status: "failed", reference: "PTZ-2" });
  });

  it("returns a mock card token and leaves bank transfers pending", async () => {
    vi.useFakeTimers();
    const card = mockPaymentProviders.card.process({
      amount: 100_000,
      reference: "PTZ-3",
      method: "card",
    });
    const bank = mockPaymentProviders.bank.process({
      amount: 100_000,
      reference: "PTZ-4",
      method: "bank",
    });
    await vi.advanceTimersByTimeAsync(350);
    await expect(card).resolves.toMatchObject({
      status: "success",
      token: expect.stringMatching(/^MOCK-/),
    });
    await expect(bank).resolves.toMatchObject({ status: "pending", reference: "PTZ-4" });
  });
});
