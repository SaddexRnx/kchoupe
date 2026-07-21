import { createFileRoute } from "@tanstack/react-router";
import { setNoIndexHeader } from "@/lib/noindex";
import { AppShell } from "@/components/app-shell";
import { SupportPage } from "@/components/pages/support";

export const Route = createFileRoute("/support")({
  beforeLoad: () => setNoIndexHeader(),
  head: () => ({
    meta: [
      { title: "Support — KC" },
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
