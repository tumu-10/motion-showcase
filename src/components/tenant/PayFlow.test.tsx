import { render, screen, within } from "@testing-library/react";
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

describe("tenant bank-transfer options", () => {
  it("shows all bank logos and wraps the selected landlord account details", () => {
    render(
      <PayFlow
        rent={500_000}
        balance={500_000}
        rentPeriod="2026-11"
        defaultPhone="0772 000 111"
        paymentDetails={{
          mobileMoneyEnabled: false,
          bankEnabled: true,
          bankName: "Diamond Trust Bank",
          bankAccountName: "Kampala Homes",
          bankAccountNumber: "1234567890123456",
        }}
        preferredPaymentMethod="bank"
        onPaid={vi.fn()}
        onOpenServices={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const banks = [
      ["Stanbic Bank", "Stanbic Bank"],
      ["Housing Finance Bank", "Housing Finance Bank"],
      ["Centenary Bank", "Centenary Bank"],
      ["Equity Bank", "Equity Bank"],
      ["DTB", "Diamond Trust Bank"],
      ["dfcu Bank", "dfcu Bank"],
    ] as const;

    for (const [option, logoAlt] of banks) {
      const bankButton = screen.getByRole("button", { name: `Paying from ${option}` });
      expect(within(bankButton).getByRole("img", { name: logoAlt })).toBeInTheDocument();
    }

    expect(screen.getByRole("button", { name: "Paying from DTB" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("1234567890123456")).toHaveClass("break-all");
    expect(screen.getByText("1234567890123456").parentElement?.parentElement).toHaveClass(
      "min-w-0",
    );
  }, 15_000);
});
