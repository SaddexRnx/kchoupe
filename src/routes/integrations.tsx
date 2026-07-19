import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { IntegrationsPage } from "@/components/pages/integrations";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations · Atlas AI" },
      { name: "description", content: "Connect your shops, socials, inboxes, knowledge and automations so Atlas AI employees can act on your behalf." },
    ],
  }),
  component: () => (
    <AppShell active="integrations">
      <IntegrationsPage />
    </AppShell>
  ),
});