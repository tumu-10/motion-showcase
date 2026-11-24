import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PayFlow } from "@/components/tenant/PayFlow";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(_callback: ResizeObserverCallback) {}
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("tenant mobile-money payment instructions", () => {
  it("shows the landlord receiving name and number separately from the payer's number", () => {
    render(
      <PayFlow
        rent={500_000}
        balance={500_000}
        rentPeriod="2026-11"
        defaultPhone="0772 000 111"
        paymentDetails={{
          mobileMoneyEnabled: true,
          mobileMoneyName: "Kampala Homes",
          mobileMoneyNumber: "+256 772 123 456",
          bankEnabled: false,
        }}
        preferredPaymentMethod="mobile"
        onPaid={vi.fn()}
        onOpenServices={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Send rent to this account/)).toBeInTheDocument();
    expect(screen.getAllByText("Kampala Homes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+256 772 123 456").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Your mobile money number")).toHaveValue("0772 000 111");
  });
});
