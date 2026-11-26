import { createFileRoute } from "@tanstack/react-router";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { authStrings } from "@/lib/auth/strings";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: authStrings.page.inviteTitle },
      { name: "description", content: authStrings.page.inviteDescription },
    ],
  }),
  component: JoinInvitePage,
});

function JoinInvitePage() {
  const { code } = Route.useParams();
  return <AuthFlow mode="tenant-invite" inviteCode={code} />;
}
