import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentsView } from "@/components/landlord/PaymentsView";
import type { Unit } from "@/lib/sample-data";

const unit: Unit = {
  id: "unit-a1",
  unit: "A1",
  property: "Kampala Court",
  tenant: "Amina Nakato",
  phone: "+256772123456",
  rent: 1_000_000,
  daysUntilDue: 5,
  paid: false,
  leaseEnds: "2027-01-01",
};

describe("landlord cash payment entry", () => {
  it("submits a whole-UGX cash amount, unit, and received date", () => {
    const onRecordCashPayment = vi.fn(() => true);
    render(
      <PaymentsView
        ledger={[]}
        units={[unit]}
        onConfirm={vi.fn()}
        onRecordCashPayment={onRecordCashPayment}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Record cash payment" }));
    fireEvent.change(screen.getByLabelText("Amount received (UGX)"), {
      target: { value: "500000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record payment and receipt" }));

    expect(onRecordCashPayment).toHaveBeenCalledWith(unit.id, 500_000, expect.any(String));
  });
});
