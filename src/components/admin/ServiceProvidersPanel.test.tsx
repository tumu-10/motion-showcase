import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ServiceProvidersPanel } from "@/components/admin/ServiceProvidersPanel";
import { readHomeServiceProviders } from "@/lib/home-service-providers";

afterEach(() => localStorage.clear());

describe("service provider administration", () => {
  it("adds a provider to the directory with its UGX price range", async () => {
    render(<ServiceProvidersPanel />);

    fireEvent.change(screen.getByLabelText("Service category"), {
      target: { value: "plumber" },
    });
    fireEvent.change(screen.getByLabelText("Provider or business name"), {
      target: { value: "Kampala Pipe Works" },
    });
    fireEvent.change(screen.getByLabelText("Service area"), { target: { value: "Ntinda" } });
    fireEvent.change(screen.getByLabelText("Minimum price (UGX)"), {
      target: { value: "25000" },
    });
    fireEvent.change(screen.getByLabelText("Maximum price (UGX)"), {
      target: { value: "80000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add service provider" }));

    expect(await screen.findByText("Kampala Pipe Works")).toBeInTheDocument();
    expect(
      readHomeServiceProviders().some((provider) => provider.name === "Kampala Pipe Works"),
    ).toBe(true);
  });
});
