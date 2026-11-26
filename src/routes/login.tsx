import { createFileRoute } from "@tanstack/react-router";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { authStrings } from "@/lib/auth/strings";

type LoginMode = "login" | "landlord";

function getLoginMode(value: unknown): LoginMode | undefined {
  if (value === "login" || value === "landlord") return value;
  return undefined;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: getLoginMode(search["mode"]),
    expired: search["expired"] === true,
  }),
  head: () => ({
    meta: [
      { title: authStrings.page.loginTitle },
      { name: "description", content: authStrings.page.loginDescription },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { mode, expired } = Route.useSearch();
  return (
    <AuthFlow
      mode={mode === "landlord" ? "landlord-signup" : mode ?? "welcome"}
      sessionExpired={expired}
    />
  );
}
