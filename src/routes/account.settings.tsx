import { createFileRoute } from "@tanstack/react-router";
import { AccountSettingsPage } from "@/components/auth/AccountSettings";
import { requireSession } from "@/lib/auth/route-guards";
import { authStrings } from "@/lib/auth/strings";
import { SessionActivityGuard } from "@/components/auth/SessionActivityGuard";

export const Route = createFileRoute("/account/settings")({
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: authStrings.page.settingsTitle },
      { name: "description", content: authStrings.page.settingsDescription },
    ],
  }),
  component: () => (
    <SessionActivityGuard>
      <AccountSettingsPage />
    </SessionActivityGuard>
  ),
});
