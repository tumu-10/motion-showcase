import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReceiptSettings } from "@/components/landlord/ReceiptSettings";
import { readLandlordPaymentDetails } from "@/lib/demo-settings";

afterEach(() => localStorage.clear());

describe("landlord rent collection settings", () => {
  it("saves the mobile-money receiving details shown to tenants", async () => {
    render(<ReceiptSettings defaultRentDueDay={1} onDefaultRentDueDayChange={vi.fn()} />);

    await screen.findByText("Rent collection details");
    fireEvent.click(screen.getByRole("checkbox", { name: "Accept bank transfers" }));
    fireEvent.change(screen.getByLabelText("Registered account name"), {
      target: { value: "Kampala Homes" },
    });
    fireEvent.change(screen.getByLabelText("Receiving mobile money number"), {
      target: { value: "+256 772 123 456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save rent collection details" }));

    expect(readLandlordPaymentDetails()).toMatchObject({
      mobileMoneyEnabled: true,
      mobileMoneyName: "Kampala Homes",
      mobileMoneyNumber: "+256 772 123 456",
      bankEnabled: false,
    });
  });

  it("saves a logo-backed landlord bank choice", async () => {
    render(<ReceiptSettings defaultRentDueDay={1} onDefaultRentDueDayChange={vi.fn()} />);

    await screen.findByText("Rent collection details");
    const bankToggle = screen.getByRole("checkbox", { name: "Accept bank transfers" });
    if (bankToggle.getAttribute("aria-checked") !== "true") fireEvent.click(bankToggle);
    fireEvent.change(screen.getByLabelText("Bank name"), {
      target: { value: "Centenary Bank" },
    });
    fireEvent.change(screen.getByLabelText("Account name"), {
      target: { value: "Kampala Homes" },
    });
    fireEvent.change(screen.getByLabelText("Account number"), {
      target: { value: "1234567890123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save rent collection details" }));

    expect(readLandlordPaymentDetails()).toMatchObject({
      bankEnabled: true,
      bankName: "Centenary Bank",
      bankAccountName: "Kampala Homes",
      bankAccountNumber: "1234567890123456",
    });
    expect(screen.getByRole("img", { name: "Centenary Bank" })).toBeInTheDocument();
  });
});
