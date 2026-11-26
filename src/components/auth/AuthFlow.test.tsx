import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { authService } from "@/lib/auth/auth-service";
import { authStrings } from "@/lib/auth/strings";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/components/motion/PageTransition", () => ({
  TransitionLink: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

afterEach(async () => {
  await authService.logout();
});

describe("login experience", () => {
  it("fills a demo phone and PIN from the landlord account chip", async () => {
    render(<AuthFlow mode="login" />);

    fireEvent.click(screen.getByRole("button", { name: /Landlord demo/ }));
    expect(screen.getByLabelText("Phone number")).toHaveValue("700 000 001");

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByLabelText("PIN")).toHaveValue("2468");
  });

  it("allows the PIN to be shown and hidden", async () => {
    render(<AuthFlow mode="login" />);
    fireEvent.click(screen.getByRole("button", { name: /Landlord demo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const pinInput = await screen.findByLabelText("PIN", { selector: "input" });
    expect(pinInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: authStrings.pin.show }));
    expect(pinInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: authStrings.pin.hide }));
    expect(pinInput).toHaveAttribute("type", "password");
  });

  it("announces phone validation errors to assistive technology", () => {
    render(<AuthFlow mode="login" />);
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("alert")).toHaveTextContent(authStrings.errors.invalidPhone);
  });

  it("offers a one-tap return to the PIN step after an expired session", async () => {
    render(<AuthFlow mode="login" sessionExpired expiredPhone="+256700000001" />);

    fireEvent.click(screen.getByRole("button", { name: "Continue as +256 700 000 001" }));

    expect(await screen.findByLabelText("PIN")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
