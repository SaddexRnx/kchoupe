import { createFileRoute } from "@tanstack/react-router";
import { setNoIndexHeader } from "@/lib/noindex";
import { AppShell } from "@/components/app-shell";
import { IntegrationsPage } from "@/components/pages/integrations";

export const Route = createFileRoute("/integrations")({
  beforeLoad: () => setNoIndexHeader(),
  head: () => ({
    meta: [
      { title: "Integrations · KC" },
      { name: "description", content: "Connect your shops, socials, inboxes, knowledge and automations so KC employees can act on your behalf." },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/integrations" }],
  }),
  component: () => (
    <AppShell active="integrations">
      <IntegrationsPage />
    </AppShell>
  ),
});