import { createFileRoute } from "@tanstack/react-router";
import { AdminSecondStepPage } from "@/components/auth/AdminSecondStep";
import { requireAdminSecondStep } from "@/lib/auth/route-guards";
import { authStrings } from "@/lib/auth/strings";
import { SessionActivityGuard } from "@/components/auth/SessionActivityGuard";

export const Route = createFileRoute("/admin/verify")({
  beforeLoad: requireAdminSecondStep,
  head: () => ({
    meta: [
      { title: authStrings.page.adminTitle },
      { name: "description", content: authStrings.page.adminDescription },
    ],
  }),
  component: () => (
    <SessionActivityGuard>
      <AdminSecondStepPage />
    </SessionActivityGuard>
  ),
});
