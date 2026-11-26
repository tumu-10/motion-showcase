import { fireEvent, render, screen, within } from "@testing-library/react";
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
        invoiceId="u1-2026-11"
        unit="A1"
        defaultPhone="0772 000 111"
        paymentDetails={{
          mobileMoneyEnabled: true,
          mobileMoneyName: "Kampala Homes",
          mobileMoneyNumber: "+256 772 123 456",
          bankEnabled: false,
        }}
        preferredPaymentMethod="mobile"
        onPaid={() => null}
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

describe("tenant bank-transfer options", () => {
  it("shows three payment tabs and never collects card details", () => {
    render(
      <PayFlow
        rent={500_000}
        balance={500_000}
        rentPeriod="2026-11"
        invoiceId="u1-2026-11"
        unit="A1"
        defaultPhone="0772 000 111"
        paymentDetails={{
          mobileMoneyEnabled: true,
          mobileMoneyName: "Kampala Homes",
          mobileMoneyNumber: "0772 123 456",
          bankEnabled: true,
          bankName: "Diamond Trust Bank",
          bankAccountName: "Kampala Homes",
          bankAccountNumber: "1234567890123456",
        }}
        preferredPaymentMethod="bank"
        onPaid={() => null}
        onOpenServices={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "Mobile money" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Card" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Bank transfer" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(/Coming soon — a bank checkout provider/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Mobile money" }));
    const mobileChoice = screen.getByRole("button", { name: "MTN Mobile Money" });
    expect(within(mobileChoice).getByRole("img", { name: "MTN Mobile Money" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Card" }));
    expect(screen.getByText(/Coming soon — hosted card checkout/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/card number|expiry|security code/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("1234 5678 9012 3456")).not.toBeInTheDocument();
  });
});
