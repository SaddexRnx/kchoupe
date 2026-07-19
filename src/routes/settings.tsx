import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SettingsPage } from "@/components/pages/settings";

export const Route = createFileRoute("/settings")({
  component: () => (
    <AppShell active="settings">
      <SettingsPage />
    </AppShell>
  ),
});