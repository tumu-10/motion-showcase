import { createFileRoute } from "@tanstack/react-router";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { authStrings } from "@/lib/auth/strings";

export const Route = createFileRoute("/join/")({
  head: () => ({
    meta: [
      { title: authStrings.page.joinTitle },
      { name: "description", content: authStrings.page.joinDescription },
    ],
  }),
  component: () => <AuthFlow mode="join-entry" />,
});
