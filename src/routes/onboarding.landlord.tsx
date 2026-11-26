import { createFileRoute } from "@tanstack/react-router";
import { LandlordOnboardingPage } from "@/components/auth/LandlordOnboarding";
import { requireRole } from "@/lib/auth/route-guards";
import { authStrings } from "@/lib/auth/strings";
import { SessionActivityGuard } from "@/components/auth/SessionActivityGuard";

export const Route = createFileRoute("/onboarding/landlord")({
  beforeLoad: () => requireRole("landlord"),
  head: () => ({
    meta: [
      { title: authStrings.page.onboardingTitle },
      { name: "description", content: authStrings.page.onboardingDescription },
    ],
  }),
  component: () => (
    <SessionActivityGuard>
      <LandlordOnboardingPage />
    </SessionActivityGuard>
  ),
});
