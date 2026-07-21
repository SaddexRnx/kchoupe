import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SupportPage } from "@/components/pages/support";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Atlas AI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/support" }],
  }),
  component: () => (
    <AppShell active="support">
      <SupportPage />
    </AppShell>
  ),
});
