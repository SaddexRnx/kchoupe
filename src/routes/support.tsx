import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SupportPage } from "@/components/pages/support";

export const Route = createFileRoute("/support")({
  component: () => (
    <AppShell active="support">
      <SupportPage />
    </AppShell>
  ),
});
